# Code Ninjas Dojo Tracker

An internal progress tracking web app for Code Ninjas franchise centers. Replaces Discord thread-based tracking with a structured, role-based dashboard for Center Directors and Senseis.

Supports three locations: **Yorba Linda**, **Fullerton**, and **Cerritos** — each fully isolated with their own students, senseis, and session boards.

**Live at:** [codeninjas-progress-tracker.vercel.app](https://codeninjas-progress-tracker.vercel.app)

---

## Features

### Center Directors (Manager role)
- Build the daily session board by adding students
- View and edit student profiles (belt level, project, status, birthday)
- Add and remove students from the roster
- Switch between all 3 center locations to view progress (read-only for other centers)

### Senseis
- View today's session board for their center
- Log progress notes for any student on the board
- Advance belt level, sublevel, and project status for CREATE students
- Browse the full student roster and individual profiles (read-only)

### Multi-Location Support
- Each center has its own isolated data — students, senseis, and boards never cross over
- Center Directors can switch between locations via a navbar dropdown to view other centers
- All write operations are locked to a director's home center (enforced server-side)

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL via Supabase |
| Auth | express-session with `connect-pg-simple` |
| Hosting | Vercel (frontend + serverless API) |
| Styling | Code Ninjas brand theme, Nunito font |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- A Supabase project with the schema applied (see `supabase/schema.sql`)

### Install dependencies

```bash
npm install              # root
cd server && npm install
cd ../client && npm install
```

### Environment variables

Create a `.env` file at the project root:

```
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-us-west-1.pooler.supabase.com:6543/postgres
SESSION_SECRET=your-secret-here
PORT=3001
```

> Use the **Transaction pooler** URL from Supabase (port 6543). The username must include the project ref: `postgres.PROJECT_REF`.

### Set up the database

Run the schema in `supabase/schema.sql` via the Supabase SQL editor, then seed:

```bash
npm run seed
```

Creates 3 locations, 3 Center Directors, 6 Senseis, and 12 sample students (4 per center).

### Run in development

```bash
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:3001`

---

## Deployment

Deployed on **Vercel** with **Supabase** as the database. Every push to `main` auto-deploys.

Required Vercel environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Supabase Transaction pooler connection string |
| `SESSION_SECRET` | Any long random string |
| `NODE_ENV` | `production` |

---

## Dev Credentials

All accounts use password: `ninja123`

| Role | Username | Location |
|------|----------|----------|
| Center Director | `cd_yorbalinda` | Yorba Linda |
| Center Director | `cd_fullerton` | Fullerton |
| Center Director | `cd_cerritos` | Cerritos |
| Sensei | `sensei_yl1` | Yorba Linda |
| Sensei | `sensei_yl2` | Yorba Linda |
| Sensei | `sensei_fl1` | Fullerton |
| Sensei | `sensei_fl2` | Fullerton |
| Sensei | `sensei_cr1` | Cerritos |
| Sensei | `sensei_cr2` | Cerritos |

---

## Programs & Belt System

Four programs are supported: **CREATE**, **Robotics Academy**, **AI Academy**, and **JR**.

Only CREATE students have belt and project tracking:

| Belt | Max Level |
|------|-----------|
| White | 8 |
| Yellow | 10 |
| Orange | 12 |
| Green | 10 |
| Blue | 3 |
| Purple / Brown / Red / Black | — |

Projects: Build 1–3, Solve 1–3, Adventure
Statuses: Started, Working On, Completed

---

## Project Structure

```
├── api/
│   └── index.js          # Vercel serverless entry point
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── api/          # Fetch wrapper
│   │   ├── components/   # UI, layout, manager, sensei, shared components
│   │   ├── context/      # AuthContext (user, switchLocation, isReadOnly)
│   │   ├── pages/        # Manager and Sensei page views
│   │   └── utils/        # beltConfig.js, dateUtils.js
│   └── public/           # Static assets (logos, images)
├── server/
│   ├── db/               # pool.js, seed.js
│   ├── middleware/        # auth.js (requireAuth, requireManager, requireOwnLocation)
│   ├── routes/           # auth, students, daily, progress, users
│   └── index.js          # Express app entry
├── supabase/
│   └── schema.sql        # PostgreSQL schema
├── vercel.json           # Vercel deployment config
└── CLAUDE.md             # Architecture guide for AI-assisted development
```
