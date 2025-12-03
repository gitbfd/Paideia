
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase';

export default function LoginForm() {
  const supabase = createClientBrowser();
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get('redirect') || '/student/profile';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setMsg(error.message);
      return;
    }

    // Refresh session to ensure cookies are set before RPC call
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setLoading(false);
      setMsg('Session not available. Please try again.');
      return;
    }

    console.log('Session user ID:', session.user.id);

    // Check if user is admin and redirect accordingly
    const { data: isAdmin, error: rpcErr } = await supabase.rpc('is_admin');
    
    console.log('is_admin RPC result:', { isAdmin, error: rpcErr });
    
    setLoading(false);
    
    if (rpcErr) {
      console.error('Error checking admin status:', rpcErr);
      setMsg(`Failed to verify admin status: ${rpcErr.message}. Redirecting...`);
      // Default to student area on error
      router.push(redirect);
      return;
    }

    if (isAdmin === true) {
      console.log('User is admin, redirecting to /admin');
      router.push('/admin');
    } else {
      console.log('User is not admin, redirecting to:', redirect);
      router.push(redirect);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-sm mx-auto">
      {msg && <p className="text-sm text-red-400">{msg}</p>}

      <label className="block">
        <span className="text-sm">Email</span>
        <input
          type="email"
          required
          className="border px-3 py-2 w-full rounded bg-transparent"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <label className="block">
        <span className="text-sm">Password</span>
        <input
          type="password"
          required
          className="border px-3 py-2 w-full rounded bg-transparent"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      <button className="border px-3 py-2 rounded w-full" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <div className="text-sm text-right">
        <a href="/reset-password" className="underline">Forgot password?</a>
      </div>
    </form>
  );
}
