import { AdminService } from './admin.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AdminService — Phase 9 Central Admin / HQ Domain Suite', () => {
  let adminService: AdminService;
  let mockDb: any;
  let mockDatabaseService: any;
  let mockAuditService: any;
  let mockEventStateMachine: any;
  let mockPaymentsService: any;

  const mockAdminActor = {
    userId: 'admin-usr-1',
    roles: ['super_admin'],
    permissions: [
      'user.view',
      'user.suspend',
      'user.restore',
      'event.review',
      'event.approve',
      'event.reject',
      'event.suspend',
      'order.view',
      'ticket.refund',
      'admin.audit',
    ],
  } as any;

  beforeEach(() => {
    mockDb = {
      query: {
        users: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
        events: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
        orders: {
          findFirst: jest.fn(),
        },
        auditLogs: {
          findMany: jest.fn(),
        },
      },
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(true),
        }),
      }),
    };

    mockDatabaseService = { db: mockDb };
    mockAuditService = { log: jest.fn() };
    mockEventStateMachine = {
      validateTransition: jest.fn().mockImplementation((from, to) => ({
        allowed: true,
        targetState: to,
        auditAction: `event.${to}`,
      })),
    };
    mockPaymentsService = {
      processRefund: jest.fn().mockResolvedValue({
        success: true,
        refundId: 'ref-100',
        orderId: 'ord-100',
        amountMinor: 5000,
      }),
    };

    adminService = new AdminService(
      mockDatabaseService as any,
      mockAuditService as any,
      mockEventStateMachine as any,
      mockPaymentsService as any,
    );
  });

  it('PRIVILEGE SAFETY: Rejects self-suspension attempt', async () => {
    await expect(
      adminService.suspendUser('admin-usr-1', { reason: 'Accidental self block' }, mockAdminActor),
    ).rejects.toThrow(BadRequestException);
  });

  it('USER SUSPENSION: Updates user status to suspended and logs structured audit entry', async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: 'usr-target-99',
      status: 'active',
    });

    const res = await adminService.suspendUser(
      'usr-target-99',
      { reason: 'Terms violation' },
      mockAdminActor,
    );

    expect(res.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'admin-usr-1',
        action: 'admin.user_suspended',
        entityId: 'usr-target-99',
      }),
    );
  });

  it('USER RESTORATION: Restores suspended user status to active and logs audit entry', async () => {
    mockDb.query.users.findFirst.mockResolvedValue({
      id: 'usr-target-99',
      status: 'suspended',
    });

    const res = await adminService.restoreUser('usr-target-99', mockAdminActor);
    expect(res.success).toBe(true);
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.user_restored',
      }),
    );
  });

  it('EVENT REVIEW: Delegates state machine transitions to EventStateMachineService', async () => {
    mockDb.query.events.findFirst.mockResolvedValue({
      id: 'evt-100',
      status: 'submitted',
      organizerOrganizationId: 'org-1',
      title: 'Summer Fest',
      startsAt: new Date(),
      endsAt: new Date(),
      timezone: 'UTC',
    });

    const res = await adminService.reviewEvent(
      'evt-100',
      { action: 'approve' },
      mockAdminActor,
    );

    expect(res.success).toBe(true);
    expect(res.newState).toBe('approved');
    expect(mockEventStateMachine.validateTransition).toHaveBeenCalled();
    expect(mockAuditService.log).toHaveBeenCalled();
  });

  it('DELEGATED REFUND: Delegates admin refund to PaymentsService without direct table mutation', async () => {
    const res = await adminService.refundOrder(
      'ord-100',
      { reason: 'Customer complaint', idempotencyKey: 'ADMIN-REFUND-100' },
      mockAdminActor,
    );

    expect(res.success).toBe(true);
    expect(res.refundId).toBe('ref-100');
    expect(mockPaymentsService.processRefund).toHaveBeenCalledWith(
      {
        orderId: 'ord-100',
        reason: 'Customer complaint',
        idempotencyKey: 'ADMIN-REFUND-100',
        amountMinor: undefined,
      },
      mockAdminActor,
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.order_refunded',
        entityId: 'ord-100',
      }),
    );
  });

  it('AUDIT LOG RETRIEVAL: Returns cursor-paginated audit log list', async () => {
    mockDb.query.auditLogs.findMany.mockResolvedValue([
      {
        id: 'audit-1',
        actorUserId: 'admin-usr-1',
        action: 'admin.user_suspended',
        entityType: 'user',
        entityId: 'usr-99',
        metadata: JSON.stringify({ reason: 'Spam' }),
        createdAt: new Date(),
      },
    ]);

    const res = await adminService.getAuditLogs({ limit: 10 });
    expect(res.data.length).toBe(1);
    expect(res.data[0]!.action).toBe('admin.user_suspended');
  });
});
