import { z } from 'zod';

export const SendOtpDtoSchema = z.object({
  destination: z.string().min(3).max(100),
  purpose: z.enum(['signup', 'forgot_password', 'phone_change']),
}).strict();

export type SendOtpDto = z.infer<typeof SendOtpDtoSchema>;

export const VerifyOtpDtoSchema = z.object({
  destination: z.string().min(3).max(100),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  purpose: z.enum(['signup', 'forgot_password', 'phone_change']),
}).strict();

export type VerifyOtpDto = z.infer<typeof VerifyOtpDtoSchema>;
