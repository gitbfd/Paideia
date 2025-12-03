// src/lib/supabase/route.ts
// Route Handlers (API) — uses legacy getAll/setAll shape you prefer
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export function createClientForRoute(req: NextRequest) {
  const cookiesToSet: { name: string; value: string; options?: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
        },
        setAll(cookies: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.push(...cookies);
        },
      },
    }
  );

  // helper to attach any pending cookies to a response you return
  function applyCookies(res: NextResponse) {
    cookiesToSet.forEach(({ name, value, options }) => res.cookies.set({ name, value, ...options }));
    return res;
  }

  return { supabase, applyCookies };
}

