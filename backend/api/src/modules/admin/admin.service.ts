import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';
import { EventStateMachineService } from '../events/event-state-machine.service';
import { PaymentsService } from '../payments/payments.service';
import { users, events, orders, auditLogs, checkins } from '../../database/schema/index';
import { eq, and, desc, lt, or, ilike, inArray } from 'drizzle-orm';
import type {
  AdminUserListItemDto,
  AdminUserSuspendInput,
  AdminEventReviewQueueItemDto,
  AdminEventReviewInput,
  AdminOrderInspectionDto,
  AdminRefundOrderInput,
  AdminAuditLogListItemDto,
  AdminAuditLogQueryInput,
  AuthContext,
  EventStatus,
} from '@platform/types';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
    private readonly eventStateMachine: EventStateMachineService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * List users with pagination and filtering (Admin User DTO whitelist).
   */
  async listUsers(query: { status?: string; search?: string; cursor?: string; limit?: number }) {
    const limit = Math.min(query.limit ?? 20, 100);
    const db = this.databaseService.db;

    const conditions: any[] = [];
    if (query.status) {
      conditions.push(eq(users.status, query.status as any));
    }
    if (query.search) {
      conditions.push(
        or(
          ilike(users.name, `%${query.search}%`),
          ilike(users.email, `%${query.search}%`),
        ),
      );
    }
    if (query.cursor) {
      conditions.push(lt(users.id, query.cursor));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db.query.users.findMany({
      where: whereClause,
      limit: limit + 1,
      orderBy: [desc(users.id)],
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

    const data: AdminUserListItemDto[] = items.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
    }));

    return { data, nextCursor, hasMore };
  }

  /**
   * Suspend a user (with self-suspension guard and audit logging).
   */
  async suspendUser(targetUserId: string, input: AdminUserSuspendInput, actor: AuthContext) {
    if (actor.userId === targetUserId) {
      throw new BadRequestException({
        code: 'SELF_SUSPENSION_PROHIBITED',
        message: 'Administrative safety rule: Admin cannot suspend their own account.',
      });
    }

    const db = this.databaseService.db;
    const user = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!user) {
      throw new NotFoundException(`User ${targetUserId} not found`);
    }

    const previousState = user.status;

    await db
      .update(users)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    this.auditService.log({
      actorUserId: actor.userId,
      action: 'admin.user_suspended',
      category: 'admin',
      entityType: 'user',
      entityId: targetUserId,
      metadata: {
        previousState,
        newState: 'suspended',
        reason: input.reason,
      },
    });

    return { success: true, message: `User ${targetUserId} has been suspended.` };
  }

  /**
   * Restore a suspended user.
   */
  async restoreUser(targetUserId: string, actor: AuthContext) {
    const db = this.databaseService.db;
    const user = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!user) {
      throw new NotFoundException(`User ${targetUserId} not found`);
    }

    const previousState = user.status;

    await db
      .update(users)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(users.id, targetUserId));

    this.auditService.log({
      actorUserId: actor.userId,
      action: 'admin.user_restored',
      category: 'admin',
      entityType: 'user',
      entityId: targetUserId,
      metadata: {
        previousState,
        newState: 'active',
      },
    });

    return { success: true, message: `User ${targetUserId} has been restored.` };
  }

  /**
   * Fetch event review queue (events in 'submitted' or 'under_review' state).
   */
  async getEventReviewQueue(limit = 20) {
    const db = this.databaseService.db;

    const rows = await db.query.events.findMany({
      where: inArray(events.status, ['submitted', 'under_review']),
      limit,
      orderBy: [desc(events.createdAt)],
    });

    const items: AdminEventReviewQueueItemDto[] = rows.map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      organizerId: e.organizerOrganizationId,
      organizerName: 'Organizer Org',
      venueId: e.venueId,
      venueName: e.venueId ? 'Assigned Venue' : null,
      status: e.status,
      startsAt: e.startsAt.toISOString(),
      submittedAt: e.createdAt ? e.createdAt.toISOString() : null,
    }));

    return { data: items };
  }

  /**
   * Review event (approve, reject, suspend) via canonical EventStateMachineService.
   */
  async reviewEvent(eventId: string, input: AdminEventReviewInput, actor: AuthContext) {
    const db = this.databaseService.db;
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const currentState = event.status as EventStatus;
    let targetState: EventStatus;

    if (input.action === 'approve') {
      targetState = 'approved';
    } else if (input.action === 'reject') {
      targetState = 'rejected';
    } else if (input.action === 'suspend') {
      targetState = 'suspended';
    } else {
      throw new BadRequestException(`Invalid review action: ${input.action}`);
    }

    // Step through under_review if transitioning from submitted to approved/rejected
    let activeState = currentState;
    if (currentState === 'submitted' && (targetState === 'approved' || targetState === 'rejected')) {
      const startReviewRes = this.eventStateMachine.validateTransition('submitted', 'under_review', {
        actor,
        event: {
          id: event.id,
          organizerOrganizationId: event.organizerOrganizationId,
          venueId: event.venueId,
          categoryId: event.categoryId,
          title: event.title,
          status: 'submitted',
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          timezone: event.timezone,
          capacity: event.capacity,
        },
      });
      activeState = startReviewRes.targetState;
    }

    // Validate main target state transition
    const transitionRes = this.eventStateMachine.validateTransition(activeState, targetState, {
      actor,
      event: {
        id: event.id,
        organizerOrganizationId: event.organizerOrganizationId,
        venueId: event.venueId,
        categoryId: event.categoryId,
        title: event.title,
        status: activeState,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        timezone: event.timezone,
        capacity: event.capacity,
      },
      reason: input.reason,
    });

    await db
      .update(events)
      .set({
        status: transitionRes.targetState,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));

    this.auditService.log({
      actorUserId: actor.userId,
      action: transitionRes.auditAction,
      category: 'admin',
      entityType: 'event',
      entityId: eventId,
      metadata: {
        previousState: currentState,
        newState: transitionRes.targetState,
        reason: input.reason ?? null,
      },
    });

    return {
      success: true,
      eventId,
      previousState: currentState,
      newState: transitionRes.targetState,
    };
  }

  /**
   * Inspect order details for admin support.
   */
  async inspectOrder(orderId: string): Promise<AdminOrderInspectionDto> {
    const db = this.databaseService.db;
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: {
        items: true,
        tickets: true,
        payments: true,
        user: true,
        event: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return {
      id: order.id,
      userId: order.userId,
      eventId: order.eventId,
      eventTitle: (order as any).event?.title ?? 'Event',
      purchaserName: (order as any).user?.name ?? 'Purchaser',
      purchaserEmail: (order as any).user?.email ?? 'purchaser@example.com',
      status: order.status,
      totalMinor: order.totalMinor,
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      items: (order as any).items?.map((item: any) => ({
        id: item.id,
        ticketTypeName: 'Ticket Tier',
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        totalMinor: item.totalMinor,
      })) ?? [],
      tickets: (order as any).tickets?.map((t: any) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        status: t.status,
        checkedInAt: t.checkedInAt ? t.checkedInAt.toISOString() : null,
      })) ?? [],
      payments: (order as any).payments?.map((p: any) => ({
        id: p.id,
        provider: p.provider,
        status: p.status,
        amountMinor: p.amountMinor,
      })) ?? [],
    };
  }

  /**
   * Refund order (delegates to canonical PaymentsService.processRefund).
   * NO direct table mutations of orders, tickets, inventory, or commissions.
   */
  async refundOrder(orderId: string, input: AdminRefundOrderInput, actor: AuthContext) {
    const refundResult = await this.paymentsService.processRefund(
      {
        orderId,
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        amountMinor: input.amountMinor,
      },
      actor,
    );

    this.auditService.log({
      actorUserId: actor.userId,
      action: 'admin.order_refunded',
      category: 'admin',
      entityType: 'order',
      entityId: orderId,
      metadata: {
        reason: input.reason,
        idempotencyKey: input.idempotencyKey,
        requestedAmountMinor: input.amountMinor ?? null,
        refundResult,
      },
    });

    return refundResult;
  }

  /**
   * Deterministic cursor-paginated audit log viewer.
   */
  async getAuditLogs(query: AdminAuditLogQueryInput) {
    const limit = Math.min(query.limit ?? 20, 100);
    const db = this.databaseService.db;

    const conditions: any[] = [];

    if (query.adminUserId) {
      conditions.push(eq(auditLogs.actorUserId, query.adminUserId));
    }
    if (query.action) {
      conditions.push(eq(auditLogs.action, query.action));
    }
    if (query.entityType) {
      conditions.push(eq(auditLogs.entityType, query.entityType));
    }
    if (query.entityId) {
      conditions.push(eq(auditLogs.entityId, query.entityId));
    }
    if (query.cursor) {
      conditions.push(lt(auditLogs.id, query.cursor));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db.query.auditLogs.findMany({
      where: whereClause,
      limit: limit + 1,
      orderBy: [desc(auditLogs.createdAt), desc(auditLogs.id)],
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]!.id : null;

    const data: AdminAuditLogListItemDto[] = items.map((a) => {
      let parsedMetadata = {};
      try {
        parsedMetadata = JSON.parse(a.metadata ?? '{}');
      } catch {
        parsedMetadata = {};
      }

      return {
        id: a.id,
        actorUserId: a.actorUserId,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        metadata: parsedMetadata,
        createdAt: a.createdAt.toISOString(),
      };
    });

    return { data, nextCursor, hasMore };
  }
}
