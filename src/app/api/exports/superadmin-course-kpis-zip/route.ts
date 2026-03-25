import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/exports/adminClient';
import { createZip } from '@/lib/exports/zip';
import { kpiCsvHeaders, mapWeeklyRowToKpiCsvRow } from '@/lib/exports/kpis';
import { toCsv } from '@/lib/exports/csv';

const superadminEmails = process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS?.split(';') ?? [];

async function verifySuperadmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  if (!token) return { ok: false as const, message: 'Unauthorized' };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.email) return { ok: false as const, message: 'Unauthorized' };

  if (!superadminEmails.includes(data.user.email)) {
    return { ok: false as const, message: 'Forbidden' };
  }

  return { ok: true as const };
}

function safeBaseName(firstName: string | null, lastName: string | null): string {
  const fullName = `${firstName ?? ''} ${lastName ?? ''}`.trim() || 'Unnamed User';
  return fullName.replace(/[<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function GET(request: NextRequest) {
  const authResult = await verifySuperadmin(request);
  if (!authResult.ok) {
    const status = authResult.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: authResult.message }, { status });
  }

  const requestUrl = new URL(request.url);
  const courseId = requestUrl.searchParams.get('course_id');

  if (!courseId) {
    return NextResponse.json({ error: 'Missing course_id' }, { status: 400 });
  }

  const { data: courseUsers, error: usersError } = await supabaseAdmin
    .from('user_courses')
    .select('user_id')
    .eq('course_id', courseId);

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const userIds = [...new Set((courseUsers ?? []).map((u) => u.user_id).filter(Boolean))] as string[];
  if (userIds.length === 0) {
    return NextResponse.json({ error: 'No users found in selected course' }, { status: 404 });
  }

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', userIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const usedNames = new Map<string, number>();
  const files: { name: string; content: string }[] = [];

  for (const userId of userIds) {
    const { data: weekly, error: weeklyError } = await supabaseAdmin.rpc('get_weekly_task_counts', {
      _course_id: courseId,
      uid: userId,
    });

    if (weeklyError) {
      return NextResponse.json({ error: weeklyError.message }, { status: 500 });
    }

    const rows = (weekly ?? []).map((row: any) => mapWeeklyRowToKpiCsvRow(row));
    const csv = toCsv(rows, kpiCsvHeaders);

    const profile = profileById.get(userId);
    const base = safeBaseName(profile?.first_name ?? null, profile?.last_name ?? null);

    const count = (usedNames.get(base) ?? 0) + 1;
    usedNames.set(base, count);
    const fileName = count === 1 ? `${base}.csv` : `${base} (${count}).csv`;

    files.push({ name: fileName, content: csv });
  }

  const zipBytes = createZip(files);
  const today = new Date().toISOString().slice(0, 10);

  return new Response(zipBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="course-kpi-reports-${courseId}-${today}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
