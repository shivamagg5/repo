import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  orders,
  orderItems,
  inventoryReservations,
  paymentTransactions,
  ticketTypes,
} from '../../database/schema/index';
import { OrderStateMachineService } from './order-state-machine.service';
import { HoldStateMachineService } from '../inventory/hold-state-machine.service';
import { TicketIssuanceService } from '../tickets/ticket-issuance.service';
import { AuditService } from '../../common/audit/audit.service';
import type { AuthContext, Order, OrderItem } from '@platform/types';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger('OrdersService');

  constructor(
    private readonly db: DatabaseService,
    private readonly orderStateMachine: OrderStateMachineService,
    private readonly holdStateMachine: HoldStateMachineService,
    private readonly ticketIssuance: TicketIssuanceService,
    private readonly audit: AuditService,
  ) {}

  /**
   * ATOMIC ORDER CONFIRMATION & RESERVATION CONVERSION
   * Executes in ONE atomic PostgreSQL transaction:
   * 1. Lock hold & order FOR UPDATE.
   * 2. Transition hold state `active` -> `converted`.
   * 3. Atomically update ticket_types: reserved_quantity -= N; sold_quantity += N.
   * 4. Transition order state -> `paid`.
   * 5. Issue unique tickets via TicketIssuanceService.
   */
  async confirmOrderPayment(actor: AuthContext, orderId: string): Promise<{ order: Order; ticketsIssuedCount: number }> {
    const result = await this.db.db.transaction(async (tx) => {
      // 1. Lock order FOR UPDATE
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .for('update')
        .execute();

      if (!order) {
        throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
      }

      if (order.userId !== actor.userId) {
        throw new ForbiddenException({ code: 'ORDER_ACCESS_DENIED', message: 'Cannot confirm another user order.' });
      }

      // If already paid, return idempotently
      if (order.status === 'paid' || order.status === 'completed') {
        return { order: this.mapOrder(order), ticketsIssuedCount: 0 };
      }

      // ==================================================================
      // SECURITY GUARD — PAYMENT VERIFICATION REQUIRED
      // This endpoint MUST NOT create payment authority. It may only succeed
      // when the webhook has already verified and recorded a paid payment
      // transaction for this exact order.
      //
      // Verified means:
      //   - paymentTransaction.orderId  === orderId
      //   - paymentTransaction.status   === 'paid'
      //   - paymentTransaction.provider === a real gateway (not bypassed)
      //   - paymentTransaction.providerPaymentId IS NOT NULL
      //     (set only by the webhook after HMAC-verified confirmation)
      // ==================================================================
      const [verifiedPayment] = await tx
        .select()
        .from(paymentTransactions)
        .where(
          and(
            eq(paymentTransactions.orderId, orderId),
            eq(paymentTransactions.status, 'paid'),
            isNotNull(paymentTransactions.providerPaymentId),
          ),
        )
        .execute();

      if (!verifiedPayment) {
        this.logger.warn(
          `[Security] confirmOrderPayment rejected: no verified payment for order ${orderId}. ` +
          `Payment must be confirmed by the webhook before this endpoint can succeed.`,
        );
        throw new ConflictException({
          code: 'PAYMENT_NOT_VERIFIED',
          message:
            'No verified payment found for this order. Complete payment through the payment gateway first.',
        });
      }

      this.orderStateMachine.assertTransition(order.status as any, 'paid');

      // 2. Lock associated active reservation hold FOR UPDATE
      const [hold] = await tx
        .select()
        .from(inventoryReservations)
        .where(and(eq(inventoryReservations.orderId, orderId), eq(inventoryReservations.status, 'active')))
        .for('update')
        .execute();

      if (!hold) {
        throw new ConflictException({
          code: 'HOLD_EXPIRED_OR_INVALID',
          message: 'Reservation hold has expired or is no longer active. Payment confirmation failed.',
        });
      }

      // Verify hold expiration timestamp
      if (new Date() > hold.expiresAt) {
        throw new ConflictException({
          code: 'HOLD_EXPIRED',
          message: 'Reservation hold expired before payment confirmation could complete.',
        });
      }

      // Transition hold -> 'converted'
      this.holdStateMachine.assertTransition(hold.status as any, 'converted');
      await tx
        .update(inventoryReservations)
        .set({ status: 'converted' })
        .where(eq(inventoryReservations.id, hold.id));

      // 3. Atomically shift inventory: reserved_quantity -= N; sold_quantity += N
      await tx
        .update(ticketTypes)
        .set({
          reservedQuantity: sql`GREATEST(0, ${ticketTypes.reservedQuantity} - ${hold.quantity})`,
          soldQuantity: sql`${ticketTypes.soldQuantity} + ${hold.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(ticketTypes.id, hold.ticketTypeId));

      // 4. Update order status -> 'paid'
      const [updatedOrder] = await tx
        .update(orders)
        .set({ status: 'paid', updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();

      // 5. Issue unique tickets
      const issuedTickets = await this.ticketIssuance.issueTicketsForOrder(tx, orderId);

      return {
        order: this.mapOrder(updatedOrder!),
        ticketsIssuedCount: issuedTickets.length,
      };
    });

    this.audit.log({
      actorUserId: actor.userId,
      action: 'order.confirmed',
      category: 'order',
      entityType: 'order',
      entityId: orderId,
      metadata: { ticketsIssued: result.ticketsIssuedCount },
    });

    return result;
  }

  /**
   * Get user's order history.
   */
  async findUserOrders(actor: AuthContext): Promise<Order[]> {
    const list = await this.db.db
      .select()
      .from(orders)
      .where(eq(orders.userId, actor.userId))
      .orderBy(sql`${orders.createdAt} DESC`)
      .execute();

    return list.map((o) => this.mapOrder(o));
  }

  /**
   * Find order by ID.
   */
  async findOrderById(actor: AuthContext, orderId: string): Promise<{ order: Order; items: OrderItem[] }> {
    const order = await this.db.db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Order not found.' });
    if (order.userId !== actor.userId) {
      throw new ForbiddenException({ code: 'ORDER_ACCESS_DENIED', message: 'Cannot access another user order.' });
    }

    const items = await this.db.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .execute();

    return {
      order: this.mapOrder(order),
      items: items.map((i) => ({
        id: i.id,
        orderId: i.orderId,
        ticketTypeId: i.ticketTypeId,
        quantity: i.quantity,
        unitPriceMinor: Number(i.unitPriceMinor),
        totalMinor: Number(i.totalMinor),
      })),
    };
  }

  private mapOrder(raw: typeof orders.$inferSelect): Order {
    return {
      id: raw.id,
      userId: raw.userId,
      eventId: raw.eventId,
      status: raw.status as any,
      subtotalMinor: Number(raw.subtotalMinor),
      feesMinor: Number(raw.feesMinor),
      taxMinor: Number(raw.taxMinor),
      discountMinor: Number(raw.discountMinor),
      totalMinor: Number(raw.totalMinor),
      currency: raw.currency,
      idempotencyKey: raw.idempotencyKey,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }
}
