// src/app/auth/update-password/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase';

export default function UpdatePassword() {
  const supabase = createClientBrowser();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMsg(error.message);
    else router.push('/login');
  }

  return (
    <main className="p-8 max-w-sm mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      {msg && <p className="text-sm text-red-400">{msg}</p>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="border px-3 py-2 w-full rounded bg-transparent"
               type="password" required value={password}
               onChange={(e)=>setPassword(e.target.value)} placeholder="New password" />
        <button className="btn-primary-md btn-full" type="submit">Update password</button>
      </form>
    </main>
  );
}
