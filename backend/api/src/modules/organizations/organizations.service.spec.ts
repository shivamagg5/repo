
describe('Organization DTOs security', () => {
  const {
    CreateOrganizationSchema,
    UpdateOrganizationSchema,
    InviteMemberSchema,
    AcceptInvitationSchema,
    ChangeRoleSchema,
  } = require('./dto/organization.dto');

  // ---------------------------------------------------------------------------
  // CreateOrganization
  // ---------------------------------------------------------------------------
  describe('CreateOrganizationSchema', () => {
    it('accepts valid input', () => {
      const result = CreateOrganizationSchema.safeParse({
        name: 'My Events Company',
        slug: 'my-events-company',
        type: 'organizer',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid org type', () => {
      const result = CreateOrganizationSchema.safeParse({
        name: 'Test',
        slug: 'test',
        type: 'hacker',
      });
      expect(result.success).toBe(false);
    });

    it('validates slug format â€” no uppercase', () => {
      const result = CreateOrganizationSchema.safeParse({
        name: 'Test',
        slug: 'My-Org',  // uppercase not allowed
        type: 'organizer',
      });
      expect(result.success).toBe(false);
    });

    it('validates slug format â€” no spaces', () => {
      const result = CreateOrganizationSchema.safeParse({
        name: 'Test',
        slug: 'my org',  // space not allowed
        type: 'organizer',
      });
      expect(result.success).toBe(false);
    });

    it('SECURITY: rejects status field (blocked)', () => {
      const result = CreateOrganizationSchema.safeParse({
        name: 'Test',
        slug: 'test',
        type: 'organizer',
        status: 'active',  // BLOCKED
      });
      expect(result.success).toBe(false);
    });

    it('SECURITY: rejects id field (blocked)', () => {
      const result = CreateOrganizationSchema.safeParse({
        name: 'Test',
        slug: 'test',
        type: 'organizer',
        id: 'some-uuid',  // BLOCKED
      });
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // UpdateOrganization â€” must not allow slug/type/status changes
  // ---------------------------------------------------------------------------
  describe('UpdateOrganizationSchema', () => {
    it('accepts safe update fields', () => {
      const result = UpdateOrganizationSchema.safeParse({
        name: 'New Name',
        description: 'Updated',
      });
      expect(result.success).toBe(true);
    });

    it('SECURITY: rejects slug changes (slug is immutable after creation)', () => {
      const result = UpdateOrganizationSchema.safeParse({
        slug: 'new-slug',  // BLOCKED
      });
      expect(result.success).toBe(false);
    });

    it('SECURITY: rejects type changes', () => {
      const result = UpdateOrganizationSchema.safeParse({
        type: 'venue',  // BLOCKED
      });
      expect(result.success).toBe(false);
    });

    it('SECURITY: rejects status changes from client', () => {
      const result = UpdateOrganizationSchema.safeParse({
        status: 'suspended',  // BLOCKED
      });
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // InviteMember â€” role must be a valid UUID (not a name)
  // ---------------------------------------------------------------------------
  describe('InviteMemberSchema', () => {
    it('accepts valid invitation', () => {
      const result = InviteMemberSchema.safeParse({
        email: 'member@example.com',
        roleId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = InviteMemberSchema.safeParse({
        email: 'not-an-email',
        roleId: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(false);
    });

    it('rejects role name strings (must be UUID)', () => {
      const result = InviteMemberSchema.safeParse({
        email: 'test@example.com',
        roleId: 'super_admin',  // Should be UUID, not role name
      });
      expect(result.success).toBe(false);
    });

    it('SECURITY: rejects organizationId in body (derived from URL + invitation only)', () => {
      const result = InviteMemberSchema.safeParse({
        email: 'test@example.com',
        roleId: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: 'injected-org-uuid',  // BLOCKED
      });
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // AcceptInvitation â€” token must be UUID
  // ---------------------------------------------------------------------------
  describe('AcceptInvitationSchema', () => {
    it('accepts valid token UUID', () => {
      const result = AcceptInvitationSchema.safeParse({
        token: '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-UUID token', () => {
      const result = AcceptInvitationSchema.safeParse({
        token: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('SECURITY: rejects organizationId in body (invitation is source of truth)', () => {
      const result = AcceptInvitationSchema.safeParse({
        token: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: 'injected-org-id',  // BLOCKED
      });
      expect(result.success).toBe(false);
    });

    it('SECURITY: rejects roleId in body (role comes from invitation record)', () => {
      const result = AcceptInvitationSchema.safeParse({
        token: '123e4567-e89b-12d3-a456-426614174000',
        roleId: 'injected-role-id',  // BLOCKED
      });
      expect(result.success).toBe(false);
    });
  });
});

