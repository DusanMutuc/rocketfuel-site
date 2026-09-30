import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/exports/adminClient';
import { getAuthenticatedUserId } from '@/lib/exports/auth';
import { contactCsvHeaders, mapAgentToContactCsvRow, mapClientToContactCsvRow } from '@/lib/exports/contacts';
import { csvResponse, toCsv } from '@/lib/exports/csv';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  const prospectRows = (prospectsResult.data ?? []).map((client: any) =>
    mapClientToContactCsvRow(client, 'Prospect')
  );
  const soiRows = (soiResult.data ?? []).map((client: any) =>
    mapClientToContactCsvRow(client, 'SOI')
  );
  const agentRows = (agentsResult.data ?? []).map((agent: any) => mapAgentToContactCsvRow(agent));

  const rows = [...prospectRows, ...soiRows, ...agentRows];
  const csv = toCsv(rows, contactCsvHeaders);

  const today = new Date().toISOString().slice(0, 10);
  return csvResponse(csv, `contacts-export-${today}.csv`);
}
