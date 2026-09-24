import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/exports/adminClient';
import { csvResponse, toCsv } from '@/lib/exports/csv';
import { contactCsvHeaders, mapAgentToContactCsvRow, mapClientToContactCsvRow } from '@/lib/exports/contacts';
import { mapPipelineClientToCsvRow, pipelineCsvHeaders } from '@/lib/exports/pipeline';
import { KpiCsvRow, kpiCsvHeaders, mapWeeklyRowToKpiCsvRow } from '@/lib/exports/kpis';

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

export async function GET(request: NextRequest) {
  const authResult = await verifySuperadmin(request);
  if (!authResult.ok) {
    const status = authResult.message === 'Forbidden' ? 403 : 401;
    return NextResponse.json({ error: authResult.message }, { status });
  }

  const requestUrl = new URL(request.url);
  const userId = requestUrl.searchParams.get('user_id');
  const dataset = requestUrl.searchParams.get('dataset');

  if (!userId || !dataset) {
    return NextResponse.json({ error: 'Missing user_id or dataset' }, { status: 400 });
  }

  if (dataset === 'contacts') {
    const [prospectsResult, soiResult, agentsResult] = await Promise.all([
      supabaseAdmin.rpc('get_clients_by_client_type', { uid: userId, client_type_name: 'Prospect' }),
      supabaseAdmin.rpc('get_clients_by_client_type', { uid: userId, client_type_name: 'SOI' }),
      supabaseAdmin.rpc('get_agents_by_user', { uid: userId }),
    ]);

    if (prospectsResult.error || soiResult.error || agentsResult.error) {
      const errorMessage =
        prospectsResult.error?.message ||
        soiResult.error?.message ||
        agentsResult.error?.message ||
        'Failed to export contacts';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const rows = [
      ...(prospectsResult.data ?? []).map((c: any) => mapClientToContactCsvRow(c, 'Prospect')),
      ...(soiResult.data ?? []).map((c: any) => mapClientToContactCsvRow(c, 'SOI')),
      ...(agentsResult.data ?? []).map((a: any) => mapAgentToContactCsvRow(a)),
    ];

    return csvResponse(
      toCsv(rows, contactCsvHeaders),
      `contacts-export-${userId}-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  if (dataset === 'pipeline') {
    const { data, error } = await supabaseAdmin.rpc('get_clients_by_client_type', {
      uid: userId,
      client_type_name: 'Pipeline',
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []).map((client: any) => mapPipelineClientToCsvRow(client));
    return csvResponse(
      toCsv(rows, pipelineCsvHeaders),
      `pipeline-15-30-export-${userId}-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  if (dataset === 'kpis') {
    const courseIdParam = requestUrl.searchParams.get('course_id');

    let courseId = courseIdParam;
    if (!courseId) {
      const { data: userCourse, error: courseError } = await supabaseAdmin
        .from('user_courses')
        .select('course_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (courseError || !userCourse?.course_id) {
        return NextResponse.json(
          { error: 'Could not determine active course for this user' },
          { status: 400 }
        );
      }
      courseId = userCourse.course_id;
    }

    const { data: weekly, error: weeklyError } = await supabaseAdmin.rpc('get_weekly_task_counts', {
      _course_id: courseId,
      uid: userId,
    });

    if (weeklyError) return NextResponse.json({ error: weeklyError.message }, { status: 500 });

    const from = requestUrl.searchParams.get('from');
    const to = requestUrl.searchParams.get('to');

    const rows = (weekly ?? [])
      .map((row: any) => mapWeeklyRowToKpiCsvRow(row))
      .filter((row: KpiCsvRow) => {
        if (from && row.week_start < from) return false;
        if (to && row.week_start > to) return false;
        return true;
      });

    return csvResponse(
      toCsv(rows, kpiCsvHeaders),
      `kpis-export-${userId}-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }

  return NextResponse.json({ error: 'Invalid dataset' }, { status: 400 });
}
