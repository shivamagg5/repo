import { z } from 'zod';

export const LoginDtoSchema = z.object({
  identifier: z.string().min(3, 'Email or mobile number is required').max(100),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof LoginDtoSchema>;
