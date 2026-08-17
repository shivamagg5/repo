import { AnalyticsService } from './analytics.service';
import { BadRequestException } from '@nestjs/common';

describe('AnalyticsService — Non-Authoritative Ingestion & Taxonomy Suite', () => {
  let analyticsService: AnalyticsService;
  let mockDb: any;
  let mockDatabaseService: any;

  beforeEach(() => {
    mockDb = {
      query: {
        analyticsEvents: {
          findFirst: jest.fn(),
        },
        orders: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'ord-1', totalMinor: 50000, status: 'paid' },
            { id: 'ord-2', totalMinor: 30000, status: 'paid' },
          ]),
        },
        checkins: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'chk-1', isOfflineScan: false },
            { id: 'chk-2', isOfflineScan: true },
          ]),
        },
      },
      insert: jest.fn().mockImplementation(() => ({
        values: jest.fn().mockImplementation((val) => ({
          returning: jest.fn().mockResolvedValue([
            { id: 'evt-100', ...val },
          ]),
        })),
      })),
      select: jest.fn().mockImplementation(() => ({
        from: jest.fn().mockImplementation(() => ({
          where: jest.fn().mockResolvedValue([{ count: 10 }]),
        })),
      })),
    };

    mockDatabaseService = { db: mockDb };
    analyticsService = new AnalyticsService(mockDatabaseService as any);
  });

  it('CANONICAL TAXONOMY: Rejects unknown analytics event name', async () => {
    await expect(
      analyticsService.recordEvent({
        eventName: 'UNKNOWN_FRONTEND_EVENT_NAME_123',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('PROPERTY ALLOWLISTING: Strips sensitive card data and un-allowlisted properties', () => {
    const raw = {
      eventId: 'ev-100',
      categoryId: 'cat-100',
      password: 'SuperSecretPassword123', // Sensitive!
      card_number: '4111111111111111',     // Sensitive!
      unregistered_key: 'random_val',
    };

    const sanitized = analyticsService.sanitizeProperties('event_view', raw);

    expect(sanitized.eventId).toBe('ev-100');
    expect(sanitized.categoryId).toBe('cat-100');
    expect(sanitized.password).toBeUndefined();
    expect(sanitized.card_number).toBeUndefined();
  });

  it('IDENTITY AUTHORITY: Overrides client-supplied userId with authenticated AuthContext userId', async () => {
    mockDb.query.analyticsEvents.findFirst.mockResolvedValueOnce(null);

    const actor = { userId: 'usr-authentic-100', roles: ['consumer'] } as any;

    const res = await analyticsService.recordEvent(
      {
        eventName: 'event_view',
        properties: { eventId: 'ev-100' },
      },
      actor,
    );

    expect(res!.userId).toBe('usr-authentic-100');
  });

  it('CLIENT EVENT IDEMPOTENCY: Deduplicates duplicate submissions with same clientEventId', async () => {
    mockDb.query.analyticsEvents.findFirst.mockResolvedValueOnce({
      id: 'existing-analytics-evt-1',
      clientEventId: 'client-uuid-99',
    });

    const res = await analyticsService.recordEvent({
      clientEventId: 'client-uuid-99',
      eventName: 'event_view',
    });

    expect(res!.id).toBe('existing-analytics-evt-1');
  });

  it('FUNNEL ANALYSIS: Computes step counts and conversion rates across conversion funnel', async () => {
    const res = await analyticsService.getFunnelAnalysis({ eventId: 'ev-100' });

    expect(res).toBeDefined();
    expect(res.steps.length).toBe(6);
    expect(res.steps[0]!.stepName).toBe('Event View');
    expect(res.steps[5]!.stepName).toBe('Check-in');
  });

  it('AUTHORITATIVE METRICS: Derives organizer revenue and attendance from operational tables', async () => {
    const res = await analyticsService.getOrganizerAnalytics('org-100');

    expect(res.totalGrossRevenueMinor).toBe(80000); // 50000 + 30000
    expect(res.totalOrdersCount).toBe(2);
    expect(res.averageOrderValueMinor).toBe(40000);
  });
});
