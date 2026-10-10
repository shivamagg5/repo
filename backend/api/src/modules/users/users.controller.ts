import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
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

  /**
   * GET /api/v1/users/me/favorites
   * Returns authenticated user's saved/bookmarked events.
   */
  @Get('me/favorites')
  @UseGuards(AuthGuard)
  getFavorites(@CurrentUser() user: AuthContext) {
    return this.usersService.getFavorites(user.userId);
  }

  /**
   * POST /api/v1/users/me/favorites/:eventId
   * Adds an event to user's saved favorites.
   */
  @Post('me/favorites/:eventId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  addFavorite(
    @CurrentUser() user: AuthContext,
    @Param('eventId') eventId: string,
  ) {
    return this.usersService.addFavorite(user.userId, eventId);
  }

  /**
   * DELETE /api/v1/users/me/favorites/:eventId
   * Removes an event from user's saved favorites.
   */
  @Delete('me/favorites/:eventId')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  removeFavorite(
    @CurrentUser() user: AuthContext,
    @Param('eventId') eventId: string,
  ) {
    return this.usersService.removeFavorite(user.userId, eventId);
  }
}

