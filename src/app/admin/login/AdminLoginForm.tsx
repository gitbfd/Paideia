'use client';

import { useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-client';

export default function AdminLoginForm() {
  const supabase = createClientBrowser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    else window.location.href = '/admin'; // protected by middleware
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {msg && <p className="text-sm">{msg}</p>}
      <label className="block">
        <span className="text-sm">Admin email</span>
        <input
          type="email"
          required
          className="border px-3 py-2 w-full rounded"
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@yourapp.com"
        />
      </label>
      <label className="block">
        <span className="text-sm">Password</span>
        <input
          type="password"
          required
          className="border px-3 py-2 w-full rounded"
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button className="border px-3 py-2 rounded w-full" type="submit">
        Sign in
      </button>
    </form>
  );
}
