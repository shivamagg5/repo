import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import {
  RealtimeInventoryUpdateDto,
  RealtimeScanEventDto,
  TurnstileTelemetryDto,
} from '@platform/types';

export interface InternalInventoryMessage {
  eventId: string;
  data: RealtimeInventoryUpdateDto;
}

export interface InternalScanMessage {
  eventId: string;
  data: RealtimeScanEventDto;
}

export interface InternalTelemetryMessage {
  eventId: string;
  data: TurnstileTelemetryDto;
}

interface EventTelemetryState {
  totalAdmitted: number;
  totalCapacity: number;
  recentScans: number[];
  gates: Map<string, { admittedCount: number; lastScanAt: string | null }>;
  tiers: Map<string, number>;
  recentAlertsCount: number;
}

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  private readonly inventorySubject = new Subject<InternalInventoryMessage>();
  private readonly scanSubject = new Subject<InternalScanMessage>();
  private readonly telemetrySubject = new Subject<InternalTelemetryMessage>();

  private readonly telemetryState = new Map<string, EventTelemetryState>();

  /**
   * Broadcast an inventory capacity update to all listeners for an event
   */
  publishInventoryUpdate(eventId: string, payload: RealtimeInventoryUpdateDto): void {
    this.logger.debug(`Broadcasting live inventory update for event ${eventId}, tier ${payload.ticketTypeId}`);
    this.inventorySubject.next({
      eventId,
      data: payload,
    });
  }

  /**
   * Broadcast a gate scan event to all organizers/admins monitoring an event
   * and update sliding-window turnstile telemetry.
   */
  publishScanEvent(eventId: string, payload: RealtimeScanEventDto): void {
    this.logger.debug(`Broadcasting live scan event for event ${eventId}, ticket ${payload.ticketId}`);
    this.scanSubject.next({
      eventId,
      data: payload,
    });

    // Update in-memory turnstile telemetry
    const state = this.getOrCreateTelemetryState(eventId);
    const now = Date.now();

    if (payload.status === 'admitted') {
      state.totalAdmitted++;
      state.recentScans.push(now);

      const gateName = payload.gate ?? 'Main Gate';
      const gateEntry = state.gates.get(gateName) ?? { admittedCount: 0, lastScanAt: null };
      gateEntry.admittedCount++;
      gateEntry.lastScanAt = payload.scannedAt;
      state.gates.set(gateName, gateEntry);

      const currentTierCount = state.tiers.get(payload.tierName) ?? 0;
      state.tiers.set(payload.tierName, currentTierCount + 1);
    } else {
      state.recentAlertsCount++;
    }

    // Prune scans older than 60s
    state.recentScans = state.recentScans.filter((t) => now - t <= 60000);

    const snapshot = this.buildTelemetrySnapshot(eventId, state);
    this.telemetrySubject.next({
      eventId,
      data: snapshot,
    });
  }

  /**
   * Publish explicit turnstile telemetry payload
   */
  publishTelemetry(eventId: string, data: TurnstileTelemetryDto): void {
    this.telemetrySubject.next({
      eventId,
      data,
    });
  }

  /**
   * Return the current snapshot of turnstile telemetry for an event
   */
  getEventTelemetrySnapshot(eventId: string): TurnstileTelemetryDto {
    const state = this.getOrCreateTelemetryState(eventId);
    const now = Date.now();
    state.recentScans = state.recentScans.filter((t) => now - t <= 60000);
    return this.buildTelemetrySnapshot(eventId, state);
  }

  /**
   * Record hardware or manual bouncer clicker delta (+1, -1, +2, etc.)
   */
  recordClickerDelta(
    eventId: string,
    delta: number,
    direction: 'admit' | 'exit',
    gate: string = 'Turnstile Gate',
  ): TurnstileTelemetryDto {
    const state = this.getOrCreateTelemetryState(eventId);
    const now = Date.now();

    if (direction === 'admit') {
      state.totalAdmitted += delta;
      for (let i = 0; i < delta; i++) {
        state.recentScans.push(now);
      }
      const gateEntry = state.gates.get(gate) ?? { admittedCount: 0, lastScanAt: null };
      gateEntry.admittedCount += delta;
      gateEntry.lastScanAt = new Date().toISOString();
      state.gates.set(gate, gateEntry);

      const currentTier = state.tiers.get('General Admission') ?? 0;
      state.tiers.set('General Admission', currentTier + delta);
    } else {
      state.totalAdmitted = Math.max(0, state.totalAdmitted - delta);
    }

    state.recentScans = state.recentScans.filter((t) => now - t <= 60000);
    const snapshot = this.buildTelemetrySnapshot(eventId, state);
    this.telemetrySubject.next({
      eventId,
      data: snapshot,
    });
    return snapshot;
  }

  /**
   * Record walk-in patron admission at the door and sync turnstile stream
   */
  admitWalkIn(
    eventId: string,
    input: {
      guestName: string;
      phone?: string;
      plusOnes?: number;
      coverFee?: number;
      promoterName?: string;
      gate?: string;
    },
  ): { entry: any; telemetry: TurnstileTelemetryDto } {
    const plusCount = input.plusOnes ?? 0;
    const admitCount = 1 + plusCount;
    const gateName = input.gate ?? 'Door Main Gate';

    const state = this.getOrCreateTelemetryState(eventId);
    const now = Date.now();
    state.totalAdmitted += admitCount;
    for (let i = 0; i < admitCount; i++) {
      state.recentScans.push(now);
    }

    const gateEntry = state.gates.get(gateName) ?? { admittedCount: 0, lastScanAt: null };
    gateEntry.admittedCount += admitCount;
    gateEntry.lastScanAt = new Date().toISOString();
    state.gates.set(gateName, gateEntry);

    const tierCount = state.tiers.get('Walk-in Cover') ?? 0;
    state.tiers.set('Walk-in Cover', tierCount + admitCount);

    state.recentScans = state.recentScans.filter((t) => now - t <= 60000);
    const snapshot = this.buildTelemetrySnapshot(eventId, state);
    this.telemetrySubject.next({
      eventId,
      data: snapshot,
    });

    const entry = {
      id: `gst-walkin-${Date.now()}`,
      eventId,
      guestName: input.guestName.trim(),
      phone: input.phone ?? 'N/A',
      plusOnes: plusCount,
      admittedCount: admitCount,
      promoterName: input.promoterName ?? 'Door Walk-in',
      entryTier: 'COVER_PAYABLE',
      coverFee: input.coverFee ?? 0,
      status: 'admitted',
      checkedInAt: new Date().toISOString(),
    };

    return { entry, telemetry: snapshot };
  }

  /**
   * Return an SSE-compatible Observable stream of inventory events for a specific event
   */
  getInventoryStream(eventId: string): Observable<MessageEvent> {
    return this.inventorySubject.asObservable().pipe(
      filter((msg) => msg.eventId === eventId),
      map((msg) => ({
        type: 'inventory_update',
        data: msg.data,
      } as MessageEvent)),
    );
  }

  /**
   * Return an SSE-compatible Observable stream of scan events for a specific event
   */
  getScanStream(eventId: string): Observable<MessageEvent> {
    return this.scanSubject.asObservable().pipe(
      filter((msg) => msg.eventId === eventId),
      map((msg) => ({
        type: 'gate_scan',
        data: msg.data,
      } as MessageEvent)),
    );
  }

  /**
   * Return an SSE-compatible Observable stream of turnstile telemetry for a specific event
   */
  getTelemetryStream(eventId: string): Observable<MessageEvent> {
    return this.telemetrySubject.asObservable().pipe(
      filter((msg) => msg.eventId === eventId),
      map((msg) => ({
        type: 'turnstile_telemetry',
        data: msg.data,
      } as MessageEvent)),
    );
  }

  private getOrCreateTelemetryState(eventId: string): EventTelemetryState {
    let state = this.telemetryState.get(eventId);
    if (!state) {
      state = {
        totalAdmitted: 0,
        totalCapacity: 5000,
        recentScans: [],
        gates: new Map(),
        tiers: new Map(),
        recentAlertsCount: 0,
      };
      this.telemetryState.set(eventId, state);
    }
    return state;
  }

  private buildTelemetrySnapshot(eventId: string, state: EventTelemetryState): TurnstileTelemetryDto {
    const now = Date.now();
    const ingressVelocityPerMin = state.recentScans.filter((t) => now - t <= 60000).length;
    const capacity = state.totalCapacity > 0 ? state.totalCapacity : 1;
    const admittedPercentage = Math.min(100, Math.round((state.totalAdmitted / capacity) * 100));

    const gateBreakdown = Array.from(state.gates.entries()).map(([gate, info]) => ({
      gate,
      admittedCount: info.admittedCount,
      lastScanAt: info.lastScanAt,
    }));

    const tierBreakdown = Array.from(state.tiers.entries()).map(([tierName, admittedCount]) => ({
      tierName,
      admittedCount,
    }));

    return {
      eventId,
      totalAdmitted: state.totalAdmitted,
      totalCapacity: state.totalCapacity,
      admittedPercentage,
      ingressVelocityPerMin,
      activeGatesCount: state.gates.size > 0 ? state.gates.size : 1,
      gateBreakdown,
      tierBreakdown,
      recentAlertsCount: state.recentAlertsCount,
      timestamp: new Date().toISOString(),
    };
  }
}
