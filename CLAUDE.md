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

## Security Note
Never mention Claude, Anthropic, or AI in commits, files, docs, or output. Ask first if ever needed.
