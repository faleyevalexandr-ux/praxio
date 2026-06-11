import { createClient } from '@supabase/supabase-js'

/**
 * Admin client с service role key — обходит RLS.
 * Использовать только в Server Actions, API Routes, Cron jobs.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
