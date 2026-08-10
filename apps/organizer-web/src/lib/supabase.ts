import { createSupabaseClient } from '@platform/auth';

let client: ReturnType<typeof createSupabaseClient> | null = null;

export function getSupabaseClient() {
  if (!client) {
    const url = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? 'https://placeholder.supabase.co';
    const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? 'placeholder-key';

    client = createSupabaseClient({ supabaseUrl: url, supabaseAnonKey: key });
  }
  return client;
}
