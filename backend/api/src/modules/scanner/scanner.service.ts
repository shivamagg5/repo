import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, sql, or, ilike } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  checkinDevices,
  checkinGates,
  checkins,
  tickets,
  events,
  orders,
  ticketTypes,
  users,
} from '../../database/schema';
import { ScannerCryptoService } from './scanner-crypto.service';
import type {
  DeviceRegisterInput,
  DeviceRegisterResultDto,
  DevicePairInput,
  EventAuthorizationPackageDto,
  ScanTicketInput,
  ScanTicketResultDto,
  BatchSyncScansInput,
  BatchSyncScansResultDto,
  AttendeeSearchResultDto,
} from '@platform/types';

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cryptoService: ScannerCryptoService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Register device public key and hardware identifier.
   */
  async registerDevice(input: DeviceRegisterInput, organizationId: string): Promise<DeviceRegisterResultDto> {
    const existing = await this.db.query.checkinDevices.findFirst({
      where: eq(checkinDevices.deviceIdentifier, input.deviceIdentifier),
    });

    if (existing) {
      if (existing.status === 'revoked') {
        throw new ForbiddenException({
          code: 'DEVICE_REVOKED',
          message: 'This scanner device hardware identifier has been revoked by the organization.',
        });
      }

      await this.db
        .update(checkinDevices)
        .set({
          publicKeyPem: input.publicKeyPem,
          lastSeenAt: new Date(),
        })
        .where(eq(checkinDevices.id, existing.id));

      return {
        deviceId: existing.id,
        deviceIdentifier: existing.deviceIdentifier,
        status: existing.status,
        registeredAt: existing.lastSeenAt ? existing.lastSeenAt.toISOString() : new Date().toISOString(),
      };
    }

    const [created] = await this.db
      .insert(checkinDevices)
      .values({
        organizationId,
        deviceIdentifier: input.deviceIdentifier,
        publicKeyPem: input.publicKeyPem,
        status: 'active',
        lastSeenAt: new Date(),
      })
      .returning();

    if (!created) {
      throw new BadRequestException('Failed to register checkin device');
    }

    return {
      deviceId: created.id,
      deviceIdentifier: created.deviceIdentifier,
      status: created.status,
      registeredAt: created.lastSeenAt ? created.lastSeenAt.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Pair scanner device with an event and gate, issuing a signed Event Authorization Package.
   *
   * FIX-006: Enforces three-way org binding:
   *   staff JWT org → device org → event org
   * A mismatch at any layer returns 403 — no authorization package is issued.
   */
  async pairDevice(input: DevicePairInput, staffUserId: string, staffOrgId: string): Promise<EventAuthorizationPackageDto> {
    const device = await this.db.query.checkinDevices.findFirst({
      where: eq(checkinDevices.id, input.deviceId),
    });

    if (!device || device.status !== 'active') {
      throw new ForbiddenException('Scanner device is invalid or has been revoked');
    }

    // FIX-006: Device must belong to the staff member's organization
    if (device.organizationId !== staffOrgId) {
      this.logger.warn(
        `[Scanner] Cross-org pair attempt: staff org=${staffOrgId}, device org=${device.organizationId}, ` +
        `deviceId=${device.id}, staffUserId=${staffUserId}`,
      );
      throw new ForbiddenException({
        code: 'DEVICE_ORG_MISMATCH',
        message: 'Scanner device does not belong to your organization.',
      });
    }

    const event = await this.db.query.events.findFirst({
      where: eq(events.id, input.eventId),
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${input.eventId} not found`);
    }

    // FIX-006: Event must also belong to the same organization
    if (event.organizerOrganizationId !== staffOrgId) {
      this.logger.warn(
        `[Scanner] Cross-org event pair attempt: staff org=${staffOrgId}, event org=${event.organizerOrganizationId}, ` +
        `eventId=${event.id}, staffUserId=${staffUserId}`,
      );
      throw new ForbiddenException({
        code: 'EVENT_ORG_MISMATCH',
        message: 'Event does not belong to your organization.',
      });
    }

    const gate = await this.db.query.checkinGates.findFirst({
      where: and(eq(checkinGates.id, input.gateId), eq(checkinGates.eventId, input.eventId)),
    });

    if (!gate) {
      throw new NotFoundException(`Gate with ID ${input.gateId} not found for event ${input.eventId}`);
    }

    const { publicKeyPem, keyVersion } = this.cryptoService.getPublicVerificationKeyPem();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 24 * 60 * 60 * 1000); // 24h validity package

    const rawPackage = {
      version: 'v1',
      packageVersion: '1.0.0',
      deviceId: device.id,
      eventId: event.id,
      gateId: gate.id,
      keyVersion,
      publicVerificationKeyPem: publicKeyPem,
      ticketCredentialVersion: 'v1',
      eventStart: event.startsAt.toISOString(),
      eventEnd: event.endsAt ? event.endsAt.toISOString() : new Date(event.startsAt.getTime() + 8 * 3600000).toISOString(),
      authorizationIssuedAt: issuedAt.toISOString(),
      authorizationExpiresAt: expiresAt.toISOString(),
    };

    const signature = this.cryptoService.signEventAuthorizationPackage(rawPackage);

    return {
      ...rawPackage,
      packageSignature: signature,
    };
  }

  /**
   * SINGLE CANONICAL CHECKIN TRANSACTION PATH
   * Executed inside a PostgreSQL row-locking transaction (`SELECT FOR UPDATE` on `tickets`).
   */
  async performCheckinTransaction(
    ticketId: string,
    eventId: string,
    gateId: string,
    deviceId: string,
    staffUserId: string,
    syncId?: string,
  ): Promise<ScanTicketResultDto> {
    return await this.db.transaction(async (tx: any) => {
      // 1. Lock target ticket row FOR UPDATE to guarantee concurrency isolation
      const [ticket] = await tx
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, ticketId), eq(tickets.eventId, eventId)))
        .for('update');

      if (!ticket) {
        return {
          result: 'wrong_event',
          scannedAt: new Date().toISOString(),
          message: 'Ticket not found or does not belong to this event',
        };
      }

      // Fetch ticket type name and purchaser details for UI response
      const ticketType = await tx.query.ticketTypes.findFirst({
        where: eq(ticketTypes.id, ticket.ticketTypeId),
      });

      const userRecord = await tx.query.users.findFirst({
        where: eq(users.id, ticket.userId),
      });

      // 2. Check if ticket is already checked in
      const actualSyncId = syncId ?? crypto.randomUUID();
      const scannedAt = new Date();

      if (ticket.status === 'checked_in' || ticket.checkedInAt) {
        const previousCheckin = await tx.query.checkins.findFirst({
          where: and(eq(checkins.ticketId, ticket.id), eq(checkins.result, 'success')),
        });

        // Insert duplicate/conflict scan audit record so zero historical evidence is deleted
        await tx.insert(checkins).values({
          ticketId: ticket.id,
          eventId,
          gateId,
          deviceId,
          staffUserId,
          result: 'already_used',
          scannedAt,
          serverRecordedAt: new Date(),
          syncId: actualSyncId,
        });

        return {
          result: 'already_used',
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          ticketTypeName: ticketType?.name ?? 'General Admission',
          purchaserName: userRecord?.name ?? 'Attendee',
          scannedAt: scannedAt.toISOString(),
          previousScan: previousCheckin
            ? { scannedAt: previousCheckin.scannedAt.toISOString(), gateName: 'Gate 1' }
            : null,
          message: `Ticket already checked in at ${ticket.checkedInAt ? ticket.checkedInAt.toISOString() : 'earlier'}`,
        };
      }

      // 3. Check for void/cancelled/refunded ticket status
      if (ticket.status === 'refunded') {
        return { result: 'refunded', ticketId: ticket.id, scannedAt: new Date().toISOString(), message: 'Ticket has been refunded' };
      }
      if (ticket.status === 'cancelled' || ticket.status === 'void') {
        return { result: 'cancelled', ticketId: ticket.id, scannedAt: new Date().toISOString(), message: 'Ticket has been cancelled or voided' };
      }

      // 4. Perform atomic state transition to 'checked_in'
      await tx
        .update(tickets)
        .set({
          status: 'checked_in',
          checkedInAt: scannedAt,
        })
        .where(eq(tickets.id, ticket.id));

      // 5. Insert audit checkin record
      await tx.insert(checkins).values({
        ticketId: ticket.id,
        eventId,
        gateId,
        deviceId,
        staffUserId,
        result: 'success',
        scannedAt,
        serverRecordedAt: new Date(),
        syncId: actualSyncId,
      });

      return {
        result: 'success',
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        ticketTypeName: ticketType?.name ?? 'Standard Entry',
        purchaserName: userRecord?.name ?? 'Attendee',
        scannedAt: scannedAt.toISOString(),
        previousScan: null,
        message: 'Valid ticket. Check-in successful.',
      };
    });
  }

  /**
   * Online QR Code Scan entrypoint.
   */
  async scanTicket(input: ScanTicketInput, staffUserId: string): Promise<ScanTicketResultDto> {
    // 1. Verify QR token signature cryptographically
    const cryptoResult = this.cryptoService.verifyTicketCredential(input.qrPayload);
    if (!cryptoResult.isValid || !cryptoResult.payload) {
      return {
        result: 'invalid',
        scannedAt: new Date().toISOString(),
        message: cryptoResult.error ?? 'Invalid ticket signature or tampered QR code',
      };
    }

    const { ticketId, eventId } = cryptoResult.payload;

    // 2. Validate event match
    if (eventId !== input.eventId) {
      return {
        result: 'wrong_event',
        scannedAt: new Date().toISOString(),
        message: 'Ticket belongs to a different event',
      };
    }

    // 3. Delegate to canonical checkin transaction
    return this.performCheckinTransaction(
      ticketId,
      input.eventId,
      input.gateId,
      input.deviceId,
      staffUserId,
    );
  }

  /**
   * Batch Offline Sync with sync_id uniqueness and payload integrity verification.
   */
  async syncOfflineScans(input: BatchSyncScansInput, staffUserId: string): Promise<BatchSyncScansResultDto> {
    let successCount = 0;
    let duplicateCount = 0;
    let conflictCount = 0;
    const results: Array<{ syncId: string; result: string; message: string }> = [];

    for (const rec of input.records) {
      try {
        // Check if syncId already exists in checkins table
        const existingSync = await this.db.query.checkins.findFirst({
          where: eq(checkins.syncId, rec.syncId),
        });

        if (existingSync) {
          // Verify payload integrity
          if (existingSync.ticketId && existingSync.eventId === rec.eventId) {
            duplicateCount++;
            results.push({ syncId: rec.syncId, result: existingSync.result, message: 'Replayed existing sync record' });
            continue;
          } else {
            throw new ConflictException(`Sync ID ${rec.syncId} already exists with a different payload`);
          }
        }

        // Verify cryptographic signature of offline scan record
        const cryptoRes = this.cryptoService.verifyTicketCredential(rec.qrPayload);
        if (!cryptoRes.isValid || !cryptoRes.payload) {
          results.push({ syncId: rec.syncId, result: 'invalid', message: 'Invalid offline signature' });
          continue;
        }

        const scanRes = await this.performCheckinTransaction(
          cryptoRes.payload.ticketId,
          rec.eventId,
          rec.gateId,
          rec.deviceId,
          staffUserId,
          rec.syncId,
        );

        if (scanRes.result === 'success') {
          successCount++;
        } else if (scanRes.result === 'already_used') {
          conflictCount++;
        }

        results.push({ syncId: rec.syncId, result: scanRes.result, message: scanRes.message });
      } catch (err: any) {
        if (err instanceof ConflictException) {
          throw err;
        }
        results.push({ syncId: rec.syncId, result: 'error', message: err.message });
      }
    }

    return {
      processedCount: input.records.length,
      successCount,
      duplicateCount,
      conflictCount,
      results,
    };
  }

  /**
   * PII-minimized Attendee Search scoped strictly to assigned event.
   */
  async searchAttendees(eventId: string, query: string): Promise<AttendeeSearchResultDto[]> {
    const matchedTickets = await this.db
      .select({
        ticketId: tickets.id,
        ticketNumber: tickets.ticketNumber,
        status: tickets.status,
        checkedInAt: tickets.checkedInAt,
        ticketTypeName: ticketTypes.name,
        purchaserName: users.name,
      })
      .from(tickets)
      .innerJoin(ticketTypes, eq(tickets.ticketTypeId, ticketTypes.id))
      .innerJoin(users, eq(tickets.userId, users.id))
      .where(
        and(
          eq(tickets.eventId, eventId),
          or(
            ilike(tickets.ticketNumber, `%${query}%`),
            ilike(users.name, `%${query}%`),
            ilike(users.email, `%${query}%`),
          ),
        ),
      )
      .limit(20);

    return matchedTickets.map((t: any) => ({
      ticketId: t.ticketId,
      ticketNumber: t.ticketNumber,
      ticketTypeName: t.ticketTypeName,
      purchaserName: t.purchaserName ?? 'Attendee',
      status: t.status,
      checkedInAt: t.checkedInAt ? t.checkedInAt.toISOString() : null,
    }));
  }
}
