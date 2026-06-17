# DojoLink

DojoLink is the day-to-day operations tool for three Code Ninjas centers (Yorba Linda, Fullerton, and Cerritos). It's where staff check ninjas in, log what they worked on, run clubs, and pull the numbers a Center Director needs at the end of the week. Parents get a stripped-down portal to follow their own kid's progress.

It replaced a pile of Discord threads and spreadsheets. Each center's data stays in its own lane — staff at Fullerton never see Yorba Linda's roster unless they're an admin.

**Live:** [dojolink-neon.vercel.app](https://dojolink-neon.vercel.app)

---

## Who uses it

There are three staff roles plus a separate parent login. They stack: an admin can do everything a manager can, a manager everything a sensei can.

- **Sensei** — the front-line role. Sees today's board, logs progress for any ninja on it, advances belts and projects for CREATE kids, browses the roster, and comments on logs and club threads.
- **Center Director (manager)** — everything a sensei does, plus building the daily board, editing ninja profiles and enrollments, importing rosters from a MyStudio CSV, archiving or deleting ninjas, running clubs, and read-only peeking at the other two centers.
- **Admin** — the master key. Bypasses every role and location gate, server and client side. Owns the Locations / Users / Curriculum / Settings panels.
- **Parent** — logs in with just an email, no password, and sees a read-only progress view for their children. Instructor notes stay hidden from them on purpose.

---

## What it does

**The daily board.** Each center has a board of who's in today and what program they're checked into. Cards are color-coded — green when everything's logged, yellow when something's still pending, red when it rolled over from a previous day. A ninja in two programs gets checked in once per program, and the card tells you which half is done.

**Progress logging.** Senseis log against a specific program, not the kid in general. CREATE ninjas carry a belt, sublevel, project, and status; the other programs track lesson completion against the curriculum. Percent-complete is computed from completed lessons in the current module, so it moves on its own as you log. Logs are immutable session records — they snapshot the belt/project state at the time.

**Ninja profiles.** Every enrollment, the belt and project for CREATE, a pinned staff note any staffer can edit, full progress history you can filter by program, and a running comment thread on individual log entries. There's a QR code on the profile (manager view) that drops a parent straight onto the parent login.

**Clubs.** Clubs are per-center. Creating one needs a name and a meeting day, optionally a cover photo. Each club has its own page with a markdown pinned note, a resources list (links or uploaded files up to 50 MB), and session threads where you record who showed up and what happened. Session cards use the same green/yellow/red logic as the board.

**Curriculum.** CREATE runs on belts and projects; AI Academy, Robotics Academy, and JR run on modules and lessons. Admins edit both through the Curriculum panel. The curriculum is cached client-side since it barely changes.

**Reports.** Enrollment over time, belt distribution, who's gone inactive, recent belt advancements — the charts a CD actually looks at.

**Roster import.** Paste in a MyStudio CSV export and DojoLink reconciles it against the live roster. Ninjas in the system but missing from the CSV are offered up for archiving; ninjas already enrolled and in the CSV are flagged so you can prune duplicates. "Remove" always means archive (soft delete, restorable), never a hard wipe.

**Release notes.** When the developer publishes a new entry, a "What's New" card pops once on next login. There's a full changelog under the account page. Authoring is done straight in the database; the app side is read-only.

**Parent portal.** Email-only login, all the kid's enrollments, a visual belt path (belt images, not "Green #3" text), and recent session history with the instructor notes stripped out.

**Bug reports.** A button in the sidebar footer (and a floating one in the parent layout) opens a modal that emails the report in.

---

## Design system

The whole UI is built on a small set of CSS custom properties so light/dark mode and the accent color are a one-variable swap, not a rewrite.

### Tokens

Colors live as raw RGB channels (`--ninja-blue: 0 106 221`) so Tailwind's opacity modifiers (`bg-ninja-blue/10`) work. They're surfaced as `ninja-*` Tailwind classes:

| Token | Light | Dark | Used for |
|-------|-------|------|----------|
| `ninja-bg` | `#f5f7fa` | `#1c2132` | Page background |
| `ninja-border` | `#e2e8f0` | `#2c3752` | Borders, dividers |
| `ninja-blue` | `#006add` | `#38a1ff` | Brand accent, links, primary buttons |
| `ninja-navy` | `#1a2e4a` | `#d0daed` | Primary text (flips near-white in dark) |
| `ninja-muted` | `#506690` | `#8a9bb8` | Secondary text (both pass WCAG AA) |
| `ninja-red` | `#e51520` | same | Destructive / overdue |

Type is **Nunito** throughout, mapped to `font-ninja`.

### Dark mode

Class-based (`.dark` on `<html>`). It's not just inverted — dark mode is a deep blue-slate palette (`#1c2132` base, `#252c3e` cards) closer to a code editor than pure black. Tailwind's stock colored badges (`bg-green-50`, `text-blue-700`, etc.) get muted dark overrides in `index.css` so status pills don't glow. A short transition class fires only during the toggle so the whole app doesn't animate on every render.

### Accent customizer

Each staffer can recolor the brand accent for their own browser — it's stored in `localStorage`, never on the server, so it never touches anyone else's view. It's deliberately hidden: tap the sidebar logo (desktop) or the Appearance icon (mobile) five times. There are eight presets plus a custom HSV color map (drag a saturation/brightness square with a hue slider). Crucially, an accent only swaps `--ninja-blue` and its hover — it does not retint backgrounds or text, which kept an earlier "tint everything" version from looking muddy.

Public pages (landing, login, legal) carry a `.theme-locked` class that pins the stock blue, so a custom accent can't leak onto pre-login screens.

### Program and belt colors are pinned

Program identity colors don't follow the accent: JR is purple, CREATE / Robotics / AI are blue. Belt-rank colors and the parent-portal charts are semantic too. Those are product identity, not theme.

### Mobile

Mobile is its own layout, not a squished desktop. The app shell is fixed to the viewport so the iOS URL bar can't shift things mid-gesture, and the body never scrolls — only the content pane does. You swipe horizontally between tabs (Instagram-style: the next and previous tabs are pre-mounted off-screen and slide in together). The bottom nav is a floating frosted-glass capsule with a sliding active pill; a top corner bar holds Reports and Curriculum. The hamburger/desktop breakpoint is `lg` (1024px), which keeps iPhone landscape on the mobile layout.

Animation is **framer-motion**, and everything respects the OS `prefers-reduced-motion` setting.

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Frontend | React 18, Vite, React Router v6, Tailwind CSS, framer-motion |
| Backend | Node.js, Express, express-session (`connect-pg-simple` store) |
| Database | PostgreSQL via Supabase (direct `pg` pool — not PostgREST) |
| Storage | Supabase Storage, private buckets, server-mediated signed URLs |
| Hosting | Vercel (SPA + serverless API under `/api`) |
| Markdown | react-markdown + remark-gfm |

Sessions live in Postgres, not JWTs. Supabase is used for the database and file storage only — auth is all Express.

---

## Running it locally

You'll need Node 18+, npm, and a Supabase project with the schema applied (`supabase/schema.sql`).

```bash
npm install                                # root (server deps)
npm install --prefix server               # server
npm install --include=dev --prefix client # client — --include=dev is required, Vite is a devDep
```

Root `.env`:

```
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-us-west-1.pooler.supabase.com:6543/postgres
SESSION_SECRET=your-secret-here
PORT=3001
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # storage only, server-side only
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

Use the **Transaction pooler** URL (port 6543), and note the username has to include the project ref: `postgres.PROJECT_REF`. Plain `postgres` gives you "Tenant or user not found".

`client/.env.local`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

Apply the schema, then the migrations in `supabase/migrations/` in order, through the Supabase SQL editor. Seed sample data with `npm run seed`, then:

```bash
npm run dev     # client on :5173, server on :3001
```

---

## Deployment

Vercel + Supabase. GitHub `main` deploys to production, `sandbox` to a preview. Heads up: a push doesn't always trigger a fresh build right away — an empty "trigger redeploy" commit forces it.

A few things Vercel needs that aren't obvious:

- `trust proxy 1` in Express, or the session cookie never gets set behind Vercel's proxy.
- The Postgres session table has to be pre-created — the Transaction pooler can't run the DDL to auto-create it.
- File uploads return 503 until `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in the Vercel environment.

Required env vars: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, plus the `VITE_SUPABASE_*` pair (baked into the client bundle at build time).

---

## Storage

Both buckets (`profile-pics`, `club-resources`) are private with deny-all RLS for the anon key. Nothing touches storage directly from the browser. Uploads go: client asks the server for a one-time signed upload URL → client PUTs the file → server signs a long-lived read URL and stores that in the database. The service-role key lives on the server and is used for storage only, never for SQL.

---

## Programs & belts

Four programs: **CREATE**, **Robotics Academy**, **AI Academy**, and **JR**. Only CREATE carries belts and projects.

| Belt | Max sublevel |
|------|--------------|
| White | 8 |
| Yellow | 10 |
| Orange | 12 |
| Green | 10 |
| Blue | 3 |
| Purple | 11 |
| Brown | 17 |
| Red | 4 |
| Black | — |

Projects are Build 1–5, Solve 1–5, and Adventure. A project's status is one of Started, Working On, or Completed.

---

## Project layout

```
├── api/index.js                  # Vercel serverless entry (wraps server/index.js)
├── client/                       # React + Vite SPA
│   └── src/
│       ├── api/                  # fetch wrapper
│       ├── components/
│       │   ├── layout/           # Layout, Sidebar, MobileNav, MobileTopBar, AdminBar
│       │   ├── manager/          # TodayBoard, modals
│       │   ├── sensei/           # log entry forms
│       │   ├── shared/           # StudentCard, ClubSessionsPanel, RoadmapModal, WhatsNewModal
│       │   ├── theme/            # accent customizer (ColorMap, ColorPalette, ModeToggle)
│       │   └── ui/               # Button, Card, Modal, badges, CropModal
│       ├── context/              # Auth, ParentAuth, Curriculum, Theme
│       ├── lib/                  # supabase storage client, navTabs, accents
│       └── pages/                # admin/, manager/, sensei/, parent/, clubs, legal
├── server/
│   ├── db/                       # pool, seed, import
│   ├── lib/storage.js            # service-role signed-URL helpers
│   ├── middleware/auth.js        # requireAuth / Manager / Sensei / Admin / Parent / OwnLocation
│   ├── routes/                   # admin, auth, bugs, clubs, curriculum, daily, parent,
│   │                             #   progress, reports, students, users, announcements, releases, storage
│   └── index.js                  # Express entry + global error handler
├── supabase/
│   ├── schema.sql
│   └── migrations/
└── vercel.json
```

---

## Database

| Table | Purpose |
|-------|---------|
| `locations` | The three centers; `active` flag for soft-disable |
| `users` | Staff accounts, role + home location, `active` flag |
| `students` | Ninja profiles with parent contact fields; `active` for archive |
| `student_programs` | Per-enrollment belt/project/lesson tracking |
| `daily_assignments` | The session board; incomplete rows carry over |
| `progress_logs` | Immutable session notes per program with a belt/project snapshot |
| `progress_log_comments` | Staff comments on individual logs |
| `club_definitions` | Club types, per-location |
| `club_sessions` | Logged sessions with date, notes, attendees |
| `club_attendees` | Who attended each session |
| `club_session_comments` | Comments on session threads |
| `club_resources` | Links and uploaded files attached to a club |
| `curriculum_modules` / `curriculum_lessons` | Module and lesson curriculum |
| `belt_level_projects` | Projects available per belt and sublevel (CREATE) |
| `releases` | Published release notes for the What's New feed |
| `app_settings` | Global key-value config (e.g. the announcement banner) |

Every table has a deny-all RLS policy — all database access goes through the Express server, which holds the only connection.
