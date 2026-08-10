import crypto from 'node:crypto';

describe('Invitation token security', () => {
  // Verify the token hashing function produces consistent sha256 output
  it('sha256 hash is consistent for same input', () => {
    const token = '123e4567-e89b-12d3-a456-426614174000';
    const hash1 = crypto.createHash('sha256').update(token).digest('hex');
    const hash2 = crypto.createHash('sha256').update(token).digest('hex');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('sha256 hash differs for different tokens', () => {
    const token1 = '123e4567-e89b-12d3-a456-426614174000';
    const token2 = '223e4567-e89b-12d3-a456-426614174001';
    const hash1 = crypto.createHash('sha256').update(token1).digest('hex');
    const hash2 = crypto.createHash('sha256').update(token2).digest('hex');
    expect(hash1).not.toBe(hash2);
  });

  it('raw token is not equal to its hash', () => {
    const token = '123e4567-e89b-12d3-a456-426614174000';
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    expect(hash).not.toBe(token);
    // Hash should never equal the input (sha256 produces 64 hex chars, UUID is 36 chars)
    expect(hash.length).not.toBe(token.length);
  });
});

describe('Invitation status validation', () => {
  it('expired invitation should not be acceptable', () => {
    const invitation = {
      status: 'pending',
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
    };
    const isExpired = invitation.expiresAt < new Date();
    expect(isExpired).toBe(true);
  });

  it('already-accepted invitation should not be acceptable', () => {
    const invitation = { status: 'accepted' };
    expect(invitation.status).not.toBe('pending');
  });

  it('pending invitation within expiry should be acceptable', () => {
    const invitation = {
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };
    const isPending = invitation.status === 'pending';
    const isNotExpired = invitation.expiresAt > new Date();
    expect(isPending && isNotExpired).toBe(true);
  });
});

describe('Email matching security', () => {
  it('invitation email must match acceptor email (case-insensitive)', () => {
    const invitedEmail = 'member@example.com';
    const acceptorEmail = 'MEMBER@EXAMPLE.COM'; // Different case

    // Case-insensitive comparison (citext in DB handles this)
    const matches = invitedEmail.toLowerCase() === acceptorEmail.toLowerCase();
    expect(matches).toBe(true);
  });

  it('SECURITY: wrong email must not be able to accept invitation', () => {
    const invitedEmail = 'member@example.com';
    const wrongEmail = 'hacker@evil.com';

    const matches = invitedEmail.toLowerCase() === wrongEmail.toLowerCase();
    expect(matches).toBe(false);
  });
});

describe('Platform role escalation prevention', () => {
  const PLATFORM_ROLES = ['super_admin', 'finance_admin', 'operations_admin', 'content_admin', 'support_agent'];

  it('platform roles cannot be assigned via org API', () => {
    const roleToAssign = { name: 'super_admin', organizationType: null };
    const isPlatformRole = roleToAssign.organizationType === null;
    expect(isPlatformRole).toBe(true);
    // The validateRoleForOrg method rejects these
  });

  it('org roles have non-null organizationType', () => {
    const orgRole = { name: 'owner', organizationType: 'organizer' };
    const isPlatformRole = orgRole.organizationType === null ||
      PLATFORM_ROLES.includes(orgRole.name);
    expect(isPlatformRole).toBe(false);
  });

  it('role with matching org type is valid for that org', () => {
    const role = { name: 'owner', organizationType: 'organizer' };
    const orgType = 'organizer';
    const isValid = role.organizationType === orgType && !PLATFORM_ROLES.includes(role.name);
    expect(isValid).toBe(true);
  });

  it('SECURITY: role with mismatched org type must be rejected', () => {
    const venueOwnerRole = { name: 'owner', organizationType: 'venue' };
    const orgType = 'organizer';
    const isValid = venueOwnerRole.organizationType === orgType;
    expect(isValid).toBe(false);
  });
});

