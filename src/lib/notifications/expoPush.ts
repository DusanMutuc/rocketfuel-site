/** Server transport only. Provider text is deliberately never persisted: it can contain tokens. */
export type PushMessage = { to: string; title: string; body: string; data: Record<string, unknown>; channelId?: string; ttl: number };
export type PushOutcome = { status: 'accepted' | 'failed' | 'unknown'; ticketId: string | null; errorCode: string | null };
export type ReceiptOutcome = { status: 'provider_received' | 'failed' | 'pending'; errorCode: string | null };
export type PushConfig = { accessToken?: string };
type Requester = typeof fetch;
const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const ERROR_CODES = new Set(['DeviceNotRegistered', 'MessageTooBig', 'MessageRateExceeded', 'MismatchSenderId', 'InvalidCredentials', 'UNAUTHORIZED', 'PUSH_TOO_MANY_EXPERIENCE_IDS', 'PUSH_TOO_MANY_NOTIFICATIONS', 'PUSH_TOO_MANY_RECEIPTS', 'PUSH_TOO_MANY_REQUESTS']);
const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
function errorCode(value: unknown): string { const code = object(object(value)?.details)?.error; return typeof code === 'string' && ERROR_CODES.has(code) ? code : 'ProviderRejected'; }
function headers(config: PushConfig) { return { Accept: 'application/json', 'Content-Type': 'application/json', ...(config.accessToken ? { Authorization: `Bearer ${config.accessToken}` } : {}) }; }
export function pushConfiguration(env: Record<string, string | undefined> = process.env): PushConfig {
  // Requiring a deliberate true/false declaration prevents silent fallback from enhanced security.
  if (!['true', 'false'].includes(env.EXPO_PUSH_SECURITY_REQUIRED ?? '')) throw new Error('Declare EXPO_PUSH_SECURITY_REQUIRED before enabling notifications.');
  const accessToken = env.EXPO_ACCESS_TOKEN?.trim();
  if (env.EXPO_PUSH_SECURITY_REQUIRED === 'true' && !accessToken) throw new Error('Expo enhanced push security needs EXPO_ACCESS_TOKEN.');
  if (accessToken && /\s/.test(accessToken)) throw new Error('Expo push access token configuration is invalid.');
  return { accessToken };
}
export function validPushMessage(message: PushMessage): boolean {
  return /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(message.to) &&
    typeof message.title === 'string' && message.title.length > 0 && message.title.length <= 120 &&
    typeof message.body === 'string' && message.body.length > 0 && message.body.length <= 500 &&
    Number.isInteger(message.ttl) && message.ttl >= 1 && message.ttl <= 3600 &&
    !!object(message.data) && Buffer.byteLength(JSON.stringify(message), 'utf8') < 3500;
}
/** A submitted send is attempted once. Uncertain outcomes must never be automatically resent. */
export async function sendExpoPush(message: PushMessage, config: PushConfig, request: Requester = fetch): Promise<PushOutcome> {
  if (!validPushMessage(message)) return { status: 'failed', ticketId: null, errorCode: 'InvalidPayload' };
  try {
    const response = await request(SEND_URL, { method: 'POST', headers: headers(config), body: JSON.stringify({ ...message, sound: 'default', priority: 'normal' }), signal: AbortSignal.timeout(8000) });
    if (!response.ok) return { status: response.status >= 400 && response.status < 500 && response.status !== 408 ? 'failed' : 'unknown', ticketId: null, errorCode: `ProviderHttp${response.status}` };
    const payload = object(await response.json());
    const raw = payload?.data;
    const ticket = object(Array.isArray(raw) && raw.length === 1 ? raw[0] : raw);
    if (ticket?.status === 'ok' && typeof ticket.id === 'string' && /^[\w-]{1,200}$/.test(ticket.id)) return { status: 'accepted', ticketId: ticket.id, errorCode: null };
    if (ticket?.status === 'error') return { status: 'failed', ticketId: null, errorCode: errorCode(ticket) };
    return { status: 'unknown', ticketId: null, errorCode: 'InvalidProviderResponse' };
  } catch { return { status: 'unknown', ticketId: null, errorCode: 'NetworkOutcomeUnknown' }; }
}
/** Receipt reads may safely be repeated; this never submits a notification. Missing receipts stay pending. */
export async function readExpoReceipts(ids: string[], config: PushConfig, request: Requester = fetch): Promise<Record<string, ReceiptOutcome>> {
  if (!ids.length) return {};
  if (ids.length > 100 || ids.some(id => !/^[\w-]{1,200}$/.test(id))) throw new Error('Invalid receipt batch.');
  const response = await request(RECEIPTS_URL, { method: 'POST', headers: headers(config), body: JSON.stringify({ ids }), signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('Receipt lookup unavailable.');
  const payload = object(await response.json());
  const data = object(payload?.data);
  if (!data) throw new Error('Receipt response unavailable.');
  return Object.fromEntries(ids.map(id => { const receipt = object(data[id]); return [id, receipt?.status === 'ok' ? { status: 'provider_received', errorCode: null } : receipt?.status === 'error' ? { status: 'failed', errorCode: errorCode(receipt) } : { status: 'pending', errorCode: null }]; }));
}
