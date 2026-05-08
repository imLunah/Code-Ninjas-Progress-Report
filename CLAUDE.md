# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start both servers (client :5173, server :3001)
npm run dev

# Server only
npm run server

# Client only
npm run client

# Build client for production
npm run build

# Re-seed the database (resets users + sample students)
npm run seed

# If ports are stuck, clear them first
lsof -ti:3001 | xargs kill -9; lsof -ti:5173 | xargs kill -9
```

### Multi-location dev credentials

| Role | Username | Password | Location |
|------|----------|----------|----------|
| Center Director | `cd_yorbalinda` | `ninja123` | Yorba Linda |
| Center Director | `cd_fullerton` | `ninja123` | Fullerton |
| Center Director | `cd_cerritos` | `ninja123` | Cerritos |
| Sensei | `sensei_yl1` | `ninja123` | Yorba Linda |
| Sensei | `sensei_yl2` | `ninja123` | Yorba Linda |
| Sensei | `sensei_fl1` | `ninja123` | Fullerton |
| Sensei | `sensei_fl2` | `ninja123` | Fullerton |
| Sensei | `sensei_cr1` | `ninja123` | Cerritos |
| Sensei | `sensei_cr2` | `ninja123` | Cerritos |

## Architecture

This is a monorepo with two independent packages:

- **`server/`** — Node.js + Express + PostgreSQL via Supabase (CommonJS, `require`)
- **`client/`** — React + Vite + Tailwind CSS (ESM, `import`)

Dependencies must be installed separately: `npm install` at root, then `cd server && npm install`, then `cd client && npm install`.

### Server

The Express app (`server/index.js`) connects to Supabase PostgreSQL via a `pg` connection pool (`server/db/pool.js`), attaches it to `app` via `app.set('db', pool)`, and all routes pull the pool with `req.app.get('db')`. There is no ORM — all queries use `pg` directly with `await pool.query(sql, params)`. Parameters use `$1, $2, $3` placeholders (PostgreSQL style). Inserts use `RETURNING *` to get the created row back.

Sessions are stored in Supabase via `connect-pg-simple` (auto-creates a `session` table). Session data (`userId`, `role`, `displayName`, `activeLocationId`, `homeLocationId`) is set on login and checked by middleware in `server/middleware/auth.js`. Four guards exist: `requireAuth`, `requireSensei` (sensei or manager), `requireManager` (manager only), `requireOwnLocation` (blocks writes when viewing another center).

The server exports `app` and only calls `app.listen()` when run directly (`require.main === module`), so Vercel can import it as a serverless function via `api/index.js`.

Environment variables are read from `.env` at the project root (not inside `server/`):
- `DATABASE_URL` — Supabase Transaction pooler connection string (required)
- `SESSION_SECRET` — required for production
- `PORT` — default 3001

### Multi-Location Support

The app supports 3 fully isolated centers: **Code Ninjas Yorba Linda**, **Code Ninjas Fullerton**, and **Code Ninjas Cerritos**. Each center has its own senseis and students. Data isolation is enforced server-side via `req.session.activeLocationId` — no location param is passed on individual API calls.

**Session fields:**
- `activeLocationId` — the center currently being viewed (changes on switch)
- `homeLocationId` — the center the user belongs to (set at login, never changes)

**`requireOwnLocation` middleware** (`server/middleware/auth.js`) blocks all write operations (`POST`, `PATCH`, `DELETE`) when `activeLocationId !== homeLocationId`. This means Center Directors can view any center but can only make changes at their home center.

**`isReadOnly`** is computed in `AuthContext.jsx`: `user.role === 'manager' && user.activeLocation?.id !== user.homeLocationId`. Frontend components use this to hide edit buttons (Add Student, Edit, Remove) when a director is viewing another center.

**Navbar location switcher:**
- Center Directors see a `<select>` dropdown populated from `user.availableLocations` (all 3 centers). Selecting one calls `POST /api/auth/switch-location` and all page data re-fetches.
- Senseis see a static `<span>` with their center name — no switcher.

**`daily_assignments` and `progress_logs` do not have a `location_id` column** — they inherit location scope through the `student_id → students.location_id` join, avoiding denormalization.

### Database

Hosted on **Supabase** (PostgreSQL). The schema lives in `supabase/schema.sql` and was applied via the Supabase MCP. Five tables:

- **`locations`** — the 3 centers (Yorba Linda, Fullerton, Cerritos) with `name` and `slug`
- **`users`** — manager and sensei accounts with bcryptjs password hashes; `location_id` references their home center
- **`students`** — all ninja profiles; `location_id` scopes them to a center; belt/project fields only populated for CREATE; `active=false` is a soft delete
- **`daily_assignments`** — date-scoped To Do board; `UNIQUE(student_id, session_date)` prevents duplicates; `sensei_id` nullable; `completed` flips to `true` when a progress log is submitted
- **`progress_logs`** — immutable session notes with snapshots (`belt_level_at`, `belt_sublevel_at`, `project_at`, `status_at`) capturing student state at the time of logging

Schema changes require updating `supabase/schema.sql` and running the new DDL in the Supabase SQL editor (or via `mcp__supabase__apply_migration`). There is no longer a local init/migration script — all migrations are applied directly to Supabase.

### Client

The Vite dev server proxies `/api/*` to `localhost:3001` (configured in `client/vite.config.js`), so all API calls use relative paths like `/api/students`.

All fetch calls go through `client/src/api/client.js` which handles JSON serialization, credentials, and throws on non-OK responses.

Auth state is managed by `client/src/context/AuthContext.jsx`. On mount it calls `GET /api/auth/me` to restore the session. Role-based routing uses `client/src/components/layout/ProtectedRoute.jsx` — managers also pass sensei-role checks.

### Belt Config — Single Source of Truth

`client/src/utils/beltConfig.js` defines all belt names, level caps per belt, and display colors. Both the frontend form validation and the server-side API routes mirror these constraints. When adding or changing belt rules, update this file and the corresponding server-side validation in `server/routes/students.js` and `server/routes/progress.js`.

Belt level caps: White (8), Yellow (10), Orange (12), Green (10), Blue (3). Purple/Brown/Red/Black have no sublevel tracking (`levels: null`).

### Roles & Programs

- **Manager**: full access — builds the daily session board, edits/removes student profiles, adds new students
- **Sensei**: sees all of today's students (no pre-assignment), logs session notes for any student, can advance belt/project for CREATE students, and can view (read-only) the full student roster and profiles

The session board is open — any sensei can log progress for any student added to the board that day. A student is marked complete once any sensei submits a progress log. There is no sensei pre-assignment.

The student roster (`/manager/students`) and student profile (`/manager/students/:id`) routes are accessible to both roles. The "Add Student", "Edit", and "Remove" buttons are conditionally rendered only for managers (`user?.role === 'manager'`). Clicking a student name on the session board or a student card navigates to their full profile; senseis also have a separate "Log Progress" button on each card.

Programs: `CREATE`, `Robotics Academy`, `AI Academy`, `JR`. Only CREATE students have belt/project tracking. The other programs currently use only the daily To Do board and notes.

### Student Data

Students have a `birthday` (DATE) field stored in the DB. Age is calculated client-side from the birthday and displayed on the student profile.

### Logos & Assets

All source images live in `Images/` at the project root. They must be copied to `client/public/` to be served by Vite:
- `client/public/CodeNinjasLogoH.svg` — horizontal wordmark, used in navbar and login page
- `client/public/CodeNinjasLogoF.png` — square icon, used as the browser tab favicon
- `client/public/CodeNinjasLaptop.png` — used in the manager's empty session board state
- `client/public/CodeNinjasCelebrate.webp` — used in the sensei's empty dashboard state

When adding new images, copy from `Images/` to `client/public/` and reference them as `/filename.ext` in JSX. No import needed — Vite serves `public/` as the root.

### Theming

The UI matches the Code Ninjas brand (based on codeninjas.com). Tailwind theme tokens are defined in `client/tailwind.config.js`:
- `bg-ninja-bg` (#f5f7fa) — page background
- `bg-ninja-card` / `bg-white` — card backgrounds
- `border-ninja-border` (#e2e8f0) — card borders
- `text-ninja-blue` / `bg-ninja-blue` (#006ADD) — primary accent (buttons, links, highlights)
- `bg-ninja-blue-hover` (#0058b8) — button hover state
- `text-ninja-navy` (#1a2e4a) — headings and body text
- `text-ninja-muted` (#506690) — secondary/label text
- `text-ninja-red` (#e51520) — errors and alerts only

Font: **Nunito** (Google Fonts, weights 400/600/700/800/900), loaded in `client/index.html`.

## Deployment

The app is deployed on **Vercel** (frontend + serverless API) with **Supabase** as the database.

- **Vercel project**: connected to `imLunah/ninja-tracker` on GitHub — every push to `main` auto-deploys
- **Supabase project**: `hatlannivniuauafptzk` — Transaction pooler on `aws-1-us-west-1`
- **`vercel.json`**: sets `buildCommand` (builds the React client), `outputDirectory` (`client/dist`), and rewrites all `/api/*` requests to `api/index.js`
- **`api/index.js`**: Vercel serverless entry point — just re-exports the Express app
- **Environment variables on Vercel**: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`

To re-seed Supabase (wipes users and students, keeps schema): `npm run seed`

Schema changes: update `supabase/schema.sql` and apply via Supabase SQL editor or the MCP tool.

