import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import ts from 'typescript';
function load(path, deps = {}, env = {}) {
  const exports = {};
  const source = readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(compiled, { exports, require: id => { if (id === 'server-only') return {}; if (id in deps) return deps[id]; throw new Error(`Unmocked dependency ${id}`); }, process: { env }, URL, Response, Request, AbortSignal, Buffer, console, fetch: () => { throw new Error('Live network is forbidden in notification tests'); } });
  return exports;
}
const expo = load('lib/notifications/expoPush.ts');
const view = load('lib/notifications/adminView.ts');
const env = { NOTIFICATIONS_ENABLED: 'true', EXPO_PUSH_SECURITY_REQUIRED: 'false' };
const message = { to: 'ExpoPushToken[synthetic_token]', title: 'Rocketfuel', body: 'Your plan is ready.', ttl: 60, channelId: 'rocketfuel-updates', data: { version: 1, destination: 'logging' } };
const claim = { delivery_id: 'delivery-one', claim_token: 'claim-secret' };
const copy = value => JSON.parse(JSON.stringify(value));
function database(overrides = {}) {
  const calls = [];
  const defaults = { list_member_push_admin: { enabled: true }, claim_member_push_receipts: [], claim_member_push_notifications: [claim], prepare_member_push_notification: { ready: true, message }, finish_member_push_notification: null, finish_member_push_receipt: null, queue_member_push_test: claim };
  return { calls, rpc: async (name, args) => { calls.push([name, args]); const result = name in overrides ? overrides[name] : defaults[name]; if (typeof result === 'function') return result(args); return { data: result, error: null }; } };
}
function worker(db, overrides = {}) { return load('lib/notifications/pushWorker.ts', { '@/lib/exports/adminClient': { supabaseAdmin: db }, './expoPush': { ...expo, ...overrides } }, env); }

test('provider configuration requires an explicit security setting before claims', () => {
  assert.throws(() => expo.pushConfiguration({}));
  assert.throws(() => expo.pushConfiguration({ EXPO_PUSH_SECURITY_REQUIRED: 'true' }));
  assert.equal(expo.pushConfiguration({ EXPO_PUSH_SECURITY_REQUIRED: 'true', EXPO_ACCESS_TOKEN: 'synthetic-secret' }).accessToken, 'synthetic-secret');
});
test('send preserves the prepared quiet-hour expiry and uses enhanced security only in server headers', async () => {
  let options;
  const result = await expo.sendExpoPush(message, { accessToken: 'synthetic-secret' }, async (url, init) => { assert.equal(url, 'https://exp.host/--/api/v2/push/send'); options = init; return Response.json({ data: { status: 'ok', id: 'ticket-one' } }); });
  assert.equal(result.status, 'accepted'); assert.equal(JSON.parse(options.body).ttl, 60);
  assert.equal(options.headers.Authorization, 'Bearer synthetic-secret'); assert.ok(!options.body.includes('synthetic-secret'));
  for (const ttl of [0, -1, 3601, undefined, 1.5]) assert.equal((await expo.sendExpoPush({ ...message, ttl }, {}, () => { throw new Error('Should not call'); })).status, 'failed');
});
test('ambiguous send outcomes are unknown and each POST is attempted once', async () => {
  for (const response of [() => { throw new Error('timeout containing ExpoPushToken[secret]'); }, () => new Response('{}', { status: 503 }), () => new Response('{}', { status: 408 }), () => Response.json({ data: { status: 'ok' } }), () => new Response('bad json')]) {
    let calls = 0; const result = await expo.sendExpoPush(message, {}, async () => { calls++; return response(); });
    assert.equal(result.status, 'unknown'); assert.equal(calls, 1); assert.ok(!JSON.stringify(result).includes('secret'));
  }
});
test('definitive rejection is failed and DeviceNotRegistered is preserved without raw token-bearing text', async () => {
  const result = await expo.sendExpoPush(message, {}, async () => Response.json({ data: { status: 'error', message: 'ExpoPushToken[private_token] is not registered', details: { error: 'DeviceNotRegistered' } } }));
  assert.equal(result.status, 'failed'); assert.equal(result.errorCode, 'DeviceNotRegistered'); assert.ok(!JSON.stringify(result).includes('private_token'));
  assert.equal((await expo.sendExpoPush(message, {}, async () => new Response('{}', { status: 400 }))).status, 'failed');
});
test('receipts distinguish provider handoff, rejection and missing receipt', async () => {
  const results = await expo.readExpoReceipts(['ok', 'bad', 'missing'], {}, async () => Response.json({ data: { ok: { status: 'ok' }, bad: { status: 'error', message: 'private', details: { error: 'DeviceNotRegistered' } } } }));
  assert.equal(results.ok.status, 'provider_received'); assert.equal(results.bad.errorCode, 'DeviceNotRegistered'); assert.equal(results.missing.status, 'pending');
});
test('worker disabled gates and invalid security configuration cannot claim or send', async () => {
  const db = database(); const api = worker(db);
  assert.equal((await api.runNotificationJob({ env: {}, database: db })).status, 'disabled'); assert.equal(db.calls.length, 0);
  await assert.rejects(api.runNotificationJob({ env: { NOTIFICATIONS_ENABLED: 'true', EXPO_PUSH_SECURITY_REQUIRED: 'true' }, database: db })); assert.equal(db.calls.length, 0);
  const disabled = database({ list_member_push_admin: { enabled: false } });
  assert.equal((await api.runNotificationJob({ env, database: disabled })).status, 'disabled_in_database'); assert.deepEqual(disabled.calls.map(([name]) => name), ['list_member_push_admin']);
});
test('prepare revalidation suppresses stale eligible claims without contacting Expo', async () => {
  const db = database({ prepare_member_push_notification: { ready: false, reason: 'preferences_changed' } });
  const result = await worker(db).runNotificationJob({ env, database: db, request: () => { throw new Error('No send allowed'); } });
  assert.equal(result.deliveries[0].status, 'skipped'); assert.ok(!db.calls.some(([name]) => name === 'finish_member_push_notification'));
});
test('worker records accepted tickets, unknown outcomes and device rejection once with claim ownership', async () => {
  for (const [response, outcome, code] of [[() => Response.json({ data: { status: 'ok', id: 'ticket-1' } }), 'sent', null], [() => { throw new Error('timeout'); }, 'unknown', 'NetworkOutcomeUnknown'], [() => Response.json({ data: { status: 'error', details: { error: 'DeviceNotRegistered' } } }), 'failed', 'DeviceNotRegistered']]) {
    const db = database(); let sends = 0;
    await worker(db).runNotificationJob({ env, database: db, request: async () => { sends++; return response(); } });
    assert.equal(sends, 1); const finishes = db.calls.filter(([name]) => name === 'finish_member_push_notification'); assert.equal(finishes.length, 1);
    assert.equal(finishes[0][1]._claim_token, claim.claim_token); assert.equal(finishes[0][1]._outcome, outcome); assert.equal(finishes[0][1]._error_code, code);
  }
});
test('lost database acknowledgement is unconfirmed and never resubmits', async () => {
  const db = database({ finish_member_push_notification: () => ({ data: null, error: { message: 'lost' } }) }); let calls = 0;
  const result = await worker(db).runNotificationJob({ env, database: db, request: async () => { calls++; return Response.json({ data: { status: 'ok', id: 'ticket-1' } }); } });
  assert.equal(result.deliveries[0].status, 'unconfirmed'); assert.equal(calls, 1);
});
test('receipt polling uses receipt claim credentials and maps provider handoff without claiming it displayed', async () => {
  const db = database({ claim_member_push_receipts: [{ delivery_id: 'd', receipt_claim_token: 'receipt-secret', provider_id: 'ticket-1' }], claim_member_push_notifications: [] });
  await worker(db).runNotificationJob({ env, database: db, request: async () => Response.json({ data: { 'ticket-1': { status: 'ok' } } }) });
  const finish = db.calls.find(([name]) => name === 'finish_member_push_receipt')[1]; assert.equal(finish._status, 'ok'); assert.equal(finish._receipt_claim_token, 'receipt-secret');
  assert.equal(db.calls.find(([name]) => name === 'claim_member_push_receipts')[1]._limit, 25);
});
test('receipt timeout never resends a notification; expired run stops before normal claims', async () => {
  const db = database({ claim_member_push_receipts: [{ delivery_id: 'd', receipt_claim_token: 'r', provider_id: 'ticket-1' }] }); let tick = 0;
  const result = await worker(db).runNotificationJob({ env, database: db, now: () => tick++ === 0 ? 0 : 46000, request: async () => { throw new Error('lookup failed'); } });
  assert.equal(result.status, 'time_budget_reached'); assert.ok(!db.calls.some(([name]) => name === 'claim_member_push_notifications'));
});
test('self-test is separately gated and queues only the supplied verified identity', async () => {
  const db = database(); const api = worker(db);
  await assert.rejects(api.runOwnPushTest('admin-id', { env, database: db })); assert.equal(db.calls.length, 0);
  await api.runOwnPushTest('admin-id', { env: { ...env, NOTIFICATIONS_TEST_ENABLED: 'true' }, database: db, request: async () => Response.json({ data: { status: 'ok', id: 'ticket-test' } }) });
  assert.deepEqual(copy(db.calls[0]), ['queue_member_push_test', { _user_id: 'admin-id' }]);
});
test('admin serializers never include token, claim, provider raw error or installation identifiers', () => {
  const raw = { enabled: true, expo_push_token: 'secret', deliveries: [{ delivery_id: 'd', expo_push_token: 'secret', claim_token: 'claim', error: 'secret', title: 'ExpoPushToken[secret]' }] };
  const serialized = JSON.stringify(view.adminNotificationView(raw)); assert.ok(!serialized.includes('secret')); assert.ok(!serialized.includes('claim_token'));
  const preview = JSON.stringify(view.notificationPreviewView({ eligible: true, installation_id: 'private', to: 'secret', event_key: 'internal', claim_token: 'claim' })); assert.ok(!preview.includes('private')); assert.ok(!preview.includes('secret')); assert.ok(!preview.includes('event_key'));
});
const next = { NextResponse: { json: (value, options) => new Response(JSON.stringify(value), options) } };
function adminRoute(auth, flags = { self_test_enabled: true, provider_configured: true }) {
  const calls = []; const ownTests = [];
  const deps = { 'next/server': next, '@/lib/reports/access': { reportAuthorization: async () => auth, privateHeaders: { 'Cache-Control': 'private, no-store' } }, '@/lib/exports/adminClient': { supabaseAdmin: { rpc: async (name, args) => { calls.push([name, args]); return { data: { eligible: true }, error: null }; } } }, '@/lib/notifications/pushWorker': { notificationFlags: () => flags, runOwnPushTest: async userId => { ownTests.push(userId); return { status: 'accepted' }; } }, '@/lib/notifications/adminView': view };
  return { api: load('app/api/superadmin/notifications/route.ts', deps), calls, ownTests };
}
const request = body => new Request('https://example.test/api/superadmin/notifications', { method: body ? 'POST' : 'GET', ...(body ? { body: JSON.stringify(body) } : {}) });
test('unauthenticated users and non-admins cannot inspect, preview or test', async () => {
  for (const [auth, status] of [[null, 401], [{ admin: false, user: { id: 'member' } }, 403]]) {
    const route = adminRoute(auth); assert.equal((await route.api.GET(request())).status, status);
    assert.equal((await route.api.POST(request({ action: 'self_test', confirm: true }))).status, status); assert.equal(route.calls.length + route.ownTests.length, 0);
  }
});
test('admin preview has only a read RPC; tests ignore no recipient fields because those fields are rejected', async () => {
  const route = adminRoute({ admin: true, user: { id: 'verified-admin' } }); const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const response = await route.api.POST(request({ action: 'preview', user_id: id })); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(copy(route.calls), [['preview_member_push', { _user_id: id }]]);
  assert.equal((await route.api.POST(request({ action: 'self_test', confirm: true, user_id: id }))).status, 400);
  assert.equal((await route.api.POST(request({ action: 'self_test', confirm: true, installation_id: id }))).status, 400);
  assert.equal((await route.api.POST(request({ action: 'self_test', confirm: true }))).status, 200); assert.deepEqual(route.ownTests, ['verified-admin']);
  assert.equal((await route.api.POST(request({ action: 'broadcast' }))).status, 400);
});
test('disabled self-test and unconfigured provider do not queue', async () => {
  for (const [flags, status] of [[{ self_test_enabled: false }, 409], [{ self_test_enabled: true, provider_configured: false }, 503]]) {
    const route = adminRoute({ admin: true, user: { id: 'admin' } }, flags); assert.equal((await route.api.POST(request({ action: 'self_test', confirm: true }))).status, status); assert.equal(route.ownTests.length, 0);
  }
});
test('cron requires the configured bearer secret and does not reveal job failure details', async () => {
  let runs = 0;
  const api = load('app/api/notifications/jobs/route.ts', { 'next/server': next, 'node:crypto': { timingSafeEqual }, '@/lib/notifications/pushWorker': { runNotificationJob: async () => { runs++; throw new Error('sensitive provider token'); } } }, { NOTIFICATIONS_CRON_SECRET: 'synthetic-cron' });
  for (const token of ['', 'wrong', 'synthetic-cron-extra']) assert.equal((await api.POST(new Request('https://example.test', { method: 'POST', headers: { authorization: `Bearer ${token}` } }))).status, 401);
  assert.equal(runs, 0);
  const response = await api.GET(new Request('https://example.test', { headers: { authorization: 'Bearer synthetic-cron' } })); assert.equal(response.status, 500); assert.ok(!(await response.text()).includes('sensitive'));
});
