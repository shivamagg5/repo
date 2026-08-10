// @platform/validation — Unit tests
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  emailSchema,
  slugSchema,
  createUserSchema,
  createOrganizationSchema,
  paginationSchema,
  uuidSchema,
} from './index.js';

describe('@platform/validation', () => {
  describe('emailSchema', () => {
    it('accepts valid email', () => {
      const result = emailSchema.safeParse('test@example.com');
      assert.ok(result.success);
    });

    it('rejects invalid email', () => {
      const result = emailSchema.safeParse('not-an-email');
      assert.ok(!result.success);
    });

    it('lowercases email', () => {
      const result = emailSchema.safeParse('TEST@EXAMPLE.COM');
      assert.ok(result.success);
      assert.equal(result.data, 'test@example.com');
    });
  });

  describe('slugSchema', () => {
    it('accepts valid slug', () => {
      assert.ok(slugSchema.safeParse('my-event-2024').success);
    });

    it('rejects slug with uppercase', () => {
      assert.ok(!slugSchema.safeParse('My-Event').success);
    });

    it('rejects slug with spaces', () => {
      assert.ok(!slugSchema.safeParse('my event').success);
    });
  });

  describe('uuidSchema', () => {
    it('accepts valid UUID', () => {
      assert.ok(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success);
    });

    it('rejects non-UUID string', () => {
      assert.ok(!uuidSchema.safeParse('not-a-uuid').success);
    });
  });

  describe('createUserSchema', () => {
    it('accepts valid user input', () => {
      const result = createUserSchema.safeParse({ name: 'John Doe', email: 'john@example.com' });
      assert.ok(result.success);
    });

    it('rejects empty name', () => {
      const result = createUserSchema.safeParse({ name: '' });
      assert.ok(!result.success);
    });
  });

  describe('createOrganizationSchema', () => {
    it('accepts valid org input', () => {
      const result = createOrganizationSchema.safeParse({
        type: 'organizer',
        name: 'Acme Events',
        slug: 'acme-events',
      });
      assert.ok(result.success);
    });

    it('rejects invalid type', () => {
      const result = createOrganizationSchema.safeParse({
        type: 'invalid',
        name: 'Test',
        slug: 'test',
      });
      assert.ok(!result.success);
    });
  });

  describe('paginationSchema', () => {
    it('uses defaults when not provided', () => {
      const result = paginationSchema.safeParse({});
      assert.ok(result.success);
      assert.equal(result.data?.page, 1);
      assert.equal(result.data?.limit, 20);
    });

    it('rejects limit > 100', () => {
      const result = paginationSchema.safeParse({ limit: 101 });
      assert.ok(!result.success);
    });
  });
});
