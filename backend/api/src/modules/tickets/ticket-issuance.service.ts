import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { tickets, orders, orderItems } from '../../database/schema/index';

export interface IssuedTicketResult {
  id: string;
  ticketNumber: string;
  ticketTypeId: string;
  eventId: string;
  userId: string;
  rawQrToken?: string; // Optional raw token for initial return/email payload
}

@Injectable()
export class TicketIssuanceService {
  private readonly logger = new Logger('TicketIssuanceService');

  constructor(private readonly db: DatabaseService) {}

  /**
   * Cryptographically secure QR token generation.
   * Generates 256-bit random bytes and computes SHA-256 hash for database storage.
   */
  generateSecureQrCredential(): { rawToken: string; tokenHash: string } {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, tokenHash };
  }

  /**
   * Generate human-readable unique ticket number (`TKT-YYYYMMDD-XXXXXX`).
   */
  generateTicketNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TKT-${dateStr}-${randHex}`;
  }

  /**
   * Atomically issue tickets for order inside database transaction.
   */
  async issueTicketsForOrder(tx: any, orderId: string): Promise<IssuedTicketResult[]> {
    const order = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order) throw new Error(`Order ${orderId} not found for ticket issuance.`);

    const items = await tx
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .execute();

    const issued: IssuedTicketResult[] = [];

    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketNumber = this.generateTicketNumber();
        const { rawToken, tokenHash } = this.generateSecureQrCredential();

        const [tkt] = await tx
          .insert(tickets)
          .values({
            orderId: order.id,
            orderItemId: item.id,
            ticketTypeId: item.ticketTypeId,
            eventId: order.eventId,
            userId: order.userId,
            ticketNumber,
            status: 'issued',
            qrTokenHash: tokenHash,
          })
          .returning();

        issued.push({
          id: tkt.id,
          ticketNumber: tkt.ticketNumber,
          ticketTypeId: tkt.ticketTypeId,
          eventId: tkt.eventId,
          userId: tkt.userId,
          rawQrToken: rawToken,
        });
      }
    }

    this.logger.log(`[TicketIssuanceService] Issued ${issued.length} tickets for order ${orderId}`);
    return issued;
  }
}
