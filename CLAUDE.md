# AI Project Continuation Document

## Session 2 — 28 May 2026

---

### 1. PROJECT IDENTITY

- **Project Name:** DojoLink
- **What This Project Is:** An internal studio management platform for Code Ninjas franchise locations. Staff (Center Directors and Senseis) use it to check in students, track curriculum progress, manage clubs, and generate reports. Parents get a read-only portal to view their child's progress.
- **Primary Objective:** Replace ad-hoc tracking tools at 3 franchise locations (Yorba Linda, Fullerton, Cerritos) with a single, role-gated web app. Currently running live at `dojolink-neon.vercel.app`.
- **Strategic Intent:** Independently developed by a franchise staff member. Not affiliated with or endorsed by Code Ninjas Inc. Long-term intent is reliable daily operations tooling for the centers.
- **Hard Constraints:**
  - **Never** mention Claude, Anthropic, or AI in commits, files, docs, or output. Ask first if ever needed.
  - Push to `sandbox` by default. Only push to `main` when the user explicitly says so.
  - Use inline confirm buttons for destructive actions — never `window.confirm()`.
  - Tailwind breakpoint for mobile hamburger is `lg` (1024px), not `md`.
  - The `admin` role bypasses ALL role gates server and client side. Never break this bypass.
  - DB username for Supabase pooler must be `postgres.PROJECT_REF` (not `postgres`).
  - Vercel build requires `--include=dev` for client install (Vite is a devDep).
  - `trust proxy 1` is required in Express for session cookies to work on Vercel.
  - Session table must be pre-created (Transaction pooler can't run DDL).

---

### 2. WHAT EXISTS RIGHT NOW

- **Built and working:**
  - Full staff auth (login, session, logout) with role hierarchy: `admin > manager > sensei`
  - Parent portal with email-based login, read-only student progress view
  - Today's Board — check-in and assignment management for managers
  - Student Roster — with search, pagination, bulk archive/delete, import from CSV
  - Student Profile — belt/project tracking, progress log history, pinned notes, enrollment editing
  - Progress logging — multi-lesson entry, belt advancement, percent-complete auto-calc
  - Club sessions — creation, attendee tracking, notes, comments, resources
  - Staff management — add/remove senseis, credential reset, profile photos
  - Reports page — enrollment charts, belt distribution, activity, inactive students, CSV export
  - Admin panel — Locations, Users, Curriculum (module/lesson editor), Settings (announcement banner)
  - Accessibility statement at `/accessibility`; Privacy Policy; Terms
  - Announcement banner — set by admin, shown to all staff until dismissed per-session
  - AdminBar — full pill at bottom center on desktop; collapsible icon above Report Bug on mobile
  - `react-doctor` installed and scanned; codebase scores 100/100 (no remaining diagnostics)
  - Dead code removed: `Navbar.jsx`, `AssignSenseiDropdown.jsx`, `ParentLogin.jsx`, `@react-three/fiber`, `three`

- **Partially built:**
  - Nothing explicitly incomplete, but the `sandbox` branch is 42 commits ahead of `main` — all session work has not been merged to production yet.

- **Broken or blocked:**
  - Nothing known broken on `sandbox`. The `progress log 500` that occurred this session was fixed (see §4).

- **Not started yet:**
  - No automated tests exist anywhere in the codebase.
  - No CI/CD pipeline beyond Vercel's auto-deploy on push.
  - No rate limiting on most API routes (only parent login has it).

---

### 3. ARCHITECTURE & TECHNICAL MAP

- **Tech stack:**
  - **Frontend:** React 18, Vite 6, React Router v6, Tailwind CSS v3, framer-motion v12, Supabase JS client (for storage only)
  - **Backend:** Node.js + Express, express-session + connect-pg-simple (PostgreSQL session store), bcryptjs, nodemailer
  - **Database:** PostgreSQL via Supabase (Transaction pooler for app, Direct connection for migrations)
  - **Deployment:** Vercel (serverless via `/api/index.js`), GitHub repo: `imLunah/dojolink`
  - **Branch strategy:** `sandbox` (active dev) → `main` (production, user explicitly gates merges)

- **Key files/structure:**
  ```
  /client/src/
    api/client.js               — fetch wrapper with put/post/patch/get/delete
    context/AuthContext.jsx     — staff session state; login/logout/switchLocation
    context/ParentAuthContext.jsx — parent session state
    context/CurriculumContext.jsx — module-level cache for curriculum data
    components/layout/          — Layout, Sidebar, MobileNav, AdminBar
    pages/manager/              — Dashboard, StudentRoster, StudentProfile, StaffPage, ReportsPage
    pages/sensei/               — SenseiDashboard, LogProgressPage, LogClubPage
    pages/admin/                — LocationsPage, UsersPage, CurriculumPage, SettingsPage
    pages/parent/               — ParentDashboard, ParentStudentProfile
  /server/
    index.js                    — Express app entry point, global error handler + unhandledRejection
    middleware/auth.js          — requireAuth, requireManager, requireSensei, requireAdmin, requireParent, requireAnySession, requireOwnLocation
    routes/                     — admin, auth, bugs, clubs, curriculum, daily, parent, progress, reports, students, users
  /api/index.js                 — Vercel serverless entry (imports server/index.js)
  /CLAUDE.md                    — This file (project notes + continuation doc)
  ```

- **How the system works end-to-end:**
  1. User visits `dojolink-neon.vercel.app` → LandingPage → LoginPage
  2. Staff: `POST /api/auth/login` → Express sets session (userId, role, activeLocationId) → client stores user in AuthContext
  3. Manager navigates to `/manager/dashboard` → `GET /api/daily?date=today` → TodayBoard renders assignments
  4. Sensei clicks a student → `/sensei/student/:id` → LogProgressPage → LogEntryForm → `POST /api/progress`
  5. Progress POST: checks student ownership, runs `BEGIN` → insert logs → update student_programs → mark assignment complete → `COMMIT` → then auto-calculates percent_complete
  6. Admin navigates to `/admin/*` → all routes behind `requireAdmin` middleware
  7. Parent: `POST /api/parent/login` with email → separate parent session → `GET /api/parent/students` → read-only view
  8. Vercel rewrites `/api/*` → `api/index.js` → Express router

- **Naming conventions:**
  - CSS: Tailwind with custom `ninja-*` tokens (ninja-bg, ninja-border, ninja-blue, ninja-navy, ninja-muted, ninja-red)
  - Font: `font-ninja` = Nunito
  - DB: snake_case tables/columns; JS: camelCase; files: PascalCase for components
  - Role values in DB: `'manager'`, `'sensei'`, `'admin'`
  - Inline confirm state for all destructive actions (never `window.confirm`)

- **External dependencies:**
  - Supabase: PostgreSQL DB + Storage (profile-pics, club-resources buckets)
  - Vercel: hosting + `@vercel/analytics`
  - Gmail (nodemailer) for bug report emails: `GMAIL_USER`, `GMAIL_APP_PASSWORD` env vars
  - `DATABASE_URL` env var for pg connection

---

### 4. RECENT WORK — WHAT JUST HAPPENED

This session covered three major areas:

#### A. Features & UI
- **react-doctor install + scan** — installed `react-doctor@0.2.9`, ran full codebase scan, fixed the one error: wrapped app in `<MotionConfig reducedMotion="user">` (WCAG 2.3.3 compliance)
- **Dead code removal** — deleted `Navbar.jsx`, `AssignSenseiDropdown.jsx`, `ParentLogin.jsx`; removed `@react-three/fiber` and `three` from package.json
- **Accessibility page** — created `/accessibility` route with WCAG 2.1 AA conformance statement; linked from LandingPage and LoginPage footers
- **Privacy Policy updates** — added COPPA section, CCPA section, analytics/localStorage disclosure
- **AdminBar redesign** — desktop: full pill at bottom center (unchanged UX); mobile: compact `A` pill above Report Bug button; fixed Rules of Hooks violation (`useEffect` was after early return)
- **Announcement banner restyle** — replaced amber generic styling with app theme colors; animated dismiss; fixed missing `put` method in `api/client.js`

#### B. Bug-Fixing Sweep (42 commits on sandbox)
Ran multi-angle code review scanning all server routes and all client files. Key patterns fixed:
- All multi-step server writes now use transactions (progress POST, import route, location DELETE cascade)
- Admin role properly included in `isManager` checks throughout (`['manager','admin'].includes(role)`)
- Null/undefined guards on all API response destructuring (`?? []`)
- `btoa()` replaced with `encodeURIComponent()` for Unicode safety
- Curriculum context module-level cache cleared on logout
- Parent bug reports unblocked (was hitting `requireSensei`)
- Progress log 500 fixed: `lastEntry` declared inside `try` block was block-scoped and inaccessible after the transaction

#### C. Decisions made and why:
- **`sandbox` stays separate from `main`** — user explicitly controls when to merge
- **`alert()` for some error feedback** — quick fix; acceptable for non-iframe web app context
- **Curriculum PATCH/DELETE have no program-scope check** — admin-only routes, accepted gap
- **LogProgressPage back-nav duplicate log** — edge case requiring architectural changes; left as-is

---

### 5. KNOWN BUGS FIXED (sandbox branch)

#### Server — Data Integrity
- **Progress log 500** — `lastEntry` declared inside `try` block used after it. Fixed: `let lastEntry` before `try`.
- **Progress POST no transaction** — writes non-atomic. Fixed: `BEGIN/COMMIT` using pool client.
- **Import route no transaction** — student+program inserts non-atomic. Fixed: full loop wrapped in transaction.
- **Location DELETE FK gap** — `progress_log_comments.user_id` / `club_session_comments.user_id` not nullified. Fixed: nullify steps added.
- **ROLLBACK swallowing original error** — ROLLBACK in catch could throw and hide `txErr`. Fixed: `.catch(() => {})` on ROLLBACK.

#### Server — Auth & Authorization
- **Bug reports blocked for parents** — `requireSensei` blocked parent sessions. Fixed: `requireAnySession`.
- **Manager credential escalation** — `PATCH /users/:id/credentials` had no role check. Fixed: `role !== 'sensei'` guard.
- **Program update missing location** — `PATCH /students/:id/programs` never checked `location_id`. Fixed: `UPDATE ... FROM students WHERE s.location_id = $7`.
- **`isManager` excluded admin** — Used `role === 'manager'` only. Fixed: `['manager','admin'].includes(role)` throughout.
- **Parent email oracle** — Login error revealed email existence. Fixed: generic error message.

#### Server — Stale / Incorrect Data
- **Inactive report mismatch** — `NOT EXISTS` used `daily_assignments`; `last_session` used `progress_logs`. Fixed: consistent `progress_logs`.
- **Announcement missing from login** — Banner never showed on first login. Fixed: announcement added to `POST /auth/login` response.
- **`/me` crash on deleted location** — `activeLocation` could be `undefined`. Fixed: `WHERE active = true`, returns `[]`.

#### Client — Crashes
- **`btoa()` crash** — Throws on emoji/em-dash. Fixed: `encodeURIComponent(text)`.
- **StaffPage `ReferenceError`** — `setConfirmRemoveId` never declared. Fixed: removed the call.
- **Rules of Hooks violation in AdminBar** — `useEffect` after early return. Fixed: moved before guard.
- **`ClubSessionPage` null crash** — `!session` missing from loading guard. Fixed: `|| !session` added.
- **`ClubSessionsPanel` null sessions prop** — `[...sessions]` threw on undefined. Fixed: default prop `= []`.

#### Client — Silent Failures / Stale State
- **Stale curriculum cache on logout** — `_cache` never cleared. Fixed: `invalidateCurriculumCache()` in both logout functions.
- **`ClubSessionsPanel` attendees wiped** — `onAttendeesUpdated([])` when `allStudents` never loaded. Fixed: skips callback when empty.
- **ProgressVisuals hidden for new students** — Gated on `session_logs.length > 0`. Fixed: guard removed.
- **`AddStudentPage` partial creation** — No recovery if programs failed after student created. Fixed: navigates to student profile.
- **`AuthContext.logout()` stale state** — `setUser(null)` only ran on success. Fixed: moved to `finally`.

#### Client — Wrong Logic
- **`EnrollmentEditModal` UPPER_BELTS** — Purple/Brown/Red incorrectly hidden sublevel field. Fixed: `['Black']` only.
- **`CurriculumPage` wrong `program` field** — Sub-program name sent instead of parent. Fixed: always sends `selectedProgram`.
- **Ozobot Evo missing** — Not in `KIT_ORDER`/`KIT_TOTALS`. Fixed: added (2 modules).
- **`SenseiProfileModal` Edit Login for managers** — No role guard. Fixed: hidden with `sensei.role !== 'manager'`.

---

### 6. WHAT COULD GO WRONG

- **`alert()` for errors** — ClubSessionPage and ClubSessionsPanel; would silently fail in iframe or PWA standalone
- **`PATCH /students/:id/programs` overwrites all 4 fields** — pre-existing; callers always send all fields but partial-update callers would silently null data
- **LogProgressPage back-navigation** — browser back after logging allows duplicate log creation
- **No rate limiting** — most API routes unprotected against brute force
- **Percent-complete runs outside transaction** — if it fails, log is saved but display % is stale until next log
- **CurriculumContext brief stale data** — `_cache` cleared on logout but React state in mounted provider holds until async fetch resolves

---

### 7. HOW TO THINK ABOUT THIS PROJECT

**1. Core pattern:** Monorepo with Express backend + Vite SPA, deployed as Vercel serverless. Sessions live in PostgreSQL (connect-pg-simple), not JWT. `activeLocationId` in the session is critical — managers can switch locations for read-only viewing; `requireOwnLocation` blocks writes to non-home locations; `admin` bypasses everything.

**2. Most common mistake:** Forgetting `admin` must be included alongside `manager` everywhere. Use `['manager','admin'].includes(req.session.role)` server-side and `['manager','admin'].includes(user?.role)` client-side. This was the source of multiple bugs this session.

**3. What looks refactorable but shouldn't be:** The `CurriculumContext` module-level `_cache` looks like an anti-pattern but is intentional — avoids re-fetching static curriculum data on every mount. `invalidateCurriculumCache()` exists precisely to clear it after admin edits. Don't replace with React Query. Also: `AdminNav` is duplicated across 4 admin pages — leave it.

---

### 8. DO NOT TOUCH LIST

- Do NOT merge `sandbox` to `main` unless the user explicitly says so.
- Do NOT refactor `AdminNav` duplication across admin pages.
- Do NOT change session-based auth to JWT.
- Do NOT remove `trust proxy 1` from `server/index.js`.
- Do NOT use `window.confirm()` for any destructive action.
- Do NOT change the mobile nav breakpoint from `lg` to `md`.
- Do NOT introduce new npm packages without checking with the user first.
- Do NOT mention Claude, Anthropic, or AI anywhere in code, commits, or docs.
- Preserve `font-ninja`, `ninja-*` Tailwind tokens, and Nunito font throughout UI.
- The `admin` role bypass must remain intact across all auth middleware checks.

---

### 9. CONFIDENCE & FRESHNESS

| Section | Confidence | Notes |
|---|---|---|
| Project identity & constraints | ✅ HIGH | Verified against codebase this session |
| Current state (what's built) | ✅ HIGH | Every file read and reviewed this session |
| Architecture & tech map | ✅ HIGH | All routes, files, and configs read directly |
| Recent work (session 2) | ✅ HIGH | Everything done in this session |
| Deployment URL | ⚠️ MEDIUM | `dojolink-neon.vercel.app` from memory; not navigated to directly |
| Supabase bucket names | ⚠️ MEDIUM | Read from source code, not verified in Supabase dashboard |
| `main` branch state | ⚠️ MEDIUM | Known to be ~42 commits behind `sandbox`; not deeply reviewed |
| No tests exist | ✅ HIGH | Confirmed by directory scan |
| Node version | ✅ HIGH | v22.8.0; oxlint requires >=22.12.0 to unlock lint/dead-code checks |
