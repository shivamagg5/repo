import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { EventStatus, AuthContext } from '@platform/types';

export interface TransitionContext {
  actor: AuthContext;
  event: {
    id: string;
    organizerOrganizationId: string;
    venueId: string | null;
    categoryId: string | null;
    title: string;
    status: EventStatus;
    startsAt: Date;
    endsAt: Date;
    timezone: string;
    capacity: number | null;
  };
  venueStatus?: string | null;
  reason?: string;
  isSystem?: boolean;
}

export interface TransitionResult {
  allowed: boolean;
  targetState: EventStatus;
  auditAction: string;
  reason?: string;
}

@Injectable()
export class EventStateMachineService {
  private readonly logger = new Logger('EventStateMachineService');

  /**
   * Validate if a transition from currentState to targetState is valid for the actor and context.
   */
  validateTransition(
    currentState: EventStatus,
    targetState: EventStatus,
    ctx: TransitionContext,
  ): TransitionResult {
    const { isSystem, actor } = ctx;

    // 1. System-driven transitions
    if (isSystem) {
      if (currentState === 'published' && targetState === 'live') {
        return { allowed: true, targetState: 'live', auditAction: 'event.live' };
      }
      if (currentState === 'live' && targetState === 'completed') {
        return { allowed: true, targetState: 'completed', auditAction: 'event.completed' };
      }
      throw new BadRequestException({
        code: 'INVALID_SYSTEM_TRANSITION',
        message: `System cannot transition event from ${currentState} to ${targetState}.`,
      });
    }

    // 2. Client/User attempt to jump directly to system-driven states (LIVE, COMPLETED)
    if (targetState === 'live' || targetState === 'completed') {
      throw new ForbiddenException({
        code: 'SYSTEM_STATE_ONLY',
        message: `Transition to ${targetState} is system-driven and cannot be triggered manually.`,
      });
    }

    // 3. State transition table
    switch (`${currentState} -> ${targetState}`) {

      // DRAFT -> SUBMITTED (Organizer submits)
      case 'draft -> submitted': {
        this.checkSubmissionChecklist(ctx);
        return {
          allowed: true,
          targetState: 'submitted',
          auditAction: 'event.submitted',
        };
      }

      // SUBMITTED -> UNDER_REVIEW (Admin starts review)
      case 'submitted -> under_review': {
        this.assertHasPermission(actor, 'event.approve');
        return {
          allowed: true,
          targetState: 'under_review',
          auditAction: 'event.review_started',
        };
      }

      // UNDER_REVIEW -> APPROVED (Admin approves)
      case 'under_review -> approved': {
        this.assertHasPermission(actor, 'event.approve');
        return {
          allowed: true,
          targetState: 'approved',
          auditAction: 'event.approved',
        };
      }

      // UNDER_REVIEW -> REJECTED (Admin rejects)
      case 'under_review -> rejected': {
        this.assertHasPermission(actor, 'event.reject');
        if (!ctx.reason || ctx.reason.trim().length === 0) {
          throw new BadRequestException({
            code: 'REJECTION_REASON_REQUIRED',
            message: 'A rejection reason is required when rejecting an event.',
          });
        }
        return {
          allowed: true,
          targetState: 'rejected',
          auditAction: 'event.rejected',
          reason: ctx.reason,
        };
      }

      // APPROVED -> PUBLISHED (Organizer or Admin publishes)
      case 'approved -> published': {
        this.checkPublicationChecklist(ctx);
        return {
          allowed: true,
          targetState: 'published',
          auditAction: 'event.published',
        };
      }

      // PUBLISHED -> APPROVED (Unpublish — returns to approved)
      case 'published -> approved': {
        this.assertHasPermission(actor, 'event.publish');
        return {
          allowed: true,
          targetState: 'approved',
          auditAction: 'event.unpublished',
        };
      }

      // * -> CANCELLED (Cancel event)
      case 'draft -> cancelled':
      case 'submitted -> cancelled':
      case 'under_review -> cancelled':
      case 'approved -> cancelled':
      case 'published -> cancelled': {
        this.assertHasPermission(actor, 'event.cancel');
        return {
          allowed: true,
          targetState: 'cancelled',
          auditAction: 'event.cancelled',
        };
      }

      // * -> SUSPENDED (Admin suspends event)
      case 'draft -> suspended':
      case 'submitted -> suspended':
      case 'under_review -> suspended':
      case 'approved -> suspended':
      case 'published -> suspended':
      case 'live -> suspended': {
        this.assertHasPermission(actor, 'event.suspend');
        return {
          allowed: true,
          targetState: 'suspended',
          auditAction: 'event.suspended',
        };
      }

      default: {
        throw new BadRequestException({
          code: 'ILLEGAL_STATE_TRANSITION',
          message: `Cannot transition event status from "${currentState}" to "${targetState}".`,
        });
      }
    }
  }

  /**
   * Server-side submission checklist.
   */
  private checkSubmissionChecklist(ctx: TransitionContext): void {
    const { event } = ctx;
    const errors: string[] = [];

    if (!event.title || event.title.trim().length === 0) {
      errors.push('Title is required');
    }
    if (!event.startsAt || !event.endsAt) {
      errors.push('StartsAt and EndsAt dates are required');
    } else if (new Date(event.endsAt) <= new Date(event.startsAt)) {
      errors.push('EndsAt must be after StartsAt');
    }
    if (new Date(event.endsAt) <= new Date()) {
      errors.push('Event end date must be in the future');
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        code: 'SUBMISSION_CHECKLIST_FAILED',
        message: 'Event is incomplete and cannot be submitted.',
        details: errors,
      });
    }
  }

  /**
   * Server-side publication checklist.
   */
  private checkPublicationChecklist(ctx: TransitionContext): void {
    const { event, venueStatus } = ctx;
    const errors: string[] = [];

    if (new Date(event.endsAt) <= new Date()) {
      errors.push('Event has already ended and cannot be published');
    }

    // Venue status check: if assigned, venue must be active
    if (event.venueId && venueStatus !== 'active') {
      errors.push(`Assigned venue is not active (status: ${venueStatus ?? 'unknown'})`);
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        code: 'PUBLICATION_CHECKLIST_FAILED',
        message: 'Event does not meet publication criteria.',
        details: errors,
      });
    }
  }

  private assertHasPermission(actor: AuthContext, permission: string): void {
    if (!actor.permissions?.includes(permission as any)) {
      throw new ForbiddenException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `You lack permission "${permission}" required for this operation.`,
      });
    }
  }
}
