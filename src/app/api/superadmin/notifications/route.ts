import { NextRequest, NextResponse } from 'next/server';
import { reportAuthorization, privateHeaders } from '@/lib/reports/access';
import { supabaseAdmin } from '@/lib/exports/adminClient';
import { notificationFlags, runOwnPushTest } from '@/lib/notifications/pushWorker';
import { adminNotificationView, notificationPreviewView } from '@/lib/notifications/adminView';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: privateHeaders }); }
function failure(error?: { code?: string }) { return json({ error: error?.code === 'PGRST202' ? 'Install the push notification database update first.' : 'The notification request could not be completed. Check activation and device registration.' }, error?.code === 'PGRST202' ? 503 : 500); }
export async function GET(request: NextRequest) {
  try {
    const auth = await reportAuthorization(request);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    if (!auth.admin) return json({ error: 'Forbidden' }, 403);
    const { data, error } = await supabaseAdmin.rpc('list_member_push_admin', { _limit: 100 });
    return error ? failure(error) : json({ ...adminNotificationView(data), configuration: notificationFlags() });
  } catch { return failure(); }
}
export async function POST(request: NextRequest) {
  try {
    const auth = await reportAuthorization(request);
    if (!auth) return json({ error: 'Unauthorized' }, 401);
    if (!auth.admin) return json({ error: 'Forbidden' }, 403);
    let body;
    try { const raw = await request.text(); if (raw.length > 2048) return json({ error: 'Request too large.' }, 413); body = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON.' }, 400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'Invalid action.' }, 400);
    if (body.action === 'preview' && Object.keys(body).every(key => ['action', 'user_id'].includes(key)) && typeof body.user_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.user_id)) {
      const { data, error } = await supabaseAdmin.rpc('preview_member_push', { _user_id: body.user_id });
      return error ? failure(error) : json({ preview: notificationPreviewView(data) });
    }
    if (body.action === 'self_test' && body.confirm === true && Object.keys(body).every(key => ['action', 'confirm'].includes(key))) {
      const flags = notificationFlags();
      if (!flags.self_test_enabled) return json({ error: 'Self-tests are disabled on this server.' }, 409);
      if (!flags.provider_configured) return json({ error: 'The push provider is not configured.' }, 503);
      return json({ result: await runOwnPushTest(auth.user.id) });
    }
    return json({ error: 'Choose a preview or confirm a test to your own device.' }, 400);
  } catch { return failure(); }
}
