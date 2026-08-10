import type { CheckinResult } from './enums.js';

export interface CheckinDevice {
  id: string;
  organizationId: string;
  deviceIdentifier: string;
  status: string;
  lastSeenAt: string | null;
}

export interface CheckinGate {
  id: string;
  eventId: string;
  name: string;
  status: string;
}

export interface Checkin {
  id: string;
  ticketId: string;
  eventId: string;
  gateId: string | null;
  deviceId: string | null;
  staffUserId: string | null;
  result: CheckinResult;
  scannedAt: string;
  serverRecordedAt: string;
  syncId: string;
}
