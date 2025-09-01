/*
 * Filename: src/utils/supabase/client.ts
 * Purpose: Creates a Supabase client for use in browser environments (Client Components).
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}