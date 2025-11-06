'use client';

import { useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-client';

export default function SignupForm() {
  const supabase = createClientBrowser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // keep simple; can switch to magic links if you prefer
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    // const { error } = await supabase.auth.signUp({
    //   email,
    //   password, // Supabase will create the user; RLS keeps them in the student role by default
    // });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?redirect=/dashboard`,
      },
    });

    if (error) setMessage(error.message);
    else setMessage('Check your email to confirm your account.');
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message && <p className="text-sm">{message}</p>}
      <label className="block">
        <span className="text-sm">Email</span>
        <input
          type="email"
          required
          className="border px-3 py-2 w-full rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@student.edu"
        />
      </label>
      <label className="block">
        <span className="text-sm">Password</span>
        <input
          type="password"
          required
          minLength={6}
          className="border px-3 py-2 w-full rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
        />
      </label>
      <button className="border px-3 py-2 rounded w-full" type="submit">
        Create Account
      </button>
    </form>
  );
}
