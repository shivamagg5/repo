import { EventStateMachineService } from './event-state-machine.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { AuthContext } from '@platform/types';

describe('EventStateMachineService', () => {
  let sm: EventStateMachineService;

  const mockOrganizerActor: AuthContext = {
    userId: 'user-org-owner',
    supabaseAuthId: 'supa-owner',
    email: 'owner@org.com',
    status: 'active',
    permissions: ['event.create', 'event.edit', 'event.publish', 'event.cancel'],
  };

  const mockAdminActor: AuthContext = {
    userId: 'user-admin',
    supabaseAuthId: 'supa-admin',
    email: 'admin@platform.com',
    status: 'active',
    permissions: ['event.approve', 'event.reject', 'event.publish', 'event.cancel', 'event.suspend'],
  };

  const baseEventContext = {
    actor: mockOrganizerActor,
    event: {
      id: 'event-1',
      organizerOrganizationId: 'org-1',
      venueId: 'venue-1',
      categoryId: 'cat-1',
      title: 'Summer Music Fest',
      status: 'draft' as const,
      startsAt: new Date(Date.now() + 86400000), // tomorrow
      endsAt: new Date(Date.now() + 172800000), // 2 days later
      timezone: 'Asia/Kolkata',
      capacity: 1000,
    },
    venueStatus: 'active',
  };

  beforeEach(() => {
    sm = new EventStateMachineService();
  });

  it('allows organizer to transition DRAFT -> SUBMITTED when submission checklist passes', () => {
    const result = sm.validateTransition('draft', 'submitted', baseEventContext);
    expect(result.allowed).toBe(true);
    expect(result.targetState).toBe('submitted');
    expect(result.auditAction).toBe('event.submitted');
  });

  it('rejects DRAFT -> SUBMITTED when end date is in the past', () => {
    const pastContext = {
      ...baseEventContext,
      event: {
        ...baseEventContext.event,
        startsAt: new Date(Date.now() - 172800000),
        endsAt: new Date(Date.now() - 86400000),
      },
    };
    expect(() => sm.validateTransition('draft', 'submitted', pastContext)).toThrow(BadRequestException);
  });

  it('allows admin to transition SUBMITTED -> UNDER_REVIEW', () => {
    const ctx = { ...baseEventContext, actor: mockAdminActor };
    const result = sm.validateTransition('submitted', 'under_review', ctx);
    expect(result.allowed).toBe(true);
    expect(result.targetState).toBe('under_review');
  });

  it('allows admin to transition UNDER_REVIEW -> APPROVED', () => {
    const ctx = { ...baseEventContext, actor: mockAdminActor };
    const result = sm.validateTransition('under_review', 'approved', ctx);
    expect(result.allowed).toBe(true);
    expect(result.targetState).toBe('approved');
  });

  it('requires rejection reason for UNDER_REVIEW -> REJECTED', () => {
    const ctx = { ...baseEventContext, actor: mockAdminActor };
    expect(() => sm.validateTransition('under_review', 'rejected', ctx)).toThrow(BadRequestException);

    const validCtx = { ...ctx, reason: 'Inadequate safety documentation' };
    const result = sm.validateTransition('under_review', 'rejected', validCtx);
    expect(result.allowed).toBe(true);
    expect(result.targetState).toBe('rejected');
    expect(result.reason).toBe('Inadequate safety documentation');
  });

  it('allows APPROVED -> PUBLISHED when publication checklist passes', () => {
    const result = sm.validateTransition('approved', 'published', baseEventContext);
    expect(result.allowed).toBe(true);
    expect(result.targetState).toBe('published');
    expect(result.auditAction).toBe('event.published');
  });

  it('rejects APPROVED -> PUBLISHED if assigned venue is inactive', () => {
    const inactiveVenueCtx = { ...baseEventContext, venueStatus: 'suspended' };
    expect(() => sm.validateTransition('approved', 'published', inactiveVenueCtx)).toThrow(BadRequestException);
  });

  it('SECURITY: rejects direct jump DRAFT -> PUBLISHED', () => {
    expect(() => sm.validateTransition('draft', 'published', baseEventContext)).toThrow(BadRequestException);
  });

  it('SECURITY: rejects client attempt to force status to LIVE or COMPLETED', () => {
    expect(() => sm.validateTransition('published', 'live', baseEventContext)).toThrow(ForbiddenException);
    expect(() => sm.validateTransition('live', 'completed', baseEventContext)).toThrow(ForbiddenException);
  });

  it('allows system-driven PUBLISHED -> LIVE and LIVE -> COMPLETED', () => {
    const systemLive = sm.validateTransition('published', 'live', { ...baseEventContext, isSystem: true });
    expect(systemLive.allowed).toBe(true);
    expect(systemLive.targetState).toBe('live');

    const systemCompleted = sm.validateTransition('live', 'completed', { ...baseEventContext, isSystem: true });
    expect(systemCompleted.allowed).toBe(true);
    expect(systemCompleted.targetState).toBe('completed');
  });
});
