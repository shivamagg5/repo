import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { auditLogs } from '../../database/schema/index';

// ---------------------------------------------------------------------------
// Audit event categories
// ---------------------------------------------------------------------------
export type AuditCategory =
  | 'auth'          // auth.login, auth.logout, auth.user_created, auth.user_suspended, auth.user_restored
  | 'organization'  // organization.created, organization.updated, organization.suspended
  | 'membership'    // member.invited, member.accepted, member.removed, member.role_changed
  | 'role'          // role.assigned, role.changed, role.removed
  | 'admin'         // admin.user_suspended, admin.user_restored, admin.role_changed
  | 'security';     // security.escalation_attempt, security.invalid_token, security.invalid_invitation

// ---------------------------------------------------------------------------
// Audit event input
// ---------------------------------------------------------------------------
export interface AuditEventInput {
  actorUserId: string | null;
  action: string;
  category: AuditCategory;
  entityType: string;
  entityId?: string;
  /** Safe metadata only — NEVER include: tokens, passwords, access_token,
   * refresh_token, service_role_key, raw invitation tokens, or OAuth secrets.
   * For invitations: store token_hash (sha256) not the raw token. */
  metadata?: Record<string, unknown>;
  requestId?: string;
}

// ---------------------------------------------------------------------------
// AuditService
// ---------------------------------------------------------------------------
/**
 * AuditService — records security-sensitive events to the audit_logs table.
 *
 * SECURITY CONTRACT:
 * - Fire-and-forget: audit failures must NEVER fail the main request.
 * - Never log: passwords, access_token, refresh_token, service_role_key,
 *   raw invitation tokens, or OAuth secrets.
 * - For invitation auditing: use token_hash = sha256(token) in metadata.
 * - actorUserId may be null for unauthenticated security events.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger('AuditService');

  constructor(private readonly db: DatabaseService) {}

  /**
   * Log an audit event. Fire-and-forget — never throws.
   */
  log(event: AuditEventInput): void {
    const { actorUserId, action, entityType, entityId, metadata, requestId } = event;

    this.db.db
      .insert(auditLogs)
      .values({
        actorUserId: actorUserId ?? undefined,
        action,
        entityType,
        entityId: entityId ?? undefined,
        metadata: JSON.stringify({
          ...(metadata ?? {}),
          requestId: requestId ?? undefined,
        }),
      })
      .then(() => undefined)
      .catch((err: unknown) => {
        // Audit failure must never propagate
        this.logger.error(`Audit log failed for action=${action}`, err);
      });
  }
}
