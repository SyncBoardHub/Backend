# SyncBoard Backend

SyncBoard Backend is a high-performance, modular Node.js REST API and real-time WebSocket server designed for collaborative team workspace management. It combines full team project lifecycle controls (teams, tasks, milestones, notes, diagrams, files, and AI assistance) with horizontally scalable distributed infrastructure (Redis caching, distributed rate limiting, and multi-node Socket.IO scaling via the Redis adapter).

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Core Architectural Layers](#core-architectural-layers)
  - [1. Configuration Layer (`src/config/`)](#1-configuration-layer-srcconfig)
  - [2. Middleware Layer (`src/middleware/`)](#2-middleware-layer-srcmiddleware)
  - [3. Service Layer (`src/services/`)](#3-service-layer-srcservices)
  - [4. Routing Layer (`src/routes/`)](#4-routing-layer-srcroutes)
  - [5. Real-Time Engine (`src/realtime/`)](#5-real-time-engine-srcrealtime)
  - [6. Utilities & Security Guards (`src/utils/`)](#6-utilities--security-guards-srcutils)
- [API Reference Catalog](#api-reference-catalog)
- [Database & Migrations](#database--migrations)
- [Environment Variables](#environment-variables)
- [Running Locally & Testing](#running-locally--testing)
- [Containerization & Docker](#containerization--docker)

---

## Architecture Overview

```
                                      ┌────────────────────────────────┐
                                      │         Client Traffic         │
                                      │   (Browser / Mobile / Tests)   │
                                      └──────────────┬─────────────────┘
                                                     │
                                                     ▼
                                      ┌────────────────────────────────┐
                                      │   Reverse Proxy / Nginx (80)   │
                                      └──────┬──────────────────┬──────┘
                                             │                  │
                                 HTTP / REST │                  │ WebSockets (Socket.IO)
                                             ▼                  ▼
                       ┌────────────────────────────────────────────────────────┐
                       │                   SyncBoard API Server                 │
                       │           (Express 4 + Socket.IO Server Engine)        │
                       ├────────────────────────────────────────────────────────┤
                       │  Middleware: Helmet, CORS, RequestID, RateLimit, Auth  │
                       ├────────────────────────────────────────────────────────┤
                       │  Routes: /api/auth, /api/teams, /api/tasks, etc.       │
                       ├────────────────────────────────────────────────────────┤
                       │  Services: Auth, Team, Task, File, AI, GitHub, etc.    │
                       └──────────────┬──────────────────────────┬──────────────┘
                                      │                          │
                 PostgreSQL / Auth / Storage                     │ Distributed Pub/Sub & Cache
                                      ▼                          ▼
                       ┌────────────────────────────┐    ┌──────────────────────┐
                       │     Supabase Platform      │    │     Redis Engine     │
                       │  (Postgres, Auth, Storage) │    │  (Adapter, Limiter)  │
                       └────────────────────────────┘    └──────────────────────┘
```

The system operates with **graceful degradation**:
- **With Redis running**: Real-time events scale across multiple server replicas via `@socket.io/redis-adapter`, and rate limiting can be distributed.
- **Without Redis (local dev / standalone)**: The backend automatically falls back to an in-memory socket adapter and local rate limiting without crashing or degraded functionality.

---

## Directory Structure

```text
backend/
├── Dockerfile                  # Multi-stage production container build
├── package.json                # Dependencies, engine version, and script hooks
├── schema.sql                  # Baseline Supabase schema definitions
├── .env.example                # Template of all supported environment variables
├── migrations/                 # Ordered chronological database migration scripts
│   ├── fix-storage.sql
│   ├── migration-v2.sql
│   ├── migration-v3.sql
│   ├── migration-v4.sql
│   ├── migration-v5-files.sql
│   ├── migration-v6-diagrams.sql
│   ├── migration-v7-security.sql
│   ├── migration-v8-remove-gamification.sql
│   ├── migration-v9-activity.sql
│   ├── migration-v10-milestones.sql
│   ├── migration-v11-legal-compliance.sql
│   ├── migration-v12-invitations-notifications.sql
│   └── migration-v13-team-approvals.sql
├── test/                       # Node.js built-in test runner suites
│   └── server.test.js          # API contract, auth gate, 404, and health tests
└── src/                        # Single source of truth application source
    ├── app.js                  # Express app definition, middleware pipelines, error handlers
    ├── server.js               # HTTP server listener, Socket.IO binding, graceful shutdown
    ├── config/                 # Subsystem drivers and environment parsers
    │   ├── cors.js             # Origin matching and security headers
    │   ├── env.js              # Strict environment variable loader with defaults
    │   ├── redis.js            # Resilient Redis connection manager with bounded retries
    │   └── supabase.js         # 3-tier Supabase client isolation (Anon, User, Service Role)
    ├── constants/              # System-wide enum values, statuses, and boundaries
    │   └── index.js
    ├── middleware/             # Request lifecycle interception
    │   ├── auth.js             # Bearer JWT verification and profile auto-provisioning
    │   ├── errorHandler.js     # Unified JSON error formatter with client-safe redaction
    │   ├── notFound.js         # Standard 404 handler for unmapped routes
    │   ├── rateLimit.js        # IP/Token sliding-window rate limiter
    │   ├── requestId.js        # UUIDv4 tracing injection on all requests
    │   └── teamAccess.js       # RBAC guards: member, owner, assignee, admin, service-role
    ├── realtime/               # WebSocket event coordination
    │   └── socket.js           # Socket room management, presence tracking, Redis pub/sub
    ├── routes/                 # Express route controllers grouped by domain
    │   ├── activity.routes.js  # Team activity history feed
    │   ├── admin.routes.js     # User management, ghost profile purging, dev reset
    │   ├── ai.routes.js        # AI assistant partner and local fallback planner
    │   ├── auth.routes.js      # Register, login, session inspection, password recovery
    │   ├── file.routes.js      # Upload, signed download URLs, remote URL import
    │   ├── github.routes.js    # Repository browsing, commits, branches, file inspection
    │   ├── health.routes.js    # Liveness (/healthz) and database readiness (/readyz) probes
    │   ├── index.js            # Route aggregator and mount orchestrator
    │   ├── milestone.routes.js # Project milestone progress and task rollups
    │   ├── note.routes.js      # Collaborative notes and diagram canvas state
    │   ├── notification.routes.js # Notification inbox, mark-read, email preferences
    │   ├── profile.routes.js   # User profiles, notification preferences
    │   ├── search.routes.js    # Cross-team global keyword search
    │   ├── task.routes.js      # Task boards, timers, deadlines, and time extensions
    │   └── team.routes.js      # Team creation, invites, join approvals, analytics
    ├── services/               # Pure business logic and database access layer
    │   ├── activity.service.js
    │   ├── ai.service.js
    │   ├── auth.service.js
    │   ├── file.service.js
    │   ├── github.service.js
    │   ├── milestone.service.js
    │   ├── note.service.js
    │   ├── notification.service.js
    │   ├── profile.service.js
    │   ├── search.service.js
    │   ├── task.service.js
    │   └── team.service.js
    └── utils/                  # Reusable utilities and safety guards
        ├── errors.js           # Typed AppError classes with HTTP statuses and error codes
        ├── logger.js           # Structured logger with secret redaction and dev pretty-print
        ├── pagination.js       # Clamped offset and cursor pagination parsers
        ├── response.js         # Standardized JSON response envelope generator
        ├── sanitize.js         # HTML entity encoder and XSS string sanitizer
        └── ssrf.js             # Private IPv4/IPv6 address blocker for external fetches
```

---

## Core Architectural Layers

### 1. Configuration Layer (`src/config/`)

- **[`env.js`](file:///c:/Desktop/Sync/backend/src/config/env.js)**:
  Parses all environment variables on boot. Enforces mandatory production variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) while providing development and test fallbacks to prevent test harness crashes.
- **[`supabase.js`](file:///c:/Desktop/Sync/backend/src/config/supabase.js)**:
  Exposes three distinct client levels:
  1. `supabaseAuth`: Anon key client for authenticating user tokens.
  2. `supabase`: Service-role client for backend queries honoring workspace constraints.
  3. `supabaseAdmin`: Bypasses RLS for administrative user cleanup, storage bucket management, and batch transactions.
- **[`redis.js`](file:///c:/Desktop/Sync/backend/src/config/redis.js)**:
  Manages connections to Redis with bounded backoff (`reconnectStrategy`) so tests and local runs without a Redis daemon terminate cleanly without hung sockets. Exposes `safeGet`, `safeSet`, and `safeDel` helpers.
- **[`cors.js`](file:///c:/Desktop/Sync/backend/src/config/cors.js)**:
  Enforces origin validation against `CORS_ORIGINS`, allowing credentials, headers (`Authorization`, `Content-Type`, `X-Request-ID`), and standard REST verbs.

### 2. Middleware Layer (`src/middleware/`)

- **`auth.js`**: Validates `Authorization: Bearer <token>` via Supabase Auth. Loads user profile and automatically creates a new profile record for social/OAuth first-time logins.
- **`teamAccess.js`**:
  - `requireTeamMember(req, res, teamId)`: Verifies caller is in `team_members`.
  - `requireTeamOwner(req, res, teamId)`: Verifies caller is the owner in `teams.owner_id`.
  - `validateTaskAssignmentAccess`: Ensures both requester and target assignee belong to the target team.
  - `requireAdmin`: Restricts endpoints to configured `ADMIN_USER_IDS`.
  - `requireServiceRole`: Blocks storage/administrative operations if service key is absent.
- **`rateLimit.js`**: Factory for IP-based or token-based sliding-window rate limiters.
- **`requestId.js`**: Generates a unique `X-Request-ID` header and assigns `res.locals.requestId` for end-to-end request tracing in server logs.
- **`errorHandler.js`**: Catches unhandled errors, formats consistent JSON responses, hides stack traces in production, and redacts sensitive data.

### 3. Service Layer (`src/services/`)

All database operations and external interactions reside strictly within services:

| Service | Primary Responsibilities |
| :--- | :--- |
| **`auth.service.js`** | User registration with orphan-profile cleanup, login, password resets, and invite code generation. |
| **`team.service.js`** | Workspace CRUD, invite code generation/revocation, member join requests & approvals, member removals, and analytics. |
| **`task.service.js`** | Task board state machine, real-time stopwatch timers (start/pause/stop), time extension grants, and milestone linking. |
| **`milestone.service.js`** | Project roadmap phases, progress metrics, total/completed task rollups. |
| **`note.service.js`** | Collaborative markdown notes, diagram storage, canvas JSON state management. |
| **`file.service.js`** | 50MB file uploads to Supabase Storage, signed private download URL generation, SSRF-safe URL import. |
| **`notification.service.js`**| In-app notification delivery, batch read states, Resend email dispatch with daily throttling (100/day), deadline reminders. |
| **`activity.service.js`** | Audited workspace activity logging with actor details and real-time socket broadcasting. |
| **`github.service.js`** | Secure proxy for GitHub API (fetching repository metadata, directory trees, raw file contents, commits, and branches). |
| **`ai.service.js`** | OpenAI project partner for triage and summaries, paired with a deterministic local fallback planner. |
| **`profile.service.js`** | Profile retrieval, name/avatar updates, notification preferences, shared-team member profiles. |
| **`search.service.js`** | Fast multi-entity search across tasks and notes within accessible teams. |

### 4. Routing Layer (`src/routes/`)

Routes are modularized into domain files and unified in `src/routes/index.js`. All API routes are mounted under `/api` with root health and join handlers at the top level.

### 5. Real-Time Engine (`src/realtime/`)

The WebSocket system (`src/realtime/socket.js`) provides real-time workspace collaboration:
- **Authentication**: Sockets authenticate via `socket.handshake.auth.token` through Supabase.
- **Rooms**: Sockets join rooms named by `teamId`. Real-time updates (`task:created`, `task:updated`, `milestone:updated`, `file:uploaded`, `note:typing`) are broadcast to the team room.
- **Presence**: Tracks online users per team. Fires `team:member_online` and `team:member_offline` with multi-tab deduplication.
- **Horizontal Scaling**: If Redis is configured, `@socket.io/redis-adapter` enables seamless multi-server real-time message broadcasting across pods.

### 6. Utilities & Security Guards (`src/utils/`)

- **`logger.js`**: Structured logging using Pino (with standard console fallback) with automated secret redaction (`token`, `password`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`).
- **`ssrf.js`**: Validates URLs before server-side fetching, rejecting non-HTTP protocols, `localhost`, and internal IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`).
- **`sanitize.js`**: Escapes dangerous characters in user input to prevent stored Cross-Site Scripting (XSS).
- **`errors.js`**: Class hierarchy (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError`).

---

## API Reference Catalog

### Health & Diagnostic Endpoints

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/healthz` | Public | Liveness probe returning uptime status and timestamp. |
| `GET` | `/readyz` | Public | Readiness probe verifying DB connectivity and service role configuration. |
| `GET` | `/join/:code` | Public | Public route to lookup team name by invite code. |

### Authentication & Profiles (`/api/auth`, `/api/profile`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Create user with email/password and accept legal policies. |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive session tokens. |
| `GET` | `/api/auth/me` | Bearer JWT | Returns current authenticated user record. |
| `POST` | `/api/auth/forgot-password` | Public | Sends password reset email via frontend link. |
| `POST` | `/api/auth/reset-password` | Public | Updates user password using reset token. |
| `GET` | `/api/profile` | Bearer JWT | Fetch caller's full profile. |
| `PATCH`| `/api/profile` | Bearer JWT | Update user name and avatar initials. |
| `GET` | `/api/preferences/notifications` | Bearer JWT | Retrieve user notification preferences. |
| `PATCH`| `/api/preferences/notifications` | Bearer JWT | Update notification preferences. |
| `GET` | `/api/user-profile/:userId` | Bearer JWT | View another user's profile if sharing a team. |

### Teams & Membership (`/api/teams`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/teams` | Bearer JWT | List all teams caller is a member of. |
| `POST` | `/api/teams` | Bearer JWT | Create new team (caller becomes owner). |
| `POST` | `/api/teams/join` | Bearer JWT | Join team via invite code or create join request. |
| `GET` | `/api/teams/:id/members` | Team Member | List all members in the team. |
| `DELETE`| `/api/teams/:id/members/:userId` | Team Owner | Remove member from team. |
| `DELETE`| `/api/teams/:id` | Team Owner | Permanently delete team and associated data. |
| `GET` | `/api/teams/:id/join-requests` | Team Owner | List pending join requests. |
| `POST` | `/api/teams/:id/join-requests/:requestId/approve` | Team Owner | Approve pending join request. |
| `POST` | `/api/teams/:id/join-requests/:requestId/reject` | Team Owner | Reject pending join request. |
| `POST` | `/api/teams/:id/invite/regenerate` | Team Owner | Generate fresh invite code. |
| `POST` | `/api/teams/:id/invite/revoke` | Team Owner | Disable invite code. |
| `GET` | `/api/analytics?teamId=` | Team Member | Compute team delivery metrics and task distribution. |

### Tasks & Time Tracking (`/api/tasks`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks?teamId=` | Team Member | List tasks for team (or across all user teams). |
| `POST` | `/api/tasks` | Team Member | Create task with deadline, estimated time, and milestone. |
| `PUT` | `/api/tasks/:id` | Team Member | Update task details, assignee, or status. |
| `DELETE`| `/api/tasks/:id` | Team Member | Remove task. |
| `POST` | `/api/tasks/:id/timer` | Assignee/Owner | Start, pause, resume, or stop stopwatch timer. |
| `POST` | `/api/tasks/:id/extend-time` | Assignee/Owner | Add additional minutes to task estimate. |

### Milestones (`/api/milestones`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/milestones?teamId=` | Team Member | List milestones with task progress counts. |
| `POST` | `/api/milestones` | Team Member | Create project milestone phase. |
| `PUT` | `/api/milestones/:id` | Team Member | Update milestone name, description, or due date. |
| `DELETE`| `/api/milestones/:id` | Team Member | Delete milestone and unassign attached tasks. |

### Notes & Diagrams (`/api/notes`, `/api/diagrams`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notes?teamId=` | Team Member | Fetch team notes. |
| `POST` | `/api/notes` | Team Member | Create note. |
| `PUT` | `/api/notes/:id` | Team Member | Update note content. |
| `DELETE`| `/api/notes/:id` | Team Member | Delete note. |
| `GET` | `/api/diagrams?teamId=` | Team Member | Fetch team architecture diagrams. |
| `POST` | `/api/diagrams` | Team Member | Save diagram canvas JSON state. |
| `DELETE`| `/api/diagrams/:id` | Team Member | Delete diagram. |

### Files & Storage (`/api/files`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/files?teamId=` | Team Member | List metadata of uploaded files. |
| `POST` | `/api/files/upload` | Service Role | Multipart upload file (up to 50MB). |
| `POST` | `/api/files/import-url` | Service Role | Server-side download and save file from external URL. |
| `GET` | `/api/files/:id/download` | Service Role | Generate signed, time-limited download URL. |
| `DELETE`| `/api/files/:id` | Service Role | Delete file from Supabase storage and metadata table. |
| `GET` | `/api/files/debug/storage` | Service Role | Verify storage bucket configuration and health. |

### GitHub Integration (`/api/github`, `/api/teams/:id/github`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/teams/:id/github` | Team Member | Link a GitHub repository URL to the team. |
| `DELETE`| `/api/teams/:id/github` | Team Member | Unlink repository from team. |
| `GET` | `/api/github/contents/:owner/:repo` | Bearer JWT | Fetch files and folders at root or given path. |
| `GET` | `/api/github/file/:owner/:repo/*` | Bearer JWT | Inspect raw file contents. |
| `GET` | `/api/github/branches/:owner/:repo` | Bearer JWT | List git repository branches. |
| `GET` | `/api/github/commits/:owner/:repo` | Bearer JWT | Retrieve recent commit log. |
| `GET` | `/api/github/repo/:owner/:repo` | Bearer JWT | Get repository metadata and statistics. |

### AI Assistant & Search (`/api/ai`, `/api/search`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/assistant` | Bearer JWT | Send task/team context for AI triage recommendations. |
| `GET` | `/api/search?q=` | Bearer JWT | Query keyword across all accessible tasks and notes. |

### Administration (`/api/admin`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/cleanup-ghosts` | Admin User | Prune orphaned profile rows lacking Auth records. |
| `POST` | `/api/admin/delete-user` | Admin User | Hard delete user profile and team associations. |
| `POST` | `/api/admin/reset-all` | Admin User | Wipe all workspace data (`RESET_EVERYTHING` token). |

---

## Database & Migrations

SyncBoard uses PostgreSQL via Supabase with Row Level Security (RLS).

### Schema Tables
1. **`profiles`**: Extends `auth.users` with display name, avatar initials, and legal acceptance timestamps.
2. **`teams`**: Project teams with unique invite codes, description, and GitHub repository links.
3. **`team_members`**: Join table binding `user_id` to `team_id`.
4. **`tasks`**: Work items with status (`planned`, `in progress`, `done`), timer tracking, and milestone references.
5. **`milestones`**: Key roadmap checkpoints.
6. **`notes`**: Collaborative documentation documents.
7. **`diagrams`**: Canvas diagrams and architecture drawings.
8. **`files`**: File metadata pointing to private Supabase storage objects.
9. **`notifications`**: User alert inbox with read/unread tracking.
10. **`activity_events`**: Immutable audit logs of team actions.
11. **`join_requests`**: Pending team membership applications.

### Running Migrations
Initial schema setup is located in [`schema.sql`](file:///c:/Desktop/Sync/backend/schema.sql). Additional incremental migrations are stored in [`migrations/`](file:///c:/Desktop/Sync/backend/migrations/). Execute migrations in sequence via the Supabase SQL Editor.

---

## Environment Variables

Copy `.env.example` to `backend/.env` and configure the following:

| Variable | Required in Prod | Default (Dev) | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `production`, `test`). |
| `PORT` | No | `3000` | Port for the HTTP/WebSocket server. |
| `SUPABASE_URL` | **Yes** | — | Supabase project endpoint URL. |
| `SUPABASE_ANON_KEY` | **Yes** | — | Public anon API key for user token verification. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | — | Server-only service role key for bypassing RLS on system jobs. |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URI for pub/sub and distributed caching. |
| `CORS_ORIGINS` | No | `http://localhost:5173,http://127.0.0.1:5173` | Comma-delimited list of allowed frontend origins. |
| `FRONTEND_URL` | No | `http://localhost:5173` | Canonical URL of the client application (used in emails). |
| `ADMIN_USER_IDS` | No | `""` | Comma-separated list of UUIDs granted `/api/admin` access. |
| `OPENAI_API_KEY` | No | `""` | OpenAI API key for AI assistant features (falls back to local logic if unset). |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model used for AI suggestions. |
| `RESEND_API_KEY` | No | `""` | Resend API key for transactional email dispatches. |
| `RESEND_FROM_EMAIL` | No | `""` | Verified sender email address. |
| `GITHUB_TOKEN` | No | `""` | Optional personal access token for higher GitHub API rate limits. |
| `LOG_LEVEL` | No | `info` (prod) / `debug` (dev) | Logging threshold (`debug`, `info`, `warn`, `error`). |

---

## Running Locally & Testing

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Run Syntax Validation
```bash
npm run check
```

### 3. Run Automated Tests
```bash
npm test
```
The test suite executes against the Node.js built-in test runner (`node:test`) and validates server boot, health checks, route authentication barriers, owner authorization checks, 404 behavior, and invite verification.

### 4. Start the Server
```bash
# Production mode
npm start

# Development mode (with file watching)
node --watch src/server.js
```

---

## Containerization & Docker

The backend includes a production Dockerfile and integrates with the project root Docker Compose configuration:

### Build Standalone Image
```bash
docker build -t syncboard-backend ./backend
docker run -p 3000:3000 --env-file ./backend/.env syncboard-backend
```

### Run Full Stack with Docker Compose
From the repository root:
```bash
# Starts API, Redis, and Nginx reverse proxy
docker compose up -d
```
The Compose setup orchestrates:
- `api`: Node.js API container connected to Redis and Supabase.
- `redis`: Redis alpine container for WebSocket scaling and pub/sub.
- `nginx`: Reverse proxy routing `/api/`, `/socket.io/`, and health probes.
