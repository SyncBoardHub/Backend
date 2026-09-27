# Project Analysis Report

> Generated: 27 September 2026  
> Scope: `c:\Desktop\Sync` (SyncBoard) and `c:\Desktop\Sync\akshat_backend\TeamSync` (TeamSync)

---

# PHASE 1 — SyncBoard (Main Repo)

> **Repository:** `c:\Desktop\Sync`  
> **GitHub:** https://github.com/Soumyaranjan24/SyncBoard  
> **Status:** Beta

---

## 1.1 Project Overview

SyncBoard is a **collaborative project workspace** designed for college student teams. Its core purpose is to consolidate task management, file sharing, notes, notifications, and team presence into a single shared workspace — eliminating the chaos of work scattered across chats and personal reminders.

**Target Users:** Small student teams (3–10 members) working on assignments, research projects, and coursework.

---

## 1.2 Architecture Overview

```
React + Vite (Frontend)
        │
        │  REST API + Supabase Auth Session
        ▼
Express + Socket.IO (Backend)
        │
        ├──► Supabase Auth       (identity & sessions)
        ├──► Supabase PostgreSQL (app data)
        ├──► Supabase Storage   (private team files)
        └──► OpenAI API         (optional AI assistant, server-only)
```

**Key design principle:** The browser holds only `VITE_` values and the Supabase anonymous key. Service-role keys, OpenAI API key, and Resend keys are strictly backend-only, never exposed to the client.

---

## 1.3 Repository Structure

```
SyncBoard/
├── frontend/                   React + Vite client
│   ├── src/
│   │   ├── App.jsx             Root router and layout
│   │   ├── main.jsx            React entry point
│   │   ├── index.css           Global styles (66 KB — substantial)
│   │   ├── pages/              7 route-level screens
│   │   ├── components/         21 shared UI panels + ui/ subdir
│   │   ├── features/           Domain modules (tasks/, team/)
│   │   ├── context/            Toast context (ToastContext.jsx)
│   │   ├── hooks/              useToast.js
│   │   ├── lib/                API, auth, socket, theme helpers
│   │   └── config/             Runtime and legal config
│   ├── scripts/                Beta & release config checks
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
│
├── backend/                    Express + Socket.IO server
│   ├── server.js               Single-file API (102 KB — monolithic)
│   ├── schema.sql              Baseline Supabase schema
│   ├── migration-v2.sql        through migration-v13 (13 migrations)
│   ├── email.js                Email helper (Resend)
│   ├── fix-storage.sql         Storage bucket fix
│   ├── run-migration-temp.js   One-off migration runner
│   ├── package.json
│   └── test/                   Backend contract tests
│
├── docs/
│   ├── architecture.md         Runtime boundary documentation
│   ├── beta-deployment.md      Deployment guide
│   ├── beta-testing.md         Beta testing guidance
│   └── production-checklist.md Pre-production checklist
│
├── .github/workflows/          CI: lint, build, syntax check, tests
├── netlify.toml                Frontend deployment config (Netlify)
├── render.yaml                 Backend deployment config (Render)
├── test-fetch.js               Manual fetch test script
└── README.md
```

---

## 1.4 Frontend Deep Dive

### Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.4 | UI framework |
| Vite | 8.0.4 | Build tool & dev server |
| Tailwind CSS | v4.2.2 | Styling |
| React Router DOM | 7.14.0 | Client-side routing |
| Socket.IO Client | 4.8.3 | Real-time updates |
| Supabase JS | 2.103.0 | Auth & DB client |
| Framer Motion | 12.38.0 | Animations |
| @xyflow/react | 12.10.2 | Diagrams / React Flow |
| Lucide React | 1.8.0 | Icon library |
| Zustand | 4.5.7 | Global state management |
| html-to-image | 1.11.13 | Whiteboard export |

### Pages (7 route-level screens)

| File | Size | Description |
|---|---|---|
| `Dashboard.jsx` | 18 KB | Main workspace — task board, panels, presence |
| `Settings.jsx` | 17 KB | Profile, workspace, theme settings |
| `Auth.jsx` | 10 KB | Login / Register |
| `Legal.jsx` | 7.6 KB | Terms of service, privacy policy |
| `InvitePage.jsx` | 5.2 KB | Team invite flow |
| `Landing.jsx` | 3.9 KB | Public landing page |
| `ResetPassword.jsx` | 3.7 KB | Password reset flow |

### Components (21 panels)

| Component | Size | Description |
|---|---|---|
| `WhiteboardPanel.jsx` | 18.6 KB | Collaborative whiteboard (React Flow based) |
| `FilesPanel.jsx` | 16 KB | Team file uploads and management |
| `GitHubPanel.jsx` | 8.4 KB | GitHub repo browser |
| `TeamHealthSummary.jsx` | 6.5 KB | Team productivity overview |
| `WorkspaceOverview.jsx` | 6.6 KB | Workspace stats |
| `MilestonesPanel.jsx` | 6.3 KB | Milestone tracking |
| `AnalyticsPanel.jsx` | 7.6 KB | Task analytics and charts |
| `NotesPanel.jsx` | 7.3 KB | Shared team notes |
| `UserProfile.jsx` | 5.6 KB | User profile management |
| `NotificationsDropdown.jsx` | 5.5 KB | In-app notification feed |
| `SearchBar.jsx` | 4.5 KB | Global search (tasks & notes) |
| `AiCopilotPanel.jsx` | 4.1 KB | AI assistant panel |
| `ActivityTimeline.jsx` | 2.9 KB | Activity event history |
| `ProfileMenu.jsx` | 3.2 KB | Avatar + menu dropdown |
| `QuickAddTask.jsx` | 3.3 KB | Fast task creation modal |
| `ErrorBoundary.jsx` | 1.3 KB | React error fallback |
| `ThemeToggle.jsx` | 0.6 KB | Light/dark/system toggle |
| `BetaBanner.jsx` | 0.4 KB | Beta warning banner |
| `CookieNotice.jsx` | 1 KB | Cookie consent notice |
| `LegalFooter.jsx` | 0.4 KB | Footer with legal links |
| `BrandMark.jsx` | 0.4 KB | Logo component |

### Feature Modules
- `features/tasks/` — Task creation, editing, status management, timers, deadlines
- `features/team/` — Team member management, roles, invitations

### State Management
- **Zustand** for global client state
- **React Context** for toast notifications (`ToastContext.jsx`)
- **Socket.IO** for real-time sync

### Environment Variables (Frontend)

```env
VITE_APP_ENV=beta
VITE_RELEASE_CHANNEL=beta
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
VITE_PUBLIC_APP_URL=
VITE_LEGAL_ENTITY_NAME=
VITE_LEGAL_CONTACT_EMAIL=
VITE_LEGAL_BUSINESS_ADDRESS=
VITE_LEGAL_EFFECTIVE_DATE=
VITE_LEGAL_POLICY_VERSION=
```

---

## 1.5 Backend Deep Dive

### Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Node.js | (runtime) | Server runtime |
| Express | 4.18.2 | REST API framework |
| Socket.IO | 4.7.2 | Real-time events & presence |
| Supabase JS | 2.100.0 | DB + Auth client |
| Helmet | 8.1.0 | Security headers |
| express-rate-limit | 8.3.1 | Request throttling |
| Multer | 2.1.1 | File upload handling |
| UUID | 9.0.0 | ID generation |
| dotenv | 17.3.1 | Environment config |
| CORS | 2.8.5 | Cross-origin handling |

### Architecture Pattern
- **Monolithic single file:** All API routes live in `server.js` (102 KB)
- Supabase handles auth verification and data storage
- Socket.IO handles real-time workspace events and team presence

### API Route Groups

| Group | Endpoints |
|---|---|
| Auth | Register, Login, Logout, Forgot Password, Reset Password |
| Profile | Get profile, Update profile, Avatar |
| Teams | Create, Get, Update, Delete, Invite, Join, Members, Approvals |
| Tasks | CRUD, Status updates, Timer start/stop, Assign, Milestone link |
| Notes | CRUD |
| Files | Upload (Multer + Supabase Storage), Download, Delete |
| Milestones | Create, Update, Delete, Status |
| Activity | Get activity timeline |
| Notifications | Get, Mark read |
| Search | Full-text search across tasks and notes |
| GitHub | Repo browser proxy |
| AI | OpenAI assistant (server-side only) |
| Health | `/health`, `/ready` endpoints |

### Environment Variables (Backend)

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # server-only, never client
CORS_ORIGINS=
FRONTEND_URL=
ADMIN_USER_IDS=
OPENAI_API_KEY=                # server-only
OPENAI_MODEL=gpt-5-mini
RESEND_API_KEY=                # email service
RESEND_FROM_EMAIL=
LEGAL_POLICY_VERSION=
```

### Security Measures
- **Helmet** for HTTP security headers
- **express-rate-limit** on auth and write routes
- **Team-scoped access control** — membership verified before any workspace data access
- **Input sanitization** via `sanitize()` wrapper
- **Service role key** strictly backend-only
- **RLS enabled** on all Supabase tables

---

## 1.6 Database Schema

### Tables

| Table | Key Columns | Description |
|---|---|---|
| `profiles` | `id`, `user_id`, `name`, `email`, `avatar`, `terms_accepted_at` | User profiles extending Supabase Auth |
| `teams` | `id`, `name`, `invite_code`, `owner_id` | Team workspaces |
| `team_members` | `team_id`, `user_id`, `joined_at` | Membership junction table |
| `tasks` | `id`, `team_id`, `title`, `status`, `assignee_id`, `due_date`, `timer_running`, `milestone_id` | Task items with timer support |
| `notes` | `id`, `team_id`, `title`, `content`, `author_id` | Shared team notes |
| `files` | `id`, `team_id`, `name`, `stored_name`, `uploaded_by` | File metadata |
| `diagrams` | `id`, `team_id`, `title`, `diagram_data` (JSONB) | Whiteboard/diagram data |
| `activity_events` | `id`, `team_id`, `actor_id`, `entity_type`, `action`, `metadata` | Audit/activity log |
| `milestones` | `id`, `team_id`, `name`, `due_date`, `status` | Project milestones |

### Migrations History (13 migrations)

| Migration | Description |
|---|---|
| `schema.sql` | Baseline schema |
| `migration-v2.sql` | Initial additions |
| `migration-v3.sql` | Extended task/team fields |
| `migration-v4.sql` | Minor patch |
| `migration-v5-files.sql` | File storage support |
| `migration-v6-diagrams.sql` | Whiteboard/diagram table |
| `migration-v7-security.sql` | RLS and security hardening |
| `migration-v8-remove-gamification.sql` | Removed XP/gamification |
| `migration-v9-activity.sql` | Activity event log |
| `migration-v10-milestones.sql` | Milestone tracking |
| `migration-v11-legal-compliance.sql` | Legal/policy fields |
| `migration-v12-invitations-notifications.sql` | Invite system & notifications |
| `migration-v13-team-approvals.sql` | Team join approval workflow |

---

## 1.7 Deployment Configuration

| Target | Config File | Notes |
|---|---|---|
| Frontend | `netlify.toml` | Netlify deploy |
| Backend | `render.yaml` | Render.com deploy |
| CI | `.github/workflows/` | Lint + build + syntax check + tests |

### CI Pipeline
- **Frontend:** ESLint → Vite build
- **Backend:** Node.js syntax check → `node --test` contract tests

---

## 1.8 Notable Features & Engineering Highlights

1. **Real-time presence** — Socket.IO broadcasts team member online status and workspace events
2. **Task timers** — Built-in `timer_running` + `timer_start` fields for live time tracking
3. **Milestones** — Tasks linked to milestones for project-level deadline tracking
4. **Whiteboard** — React Flow-based collaborative whiteboard with `html-to-image` export
5. **GitHub integration** — Browse linked repos directly in-app
6. **AI Copilot** — OpenAI-powered assistant, strictly server-side
7. **Legal compliance** — Cookie notice, terms acceptance timestamps, policy versioning
8. **Beta safeguards** — `VITE_APP_ENV=beta` check, beta banner, config check scripts
9. **Invite approval workflow** — Join requests go through owner approval (migration v13)
10. **Resend email fallback** — Falls back to in-app notifications if Resend is unconfigured

---

## 1.9 Current State & Gaps

**Strengths:**
- Clean, well-documented architecture
- Strong security posture (RLS, Helmet, rate limiting, server-only secrets)
- Comprehensive migration history showing thoughtful evolution
- Legal compliance groundwork (terms, privacy, cookie consent)
- Real-world deployment config (Netlify + Render)

**Gaps / Observations:**
- `server.js` is a 102 KB monolith — should be refactored into route modules
- `index.css` is 66 KB — likely has unused or redundant styles
- Gamification was removed (migration-v8) — sign of pivoting during development
- Tests are "contract tests" only — no unit or integration test coverage visible
- No Docker setup for local development

---
---
---

# PHASE 2 — TeamSync (akshat_backend)

> **Repository:** `c:\Desktop\Sync\akshat_backend\TeamSync`  
> **GitHub:** https://github.com/Akshat10295/TeamSync  
> **License:** MIT — Developed by Akshat and the TeamSync Team

---

## 2.1 Project Overview

TeamSync is a **distributed, real-time collaborative IDE** — a significantly more technically complex project than SyncBoard. It combines VS Code-like code editing, Google Docs-style real-time collaboration via CRDTs, Docker-sandboxed code execution, a shared collaborative terminal, and GitHub integration — all in one cloud-native platform.

**Target Users:** Distributed dev teams needing a fully featured cloud IDE without local setup.

---

## 2.2 Architecture Overview

```
Client (React + Vite + Yjs CRDT)
        │
        ▼
Nginx (Reverse Proxy / Load Balancer) :8080
        │
        ├──► Frontend static files
        └──► API Server :3000
                │
                ├──► Socket.IO (collaboration events)
                │       └──► Redis Pub/Sub Backplane (horizontal scaling)
                │
                ├──► Yjs WebSocket Server /yjs/* (CRDT document sync)
                │       └──► LevelDB Persistence (survive server restarts)
                │
                ├──► Supabase Auth + PostgreSQL
                │
                ├──► Docker Execution Engine (sandboxed code runs)
                │       └──► Ephemeral containers: Python, JS, Java, C++
                │
                └──► Terminal Service (collaborative xterm.js shell)
```

---

## 2.3 Repository Structure

```
TeamSync/
├── backend/
│   ├── src/
│   │   ├── index.js            Entry point (118 lines) — clean & modular
│   │   ├── routes/
│   │   │   └── api.js          All REST routes (2441 lines, 84 KB)
│   │   ├── config/             Environment & DB config
│   │   ├── middlewares/        Auth middleware
│   │   └── utils/
│   │       ├── supabase.js         Supabase client (admin + anon)
│   │       ├── executionEngine.js  Docker code runner
│   │       ├── githubService.js    GitHub API (fetch, commit, push)
│   │       ├── aiService.js        Gemini AI integration
│   │       ├── redis.js            Redis cache client
│   │       └── terminalService.js  xterm.js terminal backend
│   ├── Dockerfile
│   ├── schema.sql              DB schema (7 core tables)
│   ├── migration-v*.sql        8 migrations
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx             Router
│   │   ├── components/         22 components (incl. full IDE workspace)
│   │   ├── pages/              5 route screens
│   │   ├── lib/                Helpers
│   │   └── assets/
│   ├── Dockerfile
│   └── package.json
│
├── ARCHITECTURE.md             Detailed distributed systems design (14 KB)
├── docker-compose.yml          Full local stack (frontend + backend + redis + nginx)
├── nginx.conf                  Reverse proxy config
└── README.md
```

---

## 2.4 Frontend Deep Dive

### Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.4 | UI framework |
| Vite | 8.0.4 | Build tool |
| Tailwind CSS | v4.2.2 | Styling |
| React Router DOM | 7.14.0 | Routing |
| Socket.IO Client | 4.8.3 | Real-time events |
| Supabase JS | 2.103.0 | Auth & DB |
| Framer Motion | 12.38.0 | Animations |
| **@monaco-editor/react** | 4.7.0 | **VS Code editor engine** |
| **Yjs** | 13.6.30 | **CRDT collaborative editing** |
| **y-monaco** | 0.1.6 | **Yjs ↔ Monaco binding** |
| **y-websocket** | 1.5.0 | **Yjs ↔ WebSocket transport** |
| **xterm** | 5.3.0 | **Terminal emulator** |
| **xterm-addon-fit** | 0.8.0 | **Terminal auto-resize** |
| @xyflow/react | 12.10.2 | Diagrams |
| html-to-image | 1.11.13 | Whiteboard export |
| lucide-react | 1.14.0 | Icons |

### Pages (5 screens)

| File | Size | Description |
|---|---|---|
| `IdePage.jsx` | 20.5 KB | **Full collaborative IDE** — Monaco + terminal + file explorer |
| `Dashboard.jsx` | 18.7 KB | Project dashboard — task board, team, analytics |
| `Auth.jsx` | 18.2 KB | Login / Register (richer than SyncBoard's) |
| `ResetPassword.jsx` | 7.4 KB | Password reset |
| `Landing.jsx` | 6.6 KB | Public landing page |

### Components (22)

| Component | Size | Description |
|---|---|---|
| `TaskBoard.jsx` | 24.2 KB | Kanban board with drag-and-drop |
| `WhiteboardPanel.jsx` | 18.7 KB | Collaborative whiteboard |
| `IdeWorkspace.jsx` | 15 KB | Monaco editor + Yjs CRDT wiring |
| `FocusMode.jsx` | 14.6 KB | Distraction-free coding environment |
| `FilesPanel.jsx` | 15 KB | File management |
| `FileExplorer.jsx` | 13.5 KB | IDE sidebar file tree |
| `UserProfile.jsx` | 10.7 KB | Extended profile (XP, achievements) |
| `TeamManager.jsx` | 11 KB | Team management |
| `AnalyticsPanel.jsx` | 8 KB | Project analytics |
| `NotesPanel.jsx` | 8 KB | Team notes |
| `GitHubPanel.jsx` | 7.4 KB | GitHub repo browser |
| `Terminal.jsx` | 6.5 KB | xterm.js collaborative shell |
| `AchievementsPanel.jsx` | 5 KB | Gamification achievements |
| `AchievementToast.jsx` | 4.8 KB | Achievement popup |
| `AiSidebar.jsx` | 4.1 KB | Gemini AI assistant |
| `NotificationsDropdown.jsx` | 4.4 KB | Notifications |
| `QuickAddTask.jsx` | 4.4 KB | Fast task modal |
| `SearchBar.jsx` | 4.5 KB | Global search |
| `XpBar.jsx` | 3.2 KB | Experience points progress bar |
| `XpNotification.jsx` | 1.9 KB | XP gain popup |
| `DailyProgress.jsx` | 1.5 KB | Daily progress tracker |
| `Skeleton.jsx` | 1.3 KB | Loading skeleton |

---

## 2.5 Backend Deep Dive

### Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Node.js 20 | runtime | Server |
| Express | 4.18.2 | REST API |
| Socket.IO | 4.7.2 | Real-time events |
| **@socket.io/redis-adapter** | 8.3.0 | **Horizontal WebSocket scaling** |
| **ioredis / redis** | 5.x | **Redis client (caching + pub/sub)** |
| **Yjs** | 13.6.30 | **CRDT document server** |
| **y-websocket** | 1.5.0 | **Yjs WS transport** |
| **y-leveldb** | 0.2.0 | **LevelDB Yjs persistence** |
| ws | 8.20.1 | Raw WebSocket for Yjs |
| **Dockerode** | 5.0.0 | **Docker API — code execution** |
| **@google/generative-ai** | 0.24.1 | **Gemini AI** |
| Supabase JS | 2.100.0 | Auth + DB |
| Helmet | 8.1.0 | Security headers |
| express-rate-limit | 8.3.1 | Rate limiting |
| Multer | 2.1.1 | File uploads |
| axios | 1.16.0 | HTTP client |
| tmp | 0.2.5 | Temp file management (for exec) |

### Server Entry Point (`src/index.js`) — Key Initialization Steps

1. Initializes Socket.IO with **Redis Adapter** for horizontal scaling
2. Spawns a **separate WebSocket server** (`ws`) for Yjs document sync on `/yjs/*`
3. Sets up **LevelDB persistence** for Yjs documents — edits survive server restarts
4. Seeds Yjs documents from Supabase DB on first connection (from `ide_files` table)
5. Routes upgrades: `/yjs/*` → Yjs WSS, everything else → Socket.IO
6. Mounts all REST routes via `setupRoutes(app, io)`
7. **Pre-pulls Docker images** on startup so first code execution is fast

### API Route Groups (`src/routes/api.js` — 2441 lines)

| Group | Description |
|---|---|
| Auth | Register, Login, Me, Forgot/Reset Password |
| Teams | Create, Get, Join (invite code), Members, Leave, Delete |
| Tasks | Full CRUD, timers, status, assignment |
| Notes | Full CRUD |
| Files | Upload to Supabase Storage, Download, Delete |
| GitHub | Fetch repo content, branch ops, create blob/tree/commit, push ref |
| AI (Gemini) | Ask AI assistant |
| Code Execution | Execute code in Docker containers (Python, JS, Java, C++) |
| Terminal | Create session, handle input, close session |
| IDE Files | CRUD for files inside IDE projects |
| Analytics | Team productivity stats |
| Achievements | XP and gamification system |

### Code Execution Engine

- Spawns **ephemeral Docker containers** per code run via Dockerode
- Supported: **Python, JavaScript (Node.js), Java (Amazon Corretto), C++**
- Security constraints per container:
  - `--rm` — auto-destroy after execution
  - `-m 128m --cpus=.5` — strict resource limits
  - `--network none` — no internet access
- **Execution timeout** kills runaway containers
- **Images pre-pulled at startup** for fast first runs

### Yjs CRDT Collaboration

- Each IDE file has a Yjs document room: `project-{projectId}-{fileId}`
- Clients connect via `ws://server/yjs/{roomName}`
- Server maintains CRDT state in **LevelDB** (persisted across restarts)
- Empty documents seeded from Supabase `ide_files.content`
- **Redis Pub/Sub** syncs Yjs updates across multiple server instances

### Environment Variables (Backend)

```env
SUPABASE_URL=
SUPABASE_KEY=
REDIS_URL=redis://redis:6379
```

---

## 2.6 Database Schema

### Tables

| Table | Key Columns | Description |
|---|---|---|
| `profiles` | `id`, `user_id`, `name`, `email`, `avatar` | User profiles |
| `teams` | `id`, `name`, `invite_code`, `owner_id` | Team workspaces |
| `team_members` | `team_id`, `user_id`, `joined_at` | Membership |
| `tasks` | `id`, `team_id`, `title`, `status`, `assignee_id`, `due_date`, `timer_running` | Tasks |
| `notes` | `id`, `team_id`, `title`, `content`, `author_id` | Notes |
| `files` | `id`, `team_id`, `name`, `stored_name`, `uploaded_by` | File metadata |
| `diagrams` | `id`, `team_id`, `title`, `diagram_data` (JSONB) | Whiteboard data |

> `ide_files` table added in migration-v7 for storing IDE file content in the DB.

### Migrations (8 migrations)

| Migration | Description |
|---|---|
| `schema.sql` | Baseline schema |
| `migration-v2.sql` | Team & task extensions |
| `migration-v3.sql` | Extended fields |
| `migration-v4.sql` | Minor patch |
| `migration-v5-files.sql` | File storage |
| `migration-v6-diagrams.sql` | Diagram/whiteboard |
| `migration-v7-ide-files.sql` | **IDE file content storage** |
| `migration-v8-fix-deadline.sql` | Task deadline type fix |

---

## 2.7 Infrastructure (Docker Compose)

```
docker-compose.yml provisions:
  frontend   →  React + Vite (Dockerfile in frontend/)
  backend    →  Node.js (Dockerfile in backend/)
  redis      →  Redis (Socket.IO adapter + caching)
  nginx      →  Reverse proxy :8080 → frontend / API
```

**Nginx** routes:
- `/` → Frontend static files
- `/api/*`, `/socket.io/*`, `/yjs/*` → Backend API server

A **production-grade local dev stack** — far more sophisticated than SyncBoard's no-Docker setup.

---

## 2.8 Notable Features & Engineering Highlights

1. **Yjs CRDTs** — Conflict-free real-time code editing. Mathematical guarantee of state convergence.
2. **Redis Pub/Sub Backplane** — Enables Socket.IO to scale horizontally. Solves the "sticky session" problem.
3. **LevelDB Persistence** — Yjs document state survives server restarts, preventing data loss.
4. **Dockerode execution engine** — Full sandboxed code execution with resource limits and network isolation.
5. **Collaborative terminal** — xterm.js terminal shared across users via WebSockets.
6. **Monaco editor** — VS Code's exact editor engine powering the IDE.
7. **Gamification system** — XP points, achievements, XP bar, achievement toasts.
8. **Gemini AI** — Uses Google Gemini (not OpenAI) for the AI assistant.
9. **GitHub push support** — Not just repo browsing but actual blob/tree/commit/ref push operations from within the IDE.
10. **Focus Mode** — A 14.6 KB distraction-free coding environment.
11. **Nginx load balancer** — Pre-configured for multi-instance deployment.
12. **Docker-first development** — `docker-compose up --build` brings up the entire stack in one command.

---

## 2.9 Side-by-Side Comparison

| Aspect | SyncBoard | TeamSync |
|---|---|---|
| **Purpose** | Team project workspace | Distributed collaborative IDE |
| **Complexity** | Medium | High |
| **Real-time** | Socket.IO (presence + events) | Socket.IO + Yjs CRDTs + WS |
| **Database** | Supabase PostgreSQL | Supabase PostgreSQL |
| **Auth** | Supabase Auth | Supabase Auth |
| **AI** | OpenAI (GPT) | Google Gemini |
| **Code execution** | ❌ None | ✅ Docker sandboxed (4 languages) |
| **Collaborative editor** | ❌ None | ✅ Monaco + Yjs CRDTs |
| **Terminal** | ❌ None | ✅ xterm.js shared terminal |
| **Infrastructure** | No Docker (Netlify + Render) | Docker Compose + Nginx + Redis |
| **Horizontal scaling** | ❌ Single instance | ✅ Redis adapter for Socket.IO |
| **Persistence layer** | Supabase only | Supabase + LevelDB (Yjs) |
| **Gamification** | ❌ Removed (migration-v8) | ✅ XP, achievements, XP bar |
| **Milestones** | ✅ Yes | ❌ No |
| **Activity log** | ✅ Yes | ❌ No |
| **Legal compliance** | ✅ Extensive | ❌ Minimal |
| **Migrations count** | 13 | 8 |
| **Backend structure** | Monolith `server.js` | Modular `src/` with `index.js` |
| **Deployment** | Netlify + Render | Docker Compose + Nginx |
| **CI pipeline** | ✅ GitHub Actions | ❌ Not configured |
| **Status** | Beta | Development |

---

## 2.10 Overall Assessment

**TeamSync** is the more technically impressive and ambitious project — it demonstrates distributed systems knowledge (Redis, CRDTs, horizontal scaling), OS-level security (Docker namespaces, cgroups), and production infrastructure design (Nginx, Docker Compose, LevelDB). It is an excellent portfolio project for demonstrating backend and systems engineering depth.

**SyncBoard** is the more polished and production-ready application — it has legal compliance, a CI/CD pipeline, comprehensive migrations, beta safeguards, and a cleaner user experience focus. It demonstrates product-oriented thinking and real-world software delivery practices.

> Together, they form a complementary pair: **SyncBoard** for real-world product delivery maturity, **TeamSync** for distributed systems and systems engineering depth.
