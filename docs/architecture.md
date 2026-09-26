# SyncBoard architecture

## Repository layout

- `frontend/`: React and Vite client application.
- `backend/`: Express and Socket.IO API server.
- `backend/schema.sql`: baseline Supabase schema.
- `backend/migration-v*.sql`: ordered database changes. Apply them in version order.
- `frontend/src/pages/`: route-level screens.
- `frontend/src/features/`: task and team feature modules.
- `frontend/src/components/`: shared UI and dashboard panels.
- `frontend/src/lib/`: API, Supabase, socket, theme, and reusable client helpers.
- `frontend/src/config/`: runtime and legal configuration.
- `docs/`: architecture, beta, and release documentation.
- `.github/workflows/`: automated frontend and backend checks.

## Runtime boundaries

The browser may contain only `VITE_` values and the Supabase anonymous key. Service-role, OpenAI, database, and administrative credentials stay in the backend environment. The browser calls the API through `VITE_API_URL` and real-time events through `VITE_SOCKET_URL`.

## Beta boundary

Beta mode is enabled unless `VITE_APP_ENV=production` is explicitly set. Beta displays a warning and is not a promise of availability, data retention, or deadline-critical backup. Do not collect real sensitive data until the privacy, security, retention, and incident processes have been reviewed.
