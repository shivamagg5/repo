import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  UpdateProfileSchema,
  type UpdateProfileInput,
} from './dto/update-profile.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthContext } from '@platform/types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users/me
   * Returns the authenticated user's profile.
   */
  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@CurrentUser() user: AuthContext) {
    return this.usersService.getProfile(user.userId);
  }

  /**
   * PATCH /api/v1/users/me
   * Updates safe profile fields: name, phone, avatarUrl.
   * Zod .strict() rejects any attempt to send blocked fields.
   */
  @Patch('me')
  @UseGuards(AuthGuard)
  updateMe(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(UpdateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.usersService.updateProfile(user.userId, body);
  }
}
