# Push notification worker and administration

The implementation starts disabled. Local tests use synthetic data and mocked networking; they never submit a live notification. No deployment, database activation, or live send is part of the local implementation.

## Setup and guarded rollout

1. Apply the app repository's push notification migration and verify its database tests. Leave the database switch disabled. The complete RPC contract is in the app repository's `docs/push-notification-contract.md`.
2. Deploy the website through its existing host/project. Retain the existing Supabase service-role server configuration and `NEXT_PUBLIC_SUPERADMIN_EMAILS` allowlist. Never expose the service role or Expo access token through a `NEXT_PUBLIC_` variable.
3. Set server environment variables explicitly:
   - `NOTIFICATIONS_ENABLED=false` (default unless exactly `true`).
   - `NOTIFICATIONS_TEST_ENABLED=false` (separate self-test gate, also needs the worker and database enabled).
   - `EXPO_PUSH_SECURITY_REQUIRED=true` when enhanced push security is enabled in Expo, with server-only `EXPO_ACCESS_TOKEN`. Set it explicitly to `false` only if enhanced security is deliberately not enabled. Missing/invalid configuration fails before claiming.
   - `NOTIFICATIONS_CRON_SECRET`, or existing `CRON_SECRET`, a long random scheduler secret. The endpoint checks `Authorization: Bearer <secret>` with a timing-safe comparison. If using Vercel's automatic CRON_SECRET header, either leave the dedicated secret unset or set both to the same value.
4. Review Superadmin > Notifications. Member previews do not queue or send. The UI does not include activation, arbitrary recipient tests, broadcasts, or resend actions.
5. Complete native push setup and register a real signed-in administrator device with OS permission. After explicitly enabling database and worker delivery, enable the dedicated self-test gate briefly and choose **Send self-test**. It only targets the verified administrator's own device, regardless of the preview selector. Turn the dedicated flag off afterward.
6. This website uses Vercel Hobby, so use Supabase Cron for the 15-minute schedule. The app repository's `supabase/notification-scheduler-setup.sql` creates `rocketfuel-member-notifications` **paused**, with a private Vault credential named `rocketfuel_notifications_cron_secret`. Save that credential as the sensitive Production variable `NOTIFICATIONS_CRON_SECRET`. The scheduled function posts to `https://www.rocketfuelmembers.com/api/notifications/jobs`, and also checks the database master switch before requesting delivery. Activate the schedule only after physical-device acceptance. Do not merge `deployment/push-cron.example.json` into Vercel configuration on Hobby; it is only an example for plans supporting this frequency. Full setup and activation instructions are in the app repository's `supabase/NOTIFICATIONS.md`.

## Policy and operational behavior

The database owns scheduling, quiet hours, ownership and eligibility: two conditional activity reminders per seven days, three ordinary pushes total in a rolling seven days, at least 24 hours between them, a one-time unread-report reminder at least 24 hours after its first email, and no historical backlog. It rechecks completed work, active course, opt-ins, local time, inactivity backoff and the latest registered device during **prepare**, immediately before the server submits to Expo.

Every run checks the server flag and database activation. It polls up to 25 due receipts and claims at most five ordinary sends, sent sequentially with eight-second Expo timeouts, five-second database request timeouts, and a 45-second processing budget. Receipt acknowledgements check the time budget; normal sends reserve enough time for preparation, submission and acknowledgement before starting. Preparation is single-use. Remaining unprepared claims expire safely. A lost acknowledgement after preparation cannot make that notification sendable again. The server preserves the database's bounded 1–3600 second delivery lifetime so a delayed push does not extend beyond its permitted window.

Expo POST outcomes:

- `sent` in the database / **Accepted by Expo** in the UI: Expo returned a ticket ID. This is not evidence of phone display.
- `failed` / **Rejected**: an explicit provider rejection or invalid payload. No automatic resend.
- `unknown`: timeout, network exception, server error, or an ambiguous/malformed success. Never automatically resend.
- `unconfirmed` in a job result: the attempt happened but saving its outcome failed. Database expiry marks the prepared claim unknown; do not resend.

Receipt polling begins after 15 minutes. An `ok` receipt means the notification was handed to Apple or Google, not displayed or read. Missing receipts are retried as read-only lookups; the database ends polling after 24 hours as `unavailable`. `DeviceNotRegistered` on a ticket or receipt retires only the matching token version, protecting a newer re-registration. Raw provider error messages, tokens, claim credentials and access tokens never enter admin responses or application logs. Unknown outcomes have no UI resend control.

The master disable switch stops new sends. It cannot retract a payload already submitted to Expo. No cross-network system can make a preference change and an external delivery atomic; the immediate database recheck minimizes that interval.

## Troubleshooting

- Both server and database activation must be enabled; valid Expo security configuration is required before any claim.
- Install the native build containing notifications. Expo Go is not a production push acceptance test.
- Verify OS permission, the authenticated account, correct Expo project and matching APNs / FCM credentials.
- Preview the member to inspect the current scheduling exclusion. Quiet hours, logged activity, pause, reminder days, course state, budgets, and inactivity all intentionally suppress reminders.
- An accepted ticket with no banner can reflect OS Focus/settings, foreground behavior, or provider delivery. Check the receipt and the physical phone; do not equate accepted with displayed.
- Provider 401/403: verify enhanced push security and server access token. InvalidCredentials/MismatchSenderId: verify project and Apple/Google credentials. DeviceNotRegistered: reopen the current app and grant notifications again.

## Local verification

`node --test tests/pushNotifications.test.mjs`

`node node_modules/typescript/bin/tsc --noEmit --incremental false`

`npm run build`

Tests exercise the disabled gates, preparation recheck, uncertain network outcomes, receipt handling, server authorization, self-test ownership, and response redaction with mocked requests only. A real device check remains a separate deployment acceptance step.

Provider contract: [Expo push service documentation](https://docs.expo.dev/push-notifications/sending-notifications/).
