import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseCreds = Boolean(rawUrl && rawKey);

const supabaseUrl = rawUrl || 'https://placeholder-url-for-local-sandbox.supabase.co';
const supabaseAnonKey = rawKey || 'placeholder-anon-key';

if (!hasSupabaseCreds) {
  console.warn(
    'Supabase VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. ' +
    'Running Ledger in offline Local Storage sandbox mode.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
