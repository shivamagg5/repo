import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('VenuesService & DTOs', () => {
  const { createVenueSchema, updateVenueSchema } = require('@platform/validation');

  describe('createVenueSchema', () => {
    it('accepts valid venue input', () => {
      const result = createVenueSchema.safeParse({
        name: 'Grand Arena',
        slug: 'grand-arena',
        description: 'Main event hall',
        address: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'IN',
        capacity: 5000,
      });
      expect(result.success).toBe(true);
    });

    it('rejects slug with uppercase characters', () => {
      const result = createVenueSchema.safeParse({
        name: 'Grand Arena',
        slug: 'Grand-Arena',
      });
      expect(result.success).toBe(false);
    });

    it('SECURITY: rejects status override from client payload', () => {
      const result = createVenueSchema.safeParse({
        name: 'Grand Arena',
        slug: 'grand-arena',
        status: 'active', // BLOCKED by strict schema
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateVenueSchema', () => {
    it('accepts partial update fields', () => {
      const result = updateVenueSchema.safeParse({
        name: 'Grand Arena II',
        capacity: 6000,
      });
      expect(result.success).toBe(true);
    });

    it('SECURITY: rejects status changes via venue update schema', () => {
      const result = updateVenueSchema.safeParse({
        status: 'suspended', // BLOCKED
      });
      expect(result.success).toBe(false);
    });

    it('SECURITY: rejects organizationId changes via venue update schema', () => {
      const result = updateVenueSchema.safeParse({
        organizationId: 'new-org-uuid', // BLOCKED
      });
      expect(result.success).toBe(false);
    });
  });
});
