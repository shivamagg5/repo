import { z } from 'zod';

// ---------------------------------------------------------------------------
// DTO security tests â€” verify Zod strict() rejects blocked fields
// ---------------------------------------------------------------------------

describe('UpdateProfileSchema security', () => {
  const { UpdateProfileSchema } = require('./dto/update-profile.dto');

  it('accepts valid profile fields', () => {
    const result = UpdateProfileSchema.safeParse({
      name: 'Alice',
      phone: '+919876543210',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('SECURITY: rejects status field (must not be updatable by user)', () => {
    const result = UpdateProfileSchema.safeParse({
      name: 'Alice',
      status: 'active',  // BLOCKED
    });
    expect(result.success).toBe(false);
  });

  it('SECURITY: rejects supabaseAuthId field', () => {
    const result = UpdateProfileSchema.safeParse({
      supabaseAuthId: 'injected-uuid',  // BLOCKED
    });
    expect(result.success).toBe(false);
  });

  it('SECURITY: rejects role field', () => {
    const result = UpdateProfileSchema.safeParse({
      name: 'Alice',
      role: 'super_admin',  // BLOCKED
    });
    expect(result.success).toBe(false);
  });

  it('SECURITY: rejects permissions field', () => {
    const result = UpdateProfileSchema.safeParse({
      permissions: ['admin.users.manage'],  // BLOCKED
    });
    expect(result.success).toBe(false);
  });

  it('SECURITY: rejects email field (email changes go via Supabase Auth)', () => {
    const result = UpdateProfileSchema.safeParse({
      email: 'hacker@evil.com',  // BLOCKED
    });
    expect(result.success).toBe(false);
  });

  it('SECURITY: rejects organizationId field', () => {
    const result = UpdateProfileSchema.safeParse({
      organizationId: 'some-org-uuid',  // BLOCKED
    });
    expect(result.success).toBe(false);
  });

  it('validates phone must be E.164 format', () => {
    const valid = UpdateProfileSchema.safeParse({ phone: '+919876543210' });
    expect(valid.success).toBe(true);

    const invalid = UpdateProfileSchema.safeParse({ phone: '09876543210' });
    expect(invalid.success).toBe(false);

    const invalid2 = UpdateProfileSchema.safeParse({ phone: 'not-a-phone' });
    expect(invalid2.success).toBe(false);
  });

  it('validates avatarUrl must be a valid URL', () => {
    const valid = UpdateProfileSchema.safeParse({
      avatarUrl: 'https://cdn.example.com/avatar.jpg',
    });
    expect(valid.success).toBe(true);

    const invalid = UpdateProfileSchema.safeParse({
      avatarUrl: 'not-a-url',
    });
    expect(invalid.success).toBe(false);
  });

  it('accepts null for phone and avatarUrl (clearing fields)', () => {
    const result = UpdateProfileSchema.safeParse({
      phone: null,
      avatarUrl: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('UpdateProfileSchema â€” name validation', () => {
  const { UpdateProfileSchema } = require('./dto/update-profile.dto');

  it('accepts name between 1-100 chars', () => {
    expect(UpdateProfileSchema.safeParse({ name: 'A' }).success).toBe(true);
    expect(UpdateProfileSchema.safeParse({ name: 'A'.repeat(100) }).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(UpdateProfileSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('rejects name over 100 chars', () => {
    expect(UpdateProfileSchema.safeParse({ name: 'A'.repeat(101) }).success).toBe(false);
  });
});

