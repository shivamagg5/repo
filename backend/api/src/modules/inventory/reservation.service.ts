import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  ticketTypes,
  events,
  orders,
  orderItems,
  inventoryReservations,
} from '../../database/schema/index';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { HoldStateMachineService } from './hold-state-machine.service';
import { AuditService } from '../../common/audit/audit.service';
import type {
  AuthContext,
  CreateReservationInput,
  ReservationDto,
} from '@platform/types';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger('ReservationService');

  constructor(
    private readonly db: DatabaseService,
    private readonly idempotency: IdempotencyService,
    private readonly holdStateMachine: HoldStateMachineService,
    private readonly audit: AuditService,
  ) {}

  /**
   * ATOMIC INVENTORY RESERVATION ENGINE
   * Guarantees ZERO OVERSELLING via PostgreSQL transaction row locking (`FOR UPDATE`)
   * and atomic counter checks (`sold_quantity + reserved_quantity + qty <= quantity`).
   */
  async createReservation(actor: AuthContext, input: CreateReservationInput, requestPath = '/reservations'): Promise<ReservationDto> {
    const { ticketTypeId, quantity, idempotencyKey } = input;

    if (quantity <= 0) {
      throw new BadRequestException({ code: 'INVALID_QUANTITY', message: 'Quantity must be positive.' });
    }

    // 1. Deduplicate via IdempotencyService if key provided
    const payloadHash = this.idempotency.hashPayload({ ticketTypeId, quantity });
    if (idempotencyKey) {
      const existing = await this.idempotency.findRecord(idempotencyKey, actor.userId);
      if (existing) {
        if (existing.requestHash !== payloadHash) {
          throw new ConflictException({
            code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
            message: 'Idempotency key reused with a different request payload.',
          });
        }
        return existing.responseBody as ReservationDto;
      }
    }

    // 2. Execute Atomic Transaction in PostgreSQL
    const reservation = await this.db.db.transaction(async (tx) => {
      // Row lock ticket type
      const [ticketType] = await tx
        .select()
        .from(ticketTypes)
        .where(eq(ticketTypes.id, ticketTypeId))
        .for('update')
        .execute();

      if (!ticketType) {
        throw new NotFoundException({ code: 'TICKET_TYPE_NOT_FOUND', message: 'Ticket type not found.' });
      }

      // Check ticket type status
      if (ticketType.status !== 'active') {
        throw new BadRequestException({
          code: 'TICKET_TYPE_NOT_ACTIVE',
          message: `Ticket type '${ticketType.name}' is not currently active for sale (status: ${ticketType.status}).`,
        });
      }

      // Verify parent event status
      const event = await tx.query.events.findFirst({ where: eq(events.id, ticketType.eventId) });
      if (!event) {
        throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Parent event not found.' });
      }

      if (!['published', 'live'].includes(event.status)) {
        throw new BadRequestException({
          code: 'EVENT_NOT_SALEABLE',
          message: `Event '${event.title}' is in state '${event.status}' and cannot process ticket reservations.`,
        });
      }

      // Verify sales window
      const now = new Date();
      if (ticketType.saleStartsAt && now < ticketType.saleStartsAt) {
        throw new BadRequestException({ code: 'SALES_NOT_STARTED', message: 'Ticket sales have not started yet.' });
      }
      if (ticketType.saleEndsAt && now > ticketType.saleEndsAt) {
        throw new BadRequestException({ code: 'SALES_ENDED', message: 'Ticket sales have ended for this ticket type.' });
      }

      // Verify per-order quantity bounds
      if (quantity < ticketType.minPerOrder) {
        throw new BadRequestException({
          code: 'MIN_QUANTITY_NOT_MET',
          message: `Minimum required quantity for '${ticketType.name}' is ${ticketType.minPerOrder}.`,
        });
      }
      if (quantity > ticketType.maxPerOrder) {
        throw new BadRequestException({
          code: 'MAX_QUANTITY_EXCEEDED',
          message: `Maximum allowed quantity per order for '${ticketType.name}' is ${ticketType.maxPerOrder}.`,
        });
      }

      // INVENTORY CHECK & ATOMIC UPDATE
      const available = ticketType.quantity - ticketType.soldQuantity - ticketType.reservedQuantity;
      if (available < quantity) {
        throw new ConflictException({
          code: 'INSUFFICIENT_INVENTORY',
          message: `Insufficient ticket inventory available. Requested: ${quantity}, Available: ${available}.`,
        });
      }

      // Increment reservedQuantity atomically
      const [updatedType] = await tx
        .update(ticketTypes)
        .set({
          reservedQuantity: sql`${ticketTypes.reservedQuantity} + ${quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ticketTypes.id, ticketTypeId),
            sql`(${ticketTypes.quantity} - ${ticketTypes.soldQuantity} - ${ticketTypes.reservedQuantity}) >= ${quantity}`,
          ),
        )
        .returning();

      if (!updatedType) {
        throw new ConflictException({
          code: 'INVENTORY_RESERVATION_RACE',
          message: 'Inventory reservation conflict. Concurrent request claimed remaining tickets.',
        });
      }

      // Calculate authoritative pricing (SERVER AUTHORITATIVE)
      const subtotalMinor = Number(ticketType.priceMinor) * quantity;
      const feesMinor = 0; // Baseline fees calculation
      const totalMinor = subtotalMinor + feesMinor;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minute hold

      // Create Order in 'created' state
      const [order] = await tx
        .insert(orders)
        .values({
          userId: actor.userId,
          eventId: event.id,
          status: 'created',
          subtotalMinor,
          feesMinor,
          taxMinor: 0,
          discountMinor: 0,
          totalMinor,
          currency: ticketType.currency,
          idempotencyKey: idempotencyKey ?? null,
        })
        .returning();

      // Create Order Item (Historical Price Snapshot)
      await tx.insert(orderItems).values({
        orderId: order!.id,
        ticketTypeId: ticketType.id,
        quantity,
        unitPriceMinor: ticketType.priceMinor,
        totalMinor: subtotalMinor,
      });

      // Create Inventory Reservation Hold
      const [hold] = await tx
        .insert(inventoryReservations)
        .values({
          ticketTypeId: ticketType.id,
          orderId: order!.id,
          userId: actor.userId,
          quantity,
          expiresAt,
          status: 'active',
        })
        .returning();

      const resultDto: ReservationDto = {
        reservationId: hold!.id,
        orderId: order!.id,
        ticketTypeId: ticketType.id,
        quantity,
        expiresAt: expiresAt.toISOString(),
        subtotalMinor,
        feesMinor,
        totalMinor,
        currency: ticketType.currency,
      };

      return resultDto;
    });

    // Save idempotency record if key provided
    if (idempotencyKey) {
      await this.idempotency.saveRecord(
        idempotencyKey,
        actor.userId,
        requestPath,
        payloadHash,
        201,
        reservation,
      );
    }

    this.audit.log({
      actorUserId: actor.userId,
      action: 'inventory.hold_created',
      category: 'order',
      entityType: 'inventory_reservation',
      entityId: reservation.reservationId,
      metadata: { ticketTypeId, quantity, expiresAt: reservation.expiresAt },
    });

    return reservation;
  }

  /**
   * Cancel an active reservation hold and atomically release reserved inventory.
   */
  async cancelReservation(actor: AuthContext, reservationId: string): Promise<void> {
    await this.db.db.transaction(async (tx) => {
      const [hold] = await tx
        .select()
        .from(inventoryReservations)
        .where(eq(inventoryReservations.id, reservationId))
        .for('update')
        .execute();

      if (!hold) {
        throw new NotFoundException({ code: 'RESERVATION_NOT_FOUND', message: 'Reservation not found.' });
      }

      if (hold.userId && hold.userId !== actor.userId) {
        throw new ForbiddenException({ code: 'RESERVATION_ACCESS_DENIED', message: 'Cannot cancel another user hold.' });
      }

      this.holdStateMachine.assertTransition(hold.status as any, 'cancelled');

      // Update hold status
      await tx
        .update(inventoryReservations)
        .set({ status: 'cancelled' })
        .where(eq(inventoryReservations.id, hold.id));

      // Decrement reservedQuantity on ticket_types
      await tx
        .update(ticketTypes)
        .set({
          reservedQuantity: sql`GREATEST(0, ${ticketTypes.reservedQuantity} - ${hold.quantity})`,
          updatedAt: new Date(),
        })
        .where(eq(ticketTypes.id, hold.ticketTypeId));

      // Update order status to cancelled
      await tx
        .update(orders)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(orders.id, hold.orderId));
    });

    this.audit.log({
      actorUserId: actor.userId,
      action: 'inventory.hold_released',
      category: 'order',
      entityType: 'inventory_reservation',
      entityId: reservationId,
    });
  }

  /**
   * Find reservation by ID for owner or admin.
   */
  async findReservation(actor: AuthContext, reservationId: string): Promise<any> {
    const hold = await this.db.db.query.inventoryReservations.findFirst({
      where: eq(inventoryReservations.id, reservationId),
    });

    if (!hold) throw new NotFoundException({ code: 'RESERVATION_NOT_FOUND', message: 'Reservation not found.' });
    if (hold.userId && hold.userId !== actor.userId) {
      throw new ForbiddenException({ code: 'RESERVATION_ACCESS_DENIED', message: 'Cannot access another user hold.' });
    }

    return hold;
  }
}
