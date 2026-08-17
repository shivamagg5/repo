// =============================================================================
// @platform/auth — Analytics Manager Tests
// Validates canonical event taxonomy, PII sanitization, bounded buffering,
// debounced flushing, and fail-silent dispatch.
// =============================================================================

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  AnalyticsManager,
  CANONICAL_ANALYTICS_EVENTS,
  sanitizeAnalyticsProperties,
} from './analytics.js';

describe('Analytics Manager & Validation Tests', () => {
  let manager: AnalyticsManager;
  let mockApiClient: any;
  let dispatchedEvents: any[] = [];
  let dispatchedBatches: any[] = [];

  beforeEach(() => {
    dispatchedEvents = [];
    dispatchedBatches = [];

    mockApiClient = {
      recordAnalyticsEvent: async (event: any) => {
        dispatchedEvents.push(event);
        return { data: { success: true } };
      },
      recordAnalyticsBatch: async (batch: any) => {
        dispatchedBatches.push(batch);
        return { data: { count: batch.events.length } };
      },
    };

    manager = new AnalyticsManager({
      maxQueueSize: 5,
      batchSize: 10,
      flushIntervalMs: 50,
      platform: 'web',
      appVersion: '1.0.0',
    });
    manager.setApiClient(mockApiClient);
  });

  afterEach(() => {
    manager.destroy();
  });

  it('verifies canonical taxonomy contains all required domain events', () => {
    assert.ok(CANONICAL_ANALYTICS_EVENTS.has('event_view'));
    assert.ok(CANONICAL_ANALYTICS_EVENTS.has('search_completed'));
    assert.ok(CANONICAL_ANALYTICS_EVENTS.has('checkout_started'));
    assert.ok(CANONICAL_ANALYTICS_EVENTS.has('payment_success'));
    assert.ok(CANONICAL_ANALYTICS_EVENTS.has('payment_failed'));
    assert.ok(CANONICAL_ANALYTICS_EVENTS.has('scan_success'));
    assert.ok(CANONICAL_ANALYTICS_EVENTS.has('scan_invalid'));
    assert.ok(CANONICAL_ANALYTICS_EVENTS.has('event_created'));
    assert.ok(CANONICAL_ANALYTICS_EVENTS.has('referral_link_copied'));
    assert.ok(CANONICAL_ANALYTICS_EVENTS.has('admin_login'));
  });

  it('silently rejects non-canonical event names', async () => {
    manager.track('random_fake_event', { foo: 'bar' });
    await manager.flush();
    assert.equal(dispatchedEvents.length, 0);
    assert.equal(dispatchedBatches.length, 0);
  });

  it('sanitizes prohibited PII and security keys from properties', () => {
    const raw = {
      safeKey: 'music-festival',
      password: 'mypassword123',
      token: 'jwt.token.secret',
      secret: 'supersecret',
      adminEmail: 'admin@platform.com',
      cardNumber: '4111222233334444',
      cvv: '123',
      priceMinor: 499.0,
      validCount: 2,
    };

    const sanitized = sanitizeAnalyticsProperties(raw);
    assert.ok(sanitized);
    assert.equal(sanitized['safeKey'], 'music-festival');
    assert.equal(sanitized['validCount'], 2);
    assert.equal(sanitized['priceMinor'], 499);
    assert.equal(sanitized['password'], undefined);
    assert.equal(sanitized['token'], undefined);
    assert.equal(sanitized['secret'], undefined);
    assert.equal(sanitized['adminEmail'], undefined);
    assert.equal(sanitized['cardNumber'], undefined);
    assert.equal(sanitized['cvv'], undefined);
  });

  it('tracks canonical event and dispatches via API client on flush', async () => {
    manager.track('event_view', { category: 'Concert', city: 'Mumbai' });
    await manager.flush();

    assert.equal(dispatchedEvents.length, 1);
    assert.equal(dispatchedEvents[0].eventName, 'event_view');
    assert.equal(dispatchedEvents[0].platform, 'web');
    assert.equal(dispatchedEvents[0].properties.category, 'Concert');
    assert.ok(dispatchedEvents[0].sessionId.startsWith('sess_'));
    assert.ok(dispatchedEvents[0].clientEventId.startsWith('evt_'));
  });

  it('enforces bounded queue size dropping oldest events when full', async () => {
    // maxQueueSize is 5
    for (let i = 1; i <= 8; i++) {
      manager.track('page_view', { step: i });
    }

    await manager.flush();

    // Batch contains the latest 5 events (steps 4, 5, 6, 7, 8)
    assert.equal(dispatchedBatches.length, 1);
    assert.equal(dispatchedBatches[0].events.length, 5);
    assert.equal(dispatchedBatches[0].events[0].properties.step, 4);
    assert.equal(dispatchedBatches[0].events[4].properties.step, 8);
  });

  it('fail-silently handles API client errors during flush without throwing', async () => {
    const brokenClient = {
      recordAnalyticsEvent: async () => {
        throw new Error('Network timeout');
      },
      recordAnalyticsBatch: async () => {
        throw new Error('500 Internal Server Error');
      },
    };

    manager.setApiClient(brokenClient as any);
    manager.track('checkout_started', { quantity: 2 });

    // Should not throw
    await assert.doesNotReject(async () => {
      await manager.flush();
    });
  });
});
