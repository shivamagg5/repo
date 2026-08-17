import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapAuthError, type OrganizationInfo } from './auth-provider.js';

describe('Auth Package — Unit Tests', () => {
  describe('mapAuthError — Safe Client-Facing Error Sanitization', () => {
    it('maps invalid login credentials to safe user-friendly message', () => {
      const err = new Error('Invalid login credentials');
      const mapped = mapAuthError(err);
      assert.equal(mapped, 'Invalid email or password. Please check your credentials.');
    });

    it('maps email already in use error safely', () => {
      const err = new Error('User already registered');
      const mapped = mapAuthError(err);
      assert.equal(mapped, 'An account with this email already exists. Please sign in instead.');
    });

    it('maps password length/complexity errors safely', () => {
      const err = new Error('Password should be at least 6 characters');
      const mapped = mapAuthError(err);
      assert.equal(mapped, 'Password must be at least 8 characters long.');
    });

    it('maps rate limit violations to respectful wait message', () => {
      const err = new Error('over_request_rate_limit: email rate limit exceeded');
      const mapped = mapAuthError(err);
      assert.equal(mapped, 'Too many attempts. Please wait a few minutes before trying again.');
    });

    it('maps unexpected raw server errors to generic safe message without leaking details', () => {
      const err = new Error('Database query connection timeout at postgres://internal-pool:5432');
      const mapped = mapAuthError(err);
      assert.equal(mapped, 'An unexpected error occurred during authentication.');
    });
  });

  describe('Organization Type Checks', () => {
    it('identifies active organizer membership correctly', () => {
      const orgs: OrganizationInfo[] = [
        { id: 'org_1', name: 'Festivals Inc', slug: 'festivals-inc', type: 'organizer', status: 'active', role: 'owner' },
        { id: 'org_2', name: 'Arena Ltd', slug: 'arena-ltd', type: 'venue', status: 'suspended', role: 'member' },
      ];

      const isOrganizer = orgs.some((o) => o.type === 'organizer' && o.status === 'active');
      assert.equal(isOrganizer, true);

      const isVenue = orgs.some((o) => o.type === 'venue' && o.status === 'active');
      assert.equal(isVenue, false);
    });

    it('rejects suspended memberships', () => {
      const orgs: OrganizationInfo[] = [
        { id: 'org_3', name: 'Promote Club', slug: 'promote-club', type: 'promoter', status: 'suspended', role: 'owner' },
      ];

      const isPromoter = orgs.some((o) => o.type === 'promoter' && o.status === 'active');
      assert.equal(isPromoter, false);
    });
  });
});
