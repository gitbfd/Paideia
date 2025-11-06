// src/app/auth/callback/route.ts

// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';
// import { createServerClient, type CookieOptions } from '@supabase/ssr';

// export async function GET(req: NextRequest) {
//   const url = new URL(req.url);
//   const code = url.searchParams.get('code');
//   const next = url.searchParams.get('redirect') ?? '/dashboard';
//   // prepare redirect response (we'll set cookies onto this)
//   const res = NextResponse.redirect(new URL(next, url.origin));
//   if (code) {
//     const supabase = createServerClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//       {
//         // your ssr version expects getAll/setAll
//         cookies: {
//           getAll() {
//             return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
//           },
//           setAll(cookies: { name: string; value: string; options?: CookieOptions }[]) {
//             cookies.forEach(({ name, value, options }) => {
//               res.cookies.set({ name, value, ...options });
//             });
//           },
//         },
//       }
//     );
//     // exchange the auth code for a session cookie
//     await supabase.auth.exchangeCodeForSession(code);
//   }
//   return res;
// }

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('redirect') ?? '/dashboard';
  const redirect = NextResponse.redirect(new URL(next, url.origin));

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
          },
          setAll(cookies: { name: string; value: string; options?: CookieOptions }[]) {
            cookies.forEach(({ name, value, options }) => {
              redirect.cookies.set({ name, value, ...options });
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Optional: surface error
      redirect.headers.set('x-auth-error', encodeURIComponent(error.message));
    }
  }

  return redirect;
}
