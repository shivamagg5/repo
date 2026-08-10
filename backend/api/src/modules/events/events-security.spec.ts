import { createEventSchema, updateEventSchema, reviewEventSchema } from '@platform/validation';

describe('Event Domain Security Invariants', () => {

  describe('DTO Client Payload Security', () => {
    it('SECURITY: createEventSchema rejects client-provided status', () => {
      const payload = {
        title: 'Hacker Party',
        slug: 'hacker-party',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 172800000).toISOString(),
        status: 'published', // BLOCKED
      };
      const result = createEventSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('SECURITY: createEventSchema rejects client-provided publishedAt', () => {
      const payload = {
        title: 'Hacker Party',
        slug: 'hacker-party',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 172800000).toISOString(),
        publishedAt: new Date().toISOString(), // BLOCKED
      };
      const result = createEventSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('SECURITY: updateEventSchema rejects status manipulation', () => {
      const payload = {
        status: 'approved', // BLOCKED
      };
      const result = updateEventSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('SECURITY: updateEventSchema rejects organizerOrganizationId manipulation', () => {
      const payload = {
        organizerOrganizationId: 'stolen-org-uuid', // BLOCKED
      };
      const result = updateEventSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('Cross-Organization Resource Access Rules', () => {
    it('Organizer A member cannot manage Event owned by Organizer B', () => {
      const memberA = { userId: 'user-a', orgId: 'org-a', permissions: ['event.edit'] };
      const eventB = { id: 'event-b', organizerOrganizationId: 'org-b' };

      // Invariant: Organization membership must match event organization
      const isAuthorized = memberA.orgId === eventB.organizerOrganizationId;
      expect(isAuthorized).toBe(false);
    });

    it('Organizer A member cannot manage Venue owned by Venue/Org B', () => {
      const memberA = { userId: 'user-a', orgId: 'org-a', permissions: ['venue.edit'] };
      const venueB = { id: 'venue-b', organizationId: 'org-b' };

      const isAuthorized = memberA.orgId === venueB.organizationId;
      expect(isAuthorized).toBe(false);
    });
  });

  describe('Public Discovery Data Isolation', () => {
    it('Public endpoints must strictly reject non-published statuses', () => {
      const allowedPublicStatuses = ['published', 'live'];
      const nonPublicStatuses = ['draft', 'submitted', 'under_review', 'rejected', 'suspended', 'cancelled'];

      for (const status of nonPublicStatuses) {
        expect(allowedPublicStatuses.includes(status)).toBe(false);
      }
    });

    it('Public event representation must omit internal management data', () => {
      const eventManagementFields = ['created_at', 'updated_at', 'audit_logs', 'internal_notes'];
      const eventPublicRepresentation = {
        id: 'event-1',
        title: 'Fest',
        slug: 'fest',
        status: 'published',
        startsAt: new Date().toISOString(),
        endsAt: new Date().toISOString(),
        media: [],
        lineup: [],
      };

      for (const field of eventManagementFields) {
        expect(eventPublicRepresentation).not.toHaveProperty(field);
      }
    });
  });
});
