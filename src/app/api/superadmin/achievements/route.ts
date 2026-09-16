import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/exports/adminClient';

// Match the existing superadmin allowlist, and verify it again on the server.
async function authorize(request: NextRequest) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return 401;
  const { data, error } = await supabaseAdmin.auth.getUser(header.slice(7));
  if (error || !data.user?.email) return 401;
  const allowed = (process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS ?? '').split(';').map(email => email.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(data.user.email.toLowerCase()) ? null : 403;
}

function failure(error: { code?: string; message: string }) {
  const missing = error.code === 'PGRST202';
  return NextResponse.json({ error: missing ? 'The achievement catalog migration has not been deployed yet.' : error.code === 'P0001' ? error.message : 'The achievement request could not be completed.' }, { status: missing ? 503 : error.code === 'P0001' || error.code === '22P02' ? 400 : 500 });
}

export async function GET(request: NextRequest) {
  const denied = await authorize(request);
  if (denied) return NextResponse.json({ error: denied === 401 ? 'Unauthorized' : 'Forbidden' }, { status: denied });
  const { data, error } = await supabaseAdmin.rpc('list_achievement_catalog');
  return error ? failure(error) : NextResponse.json({ achievements: data }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const denied = await authorize(request);
  if (denied) return NextResponse.json({ error: denied === 401 ? 'Unauthorized' : 'Forbidden' }, { status: denied });
  let body;
  try {
    const text = await request.text();
    if (text.length > 8000) return NextResponse.json({ error: 'Achievement definition is too large.' }, { status: 413 });
    body = JSON.parse(text);
  } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  if (!body || !['preview','publish','preview_edit','edit'].includes(body.action) || !body.definition || typeof body.definition !== 'object' || Array.isArray(body.definition)) return NextResponse.json({ error: 'Choose an achievement action and supply an achievement definition.' }, { status: 400 });
  // Older catalog RPCs ignore unknown JSON fields. Never let them silently
  // publish a requested series as an ordinary standalone achievement.
  if (['preview_edit','edit'].includes(body.action) || body.definition.shape !== undefined || body.definition.mode !== undefined || body.definition.tier !== undefined || (typeof body.definition.artwork === 'string' && body.definition.artwork.startsWith('phosphor:'))) {
    const { data: version, error: versionError } = await supabaseAdmin.rpc('achievement_engine_version');
    if (versionError || version !== 6) return NextResponse.json({ error: 'Deploy the complete achievement collection migration before using this builder.' }, { status: 503 });
  }
  const { data, error } = await supabaseAdmin.rpc(({preview:'preview_achievement',publish:'publish_achievement',preview_edit:'preview_achievement_edit',edit:'edit_achievement'} as Record<string,string>)[body.action], { _definition: body.definition });
  return error ? failure(error) : NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
