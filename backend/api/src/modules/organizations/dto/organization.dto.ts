import { z } from 'zod';

export const CreateOrganizationSchema = z
  .object({
    name: z.string().min(1).max(200),
    slug: z
      .string()
      .min(2)
      .max(100)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug must be lowercase alphanumeric with optional hyphens (e.g. my-org)',
      ),
    type: z.enum(['organizer', 'venue', 'promoter']),
    description: z.string().max(2000).optional(),
    logoUrl: z.string().url().max(2048).optional(),
  })
  .strict();

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    logoUrl: z.string().url().max(2048).optional().nullable(),
    // BLOCKED: slug, type, status, id
  })
  .strict();

export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

export const InviteMemberSchema = z
  .object({
    email: z.string().email(),
    roleId: z.string().uuid('Role ID must be a valid UUID'),
  })
  .strict();

export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;

export const AcceptInvitationSchema = z
  .object({
    token: z.string().uuid('Token must be a valid UUID'),
  })
  .strict();

export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;

export const ChangeRoleSchema = z
  .object({
    roleId: z.string().uuid('Role ID must be a valid UUID'),
  })
  .strict();

export type ChangeRoleInput = z.infer<typeof ChangeRoleSchema>;
