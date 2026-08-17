import { MfaGuard } from '../../common/guards/mfa.guard';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { HealthService } from '../health/health.service';
import {
  INDEX_USERS_EMAIL_STATUS,
  INDEX_ORDERS_USER_STATUS,
  INDEX_TICKETS_QR_STATUS,
  INDEX_CHECKINS_EVENT_SCANNED,
  INDEX_ANALYTICS_EVENTS_NAME_OCCURRED,
  INDEX_NOTIFICATION_OUTBOX_STATUS_LOCKED,
} from '../../database/schema/index';
import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';

describe('Phase 13 Security & Scale Hardening Suite', () => {
  let mfaGuard: MfaGuard;
  let rateLimitGuard: RateLimitGuard;
  let reflectorMock: any;

  beforeEach(() => {
    reflectorMock = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    };
    mfaGuard = new MfaGuard(reflectorMock);
    rateLimitGuard = new RateLimitGuard();
  });

  describe('MFA & Server-Authoritative Re-Authentication Guard', () => {
    it('MFA GUARD: Rejects privileged operation when re-authentication window is expired and header is missing', () => {
      const mockContext = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({
            user: { userId: 'usr-admin-1' },
            headers: {},
            sessionAuthTime: Date.now() - 30 * 60 * 1000, // 30 mins ago (Expired > 15m)
          }),
        }),
      } as any;

      expect(() => mfaGuard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('MFA GUARD: Allows privileged operation when valid MFA token header is present', () => {
      const mockContext = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({
            user: { userId: 'usr-admin-1' },
            headers: { 'x-mfa-token': 'mfa-valid-token-123' },
            sessionAuthTime: Date.now() - 30 * 60 * 1000,
          }),
        }),
      } as any;

      const allowed = mfaGuard.canActivate(mockContext);
      expect(allowed).toBe(true);
    });
  });

  describe('Distributed Rate Limiting Policy Matrix', () => {
    it('RATE LIMITER: Throws 429 Too Many Requests when auth endpoint rate limit is exceeded', () => {
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            path: '/api/v1/auth/login',
            ip: '192.168.1.50',
          }),
          getResponse: () => ({
            setHeader: jest.fn(),
          }),
        }),
      } as any;

      // Execute initial allowed requests
      for (let i = 0; i < 5; i++) {
        rateLimitGuard.canActivate(mockContext);
      }

      // 6th request must throw 429
      try {
        rateLimitGuard.canActivate(mockContext);
        fail('Should have thrown 429 rate limit exception');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });
  });

  describe('Health Check Observability', () => {
    it('HEALTH CHECK: Liveness endpoint returns status ok and process uptime', () => {
      const mockDatabaseService = { db: {} } as any;
      const healthService = new HealthService(mockDatabaseService);

      const res = healthService.getLiveness();
      expect(res.status).toBe('ok');
      expect(res.databaseConnected).toBe(true);
      expect(typeof res.uptimeSeconds).toBe('number');
    });

    it('HEALTH CHECK: Readiness endpoint executes database ping', async () => {
      const mockDatabaseService = {
        db: {
          execute: jest.fn().mockResolvedValueOnce([{ ok: 1 }]),
        },
      } as any;

      const healthService = new HealthService(mockDatabaseService);

      const res = await healthService.getReadiness();
      expect(res.status).toBe('ok');
      expect(res.databaseConnected).toBe(true);
    });
  });

  describe('Database Hot-Path Index Declarations', () => {
    it('DATABASE INDEXES: All performance hot-path index constants are declared and exported', () => {
      expect(INDEX_USERS_EMAIL_STATUS).toBe('idx_users_email_status');
      expect(INDEX_ORDERS_USER_STATUS).toBe('idx_orders_user_status');
      expect(INDEX_TICKETS_QR_STATUS).toBe('idx_tickets_qr_status');
      expect(INDEX_CHECKINS_EVENT_SCANNED).toBe('idx_checkins_event_scanned');
      expect(INDEX_ANALYTICS_EVENTS_NAME_OCCURRED).toBe('idx_analytics_events_name_occurred');
      expect(INDEX_NOTIFICATION_OUTBOX_STATUS_LOCKED).toBe('idx_notification_outbox_status_locked');
    });
  });
});
