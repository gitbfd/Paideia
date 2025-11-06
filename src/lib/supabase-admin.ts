// src/lib/supabase-admin.ts
// Server-only (service role) — use ONLY in trusted server code (ingestion)
import { createClient } from '@supabase/supabase-js';

export function createClientAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // never expose to the client
  );
}
