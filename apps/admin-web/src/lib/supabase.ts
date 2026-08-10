import { createSupabaseClient } from '@platform/auth';

let client: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Get or create the Supabase browser client (singleton).
 * Uses the public anon key — SAFE for browser use.
 * NEVER put the service role key here.
 */
export function getSupabaseClient() {
  if (!client) {
    const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
    const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

    if (!url || !key) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.',
      );
    }

    client = createSupabaseClient({ supabaseUrl: url, supabaseAnonKey: key });
  }
  return client;
}
