# DojoLink — Claude Notes

## Admin Debug Account

- **Username:** `admin`
- **Password:** `@0181Ninjas`
- **Role:** `admin` (bypasses all role gates — manager + sensei access everywhere)
- **Locations:** Can switch between all centers (Yorba Linda, Fullerton, Cerritos)
- **UI:** Floating AdminBar at bottom center with Manager / Sensei view toggle

### What admin bypasses
- `requireManager` — all manager-only API routes
- `requireSensei` — all sensei/manager API routes
- `requireOwnLocation` — can write to any location, not just home
- All `isManager` UI guards (edit buttons, add/delete controls, club management, etc.)

### How admin role works
- Third value in the DB `role` CHECK constraint: `('manager','sensei','admin')`
- Server middleware (`server/middleware/auth.js`) checks `['manager','admin']` or `['manager','sensei','admin']`
- Frontend guards use the same arrays throughout

---

## Admin Panel Pages (`/admin/*`)

All require `role = 'admin'`. Nav tabs: Locations · Users · Curriculum · Settings.

### Locations (`/admin/locations`)
- **Edit** — rename a location (duplicate-name check)
- **Deactivate / Activate** — toggles `locations.active` flag; greyed out when inactive, data preserved
- **Delete** — cascade hard-delete: requires typing the location name to confirm; removes all students, staff, progress logs, clubs, assignments, etc. in a transaction

### Users (`/admin/users`)
- Lists all staff (manager + sensei) across all locations; filterable by location, role, active status
- **Create** — generates a `Ninja####!` temp password shown once in a modal
- **Edit** — change display name, role, or location
- **Reset PW** — generates new temp password shown once
- **Deactivate / Restore** — toggles `users.active`
- **Delete** — permanent hard-delete; requires typing username to confirm; nullifies FK refs (progress logs, club sessions, assignments, comments) in a transaction

### Settings (`/admin/settings`)
- **Announcement banner** — free-text (max 300 chars) stored in `app_settings` table; shown to all staff as a dismissable amber banner at the top of every page; keyed to content so a new message re-shows even if previous was dismissed; clear to hide

### Curriculum (`/admin/curriculum`)
- Existing — module/lesson editor for AI Academy, Robotics Academy, JR; belt-project editor for CREATE

---

## Student Archive vs. Delete (Manager / CD level)

- **Archive** (soft delete) — sets `students.active = false`; recoverable from the Archived view in the roster
- **Delete Permanently** — cascade hard-delete; removes progress logs, programs, assignments (club records auto-cascade)

Available in two places:
- **Student Profile** — "Archive Ninja" and "Delete Permanently" as separate two-step inline actions
- **Student Roster (active view)** — bulk select → **Archive (X)** or **Delete (X)** buttons; each has its own confirm step
- **Student Roster (archived view)** — per-row **Restore** and **Delete** (inline confirm); manager only — senseis cannot see or reach the archived view

### Sensei restrictions
- Senseis cannot see the "Archived" toggle button
- The `inactive=true` query param is only sent when `isManager` is true
- Restore/Delete actions in archived rows are also gated by `isManager`

---

## Key DB Tables Added
- `app_settings (key TEXT PK, value TEXT, updated_by INT → users, updated_at TIMESTAMPTZ)` — global key-value config; currently used for `announcement`
- `locations.active BOOLEAN DEFAULT true` — soft-disable flag for locations

---

## Known Bugs Fixed (sandbox branch)

### Server — Data Integrity
- **Progress log 500** — `lastEntry` was declared inside the transaction `try` block but used after it (block-scoped). Fixed: declare `let lastEntry` before the `try`.
- **Progress POST no transaction** — log inserts + student_programs + assignment-complete updates were non-atomic. Fixed: wrapped in `BEGIN/COMMIT` using a pool client.
- **Import route no transaction** — student + program inserts inside the bulk import loop were non-atomic. Fixed: wrapped entire loop in a transaction.
- **Location DELETE FK gap** — `progress_log_comments.user_id` and `club_session_comments.user_id` were NOT nullified before deleting users in a location cascade, causing FK violation. Fixed: added nullify steps before user delete.
- **ROLLBACK swallowing original error** — `await client.query('ROLLBACK')` inside catch could throw and replace `txErr`. Fixed: `.catch(() => {})` on the ROLLBACK.

### Server — Auth & Authorization
- **Bug reports blocked for parents** — `requireSensei` on `POST /api/bugs` blocked parent sessions. Fixed: replaced with `requireAnySession` that accepts `userId` (staff) or `parentEmail` (parent).
- **Manager credential escalation** — `PATCH /users/:id/credentials` had no role check; managers could reset another manager's password. Fixed: added `role !== 'sensei'` guard.
- **Program update missing location ownership** — `PATCH /students/:id/programs/:program` never checked `location_id`. Fixed: `UPDATE ... FROM students WHERE s.location_id = $7`.
- **`isManager` excluded admin** — Several routes used `role === 'manager'` instead of `['manager','admin'].includes(role)`, blocking admin from GET /students/:id (archived students returned 404) and PATCH /clubs/:id/notes (returned 404). Fixed throughout.
- **Parent email oracle** — Login error revealed whether an email existed. Fixed: generic error message.

### Server — Stale / Incorrect Data
- **Inactive report mismatch** — `NOT EXISTS` check used `daily_assignments` but `last_session` used `progress_logs`; students with logs but no assignments appeared falsely inactive. Fixed: consistent use of `progress_logs`.
- **Announcement missing from login response** — Banner never showed on first login, only after page refresh. Fixed: added announcement query to `POST /auth/login` response.
- **`/me` crash on deleted location** — `activeLocation` could be `undefined` if the session's location was deleted. Fixed: `WHERE active = true`, returns `[]` instead of `[undefined]`.

### Client — Crashes
- **`btoa()` crash** — Announcement storage key used `btoa(text)` which throws on emoji/em-dash. Fixed: `encodeURIComponent(text)`.
- **StaffPage `ReferenceError`** — `handleRemove` called `setConfirmRemoveId(null)` which was never declared. Fixed: removed the call.
- **Rules of Hooks violation in AdminBar** — `useEffect` was placed after an early return. Fixed: moved before the guard.
- **`ClubSessionPage` null crash** — Loading guard checked `!clubDef` but not `!session`; a failed session fetch left `session` null and crashed on render. Fixed: added `|| !session`.
- **`ClubSessionsPanel` null sessions prop** — `[...sessions]` threw if `sessions` prop was `undefined`. Fixed: default prop `= []`.

### Client — Silent Failures / Stale State
- **Stale curriculum cache on logout** — Module-level `_cache` in CurriculumContext was never cleared on logout; second user saw first user's data. Fixed: `invalidateCurriculumCache()` in both `AuthContext.logout()` and `ParentAuthContext.logout()`.
- **`ClubSessionsPanel` attendees wiped** — `onAttendeesUpdated` called with `[]` when `allStudents` hadn't loaded. Fixed: skips callback when `allStudents` is empty.
- **ProgressVisuals hidden for new students** — Gated on `session_logs.length > 0`, so students with programs but zero logs saw nothing. Fixed: removed the session_logs guard.
- **`AddStudentPage` partial creation** — If student created but program enrollment failed, showed generic error with no path forward. Fixed: navigates to student profile on partial failure.
- **`AuthContext.logout()` stale state on network error** — `setUser(null)` only ran on success. Fixed: moved to `finally` block.

### Client — Wrong Logic
- **`EnrollmentEditModal` UPPER_BELTS** — Purple, Brown, Red were in `UPPER_BELTS = ['Purple','Brown','Red','Black']`, hiding the sublevel field for belts that have sublevels. Fixed: only `['Black']`.
- **`CurriculumPage` wrong `program` field** — `handleAddModule` sent the sub-program name as `program` instead of the parent program name. Fixed: always sends `selectedProgram`.
- **Ozobot Evo missing** — Not in `KIT_ORDER` or `KIT_TOTALS`; enrolled students showed 0% and no highlighted node. Fixed: added with 2 modules.
- **`SenseiProfileModal` Edit Login shown for managers** — No role guard; clicking it now returns 403 from the server. Fixed: hidden with `sensei.role !== 'manager'`.

---

## Security Note
Never mention Claude, Anthropic, or AI in commits, files, docs, or output. Ask first if ever needed.
