import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  events,
  ticketTypes,
  orders,
  orderItems,
  inventoryReservations,
  promoterCampaigns,
} from '../../database/schema/index';
import { PaymentsService } from '../payments/payments.service';
import { AuditService } from '../../common/audit/audit.service';
import { HoldStateMachineService } from '../inventory/hold-state-machine.service';
import { OrderStateMachineService } from '../orders/order-state-machine.service';
import { RealtimeService } from '../realtime/realtime.service';
import type { AuthContext } from '@platform/types';

export interface CheckoutItemInput {
  ticketTypeId: string;
  quantity: number;
}

export interface CreateCheckoutSessionInput {
  eventId: string;
  items: CheckoutItemInput[];
  promoCode?: string | null;
}

export interface CheckoutLineItemDto {
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CheckoutSessionDto {
  id: string;
  eventId: string;
  items: CheckoutLineItemDto[];
  subtotal: number;
  fees: number;
  tax: number;
  total: number;
  currency: string;
  promoDiscount: number;
  promoCode: string | null;
  expiresAt: string;
  status: string;
}

export interface PaymentIntentResponseDto {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  key: string;
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger('CheckoutService');

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    private readonly audit: AuditService,
    private readonly holdStateMachine: HoldStateMachineService,
    private readonly orderStateMachine: OrderStateMachineService,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  /**
   * CREATE CHECKOUT SESSION
   * Atomically locks requested ticket tiers, reserves inventory, creates an order
   * and items, and returns authoritative session details with price calculations.
   */
  async createSession(
    actor: AuthContext,
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSessionDto> {
    const { eventId, items, promoCode } = input;

    if (!items || items.length === 0) {
      throw new BadRequestException({ code: 'EMPTY_CHECKOUT', message: 'At least one ticket item is required.' });
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        throw new BadRequestException({ code: 'INVALID_QUANTITY', message: 'Ticket quantity must be positive.' });
      }
    }

    const session = await this.db.db.transaction(async (tx) => {
      // 1. Verify Event
      const event = await tx.query.events.findFirst({
        where: eq(events.id, eventId),
      });

      if (!event) {
        throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
      }

      if (!['published', 'live'].includes(event.status)) {
        throw new BadRequestException({
          code: 'EVENT_NOT_SALEABLE',
          message: `Event '${event.title}' is not open for ticket sales.`,
        });
      }

      const now = new Date();
      const requestedTypeIds = items.map((i) => i.ticketTypeId);

      // 2. Lock ticket tiers FOR UPDATE
      const tiers = await tx
        .select()
        .from(ticketTypes)
        .where(and(eq(ticketTypes.eventId, eventId), inArray(ticketTypes.id, requestedTypeIds)))
        .for('update')
        .execute();

      const tierMap = new Map(tiers.map((t) => [t.id, t]));

      for (const item of items) {
        const tier = tierMap.get(item.ticketTypeId);
        if (!tier) {
          throw new NotFoundException({
            code: 'TICKET_TYPE_NOT_FOUND',
            message: `Ticket type ${item.ticketTypeId} not found for this event.`,
          });
        }

        if (tier.status !== 'active') {
          throw new BadRequestException({
            code: 'TICKET_TYPE_INACTIVE',
            message: `Ticket tier '${tier.name}' is no longer active.`,
          });
        }

        if (tier.saleStartsAt && now < tier.saleStartsAt) {
          throw new BadRequestException({
            code: 'SALES_NOT_STARTED',
            message: `Sales for '${tier.name}' have not started yet.`,
          });
        }

        if (tier.saleEndsAt && now > tier.saleEndsAt) {
          throw new BadRequestException({
            code: 'SALES_ENDED',
            message: `Sales for '${tier.name}' have ended.`,
          });
        }

        if (item.quantity < tier.minPerOrder) {
          throw new BadRequestException({
            code: 'MIN_QUANTITY_NOT_MET',
            message: `Minimum ${tier.minPerOrder} tickets required for '${tier.name}'.`,
          });
        }

        if (item.quantity > tier.maxPerOrder) {
          throw new BadRequestException({
            code: 'MAX_QUANTITY_EXCEEDED',
            message: `Maximum ${tier.maxPerOrder} tickets allowed per order for '${tier.name}'.`,
          });
        }

        const available = tier.quantity - tier.soldQuantity - tier.reservedQuantity;
        if (available < item.quantity) {
          throw new ConflictException({
            code: 'INSUFFICIENT_INVENTORY',
            message: `Insufficient tickets available for '${tier.name}'. Requested: ${item.quantity}, Available: ${available}.`,
          });
        }
      }

      // 3. Atomically update reservedQuantity for each tier
      for (const item of items) {
        const [updatedTier] = await tx
          .update(ticketTypes)
          .set({
            reservedQuantity: sql`${ticketTypes.reservedQuantity} + ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(ticketTypes.id, item.ticketTypeId),
              sql`(${ticketTypes.quantity} - ${ticketTypes.soldQuantity} - ${ticketTypes.reservedQuantity}) >= ${item.quantity}`,
            ),
          )
          .returning();

        if (!updatedTier) {
          throw new ConflictException({
            code: 'INVENTORY_RESERVATION_RACE',
            message: 'Inventory reservation conflict. Concurrent request claimed remaining tickets.',
          });
        }
      }

      // 4. Calculate prices in minor units
      let subtotalMinor = 0;
      const lineItems: CheckoutLineItemDto[] = [];
      const primaryCurrency = tiers[0]?.currency ?? 'INR';

      for (const item of items) {
        const tier = tierMap.get(item.ticketTypeId)!;
        const unitPrice = Number(tier.priceMinor);
        const lineTotal = unitPrice * item.quantity;
        subtotalMinor += lineTotal;

        lineItems.push({
          ticketTypeId: tier.id,
          ticketTypeName: tier.name,
          quantity: item.quantity,
          unitPrice,
          lineTotal,
        });
      }

      // Check Promo Code if provided
      let promoDiscountMinor = 0;
      let validatedPromoCode: string | null = null;

      if (promoCode && promoCode.trim().length > 0) {
        const cleanCode = promoCode.trim().toUpperCase();
        const campaign = await tx.query.promoterCampaigns.findFirst({
          where: and(
            eq(promoterCampaigns.eventId, eventId),
            sql`UPPER(${promoterCampaigns.code}) = ${cleanCode}`,
            eq(promoterCampaigns.status, 'active'),
          ),
        });

        if (campaign) {
          validatedPromoCode = campaign.code;
          if (campaign.commissionType === 'percentage') {
            const pct = Number(campaign.commissionValue);
            promoDiscountMinor = Math.round((subtotalMinor * Math.min(pct, 50)) / 100);
          } else {
            promoDiscountMinor = Math.min(Number(campaign.commissionValue), subtotalMinor);
          }
        } else if (cleanCode === 'EARLY10' || cleanCode === 'FESTIVAL10') {
          validatedPromoCode = cleanCode;
          promoDiscountMinor = Math.round(subtotalMinor * 0.1); // 10% demo discount
        }
      }

      const feesMinor = 0;
      const taxMinor = 0;
      const totalMinor = Math.max(0, subtotalMinor + feesMinor + taxMinor - promoDiscountMinor);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minute hold

      // 5. Create Order
      const [order] = await tx
        .insert(orders)
        .values({
          userId: actor.userId,
          eventId: event.id,
          status: 'created',
          subtotalMinor,
          feesMinor,
          taxMinor,
          discountMinor: promoDiscountMinor,
          totalMinor,
          currency: primaryCurrency,
        })
        .returning();

      // 6. Insert Order Items & Inventory Holds
      for (const line of lineItems) {
        await tx.insert(orderItems).values({
          orderId: order!.id,
          ticketTypeId: line.ticketTypeId,
          quantity: line.quantity,
          unitPriceMinor: line.unitPrice,
          totalMinor: line.lineTotal,
        });

        await tx.insert(inventoryReservations).values({
          ticketTypeId: line.ticketTypeId,
          orderId: order!.id,
          userId: actor.userId,
          quantity: line.quantity,
          expiresAt,
          status: 'active',
        });
      }

      const dto: CheckoutSessionDto = {
        id: order!.id,
        eventId: event.id,
        items: lineItems,
        subtotal: subtotalMinor,
        fees: feesMinor,
        tax: taxMinor,
        total: totalMinor,
        currency: primaryCurrency,
        promoDiscount: promoDiscountMinor,
        promoCode: validatedPromoCode,
        expiresAt: expiresAt.toISOString(),
        status: 'active',
      };

      return dto;
    });

    this.audit.log({
      actorUserId: actor.userId,
      action: 'checkout.session_created',
      category: 'order',
      entityType: 'order',
      entityId: session.id,
      metadata: { eventId, total: session.total, itemsCount: items.length },
    });

    return session;
  }

  /**
   * GET CHECKOUT SESSION
   */
  async getSession(actor: AuthContext, sessionId: string): Promise<CheckoutSessionDto> {
    const order = await this.db.db.query.orders.findFirst({
      where: eq(orders.id, sessionId),
    });

    if (!order) {
      throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Checkout session not found.' });
    }

    if (order.userId !== actor.userId) {
      throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Cannot access another user session.' });
    }

    const items = await this.db.db
      .select({
        item: orderItems,
        tierName: ticketTypes.name,
      })
      .from(orderItems)
      .leftJoin(ticketTypes, eq(orderItems.ticketTypeId, ticketTypes.id))
      .where(eq(orderItems.orderId, order.id))
      .execute();

    const holds = await this.db.db
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, order.id))
      .limit(1)
      .execute();

    const expiresAt = holds[0]?.expiresAt?.toISOString() ?? new Date(order.createdAt.getTime() + 10 * 60 * 1000).toISOString();

    return {
      id: order.id,
      eventId: order.eventId,
      items: items.map((i) => ({
        ticketTypeId: i.item.ticketTypeId,
        ticketTypeName: i.tierName ?? 'General Ticket',
        quantity: i.item.quantity,
        unitPrice: Number(i.item.unitPriceMinor),
        lineTotal: Number(i.item.totalMinor),
      })),
      subtotal: Number(order.subtotalMinor),
      fees: Number(order.feesMinor),
      tax: Number(order.taxMinor),
      total: Number(order.totalMinor),
      currency: order.currency,
      promoDiscount: Number(order.discountMinor),
      promoCode: null,
      expiresAt,
      status: order.status === 'created' ? 'active' : order.status,
    };
  }

  /**
   * INITIATE PAYMENT FOR SESSION
   */
  async initiatePayment(actor: AuthContext, sessionId: string): Promise<PaymentIntentResponseDto> {
    const intent = await this.paymentsService.createPaymentIntent(actor, {
      orderId: sessionId,
      provider: 'razorpay',
    });

    const key = this.configService.get<string>('RAZORPAY_KEY_ID') || 'rzp_test_TRAzvU0SEyAz0K';

    const payload = (intent.checkoutPayload ?? {}) as Record<string, any>;
    return {
      razorpayOrderId: (payload.order_id as string) ?? intent.providerOrderId,
      amount: typeof payload.amount === 'number' ? payload.amount : intent.amountMinor,
      currency: (payload.currency as string) ?? intent.currency,
      key,
    };
  }

  /**
   * CANCEL CHECKOUT SESSION
   */
  async cancelSession(actor: AuthContext, sessionId: string): Promise<{ success: boolean }> {
    await this.db.db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({
        where: eq(orders.id, sessionId),
      });

      if (!order) {
        throw new NotFoundException({ code: 'SESSION_NOT_FOUND', message: 'Checkout session not found.' });
      }

      if (order.userId !== actor.userId) {
        throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Cannot cancel another user session.' });
      }

      if (['paid', 'completed'].includes(order.status)) {
        throw new BadRequestException({ code: 'ORDER_ALREADY_PAID', message: 'Cannot cancel a paid order.' });
      }

      // Reclaim reservations
      const holds = await tx
        .select()
        .from(inventoryReservations)
        .where(and(eq(inventoryReservations.orderId, order.id), eq(inventoryReservations.status, 'active')))
        .for('update')
        .execute();

      for (const hold of holds) {
        await tx
          .update(ticketTypes)
          .set({
            reservedQuantity: sql`GREATEST(0, ${ticketTypes.reservedQuantity} - ${hold.quantity})`,
            updatedAt: new Date(),
          })
          .where(eq(ticketTypes.id, hold.ticketTypeId));

        await tx
          .update(inventoryReservations)
          .set({ status: 'cancelled' })
          .where(eq(inventoryReservations.id, hold.id));
      }

      await tx
        .update(orders)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(orders.id, order.id));
    });

    this.audit.log({
      actorUserId: actor.userId,
      action: 'checkout.session_cancelled',
      category: 'order',
      entityType: 'order',
      entityId: sessionId,
    });

    return { success: true };
  }
}
