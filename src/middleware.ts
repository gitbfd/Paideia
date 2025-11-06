// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export const config = {
  // Protect admin & student areas, BUT we'll special-case /admin/login below.
  matcher: ['/admin/:path*', '/student/:path*'],
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const url = req.nextUrl;
  const path = url.pathname;

  // --- Allow unauthenticated access to the admin login screen itself ---
  if (path === '/admin/login') return res;

  // Cookie adapter for middleware (cannot use next/headers here)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // mirror to the response
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  // Refresh session (no-op if already valid)
  await supabase.auth.getSession();

  // Read the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Admin area guard ---
  if (path.startsWith('/admin')) {
    if (!user) {
      // send them to the general login with a redirect back to where they wanted
      const login = new URL('/auth/login', req.url);
      login.searchParams.set('redirect', path);
      return NextResponse.redirect(login);
    }

    // Determine admin status: check either profiles.role='admin' OR app_admins membership
    const [{ data: profile, error: profileErr }, { data: adminRow, error: adminErr }] =
      await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        supabase.from('app_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
      ]);

    const isAdmin =
      (profile && profile.role === 'admin') ||
      (!!adminRow && adminRow.user_id === user.id);

    if (!isAdmin) {
      // non-admin users get pushed to their student area
      return NextResponse.redirect(new URL('/student/profile', req.url));
    }
  }

  // --- Student area can have its own checks if you want (optional) ---

  return res;
}
