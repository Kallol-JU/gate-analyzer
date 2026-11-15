# GATE CSE 2027 CBT Simulator

A free exam-simulation platform for GATE CSE aspirants (MERN stack). This repository is at the end of **Milestone 2: database, authentication, question and test management**.

```
client/   React + Vite + Tailwind CSS v4 frontend
server/   Node.js + Express API
```

## Requirements

- Node.js 20 or newer (check with `node -v`)
- npm 10 or newer

## Install

From this folder:

```bash
cd server && npm install
cd ../client && npm install
```

Or, using the root convenience script:

```bash
npm run install:all
```

Then configure the server (needs a free MongoDB Atlas cluster, see `server/README.md`):

```bash
cp server/.env.example server/.env      # Windows PowerShell: Copy-Item server/.env.example server/.env
# edit server/.env: set MONGODB_URI, JWT_SECRET, and ADMIN_EMAIL / ADMIN_PASSWORD
cd server && npm run seed               # subjects, starter topics, first admin
```

The client needs no `.env` in development.

## Run (two terminals)

Terminal 1, the API:

```bash
cd server
npm run dev
```

Terminal 2, the frontend:

```bash
cd client
npm run dev
```

Open <http://localhost:5173>. The footer shows **API connected** when the API and MongoDB are both up, and **API connected, database offline** if MongoDB is down.

Root shortcuts do the same: `npm run dev:server` and `npm run dev:client`.

## Other commands

```bash
cd server && npm test            # unit tests always run; see server/README.md for DB integration tests
cd client && npm run build       # production build check
```

## Status

Real:
- MongoDB (Mongoose) connection, health endpoint with database status
- Registration, login, logout and session restore on refresh (HttpOnly cookie), protected routes, role-based admin API, rate-limited login
- Subject, topic, question (MCQ/MSQ/NAT, PYQ/AI/admin sources) and test models with admin CRUD APIs, publish/unpublish/clone
- Student read APIs for published questions and tests that never expose answer keys

Prototype (clearly labelled "Prototype · Sample Data", all in `client/src/prototype/`):
- Dashboard statistics at `/dashboard` (only your name is real)
- Exam screen at `/exam/prototype`

Not built yet: admin screens (use the API for now), the real exam engine, results, leaderboard, AI generation.

## Roadmap

1. Project setup and UI foundation (done)
2. Authentication, database, question and test management (this milestone)
3. Question bank UI and JSON import
4. CBT examination engine
5. Evaluation, results and history
6. Student dashboard and analytics
7. Leaderboard
8. Gemini AI integration
9. Admin dashboard
10. Security, testing and deployment
