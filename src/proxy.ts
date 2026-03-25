// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions, type CookieMethodsServer } from '@supabase/ssr';

export const config = { matcher: ['/admin/:path*', '/student/:path*'] };

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // Let users reach the admin login page
  if (pathname === '/admin/login') return res;

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
    },
    setAll(cookies) {
      cookies.forEach((c) => {
        res.cookies.set({ name: c.name, value: c.value, ...c.options });
      });
    },
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods }
  );

  // ensure fresh session for this request
  await supabase.auth.getSession();

  const { data: { user } } = await supabase.auth.getUser();

  if (pathname.startsWith('/admin')) {
    if (!user) {
      const login = new URL('/auth/login', req.url);
      login.searchParams.set('redirect', pathname);
      return NextResponse.redirect(login);
    }

    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/student/profile', req.url));
    }
  }

  return res;
}
