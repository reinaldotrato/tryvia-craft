import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const SUPABASE_URL = "https://oorsclbnzfujgxzxfruj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcnNjbGJuemZ1amd4enhmcnVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNDA5ODcsImV4cCI6MjA4MDgxNjk4N30.Tmyhta0ON7b8z85nnFAfjmtJnRQiMhBXTdLet52cQ78";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
