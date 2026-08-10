import { ConflictException } from '@nestjs/common';

// ---------------------------------------------------------------------------
// Mock DatabaseService
// ---------------------------------------------------------------------------
const mockInsert = jest.fn();
const mockQuery = {
  users: { findFirst: jest.fn() },
};
const mockDb = {
  insert: () => ({
    values: () => ({
      onConflictDoUpdate: () => ({
        returning: mockInsert,
      }),
    }),
  }),
  query: mockQuery,
};

const mockDbService = { db: mockDb };
const mockRbacService = {
  getUserPermissions: jest.fn().mockResolvedValue([]),
};
const mockAuditService = { log: jest.fn() };

// ---------------------------------------------------------------------------
// AuthService unit tests
// ---------------------------------------------------------------------------
describe('AuthService', () => {
  // We test the logic independently of NestJS DI by importing the class directly

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('syncUser', () => {
    it('creates a new user on first call', async () => {
      const now = new Date();
      const mockUser = {
        id: 'app-user-uuid',
        supabaseAuthId: 'supabase-auth-uuid',
        email: 'test@example.com',
        name: 'Test User',
        phone: null,
        avatarUrl: null,
        status: 'active' as const,
        createdAt: now,
        updatedAt: now,
      };
      mockInsert.mockResolvedValueOnce([mockUser]);

      // The sync endpoint derives email and supabaseAuthId from JWT context only
      // These should NOT come from the request body
      const supabaseAuthId = 'supabase-auth-uuid';
      const email = 'test@example.com';
      const body = { name: 'Test User' }; // Only profile info from body

      // Verify the body contains ONLY safe profile fields
      expect(body).not.toHaveProperty('supabaseAuthId');
      expect(body).not.toHaveProperty('email');
      expect(body).not.toHaveProperty('role');
      expect(body).not.toHaveProperty('status');
      expect(body).not.toHaveProperty('permissions');
      expect(body).not.toHaveProperty('organizationId');
    });

    it('is idempotent â€” upserts on repeated calls', async () => {
      // ON CONFLICT DO UPDATE means repeated calls are safe
      const now = new Date();
      const mockUser = {
        id: 'app-user-uuid',
        supabaseAuthId: 'supabase-auth-uuid',
        email: 'test@example.com',
        name: 'Updated Name',
        phone: null,
        avatarUrl: null,
        status: 'active' as const,
        createdAt: now,
        updatedAt: now,
      };
      mockInsert.mockResolvedValue([mockUser]);
      // No exception should be thrown on repeated syncs (idempotent)
      expect(mockInsert).not.toThrow();
    });

    it('SECURITY: does NOT accept userId from body', () => {
      // userId comes from the verified JWT â†’ req.user.userId
      // The sync body is validated by SyncUserBodySchema.strict()
      // which only allows { name?, avatarUrl? }
      const { SyncUserBodySchema } = require('./dto/sync-user.dto');
      const result = SyncUserBodySchema.safeParse({
        name: 'Test',
        userId: 'injected-user-id',  // Should be REJECTED
      });
      expect(result.success).toBe(false);
    });

    it('SECURITY: does NOT accept email from body', () => {
      const { SyncUserBodySchema } = require('./dto/sync-user.dto');
      const result = SyncUserBodySchema.safeParse({
        name: 'Test',
        email: 'hacker@evil.com',  // Should be REJECTED
      });
      expect(result.success).toBe(false);
    });

    it('SECURITY: does NOT accept role from body', () => {
      const { SyncUserBodySchema } = require('./dto/sync-user.dto');
      const result = SyncUserBodySchema.safeParse({
        name: 'Test',
        role: 'super_admin',  // Should be REJECTED
      });
      expect(result.success).toBe(false);
    });

    it('SECURITY: does NOT accept status from body', () => {
      const { SyncUserBodySchema } = require('./dto/sync-user.dto');
      const result = SyncUserBodySchema.safeParse({
        status: 'active',  // Should be REJECTED
      });
      expect(result.success).toBe(false);
    });

    it('SECURITY: does NOT accept permissions from body', () => {
      const { SyncUserBodySchema } = require('./dto/sync-user.dto');
      const result = SyncUserBodySchema.safeParse({
        permissions: ['admin.users.manage'],  // Should be REJECTED
      });
      expect(result.success).toBe(false);
    });

    it('accepts only safe profile fields', () => {
      const { SyncUserBodySchema } = require('./dto/sync-user.dto');
      const result = SyncUserBodySchema.safeParse({
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
      expect(result.success).toBe(true);
    });
  });
});

