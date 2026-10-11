import { z } from 'zod';

export const ChangePhoneRequestDtoSchema = z.object({
  newPhone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone must be valid E.164 format (e.g. +919876543210)'),
}).strict();

export type ChangePhoneRequestDto = z.infer<typeof ChangePhoneRequestDtoSchema>;

export const ChangePhoneVerifyDtoSchema = z.object({
  newPhone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone must be valid E.164 format'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
}).strict();

export type ChangePhoneVerifyDto = z.infer<typeof ChangePhoneVerifyDtoSchema>;

export const ChangeEmailRequestDtoSchema = z.object({
  newEmail: z.string().email().toLowerCase(),
}).strict();

export type ChangeEmailRequestDto = z.infer<typeof ChangeEmailRequestDtoSchema>;

export const ChangePasswordDtoSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(100),
}).strict();

export type ChangePasswordDto = z.infer<typeof ChangePasswordDtoSchema>;

export const ResendConfirmationEmailDtoSchema = z.object({
  email: z.string().email().toLowerCase().optional(),
}).strict();

export type ResendConfirmationEmailDto = z.infer<typeof ResendConfirmationEmailDtoSchema>;
