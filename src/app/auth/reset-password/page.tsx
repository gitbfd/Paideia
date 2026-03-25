// src/app/reset-password/page.tsx
'use client';
import { useState } from 'react';
import { createClientBrowser } from '@/lib/supabase';

export default function ResetPassword() {
  const supabase = createClientBrowser();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/update-password`,
    });
    setMsg(error ? error.message : 'Check your email for a reset link.');
  }

  return (
    <main className="p-8 max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      {msg && <p className="text-sm">{msg}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="border px-3 py-2 w-full rounded bg-transparent"
               type="email" required value={email}
               onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" />
        <button className="btn-primary-md btn-full" type="submit">Send reset link</button>
      </form>
    </main>
  );
}
