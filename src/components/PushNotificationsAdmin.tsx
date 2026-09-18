'use client';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, MenuItem, TextField, Typography } from '@mui/material';
import { supabase } from '@/lib/supabaseClient';

type Member = { id: string; first_name?: string; last_name?: string; email?: string };
type Delivery = { delivery_id: string; user_id: string; member_name: string | null; kind: string; status: string; updated_at: string | null; opened_at: string | null; title: string | null; body: string | null; error_code: string | null; receipt_status: string | null };
type Status = { enabled: boolean; activated_at: string | null; counts: Record<string, number>; configuration: { worker_enabled: boolean; self_test_enabled: boolean; provider_configured: boolean }; deliveries: Delivery[] };
type Preview = { eligible: boolean; reason: string | null; kind: string | null; title: string | null; body: string | null };
const labels: Record<string, string> = { claimed: 'Reserved', sending: 'Submission started', sent: 'Accepted by Expo', accepted: 'Accepted by Expo', failed: 'Rejected', unknown: 'Outcome unknown — no automatic resend', unconfirmed: 'Acknowledgement missing — do not resend', skipped: 'Skipped after recheck', cancelled: 'Cancelled', canceled: 'Cancelled', queued: 'Queued' };
const receiptLabels: Record<string, string> = { ok: 'Handed to Apple / Google', error: 'Provider rejected', pending: 'Awaiting receipt', unavailable: 'Receipt unavailable' };
const displayDate = (value: string | null) => value ? new Date(value).toLocaleString() : '—';
const human = (value: string | null) => value ? value.replace(/_/g, ' ') : 'No additional detail';
function guidance(code: string | null) {
  if (code === 'DeviceNotRegistered') return 'Device registration was retired. Open the latest app and enable notifications again.';
  if (code === 'InvalidCredentials' || code === 'MismatchSenderId') return 'Check the Expo project and Apple / Google push credentials.';
  if (code === 'UNAUTHORIZED' || code === 'ProviderHttp401' || code === 'ProviderHttp403') return 'Check Expo enhanced push security and the server access token.';
  if (code === 'NetworkOutcomeUnknown' || code === 'InvalidProviderResponse') return 'Submission may have succeeded. It will not be resent automatically.';
  return code ? human(code) : '';
}
export default function PushNotificationsAdmin({ users }: { users: Member[] }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [member, setMember] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmTest, setConfirmTest] = useState(false);
  const api = useCallback(async (body?: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Please sign in again.');
    const response = await fetch('/api/superadmin/notifications', { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Notification request failed.');
    return result;
  }, []);
  const load = useCallback(async () => { const result = await api(); setStatus(result); }, [api]);
  useEffect(() => { let active = true; void api().then(result => { if (active) setStatus(result); }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Status could not load.'); }); return () => { active = false; }; }, [api]);
  async function act(kind: 'refresh' | 'preview' | 'self_test') {
    setBusy(true); setError(''); setMessage('');
    try {
      if (kind === 'preview') { setPreview(null); const result = await api({ action: 'preview', user_id: member }); setPreview(result.preview); }
      else if (kind === 'self_test') { setConfirmTest(false); const result = await api({ action: 'self_test', confirm: true }); setMessage(`Self-test: ${labels[result.result.status] || human(result.result.status)}. Check your phone; acceptance does not confirm display.`); await load(); }
      else await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Request could not complete.'); }
    finally { setBusy(false); }
  }
  const canTest = status?.enabled && status.configuration.worker_enabled && status.configuration.self_test_enabled && status.configuration.provider_configured;
  return <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 2 }}><Box><Typography variant="h5" fontWeight={700}>Push notifications</Typography><Typography color="text.secondary" sx={{ mt: 1 }}>Preview member eligibility and inspect delivery attempts.</Typography></Box><Button disabled={busy} onClick={() => void act('refresh')}>Refresh</Button></Box>
    {error && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>{error}</Alert>}
    {message && <Alert severity="info" sx={{ mt: 2 }} onClose={() => setMessage('')}>{message}</Alert>}
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, my: 3 }}>
      <Typography variant="body2">Server worker: <strong>{status ? status.configuration.worker_enabled ? 'Enabled' : 'Disabled' : 'Loading'}</strong></Typography>
      <Typography variant="body2">Database: <strong>{status ? status.enabled ? 'Active' : 'Disabled' : 'Loading'}</strong></Typography>
      <Typography variant="body2">Provider configuration: <strong>{status ? status.configuration.provider_configured ? 'Ready' : 'Incomplete' : 'Loading'}</strong></Typography>
    </Box>
    <Divider />
    <Typography variant="h6" sx={{ mt: 3 }}>Member preview</Typography>
    <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>Shows current eligibility without creating or sending a notification.</Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
      <TextField select label="Member" value={member} disabled={busy} onChange={event => { setMember(event.target.value); setPreview(null); }} size="small" sx={{ minWidth: 260 }}>{users.map(user => <MenuItem key={user.id} value={user.id}>{[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Unnamed member'}</MenuItem>)}</TextField>
      <Button variant="outlined" disabled={busy || !member} onClick={() => void act('preview')}>Preview eligibility</Button>
    </Box>
    {preview && <Box sx={{ my: 2 }} aria-live="polite"><Typography fontWeight={600}>{preview.eligible ? 'Eligible now' : 'Not eligible now'}</Typography><Typography variant="body2" color="text.secondary">{human(preview.reason)}</Typography>{preview.title && <Box sx={{ mt: 2, pl: 2, borderLeft: '3px solid', borderColor: 'divider' }}><Typography fontWeight={600}>{preview.title}</Typography><Typography>{preview.body}</Typography></Box>}</Box>}
    <Divider sx={{ my: 3 }} />
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}><Box><Typography variant="h6">Test my phone</Typography><Typography variant="body2" color="text.secondary">Sends one clearly marked test to your own latest registered device.</Typography><Typography variant="body2" color="text.secondary">Self-tests: {status?.configuration.self_test_enabled ? 'Enabled' : 'Disabled'}. Your device must have notification permission.</Typography></Box><Button variant="outlined" disabled={busy || !canTest} onClick={() => setConfirmTest(true)}>Send self-test</Button></Box>
    <Divider sx={{ my: 3 }} />
    <Typography variant="h6">Recent attempts</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>Expo acceptance and Apple / Google receipts do not confirm that a notification appeared. Opened means the signed-in member tapped it.</Typography>
    {!status?.deliveries.length && <Typography color="text.secondary" sx={{ py: 2 }}>No delivery attempts to show.</Typography>}
    {status?.deliveries.map(entry => <Box key={entry.delivery_id} sx={{ py: 2, borderBottom: '1px solid', borderColor: 'divider' }}><Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}><Typography fontWeight={600}>{entry.member_name || 'Member'} · {human(entry.kind)}</Typography><Typography variant="body2" color="text.secondary">{displayDate(entry.updated_at)}</Typography></Box><Typography variant="body2">{labels[entry.status] || human(entry.status)}{entry.receipt_status ? ` · ${receiptLabels[entry.receipt_status] || human(entry.receipt_status)}` : ''}{entry.opened_at ? ` · Opened ${displayDate(entry.opened_at)}` : ''}</Typography>{entry.title && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{entry.title} — {entry.body}</Typography>}{entry.error_code && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{guidance(entry.error_code)}</Typography>}</Box>)}
    <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>No reminder? Check the member’s opt-in, pause, chosen days, local time, recent activity, active course, and device permission. Ordinary notifications are limited to three in seven days, at least 24 hours apart, and 09:00–21:00 local time.</Typography>
    <Dialog open={confirmTest} onClose={() => !busy && setConfirmTest(false)} maxWidth="sm" fullWidth><DialogTitle>Send a test to your phone?</DialogTitle><DialogContent><Typography>This sends one test notification to the device registered to your signed-in administrator account. The selected preview member will not receive it.</Typography></DialogContent><DialogActions><Button onClick={() => setConfirmTest(false)}>Cancel</Button><Button variant="contained" disabled={busy} onClick={() => void act('self_test')}>Send my test</Button></DialogActions></Dialog>
  </Box>;
}
