import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { tickets, ticketTypes, events, venues } from '../../database/schema/index';
import { ScannerCryptoService } from '../scanner/scanner-crypto.service';
import type { AuthContext, Ticket } from '@platform/types';

interface TicketMetadata {
  ticketTypeName?: string;
  eventTitle?: string;
  venueName?: string;
  eventStartsAt?: Date | null;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger('TicketsService');

  constructor(
    private readonly db: DatabaseService,
    private readonly scannerCrypto: ScannerCryptoService,
  ) {}

  /**
   * Find all tickets belonging to authenticated consumer with rich event and tier metadata.
   */
  async findUserTickets(actor: AuthContext): Promise<Ticket[]> {
    const list = await this.db.db
      .select({
        ticket: tickets,
        ticketTypeName: ticketTypes.name,
        eventTitle: events.title,
        eventStartsAt: events.startsAt,
        venueName: venues.name,
      })
      .from(tickets)
      .leftJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
      .leftJoin(events, eq(tickets.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(tickets.userId, actor.userId))
      .execute();

    return list.map((item) =>
      this.mapTicket(item.ticket, {
        ticketTypeName: item.ticketTypeName ?? undefined,
        eventTitle: item.eventTitle ?? undefined,
        venueName: item.venueName ?? undefined,
        eventStartsAt: item.eventStartsAt ?? undefined,
      }),
    );
  }

  /**
   * Find ticket by ID for owner with full event, venue, and tier details.
   */
  async findTicketById(actor: AuthContext, ticketId: string): Promise<Ticket> {
    const [row] = await this.db.db
      .select({
        ticket: tickets,
        ticketTypeName: ticketTypes.name,
        eventTitle: events.title,
        eventStartsAt: events.startsAt,
        venueName: venues.name,
      })
      .from(tickets)
      .leftJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
      .leftJoin(events, eq(tickets.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(tickets.id, ticketId))
      .limit(1)
      .execute();

    if (!row || !row.ticket) {
      throw new NotFoundException({ code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
    }
    if (row.ticket.userId !== actor.userId) {
      throw new ForbiddenException({ code: 'TICKET_ACCESS_DENIED', message: 'Cannot access another user ticket.' });
    }

    return this.mapTicket(row.ticket, {
      ticketTypeName: row.ticketTypeName ?? undefined,
      eventTitle: row.eventTitle ?? undefined,
      venueName: row.venueName ?? undefined,
      eventStartsAt: row.eventStartsAt ?? undefined,
    });
  }

  /**
   * Find tickets belonging to a specific order for the authenticated owner.
   */
  async findTicketsByOrderId(actor: AuthContext, orderId: string): Promise<Ticket[]> {
    const list = await this.db.db
      .select({
        ticket: tickets,
        ticketTypeName: ticketTypes.name,
        eventTitle: events.title,
        eventStartsAt: events.startsAt,
        venueName: venues.name,
      })
      .from(tickets)
      .leftJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
      .leftJoin(events, eq(tickets.eventId, events.id))
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(and(eq(tickets.orderId, orderId), eq(tickets.userId, actor.userId)))
      .execute();

    return list.map((item) =>
      this.mapTicket(item.ticket, {
        ticketTypeName: item.ticketTypeName ?? undefined,
        eventTitle: item.eventTitle ?? undefined,
        venueName: item.venueName ?? undefined,
        eventStartsAt: item.eventStartsAt ?? undefined,
      }),
    );
  }

  private mapTicket(raw: typeof tickets.$inferSelect, meta?: TicketMetadata): Ticket {
    let qrToken: string | undefined;

    if (raw.status === 'issued' || raw.status === 'checked_in') {
      try {
        qrToken = this.scannerCrypto.signTicketCredential({
          version: 'v1',
          ticketId: raw.id,
          eventId: raw.eventId,
          ticketTypeId: raw.ticketTypeId,
          issuedAt: raw.issuedAt.toISOString(),
          expiresAt: null,
          keyVersion: 'v1-2026',
        });
      } catch (err) {
        this.logger.warn(`Failed to sign ticket credential for ticket ${raw.id}: ${(err as Error).message}`);
      }
    }

    return {
      id: raw.id,
      orderId: raw.orderId,
      orderItemId: raw.orderItemId,
      ticketTypeId: raw.ticketTypeId,
      eventId: raw.eventId,
      userId: raw.userId,
      ticketNumber: raw.ticketNumber,
      status: raw.status as any,
      qrTokenHash: raw.qrTokenHash,
      qrToken,
      issuedAt: raw.issuedAt.toISOString(),
      checkedInAt: raw.checkedInAt ? raw.checkedInAt.toISOString() : null,
      voidedAt: raw.voidedAt ? raw.voidedAt.toISOString() : null,
      ticketTypeName: meta?.ticketTypeName,
      tierName: meta?.ticketTypeName,
      eventTitle: meta?.eventTitle,
      venueName: meta?.venueName,
      eventStartsAt: meta?.eventStartsAt ? meta.eventStartsAt.toISOString() : undefined,
    };
  }
}
