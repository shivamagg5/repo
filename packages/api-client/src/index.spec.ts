// =============================================================================
// @platform/api-client — Unit Tests
// Phase 14.0.1 — Verifies all domain methods use the correct backend paths
// and HTTP methods as reconciled against actual backend controllers.
//
// Uses Node.js built-in test runner (node:test) — no external test framework.
// Run: node --experimental-vm-modules --loader ts-node/esm --test src/index.spec.ts
// Or via the backend's jest runner which transpiles this file.
// =============================================================================
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient, ApiClientError, createApiClient } from './index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let lastFetchCall: { url: string; init: RequestInit } | null = null;

function mockFetch(responseData: unknown = { ok: true }, ok = true, status = 200) {
  lastFetchCall = null;
  (globalThis as any).fetch = async (url: string, init: RequestInit) => {
    lastFetchCall = { url, init };
    return {
      ok,
      status,
      json: async () => (ok ? { data: responseData } : { error: responseData }),
    };
  };
}

function capturedUrl(): string {
  assert.ok(lastFetchCall, 'fetch was not called');
  return lastFetchCall!.url;
}

function capturedMethod(): string {
  assert.ok(lastFetchCall, 'fetch was not called');
  return lastFetchCall!.init.method ?? 'GET';
}

function capturedHeaders(): Record<string, string> {
  assert.ok(lastFetchCall, 'fetch was not called');
  return lastFetchCall!.init.headers as Record<string, string>;
}

function capturedBody(): unknown {
  assert.ok(lastFetchCall, 'fetch was not called');
  const raw = lastFetchCall!.init.body;
  return raw ? JSON.parse(raw as string) : undefined;
}

function makeClient(token?: string) {
  return new ApiClient({
    baseUrl: 'http://localhost:3001/api/v1',
    getAuthToken: token ? async () => token : undefined,
    onUnauthorized: () => {},
  });
}

// ===========================================================================
// Factory
// ===========================================================================

describe('createApiClient', () => {
  it('returns an ApiClient instance', () => {
    const client = createApiClient({ baseUrl: 'http://localhost:3001' });
    assert.ok(client instanceof ApiClient);
  });

  it('strips trailing slash from baseUrl', () => {
    const client = createApiClient({ baseUrl: 'http://localhost:3001/' });
    assert.equal((client as any).baseUrl, 'http://localhost:3001');
  });
});

// ===========================================================================
// Auth injection
// ===========================================================================

describe('Authorization header', () => {
  beforeEach(() => mockFetch());

  it('injects Bearer token when getAuthToken is configured', async () => {
    const client = makeClient('test-token');
    await client.getMe();
    assert.equal(capturedHeaders()['Authorization'], 'Bearer test-token');
  });

  it('omits Authorization header when no token', async () => {
    const client = makeClient();
    await client.getPublicEvents();
    assert.equal(capturedHeaders()['Authorization'], undefined);
  });
});

// ===========================================================================
// Error handling
// ===========================================================================

describe('ApiClientError', () => {
  it('throws ApiClientError on non-OK response', async () => {
    mockFetch({ code: 'VALIDATION_ERROR', message: 'Bad input' }, false, 400);
    const client = makeClient();
    await assert.rejects(() => client.getPublicEvents(), ApiClientError);
  });

  it('calls onUnauthorized on 401', async () => {
    mockFetch({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, false, 401);
    let called = false;
    const client = new ApiClient({
      baseUrl: 'http://localhost:3001',
      onUnauthorized: () => { called = true; },
    });
    await assert.rejects(() => client.getMe());
    assert.equal(called, true);
  });
});

// ===========================================================================
// Auth domain
// Supabase handles login/signup — backend only provides sync/me/logout
// ===========================================================================

describe('Auth domain', () => {
  beforeEach(() => mockFetch());

  it('GET /auth/me', async () => {
    await makeClient('tok').getMe();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/auth/me');
    assert.equal(capturedMethod(), 'GET');
  });

  it('POST /auth/sync', async () => {
    await makeClient('tok').syncUser({ name: 'Alice' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/auth/sync');
    assert.equal(capturedMethod(), 'POST');
    assert.deepEqual(capturedBody(), { name: 'Alice' });
  });

  it('POST /auth/logout', async () => {
    await makeClient('tok').logoutUser();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/auth/logout');
    assert.equal(capturedMethod(), 'POST');
  });
});

// ===========================================================================
// Public discovery
// ===========================================================================

describe('Public discovery', () => {
  beforeEach(() => mockFetch({ items: [] }));

  it('GET /public/events with query params', async () => {
    await makeClient().getPublicEvents({ q: 'music', city: 'Mumbai' });
    assert.ok(capturedUrl().includes('/public/events'));
    assert.ok(capturedUrl().includes('q=music'));
    assert.ok(capturedUrl().includes('city=Mumbai'));
  });

  it('GET /public/events/:slug', async () => {
    await makeClient().getPublicEventBySlug('my-event-slug');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/public/events/my-event-slug');
  });

  it('GET /public/venues', async () => {
    await makeClient().getPublicVenues();
    assert.ok(capturedUrl().includes('/public/venues'));
  });

  it('GET /public/venues/:slug', async () => {
    await makeClient().getPublicVenueBySlug('palace-grounds');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/public/venues/palace-grounds');
  });

  it('GET /public/categories', async () => {
    await makeClient().getPublicCategories();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/public/categories');
  });
});

// ===========================================================================
// CMS
// ===========================================================================

describe('CMS — Public', () => {
  beforeEach(() => mockFetch([]));

  it('GET /cms/banners', async () => {
    await makeClient().getCmsBanners();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/cms/banners');
  });

  it('GET /cms/featured-events', async () => {
    await makeClient().getCmsFeaturedEvents();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/cms/featured-events');
  });

  it('GET /cms/editorial-blocks', async () => {
    await makeClient().getCmsEditorialBlocks();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/cms/editorial-blocks');
  });
});

describe('CMS — Admin', () => {
  beforeEach(() => mockFetch({ id: 'new-id' }));

  it('POST /cms/banners', async () => {
    await makeClient('tok').createCmsBanner({ title: 'Sale' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/cms/banners');
    assert.equal(capturedMethod(), 'POST');
  });

  it('POST /cms/collections', async () => {
    await makeClient('tok').createCmsCollection({ name: 'Summer Events' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/cms/collections');
    assert.equal(capturedMethod(), 'POST');
  });
});

// ===========================================================================
// Ticket types
// ===========================================================================

describe('Ticket types', () => {
  beforeEach(() => mockFetch([]));

  it('GET /events/:id/ticket-types — public (no auth)', async () => {
    await makeClient().getEventTicketTypes('event-uuid-123');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/events/event-uuid-123/ticket-types');
    assert.equal(capturedMethod(), 'GET');
    assert.equal(capturedHeaders()['Authorization'], undefined);
  });

  it('POST /events/:id/ticket-types', async () => {
    await makeClient('tok').createTicketType('event-uuid-123', { name: 'VIP' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/events/event-uuid-123/ticket-types');
    assert.equal(capturedMethod(), 'POST');
  });

  it('PATCH /ticket-types/:id', async () => {
    await makeClient('tok').updateTicketType('tt-uuid-456', { priceMinor: 200000 });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/ticket-types/tt-uuid-456');
    assert.equal(capturedMethod(), 'PATCH');
  });
});

// ===========================================================================
// Reservations — Checkout Step 1
// CONFIRMED path: /reservations (NOT /checkout/reserve)
// ===========================================================================

describe('Reservations', () => {
  beforeEach(() => mockFetch({ id: 'res-1', expiresAt: new Date().toISOString() }));

  it('POST /reservations', async () => {
    await makeClient('tok').createReservation({ eventId: 'e1', items: [{ ticketTypeId: 'tt1', quantity: 2 }] });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/reservations');
    assert.equal(capturedMethod(), 'POST');
  });

  it('GET /reservations/:id', async () => {
    await makeClient('tok').getReservation('res-uuid-789');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/reservations/res-uuid-789');
    assert.equal(capturedMethod(), 'GET');
  });

  it('POST /reservations/:id/cancel', async () => {
    await makeClient('tok').cancelReservation('res-uuid-789');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/reservations/res-uuid-789/cancel');
    assert.equal(capturedMethod(), 'POST');
  });
});

// ===========================================================================
// Payments — Checkout Step 2
// CONFIRMED path: /payments/intent (NOT /payments/initiate)
// ===========================================================================

describe('Payments', () => {
  beforeEach(() => mockFetch({ id: 'pay-1' }));

  it('POST /payments/intent', async () => {
    await makeClient('tok').createPaymentIntent({ reservationId: 'res-1' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/payments/intent');
    assert.equal(capturedMethod(), 'POST');
  });

  it('GET /payments/:id', async () => {
    await makeClient('tok').getPaymentTransaction('pay-uuid-111');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/payments/pay-uuid-111');
    assert.equal(capturedMethod(), 'GET');
  });
});

// ===========================================================================
// Orders
// CONFIRMED path: /orders (NOT /orders/my — actor-scoped on backend)
// ===========================================================================

describe('Orders', () => {
  beforeEach(() => mockFetch({ id: 'ord-1' }));

  it('POST /orders', async () => {
    await makeClient('tok').createOrder({ reservationId: 'res-1' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/orders');
    assert.equal(capturedMethod(), 'POST');
  });

  it('GET /orders — listUserOrders (actor-scoped, no /my suffix)', async () => {
    await makeClient('tok').listUserOrders();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/orders');
    assert.equal(capturedMethod(), 'GET');
  });

  it('GET /orders/:id', async () => {
    await makeClient('tok').getOrder('ord-uuid-222');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/orders/ord-uuid-222');
    assert.equal(capturedMethod(), 'GET');
  });

  it('POST /orders/:id/confirm', async () => {
    await makeClient('tok').confirmOrderPayment('ord-uuid-222');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/orders/ord-uuid-222/confirm');
    assert.equal(capturedMethod(), 'POST');
  });
});

// ===========================================================================
// Tickets — Wallet
// CONFIRMED path: /tickets (NOT /tickets/my — actor-scoped on backend)
// ===========================================================================

describe('Tickets', () => {
  beforeEach(() => mockFetch([]));

  it('GET /tickets — getUserTickets (actor-scoped, no /my suffix)', async () => {
    await makeClient('tok').getUserTickets();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/tickets');
    assert.equal(capturedMethod(), 'GET');
  });

  it('GET /tickets/:id', async () => {
    await makeClient('tok').getTicketById('tkt-uuid-333');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/tickets/tkt-uuid-333');
    assert.equal(capturedMethod(), 'GET');
  });
});

// ===========================================================================
// Events Management (Organizer)
// ===========================================================================

describe('Events management', () => {
  beforeEach(() => mockFetch({ id: 'event-1' }));

  it('POST /events?organizationId=<uuid>', async () => {
    await makeClient('tok').createEvent('org-uuid-444', { name: 'Summer Fest' });
    assert.ok(capturedUrl().includes('/events?organizationId=org-uuid-444'));
    assert.equal(capturedMethod(), 'POST');
  });

  it('GET /events?organizationId=<uuid>', async () => {
    await makeClient('tok').listEvents('org-uuid-444');
    assert.ok(capturedUrl().includes('/events'));
    assert.ok(capturedUrl().includes('organizationId=org-uuid-444'));
    assert.equal(capturedMethod(), 'GET');
  });

  it('GET /events/:id', async () => {
    await makeClient('tok').getEventById('event-uuid-555');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/events/event-uuid-555');
    assert.equal(capturedMethod(), 'GET');
  });

  it('PATCH /events/:id', async () => {
    await makeClient('tok').updateEvent('event-uuid-555', { name: 'Updated' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/events/event-uuid-555');
    assert.equal(capturedMethod(), 'PATCH');
  });

  it('POST /events/:id/submit', async () => {
    await makeClient('tok').submitEventForReview('event-uuid-555');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/events/event-uuid-555/submit');
    assert.equal(capturedMethod(), 'POST');
  });

  it('POST /events/:id/publish', async () => {
    await makeClient('tok').publishEvent('event-uuid-555');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/events/event-uuid-555/publish');
    assert.equal(capturedMethod(), 'POST');
  });

  it('POST /events/:id/unpublish', async () => {
    await makeClient('tok').unpublishEvent('event-uuid-555');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/events/event-uuid-555/unpublish');
    assert.equal(capturedMethod(), 'POST');
  });

  it('POST /events/:id/cancel', async () => {
    await makeClient('tok').cancelEvent('event-uuid-555');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/events/event-uuid-555/cancel');
    assert.equal(capturedMethod(), 'POST');
  });

  it('POST /events/:id/media', async () => {
    await makeClient('tok').addEventMedia('event-uuid-555', { url: 'https://cdn.example.com/img.jpg' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/events/event-uuid-555/media');
    assert.equal(capturedMethod(), 'POST');
  });

  it('DELETE /events/:id/media/:mediaId', async () => {
    await makeClient('tok').removeEventMedia('event-uuid-555', 'media-uuid-666');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/events/event-uuid-555/media/media-uuid-666');
    assert.equal(capturedMethod(), 'DELETE');
  });

  it('PUT /events/:id/lineup', async () => {
    await makeClient('tok').setEventLineup('event-uuid-555', { lineup: [{ name: 'DJ X' }] });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/events/event-uuid-555/lineup');
    assert.equal(capturedMethod(), 'PUT');
  });
});

// ===========================================================================
// Organizer Dashboard
// ===========================================================================

describe('Organizer dashboard', () => {
  beforeEach(() => mockFetch({}));

  it('GET /organizer/overview', async () => {
    await makeClient('tok').getOrganizerOverview();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/organizer/overview');
  });

  it('GET /organizer/events', async () => {
    await makeClient('tok').getOrganizerEvents({ limit: '10' });
    assert.ok(capturedUrl().includes('/organizer/events'));
  });

  it('GET /organizer/events/:id/dashboard', async () => {
    await makeClient('tok').getOrganizerEventDashboard('event-uuid-555');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/organizer/events/event-uuid-555/dashboard');
  });

  it('GET /organizer/events/:id/orders', async () => {
    await makeClient('tok').getOrganizerEventOrders('event-uuid-555');
    assert.ok(capturedUrl().includes('/organizer/events/event-uuid-555/orders'));
  });

  it('GET /organizer/events/:id/attendance', async () => {
    await makeClient('tok').getOrganizerEventAttendance('event-uuid-555');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/organizer/events/event-uuid-555/attendance');
  });

  it('GET /organizer/events/:id/promoters', async () => {
    await makeClient('tok').getOrganizerEventPromoters('event-uuid-555');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/organizer/events/event-uuid-555/promoters');
  });

  it('GET /organizer/team', async () => {
    await makeClient('tok').getOrganizerTeam();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/organizer/team');
  });

  it('POST /organizer/team/invitations', async () => {
    await makeClient('tok').inviteTeamMember({ email: 'member@example.com', role: 'organizer_member' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/organizer/team/invitations');
    assert.equal(capturedMethod(), 'POST');
  });
});

// ===========================================================================
// Venue Dashboard
// ===========================================================================

describe('Venue dashboard', () => {
  beforeEach(() => mockFetch({}));

  it('GET /venue/profile', async () => {
    await makeClient('tok').getVenueProfile();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/venue/profile');
  });

  it('PATCH /venue/profile', async () => {
    await makeClient('tok').updateVenueProfile({ name: 'Palace Grounds' });
    assert.equal(capturedMethod(), 'PATCH');
  });

  it('GET /venue/calendar', async () => {
    await makeClient('tok').getVenueCalendar();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/venue/calendar');
  });

  it('GET /venue/events', async () => {
    await makeClient('tok').getVenueEvents();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/venue/events');
  });

  it('GET /venue/staff', async () => {
    await makeClient('tok').getVenueStaff();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/venue/staff');
  });

  it('POST /venue/staff', async () => {
    await makeClient('tok').inviteVenueStaff({ email: 'staff@venue.com' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/venue/staff');
    assert.equal(capturedMethod(), 'POST');
  });
});

// ===========================================================================
// Promoter
// ===========================================================================

describe('Promoter', () => {
  beforeEach(() => mockFetch({}));

  it('POST /promoter/campaigns', async () => {
    await makeClient('tok').createPromoterCampaign({ eventId: 'e1', code: 'PROMO10' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/promoter/campaigns');
    assert.equal(capturedMethod(), 'POST');
  });

  it('GET /promoter/campaigns', async () => {
    await makeClient('tok').getPromoterCampaigns();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/promoter/campaigns');
    assert.equal(capturedMethod(), 'GET');
  });

  it('GET /promoter/campaigns/:id', async () => {
    await makeClient('tok').getPromoterCampaignById('camp-uuid-777');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/promoter/campaigns/camp-uuid-777');
  });

  it('GET /promoter/campaigns/:id/performance', async () => {
    await makeClient('tok').getPromoterCampaignPerformance('camp-uuid-777');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/promoter/campaigns/camp-uuid-777/performance');
  });

  it('GET /promoter/earnings', async () => {
    await makeClient('tok').getPromoterEarnings();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/promoter/earnings');
  });

  it('POST /public/referrals/click', async () => {
    await makeClient().recordReferralClick({ code: 'PROMO10' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/public/referrals/click');
    assert.equal(capturedMethod(), 'POST');
  });

  it('POST /orders/:id/attribute', async () => {
    await makeClient('tok').attributeOrder('ord-uuid-222', 'PROMO10');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/orders/ord-uuid-222/attribute');
    assert.equal(capturedMethod(), 'POST');
    assert.deepEqual(capturedBody(), { code: 'PROMO10' });
  });
});

// ===========================================================================
// Finance & Settlements
// ===========================================================================

describe('Finance & Settlements', () => {
  beforeEach(() => mockFetch({}));

  it('GET /finance/transactions', async () => {
    await makeClient('tok').listFinancialTransactions({ limit: '20' });
    assert.ok(capturedUrl().includes('/finance/transactions'));
    assert.equal(capturedMethod(), 'GET');
  });

  it('POST /finance/reconciliation/run', async () => {
    await makeClient('tok').runReconciliation({ date: '2026-08-13' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/finance/reconciliation/run');
    assert.equal(capturedMethod(), 'POST');
  });

  it('POST /settlements/generate', async () => {
    await makeClient('tok').generateSettlement({ organizationId: 'org-1' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/settlements/generate');
    assert.equal(capturedMethod(), 'POST');
  });

  it('POST /settlements/:id/review', async () => {
    await makeClient('tok').reviewSettlement('settle-uuid-888', { action: 'approve' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/settlements/settle-uuid-888/review');
    assert.equal(capturedMethod(), 'POST');
  });

  it('GET /settlements/organizer/:id/statement', async () => {
    await makeClient('tok').getOrganizerStatement('org-uuid-444', { periodStart: '2026-08-01' });
    assert.ok(capturedUrl().includes('/settlements/organizer/org-uuid-444/statement'));
    assert.equal(capturedMethod(), 'GET');
  });
});

// ===========================================================================
// Notifications
// ===========================================================================

describe('Notifications', () => {
  beforeEach(() => mockFetch({}));

  it('POST /notifications/device-tokens', async () => {
    await makeClient('tok').registerDeviceToken({ token: 'fcm-tok-xyz', provider: 'fcm' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/notifications/device-tokens');
    assert.equal(capturedMethod(), 'POST');
  });

  it('POST /notifications/preferences', async () => {
    await makeClient('tok').updateNotificationPreferences({ emailEnabled: true });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/notifications/preferences');
    assert.equal(capturedMethod(), 'POST');
  });

  it('GET /notifications/in-app', async () => {
    await makeClient('tok').getInAppNotifications();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/notifications/in-app');
    assert.equal(capturedMethod(), 'GET');
  });
});

// ===========================================================================
// Analytics — Public ingestion
// ===========================================================================

describe('Analytics — Ingestion (public endpoints)', () => {
  beforeEach(() => mockFetch({ queued: true }));

  it('POST /analytics/events — no auth required', async () => {
    await makeClient().recordAnalyticsEvent({ eventType: 'event.viewed', clientEventId: 'cid-1' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/analytics/events');
    assert.equal(capturedMethod(), 'POST');
    assert.equal(capturedHeaders()['Authorization'], undefined);
  });

  it('POST /analytics/events/batch — no auth required', async () => {
    await makeClient().recordAnalyticsBatch({ events: [] });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/analytics/events/batch');
    assert.equal(capturedMethod(), 'POST');
  });
});

// ===========================================================================
// Analytics — Reporting
// ===========================================================================

describe('Analytics — Reporting', () => {
  beforeEach(() => mockFetch({}));

  it('GET /analytics/funnel', async () => {
    await makeClient('tok').getFunnelAnalysis({ steps: 'event.viewed' });
    assert.ok(capturedUrl().includes('/analytics/funnel'));
  });

  it('GET /analytics/organizer/:id', async () => {
    await makeClient('tok').getOrganizerAnalytics('org-uuid-444');
    assert.ok(capturedUrl().includes('/analytics/organizer/org-uuid-444'));
  });

  it('GET /analytics/scanner/:eventId', async () => {
    await makeClient('tok').getScannerMetrics('event-uuid-555');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/analytics/scanner/event-uuid-555');
  });

  it('GET /analytics/admin', async () => {
    await makeClient('tok').getAdminPlatformMetrics();
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/analytics/admin');
  });
});

// ===========================================================================
// Scanner
// ===========================================================================

describe('Scanner', () => {
  beforeEach(() => mockFetch({}));

  it('POST /scanner/register', async () => {
    await makeClient('tok').registerScannerDevice({ deviceId: 'dev-xyz' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/scanner/register');
    assert.equal(capturedMethod(), 'POST');
  });

  it('POST /scanner/pair', async () => {
    await makeClient('tok').pairScannerDevice({ deviceId: 'dev-xyz', eventId: 'e1', gateId: 'g1' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/scanner/pair');
    assert.equal(capturedMethod(), 'POST');
  });

  it('GET /scanner/events/:id/package?deviceId=&gateId= — 14.0.2 contract fix', async () => {
    await makeClient('tok').getEventAuthPackage('event-uuid-555', 'dev-xyz', 'gate-1');
    const url = capturedUrl();
    assert.ok(url.includes('/scanner/events/event-uuid-555/package'), `URL missing expected path: ${url}`);
    assert.ok(url.includes('deviceId=dev-xyz'), `URL missing deviceId: ${url}`);
    assert.ok(url.includes('gateId=gate-1'), `URL missing gateId: ${url}`);
    assert.equal(capturedMethod(), 'GET');
  });

  it('POST /scanner/scan', async () => {
    await makeClient('tok').scanTicket({ qrPayload: 'enc-data', gateId: 'g1', deviceId: 'dev-xyz' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/scanner/scan');
    assert.equal(capturedMethod(), 'POST');
  });

  it('POST /scanner/sync', async () => {
    await makeClient('tok').syncOfflineScans({ deviceId: 'dev-xyz', scans: [] });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/scanner/sync');
    assert.equal(capturedMethod(), 'POST');
  });

  it('GET /scanner/attendees?eventId=&query=', async () => {
    await makeClient('tok').searchAttendees('event-uuid-555', 'John');
    const url = capturedUrl();
    assert.ok(url.includes('/scanner/attendees'));
    assert.ok(url.includes('eventId=event-uuid-555'));
    assert.ok(url.includes('query=John'));
  });

  it('POST /scanner/manual-checkin', async () => {
    await makeClient('tok').manualCheckin({ ticketId: 'tkt-1', eventId: 'e1', gateId: 'g1', deviceId: 'dev-xyz' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/scanner/manual-checkin');
    assert.equal(capturedMethod(), 'POST');
  });
});

// ===========================================================================
// Admin Domain (14.0.4 regression — single route authority)
// ===========================================================================

describe('Admin domain', () => {
  beforeEach(() => mockFetch({}));

  it('GET /admin/users — query params forwarded', async () => {
    await makeClient('tok').getAdminUsers({ status: 'active', search: 'alice', limit: '25' });
    const url = capturedUrl();
    assert.ok(url.includes('/admin/users'));
    assert.ok(url.includes('status=active'));
    assert.ok(url.includes('search=alice'));
    assert.equal(capturedMethod(), 'GET');
  });

  it('POST /admin/users/:id/suspend', async () => {
    await makeClient('tok').suspendAdminUser('user-uuid-999', { reason: 'TOS violation' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/admin/users/user-uuid-999/suspend');
    assert.equal(capturedMethod(), 'POST');
  });

  it('POST /admin/users/:id/restore', async () => {
    await makeClient('tok').restoreAdminUser('user-uuid-999');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/admin/users/user-uuid-999/restore');
    assert.equal(capturedMethod(), 'POST');
  });

  it('GET /admin/events/review-queue', async () => {
    await makeClient('tok').getAdminEventReviewQueue(10);
    assert.ok(capturedUrl().includes('/admin/events/review-queue'));
    assert.equal(capturedMethod(), 'GET');
  });

  it('POST /admin/events/:id/review', async () => {
    await makeClient('tok').reviewAdminEvent('event-uuid-555', { action: 'approve' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/admin/events/event-uuid-555/review');
    assert.equal(capturedMethod(), 'POST');
  });

  it('GET /admin/orders/:id', async () => {
    await makeClient('tok').inspectAdminOrder('ord-uuid-222');
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/admin/orders/ord-uuid-222');
    assert.equal(capturedMethod(), 'GET');
  });

  it('POST /admin/orders/:id/refund', async () => {
    await makeClient('tok').refundAdminOrder('ord-uuid-222', { reason: 'Customer request' });
    assert.equal(capturedUrl(), 'http://localhost:3001/api/v1/admin/orders/ord-uuid-222/refund');
    assert.equal(capturedMethod(), 'POST');
  });

  it('GET /admin/audit-logs', async () => {
    await makeClient('tok').getAdminAuditLogs({ action: 'user.suspend', limit: '50' });
    assert.ok(capturedUrl().includes('/admin/audit-logs'));
    assert.equal(capturedMethod(), 'GET');
  });
});
