import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  orders,
  inventoryReservations,
  paymentTransactions,
  paymentEvents,
  ticketTypes,
} from '../../database/schema/index';
import { RazorpayPaymentGateway } from './gateways/razorpay-payment.gateway';
import { MockPaymentGateway } from './gateways/mock-payment.gateway';
import type { IPaymentGateway, PaymentWebhookEvent } from './gateways/payment-gateway.interface';
import { PaymentTransactionStateMachineService } from './payment-transaction-state-machine.service';
import { OrderStateMachineService } from '../orders/order-state-machine.service';
import { HoldStateMachineService } from '../inventory/hold-state-machine.service';
import { TicketIssuanceService } from '../tickets/ticket-issuance.service';
import { AuditService } from '../../common/audit/audit.service';
import type {
  AuthContext,
  CreatePaymentIntentInput,
  PaymentIntentDto,
  PaymentTransaction,
} from '@platform/types';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    private readonly db: DatabaseService,
    private readonly razorpayGateway: RazorpayPaymentGateway,
    private readonly mockGateway: MockPaymentGateway,
    private readonly txStateMachine: PaymentTransactionStateMachineService,
    private readonly orderStateMachine: OrderStateMachineService,
    private readonly holdStateMachine: HoldStateMachineService,
    private readonly ticketIssuance: TicketIssuanceService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Select gateway adapter by provider name.
   */
  private getGateway(provider = 'razorpay'): IPaymentGateway {
    if (provider === 'mock') return this.mockGateway;
    return this.razorpayGateway;
  }

  /**
   * CREATE PAYMENT INTENT (IDEMPOTENT & SERVER AUTHORITATIVE)
   */
  async createPaymentIntent(
    actor: AuthContext,
    input: CreatePaymentIntentInput,
  ): Promise<PaymentIntentDto> {
    const providerName = input.provider ?? 'razorpay';
    const gateway = this.getGateway(providerName);

    // 1. Fetch & lock order
    const order = await this.db.db.query.orders.findFirst({
      where: eq(orders.id, input.orderId),
    });

    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    }

    if (order.userId !== actor.userId) {
      throw new ForbiddenException({ code: 'ORDER_ACCESS_DENIED', message: 'Cannot initiate payment for another user order.' });
    }

    if (order.status === 'paid' || order.status === 'completed') {
      throw new BadRequestException({ code: 'ORDER_ALREADY_PAID', message: 'Order has already been paid.' });
    }

    // 2. Fetch active reservation hold
    const hold = await this.db.db.query.inventoryReservations.findFirst({
      where: and(
        eq(inventoryReservations.orderId, order.id),
        eq(inventoryReservations.status, 'active'),
      ),
    });

    if (!hold) {
      throw new ConflictException({
        code: 'HOLD_NOT_ACTIVE',
        message: 'Reservation hold has expired or is cancelled. Cannot create payment intent.',
      });
    }

    if (new Date() > hold.expiresAt) {
      throw new ConflictException({
        code: 'HOLD_EXPIRED',
        message: 'Reservation hold expired. Please create a new ticket reservation.',
      });
    }

    // 3. PAYMENT INTENT IDEMPOTENCY CHECK: Check for existing pending payment transaction
    const existingTx = await this.db.db.query.paymentTransactions.findFirst({
      where: and(
        eq(paymentTransactions.orderId, order.id),
        eq(paymentTransactions.provider, providerName),
        eq(paymentTransactions.status, 'pending'),
      ),
    });

    if (existingTx && existingTx.providerOrderId) {
      return {
        paymentTransactionId: existingTx.id,
        orderId: order.id,
        provider: providerName,
        providerOrderId: existingTx.providerOrderId,
        amountMinor: Number(existingTx.amountMinor),
        currency: existingTx.currency,
        status: existingTx.status as any,
        checkoutPayload: {
          order_id: existingTx.providerOrderId,
          amount: Number(existingTx.amountMinor),
          currency: existingTx.currency,
        },
      };
    }

    // 4. Server-Authoritative Amount Calculation
    const amountMinor = Number(order.totalMinor);
    const currency = order.currency;

    // 5. Create provider payment order via gateway adapter
    const gatewayIntent = await gateway.createOrderIntent(order.id, amountMinor, currency, {
      userId: actor.userId,
    });

    // 6. Save payment_transactions record
    const [createdTx] = await this.db.db
      .insert(paymentTransactions)
      .values({
        orderId: order.id,
        provider: providerName,
        providerOrderId: gatewayIntent.providerOrderId,
        amountMinor,
        currency,
        status: 'pending',
      })
      .returning();

    this.audit.log({
      actorUserId: actor.userId,
      action: 'payment.intent_created',
      category: 'payment',
      entityType: 'payment_transaction',
      entityId: createdTx!.id,
      metadata: { providerOrderId: gatewayIntent.providerOrderId, amountMinor, currency },
    });

    return {
      paymentTransactionId: createdTx!.id,
      orderId: order.id,
      provider: providerName,
      providerOrderId: gatewayIntent.providerOrderId,
      amountMinor,
      currency,
      status: createdTx!.status as any,
      checkoutPayload: gatewayIntent.checkoutPayload,
    };
  }

  /**
   * PROCESS WEBHOOK (RAW HTTP REQUEST BODY BYTES SIGNATURE VERIFICATION)
   */
  async processWebhook(
    provider: string,
    rawBodyBuffer: Buffer,
    signatureHeader: string,
  ): Promise<{ status: string; processed: boolean }> {
    const gateway = this.getGateway(provider);

    // 1. RAW BODY HMAC SIGNATURE VERIFICATION
    const isValidSignature = gateway.verifyWebhookSignature(rawBodyBuffer, signatureHeader);
    if (!isValidSignature) {
      this.logger.error(`[Webhook] Invalid ${provider} HMAC signature detected.`);
      throw new UnauthorizedException(`Invalid ${provider} webhook signature.`);
    }

    // 2. Parse provider payload into normalized PaymentWebhookEvent
    const event = gateway.parseWebhookEvent(rawBodyBuffer);

    // 3. WEBHOOK REPLAY PROTECTION via DB UNIQUE(provider, provider_event_id)
    try {
      await this.db.db.insert(paymentEvents).values({
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        payloadReference: JSON.stringify(event.rawPayload),
        status: 'received',
      });
    } catch (err: any) {
      if (err.code === '23505') {
        this.logger.log(`[Webhook] Duplicate webhook event received: ${event.providerEventId}. Returning idempotent 200 OK.`);
        return { status: 'duplicate_event_ignored', processed: false };
      }
      throw err;
    }

    // 4. Execute Payment Confirmation inside ATOMIC TRANSACTION
    return await this.db.db.transaction(async (tx) => {
      // Find payment transaction by provider_order_id
      const [paymentTx] = await tx
        .select()
        .from(paymentTransactions)
        .where(
          and(
            eq(paymentTransactions.provider, provider),
            eq(paymentTransactions.providerOrderId, event.providerOrderId),
          ),
        )
        .for('update')
        .execute();

      if (!paymentTx) {
        this.logger.error(`[Webhook] Payment transaction not found for providerOrderId: ${event.providerOrderId}`);
        return { status: 'transaction_not_found', processed: false };
      }

      // Check if transaction was already processed (PAYMENT SUCCESS IDEMPOTENCY)
      if (paymentTx.status === 'paid') {
        this.logger.log(`[Webhook] Payment transaction ${paymentTx.id} already paid. Skipping duplicate processing.`);
        return { status: 'already_processed', processed: false };
      }

      // Lock parent Order
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, paymentTx.orderId))
        .for('update')
        .execute();

      if (!order) throw new Error(`Order ${paymentTx.orderId} not found.`);

      // Lock associated Reservation Hold
      const [hold] = await tx
        .select()
        .from(inventoryReservations)
        .where(eq(inventoryReservations.orderId, order.id))
        .for('update')
        .execute();

      // 5. TRIPLE AMOUNT & CURRENCY VALIDATION
      const expectedAmount = Number(paymentTx.amountMinor);
      const orderAmount = Number(order.totalMinor);

      if (event.amountMinor !== expectedAmount || event.amountMinor !== orderAmount) {
        this.logger.error(`[SECURITY ALERT] Webhook amount mismatch! Event: ${event.amountMinor}, Tx: ${expectedAmount}, Order: ${orderAmount}`);
        
        await tx
          .update(paymentTransactions)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(paymentTransactions.id, paymentTx.id));

        this.audit.log({
          actorUserId: null,
          action: 'security.amount_mismatch_detected',
          category: 'security',
          entityType: 'payment_transaction',
          entityId: paymentTx.id,
          metadata: { eventAmount: event.amountMinor, expectedAmount, orderAmount },
        });

        throw new BadRequestException('Payment amount mismatch.');
      }

      if (event.currency !== paymentTx.currency || event.currency !== order.currency) {
        throw new BadRequestException('Payment currency mismatch.');
      }

      // 6. LATE PAYMENT SAFETY: Check if hold has expired
      const isHoldExpired = !hold || hold.status === 'expired' || new Date() > hold.expiresAt;
      if (isHoldExpired) {
        this.logger.warn(`[Late Payment] Received payment for expired hold on order ${order.id}. Flagging for refund.`);
        
        await tx
          .update(paymentTransactions)
          .set({
            status: 'failed',
            providerPaymentId: event.providerPaymentId,
            providerPayloadReference: 'FLAGGED_EXPIRED_HOLD_REQUIRES_REFUND',
            updatedAt: new Date(),
          })
          .where(eq(paymentTransactions.id, paymentTx.id));

        this.audit.log({
          actorUserId: null,
          action: 'payment.late_payment_flagged_for_refund',
          category: 'payment',
          entityType: 'payment_transaction',
          entityId: paymentTx.id,
          metadata: { orderId: order.id, expiresAt: hold?.expiresAt },
        });

        return { status: 'late_payment_flagged_for_refund', processed: false };
      }

      // 7. SUCCESSFUL PAYMENT: ATOMIC INVENTORY CONVERSION & TICKET ISSUANCE
      // Transition hold -> CONVERTED
      this.holdStateMachine.assertTransition(hold.status as any, 'converted');
      await tx
        .update(inventoryReservations)
        .set({ status: 'converted' })
        .where(eq(inventoryReservations.id, hold.id));

      // Shift inventory: reserved_quantity -= N; sold_quantity += N
      await tx
        .update(ticketTypes)
        .set({
          reservedQuantity: sql`GREATEST(0, ${ticketTypes.reservedQuantity} - ${hold.quantity})`,
          soldQuantity: sql`${ticketTypes.soldQuantity} + ${hold.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(ticketTypes.id, hold.ticketTypeId));

      // Transition order -> PAID
      this.orderStateMachine.assertTransition(order.status as any, 'paid');
      await tx
        .update(orders)
        .set({ status: 'paid', updatedAt: new Date() })
        .where(eq(orders.id, order.id));

      // Update payment transaction -> PAID
      this.txStateMachine.assertTransition(paymentTx.status as any, 'paid');
      await tx
        .update(paymentTransactions)
        .set({
          status: 'paid',
          providerPaymentId: event.providerPaymentId,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, paymentTx.id));

      // Issue tickets
      await this.ticketIssuance.issueTicketsForOrder(tx, order.id);

      this.audit.log({
        actorUserId: order.userId,
        action: 'payment.success_confirmed',
        category: 'payment',
        entityType: 'payment_transaction',
        entityId: paymentTx.id,
        metadata: { providerPaymentId: event.providerPaymentId, orderId: order.id },
      });

      return { status: 'success', processed: true };
    });
  }

  /**
   * Find payment transaction by ID.
   */
  async findTransactionById(actor: AuthContext, id: string): Promise<PaymentTransaction> {
    const tx = await this.db.db.query.paymentTransactions.findFirst({
      where: eq(paymentTransactions.id, id),
    });

    if (!tx) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'Payment transaction not found.' });

    const order = await this.db.db.query.orders.findFirst({ where: eq(orders.id, tx.orderId) });
    if (order && order.userId !== actor.userId) {
      throw new ForbiddenException({ code: 'PAYMENT_ACCESS_DENIED', message: 'Cannot view payment transaction for another user order.' });
    }

    return {
      id: tx.id,
      orderId: tx.orderId,
      provider: tx.provider,
      providerOrderId: tx.providerOrderId,
      providerPaymentId: tx.providerPaymentId,
      amountMinor: Number(tx.amountMinor),
      currency: tx.currency,
      status: tx.status as any,
      providerPayloadReference: tx.providerPayloadReference,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
    };
  }
}
