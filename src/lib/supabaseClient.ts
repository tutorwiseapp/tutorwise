// app/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single, shared Supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);