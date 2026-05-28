# DojoLink

An internal studio management web app for Code Ninjas franchise centers. Replaces Discord thread-based tracking with a structured, role-based dashboard for Center Directors, Senseis, and Parents.

Supports three locations: **Yorba Linda**, **Fullerton**, and **Cerritos** — each fully isolated with their own ninjas, senseis, and session boards.

**Live at:** [dojolink-neon.vercel.app](https://dojolink-neon.vercel.app)

---

## Features

### Admin Panel (`/admin/*`)
- **Locations** — Create, rename, deactivate/reactivate, and cascade hard-delete locations; each delete removes all associated students, staff, clubs, and progress data in a transaction
- **Users** — Create staff accounts with auto-generated temp passwords, edit roles and locations, reset passwords, deactivate/restore, and permanently delete
- **Curriculum** — Module and lesson editor for AI Academy, Robotics Academy, and JR; belt-project editor for CREATE
- **Settings** — Announcement banner: admin-set free-text message shown to all staff app-wide until dismissed

### Center Directors (Manager role)
- Build the daily session board by adding ninjas and their programs
- View and edit ninja profiles — manage program enrollments (add, edit, remove)
- Edit belt level, project, and status per CREATE enrollment
- Archive (soft delete) or permanently delete ninjas; bulk archive and delete from the roster
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

### Parent Portal
- Parents log in with their email only — no password required
- View all children linked to their email
- See belt progress with visual belt path (images, not text)
- Browse recent session history (instructor notes intentionally hidden)

### Session Board
- Color-coded ninja cards: green = fully logged, yellow = pending, red = overdue
- Incomplete sessions carry over to the next day with an Overdue marker
- When a ninja has multiple programs and only some are logged, the card shows which programs are done vs. still pending

### Multi-Program Support
- Ninjas can be enrolled in multiple programs simultaneously (e.g., CREATE + Robotics Academy)
- Each program is checked in separately on the session board
- Progress logs and belt state are tracked independently per program

### Multi-Location Support
- Each center has its own fully isolated data — ninjas, senseis, and boards never cross over
- Center Directors can switch between locations via a navbar dropdown (read-only for other centers)
- All write operations are locked to a director's home center (enforced server-side)

### Accessibility
- Accessibility statement at `/accessibility` with WCAG 2.1 AA conformance details
- All animations respect the OS `prefers-reduced-motion` setting (WCAG 2.3.3)
- Privacy Policy, Terms, and Accessibility linked from all public page footers

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18, Vite, Tailwind CSS, framer-motion |
| Backend | Node.js, Express |
| Database | PostgreSQL via Supabase |
| Storage | Supabase Storage (profile photos, club resource uploads) |
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
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

> Use the **Transaction pooler** URL from Supabase (port 6543). The username must include the project ref: `postgres.PROJECT_REF`.

Create `client/.env.local`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Set up the database

Run the schema files in `supabase/` via the Supabase SQL editor in order:
1. `schema.sql`
2. `migrations/003_curriculum_tables.sql`
3. `migrations/004_belt_level_projects.sql`

Then seed:

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
| `SESSION_SECRET` | Long random string |
| `NODE_ENV` | `production` |
| `GMAIL_USER` | Gmail address for bug report emails |
| `GMAIL_APP_PASSWORD` | Gmail app password for bug report emails |
| `VITE_SUPABASE_URL` | Supabase project URL (baked into client bundle at build time) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (baked into client bundle at build time) |

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
| Purple | 11 |
| Brown | 17 |
| Red | 4 |
| Black | — |

Projects: Build 1–5, Solve 1–5, Adventure
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
│   │   │   ├── layout/           # Layout, Sidebar, MobileNav, AdminBar, ProtectedRoute
│   │   │   ├── manager/          # TodayBoard, AddStudentToday, EditStudentModal,
│   │   │   │                     #   EnrollmentEditModal, SenseiProfileModal, AddSenseiModal
│   │   │   ├── sensei/           # LogEntryForm, BeltProgressFields, ProjectFields
│   │   │   ├── shared/           # StudentCard, ProgressHistory, PinnedNote,
│   │   │   │                     #   ClubSessionsPanel, ClubBadge
│   │   │   └── ui/               # Button, Card, Modal, BeltBadge, ProgramBadge,
│   │   │                         #   BugReportButton, CropModal, EmojiButton
│   │   ├── context/              # AuthContext, ParentAuthContext, CurriculumContext
│   │   ├── lib/                  # supabase.js (storage client)
│   │   ├── pages/
│   │   │   ├── admin/            # LocationsPage, UsersPage, CurriculumPage, SettingsPage
│   │   │   ├── manager/          # ManagerDashboard, StudentRoster, StudentProfile,
│   │   │   │                     #   AddStudentPage, StaffPage, ReportsPage
│   │   │   ├── sensei/           # SenseiDashboard, LogProgressPage, LogClubPage
│   │   │   ├── parent/           # ParentDashboard, ParentStudentProfile
│   │   │   ├── ClubsPage.jsx
│   │   │   ├── ClubProfilePage.jsx
│   │   │   ├── ClubSessionPage.jsx
│   │   │   ├── AccessibilityPage.jsx
│   │   │   ├── PrivacyPage.jsx
│   │   │   └── TermsPage.jsx
│   │   └── utils/                # beltConfig.js, dateUtils.js, clubUtils.js, progressData.js
│   └── public/                   # Static assets (logos, belt images, favicon, icons)
├── server/
│   ├── db/                       # pool.js, seed.js, import.js
│   ├── middleware/               # auth.js (requireAuth, requireManager, requireSensei,
│   │                             #   requireAdmin, requireParent, requireAnySession,
│   │                             #   requireOwnLocation)
│   ├── routes/                   # admin.js, auth.js, bugs.js, clubs.js, curriculum.js,
│   │                             #   daily.js, parent.js, progress.js, reports.js,
│   │                             #   students.js, users.js
│   └── index.js                  # Express app entry + global error handler
├── supabase/
│   ├── schema.sql                # Full PostgreSQL schema
│   └── migrations/               # 003_curriculum_tables.sql, 004_belt_level_projects.sql
├── CHANGELOG.md
└── vercel.json                   # Vercel deployment config
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `locations` | The 3 centers; `active` flag for soft-disable |
| `users` | Manager and sensei accounts; `active` flag |
| `students` | Ninja profiles with parent contact fields; `active` flag for archive |
| `student_programs` | Per-enrollment belt/project tracking |
| `daily_assignments` | Session board; incomplete ones carry over |
| `progress_logs` | Immutable session notes per program with belt/project snapshot |
| `progress_log_comments` | Staff comments on individual progress logs |
| `club_definitions` | Club types (3 global built-ins + custom per-location) |
| `club_sessions` | Logged club sessions with date, notes, and attendees |
| `club_attendees` | Which ninjas attended each club session |
| `club_session_comments` | Staff comments on club session threads |
| `club_profiles` | Per-club pinned note (markdown) per location |
| `club_resources` | Links and uploaded files attached to a club |
| `curriculum_modules` | Curriculum modules per program/sub-program |
| `curriculum_lessons` | Lessons within each curriculum module |
| `belt_level_projects` | Available projects per belt level and sublevel (CREATE) |
| `app_settings` | Global key-value config (currently: `announcement` banner) |
