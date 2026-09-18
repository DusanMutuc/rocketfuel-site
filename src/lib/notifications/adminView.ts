const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const safeText = (value: unknown, max = 500): string | null => typeof value === 'string' && !/(?:ExponentPushToken|ExpoPushToken)\[|Bearer\s/i.test(value) ? value.slice(0, max) : null;
const fields = (value: unknown, names: string[]) => Object.fromEntries(names.map(name => [name, safeText(object(value)[name])]));
/** Explicit response allowlists ensure tokens and claim credentials cannot accidentally enter client data. */
export function adminNotificationView(value: unknown) {
  const raw = object(value);
  const counts = Object.fromEntries(Object.entries(object(raw.counts)).filter(([key, count]) => /^[a-z_]{1,40}$/.test(key) && typeof count === 'number' && Number.isFinite(count)));
  return { enabled: raw.enabled === true, activated_at: safeText(raw.activated_at), counts, deliveries: (Array.isArray(raw.deliveries) ? raw.deliveries : []).slice(0, 100).map(row => fields(row, ['delivery_id', 'user_id', 'member_name', 'kind', 'status', 'created_at', 'prepared_at', 'updated_at', 'opened_at', 'title', 'body', 'course_id', 'report_id', 'error_code', 'receipt_status', 'receipt_checked_at'])) };
}
export function notificationPreviewView(value: unknown) {
  const raw = object(value);
  return { eligible: raw.eligible === true, ...fields(raw, ['reason', 'kind', 'title', 'body', 'destination', 'course_id', 'report_id']) };
}
