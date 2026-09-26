# SyncBoard beta deployment

This deployment keeps the beta on free service tiers and uses one service for each responsibility:

- Netlify hosts the Vite frontend.
- Render runs the Express and Socket.IO API.
- Supabase provides Auth, PostgreSQL, Storage, and Realtime.
- Resend is optional for transactional email and remains disabled unless explicitly configured.

Free tiers can change. Do not add a payment method or enable automatic overages for beta services. Render's free API service can sleep after inactivity, so the first request after a quiet period may be slow and Socket.IO clients must reconnect.

## 1. Supabase

Create one Free project and run the SQL files in this order:

1. `backend/schema.sql`
2. `backend/migration-v2.sql` through `backend/migration-v13-team-approvals.sql` in numeric order
3. `backend/fix-storage.sql` if the private `team-files` bucket still needs its policies

Then configure:

- Email confirmation in Supabase Auth.
- The Netlify site URL and `/reset-password` as an allowed redirect URL.
- The private `team-files` Storage bucket with its application limits.
- Realtime for the tables used by the application.

## 2. Render API

Connect the GitHub repository and use the included `render.yaml`, or configure these values manually:

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/healthz`

Set the variables listed in `backend/.env.example`. `SUPABASE_SERVICE_ROLE_KEY` must stay server-only. Set `CORS_ORIGINS` and `FRONTEND_URL` to the final Netlify HTTPS URL. Leave `RESEND_API_KEY` and `RESEND_FROM_EMAIL` empty unless email delivery is intentionally enabled.

Verify these URLs before connecting the frontend:

- `https://<render-service>.onrender.com/healthz`
- `https://<render-service>.onrender.com/readyz`

## 3. Netlify frontend

Connect the GitHub repository. The included `netlify.toml` sets:

- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback: all routes serve `index.html`

Set the variables listed in `frontend/.env.example`:

- `VITE_API_URL=https://<render-service>.onrender.com`
- `VITE_SOCKET_URL=https://<render-service>.onrender.com`
- `VITE_PUBLIC_APP_URL=https://<netlify-site>.netlify.app`
- Supabase URL and anonymous key
- Beta legal configuration values

Only `VITE_` values belong in Netlify. Never add the service-role, OpenAI, or Resend secret keys there.

## 4. Beta verification

Test the deployed URLs in this order:

1. Load the Netlify home page and refresh `/login`, `/dashboard`, `/settings`, and `/join/<code>`.
2. Register, confirm email, sign in, reset the password, and test optional MFA.
3. Create a workspace, share an invite, submit a join request, and approve it as the owner.
4. Test rejection, member removal, invite regeneration, invite revocation, and team deletion.
5. Test task updates, notifications, file upload, and Socket.IO updates in two browsers.
6. Leave the API idle, then confirm the frontend recovers when Render wakes it.
7. Inspect the frontend bundle and repository for server-only secrets.

Keep registration open for beta. Workspace access remains invitation-based and owner approval remains required for new members.
