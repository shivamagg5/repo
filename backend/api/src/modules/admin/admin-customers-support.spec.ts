import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { SupportService } from '../support/support.service';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../../common/audit/audit.service';
import { EventStateMachineService } from '../events/event-state-machine.service';
import { PaymentsService } from '../payments/payments.service';
import { ScannerCryptoService } from '../scanner/scanner-crypto.service';
import type { AuthContext } from '@platform/types';

describe('Admin Customer Directory & Support Suite', () => {
  let adminService: AdminService;
  let supportService: SupportService;
  let scannerCrypto: ScannerCryptoService;

  const mockAdminActor: AuthContext = {
    userId: 'admin-super-1',
    supabaseAuthId: 'sup-admin-1',
    email: 'admin@platform.internal',
    status: 'active',
    permissions: [
      'admin.users.manage',
      'ticket.transfer',
      'ticket.refund',
      'order.view',
      'admin.audit',
    ],
  };

  const mockDb = {
    db: {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(true),
        }),
      }),
      query: {
        users: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
        tickets: {
          findFirst: jest.fn(),
        },
        orders: {
          findFirst: jest.fn(),
        },
        auditLogs: {
          findMany: jest.fn(),
        },
      },
    },
  };

  const mockAudit = {
    log: jest.fn(),
  };

  const mockStateMachine = {
    canTransition: jest.fn().mockReturnValue(true),
  };

  const mockPayments = {
    refundPayment: jest.fn().mockResolvedValue({ id: 'ref-1', status: 'succeeded' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        SupportService,
        ScannerCryptoService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: AuditService, useValue: mockAudit },
        { provide: EventStateMachineService, useValue: mockStateMachine },
        { provide: PaymentsService, useValue: mockPayments },
      ],
    }).compile();

    adminService = module.get<AdminService>(AdminService);
    supportService = module.get<SupportService>(SupportService);
    scannerCrypto = module.get<ScannerCryptoService>(ScannerCryptoService);
  });

  describe('Admin Customer Directory & Notes', () => {
    it('should list customers and correctly assign VIP Spender tier when LTV exceeds 10,000 INR (1,000,000 minor)', async () => {
      mockDb.db.query.users.findMany.mockResolvedValueOnce([
        {
          id: 'usr-vip-1',
          name: 'Priya Sharma',
          email: 'priya@example.com',
          phone: '+919820012345',
          createdAt: new Date('2026-05-12'),
          status: 'active',
        },
      ]);

      // Mock user orders
      (mockDb.db.select as jest.Mock)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValueOnce({
            where: jest.fn().mockReturnValueOnce({
              execute: jest.fn().mockResolvedValueOnce([
                { userId: 'usr-vip-1', totalMinor: 600000, status: 'paid' },
                { userId: 'usr-vip-1', totalMinor: 750000, status: 'paid' },
              ]),
            }),
          }),
        })
        // Mock user tickets
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValueOnce({
            where: jest.fn().mockReturnValueOnce({
              execute: jest.fn().mockResolvedValueOnce([
                { userId: 'usr-vip-1' },
                { userId: 'usr-vip-1' },
                { userId: 'usr-vip-1' },
              ]),
            }),
          }),
        });

      const res = await adminService.listCustomers({ search: 'Priya' });

      expect(res.data.length).toBe(1);
      const cust = res.data[0]!;
      expect(cust.id).toBe('usr-vip-1');
      expect(cust.lifetimeValueMinor).toBe(1350000); // ₹13,500
      expect(cust.tier).toBe('VIP Spender');
      expect(cust.totalOrdersCount).toBe(2);
      expect(cust.totalTicketsBought).toBe(3);
    });

    it('should update customer admin notes and log security audit event', async () => {
      mockDb.db.query.users.findFirst.mockResolvedValueOnce({
        id: 'usr-vip-1',
        name: 'Priya Sharma',
      });

      const res = await adminService.updateCustomerNotes('usr-vip-1', 'Prefers VIP lounge front row', mockAdminActor);

      expect(res.customerId).toBe('usr-vip-1');
      expect(res.adminNotes).toBe('Prefers VIP lounge front row');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-super-1',
          action: 'customer.notes_updated',
          entityType: 'user',
          entityId: 'usr-vip-1',
        }),
      );
    });
  });

  describe('Admin Ticket Reissuance & Cryptographic Verification (Rule 5)', () => {
    it('should reissue ticket with fresh offline ECDSA signature verifiable by ScannerCryptoService', async () => {
      mockDb.db.query.tickets.findFirst.mockResolvedValueOnce({
        id: 't-test-100',
        ticketNumber: 'TCK-8842-VIP',
        eventId: 'evt-1',
        ticketTypeId: 'tt-vip-1',
        userId: 'usr-vip-1',
        status: 'issued',
      });

      const res = await adminService.reissueCustomerTicket('t-test-100', 'Customer device replaced', mockAdminActor);

      expect(res.ticketId).toBe('t-test-100');
      expect(res.qrToken).toBeDefined();
      expect(res.qrToken.startsWith('TICKET.v1|')).toBe(true);

      // Verify QR token using scanner crypto service
      const verifyResult = scannerCrypto.verifyTicketCredential(res.qrToken);
      expect(verifyResult.isValid).toBe(true);
      expect(verifyResult.payload?.ticketId).toBe('t-test-100');
      expect(verifyResult.payload?.eventId).toBe('evt-1');

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ticket.admin_reissued',
          entityId: 't-test-100',
        }),
      );
    });

    it('should transfer ticket ownership to valid target account and log audit record', async () => {
      mockDb.db.query.tickets.findFirst.mockResolvedValueOnce({
        id: 't-test-100',
        ticketNumber: 'TCK-8842-VIP',
        userId: 'usr-old-1',
      });

      mockDb.db.query.users.findFirst.mockResolvedValueOnce({
        id: 'usr-new-2',
        email: 'friend@test.com',
      });

      const res = await adminService.transferCustomerTicket('t-test-100', 'friend@test.com', 'Gift transfer', mockAdminActor);

      expect(res.ticketId).toBe('t-test-100');
      expect(res.previousUserId).toBe('usr-old-1');
      expect(res.newUserId).toBe('usr-new-2');
      expect(res.transferredToEmail).toBe('friend@test.com');

      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ticket.admin_transferred',
          entityId: 't-test-100',
        }),
      );
    });
  });

  describe('SupportService & Refund Queue Triage (Rule 6)', () => {
    it('should list support tickets and update internal status and resolution notes', async () => {
      const tickets = await supportService.listSupportTickets();
      expect(tickets.length).toBeGreaterThan(0);

      const firstId = tickets[0]!.id;
      const updated = await supportService.updateSupportTicket(
        firstId,
        { status: 'resolved', internalNotes: 'Delivered WhatsApp ticket pass manually' },
        mockAdminActor,
      );

      expect(updated.status).toBe('resolved');
      expect(updated.internalNotes).toBe('Delivered WhatsApp ticket pass manually');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'support_ticket.updated',
          entityId: firstId,
        }),
      );
    });
  });
});
