import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_PROJECT_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

export async function POST(req: NextRequest) {
  const { email, first_name, last_name } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    // Step 1: Create Auth user
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: 'rocketfuel',
      email_confirm: true,
    });

    if (userError || !user?.user?.id) {
      return NextResponse.json({ error: userError?.message || 'User creation failed' }, { status: 500 });
    }

    // Step 2: Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: user.user.id,
      first_name,
      last_name,
      needs_password_change: true,
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}
