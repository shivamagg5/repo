// =============================================================================
// @platform/config — Environment configuration utilities
// Provides type-safe environment variable access.
// =============================================================================
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  API_URL: z.string().url().default('http://localhost:3001'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SENTRY_DSN: z.string().optional(),
  STORAGE_BUCKET_EVENTS: z.string().default('event-images'),
  STORAGE_BUCKET_VENUES: z.string().default('venue-images'),
  STORAGE_BUCKET_AVATARS: z.string().default('user-avatars'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables.
 * Throws ZodError if required variables are missing/invalid.
 */
export function parseEnv(env: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(env);
}

/**
 * Safe parse that returns a result object instead of throwing.
 */
export function safeParseEnv(env: NodeJS.ProcessEnv = process.env) {
  return envSchema.safeParse(env);
}

/**
 * Get a single environment variable with a fallback.
 */
export function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key];
  if (!value && fallback === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? (fallback as string);
}

export { envSchema };
