import { CmsService } from './cms.service';
import { BadRequestException } from '@nestjs/common';

describe('CmsService — Relational Collections, Eligibility & XSS Sanitization', () => {
  let cmsService: CmsService;
  let mockDb: any;
  let mockDatabaseService: any;
  let mockAuditService: any;

  beforeEach(() => {
    mockDb = {
      query: {
        cmsBanners: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        cmsFeaturedEvents: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        cmsCollections: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        cmsEditorialBlocks: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        events: {
          findMany: jest.fn(),
        },
      },
      insert: jest.fn().mockImplementation(() => ({
        values: jest.fn().mockImplementation((val) => ({
          returning: jest.fn().mockResolvedValue(
            Array.isArray(val)
              ? val.map((v, i) => ({ id: `id-${i}`, ...v }))
              : [{ id: 'cms-100', ...val }],
          ),
        })),
      })),
    };

    mockDatabaseService = { db: mockDb };
    mockAuditService = { log: jest.fn() };

    cmsService = new CmsService(mockDatabaseService as any, mockAuditService as any);
  });

  it('MARKDOWN SANITIZATION: Strips malicious script tags and javascript: URLs', () => {
    const raw = '## Welcome <script>alert("xss")</script> [Click](javascript:stealCookies())';
    const sanitized = cmsService.sanitizeMarkdown(raw);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).toContain('## Welcome');
  });

  it('PUBLISH VALIDATION: Rejects creating a collection with non-public/cancelled events', async () => {
    mockDb.query.events.findMany.mockResolvedValue([
      { id: 'ev-cancelled-1', title: 'Cancelled Fest', status: 'cancelled' },
    ]);

    await expect(
      cmsService.createCollection(
        {
          title: 'Festival Picks',
          slug: 'festival-picks',
          eventIds: ['ev-cancelled-1'],
        },
        'usr-admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('PUBLIC ELIGIBILITY FILTER: Filters out non-public events from featured list at read time', async () => {
    mockDb.query.cmsFeaturedEvents.findMany.mockResolvedValue([
      {
        id: 'fe-1',
        eventId: 'ev-1',
        status: 'published',
        displayOrder: 1,
        event: { id: 'ev-1', status: 'approved' },
      },
      {
        id: 'fe-2',
        eventId: 'ev-2',
        status: 'published',
        displayOrder: 2,
        event: { id: 'ev-2', status: 'cancelled' }, // Non-public event!
      },
    ]);

    const res = await cmsService.getPublicFeaturedEvents();
    expect(res.length).toBe(1);
    expect(res[0]!.eventId).toBe('ev-1');
  });
});
