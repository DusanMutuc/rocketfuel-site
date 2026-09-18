import 'server-only';
import { supabaseAdmin } from '@/lib/exports/adminClient';
import { pushConfiguration, readExpoReceipts, sendExpoPush, type PushConfig, type PushMessage } from './expoPush';

type Claim = { delivery_id: string; claim_token: string };
type ReceiptClaim = { delivery_id: string; receipt_claim_token: string; provider_id: string };
type RpcResult = { data: unknown; error: unknown };
type RpcRequest = PromiseLike<RpcResult> & { abortSignal?: (signal: AbortSignal) => PromiseLike<RpcResult> };
type Database = { rpc: (name: string, args?: Record<string, unknown>) => RpcRequest };
type Dependencies = { database?: Database; request?: typeof fetch; env?: Record<string, string | undefined>; now?: () => number };
type DeliveryResult = { delivery_id: string; status: string };
export function notificationFlags(env: Record<string, string | undefined> = process.env) {
  let providerConfigured = false;
  try { pushConfiguration(env); providerConfigured = true; } catch { /* No secrets or configuration values in admin responses. */ }
  return { worker_enabled: env.NOTIFICATIONS_ENABLED === 'true', self_test_enabled: env.NOTIFICATIONS_ENABLED === 'true' && env.NOTIFICATIONS_TEST_ENABLED === 'true', provider_configured: providerConfigured };
}
async function databaseRequest(database: Database, name: string, args?: Record<string, unknown>): Promise<RpcResult> {
  const request = database.rpc(name, args);
  return await (request.abortSignal ? request.abortSignal(AbortSignal.timeout(5000)) : request);
}
async function rpc(database: Database, name: string, args?: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await databaseRequest(database, name, args);
  if (error) throw new Error('Notification database request failed.');
  return data;
}
async function sendClaim(claim: Claim, database: Database, config: PushConfig, request: typeof fetch): Promise<DeliveryResult> {
  // Preparation consumes the claim and rechecks ownership, preferences and activity immediately before submission.
  const prepared = await rpc(database, 'prepare_member_push_notification', { _delivery_id: claim.delivery_id, _claim_token: claim.claim_token }) as { ready: boolean; message?: PushMessage } | null;
  if (!prepared?.ready || !prepared.message) return { delivery_id: claim.delivery_id, status: 'skipped' };
  const result = await sendExpoPush(prepared.message, config, request);
  const outcome = result.status === 'accepted' ? 'sent' : result.status;
  const { error } = await databaseRequest(database, 'finish_member_push_notification', { _delivery_id: claim.delivery_id, _claim_token: claim.claim_token, _outcome: outcome, _provider_id: result.ticketId, _error_code: result.errorCode, _error: result.errorCode });
  // Lost acknowledgement leaves a single-use prepared claim. Database expiry makes it unknown, never sendable again.
  return { delivery_id: claim.delivery_id, status: error ? 'unconfirmed' : result.status };
}
async function pollReceipts(database: Database, config: PushConfig, request: typeof fetch, deadline: number, now: () => number) {
  const claims = await rpc(database, 'claim_member_push_receipts', { _limit: 25 }) as ReceiptClaim[];
  if (!claims?.length) return { checked: 0, unavailable: false };
  let receipts;
  try { receipts = await readExpoReceipts(claims.map(claim => claim.provider_id), config, request); }
  catch { return { checked: 0, unavailable: true }; } // Receipt claims expire safely; only this read may repeat.
  let checked = 0;
  for (const claim of claims) {
    if (now() + 5000 >= deadline) break;
    const receipt = receipts[claim.provider_id];
    const { error } = await databaseRequest(database, 'finish_member_push_receipt', { _delivery_id: claim.delivery_id, _receipt_claim_token: claim.receipt_claim_token, _status: receipt.status === 'provider_received' ? 'ok' : receipt.status === 'failed' ? 'error' : 'pending', _error_code: receipt.errorCode, _error: receipt.errorCode });
    if (!error) checked++;
  }
  return { checked, unavailable: false };
}
export async function runNotificationJob(dependencies: Dependencies = {}) {
  const env = dependencies.env ?? process.env;
  if (env.NOTIFICATIONS_ENABLED !== 'true') return { status: 'disabled' };
  // Validate before mutating the queue. Enhanced-security configuration must be explicit.
  const config = pushConfiguration(env);
  const database = dependencies.database ?? supabaseAdmin;
  const request = dependencies.request ?? fetch;
  const now = dependencies.now ?? Date.now;
  const deadline = now() + 45000;
  const state = await rpc(database, 'list_member_push_admin', { _limit: 1 }) as { enabled?: boolean };
  if (!state?.enabled) return { status: 'disabled_in_database' };
  const receipts = await pollReceipts(database, config, request, deadline, now);
  if (now() + 25000 >= deadline) return { status: 'time_budget_reached', receipts, deliveries: [] };
  const claims = await rpc(database, 'claim_member_push_notifications', { _limit: 5 }) as Claim[];
  const deliveries: DeliveryResult[] = [];
  for (const claim of claims ?? []) {
    if (now() + 20000 >= deadline) break; // Reserve prepare/send/finish time. Unprepared claims expire safely.
    deliveries.push(await sendClaim(claim, database, config, request));
  }
  return { status: 'complete', receipts, deliveries };
}
export async function runOwnPushTest(userId: string, dependencies: Dependencies = {}) {
  const env = dependencies.env ?? process.env;
  if (env.NOTIFICATIONS_ENABLED !== 'true' || env.NOTIFICATIONS_TEST_ENABLED !== 'true') throw new Error('Self-tests are disabled.');
  const config = pushConfiguration(env);
  const database = dependencies.database ?? supabaseAdmin;
  // The API supplies only the authenticated administrator's identity. The database selects their current device.
  const claim = await rpc(database, 'queue_member_push_test', { _user_id: userId }) as Claim;
  if (!claim?.delivery_id || !claim.claim_token) throw new Error('No eligible device is available for a self-test.');
  return sendClaim(claim, database, config, dependencies.request ?? fetch);
}
