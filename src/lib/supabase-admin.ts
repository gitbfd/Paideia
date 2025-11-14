// src/lib/supabase-admin.ts
// Server-only (service role) — use ONLY in trusted server code (ingestion)
import { createClient } from '@supabase/supabase-js';

export function createClientAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(url, key);
}
