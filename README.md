# SyncBoard

SyncBoard is a shared project workspace for college teams. It gives students one place to organise tasks, assign responsibility, track deadlines, and keep project work together.

## Product

Group projects often spread work across chats, documents, and personal reminders. SyncBoard brings the working record into one team workspace so members can see what needs attention and who owns it.

The product is designed for small student teams working on assignments, presentations, research projects, and other collaborative coursework.

## Core Features

- Team workspaces with invite-code based collaboration.
- Task creation, assignment, statuses, deadlines, timers, and milestones.
- Notes and shared project files.
- Search across tasks and notes.
- In-app notifications and activity history.
- Real-time task and workspace updates with team presence.
- GitHub repository connection for viewing project repositories and files.
- Optional AI assistant for planning and project summaries.
- Light, dark, and system theme preferences.
- Profile and workspace settings.

## Technology Stack

### Frontend

- React 19
- Vite
- Tailwind CSS v4
- React Router
- Lucide React for interface icons
- Framer Motion for selected workspace interactions
- React Flow for diagrams and visual boards

### Backend

- Node.js
- Express
- Socket.IO
- Helmet for security headers
- Express Rate Limit for request throttling
- Multer for controlled file uploads

### Data and Services

- Supabase PostgreSQL for application data.
- Supabase Auth for account authentication.
- Supabase Storage for private team files.
- Supabase Row Level Security for database access control.
- Optional OpenAI API integration through the backend for the AI assistant.

### Quality and Delivery

- ESLint for frontend code quality.
- Node.js built-in test runner for backend contract tests.
- Vite production builds.
- GitHub Actions for frontend and backend checks.
- Ordered SQL migrations for schema changes.

## Architecture

The React frontend handles routing, workspace views, forms, and user interactions. It uses Supabase Auth for the browser session and communicates with the Express API for protected application operations.

The Express server validates authentication, authorisation, team membership, request limits, file operations, and AI requests. Socket.IO provides real-time workspace events and presence updates.

Supabase provides PostgreSQL, authentication, and private file storage. The optional AI integration stays behind the backend so server-only credentials are not exposed to the browser.

```text
React + Vite frontend
        |
        | REST API and authenticated session
        v
Express + Socket.IO backend
        |
        +--> Supabase Auth
        +--> Supabase PostgreSQL
        +--> Supabase Storage
        +--> Optional AI provider
```

## Engineering Highlights

- Protected API routes use authenticated Supabase sessions.
- Team-scoped operations validate membership before accessing workspace data.
- Authentication and selected write routes use rate limiting.
- Server-only credentials are kept in backend environment variables.
- Database changes are tracked through ordered migrations.
- Health and readiness endpoints support service monitoring.
- Error boundaries and structured API handling improve failure recovery.
- CI runs frontend linting, frontend builds, backend syntax checks, and backend tests.

## Repository Structure

```text
.
├── frontend/              React client and Vite configuration
│   ├── src/pages/         Route-level screens
│   ├── src/features/      Task and team features
│   ├── src/components/    Shared UI and workspace panels
│   ├── src/lib/           API, auth, socket, and theme helpers
│   └── scripts/           Beta and release configuration checks
├── backend/               Express and Socket.IO server
│   ├── server.js          API and real-time server
│   ├── schema.sql         Initial database schema
│   ├── migration-*.sql    Ordered database migrations
│   └── test/               Backend contract tests
├── docs/                  Architecture, beta, and release notes
└── .github/workflows/     Continuous integration configuration
```

## Project Status

SyncBoard is currently in beta. The main workflows are implemented and checked locally, while deployment configuration, database setup, and user feedback are still part of the beta process.

Beta testing guidance is available in [`docs/beta-testing.md`](docs/beta-testing.md), and the system overview is documented in [`docs/architecture.md`](docs/architecture.md).

## Future Direction

The next improvements will be driven by beta feedback. Areas under consideration include broader automated test coverage, stronger operational monitoring, improved collaboration workflows, and clearer project-level reporting.
