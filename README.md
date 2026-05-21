# DojoLink

An internal progress tracking web app for Code Ninjas franchise centers. Replaces Discord thread-based tracking with a structured, role-based dashboard for Center Directors, Senseis, and Parents.

Supports three locations: **Yorba Linda**, **Fullerton**, and **Cerritos** — each fully isolated with their own ninjas, senseis, and session boards.

**Live at:** [dojolink-neon.vercel.app](https://dojolink-neon.vercel.app)

---

## Features

### Center Directors (Manager role)
- Build the daily session board by adding ninjas and their programs
- Add ninjas to the board per-program — a ninja taking two classes gets two separate board rows
- View and edit ninja profiles — manage program enrollments (add, edit, remove)
- Edit belt level, project, and status per CREATE enrollment
- Add, remove, and bulk-delete ninjas from the roster
- Import ninjas from a MyStudio CSV export
- Log progress for any ninja (same as senseis)
- Switch between all 3 center locations to view progress (read-only for other centers)
- Create and manage club sessions; create custom clubs

### Senseis
- View today's session board for their center
- Log progress notes for any ninja on the board, scoped to the specific program
- Advance belt level, sublevel, and project status for CREATE ninjas
- Browse the full ninja roster and individual profiles (read-only)
- Comment on progress logs and club session threads
- Write pinned notes (with markdown) and add resources to club profiles

### Ninja Profiles
- Shows all program enrollments with belt/project details per CREATE enrollment
- Pinned staff note — persistent callout editable by all staff
- Progress history filterable by program
- Stats: total sessions, current belt, current project
- Staff can comment and reply on individual progress log entries

### Clubs
- Three built-in clubs: **3D Design Club**, **Minecraft Club**, **Roblox Club**
- Center Directors can create additional custom clubs per center
- Each club has a profile page with:
  - **Pinned note** — markdown-supported, emoji-enabled
  - **Resources** — link URLs or upload files (PDF, images, video, Office docs up to 50 MB via Supabase Storage)
  - **Session threads** — log who attended and what happened; all staff can comment
- Session cards color-coded: green = notes logged, yellow = pending, red = overdue
- Club attendance visible on parent-facing student profiles

### Parent Portal
- Parents log in with their email only — no password required
- View all children linked to their email
- See belt progress with visual belt path (images, not text)
- Browse recent session history (instructor notes intentionally hidden)
- Two-way messaging with staff per ninja

### Session Board
- Color-coded ninja cards: green = fully logged, yellow = pending, red = overdue
- Incomplete sessions carry over to the next day with an Overdue marker
- When a ninja has multiple programs and only some are logged, the card shows which programs are done vs. still pending
- Clicking "Log Progress" on a partially-logged ninja auto-selects the un-logged program

### Multi-Program Support
- Ninjas can be enrolled in multiple programs simultaneously (e.g., CREATE + Robotics Academy)
- Each program is checked in separately on the session board
- Progress logs and belt state are tracked independently per program

### Multi-Location Support
- Each center has its own fully isolated data — ninjas, senseis, and boards never cross over
- Center Directors can switch between locations via a navbar dropdown (read-only for other centers)
- All write operations are locked to a director's home center (enforced server-side)

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | PostgreSQL via Supabase |
| Storage | Supabase Storage (club resource file uploads) |
| Auth | express-session with `connect-pg-simple` |
| Hosting | Vercel (frontend + serverless API) |
| Markdown | react-markdown + remark-gfm |
| Emoji | emoji-picker-react |

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- A Supabase project with the schema applied (see `supabase/schema.sql`)

### Install dependencies

```bash
npm install                              # root (server deps)
npm install --prefix server              # server
npm install --include=dev --prefix client # client (--include=dev required for vite)
```

### Environment variables

Create a `.env` file at the project root:

```
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-us-west-1.pooler.supabase.com:6543/postgres
SESSION_SECRET=your-secret-here
PORT=3001
```

> Use the **Transaction pooler** URL from Supabase (port 6543). The username must include the project ref: `postgres.PROJECT_REF`.

Create `client/.env.local`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Set up the database

Run the schema in `supabase/schema.sql` via the Supabase SQL editor, then seed:

```bash
npm run seed
```

Creates 3 locations, 3 Center Directors, 6 Senseis, and 12 sample ninjas (4 per center).

### Run in development

```bash
npm run dev
```

- Client: `http://localhost:5173`
- Server: `http://localhost:3001`

---

## Deployment

Deployed on **Vercel** (`dojolink-neon.vercel.app`) with **Supabase** as the database. Every push to `main` on `imLunah/dojolink` auto-deploys.

Required Vercel environment variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase Transaction pooler connection string |
| `SESSION_SECRET` | Long random string (required — app throws at startup if missing in production) |
| `NODE_ENV` | `production` |
| `VITE_SUPABASE_URL` | Supabase project URL (baked into client bundle at build time) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (baked into client bundle at build time) |

---

## Dev Credentials

All accounts use password: `ninja123`. Usernames are case-insensitive.

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

Only CREATE ninjas have belt and project tracking:

| Belt | Max Sublevel |
|------|-------------|
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
│   └── index.js                  # Vercel serverless entry point
├── client/                       # React + Vite frontend
│   ├── src/
│   │   ├── api/                  # Fetch wrapper (client.js)
│   │   ├── components/
│   │   │   ├── layout/           # Layout, Navbar, ProtectedRoute, ParentLayout, ParentRoute
│   │   │   ├── manager/          # TodayBoard, AddStudentToday, EditStudentModal,
│   │   │   │                     #   EnrollmentEditModal, SenseiProfileModal, AddSenseiModal
│   │   │   ├── sensei/           # LogEntryForm, BeltProgressFields, ProjectFields
│   │   │   ├── shared/           # StudentCard, ProgressHistory, PinnedNote,
│   │   │   │                     #   ClubSessionsPanel, ClubBadge
│   │   │   └── ui/               # Button, Card, Modal, BeltBadge, ProgramBadge, EmojiButton
│   │   ├── context/              # AuthContext, ParentAuthContext
│   │   ├── lib/                  # supabase.js (storage client)
│   │   ├── pages/
│   │   │   ├── manager/          # ManagerDashboard, StudentRoster, StudentProfile,
│   │   │   │                     #   AddStudentPage, StaffPage
│   │   │   ├── sensei/           # SenseiDashboard, LogProgressPage, LogClubPage
│   │   │   ├── parent/           # ParentLogin, ParentDashboard, ParentStudentProfile
│   │   │   ├── ClubsPage.jsx     # Club landing with create-club modal
│   │   │   ├── ClubProfilePage.jsx  # Per-club profile (note, resources, sessions)
│   │   │   └── ClubSessionPage.jsx  # Session detail (notes, attendees, comments)
│   │   └── utils/                # beltConfig.js, dateUtils.js, clubUtils.js
│   └── public/                   # Static assets (logos, belt images, favicon)
├── server/
│   ├── db/                       # pool.js, seed.js
│   ├── middleware/               # auth.js (requireAuth, requireManager, requireSensei,
│   │                             #   requireOwnLocation, requireParent)
│   ├── routes/                   # auth.js, students.js, daily.js, progress.js,
│   │                             #   users.js, clubs.js, parent.js
│   └── index.js                  # Express app entry
├── supabase/
│   └── schema.sql                # Full PostgreSQL schema
└── vercel.json                   # Vercel deployment config
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `locations` | The 3 centers |
| `users` | Manager and sensei accounts |
| `students` | Ninja profiles with parent contact fields |
| `student_programs` | Per-enrollment belt/project tracking |
| `daily_assignments` | Session board; incomplete ones carry over |
| `progress_logs` | Immutable session notes per program with belt/project snapshot |
| `progress_log_comments` | Staff comments on individual progress logs |
| `messages` | Parent ↔ staff messaging per ninja |
| `club_definitions` | Club types (3 global built-ins + custom per-location) |
| `club_sessions` | Logged club sessions with date and attendees |
| `club_attendees` | Which ninjas attended each club session |
| `club_session_comments` | Staff comments on club session threads |
| `club_profiles` | Per-club pinned note (markdown) per location |
| `club_resources` | Links and uploaded files attached to a club |
