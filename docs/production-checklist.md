# SyncBoard production checklist

## Before deployment

- Run database migrations v7 through v13 in order.
- Set `NODE_ENV=production` on the API.
- Configure `SUPABASE_SERVICE_ROLE_KEY` only on the backend.
- Set exact frontend origins in `CORS_ORIGINS`.
- Set `FRONTEND_URL` to the deployed web URL.
- Set `VITE_PUBLIC_APP_URL` to the HTTPS web origin used in invite links.
- Configure `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` only if email notifications are enabled. Keep Resend paid overages disabled.
- Add `${FRONTEND_URL}/reset-password` to Supabase Auth redirect URLs.
- Create the private `team-files` storage bucket with a 50MB limit.
- Configure `ADMIN_USER_IDS` with approved administrator UUIDs.
- Set `OPENAI_API_KEY` only if the AI copilot is enabled.

## Health checks

- Use `GET /healthz` for process/liveness checks.
- Use `GET /readyz` for database readiness checks.
- Route 5xx responses and server errors to an error-monitoring service.
- Preserve server logs for enough time to investigate failed submissions.

## Release verification

- Run `npm run check` in `frontend`.
- Run `npm run check` and `npm test` in `backend`.
- Test registration, login, logout, and password recovery.
- Test creating a project space and joining with an invite code.
- Test invite links, share targets, owner regeneration, and owner revocation.
- Test pending join approval, rejection, member removal, and owner-only team deletion.
- Test notification preference persistence and optional authenticator-app MFA.
- Test milestone creation and assigning a task to it.
- Test task updates in two authenticated browser sessions.
- Test file upload, download, and deletion.
- Confirm unauthorized users cannot access another team’s data.
- Confirm mobile navigation and light mode remain usable.

## Data safety

- Enable scheduled Supabase database backups.
- Test restoring a backup before the first real student cohort uses the system.
- Define a process for workspace export and deletion requests.
- Never place service-role or AI keys in frontend environment variables.
# Production release checklist

- [ ] Connect and verify the custom HTTPS domain.
- [ ] Set production-specific legal entity, contact email, business address, and policy version values.
- [ ] Run `npm run check:release` from `frontend`.
- [ ] Apply `backend/migration-v11-legal-compliance.sql`, `backend/migration-v12-invitations-notifications.sql`, and `backend/migration-v13-team-approvals.sql` after the earlier migrations.
- [ ] Keep `SUPABASE_SERVICE_ROLE_KEY` server-only and configure CORS and Auth redirects.
- [ ] Require Supabase email confirmation and verify MFA enrollment, challenge, and disable flows.
- [ ] Replace memory-backed rate limiting with a shared store before using more than one API instance.
- [ ] Have India-qualified counsel review the legal pages and DPDP Act/Rules compliance.
- [ ] Confirm no analytics, advertising trackers, embeds, unsupported claims, fake metrics, reviews, or unlicensed images are shipped.
- [ ] Run keyboard, reduced-motion, contrast, mobile, and screen-reader checks on the production build.
