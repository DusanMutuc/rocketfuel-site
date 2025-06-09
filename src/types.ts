export interface Client {
  client_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone_number?: string;
  address?: string;
  prospect_note?: string;
  original_contact?: string;
  created_at?: string;
}

export interface Agent {
  id: string;
  name: string;
  phone_number?: string;
  email?: string;
  address?: string;
  brokerage?: string;
  notes?: string;
  original_contact?: string;
}

export interface PipelineClient {
  client_id: string;
  first_name: string;
  last_name: string;
  temperature: string;
  pipeline_note: string;
  pipeline_revenue: number;
}

