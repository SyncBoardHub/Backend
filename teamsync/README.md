# TeamSync 🚀

Real-Time Collaboration Platform built for Student Teams.

## Setup (2 minutes)

### Requirements
- Node.js v16+ (download from nodejs.org)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open browser
# Go to: http://localhost:3000
```

## Demo Accounts

| Name | Email | Password |
|------|-------|----------|
| Alex Johnson | alex@demo.com | demo123 |
| Sara Kim | sara@demo.com | demo123 |
| Raj Patel | raj@demo.com | demo123 |

## Features

- ✅ **Authentication** – Login / Register with JWT
- 👥 **Teams** – Create teams, invite via code, manage members  
- ✅ **Tasks** – Create, track, start/stop timers, mark complete
- 📊 **Analytics** – Completion rates, donut charts, member workload
- 📅 **Timeline** – Gantt-style visual task scheduling
- 📝 **Notes** – Collaborative notes with auto-save
- 📁 **Files** – Upload/manage team documents (demo mode)
- 🔍 **Search** – Full-text search across tasks and notes
- ⚡ **Real-Time** – Socket.io WebSocket sync across all users

## Tech Stack

- **Frontend** – HTML, Tailwind CSS (CDN), Vanilla JS
- **Backend** – Node.js, Express, Socket.io
- **Data** – In-memory (no database needed for demo)

## Real-Time Testing

Open the app in two different browser tabs, log in as different demo users,
and watch changes sync instantly between them!
