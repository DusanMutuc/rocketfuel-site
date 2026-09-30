export type PipelineCsvRow = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address: string;
  original_contact: string;
  temperature: string;
  pipeline_note: string;
  pipeline_revenue: number;
};

export const pipelineCsvHeaders: { key: keyof PipelineCsvRow; label: string }[] = [
  { key: 'first_name', label: 'first_name' },
  { key: 'last_name', label: 'last_name' },
  { key: 'email', label: 'email' },
  { key: 'phone_number', label: 'phone_number' },
  { key: 'address', label: 'address' },
  { key: 'original_contact', label: 'original_contact' },
  { key: 'temperature', label: 'temperature' },
  { key: 'pipeline_note', label: 'pipeline_note' },
  { key: 'pipeline_revenue', label: 'pipeline_revenue' },
];

type RawPipelineClient = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  address?: string | null;
  original_contact?: string | null;
  temperature?: string | null;
  pipeline_note?: string | null;
  pipeline_revenue?: number | null;
};

export function mapPipelineClientToCsvRow(client: RawPipelineClient): PipelineCsvRow {
  return {
    first_name: client.first_name ?? '',
    last_name: client.last_name ?? '',
    email: client.email ?? '',
    phone_number: client.phone_number ?? '',
    address: client.address ?? '',
    original_contact: client.original_contact ?? '',
    temperature: client.temperature ?? '',
    pipeline_note: client.pipeline_note ?? '',
    pipeline_revenue: Number(client.pipeline_revenue ?? 0),
  };
}
