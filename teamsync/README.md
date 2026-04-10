# TeamSync 🚀

Real-Time Collaboration Platform built for Student Teams.

## Setup (5 minutes)

### Requirements
- Node.js v16+ (download from nodejs.org)
- A [Supabase](https://supabase.com) account & project

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Environment Configuration
# Create a .env file in the root directory and add your Supabase keys:
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# 3. Database Setup
# Copy the contents of `schema.sql` and run it in your Supabase SQL Editor to set up the tables.

# 4. Start the server
npm start

# 5. Open browser
# Go to: http://localhost:3000
```

## Features

- ✅ **Authentication** – Secure Login / Register and Forgot Password flow via Supabase Auth.
- 👥 **Teams** – Create teams, invite members via code, manage permissions (Leader/Member).
- ✅ **Tasks** – Create, assign, track, start/stop timers, and mark complete. Team Leaders can extend task deadlines.
- 📊 **Analytics** – Data visualization of completion rates, task status, and member workload.
- 📅 **Timeline** – Gantt-style visual task scheduling view.
- 📝 **Notes** – Collaborative notes with auto-save.
- 📁 **Files** – Upload and manage team documents (files are saved locally via Multer).
- 🔍 **Search** – Full-text search across tasks and notes.
- 🔔 **Notifications** – In-app real-time notification panel.
- 🔗 **GitHub Integration** – Browse team repositories and read files directly from the dashboard.
- ⚡ **Real-Time** – WebSocket sync across all users powered by Socket.io.

## Tech Stack

- **Frontend** – HTML, Vanilla JS, Tailwind CSS (CDN)
- **Backend** – Node.js, Express, Socket.io, Multer
- **Database & Auth** – Supabase (PostgreSQL)

## Real-Time Testing

Open the app in two different browser tabs (or standard/incognito), log in as two different users in the same team, and watch changes sync instantly between them!
