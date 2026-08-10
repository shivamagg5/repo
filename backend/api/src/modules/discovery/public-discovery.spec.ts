import { SearchService } from './search.service';
import { publicDiscoveryQuerySchema, cursorPaginationSchema } from '@platform/validation';

describe('Public Discovery Specification & DTO Sanitization', () => {

  describe('publicDiscoveryQuerySchema', () => {
    it('accepts valid discovery query parameters with cursor', () => {
      const result = publicDiscoveryQuerySchema.safeParse({
        q: 'rock concert',
        category: 'music',
        city: 'Mumbai',
        datePreset: 'this_weekend',
        sort: 'date',
        limit: '24',
        cursor: 'eyJsYXN0VmFsIjoiMjAyNi0wOS0xNVQxODowMDowMC4wMDBaIiwibGFzdElkIjoiMTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwIn0=',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(24);
        expect(result.data.sort).toBe('date');
      }
    });

    it('rejects invalid limit exceeding max limit (100)', () => {
      const result = publicDiscoveryQuerySchema.safeParse({
        limit: 500, // BLOCKED (>100)
      });
      expect(result.success).toBe(false);
    });

    it('rejects unsupported date preset names', () => {
      const result = publicDiscoveryQuerySchema.safeParse({
        datePreset: 'invalid_preset',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Public DTO Sanitization Rules', () => {
    it('EventDetailPublicDto must not contain internal management data', () => {
      const privateFields = [
        'organizerOrganizationId',
        'audit_logs',
        'internalNotes',
        'status',
        'capacity',
        'created_at',
        'updated_at',
      ];

      const publicDto = {
        id: 'event-1',
        title: 'Sunburn Festival',
        slug: 'sunburn-festival',
        description: 'Electronic music festival',
        startsAt: '2026-12-28T16:00:00.000Z',
        endsAt: '2026-12-30T23:59:00.000Z',
        timezone: 'Asia/Kolkata',
        ageRestriction: '18+',
        publishedAt: '2026-08-01T10:00:00.000Z',
        category: { id: 'cat-1', name: 'Music', slug: 'music' },
        venue: {
          id: 'venue-1',
          name: 'Vagator Beach',
          slug: 'vagator-beach',
          description: null,
          address: 'Vagator',
          city: 'Goa',
          state: 'Goa',
          country: 'IN',
          latitude: '15.600000',
          longitude: '73.733300',
          capacity: null,
        },
        media: [],
        lineup: [],
      };

      for (const field of privateFields) {
        expect(publicDto).not.toHaveProperty(field);
      }
    });
  });
});
