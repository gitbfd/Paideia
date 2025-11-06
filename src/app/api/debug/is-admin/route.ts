import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createClientServer();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  const { data, error } = await supabase.rpc('is_admin'); // zero-arg version

  return NextResponse.json({
    userId: user?.id ?? null,
    isAdmin: data ?? null,      // <-- expect true/false here
    rpcError: error?.message ?? null,
    userError: userErr?.message ?? null,
  });
}
