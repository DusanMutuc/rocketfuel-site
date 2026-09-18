import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { runNotificationJob } from '@/lib/notifications/pushWorker';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
async function run(request: NextRequest) {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET || process.env.CRON_SECRET;
  const provided = Buffer.from(request.headers.get('authorization') || '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || provided.length !== expected.length || !timingSafeEqual(provided, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  try { return NextResponse.json(await runNotificationJob(), { headers }); }
  catch { return NextResponse.json({ error: 'Notification job did not complete. Review configuration and delivery states before running it again.' }, { status: 500, headers }); }
}
export const GET = run;
export const POST = run;
