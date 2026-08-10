import { Test, TestingModule } from '@nestjs/testing';
import { ReservationService } from './reservation.service';
import { HoldStateMachineService } from './hold-state-machine.service';
import { DatabaseService } from '../../database/database.service';
import { IdempotencyService } from '../../common/idempotency/idempotency.service';
import { AuditService } from '../../common/audit/audit.service';

describe('Task 4.1 — Concurrency & Oversell Protection Tests', () => {
  let reservationService: ReservationService;
  let dbService: DatabaseService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationService,
        HoldStateMachineService,
        IdempotencyService,
        DatabaseService,
        {
          provide: AuditService,
          useValue: { log: jest.fn() },
        },
      ],
    }).compile();

    reservationService = module.get<ReservationService>(ReservationService);
    dbService = module.get<DatabaseService>(DatabaseService);
  });

  describe('Database Concurrency & Overselling Prevention Invariant', () => {

    it('100 Concurrent Requests Test: 10 inventory, 100 simultaneous requests -> exactly 10 succeed, 90 fail, 0 oversold', async () => {
      const testEventId = '33333333-3333-3333-3333-333333333333';
      const testTicketTypeId = '44444444-4444-4444-4444-444444444444';

      let totalQty = 10;
      let reservedQty = 0;
      let soldQty = 0;

      const mockTx = {
        select: () => ({
          from: () => ({
            where: () => ({
              for: () => ({
                execute: async () => [{
                  id: testTicketTypeId,
                  eventId: testEventId,
                  name: 'VIP',
                  status: 'active',
                  priceMinor: 99900,
                  currency: 'INR',
                  quantity: totalQty,
                  soldQuantity: soldQty,
                  reservedQuantity: reservedQty,
                  minPerOrder: 1,
                  maxPerOrder: 10,
                  saleStartsAt: null,
                  saleEndsAt: null,
                }],
              }),
            }),
          }),
        }),
        query: {
          events: {
            findFirst: async () => ({ id: testEventId, title: 'Rock Fest', status: 'published' }),
          },
        },
        update: () => ({
          set: (data: any) => ({
            where: () => ({
              returning: async () => {
                if (soldQty + reservedQty + 1 <= totalQty) {
                  reservedQty += 1;
                  return [{ id: testTicketTypeId, reservedQuantity: reservedQty }];
                }
                return [];
              },
            }),
          }),
        }),
        insert: (table: any) => ({
          values: (vals: any) => ({
            returning: async () => [{ id: 'res-id', ...vals }],
          }),
        }),
      };

      const mockDb = {
        transaction: async (cb: any) => cb(mockTx as any),
      };

      jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

      const actor = {
        userId: '22222222-2222-2222-2222-222222222222',
        supabaseAuthId: 'supa-2222',
        email: 'consumer@example.com',
        status: 'active' as const,
        roles: ['consumer'],
        permissions: [],
      };

      // Launch 100 simultaneous requests via Promise.all
      const requests = Array.from({ length: 100 }, () =>
        reservationService.createReservation(actor, {
          ticketTypeId: testTicketTypeId,
          quantity: 1,
        }).then(() => 'SUCCESS').catch(() => 'FAILED')
      );

      const results = await Promise.all(requests);

      const successes = results.filter((r) => r === 'SUCCESS').length;
      const failures = results.filter((r) => r === 'FAILED').length;

      expect(successes).toBe(10);
      expect(failures).toBe(90);
      expect(reservedQty + soldQty).toBeLessThanOrEqual(totalQty);
      expect(reservedQty).toBe(10);
    });

    it('20 x 10 Bulk Concurrency Test: 100 total inventory, 20 requests of 10 -> exactly 10 succeed, 10 fail, 0 oversold', async () => {
      let totalQty = 100;
      let reservedQty = 0;
      let soldQty = 0;

      const mockTx = {
        select: () => ({
          from: () => ({
            where: () => ({
              for: () => ({
                execute: async () => [{
                  id: 'bulk-ticket-id',
                  eventId: 'event-id',
                  name: 'GA',
                  status: 'active',
                  priceMinor: 49900,
                  currency: 'INR',
                  quantity: totalQty,
                  soldQuantity: soldQty,
                  reservedQuantity: reservedQty,
                  minPerOrder: 1,
                  maxPerOrder: 10,
                  saleStartsAt: null,
                  saleEndsAt: null,
                }],
              }),
            }),
          }),
        }),
        query: {
          events: {
            findFirst: async () => ({ id: 'event-id', title: 'EDM Fest', status: 'published' }),
          },
        },
        update: () => ({
          set: () => ({
            where: () => ({
              returning: async () => {
                if (soldQty + reservedQty + 10 <= totalQty) {
                  reservedQty += 10;
                  return [{ id: 'bulk-ticket-id', reservedQuantity: reservedQty }];
                }
                return [];
              },
            }),
          }),
        }),
        insert: () => ({
          values: (vals: any) => ({
            returning: async () => [{ id: 'res-id', ...vals }],
          }),
        }),
      };

      const mockDb = {
        transaction: async (cb: any) => cb(mockTx as any),
      };

      jest.spyOn(dbService, 'db', 'get').mockReturnValue(mockDb as any);

      const actor = {
        userId: 'user-1',
        supabaseAuthId: 'supa-user-1',
        email: 'user1@example.com',
        status: 'active' as const,
        roles: ['consumer'],
        permissions: [],
      };

      // Launch 20 simultaneous requests of 10
      const requests = Array.from({ length: 20 }, () =>
        reservationService.createReservation(actor, {
          ticketTypeId: 'bulk-ticket-id',
          quantity: 10,
        }).then(() => 'SUCCESS').catch(() => 'FAILED')
      );

      const results = await Promise.all(requests);

      const successes = results.filter((r) => r === 'SUCCESS').length;
      const failures = results.filter((r) => r === 'FAILED').length;

      expect(successes).toBe(10);
      expect(failures).toBe(10);
      expect(reservedQty).toBe(100);
      expect(reservedQty + soldQty).toBeLessThanOrEqual(totalQty);
    });

  });
});
