import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { ticketTypes, events } from '../../database/schema/index';
import { RbacService } from '../auth/rbac.service';
import { AuditService } from '../../common/audit/audit.service';
import type {
  AuthContext,
  CreateTicketTypeInput,
  UpdateTicketTypeInput,
  TicketType,
} from '@platform/types';

@Injectable()
export class TicketTypesService {
  private readonly logger = new Logger('TicketTypesService');

  constructor(
    private readonly db: DatabaseService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Create a new ticket type for an event.
   * Requires organization membership and `event.edit` permission.
   */
  async createTicketType(actor: AuthContext, input: CreateTicketTypeInput): Promise<TicketType> {
    const event = await this.db.db.query.events.findFirst({
      where: eq(events.id, input.eventId),
    });

    if (!event) {
      throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Event not found.' });
    }

    // Verify Organization membership + permission
    await this.rbac.assertOrgMembership(actor.userId, event.organizerOrganizationId);
    await this.rbac.assertPermissionInOrg(actor.userId, event.organizerOrganizationId, 'event.edit');

    if (input.priceMinor < 0) {
      throw new BadRequestException({ code: 'INVALID_PRICE', message: 'Price cannot be negative.' });
    }

    const minQty = input.minPerOrder ?? 1;
    const maxQty = input.maxPerOrder ?? 10;
    if (maxQty < minQty) {
      throw new BadRequestException({ code: 'INVALID_QUANTITY_RANGE', message: 'maxPerOrder must be >= minPerOrder.' });
    }

    const [created] = await this.db.db
      .insert(ticketTypes)
      .values({
        eventId: input.eventId,
        name: input.name,
        description: input.description ?? null,
        priceMinor: input.priceMinor,
        currency: input.currency ?? 'INR',
        quantity: input.quantity,
        soldQuantity: 0,
        reservedQuantity: 0,
        minPerOrder: minQty,
        maxPerOrder: maxQty,
        saleStartsAt: input.saleStartsAt ? new Date(input.saleStartsAt) : null,
        saleEndsAt: input.saleEndsAt ? new Date(input.saleEndsAt) : null,
        status: input.status ?? 'active',
      })
      .returning();

    this.audit.log({
      actorUserId: actor.userId,
      action: 'ticket_type.created',
      category: 'organization',
      entityType: 'ticket_type',
      entityId: created!.id,
      metadata: { eventId: input.eventId, name: input.name, priceMinor: input.priceMinor },
    });

    return this.mapTicketType(created!);
  }

  /**
   * Update an existing ticket type.
   */
  async updateTicketType(actor: AuthContext, ticketTypeId: string, input: UpdateTicketTypeInput): Promise<TicketType> {
    const existing = await this.db.db.query.ticketTypes.findFirst({
      where: eq(ticketTypes.id, ticketTypeId),
    });

    if (!existing) {
      throw new NotFoundException({ code: 'TICKET_TYPE_NOT_FOUND', message: 'Ticket type not found.' });
    }

    const event = await this.db.db.query.events.findFirst({
      where: eq(events.id, existing.eventId),
    });

    if (!event) throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Parent event not found.' });

    await this.rbac.assertOrgMembership(actor.userId, event.organizerOrganizationId);
    await this.rbac.assertPermissionInOrg(actor.userId, event.organizerOrganizationId, 'event.edit');

    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (input.name !== undefined) updateData['name'] = input.name;
    if (input.description !== undefined) updateData['description'] = input.description;
    if (input.priceMinor !== undefined) {
      if (input.priceMinor < 0) throw new BadRequestException({ code: 'INVALID_PRICE', message: 'Price cannot be negative.' });
      updateData['priceMinor'] = input.priceMinor;
    }
    if (input.quantity !== undefined) updateData['quantity'] = input.quantity;
    if (input.minPerOrder !== undefined) updateData['minPerOrder'] = input.minPerOrder;
    if (input.maxPerOrder !== undefined) updateData['maxPerOrder'] = input.maxPerOrder;
    if (input.saleStartsAt !== undefined) updateData['saleStartsAt'] = input.saleStartsAt ? new Date(input.saleStartsAt) : null;
    if (input.saleEndsAt !== undefined) updateData['saleEndsAt'] = input.saleEndsAt ? new Date(input.saleEndsAt) : null;
    if (input.status !== undefined) updateData['status'] = input.status;

    const [updated] = await this.db.db
      .update(ticketTypes)
      .set(updateData)
      .where(eq(ticketTypes.id, ticketTypeId))
      .returning();

    this.audit.log({
      actorUserId: actor.userId,
      action: 'ticket_type.updated',
      category: 'organization',
      entityType: 'ticket_type',
      entityId: ticketTypeId,
    });

    return this.mapTicketType(updated!);
  }

  /**
   * Find ticket types for an event.
   */
  async findEventTicketTypes(eventId: string): Promise<TicketType[]> {
    const list = await this.db.db
      .select()
      .from(ticketTypes)
      .where(and(eq(ticketTypes.eventId, eventId), eq(ticketTypes.status, 'active')))
      .execute();

    return list.map((t) => this.mapTicketType(t));
  }

  private mapTicketType(raw: typeof ticketTypes.$inferSelect): TicketType {
    return {
      id: raw.id,
      eventId: raw.eventId,
      name: raw.name,
      description: raw.description,
      priceMinor: Number(raw.priceMinor),
      currency: raw.currency,
      quantity: raw.quantity,
      soldQuantity: raw.soldQuantity,
      reservedQuantity: raw.reservedQuantity,
      minPerOrder: raw.minPerOrder,
      maxPerOrder: raw.maxPerOrder,
      saleStartsAt: raw.saleStartsAt ? raw.saleStartsAt.toISOString() : null,
      saleEndsAt: raw.saleEndsAt ? raw.saleEndsAt.toISOString() : null,
      status: raw.status,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };
  }
}
