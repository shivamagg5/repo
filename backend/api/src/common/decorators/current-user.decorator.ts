import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthContext } from '@platform/types';

/**
 * @CurrentUser() — extracts the authenticated user context from the request.
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(AuthGuard)
 *   getMe(@CurrentUser() user: AuthContext) { ... }
 *
 * REQUIRES: AuthGuard must be applied first to ensure req.user is populated.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthContext }>();
    return request.user;
  },
);
