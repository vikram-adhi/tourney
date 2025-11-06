import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let _supabase: SupabaseClient | null = null;
if (url && key) {
  try {
    _supabase = createClient(url, key);
  } catch (err) {
    console.warn('Failed to create Supabase client:', err);
    _supabase = null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  return _supabase;
}
