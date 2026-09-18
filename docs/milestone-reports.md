# Milestone reports: website installation and delivery

Implemented locally. This feature has not been deployed, the database has not been changed, and no notification emails have been sent by the implementation tools. Offboarding is intentionally unchanged.

## Required setup

1. Run the report migration supplied in the app repository: `supabase/migrations/20260917120000_member_reports.sql` (or its release SQL). It starts disabled. The agreed reporting timezone is `America/Edmonton`.
2. Deploy this website through its existing hosting workflow. `npm run build` compiles the authenticated report pages, PDF endpoint, admin controls and guarded job endpoint. No host metadata is committed in this repository, so deployment must use the site's existing host/project rather than an invented new one.
3. Set these server environment variables on that host:

   - Existing Supabase admin and public-client configuration.
   - `REPORTS_ENABLED=true` to allow the scheduled endpoint to run generation.
   - `REPORTS_EMAIL_ENABLED=false` for the initial quiet validation, then `true` to enable delivery.
   - `REPORTS_SITE_URL=https://www.rocketfuelmembers.com` (also the default).
   - `CRON_SECRET`: a long random secret used only by the scheduled endpoint caller.
   - Existing `GHL_PRIVATE_INTEGRATION_TOKEN`, `GHL_LOCATION_ID`, `GHL_EMAIL_FROM`. Milestone notifications have their own template and do not require the offboarding template ID or attachments.

4. Activate report generation explicitly using the migration's activation RPC with `America/Edmonton`, after reviewing the migration's rollout/backfill notes. This does not itself enable the email worker.
5. Schedule `GET https://www.rocketfuelmembers.com/api/reports/jobs` at least hourly, with `Authorization: Bearer <CRON_SECRET>`. Every 15 minutes gives closer milestone timing. Use the existing host's scheduler. For Vercel, merge `deployment/report-cron.example.json` into the site's deployment configuration only when ready; the example alone is inert.
6. Configure native `EXPO_PUBLIC_REPORTS_URL=https://www.rocketfuelmembers.com`. The new app contains the `rocketfuel://reports/{id}` route and PDF handoff. Email links have an authenticated web fallback for older app versions.

Database eligibility follows Edmonton calendar days, including daylight saving time. A report becomes available after the last reporting day closes; its email is eligible no earlier than 09:00 the following Edmonton morning. Hourly UTC scheduling is fine because the database calculates local eligibility, not the cron expression.

## Endpoints and authorization

- `GET /api/reports/{id}`: authenticated owner, or verified superadmin. Optional `revision=N` preserves the requested saved version.
- `GET /api/reports/{id}/pdf?revision=N`: same access, private/no-store PDF. Native uses the session bearer header; web fetches a private blob. Authentication tokens never go into URLs.
- `/reports/{id}`: member web presentation, an explicit Open in Rocketfuel link and PDF download. Login continuation only accepts `/reports/<UUID>`; external redirects are rejected. Pending loads/downloads are invalidated on account changes.
- `GET/POST /api/reports/jobs`: CRON_SECRET only; REPORTS_ENABLED gate; no public generation access.
- `GET/POST /api/superadmin/reports`: existing server-verified superadmin allowlist; preview, correction with reason, and explicit notification resend.

## Notification safety

The database claims each queued delivery with a unique token. The worker sends at most five per run, sequentially, then records provider message identity. The email POST is never automatically retried. Timeout, network failure after submission, 5xx response, or a success without a message ID becomes `unknown`, which requires an administrator to check GoHighLevel and explicitly acknowledge before another send. A lost database acknowledgement similarly leaves the claim unresolved; stale claims become unknown. Definite rejected sends become `failed`; they also require an explicit resend.

One failed email does not hide the saved report. Corrections create a new saved revision without automatically emailing. A resend queues the current revision. The worker uses the exact revision snapshot from its claim.

## PDF and visual system

The PDF is a two-page keepsake from the exact saved revision: goals on page one, business and up to three earned medals on page two. It uses Rocketfuel navy, cream, minimum ticks and optimum bars. Medal artwork is the same SVG tree as the website component, converted to vector PDF. Existing Inter is embedded for Unicode names. No remotely supplied SVG/HTML is evaluated. Long names, amounts and medal titles have bounded typography. The website is a single responsive scrolling report with the same content and numbers.

## Verification

- `node --test tests/milestoneReports.test.mjs tests/achievementRoute.test.mjs`
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`
- `npm run build`
- Preview a completed milestone in Superadmin > Reports before saving corrections or queuing notification sends.
- Validate a synthetic email through a dedicated test recipient only after deployment/configuration; no real-member email is sent as part of local tests.

Local visual QA covers populated, sparse/no-medal, unavailable historical pipeline, long Unicode names, long medal titles and large financial amounts. Real authenticated links and phone PDF handoff need final end-to-end testing against the deployed migration and website.
