import { z } from 'zod';

export const ForgotPasswordRequestDtoSchema = z.object({
  identifier: z.string().min(3, 'Email or mobile number is required').max(100),
});

export type ForgotPasswordRequestDto = z.infer<typeof ForgotPasswordRequestDtoSchema>;

export const ForgotPasswordVerifyDtoSchema = z.object({
  identifier: z.string().min(3).max(100),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export type ForgotPasswordVerifyDto = z.infer<typeof ForgotPasswordVerifyDtoSchema>;

export const ForgotPasswordResetDtoSchema = z.object({
  identifier: z.string().min(3).max(100),
  resetToken: z.string().min(16, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export type ForgotPasswordResetDto = z.infer<typeof ForgotPasswordResetDtoSchema>;
