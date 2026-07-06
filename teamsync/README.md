# TeamSync

TeamSync is a real-time collaboration platform developed for student teams to manage projects, tasks, and shared resources in one place.

## Tech Stack

- Frontend: React (Vite), Tailwind CSS, Framer Motion
- Backend: Node.js, Express.js, Socket.io
- Database & Authentication: Supabase (PostgreSQL, Auth, Storage)

## Features

- User authentication
- Team creation and member management
- Task creation, assignment, and tracking
- Real-time updates using Socket.io
- Team notes with auto-save
- File upload and storage
- Analytics dashboard
- Timeline view for tasks
- Search across tasks and notes
- In-app notifications
- GitHub repository integration
- XP, levels, and achievements

## Project Structure

```
teamsync/
├── backend/
│   ├── server.js
│   ├── schema.sql
│   ├── migration-v2.sql
│   ├── migration-v3.sql
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env
└── README.md
```

## About

The project was built to help student teams collaborate more effectively by providing task management, team communication, document sharing, and real-time synchronization in a single application.
