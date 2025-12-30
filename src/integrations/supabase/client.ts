import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://eyljpmwsaczdgfhdvnmq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bGpwbXdzYWN6ZGdmaGR2bm1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDcxNjgsImV4cCI6MjA4MjY4MzE2OH0.Tj8p9Wi5Z5RRJ1-rqJXGUZGfdY8PCa0OYpZti8uWERI";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});