import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

// --- ADMIN CLIENT (service role) ---
const supabaseAdmin = createClient(
  process.env.SUPABASE_PROJECT_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

// --- SUPERADMIN GUARD (uses cookie session & env list) ---
function isAllowed(email?: string | null) {
  const allowed = process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS?.split(';') ?? [];
  return !!email && allowed.includes(email);
}

async function requireSuperadmin(req: NextRequest) {
  const supa = createServerClient(
    // you likely already have these set for your app:
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );
  const { data, error } = await supa.auth.getUser();
  if (error || !data.user || !isAllowed(data.user.email)) {
    return { ok: false as const, res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true as const, user: data.user };
}

// -------------------- CREATE USER (unchanged) --------------------
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

// -------------------- DELETE USER (new) --------------------
export async function DELETE(req: NextRequest) {
  const guard = await requireSuperadmin(req);
  if (!guard.ok) return guard.res;

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    // 1) Delete dependent rows (based on your schema)
    // client_client_types for this user's clients
    {
      const { data: clientIds, error } = await supabaseAdmin
        .from('clients')
        .select('client_id')
        .eq('user_id', user_id);

      if (error) {
        return NextResponse.json({ error: 'Fetch clients failed' }, { status: 500 });
      }

      const ids = (clientIds ?? []).map((c: any) => c.client_id);
      if (ids.length) {
        const { error: delLinks } = await supabaseAdmin
          .from('client_client_types')
          .delete()
          .in('client_id', ids);

        if (delLinks) {
          return NextResponse.json({ error: 'Delete client links failed' }, { status: 500 });
        }
      }
    }

    // clients
    {
      const { error } = await supabaseAdmin.from('clients').delete().eq('user_id', user_id);
      if (error) return NextResponse.json({ error: 'Delete clients failed' }, { status: 500 });
    }

    // agent_contacts
    {
      const { error } = await supabaseAdmin.from('agent_contacts').delete().eq('user_id', user_id);
      if (error) return NextResponse.json({ error: 'Delete agent contacts failed' }, { status: 500 });
    }

    // task_logs
    {
      const { error } = await supabaseAdmin.from('task_logs').delete().eq('user_id', user_id);
      if (error) return NextResponse.json({ error: 'Delete task logs failed' }, { status: 500 });
    }

    // user_courses
    {
      const { error } = await supabaseAdmin.from('user_courses').delete().eq('user_id', user_id);
      if (error) return NextResponse.json({ error: 'Delete user_courses failed' }, { status: 500 });
    }

    // profiles (FK to auth.users)
    {
      const { error } = await supabaseAdmin.from('profiles').delete().eq('id', user_id);
      if (error) return NextResponse.json({ error: 'Delete profile failed' }, { status: 500 });
    }

    // 2) Finally remove the auth user
    const { error: delAuth } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (delAuth) return NextResponse.json({ error: 'Delete auth user failed' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('DELETE /api/create-user error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
