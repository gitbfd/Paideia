// src/lib/supabase-server.ts
// import { cookies } from 'next/headers';
// import { createServerClient, type CookieOptions } from '@supabase/ssr';

// /** Server Components / Server Actions helper (read-only cookies) */
// export async function createClientServer() {
//   // In newer Next, cookies() is async; in older it’s sync.
//   // `await` works for both (awaiting a non-promise just returns the value).
//   const cookieStore = await cookies();

//   return createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         get(name: string) {
//           return cookieStore.get(name)?.value;
//         },
//         // no-ops in RSC (you cannot write cookies here)
//         set(_name: string, _value: string, _options: CookieOptions) {},
//         remove(_name: string, _options: CookieOptions) {},
//       },
//     }
//   );
// }

// Server Components / Server Actions (read-only cookies)
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function createClientServer() {
  const cookieStore = await cookies(); // async-safe for your Next version

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // No writes in RSC
        set(_n: string, _v: string, _o: CookieOptions) {},
        remove(_n: string, _o: CookieOptions) {},
      },
    }
  );
}
