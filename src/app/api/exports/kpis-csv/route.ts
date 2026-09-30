import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/exports/adminClient';
import { getAuthenticatedUserId } from '@/lib/exports/auth';
import { csvResponse, toCsv } from '@/lib/exports/csv';
import { KpiCsvRow, kpiCsvHeaders, mapWeeklyRowToKpiCsvRow } from '@/lib/exports/kpis';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
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

  if (weeklyError) {
    return NextResponse.json({ error: weeklyError.message }, { status: 500 });
  }

  const from = requestUrl.searchParams.get('from');
  const to = requestUrl.searchParams.get('to');

  const rows = (weekly ?? [])
    .map((row: any) => mapWeeklyRowToKpiCsvRow(row))
    .filter((row: KpiCsvRow) => {
      if (from && row.week_start < from) return false;
      if (to && row.week_start > to) return false;
      return true;
    });

  const csv = toCsv(rows, kpiCsvHeaders);
  const today = new Date().toISOString().slice(0, 10);

  return csvResponse(csv, `kpis-export-${today}.csv`);
}
