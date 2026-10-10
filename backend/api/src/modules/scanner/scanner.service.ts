import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { eq, and, sql, or, ilike } from 'drizzle-orm';
import * as crypto from 'crypto';
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
  organizationMembers,
  scannerPairingTokens,
} from '../../database/schema';
import { ScannerCryptoService } from './scanner-crypto.service';
import { RealtimeService } from '../realtime/realtime.service';
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
  ScannerDeviceHeartbeatDto,
  ScannerHeartbeatInput,
} from '@platform/types';

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private readonly activeHeartbeats = new Map<string, ScannerDeviceHeartbeatDto>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cryptoService: ScannerCryptoService,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  private get db() {
    return this.databaseService.db;
  }

  /**
   * Resolve active organization membership for a staff user.
   * If requestedOrgId is passed (advisory selector), verify active membership in that org.
   * Otherwise, return the first active organization membership.
   */
  async resolveStaffOrgId(staffUserId: string, requestedOrgId?: string): Promise<string> {
    const memberships = await this.db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.userId, staffUserId),
        eq(organizationMembers.status, 'active'),
      ),
    });

    if (!memberships || memberships.length === 0) {
      throw new ForbiddenException({
        code: 'NO_ACTIVE_ORG_MEMBERSHIP',
        message: 'Authenticated user has no active organization memberships.',
      });
    }

    if (requestedOrgId) {
      const match = memberships.find((m: any) => m.organizationId === requestedOrgId);
      if (!match) {
        throw new ForbiddenException({
          code: 'ORG_MEMBERSHIP_FORBIDDEN',
          message: 'Authenticated user is not an active member of the requested organization.',
        });
      }
      return match.organizationId;
    }

    const primary = memberships[0];
    if (!primary) {
      throw new ForbiddenException({
        code: 'NO_ACTIVE_ORG_MEMBERSHIP',
        message: 'Authenticated user has no active organization memberships.',
      });
    }
    return primary.organizationId;
  }

  /**
   * Resolve active organization membership for a staff user for a specific event.
   * Verifies that the staff user belongs to the organization that owns the event.
   */
  async resolveStaffOrgForEvent(staffUserId: string, eventId: string, requestedOrgId?: string): Promise<string> {
    const event = await this.db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const memberships = await this.db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.userId, staffUserId),
        eq(organizationMembers.status, 'active'),
      ),
    });

    if (!memberships || memberships.length === 0) {
      throw new ForbiddenException({
        code: 'NO_ACTIVE_ORG_MEMBERSHIP',
        message: 'Authenticated user has no active organization memberships.',
      });
    }

    const hasOrgAccess = memberships.some((m: any) => m.organizationId === event.organizerOrganizationId);
    if (!hasOrgAccess) {
      throw new ForbiddenException({
        code: 'EVENT_ORG_ACCESS_DENIED',
        message: 'Staff user is not a member of the organization that owns this event.',
      });
    }

    if (requestedOrgId && requestedOrgId !== event.organizerOrganizationId) {
      throw new ForbiddenException({
        code: 'EVENT_ORG_MISMATCH',
        message: 'Requested organization does not own this event.',
      });
    }

    return event.organizerOrganizationId;
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

    this.activeHeartbeats.set(device.id, {
      deviceId: device.id,
      deviceIdentifier: device.deviceIdentifier,
      eventId: event.id,
      gateId: gate.id,
      batteryLevel: 100,
      isCharging: false,
      offlineQueueDepth: 0,
      networkLatencyMs: 25,
      appVersion: '1.0.0',
      lastSeenAt: issuedAt.toISOString(),
    });

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
    credentialIssuedAt?: string,
    qrPayload?: string,
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
          result: 'invalid',
          ticketId,
          scannedAt: new Date().toISOString(),
          message: 'Ticket not found in event database',
        };
      }

      // Check if ticket QR was reissued/revoked
      if (credentialIssuedAt && ticket.issuedAt) {
        const credTime = new Date(credentialIssuedAt).getTime();
        const ticketIssuedTime = new Date(ticket.issuedAt).getTime();
        // Reject outdated credentials (permits 1s drift for db timestamp rounding)
        if (credTime < ticketIssuedTime - 1000) {
          return {
            result: 'invalid',
            ticketId,
            scannedAt: new Date().toISOString(),
            message: 'Ticket QR credential has been reissued or revoked. Please present latest ticket.',
          };
        }
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

        this.realtime?.publishScanEvent(eventId, {
          eventId,
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          tierName: ticketType?.name ?? 'General Admission',
          attendeeName: userRecord?.name ?? 'Attendee',
          gate: gateId ?? 'Main Gate',
          scannedAt: scannedAt.toISOString(),
          status: 'duplicate',
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

      this.realtime?.publishScanEvent(eventId, {
        eventId,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        tierName: ticketType?.name ?? 'Standard Entry',
        attendeeName: userRecord?.name ?? 'Attendee',
        gate: gateId ?? 'Main Gate',
        scannedAt: scannedAt.toISOString(),
        status: 'admitted',
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
      undefined,
      cryptoResult.payload.issuedAt,
      input.qrPayload,
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
          cryptoRes.payload.issuedAt,
          rec.qrPayload,
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

  /**
   * Onboard a scanner device using a single-use 10-minute pairing token.
   */
  async onboardScanner(
    input: { pairingCode: string; deviceName: string; deviceFingerprint: string; publicKeyPem: string },
    staffUserId: string,
  ): Promise<{
    deviceId: string;
    deviceIdentifier: string;
    package: EventAuthorizationPackageDto;
  }> {
    const codeClean = input.pairingCode.toUpperCase().trim();
    const hash = crypto.createHash('sha256').update(codeClean).digest('hex');

    const token = await this.db.query.scannerPairingTokens.findFirst({
      where: eq(scannerPairingTokens.pairingCodeHash, hash),
    });

    if (!token) {
      throw new BadRequestException({
        code: 'INVALID_PAIRING_CODE',
        message: 'Invalid or unrecognized pairing code.',
      });
    }

    if (token.status !== 'active' || (token.expiresAt && token.expiresAt < new Date())) {
      throw new BadRequestException({
        code: 'EXPIRED_PAIRING_CODE',
        message: 'This pairing code has expired or has already been used.',
      });
    }

    // Register or find device under the token's organization
    const registered = await this.registerDevice(
      {
        deviceIdentifier: input.deviceFingerprint,
        publicKeyPem: input.publicKeyPem,
      },
      token.organizationId,
    );

    // Mark token as used
    await this.db
      .update(scannerPairingTokens)
      .set({
        status: 'used',
        usedAt: new Date(),
        usedByDeviceId: registered.deviceId,
      })
      .where(eq(scannerPairingTokens.id, token.id));

    // Resolve or fallback gate
    let targetGateId = token.gateId;
    if (!targetGateId) {
      const existingGate = await this.db.query.checkinGates.findFirst({
        where: and(eq(checkinGates.eventId, token.eventId), eq(checkinGates.status, 'active')),
      });
      if (!existingGate) {
        const inserted = await this.db
          .insert(checkinGates)
          .values({
            eventId: token.eventId,
            name: 'Main Gate',
            status: 'active',
          })
          .returning();
        if (!inserted[0]) {
          throw new BadRequestException('Failed to initialize gate for event check-in');
        }
        targetGateId = inserted[0].id;
      } else {
        targetGateId = existingGate.id;
      }
    }

    // Generate signed event authorization package
    const authPackage = await this.pairDevice(
      {
        deviceId: registered.deviceId,
        eventId: token.eventId,
        gateId: targetGateId,
      },
      staffUserId,
      token.organizationId,
    );

    return {
      deviceId: registered.deviceId,
      deviceIdentifier: registered.deviceIdentifier,
      package: authPackage,
    };
  }

  /**
   * Record periodic hardware heartbeat from a turnstile scanner terminal.
   */
  async recordHeartbeat(input: ScannerHeartbeatInput): Promise<ScannerDeviceHeartbeatDto> {
    const device = await this.db.query.checkinDevices.findFirst({
      where: eq(checkinDevices.id, input.deviceId),
    });

    if (!device) {
      throw new NotFoundException({
        code: 'DEVICE_NOT_FOUND',
        message: `Scanner device with ID ${input.deviceId} does not exist.`,
      });
    }

    const now = new Date();
    await this.db
      .update(checkinDevices)
      .set({
        lastSeenAt: now,
      })
      .where(eq(checkinDevices.id, device.id));

    const heartbeat: ScannerDeviceHeartbeatDto = {
      deviceId: device.id,
      deviceIdentifier: input.deviceIdentifier ?? device.deviceIdentifier,
      eventId: input.eventId,
      gateId: input.gateId,
      batteryLevel: input.batteryLevel ?? 100,
      isCharging: input.isCharging ?? false,
      offlineQueueDepth: input.offlineQueueDepth ?? 0,
      networkLatencyMs: input.networkLatencyMs ?? 20,
      appVersion: input.appVersion ?? '1.0.0',
      lastSeenAt: now.toISOString(),
    };

    this.activeHeartbeats.set(device.id, heartbeat);
    return heartbeat;
  }

  /**
   * Retrieve active scanner terminals reporting for an event.
   */
  async getEventDevices(eventId: string): Promise<ScannerDeviceHeartbeatDto[]> {
    const event = await this.db.query.events.findFirst({
      where: eq(events.id, eventId),
    });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    const devices: ScannerDeviceHeartbeatDto[] = [];
    for (const hb of this.activeHeartbeats.values()) {
      if (hb.eventId === eventId) {
        devices.push(hb);
      }
    }
    return devices;
  }
}

