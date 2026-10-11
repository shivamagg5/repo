import { z } from 'zod';

const normalizePurpose = (val: unknown): 'signup' | 'forgot_password' | 'phone_change' => {
  if (typeof val === 'string') {
    const lower = val.toLowerCase().trim();
    if (lower === 'signup' || lower === 'forgot_password' || lower === 'phone_change') {
      return lower;
    }
  }
  return 'signup';
};

export const SendOtpDtoSchema = z.preprocess((val: any) => {
  if (typeof val === 'object' && val !== null) {
    const dest = val.destination || val.phone;
    return {
      ...val,
      destination: dest,
      purpose: normalizePurpose(val.purpose),
    };
  }
  return val;
}, z.object({
  destination: z.string().min(3, 'Destination phone number or email is required').max(100),
  purpose: z.enum(['signup', 'forgot_password', 'phone_change']),
}));

export type SendOtpDto = z.infer<typeof SendOtpDtoSchema>;

export const VerifyOtpDtoSchema = z.preprocess((val: any) => {
  if (typeof val === 'object' && val !== null) {
    const dest = val.destination || val.phone;
    return {
      ...val,
      destination: dest,
      purpose: normalizePurpose(val.purpose),
    };
  }
  return val;
}, z.object({
  destination: z.string().min(3, 'Destination phone number or email is required').max(100),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  purpose: z.enum(['signup', 'forgot_password', 'phone_change']),
}));

export type VerifyOtpDto = z.infer<typeof VerifyOtpDtoSchema>;
