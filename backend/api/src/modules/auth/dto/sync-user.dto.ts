import { z } from 'zod';

/**
 * POST /api/v1/auth/sync — request body.
 *
 * SECURITY: Only profile information is accepted from the body.
 * supabaseAuthId and email are derived exclusively from the verified JWT
 * in req.user — they are NEVER read from the request body.
 *
 * The .strict() mode rejects any unknown keys.
 */
export const SyncUserBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    avatarUrl: z.string().url().optional(),
  })
  .strict();

export type SyncUserBody = z.infer<typeof SyncUserBodySchema>;
