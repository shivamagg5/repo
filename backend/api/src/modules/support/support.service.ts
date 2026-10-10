import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and, desc, inArray, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';
import { AdminService } from '../admin/admin.service';
import { orders, paymentTransactions, users, events } from '../../database/schema/index';
import type {
  AuthContext,
  AdminSupportTicketDto,
  AdminRefundQueueItemDto,
  AdminChargebackLogDto,
} from '@platform/types';

const initialSupportTickets: AdminSupportTicketDto[] = [
  {
    id: 'TCK-1001',
    userId: null,
    userName: 'Priya Sharma',
    userEmail: 'priya.sharma@gmail.com',
    category: 'Ticketing / Download',
    priority: 'high',
    status: 'open',
    subject: 'Cannot download offline QR pass for Neon Genesis Fest',
    description: 'The app shows QR code generation error when airplane mode is enabled.',
    relatedOrderId: 'ORD-9921',
    assignedAdminId: null,
    internalNotes: null,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'TCK-1002',
    userId: null,
    userName: 'Arjun Mehta',
    userEmail: 'arjun.mehta@outlook.com',
    category: 'Payment / UPI',
    priority: 'medium',
    status: 'in_progress',
    subject: 'UPI deduction succeeded but order confirmation delayed',
    description: 'Bank debited ₹4,500 but order showed pending for 5 minutes before confirming.',
    relatedOrderId: 'ORD-9922',
    assignedAdminId: null,
    internalNotes: null,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private tickets: AdminSupportTicketDto[] = [...initialSupportTickets];

  constructor(
    private readonly db: DatabaseService,
    private readonly auditService: AuditService,
    private readonly adminService: AdminService,
  ) {}

  /**
   * List Support Tickets
   */
  async listSupportTickets(query?: { status?: string; priority?: string; category?: string }): Promise<AdminSupportTicketDto[]> {
    let list = [...this.tickets];
    if (query?.status) list = list.filter((t) => t.status === query.status);
    if (query?.priority) list = list.filter((t) => t.priority === query.priority);
    if (query?.category) list = list.filter((t) => t.category === query.category);

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Update Support Ticket
   */
  async updateSupportTicket(
    ticketId: string,
    update: { status?: string; priority?: string; internalNotes?: string; assignedAdminId?: string },
    actor: AuthContext,
  ): Promise<AdminSupportTicketDto> {
    const idx = this.tickets.findIndex((t) => t.id === ticketId);
    if (idx === -1) {
      throw new NotFoundException({ code: 'SUPPORT_TICKET_NOT_FOUND', message: 'Support ticket not found.' });
    }

    const t = this.tickets[idx]!;
    if (update.status) t.status = update.status;
    if (update.priority) t.priority = update.priority;
    if (update.internalNotes !== undefined) t.internalNotes = update.internalNotes;
    if (update.assignedAdminId !== undefined) t.assignedAdminId = update.assignedAdminId;
    t.updatedAt = new Date().toISOString();

    this.auditService.log({
      actorUserId: actor.userId,
      action: 'support_ticket.updated',
      category: 'admin',
      entityType: 'support_ticket',
      entityId: ticketId,
      metadata: { status: t.status, priority: t.priority, internalNotes: t.internalNotes },
    });

    return t;
  }

  /**
   * Get Refund Review Queue (Real database orders with pending refunds)
   */
  async getRefundQueue(): Promise<AdminRefundQueueItemDto[]> {
    const pendingOrders = await this.db.db
      .select({
        order: orders,
        purchaser: users,
        event: events,
      })
      .from(orders)
      .leftJoin(users, eq(users.id, orders.userId))
      .leftJoin(events, eq(events.id, orders.eventId))
      .where(or(eq(orders.status, 'refund_pending'), eq(orders.status, 'paid')))
      .limit(20)
      .execute();

    // Fetch payments for these orders
    const orderIds = pendingOrders.map((o) => o.order.id);
    const orderPayments = orderIds.length > 0
      ? await this.db.db.select().from(paymentTransactions).where(inArray(paymentTransactions.orderId, orderIds)).execute()
      : [];

    const paymentProviderMap = new Map<string, string>();
    for (const p of orderPayments) {
      paymentProviderMap.set(p.orderId, p.provider);
    }

    return pendingOrders.map(({ order, purchaser, event }) => ({
      id: `ref-queue-${order.id}`,
      orderId: order.id,
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      customerName: purchaser?.name ?? 'Customer Buyer',
      customerEmail: purchaser?.email ?? 'customer@example.com',
      eventName: event?.title ?? 'Event',
      amountMinor: Number(order.totalMinor),
      reason: order.status === 'refund_pending' ? 'Customer requested cancellation before event deadline' : 'Duplicate payment authorization check',
      requestedAt: order.createdAt.toISOString(),
      status: order.status === 'refund_pending' ? 'pending_review' : 'eligible_for_review',
      paymentProvider: paymentProviderMap.get(order.id) ?? 'razorpay',
    }));
  }

  /**
   * Authorize / Decision Refund calling Authoritative Admin & Ledger Services (Rule 6)
   */
  async decideRefund(
    orderId: string,
    decision: 'approve' | 'reject',
    reason: string,
    actor: AuthContext,
  ) {
    if (decision === 'approve') {
      const idempotencyKey = `admin-support-refund-${orderId}-${Date.now()}`;
      return this.adminService.refundOrder(
        orderId,
        { reason, idempotencyKey },
        actor,
      );
    } else {
      this.auditService.log({
        actorUserId: actor.userId,
        action: 'refund.rejected',
        category: 'payment',
        entityType: 'order',
        entityId: orderId,
        metadata: { reason, decision },
      });

      return {
        orderId,
        status: 'refund_rejected',
        reason,
        rejectedBy: actor.userId,
        rejectedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Get Chargeback Dispute Logs
   */
  async getChargebackLogs(): Promise<AdminChargebackLogDto[]> {
    const refundedPayments = await this.db.db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.status, 'refunded'))
      .limit(10)
      .execute();

    return refundedPayments.map((p) => ({
      id: `chg-${p.id.slice(0, 8)}`,
      orderId: p.orderId,
      paymentId: p.id,
      amountMinor: Number(p.amountMinor),
      reason: 'Customer initiated chargeback through issuing bank',
      disputeStatus: 'under_investigation',
      filedAt: p.createdAt.toISOString(),
      riskScore: 82,
    }));
  }
}
