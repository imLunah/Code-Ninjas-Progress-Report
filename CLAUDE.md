# DojoLink — Handoff Summary

### 1. Project Overview

**DojoLink** is a full-stack studio management app for Code Ninjas franchise locations. It runs as a React (Vite) + Express + Supabase (PostgreSQL) monorepo. The live site is at `dojolink-neon.vercel.app`, auto-deployed from `imLunah/dojolink` on every push to `main`. Three locations: Yorba Linda, Fullerton, Cerritos. Roles: Center Director (manager), Sensei, Parent.

---

### 2. Key Design & Development Decisions

- **Per-program progress tracking** stored in `student_programs` (one row per student per program). Columns: `last_sub_program`, `last_module_name`, `last_lesson_name`, `last_session_date`, `percent_complete`. Written on every log via `server/routes/progress.js`.

- **`percent_complete` semantics differ by program:**
  - **CREATE** — belt sublevel / max sublevels for current belt.
  - **Robotics Academy / JR** — distinct modules visited ÷ curriculum total for the active sub-program.
  - **AI Academy** — lessons completed within the *current module* (lesson-within-module, not cumulative).
  - **JR** — progress bar removed in parent portal; DB column still populated.

- **Parent portal program cards** (`ProgressVisuals.jsx`) are program-specific (CREATE belt journey, Robotics kit/module paths, AI Academy lesson progress, JR module grid).

- **Club session logging** restricted to managers only; senseis can add/edit notes on any session.

- **Club members** auto-populated from session attendees (`club_members` table, upserted on `PATCH /clubs/:id/attendees`).

- **Location names** stored as short city names (Yorba Linda, Fullerton, Cerritos) — "Code Ninjas " prefix removed from DB.

- **Navbar removed** — mobile uses no top nav bar; sidebar is desktop-only (`hidden lg:flex`).

- **Log Progress nav link removed** from sidebar. Sidebar links: Today's Board, Ninjas, Clubs, Senseis (manager) / Today's Board, Ninjas, Clubs (sensei).

- **Staff credentials**: Any staff can change their own username/password at `/account` (linked from sidebar user card). Managers can reset any sensei's credentials via "Edit Login" on the Senseis page.

- **Profile photos**: Staff can upload a profile photo on `/account`. Stored in Supabase `profile-pics` bucket. Shown in sidebar user card; falls back to initials.

---

### 3. Recent Notable Changes

| Area | What changed |
|------|-------------|
| Sidebar | Logo taller (`h-14`), Roster renamed → Ninjas, Log Progress removed, Navbar removed, user card links to `/account` with profile pic |
| Today's Board | Overdue sorted first, completed ninjas hidden (stat strip shows all), "All done" state |
| Belt Journey | Line centered with icons (`flex items-center` + separate label row), ring shadow removed |
| Club Profile | Two-column layout (pinned note + sessions left; club info + resources right), member count in subtitle, schedule field |
| Club Sessions | Any sensei can add/edit notes (ownership check removed) |
| Account Page | `/account` — change username, password, upload profile photo |
| Staff Page | Manager "Edit Login" button per sensei row (username + password reset) |
| DB | Added `schedule` to `club_definitions`, `club_members` table, `profile_pic_url` to `users`, `profile-pics` storage bucket |

---

### 4. Issues Encountered & Resolutions

- **TDZ ReferenceError** (`b18566d`): `TodayBoard.jsx` used `sorted`/`completedCount` before declaration — moved declarations before early returns.
- **UTC date bug** (`0ebd8d2`): `today()` was returning UTC date for West Coast users — fixed with timezone offset.

---

### 5. Open Questions / Next Steps

- **Parent portal**: Email-based login (no password). "Ninja username/password" for student accounts not yet built — students have no login credentials in current schema.
- **Zapier integration**: `student_monthly_summary` view exists as data source. Zap not built yet.
- **Mobile navigation**: Navbar removed — mobile users have no nav. May need a bottom tab bar.

---

### 6. Files to Read to Get Up to Speed

| File | Purpose |
|------|---------|
| `client/src/components/layout/Sidebar.jsx` | Desktop nav, location switcher, user card with profile pic |
| `client/src/pages/AccountPage.jsx` | Self-service credential + photo management |
| `client/src/pages/manager/StaffPage.jsx` | Sensei list + Edit Login modal |
| `client/src/pages/ClubProfilePage.jsx` | Club detail — two-column layout, sessions, resources |
| `client/src/pages/ClubSessionPage.jsx` | Session detail — notes, attendees, comments |
| `client/src/components/manager/TodayBoard.jsx` | Today's board card grid |
| `client/src/pages/manager/StudentProfile.jsx` | Student detail — belt journey, activity chart, stats |
| `client/src/components/parent/ProgressVisuals.jsx` | Parent portal progress card UIs |
| `client/src/utils/progressData.js` | `SUB_PROGRAMS` and full `CURRICULUM` data |
| `server/routes/clubs.js` | Club sessions, members, profile, resources API |
| `server/routes/users.js` | User CRUD + self/manager credential update endpoints |
| `server/routes/auth.js` | Login, logout, me, switch-location |
| `server/routes/progress.js` | Progress log submission + `percent_complete` writes |
