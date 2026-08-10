import { z } from 'zod';

/**
 * PATCH /api/v1/users/me — allowed update fields.
 *
 * Uses Zod .strict() to reject any extra fields the client may attempt to send.
 * BLOCKED: supabaseAuthId, email, status, role, permissions, organizationId
 */
export const UpdateProfileSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g. +919876543210)')
      .optional()
      .nullable(),
    avatarUrl: z.string().url('Must be a valid URL').max(2048).optional().nullable(),
  })
  .strict(); // Rejects extra keys like status, role, email, supabaseAuthId

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
