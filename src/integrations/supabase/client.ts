// Supabase client — credentials are injected via VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY environment variables in deployed environments.
// The fallback values are used ONLY for local development (npm run dev) so
// devs can run the app without a .env file.  They must NEVER be used in a
// Vercel Production or Preview deployment — the loud-fail guard below ensures
// a misconfigured deployment fails immediately rather than silently hitting prod.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const FALLBACK_URL = 'https://zrofxxvmsaaoaztorpyt.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpyb2Z4eHZtc2Fhb2F6dG9ycHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDI3NDksImV4cCI6MjA3NjA3ODc0OX0.S7E4HytCd17Kzqjnf4hcxbmZxRcDTAWKM8dnFHmRWVU';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? FALLBACK_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? FALLBACK_KEY;

// Guard: in any Vite production build, both vars MUST be set explicitly.
// This prevents a Vercel env misconfiguration from silently hitting prod data.
if (import.meta.env.PROD && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)) {
  throw new Error(
    '[snewweb] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set ' +
    'in the Vercel environment variables. See .env.example for required keys.'
  );
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
