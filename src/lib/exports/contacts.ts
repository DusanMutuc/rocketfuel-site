export type ContactCsvRow = {
  contact_type: string;
  first_name: string;
  last_name: string;
  name: string;
  email: string;
  phone_number: string;
  address: string;
  brokerage: string;
  original_contact: string;
  notes: string;
};

export const contactCsvHeaders: { key: keyof ContactCsvRow; label: string }[] = [
  { key: 'contact_type', label: 'contact_type' },
  { key: 'first_name', label: 'first_name' },
  { key: 'last_name', label: 'last_name' },
  { key: 'name', label: 'name' },
  { key: 'email', label: 'email' },
  { key: 'phone_number', label: 'phone_number' },
  { key: 'address', label: 'address' },
  { key: 'brokerage', label: 'brokerage' },
  { key: 'original_contact', label: 'original_contact' },
  { key: 'notes', label: 'notes' },
];

type RawClient = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  address?: string | null;
  original_contact?: string | null;
  prospect_note?: string | null;
};

type RawAgent = {
  name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  address?: string | null;
  brokerage?: string | null;
  original_contact?: string | null;
  notes?: string | null;
};

export function mapClientToContactCsvRow(client: RawClient, type: 'Prospect' | 'SOI'): ContactCsvRow {
  return {
    contact_type: type,
    first_name: client.first_name ?? '',
    last_name: client.last_name ?? '',
    name: '',
    email: client.email ?? '',
    phone_number: client.phone_number ?? '',
    address: client.address ?? '',
    brokerage: '',
    original_contact: client.original_contact ?? '',
    notes: client.prospect_note ?? '',
  };
}

export function mapAgentToContactCsvRow(agent: RawAgent): ContactCsvRow {
  return {
    contact_type: 'Agent',
    first_name: '',
    last_name: '',
    name: agent.name ?? '',
    email: agent.email ?? '',
    phone_number: agent.phone_number ?? '',
    address: agent.address ?? '',
    brokerage: agent.brokerage ?? '',
    original_contact: agent.original_contact ?? '',
    notes: agent.notes ?? '',
  };
}
