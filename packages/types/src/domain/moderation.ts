export interface ModerationCase {
  id: string;
  entityType: string;
  entityId: string;
  reason: string;
  severity: string;
  status: string;
  assignedTo: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface RiskFlag {
  id: string;
  entityType: string;
  entityId: string;
  rule: string;
  severity: string;
  status: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
