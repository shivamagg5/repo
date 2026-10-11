import { z } from 'zod';

const normalizeDob = (val: unknown): string => {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy && ddmmyyyy[1] && ddmmyyyy[2] && ddmmyyyy[3]) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
  }
  return trimmed;
};

export const SignupDtoSchema = z.preprocess((val: any) => {
  if (typeof val === 'object' && val !== null) {
    const token = val.phoneVerificationToken || val.verificationToken;
    return {
      ...val,
      phoneVerificationToken: token,
      dob: normalizeDob(val.dob),
    };
  }
  return val;
}, z.object({
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Phone must be valid E.164 format (e.g. +919876543210)'),
  phoneVerificationToken: z.string().min(16, 'Phone verification token is required'),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  name: z.string().min(1, 'Full name is required').max(100),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  whatsappConsent: z.boolean().default(false),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the Terms and Conditions and Privacy Policy.' }),
  }),
  termsVersion: z.string().default('1.0'),
}));

export type SignupDto = z.infer<typeof SignupDtoSchema>;
