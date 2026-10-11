import { ConflictException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SmsOtpService } from './sms-otp.service';

describe('Canonical Authentication & Identity Lifecycle', () => {
  let authService: AuthService;
  let smsOtpService: SmsOtpService;

  // Mock DB and Services
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockQueryUsers = { findFirst: jest.fn() };
  const mockQueryOtps = { findFirst: jest.fn() };

  const mockDb = {
    insert: () => ({
      values: () => ({
        returning: mockInsert,
        onConflictDoUpdate: () => ({
          returning: mockInsert,
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          returning: mockUpdate,
        }),
      }),
    }),
    query: {
      users: mockQueryUsers,
      otpVerifications: mockQueryOtps,
    },
  };

  const mockDbService: any = { db: mockDb };
  const mockRbacService: any = { getUserPermissions: jest.fn().mockResolvedValue([]) };
  const mockAuditService: any = { log: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    smsOtpService = new SmsOtpService(mockDbService);
    authService = new AuthService(mockDbService, mockRbacService, mockAuditService, smsOtpService);
    // Initialize dummy supabase clients
    authService.onModuleInit();
  });

  describe('Phone normalization & identifier parsing', () => {
    it('normalizes 10-digit Indian phone numbers to E.164 (+91)', () => {
      expect(authService.normalizePhone('9876543210')).toBe('+919876543210');
      expect(authService.normalizePhone('+91 98765-43210')).toBe('+919876543210');
      expect(authService.normalizePhone('+1 415 555 2671')).toBe('+14155552671');
    });

    it('correctly classifies email vs phone identifiers', () => {
      const emailRes = authService.parseIdentifier('User@Example.COM');
      expect(emailRes.type).toBe('email');
      expect(emailRes.value).toBe('user@example.com');

      const phoneRes = authService.parseIdentifier('9876543210');
      expect(phoneRes.type).toBe('phone');
      expect(phoneRes.value).toBe('+919876543210');
    });
  });

  describe('Mobile OTP Lifecycle', () => {
    it('rejects sending OTP if cooldown period is active (<60s)', async () => {
      const now = new Date();
      // Recent OTP created 20 seconds ago
      mockQueryOtps.findFirst.mockResolvedValueOnce({
        id: 'otp-1',
        createdAt: new Date(now.getTime() - 20 * 1000),
      });

      await expect(
        smsOtpService.sendOtp('+919876543210', 'phone', 'signup')
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects OTP verification if maximum attempts exceeded', async () => {
      const future = new Date(Date.now() + 5 * 60 * 1000);
      mockQueryOtps.findFirst.mockResolvedValueOnce({
        id: 'otp-2',
        otpHash: 'some-hash',
        attempts: 5,
        maxAttempts: 5,
        expiresAt: future,
        verifiedAt: null,
      });

      await expect(
        smsOtpService.verifyOtp('+919876543210', '123456', 'signup')
      ).rejects.toThrow('Maximum verification attempts exceeded');
    });

    it('rejects OTP verification if OTP code is incorrect', async () => {
      const future = new Date(Date.now() + 5 * 60 * 1000);
      const correctHash = smsOtpService.hashSecret('999999');
      mockQueryOtps.findFirst.mockResolvedValueOnce({
        id: 'otp-3',
        otpHash: correctHash,
        attempts: 1,
        maxAttempts: 5,
        expiresAt: future,
        verifiedAt: null,
      });

      await expect(
        smsOtpService.verifyOtp('+919876543210', '000000', 'signup')
      ).rejects.toThrow('Incorrect verification code');
    });

    it('issues a verification token on correct OTP verification', async () => {
      const future = new Date(Date.now() + 5 * 60 * 1000);
      const correctHash = smsOtpService.hashSecret('123456');
      mockQueryOtps.findFirst.mockResolvedValueOnce({
        id: 'otp-4',
        otpHash: correctHash,
        attempts: 0,
        maxAttempts: 5,
        expiresAt: future,
        verifiedAt: null,
      });

      const res = await smsOtpService.verifyOtp('+919876543210', '123456', 'signup');
      expect(res.success).toBe(true);
      expect(typeof res.verificationToken).toBe('string');
      expect(res.verificationToken.length).toBe(64); // 32 bytes hex
    });
  });

  describe('Signup Flow', () => {
    it('rejects signup if phone is already registered', async () => {
      // Mock valid token consumption
      jest.spyOn(smsOtpService, 'consumeVerificationToken').mockResolvedValueOnce(true);
      mockQueryUsers.findFirst
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'existing-id' }); // phone check

      await expect(
        authService.signup({
          phone: '+919876543210',
          phoneVerificationToken: 'mock-valid-token-32-chars-long-1234',
          email: 'newuser@example.com',
          password: 'Password123!',
          name: 'Aarav Patel',
          dob: '1995-05-15',
          whatsappConsent: true,
          termsAccepted: true,
          termsVersion: '1.0',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('creates account and marks phone_verified = true and email_verified = false', async () => {
      jest.spyOn(smsOtpService, 'consumeVerificationToken').mockResolvedValueOnce(true);
      mockQueryUsers.findFirst
        .mockResolvedValueOnce(null) // email not taken
        .mockResolvedValueOnce(null); // phone not taken

      const now = new Date();
      const mockCreated = {
        id: 'new-user-uuid',
        supabaseAuthId: 'supa-uuid',
        email: 'aarav@example.com',
        phone: '+919876543210',
        name: 'Aarav Patel',
        dob: '1995-05-15',
        phoneVerified: true,
        emailVerified: false,
        whatsappConsent: true,
        whatsappConsentUpdatedAt: now,
        termsAcceptedAt: now,
        termsVersion: '1.0',
        status: 'active' as const,
        createdAt: now,
        updatedAt: now,
      };
      mockInsert.mockResolvedValueOnce([mockCreated]);

      const result = await authService.signup({
        phone: '+919876543210',
        phoneVerificationToken: 'mock-valid-token-32-chars-long-1234',
        email: 'aarav@example.com',
        password: 'Password123!',
        name: 'Aarav Patel',
        dob: '1995-05-15',
        whatsappConsent: true,
        termsAccepted: true,
        termsVersion: '1.0',
      });

      expect(result.user.phoneVerified).toBe(true);
      expect(result.user.emailVerified).toBe(false);
      expect(result.user.name).toBe('Aarav Patel');
      expect(result.user.dob).toBe('1995-05-15');
      expect(result.user.whatsappConsent).toBe(true);
    });
  });

  describe('Unified Sign-in & Security', () => {
    it('rejects suspended users with clear error message', async () => {
      mockQueryUsers.findFirst.mockResolvedValueOnce({
        id: 'suspended-user',
        status: 'suspended',
        email: 'suspended@example.com',
        phone: '+919876543210',
      });

      await expect(
        authService.login({
          identifier: '+919876543210',
          password: 'Password123!',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('forgot-password returns safe generic response when user does not exist', async () => {
      mockQueryUsers.findFirst.mockResolvedValueOnce(null);

      const res = await authService.requestForgotPasswordOtp('unknown@example.com');
      expect(res.success).toBe(true);
      expect(res.message).toContain('If an account matches');
    });
  });
});
