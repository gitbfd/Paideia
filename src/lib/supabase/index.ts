// src/lib/supabase/index.ts
// Client-safe exports only
// Server-only functions (createClientServer, createClientForRoute, createClientAdmin) 
// must be imported directly from their respective files to avoid bundling server code in client components

export { createClientBrowser } from './client';

