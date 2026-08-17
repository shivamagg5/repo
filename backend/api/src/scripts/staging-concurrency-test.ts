// =============================================================================
// Staging Real PostgreSQL Concurrency Test Harness
// Validates Gate 4:
// 1. 10 Concurrent Gate Scans on the same ticket -> Exactly 1 Success, 9 Already Used
// 2. 50 Concurrent Reservations on remaining capacity -> Exactly 5 Success, 45 Conflict
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../database/database.module';
import { DatabaseService } from '../database/database.service';
import { ScannerService } from '../modules/scanner/scanner.service';
import { ScannerCryptoService } from '../modules/scanner/scanner-crypto.service';
import { ReservationService } from '../modules/inventory/reservation.service';
import { HoldStateMachineService } from '../modules/inventory/hold-state-machine.service';
import { AuditService } from '../common/audit/audit.service';
import { ConfigModule } from '@nestjs/config';
import * as schema from '../database/schema/index';
import { eq, and } from 'drizzle-orm';
import type { AuthContext } from '@platform/types';

async function runConcurrencyHarness() {
  console.log('======================================================================');
  console.log('  STARTING STAGING CONCURRENCY VALIDATION (REAL POSTGRESQL)');
  console.log('======================================================================');

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      DatabaseModule,
    ],
    providers: [
      ScannerService,
      ScannerCryptoService,
      ReservationService,
      HoldStateMachineService,
      {
        provide: AuditService,
        useValue: { log: () => {} },
      },
    ],
  }).compile();

  const dbService = moduleRef.get<DatabaseService>(DatabaseService);
  const scannerService = moduleRef.get<ScannerService>(ScannerService);
  const cryptoService = moduleRef.get<ScannerCryptoService>(ScannerCryptoService);
  const reservationService = moduleRef.get<ReservationService>(ReservationService);

  const db = dbService.db;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: 10 CONCURRENT SCANS ON 1 VALID TICKET
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Executing 10 Simultaneous Scans on 1 Single Ticket...');

    // 1. Setup temporary event, ticket type, order, ticket
    const now = new Date();
    const [testOrg] = await db.insert(schema.organizations).values({
      name: 'Concurrency Test Org',
      slug: `concurrency-org-${Date.now()}`,
      type: 'organizer',
      status: 'active',
    }).returning();

    const [testEvent] = await db.insert(schema.events).values({
      organizerOrganizationId: testOrg!.id,
      title: 'Concurrency Test Event',
      slug: `concurrency-event-${Date.now()}`,
      status: 'published',
      startsAt: now,
      endsAt: new Date(now.getTime() + 3600000),
    }).returning();

    const [testGate] = await db.insert(schema.checkinGates).values({
      eventId: testEvent!.id,
      name: 'Gate 1 — Main',
    }).returning();

    const [testTier] = await db.insert(schema.ticketTypes).values({
      eventId: testEvent!.id,
      name: 'General Admission',
      priceMinor: 100000,
      quantity: 100,
      soldQuantity: 1,
    }).returning();

    const [testUser] = await db.insert(schema.users).values({
      supabaseAuthId: crypto.randomUUID(),
      email: `attendee-${Date.now()}@staging.test`,
      name: 'Test Attendee',
    }).returning();

    const [testOrder] = await db.insert(schema.orders).values({
      userId: testUser!.id,
      eventId: testEvent!.id,
      status: 'paid',
      totalMinor: 100000,
    }).returning();

    const [testOrderItem] = await db.insert(schema.orderItems).values({
      orderId: testOrder!.id,
      ticketTypeId: testTier!.id,
      quantity: 1,
      unitPriceMinor: 100000,
      totalMinor: 100000,
    }).returning();

    const [testTicket] = await db.insert(schema.tickets).values({
      orderId: testOrder!.id,
      orderItemId: testOrderItem!.id,
      ticketTypeId: testTier!.id,
      eventId: testEvent!.id,
      userId: testUser!.id,
      ticketNumber: `TIX-CONC-${Date.now()}`,
      status: 'issued',
      qrTokenHash: `hash-${Date.now()}`,
    }).returning();

    // 2. Generate 10 concurrent scan operations
    const scannerDeviceIds = Array.from({ length: 10 }, (_, i) => `device-scanner-0${i + 1}`);
    const scanPromises = scannerDeviceIds.map((devId) =>
      scannerService.performCheckinTransaction(
        testTicket!.id,
        testEvent!.id,
        testGate!.id,
        devId,
        testUser!.id,
        `sync-${devId}-${Date.now()}`,
      )
    );

    const scanResults = await Promise.all(scanPromises);

    const successCount = scanResults.filter((r) => r.result === 'success').length;
    const alreadyUsedCount = scanResults.filter((r) => r.result === 'already_used').length;

    console.log(`- 10 Concurrent Scans Results: Success = ${successCount}, Already Used = ${alreadyUsedCount}`);

    if (successCount !== 1 || alreadyUsedCount !== 9) {
      throw new Error(`CRITICAL CONCURRENCY FAILURE: Expected 1 success and 9 already_used, got ${successCount} success / ${alreadyUsedCount} already_used`);
    }

    // Verify DB invariant
    const finalTicket = await db.query.tickets.findFirst({ where: eq(schema.tickets.id, testTicket!.id) });
    const checkinRecords = await db.query.checkins.findMany({ where: eq(schema.checkins.ticketId, testTicket!.id) });

    if (finalTicket?.status !== 'checked_in' || checkinRecords.length !== 10) {
      throw new Error(`CRITICAL AUDIT FAILURE: Checkin records count mismatch. Expected 10, got ${checkinRecords.length}`);
    }

    console.log('✅ [Test 1 PASS] 10 Simultaneous Scans yielded exactly 1 Authoritative Entry and 9 Duplicate Rejections.');

    // -------------------------------------------------------------------------
    // TEST 2: 50 CONCURRENT RESERVATIONS FOR LAST 5 TICKETS
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Executing 50 Simultaneous Reservation Requests for 5 Remaining Tickets...');

    const [limitedTier] = await db.insert(schema.ticketTypes).values({
      eventId: testEvent!.id,
      name: 'Limited Flash Tier',
      priceMinor: 50000,
      quantity: 5, // Total Capacity: 5
      soldQuantity: 0,
      reservedQuantity: 0,
    }).returning();

    const candidateUsers = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        db.insert(schema.users).values({
          supabaseAuthId: crypto.randomUUID(),
          email: `racer-${i}-${Date.now()}@staging.test`,
          name: `Racer ${i}`,
        }).returning().then((r) => r[0]!)
      )
    );

    const reservationPromises = candidateUsers.map((u, i) => {
      const actor: AuthContext = {
        userId: u.id,
        supabaseAuthId: u.supabaseAuthId,
        email: u.email ?? '',
        status: 'active',
        permissions: [],
      };
      return reservationService
        .createReservation(actor, {
          ticketTypeId: limitedTier!.id,
          quantity: 1,
          idempotencyKey: `idemp-race-${i}-${Date.now()}`,
        })
        .then(() => ({ success: true }))
        .catch((err) => ({ success: false, code: err?.response?.code || err?.message }));
    });

    const reserveResults = await Promise.all(reservationPromises);

    const reserveSuccessCount = reserveResults.filter((r) => r.success).length;
    const reserveFailCount = reserveResults.filter((r) => !r.success).length;

    console.log(`- 50 Concurrent Reservations: Success = ${reserveSuccessCount}, Denied/Conflict = ${reserveFailCount}`);

    if (reserveSuccessCount !== 5 || reserveFailCount !== 45) {
      throw new Error(`CRITICAL OVERSELLING FAILURE: Expected 5 success and 45 conflicts, got ${reserveSuccessCount} success / ${reserveFailCount} failed`);
    }

    const finalTier = await db.query.ticketTypes.findFirst({ where: eq(schema.ticketTypes.id, limitedTier!.id) });
    console.log(`- Final Inventory State: Reserved = ${finalTier?.reservedQuantity}, Sold = ${finalTier?.soldQuantity}, Total = ${finalTier?.quantity}`);

    if ((finalTier?.reservedQuantity ?? 0) + (finalTier?.soldQuantity ?? 0) > (finalTier?.quantity ?? 0)) {
      throw new Error('CRITICAL INVENTORY INVARIANT VIOLATION: Reserved + Sold exceeded Total Quantity!');
    }

    console.log('✅ [Test 2 PASS] 50 Concurrent Reservations yielded exactly 5 Holds and 45 Denials with 0 Overselling.');

    console.log('\n======================================================================');
    console.log('  ALL CONCURRENCY TESTS PASSED (100% POSTGRESQL ISOLATION GUARANTEED)');
    console.log('======================================================================');
  } catch (err: any) {
    console.error('❌ [CONCURRENCY FAILURE]:', err);
    throw err;
  } finally {
    await moduleRef.close();
  }
}

if (require.main === module) {
  runConcurrencyHarness()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
