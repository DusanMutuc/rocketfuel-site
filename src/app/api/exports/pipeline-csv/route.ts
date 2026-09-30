import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/exports/adminClient';
import { getAuthenticatedUserId } from '@/lib/exports/auth';
import { csvResponse, toCsv } from '@/lib/exports/csv';
import { mapPipelineClientToCsvRow, pipelineCsvHeaders } from '@/lib/exports/pipeline';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin.rpc('get_clients_by_client_type', {
    uid: userId,
    client_type_name: 'Pipeline',
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((client: any) => mapPipelineClientToCsvRow(client));
  const csv = toCsv(rows, pipelineCsvHeaders);

  const today = new Date().toISOString().slice(0, 10);
  return csvResponse(csv, `pipeline-15-30-export-${today}.csv`);
}
