import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { tickets } from '../../database/schema/index';
import type { AuthContext, Ticket } from '@platform/types';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger('TicketsService');

  constructor(private readonly db: DatabaseService) {}

  /**
   * Find all tickets belonging to authenticated consumer.
   */
  async findUserTickets(actor: AuthContext): Promise<Ticket[]> {
    const list = await this.db.db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, actor.userId))
      .execute();

    return list.map((t) => this.mapTicket(t));
  }

  /**
   * Find ticket by ID for owner.
   */
  async findTicketById(actor: AuthContext, ticketId: string): Promise<Ticket> {
    const tkt = await this.db.db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId),
    });

    if (!tkt) throw new NotFoundException({ code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' });
    if (tkt.userId !== actor.userId) {
      throw new ForbiddenException({ code: 'TICKET_ACCESS_DENIED', message: 'Cannot access another user ticket.' });
    }

    return this.mapTicket(tkt);
  }

  private mapTicket(raw: typeof tickets.$inferSelect): Ticket {
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
      issuedAt: raw.issuedAt.toISOString(),
      checkedInAt: raw.checkedInAt ? raw.checkedInAt.toISOString() : null,
      voidedAt: raw.voidedAt ? raw.voidedAt.toISOString() : null,
    };
  }
}
