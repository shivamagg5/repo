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
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthContext } from '@platform/types';

/**
 * AuthController — authentication-related API endpoints.
 *
 * All endpoints require a valid Supabase JWT (AuthGuard).
 * Identity comes from the verified token, not from request bodies.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * GET /api/v1/auth/me
   * Returns the current authenticated user's application profile.
   * Never returns supabase_auth_id or internal fields.
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
   * Creates or updates the application user record from the verified Supabase identity.
   *
   * SECURITY:
   * - supabaseAuthId and email are derived from the verified JWT in req.user.
   * - Only name and avatarUrl are accepted from the request body.
   * - userId, email, role, status, permissions are NEVER read from body.
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
   * Records an audit event for the logout.
   * Actual Supabase token invalidation is handled client-side via supabase.auth.signOut().
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
