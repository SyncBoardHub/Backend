# Beta testing

## Start locally

1. Copy `frontend/.env.example` to `frontend/.env.local` and add the beta Supabase values.
2. Copy `backend/.env.example` to `backend/.env` and configure the beta API values.
3. Apply the schema and migrations through `migration-v13-team-approvals.sql` in order.
4. Start the API with `npm start` inside `backend`.
5. Start the client with `npm run dev` inside `frontend`.

## Minimum beta checks

- Create an account only after accepting the Terms and Privacy Policy links.
- Create a team, join it with an invite code, and verify member visibility.
- Open the workspace invite link in a signed-out browser, then join once after signing in.
- Test copy, native share, WhatsApp, email, and message invite actions; owners should also test regeneration and revocation.
- Confirm a join request remains pending until the leader approves it, then test decline and re-request behavior.
- As leader, remove a member and delete a disposable test team. Confirm a non-leader cannot perform either action.
- Create, assign, edit, complete, and delete a task.
- Check task updates in a second browser session.
- Upload and download a non-sensitive test file.
- Check notes, milestones, notifications, search, and sign-out.
- Change notification preferences in Settings and confirm they persist after refresh.
- Enable and verify authenticator-app MFA in Settings, sign out, and complete the MFA step during sign-in.
- If Resend is configured, verify assignment, accepted-invite, and deadline emails. If it is not configured, verify in-app notifications still work.
- Test light mode, dark mode, mobile width, keyboard-only navigation, and reduced motion.
- Report bugs with route, steps, expected result, actual result, browser, and timestamp.

Do not use real student records, private academic submissions, government IDs, payment information, or confidential files during beta.

## Email and invite configuration

- Set `VITE_PUBLIC_APP_URL` to the beta web origin so copied links use the shareable URL.
- Keep `RESEND_API_KEY` and `RESEND_FROM_EMAIL` on the backend only. Resend is optional; the beta continues with in-app notifications when it is unavailable.
- The implementation caps outbound Resend traffic at the free-tier daily limit. Do not enable paid overages for beta.
- The in-memory rate limiter is suitable for one API instance. Use a shared store such as Redis before running multiple instances.
- The backend requires the server-only `SUPABASE_SERVICE_ROLE_KEY` because it performs authorization before database access. Never place this key in frontend environment variables.
