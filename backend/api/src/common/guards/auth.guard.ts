import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthContext } from '@platform/types';

/**
 * AuthGuard — requires the request to be authenticated.
 *
 * Apply this guard to any route that requires a logged-in user.
 * For permission-based authorization, also apply RbacGuard.
 *
 * Usage:
 *   @UseGuards(AuthGuard)
 *   @Get('me')
 *   getMe() { ... }
 *
 * Routes marked with @Public() are skipped entirely.
 * Routes NOT marked with @Public() but WITHOUT @UseGuards(AuthGuard)
 * are not protected by this guard.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip if explicitly marked public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthContext }>();

    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }

    return true;
  }
}
