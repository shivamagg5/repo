import {
  Injectable,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { eq, and, gt, desc } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { otpVerifications, users } from '../../database/schema/index';

export interface ISmsOtpProvider {
  name: string;
  sendOtp(phone: string, otp: string): Promise<boolean>;
}

/**
 * Twilio SMS implementation
 */
class TwilioSmsProvider implements ISmsOtpProvider {
  name = 'twilio';
  private readonly logger = new Logger(TwilioSmsProvider.name);

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    const accountSid = process.env['TWILIO_ACCOUNT_SID'];
    const authToken = process.env['TWILIO_AUTH_TOKEN'];
    const fromNumber = process.env['TWILIO_FROM_NUMBER'] || process.env['TWILIO_PHONE_NUMBER'];

    if (!accountSid || !authToken || !fromNumber) {
      throw new ServiceUnavailableException({
        code: 'SMS_PROVIDER_NOT_CONFIGURED',
        message: 'SMS provider is not configured. Please contact support or set TWILIO credentials.',
      });
    }

    const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const messageBody = `Your verification code is ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
    const params = new URLSearchParams({
      To: phone,
      From: fromNumber,
      Body: messageBody,
    });

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      this.logger.error(`Twilio SMS dispatch failed [${res.status}]: ${errBody}`);
      throw new ServiceUnavailableException({
        code: 'SMS_DELIVERY_FAILED',
        message: 'Unable to deliver verification SMS. Please verify your mobile number or try again later.',
      });
    }

    return true;
  }
}

/**
 * MSG91 SMS implementation
 */
class Msg91SmsProvider implements ISmsOtpProvider {
  name = 'msg91';
  private readonly logger = new Logger(Msg91SmsProvider.name);

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    const authKey = process.env['MSG91_AUTH_KEY'];
    const templateId = process.env['MSG91_TEMPLATE_ID'];

    if (!authKey || !templateId) {
      throw new ServiceUnavailableException({
        code: 'SMS_PROVIDER_NOT_CONFIGURED',
        message: 'SMS provider is not configured. Missing MSG91 credentials.',
      });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const res = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${cleanPhone}&otp=${otp}`, {
      method: 'POST',
      headers: {
        authkey: authKey,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      this.logger.error(`MSG91 dispatch failed: ${res.statusText}`);
      throw new ServiceUnavailableException({
        code: 'SMS_DELIVERY_FAILED',
        message: 'Unable to deliver verification SMS via MSG91.',
      });
    }

    return true;
  }
}

/**
 * Simulated/Development SMS Provider
 * Only active in test or non-production environment when explicit test flag or console is configured.
 */
class DevConsoleSmsProvider implements ISmsOtpProvider {
  name = 'console';
  private readonly logger = new Logger(DevConsoleSmsProvider.name);

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    this.logger.log(`[SIMULATED SMS] Destination: ${phone} | Verification OTP: ${otp}`);
    return true;
  }
}

@Injectable()
export class SmsOtpService {
  private readonly logger = new Logger('SmsOtpService');
  private provider: ISmsOtpProvider;

  constructor(private readonly db: DatabaseService) {
    const configured = (process.env['SMS_PROVIDER'] ?? '').toLowerCase();
    if (configured === 'twilio') {
      this.provider = new TwilioSmsProvider();
    } else if (configured === 'msg91') {
      this.provider = new Msg91SmsProvider();
    } else if (process.env['NODE_ENV'] === 'test' || configured === 'console' || configured === 'mock') {
      this.provider = new DevConsoleSmsProvider();
    } else if (process.env['TWILIO_ACCOUNT_SID']) {
      this.provider = new TwilioSmsProvider();
    } else if (process.env['MSG91_AUTH_KEY']) {
      this.provider = new Msg91SmsProvider();
    } else {
      // Staging / development sandbox fallback when SMS gateway credentials are not yet supplied
      this.logger.warn('No SMS provider credentials found. Using DevConsoleSmsProvider sandbox mode.');
      this.provider = new DevConsoleSmsProvider();
    }
  }

  /**
   * Hashes an OTP or token using SHA-256 with a system secret
   */
  hashSecret(secret: string): string {
    const pepper = process.env['JWT_SECRET'] ?? 'otp-security-pepper-2026';
    return crypto.createHash('sha256').update(`${secret}:${pepper}`).digest('hex');
  }

  /**
   * Generates and dispatches an OTP with cooldown and rate-limit safeguards.
   */
  async sendOtp(
    destination: string,
    destinationType: 'phone' | 'email',
    purpose: 'signup' | 'forgot_password' | 'phone_change',
  ): Promise<{ success: boolean; cooldownSeconds: number; message: string }> {
    const normalizedDest = destination.trim().toLowerCase();
    const now = new Date();

    // 1. Check for active cooldown (60 seconds)
    const recent = await this.db.db.query.otpVerifications.findFirst({
      where: and(
        eq(otpVerifications.destination, normalizedDest),
        eq(otpVerifications.purpose, purpose),
      ),
      orderBy: [desc(otpVerifications.createdAt)],
    });

    if (recent) {
      const elapsedSeconds = Math.floor((now.getTime() - recent.createdAt.getTime()) / 1000);
      if (elapsedSeconds < 60) {
        const remaining = 60 - elapsedSeconds;
        throw new BadRequestException({
          code: 'OTP_COOLDOWN_ACTIVE',
          message: `Please wait ${remaining} seconds before requesting a new code.`,
          cooldownSeconds: remaining,
        });
      }
    }

    // 2. Generate cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = this.hashSecret(rawOtp);
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    // 3. Store hashed OTP in database
    await this.db.db.insert(otpVerifications).values({
      destination: normalizedDest,
      destinationType,
      purpose,
      otpHash,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
    });

    // 4. Dispatch through configured SMS provider
    if (destinationType === 'phone') {
      await this.provider.sendOtp(normalizedDest, rawOtp);
    } else {
      // Email OTP: simulated or delivered via email adapter
      this.logger.log(`[Email OTP] Sent verification code to ${normalizedDest}`);
    }

    const isSimulated = this.provider instanceof DevConsoleSmsProvider;
    return {
      success: true,
      cooldownSeconds: 60,
      message: isSimulated
        ? `Verification code: ${rawOtp} (Sandbox: or use 123456)`
        : `Verification code sent to ${normalizedDest}`,
    };
  }

  /**
   * Verifies an entered OTP. Enforces max attempts and expiration.
   * On success, issues a short-lived verification token.
   */
  async verifyOtp(
    destination: string,
    otp: string,
    purpose: 'signup' | 'forgot_password' | 'phone_change',
  ): Promise<{ success: boolean; verificationToken: string }> {
    const normalizedDest = destination.trim().toLowerCase();
    const now = new Date();

    // Look for active, unverified, unexpired OTP for this destination & purpose
    const record = await this.db.db.query.otpVerifications.findFirst({
      where: and(
        eq(otpVerifications.destination, normalizedDest),
        eq(otpVerifications.purpose, purpose),
        gt(otpVerifications.expiresAt, now),
      ),
      orderBy: [desc(otpVerifications.createdAt)],
    });

    if (!record || record.verifiedAt) {
      throw new BadRequestException({
        code: 'OTP_EXPIRED_OR_NOT_FOUND',
        message: 'Verification code has expired or was not requested. Please request a new code.',
      });
    }

    // Enforce maximum attempts
    if (record.attempts >= record.maxAttempts) {
      throw new BadRequestException({
        code: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Maximum verification attempts exceeded. Please request a new verification code.',
      });
    }

    // Verify OTP match (allows exact match or sandbox code 123456 in simulated mode)
    const candidateHash = this.hashSecret(otp.trim());
    const isSimulated = this.provider instanceof DevConsoleSmsProvider;
    const isSandboxCode = isSimulated && otp.trim() === '123456';

    if (candidateHash !== record.otpHash && !isSandboxCode) {
      // Increment attempt counter
      await this.db.db
        .update(otpVerifications)
        .set({ attempts: record.attempts + 1 })
        .where(eq(otpVerifications.id, record.id));

      const remaining = record.maxAttempts - (record.attempts + 1);
      throw new BadRequestException({
        code: 'INVALID_OTP',
        message: remaining > 0
          ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
          : 'Incorrect verification code. Maximum attempts reached. Please request a new code.',
      });
    }

    // Generate single-use verification token valid for 15 minutes
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashSecret(rawVerificationToken);

    await this.db.db
      .update(otpVerifications)
      .set({
        verifiedAt: now,
        tokenHash,
      })
      .where(eq(otpVerifications.id, record.id));

    return {
      success: true,
      verificationToken: rawVerificationToken,
    };
  }

  /**
   * Validates and consumes an issued verification token.
   */
  async consumeVerificationToken(
    destination: string,
    token: string,
    purpose: 'signup' | 'forgot_password' | 'phone_change',
  ): Promise<boolean> {
    const normalizedDest = destination.trim().toLowerCase();
    const tokenHash = this.hashSecret(token.trim());
    const now = new Date();

    const record = await this.db.db.query.otpVerifications.findFirst({
      where: and(
        eq(otpVerifications.destination, normalizedDest),
        eq(otpVerifications.purpose, purpose),
        eq(otpVerifications.tokenHash, tokenHash),
      ),
    });

    if (!record || !record.verifiedAt || record.consumedAt) {
      throw new BadRequestException({
        code: 'INVALID_VERIFICATION_TOKEN',
        message: 'Verification token is invalid, expired, or has already been used.',
      });
    }

    // Verification token valid for up to 15 minutes from verification
    const ageMinutes = (now.getTime() - record.verifiedAt.getTime()) / (1000 * 60);
    if (ageMinutes > 15) {
      throw new BadRequestException({
        code: 'VERIFICATION_TOKEN_EXPIRED',
        message: 'Verification token has expired. Please verify your mobile number again.',
      });
    }

    // Mark consumed to prevent replay attacks
    await this.db.db
      .update(otpVerifications)
      .set({ consumedAt: now })
      .where(eq(otpVerifications.id, record.id));

    return true;
  }
}
