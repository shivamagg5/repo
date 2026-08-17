'use client';
// =============================================================================
// @platform/auth — Analytics Manager & React Hook (CLIENT-SAFE)
// Strictly enforces canonical taxonomy (14_ANALYTICS_EVENTS.md), PII sanitization,
// financial minor-unit integer rules, bounded in-memory buffering, debounced batching,
// and render-safe deduplication.
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ApiClient } from '@platform/api-client';
import type { RecordAnalyticsEventInput } from '@platform/types';

/**
 * Canonical Event Taxonomy from 14_ANALYTICS_EVENTS.md
 */
export const CANONICAL_ANALYTICS_EVENTS = new Set<string>([
  // Consumer Events
  'app_open',
  'session_start',
  'page_view',
  'search_started',
  'search_completed',
  'filter_applied',
  'event_view',
  'event_share',
  'favorite_added',
  'favorite_removed',
  'checkout_started',
  'checkout_ticket_selected',
  'promo_applied',
  'payment_started',
  'payment_success',
  'payment_failed',
  'order_viewed',
  'ticket_viewed',
  'ticket_shared',
  'refund_requested',
  'notification_opened',

  // Organizer Events
  'organizer_login',
  'event_created',
  'event_saved',
  'event_submitted',
  'event_published',
  'ticket_type_created',
  'ticket_price_changed',
  'promo_created',
  'guest_added',
  'dashboard_viewed',
  'report_exported',
  'refund_processed',

  // Promoter Events
  'campaign_viewed',
  'referral_link_copied',

  // Scanner Events
  'scanner_login',
  'scanner_event_selected',
  'scanner_bootstrap',
  'scan_started',
  'scan_success',
  'scan_invalid',
  'scan_already_used',
  'scan_wrong_event',
  'scan_refunded',
  'offline_mode_entered',
  'offline_scan',
  'sync_started',
  'sync_completed',
  'sync_conflict',
  'device_revoked',

  // Admin Events
  'admin_login',
  'event_approved',
  'event_rejected',
  'event_suspended',
  'user_suspended',
  'refund_approved',
  'settlement_approved',
  'settlement_paid',
  'role_changed',
]);

/**
 * Sensitive keys strictly prohibited in analytics properties.
 */
const FORBIDDEN_PROPERTY_KEYS = new Set<string>([
  'password',
  'token',
  'secret',
  'authorization',
  'cardNumber',
  'card_number',
  'cvv',
  'expiry',
  'accountNumber',
  'account_number',
  'ifsc',
  'privateKey',
  'private_key',
  'email',
  'adminEmail',
  'admin_email',
  'phone',
]);

/**
 * Sanitizes property bag:
 * - Drops prohibited keys
 * - Rounds floating monetary amounts to integer minor units if key indicates currency/price
 * - Enforces JSON-serializable primitives
 */
export function sanitizeAnalyticsProperties(
  properties?: Record<string, any>,
): Record<string, any> | undefined {
  if (!properties || typeof properties !== 'object') return undefined;

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(properties)) {
    // 1. Drop forbidden PII/security keys
    if (FORBIDDEN_PROPERTY_KEYS.has(key) || key.toLowerCase().includes('password') || key.toLowerCase().includes('secret')) {
      continue;
    }

    // 2. Ignore functions, symbols, undefined
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
      continue;
    }

    // 3. Integer minor-unit enforcement for monetary keys
    if (
      (key.toLowerCase().includes('minor') || key.toLowerCase().includes('price') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('total')) &&
      typeof value === 'number'
    ) {
      sanitized[key] = Math.round(value);
      continue;
    }

    // 4. Strings, numbers, booleans, arrays, safe objects
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.slice(0, 50); // limit array length
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeAnalyticsProperties(value);
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

export interface AnalyticsConfig {
  maxQueueSize?: number;
  batchSize?: number;
  flushIntervalMs?: number;
  platform?: 'web' | 'ios' | 'android' | 'admin';
  appVersion?: string;
}

/**
 * Client-Side Analytics Manager
 * Manages in-memory bounded queue, session state, debounced flushing, and fail-silent dispatch.
 */
export class AnalyticsManager {
  private queue: RecordAnalyticsEventInput[] = [];
  private timer: any = null;
  private sessionId: string;
  private apiClient: ApiClient | null = null;
  private readonly maxQueueSize: number;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly platform: 'web' | 'ios' | 'android' | 'admin';
  private readonly appVersion: string;
  private isDestroyed = false;

  constructor(config: AnalyticsConfig = {}) {
    this.maxQueueSize = config.maxQueueSize ?? 50;
    this.batchSize = config.batchSize ?? 25;
    this.flushIntervalMs = config.flushIntervalMs ?? 2000;
    this.platform = config.platform ?? 'web';
    this.appVersion = config.appVersion ?? '1.0.0';

    // Generate or restore session ID from sessionStorage
    this.sessionId = this.initSessionId();

    // Attach visibility / unload handlers in browser
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
  }

  public setApiClient(client: ApiClient | null) {
    this.apiClient = client;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  private initSessionId(): string {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        let sid = window.sessionStorage.getItem('platform_analytics_session_id');
        if (!sid) {
          sid = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
          window.sessionStorage.setItem('platform_analytics_session_id', sid);
        }
        return sid;
      } catch {
        // Fallback if sessionStorage is disabled/blocked
      }
    }
    return `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Track a single canonical analytics event.
   * Silently drops invalid event names and sanitizes properties.
   */
  public track(
    eventName: string,
    properties?: Record<string, any>,
    eventId?: string,
  ): void {
    if (this.isDestroyed) return;

    // 1. Enforce canonical taxonomy
    if (!CANONICAL_ANALYTICS_EVENTS.has(eventName)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Analytics] Dropped non-canonical event: "${eventName}"`);
      }
      return;
    }

    // 2. Sanitize properties & strip PII
    const cleanProps = sanitizeAnalyticsProperties(properties);

    // 3. Build validated payload
    const eventPayload: RecordAnalyticsEventInput = {
      clientEventId: `evt_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
      eventName,
      eventId: eventId && eventId.length === 36 ? eventId : undefined,
      sessionId: this.sessionId,
      platform: this.platform,
      appVersion: this.appVersion,
      occurredAt: new Date().toISOString(),
      properties: cleanProps,
    };

    // 4. Manage bounded queue (drop oldest if full)
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift(); // discard oldest to protect memory
    }
    this.queue.push(eventPayload);

    // 5. Schedule debounced flush
    this.scheduleFlush();
  }

  /**
   * Immediately flush buffered events in bounded batches.
   * Fail-silent execution.
   */
  public async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0 || !this.apiClient) {
      return;
    }

    const batch = this.queue.splice(0, this.batchSize);

    try {
      if (batch.length === 1) {
        await this.apiClient.recordAnalyticsEvent(batch[0]!);
      } else if (batch.length > 1) {
        await this.apiClient.recordAnalyticsBatch({ events: batch });
      }
    } catch (err) {
      // Fail-silent: log in development only
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Analytics] Telemetry dispatch failed (silently handled):', err);
      }
    }
  }

  private scheduleFlush(): void {
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.flushIntervalMs);
    }
  }

  private handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.flush();
    }
  };

  private handleBeforeUnload = () => {
    this.flush();
  };

  public destroy(): void {
    this.isDestroyed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
  }
}

// Global Singleton for web clients
let globalAnalyticsManager: AnalyticsManager | null = null;

export function getAnalyticsManager(config?: AnalyticsConfig): AnalyticsManager {
  if (!globalAnalyticsManager) {
    globalAnalyticsManager = new AnalyticsManager(config);
  }
  return globalAnalyticsManager;
}

/**
 * React Hook for component analytics tracking
 */
export function useAnalytics(apiClient?: ApiClient | null) {
  const [manager] = useState(() => getAnalyticsManager());

  useEffect(() => {
    if (apiClient) {
      manager.setApiClient(apiClient);
    }
  }, [manager, apiClient]);

  const track = useCallback(
    (eventName: string, properties?: Record<string, any>, eventId?: string) => {
      manager.track(eventName, properties, eventId);
    },
    [manager],
  );

  const flush = useCallback(() => {
    return manager.flush();
  }, [manager]);

  return {
    track,
    flush,
    sessionId: manager.getSessionId(),
  };
}

/**
 * React Hook to track an event ONCE on mount with deduplication guard.
 * Prevents multiple firings from React re-renders and StrictMode double-invocations.
 */
export function useTrackOnce(
  eventName: string,
  properties?: Record<string, any>,
  eventId?: string,
  apiClient?: ApiClient | null,
) {
  const { track } = useAnalytics(apiClient);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      track(eventName, properties, eventId);
    }
  }, [eventName, properties, eventId, track]);
}
