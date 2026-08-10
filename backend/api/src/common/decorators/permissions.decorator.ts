import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to declare required permissions for a route handler.
 *
 * Usage:
 *   @RequirePermissions('event.publish', 'event.edit')
 *   async publishEvent() { ... }
 *
 * Permission format: 'domain.action'
 * See docs/05_ROLE_PERMISSION_MATRIX.md for the full permission list.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Marks a route as public (no authentication required).
 * Used by the auth middleware to skip JWT verification.
 */
export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
