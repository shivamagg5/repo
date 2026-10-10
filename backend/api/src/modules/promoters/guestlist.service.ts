import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { events, organizations } from '../../database/schema/index';
import { PromotersService } from './promoters.service';
import { ScannerCryptoService } from '../scanner/scanner-crypto.service';
import { AuditService } from '../../common/audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { randomUUID } from 'crypto';
import type {
  AuthContext,
  CreateGuestlistInput,
  GuestlistEntryDto,
} from '@platform/types';

@Injectable()
export class GuestlistService {
  private readonly logger = new Logger('GuestlistService');

  // In-memory persistent guestlist store keyed by guestlist ID (and indexed by event ID)
  private readonly guestlistStore = new Map<string, GuestlistEntryDto>();

  constructor(
    private readonly db: DatabaseService,
    private readonly promotersService: PromotersService,
    private readonly scannerCrypto: ScannerCryptoService,
    private readonly audit: AuditService,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  /**
   * CREATE GUESTLIST ENTRY
   */
  async createGuestlistEntry(
    actor: AuthContext,
    input: CreateGuestlistInput,
  ): Promise<GuestlistEntryDto> {
    // 1. Verify promoter organization
    const orgId = await this.promotersService.getUserPromoterOrgId(actor.userId);
    const profile = await this.promotersService.getOrCreatePromoterProfile(orgId);

    // 2. Fetch promoter org details
    const org = await this.db.db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    // 3. Verify event
    const event = await this.db.db.query.events.findFirst({
      where: eq(events.id, input.eventId),
    });

    if (!event) {
      throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: 'Target event not found.' });
    }

    if (['cancelled', 'rejected', 'suspended'].includes(event.status)) {
      throw new BadRequestException({
        code: 'EVENT_INELIGIBLE',
        message: `Cannot create guestlist for event in status '${event.status}'.`,
      });
    }

    const guestlistId = randomUUID();
    const issuedAt = new Date().toISOString();
    const expiresAt = input.curfewTime ?? (event.endsAt ? (event.endsAt instanceof Date ? event.endsAt.toISOString() : String(event.endsAt)) : null);

    // 4. Generate signed P-256 cryptographic pass
    const { keyVersion } = this.scannerCrypto.getPublicVerificationKeyPem();
    const qrToken = this.scannerCrypto.signTicketCredential({
      version: 'v1',
      ticketId: guestlistId,
      eventId: input.eventId,
      ticketTypeId: 'GUESTLIST',
      issuedAt,
      expiresAt,
      keyVersion,
    });

    const entry: GuestlistEntryDto = {
      id: guestlistId,
      eventId: input.eventId,
      promoterId: profile.id,
      promoterName: org?.name ?? 'Promoter',
      guestName: input.guestName.trim(),
      guestPhone: input.guestPhone ?? null,
      guestEmail: input.guestEmail ?? null,
      entryType: input.entryType ?? 'guestlist',
      allowedCount: input.allowedCount ?? 1,
      admittedCount: 0,
      curfewTime: input.curfewTime ?? null,
      tableNumber: input.tableNumber ?? null,
      status: 'active',
      qrToken,
      notes: input.notes ?? null,
      createdAt: issuedAt,
    };

    this.guestlistStore.set(guestlistId, entry);

    this.audit.log({
      actorUserId: actor.userId,
      action: 'promoter.guestlist_created',
      category: 'organization',
      entityType: 'guestlist',
      entityId: guestlistId,
      metadata: {
        eventId: input.eventId,
        guestName: input.guestName,
        allowedCount: input.allowedCount ?? 1,
        entryType: input.entryType ?? 'guestlist',
      },
    });

    return entry;
  }

  /**
   * GET PROMOTER'S SUBMITTED GUESTLISTS FOR AN EVENT
   */
  async getPromoterGuestlists(
    actor: AuthContext,
    eventId: string,
  ): Promise<GuestlistEntryDto[]> {
    const orgId = await this.promotersService.getUserPromoterOrgId(actor.userId);
    const profile = await this.promotersService.getOrCreatePromoterProfile(orgId);

    const results: GuestlistEntryDto[] = [];
    for (const entry of this.guestlistStore.values()) {
      if (entry.eventId === eventId && entry.promoterId === profile.id) {
        results.push(entry);
      }
    }

    return results;
  }

  /**
   * GET ALL GUESTLISTS FOR AN EVENT (FOR ORGANIZERS / SCANNER)
   */
  async getEventGuestlists(eventId: string): Promise<GuestlistEntryDto[]> {
    const results: GuestlistEntryDto[] = [];
    for (const entry of this.guestlistStore.values()) {
      if (entry.eventId === eventId) {
        results.push(entry);
      }
    }
    return results;
  }

  /**
   * FIND GUESTLIST ENTRY BY ID
   */
  async getGuestlistEntry(guestlistId: string): Promise<GuestlistEntryDto | null> {
    return this.guestlistStore.get(guestlistId) ?? null;
  }

  /**
   * CHECK IN GUESTLIST ENTRY
   */
  async checkInGuestlistEntry(
    guestlistId: string,
    admitCount: number = 1,
  ): Promise<GuestlistEntryDto> {
    const entry = this.guestlistStore.get(guestlistId);
    if (!entry) {
      throw new NotFoundException({ code: 'GUESTLIST_NOT_FOUND', message: 'Guestlist entry not found.' });
    }

    if (entry.status === 'cancelled') {
      throw new BadRequestException({ code: 'GUESTLIST_CANCELLED', message: 'Guestlist entry has been cancelled.' });
    }

    // Curfew check
    if (entry.curfewTime && new Date() > new Date(entry.curfewTime)) {
      entry.status = 'expired';
      throw new BadRequestException({
        code: 'CURFEW_EXPIRED',
        message: `Guestlist curfew expired at ${new Date(entry.curfewTime).toLocaleTimeString()}.`,
      });
    }

    const newAdmitted = entry.admittedCount + admitCount;
    if (newAdmitted > entry.allowedCount) {
      throw new BadRequestException({
        code: 'CAPACITY_EXCEEDED',
        message: `Already admitted ${entry.admittedCount}/${entry.allowedCount} guests on this pass.`,
      });
    }

    entry.admittedCount = newAdmitted;
    entry.checkedInAt = new Date().toISOString();
    if (entry.admittedCount >= entry.allowedCount) {
      entry.status = 'admitted';
    }

    this.guestlistStore.set(guestlistId, entry);

    this.realtime?.publishScanEvent(entry.eventId, {
      eventId: entry.eventId,
      ticketId: entry.id,
      ticketNumber: `GL-${entry.id.slice(0, 6)}`,
      tierName: (entry.entryType || 'guestlist').toUpperCase(),
      attendeeName: entry.guestName,
      gate: 'Guestlist Door',
      scannedAt: entry.checkedInAt,
      status: 'admitted',
    });

    return entry;
  }
}
