'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase-client';

export default function AdminLoginForm() {
  const supabase = createClientBrowser();
  const router = useRouter();
  const search = useSearchParams();
  // Allow deep-link redirects, default to admin dashboard/home
  const redirect = search.get('redirect') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    // Give middleware a moment to see fresh auth cookies, then go
    router.replace(redirect);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {msg && <div className="text-red-600 text-sm">{msg}</div>}

      <label className="block">
        <span className="text-sm">Email</span>
        <input
          type="email"
          required
          className="border px-3 py-2 w-full rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="block">
        <span className="text-sm">Password</span>
        <input
          type="password"
          required
          className="border px-3 py-2 w-full rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <button className="border px-3 py-2 rounded w-full" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
