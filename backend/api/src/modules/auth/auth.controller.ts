import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SyncUserBodySchema, type SyncUserBody } from './dto/sync-user.dto';
import {
  SendOtpDtoSchema,
  VerifyOtpDtoSchema,
  type SendOtpDto,
  type VerifyOtpDto,
} from './dto/otp.dto';
import { SignupDtoSchema, type SignupDto } from './dto/signup.dto';
import { LoginDtoSchema, type LoginDto } from './dto/login.dto';
import {
  ForgotPasswordRequestDtoSchema,
  ForgotPasswordVerifyDtoSchema,
  ForgotPasswordResetDtoSchema,
  type ForgotPasswordRequestDto,
  type ForgotPasswordVerifyDto,
  type ForgotPasswordResetDto,
} from './dto/forgot-password.dto';
import {
  ChangePhoneRequestDtoSchema,
  ChangePhoneVerifyDtoSchema,
  ChangePasswordDtoSchema,
  ResendConfirmationEmailDtoSchema,
  type ChangePhoneRequestDto,
  type ChangePhoneVerifyDto,
  type ChangePasswordDto,
  type ResendConfirmationEmailDto,
} from './dto/credentials.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthContext } from '@platform/types';

/**
 * AuthController — canonical authentication, signup, login, OTP, and identity lifecycle.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/otp/send
   * Dispatches a 6-digit OTP to mobile or email destination.
   */
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(
    @Body(new ZodValidationPipe(SendOtpDtoSchema)) body: SendOtpDto,
  ) {
    return this.authService.sendOtp(body.destination, body.purpose);
  }

  /**
   * POST /api/v1/auth/otp/verify
   * Verifies a 6-digit OTP and returns an authorization/verification token.
   */
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body(new ZodValidationPipe(VerifyOtpDtoSchema)) body: VerifyOtpDto,
  ) {
    return this.authService.verifyOtp(body.destination, body.otp, body.purpose);
  }

  /**
   * POST /api/v1/auth/signup
   * Completes account registration using verified mobile OTP + customer details.
   */
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body(new ZodValidationPipe(SignupDtoSchema)) body: SignupDto,
  ) {
    return this.authService.signup(body);
  }

  /**
   * POST /api/v1/auth/login
   * Unified sign-in accepting Email OR Mobile number + Password.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginDtoSchema)) body: LoginDto,
  ) {
    return this.authService.login(body);
  }

  /**
   * POST /api/v1/auth/forgot-password/request
   * Identifies account and sends password recovery OTP.
   */
  @Post('forgot-password/request')
  @HttpCode(HttpStatus.OK)
  async forgotPasswordRequest(
    @Body(new ZodValidationPipe(ForgotPasswordRequestDtoSchema)) body: ForgotPasswordRequestDto,
  ) {
    return this.authService.requestForgotPasswordOtp(body.identifier);
  }

  /**
   * POST /api/v1/auth/forgot-password/verify
   * Verifies recovery OTP and returns a single-use password reset token.
   */
  @Post('forgot-password/verify')
  @HttpCode(HttpStatus.OK)
  async forgotPasswordVerify(
    @Body(new ZodValidationPipe(ForgotPasswordVerifyDtoSchema)) body: ForgotPasswordVerifyDto,
  ) {
    return this.authService.verifyForgotPasswordOtp(body.identifier, body.otp);
  }

  /**
   * POST /api/v1/auth/forgot-password/reset
   * Sets new password using valid reset token.
   */
  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  async forgotPasswordReset(
    @Body(new ZodValidationPipe(ForgotPasswordResetDtoSchema)) body: ForgotPasswordResetDto,
  ) {
    return this.authService.resetForgotPassword(
      body.identifier,
      body.resetToken,
      body.newPassword,
    );
  }

  /**
   * POST /api/v1/auth/resend-confirmation-email
   * Resends email confirmation message.
   */
  @Post('resend-confirmation-email')
  @HttpCode(HttpStatus.OK)
  async resendConfirmationEmail(
    @Body(new ZodValidationPipe(ResendConfirmationEmailDtoSchema)) body: ResendConfirmationEmailDto,
    @CurrentUser() user?: AuthContext,
  ) {
    const targetEmail = body.email ?? user?.email;
    if (!targetEmail) {
      throw new NotFoundException({
        code: 'EMAIL_REQUIRED',
        message: 'Email address is required to resend confirmation.',
      });
    }
    return this.authService.resendConfirmationEmail(targetEmail);
  }

  /**
   * POST /api/v1/auth/phone/change/request
   * Initiates phone change with OTP to new mobile number.
   */
  @Post('phone/change/request')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePhoneRequest(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(ChangePhoneRequestDtoSchema)) body: ChangePhoneRequestDto,
  ) {
    return this.authService.requestPhoneChangeOtp(user.userId, body.newPhone);
  }

  /**
   * POST /api/v1/auth/phone/change/verify
   * Verifies OTP and commits new phone number.
   */
  @Post('phone/change/verify')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePhoneVerify(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(ChangePhoneVerifyDtoSchema)) body: ChangePhoneVerifyDto,
  ) {
    return this.authService.verifyPhoneChange(user.userId, body.newPhone, body.otp);
  }

  /**
   * POST /api/v1/auth/password/change
   * Changes account password requiring current password verification.
   */
  @Post('password/change')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(ChangePasswordDtoSchema)) body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.userId, body);
  }

  /**
   * GET /api/v1/auth/me
   * Returns current authenticated user's application profile.
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: AuthContext) {
    if (!user.userId) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Application profile not found. Call POST /auth/sync first.',
      });
    }
    const profile = await this.authService.getMe(user.userId);
    if (!profile) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Application profile not found. Call POST /auth/sync first.',
      });
    }
    return profile;
  }

  /**
   * POST /api/v1/auth/sync
   * Upserts application user record from verified Supabase identity.
   */
  @Post('sync')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async syncUser(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(SyncUserBodySchema)) body: SyncUserBody,
  ) {
    return this.authService.syncUser(user.supabaseAuthId, user.email, body);
  }

  /**
   * POST /api/v1/auth/logout
   * Audits user logout event.
   */
  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: AuthContext) {
    if (user.userId) {
      await this.authService.logout(user.userId);
    }
  }
}
