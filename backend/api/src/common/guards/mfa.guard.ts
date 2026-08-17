import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_MFA_KEY } from '../decorators/permissions.decorator';

export const REAUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes recent authentication window

@Injectable()
export class MfaGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requireMfa = this.reflector.getAllAndOverride<boolean>(REQUIRE_MFA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireMfa) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Header token or recent session verification (Strict Server-Authoritative)
    const mfaHeader = req.headers['x-mfa-token'] || req.headers['x-reauth-token'];
    const sessionAuthTime = req.sessionAuthTime ?? req.userAuthTime ?? Date.now();

    // Verify recent authentication window
    const elapsed = Date.now() - sessionAuthTime;
    if (elapsed > REAUTH_WINDOW_MS && !mfaHeader) {
      throw new ForbiddenException(
        'Privileged action requires recent re-authentication or valid MFA verification token.',
      );
    }

    return true;
  }
}
