# SyncBoard

Project collaboration for college teams.

## Tech Stack

- **Frontend** – React 19 (Vite) + Tailwind CSS v4 + Framer Motion
- **Backend** – Node.js, Express, Socket.io
- **Database & Auth** – Supabase (PostgreSQL + Auth + Storage)
- **Real-Time** – Socket.io for instant sync & presence tracking

## Setup (5 minutes)

### Requirements
- Node.js 20.19+ (required by the current Vite toolchain)
- A [Supabase](https://supabase.com) account & project

### Steps

```bash
# 1. Install backend dependencies
cd backend && npm install && cd ..

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Environment Configuration
# Copy backend/.env.example to backend/.env and set server-only values.
# SUPABASE_SERVICE_ROLE_KEY must never be exposed to the frontend.

# Create a .env file in the /frontend directory:
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000

# 4. Database Setup
# Run schema.sql in Supabase SQL Editor (initial setup)
# Run migration-v2.sql (notifications + GitHub integration)
# Run migration-v3.sql (cloud storage)
# Run migration-v4.sql, migration-v5-files.sql, migration-v6-diagrams.sql
# Run migration-v7-security.sql (RLS, task timestamps, production hardening)
# Run migration-v8-remove-gamification.sql (remove XP and achievement data)
# Run migration-v9-activity.sql (project activity history)
# Run migration-v10-milestones.sql (milestones and task linkage)
# Run migration-v11-legal-compliance.sql (policy acceptance timestamps)

# 5. Supabase Storage
# Go to Supabase Dashboard → Storage → Create Bucket
# Name: team-files  |  Public: false  |  Max size: 50MB

# Add `${FRONTEND_URL}/reset-password` to Supabase Auth → URL Configuration → Redirect URLs.

# 6. Start the backend
cd backend
npm start

# 7. Start the frontend (in a new terminal)
cd frontend
npm run dev
```

For production, set `NODE_ENV=production`, configure `CORS_ORIGINS`, set
`FRONTEND_URL`, set `ADMIN_USER_IDS`, build the frontend with `npm run build`,
and serve the built frontend from a host listed in `CORS_ORIGINS`. The backend
requires `SUPABASE_SERVICE_ROLE_KEY` in production. Configure your platform
health checks to use `GET /healthz` for process health and `GET /readyz` for
database readiness.

The optional AI copilot uses the server-only `OPENAI_API_KEY` and `OPENAI_MODEL` settings. Without a key, the workspace keeps a useful local prioritization fallback; the key enables contextual planning and summaries through the backend.

## Before production launch

Set the production values in `frontend/.env.production` for the HTTPS public domain, legal entity, privacy contact email, business address, and policy version. Run `npm run check:release` from `frontend`; it intentionally fails while any value is a placeholder. Connect the custom domain and configure the same origin in `backend/CORS_ORIGINS`, `backend/FRONTEND_URL`, and Supabase Auth redirect URLs.

The public app currently has no analytics, advertising trackers, third-party embeds, or stock images. Essential browser storage is disclosed by the cookie notice. If non-essential tracking is added later, update the cookie policy and obtain consent before loading it.

The legal pages are implementation templates, not legal advice. Have an India-qualified lawyer review the Privacy Policy, Terms, Cookie Policy, Refund Policy, retention periods, processor contracts, grievance process, and DPDP Act/Rules obligations before launch.

## Features

- ✅ **Authentication** – Secure Login / Register and Forgot Password flow via Supabase Auth.
- 👥 **Teams** – Create teams, invite members via code, manage permissions (Leader/Member).
- ✅ **Tasks** – Create, assign, track, start/stop timers, and mark complete. Team Leaders can extend task deadlines.
- 📊 **Analytics** – Data visualization of completion rates, task status, and member workload.
- 📅 **Timeline** – Gantt-style visual task scheduling view.
- 📝 **Notes** – Collaborative notes with auto-save.
- ☁️ **Files** – Upload and manage team documents via Supabase Cloud Storage.
- 🔍 **Search** – Full-text search across tasks and notes.
- 🔔 **Notifications** – In-app real-time notification panel.
- 🔗 **GitHub Integration** – Browse team repositories and read files directly from the dashboard.
- ⚡ **Real-Time** – WebSocket sync + presence indicators powered by Socket.io.

## Project Structure

```
syncboard/
├── backend/            # Express + Socket.io backend API
│   ├── server.js       # Main server file
│   ├── schema.sql      # Initial database schema
│   ├── migration-v2.sql# Notifications + GitHub
│   ├── migration-v3.sql# Cloud storage
│   ├── .env            # Backend environment variables
│   └── package.json    # Backend dependencies
├── frontend/           # React 19 (Vite) frontend (previously 'client')
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Auth, Dashboard
│   │   ├── lib/        # API, Supabase, Socket helpers
│   │   └── main.jsx    # Entry point
│   └── .env            # Frontend environment variables
└── README.md           # This file
```

## Real-Time Testing

Open the app in two different browser tabs (or standard/incognito), log in as two different users in the same team, and watch changes sync instantly between them!
