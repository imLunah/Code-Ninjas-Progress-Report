# DojoLink — Handoff Summary

### 1. Project Overview

**DojoLink** is a full-stack studio management app for Code Ninjas franchise locations. It runs as a React (Vite) + Express + Supabase (PostgreSQL) monorepo. The live site is at `dojolink-neon.vercel.app`, auto-deployed from `imLunah/dojolink` on every push to `main`. Three locations are supported: Yorba Linda, Fullerton, Cerritos. Roles: Center Director (manager), Sensei, Parent.

**Primary recent objective:** Build a parent-facing progress display and a manager email-preview page that feeds into a future Zapier automation for monthly parent email reports.

---

### 2. Key Design & Development Decisions

- **Per-program progress tracking** is stored in `student_programs` (one row per student per program). New columns: `last_sub_program`, `last_module_name`, `last_lesson_name`, `last_session_date`, `percent_complete`. Written on every progress log submission via `server/routes/progress.js`.

- **`percent_complete` semantics differ by program:**
  - **Robotics Academy / JR** — distinct modules visited ÷ curriculum total for the active sub-program (kit/track).
  - **AI Academy** — lessons completed within the *current module* (mirrors CREATE belt sublevel tracking), not overall module count. This is intentionally lesson-within-module, not cumulative.
  - **JR** — progress bar was removed entirely (only last session date + module grids remain in the parent portal).

- **Parent portal program cards** (`ProgressVisuals.jsx`) are program-specific:
  - **CREATE** — belt image, belt level, sublevel, belt progress bar + sublevel bar, current project.
  - **Robotics Academy** — current kit shown as "belt equivalent", Kit Path (numbered circles), Module Path grid for visited modules, progress bar.
  - **AI Academy** — current module name + "Lesson X of Y" subtitle, indigo progress bar.
  - **JR** — module grids only; no bar.

- **Email preview page** (`/manager/email-preview`) queries the `student_monthly_summary` DB view and renders a visual mock of what each parent's monthly email would look like, so staff can review before Zapier sends.

- **Club session logging** restricted to managers only (senseis removed as of `c54b6c7`).

---

### 3. Notable Code Changes (Last 5 Commits)

| Commit | Files Changed | Summary |
|--------|--------------|---------|
| `9c26bc7` | `ProgressVisuals.jsx`, `parent.js` | Robotics Academy card: Kit Path circles + Module Path grid; API returns `last_sub_program` |
| `e40dee6` | `ProgressVisuals.jsx`, `parent.js`, `progress.js` | AI Academy uses lesson-within-module for bar; JR bar removed; API returns `last_module_name` |
| `0e3cc8d` | `ProgressVisuals.jsx`, `parent.js`, `progress.js`, `schema.sql` | Added `percent_complete` column; auto-compute on log save; progress bar + last session date on all non-CREATE cards |
| `ed7f713` | `App.jsx`, `Navbar.jsx`, `EmailPreviewPage.jsx`, `emailPreview.js`, `progress.js`, `schema.sql` | `student_monthly_summary` view refactored; per-program columns backfilled; email preview page + API route added |
| `c54b6c7` | `App.jsx`, `ClubSessionsPanel.jsx`, `clubs.js` | Club session log/create restricted to managers |

---

### 4. Issues Encountered & Resolutions

- **UTC date bug** (`0ebd8d2`): `today()` was returning UTC date, causing sessions to appear on the wrong day for West Coast users. Fixed by computing local date using timezone offset.
- **Zapier-writable `percent_complete`**: The column was designed to be writable by Zapier in the future (overridable), so AI Academy's `percent_complete` stores lesson-within-module percentage rather than overall completion — this is the Zapier hook point.

---

### 5. Open Questions / Next Steps

- **Zapier integration**: The `student_monthly_summary` view and `email-preview` page exist as the data source. The actual Zapier zap (reading the view → sending emails) has not been built yet.
- **`percent_complete` for Zapier override**: Currently auto-computed server-side. Future plan may allow Zapier to write back to this column directly via Supabase REST.
- **JR progress bar**: Deliberately removed — but if the product direction changes, the DB column (`percent_complete`) is already populated.
- **Kit detection for Robotics Academy**: `last_sub_program` now returned in the parent API, but the Kit Path / Module Path visuals depend on matching this string exactly to `SUB_PROGRAMS` keys. Any curriculum naming changes need to stay in sync between `progressData.js` and the DB.

---

### 6. Immediate Context — Where We Left Off

The last completed task was **`9c26bc7`**: Robotics Academy now shows a Kit Path (numbered circles with connecting line in sequential order) and Module Path grid in the parent portal, matching the visual pattern of the CREATE belt display. The parent API was updated to return `last_sub_program` so the current kit is known client-side.

No in-progress or incomplete tasks were left mid-session. The codebase is clean and deployed.

---

### Files to Read to Get Up to Speed

| File | Purpose |
|------|---------|
| `client/src/components/parent/ProgressVisuals.jsx` | All parent portal progress card UIs (CREATE, Robotics, AI, JR) |
| `client/src/utils/progressData.js` | `SUB_PROGRAMS` and full `CURRICULUM` — the authoritative lesson/module data |
| `server/routes/progress.js` | Progress log submission + `percent_complete` / tracking column writes |
| `server/routes/parent.js` | Parent API — `STUDENT_PROGRAMS_SUBQUERY`, what fields are exposed |
| `client/src/pages/manager/EmailPreviewPage.jsx` | Email preview UI — data shape used for rendering |
| `server/routes/emailPreview.js` | Email preview API route (queries `student_monthly_summary`) |
| `supabase/schema.sql` | Current DB schema including `student_programs` columns and `student_monthly_summary` view |
| `client/src/utils/beltConfig.js` | Belt names, level caps, colors (CREATE program only) |
