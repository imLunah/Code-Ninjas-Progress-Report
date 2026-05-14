# PROJECT CONTINUATION DOCUMENT
## Session 5 — 14 May 2026

---

### 1. PROJECT IDENTITY

- **Project Name:** DojoLink
- **What This Project Is:** A full-stack studio management web app for Code Ninjas franchise locations. Used by Center Directors (managers) and Senseis (staff) to manage daily student check-ins, belt progress logging, clubs, and staff. Includes a separate parent-facing portal.
- **Primary Objective:** Replace manual/spreadsheet workflows at Code Ninjas centers with a real-time digital board — daily check-ins, progress logs, club management, parent visibility.
- **Strategic Intent:** A custom internal tool built specifically for Code Ninjas franchise operators. Long-term may expand to more locations or integrate with MyStudio/Zapier for automated parent communications.
- **Hard Constraints:**
  - App uses **Express sessions for authentication** — NOT Supabase Auth. The Supabase JS client is used only for storage (profile pics). Do not introduce Supabase Auth.
  - Three locations: Yorba Linda, Fullerton, Cerritos. Location names stored as short city names (no "Code Ninjas" prefix).
  - Roles: `manager` (Center Director), `sensei`, `parent`. Parents are a completely separate auth context.
  - Deploy target is **Vercel** via auto-deploy from `imLunah/dojolink` `main` branch. Every push is live.
  - **Always commit and push immediately** — user tests on the live Vercel site.
  - **Never add Co-Authored-By lines to commits.** User does not want Claude on GitHub contributors list.
  - Use `lg` (1024px) breakpoint for the sidebar/mobile nav split — not `md`.
  - Use inline Confirm/Cancel pattern for destructive actions — never `window.confirm`.

---

### 2. WHAT EXISTS RIGHT NOW

- **Built and working:**
  - Staff login (username + password via Express session)
  - Parent login (email-based, separate session) — now inline on main login page via Parent tab
  - Today's Board (manager + sensei dashboards) with daily check-in, belt logging
  - Student Roster with search, filter, CSV import
  - Student Profile with belt journey, activity chart, progress stats
  - Club management (club definitions, sessions, attendees, notes, resources)
  - Sensei Staff page with profile modal, Edit Login, Remove
  - Account page with username/password change and profile photo upload with **crop modal**
  - Mobile bottom nav bar with location switcher
  - Framer Motion animations across login, dashboard, boards, clubs, account, sensei profile modal
  - Code Ninjas branded assets used as decorative elements (CN star watermark, celebrate/laptop images)
  - Supabase `profile-pics` storage bucket with correct RLS policies (anon insert/update/select)
  - Club cover photo upload with **crop modal** (16:9 aspect, rect crop) — manager only, uploads to `club-resources` bucket
  - Add Staff modal with role toggle (Sensei / Center Director) — CDs can create new manager accounts; sensei names auto-prefixed with "Sensei "
  - Staff page shows role label under every staff member ("Sensei" in muted gray, "Director" in blue)
  - Senseis can view the Staff page (Senseis link added to sensei nav in Sidebar and already in MobileNav)
  - Location isolation: managers viewing another location are blocked from writing — `LogClubPage` now shows a blocked state when `isReadOnly`; club comments route (`POST /:id/comments`) now has `requireOwnLocation`
  - Mobile logout: Account page now has a "Sign Out" button visible on all screen sizes
  - Parent "Note for Senseis" (`special_instructions`) displayed read-only on LogProgressPage so senseis can see parent notes while logging
  - Parent note from sensei feature removed (was `ParentNote.jsx` + `parent_note` DB field usage) — concept scrapped, component deleted

- **Partially built:**
  - "Keep me signed in" checkbox on login — UI only, not functional server-side
  - `student_monthly_summary` DB view exists as Zapier data source — Zap not built

- **Broken or blocked:**
  - Nothing currently known to be broken after this session's fixes

- **Not started yet:**
  - Zapier integration for parent communications
  - Student login credentials (students have no login in current schema)
  - Password reset flow ("Forgot?" link is absent by design for now)
  - Google/Apple SSO (intentionally excluded)
  - "New center? Get DojoLink" marketing link (no landing page yet)

---

### 3. ARCHITECTURE & TECHNICAL MAP

- **Tech Stack:**
  - Frontend: React 18 (Vite), Tailwind CSS, Framer Motion, react-easy-crop, react-router-dom v6
  - Backend: Node.js, Express 4, express-session, connect-pg-simple (session store), bcryptjs
  - Database: PostgreSQL via Supabase (uses `pg` pool directly, NOT Supabase client for DB queries)
  - Storage: Supabase Storage (`profile-pics` bucket) via `@supabase/supabase-js` anon client
  - Deploy: Vercel (frontend static + Express as serverless via `api/index.js`)
  - Monorepo: `/client` (Vite React) + `/server` (Express) + `/api/index.js` (Vercel entry)

- **Key files:**
  - `client/src/context/AuthContext.jsx` — staff auth state, `login`, `logout`, `switchLocation`, `setUser`
  - `client/src/context/ParentAuthContext.jsx` — parent auth state, separate from staff
  - `client/src/components/layout/Layout.jsx` — wraps all staff pages (Sidebar + MobileNav + main)
  - `client/src/components/layout/MobileNav.jsx` — bottom tab bar for mobile (lg:hidden)
  - `client/src/components/layout/Sidebar.jsx` — desktop nav (hidden lg:flex)
  - `client/src/components/layout/ParentLayout.jsx` — parent portal nav wrapper
  - `client/src/components/layout/ParentRoute.jsx` — redirects to `/login?tab=parent` if not authed
  - `client/src/pages/LoginPage.jsx` — unified login (staff + parent tabs)
  - `client/src/pages/AccountPage.jsx` — profile photo crop/upload + credentials
  - `client/src/components/ui/CropModal.jsx` — photo crop/rotate modal (react-easy-crop)
  - `client/src/utils/cropImage.js` — canvas getCroppedImg utility
  - `client/src/utils/progressData.js` — full curriculum data (large file ~11KB)
  - `server/routes/` — auth, users, students, clubs, progress, parent, daily
  - `vercel.json` — build command + rewrite rules
  - `api/index.js` — `module.exports = require('../server/index.js')` (Vercel serverless entry)

- **Core logic flow:**
  1. User visits `/` → `RoleRedirect` checks session via `GET /api/auth/me` → redirects to dashboard
  2. Staff login: POST `/api/auth/login` → sets Express session → returns user object with role, locations
  3. Parent login: POST `/api/parent/login` (email only) → sets separate session → navigates to `/parent/dashboard`
  4. All API calls go through `client/src/api/client.js` — fetch wrapper with `credentials: 'include'`
  5. Vercel rewrites `/api/*` → `api/index.js` (Express app)
  6. Profile photo: file picker → CropModal → getCroppedImg (canvas) → Supabase storage upload (anon key) → PATCH `/api/users/me/avatar` (saves URL to DB)

- **Naming conventions:**
  - Tailwind colors: `ninja-navy`, `ninja-blue`, `ninja-blue-hover`, `ninja-muted`, `ninja-bg`, `ninja-border`, `ninja-red`
  - Font: `font-ninja` (Nunito)
  - Routes: `/manager/*` for manager-only, `/sensei/*` for sensei-only, `/clubs/*` shared staff, `/parent/*` parent portal

- **External dependencies:**
  - Supabase project: `hatlannivniuauafptzk.supabase.co`
  - Vercel: `dojolink-neon.vercel.app`
  - GitHub: `imLunah/dojolink`

---

### 4. RECENT WORK — WHAT JUST HAPPENED

- **What was worked on (Session 5 — 14 May 2026):**
  1. **Add Staff / role toggle:** `AddSenseiModal` renamed concept to "Add Staff"; added two-button role toggle (Sensei / Center Director); sensei display names auto-prefixed with "Sensei " on submit if not already prefixed; live preview hint shown while typing; button label updates to "Add Sensei" or "Add Center Director"
  2. **Staff page role labels:** Every row in StaffPage now shows a role badge — "Sensei" in muted gray for senseis, "Director" in blue for managers (previously only Directors had a label)
  3. **Sensei staff nav:** Added `/manager/staff` to `senseiLinks` in Sidebar.jsx — senseis can now navigate to the Staff page from the desktop sidebar (MobileNav already showed it to all roles)
  4. **Location isolation — LogClubPage:** Added `isReadOnly` check; managers viewing another location see a blocked amber state instead of the log form — prevents creating club sessions for the wrong center
  5. **Location isolation — club comments:** `POST /api/clubs/:id/comments` was missing `requireOwnLocation` — added so staff can't comment on another location's club sessions
  6. **Mobile logout:** `AccountPage` now imports `useNavigate` + `logout`; "Sign Out" button added at bottom of page with `ninja-red` border styling
  7. **Parent note on log page:** Removed `ParentNote` component (sensei→parent note, now scrapped). Replaced with read-only display of `student.special_instructions` (parent's "Note for Senseis") shown as a blue card on LogProgressPage — senseis see what parents wrote, without being able to edit it from there
  8. **Parent portal cleanup:** Removed "Note from Your Sensei" block from `ParentStudentProfile.jsx` (was reading `parent_note` which is no longer written anywhere); deleted `ParentNote.jsx`

- **What was worked on (Session 4 — 14 May 2026):**
  1. **Club cover photo crop:** `ClubInfoCard` in `ClubProfilePage.jsx` now reads the selected file as a DataURL → opens `CropModal` with `aspect={16/9}` and `cropShape="rect"` → uploads cropped JPEG blob to Supabase `club-resources` bucket at path `covers/{clubDef.id}/{timestamp}.jpg`
  2. **CropModal now accepts props:** Added `aspect` (default `1`) and `cropShape` (default `'round'`) props — AccountPage uses defaults (no change needed), ClubInfoCard passes 16/9 rect
  3. **CropModal mobile layout fix:** Restructured to `flex flex-col overflow-hidden max-h-[88vh]` — header (`flex-shrink-0`), crop area (`flex-shrink-0`, 240px), sliders (`flex-1 min-h-0 overflow-y-auto`), buttons (`flex-shrink-0` pinned to bottom). Buttons are now always visible regardless of screen height.
  4. **MobileNav z-index fix:** Changed `MobileNav` from `z-50` → `z-40`. Root cause: both MobileNav and all modals were `z-50`; since MobileNav renders later in the DOM it was winning the tie, painting the LocationBar ("Yorba Linda" select) on top of modal buttons and hiding them entirely.
  5. **SenseiProfileModal scrollable + swipe-dismiss:** Added `max-height: 90vh` with `flex flex-col overflow-hidden`; hero header is `flex-shrink-0`; content area (logs + manager actions) is `overflow-y-auto flex-1 min-h-0`. Removed Framer Motion `drag` (was applying `touch-action: none` which blocked all child scrolling). Replaced with raw `onTouchStart`/`onTouchEnd` on the hero header — swipe down 80px closes the sheet. Drag handle pill is now a full-width `h-8` tap button (much easier to hit than old `h-1`).

- **What was worked on (Session 3 — 14 May 2026):**
  1. **Profile pic visibility fix:** `GET /api/users` (role=sensei) and `GET /api/users/:id` were not selecting `profile_pic_url` — added to both queries so other accounts can see uploaded photos
  2. **Staff list avatars:** Each row on StaffPage now shows a circular profile pic (or initials fallback) before the sensei name
  3. **Staff page Framer animations:** Stat cards and sensei rows now animate in with staggered fade-up (60ms per row)
  4. **Inline buttons removed from StaffPage rows:** "Edit Login" and "Remove" buttons fully removed from the sensei list rows on all screen sizes
  5. **Modal buttons always visible:** SenseiProfileModal manager actions (Edit Login + Remove) were `sm:hidden` (mobile only) — removed that restriction so they always appear at the bottom of the profile sheet
  6. **"Add Again" for check-ins:** `AddStudentToday` was disabling the Add button once a student/program was already on the board — changed to show "Add Again" and stay enabled for multiple check-ins

- **What was worked on (Session 2 — 14 May 2026):**
  1. **Multiple check-ins per day:** Dropped unique constraint `daily_assignments_student_program_date_key` on `(student_id, program, session_date)` — managers can now check a ninja into the same program multiple times in one day (makeup classes, double sessions)
  2. **Session number badges:** Today's Board shows a purple "Session 2 / Session 3" badge on cards that are the 2nd+ check-in for the same student/program/day
  3. **Assignment completion fix:** `POST /api/progress` now marks only the **oldest pending** assignment complete (by `id`) — previously updated all matching assignments, which would have incorrectly completed both at once
  4. **Multi-lesson log form:** `LogEntryForm.jsx` refactored — non-CREATE programs now have a `LessonEntryRow` component array with a "+ Add Another Lesson" dashed button. Each row has its own kit/module/lesson selectors. Shared notes field covers all lessons.
  5. **Backend multi-lesson support:** `POST /api/progress` accepts a `lesson_entries` array; inserts one `progress_logs` row per lesson. `student_programs` is updated with the last entry's lesson position. `percent_complete` recalculated after all inserts. Backward compatible — falls back to single-lesson fields if no array.
  6. Submit button updates to "Log N Lessons" when multiple entries are present.

- **What was worked on (Session 1 — 14 May 2026):**
  1. Mobile navigation: registered `MobileNav.jsx` in Layout, added location switcher, made Senseis tab visible to all staff roles
  2. StaffPage mobile: hid inline Edit Login/Remove buttons on mobile (sm:hidden), moved them into SenseiProfileModal footer
  3. SenseiProfileModal: full Framer Motion redesign — navy hero header, circular avatar, role badge, stat cards, staggered log feed, CN star watermark
  4. Fixed orphaned `</div>` in SenseiProfileModal that caused Vercel build failures
  5. Fixed `/parent/me` returning 401 (changed to 200 null) — was flooding console on every staff page
  6. Vite chunk splitting: all major vendors split into separate chunks, chunkSizeWarningLimit: 600
  7. UI overhaul: Framer Motion added to TodayBoard, ManagerDashboard stats, ClubsPage, AccountPage
  8. Login page: full redesign — white bg, left-aligned, tab switcher (Sensei/Director ↔ Parent) with spring sliding indicator, username+password with eye toggle, animated checkbox, alpha modal. No floating background elements.
  9. Parent tab: inline email field calling `useParentAuth.login()` directly
  10. Parent sign-out: redirects to `/login?tab=parent`
  11. Profile photos: Supabase RLS policies added for `profile-pics` bucket (anon insert/update/select)
  12. Photo crop modal: `CropModal.jsx` + `cropImage.js` — file → DataURL → crop → canvas → blob → Supabase upload

- **Decisions made and why:**
  - **Multiple check-ins, manager only:** Only managers can add duplicate check-ins — senseis cannot, consistent with existing check-in permission model
  - **Mark oldest pending assignment:** When logging, mark the first (oldest) incomplete assignment complete so second check-in stays open — not all assignments for that student/program/date
  - **Multi-lesson uses shared notes:** One notes field for the whole session — avoids per-lesson note overhead for senseis
  - **CREATE excluded from multi-lesson UI:** CREATE tracks belt/project snapshots, not lesson lists — the multi-lesson row UI only appears for programs with curriculum (Robotics, AI Academy, JR)
  - **Backward-compatible API:** `lesson_entries` array is optional; single-lesson submissions still work unchanged

- **What changed in the system (Session 5):**
  - `client/src/components/manager/AddSenseiModal.jsx`: role toggle (sensei/manager); auto-prefix "Sensei "; live preview hint; dynamic submit label
  - `client/src/pages/manager/StaffPage.jsx`: role label shown for all staff (both sensei and manager rows)
  - `client/src/components/layout/Sidebar.jsx`: `/manager/staff` added to `senseiLinks`
  - `client/src/pages/sensei/LogClubPage.jsx`: `isReadOnly` imported; blocked state rendered when manager is at non-home location
  - `server/routes/clubs.js`: `requireOwnLocation` added to `POST /:id/comments`
  - `client/src/pages/AccountPage.jsx`: imports `useNavigate` + `logout`; Sign Out button at bottom
  - `client/src/pages/sensei/LogProgressPage.jsx`: replaced `<ParentNote>` with read-only `student.special_instructions` blue card; removed `ParentNote` import
  - `client/src/pages/parent/ParentStudentProfile.jsx`: removed `parent_note` "Note from Your Sensei" block
  - `client/src/components/shared/ParentNote.jsx`: deleted

- **What changed in the system (Session 4):**
  - `client/src/components/ui/CropModal.jsx`: added `aspect`/`cropShape` props; flex-col layout with pinned buttons; crop area 240px; `overflow-hidden` on container
  - `client/src/pages/ClubProfilePage.jsx` (`ClubInfoCard`): added `cropSrc` state; `handleFileChange` now reads DataURL → CropModal; `handleCropConfirm` uploads blob; uses `aspect={16/9} cropShape="rect"`; imports `CropModal`
  - `client/src/components/layout/MobileNav.jsx`: `z-50` → `z-40`
  - `client/src/components/manager/SenseiProfileModal.jsx`: removed Framer `drag`/`useDragControls`; added `useRef` touch tracking; hero header has `onTouchStart`/`onTouchEnd` for swipe-dismiss; content div is `overflow-y-auto flex-1 min-h-0`; safe-area padding on manager actions

- **What changed in the system (Sessions 1–3):**
  - `server/routes/users.js`: both `GET /` (role=sensei) and `GET /:id` now select `profile_pic_url`
  - `client/src/pages/manager/StaffPage.jsx`: avatar in rows, Framer stagger, inline buttons removed, `confirmRemoveId` state removed
  - `client/src/components/manager/SenseiProfileModal.jsx`: removed `sm:hidden` from manager action buttons
  - `client/src/components/manager/AddStudentToday.jsx`: Add button always enabled; shows "Add Again" if already checked in
  - DB: dropped `daily_assignments_student_program_date_key` unique constraint
  - `server/routes/daily.js`: added `session_number` correlated subquery to `ASSIGNMENT_SELECT`; removed 409 guard
  - `server/routes/progress.js`: multi-lesson support via `lesson_entries` array; assignment completion targets specific `id`
  - `client/src/components/manager/TodayBoard.jsx`: purple "Session N" badge on duplicate cards
  - `client/src/components/sensei/LogEntryForm.jsx`: `LessonEntryRow` component, multi-entry state, dynamic submit label

- **Discussed but not implemented:**
  - "Keep me signed in" persistence (checkbox exists as UI only)
  - Google/Apple SSO (intentionally excluded per user)
  - "New center? Get DojoLink" link (no URL yet)

- **Open threads:**
  - Old `/parent/login` page (`ParentLogin.jsx`) still exists and is routed — could be cleaned up
  - Mobile responsiveness was focused on login + staff pages; other pages may still have mobile layout issues
  - Club cover photos upload to `club-resources` bucket without cache-busting on update — if a cover is replaced, the old URL's CDN cache may serve the stale image briefly
  - `parent_note` column still exists on the `students` table in the DB — data is no longer written or read by the app but the column was not dropped (safe to leave or drop later)

---

### 5. WHAT COULD GO WRONG

- **Known issues:**
  - `ParentLogin.jsx` at `/parent/login` still exists — if someone navigates there directly they see the old page. Low priority but could confuse.
  - "Keep me signed in" checkbox does nothing server-side — user expectation mismatch if they expect persistent sessions.

- **Edge cases:**
  - Multiple check-ins: if a manager adds 3 check-ins for a student but only 2 are logged, the 3rd stays permanently pending (shows as overdue next day). No auto-cleanup.
  - Multi-lesson submit: if the sensei adds lesson rows but leaves module blank, those empty rows are filtered out on submit (`filledEntries` filter). A row with only a kit selected but no module is also dropped — only rows with at least one field set are sent.
  - `session_number` uses a correlated subquery counting rows with `created_at <=` — if two assignments are inserted in the same millisecond (very unlikely), their numbers may swap. No real-world impact.
  - Profile pic upload: if Supabase storage goes down or anon key is rotated, uploads fail silently with "Upload failed. Try again." — no retry logic.
  - getCroppedImg uses `crossOrigin: 'anonymous'` — could fail with CORS if image src is not Supabase (unlikely since we generate the DataURL locally).
  - Tab switching on login: if parent login fails, the error shows under the Parent tab correctly; if user switches tabs the error is cleared (`setError('')`) which is correct.

- **Technical debt:**
  - `react-easy-crop` CSS may need to be imported explicitly in some setups — it's included via the npm package automatically but worth verifying.
  - The `cropImage.js` canvas approach uses `maxSize = Math.max(width, height)` for rotation — for very large images this creates a large canvas but it's fine for typical photo sizes.
  - `progressData.js` is ~11KB of hardcoded curriculum data — not in DB. If curriculum changes, this file must be updated manually.
  - Club cover photos are stored as new files on each upload (timestamp path) — old files in the `club-resources` bucket are never cleaned up automatically.

- **Assumptions that could be wrong:**
  - Assumes `user.id` is always available when uploading profile pic — if session expires mid-upload, the path would be `users/undefined/avatar.jpg`.
  - Assumes Supabase anon key has storage access — verified this session via RLS migration, but if bucket permissions change on Supabase dashboard it will break.
  - The `profile_pic_url` column exists on the `users` table — was added in a previous session, not re-verified this session.

---

### 6. HOW TO THINK ABOUT THIS PROJECT

1. **Core architectural pattern:** The app uses Express sessions (not JWT, not Supabase Auth) stored in PostgreSQL via `connect-pg-simple`. This is the single most important thing to understand — all auth, middleware (`requireSensei`, `requireParent`), and session checks flow through `req.session`. The Supabase JS client is a thin wrapper used ONLY for storage bucket operations with the anon key. Never mix these up.

2. **Most common mistake a new person would make:** Assuming Supabase Auth is in use and trying to use `supabase.auth.getUser()` or RLS policies that reference `auth.uid()`. They would also likely try to add Supabase Auth middleware instead of using the Express session middleware already in place.

3. **What looks like it should be refactored but shouldn't be:** The `progressData.js` file looks like it should live in the database — it's a large hardcoded curriculum object. It's intentionally kept client-side because it's static reference data that never changes during a session and would add unnecessary DB queries on every log. The per-program `percent_complete` semantics are also intentionally different per program (CREATE uses belt sublevels, Robotics uses module counts, AI Academy uses lesson-within-module) — don't try to unify this logic.

4. **Z-index layering rule:** MobileNav is `z-40`. All modals/overlays are `z-50`. This is intentional — MobileNav must be lower so modals cover it. Do NOT raise MobileNav back to `z-50`.

5. **Framer Motion `drag` blocks child scroll:** Never put `drag` on a container that has `overflow-y-auto` children. Framer Motion applies `touch-action: none` to draggable elements, which the browser interprets as "I'm handling all touch events" — scrolling inside child elements stops working. For swipe-to-dismiss on bottom sheets, use raw `onTouchStart`/`onTouchEnd` on the header area instead.

---

### 7. DO NOT TOUCH LIST

- Do NOT refactor `progressData.js` to move curriculum data to the database without being explicitly asked.
- Do NOT switch authentication to Supabase Auth — the Express session system is intentional and stable.
- Do NOT change the `percent_complete` calculation logic per program without explicit instruction — each program has different semantics.
- Do NOT add `Co-Authored-By: Claude` to any git commits. Ever.
- Do NOT use `window.confirm` for destructive actions — use inline Confirm/Cancel state pattern.
- Do NOT change the `lg` breakpoint used for sidebar/mobile nav split to `md`.
- Do NOT push code without verifying it builds cleanly (`npm run build` in `/client`).
- Do NOT redesign working pages without being asked — only enhance or fix specific issues.
- Ask before installing new npm packages (user is aware of bundle size implications).
- Preserve all existing Tailwind color token names (`ninja-*`) — they're used everywhere.
- The old `/parent/login` route still exists — do not delete it without checking if any external links point to it.
- Do NOT raise `MobileNav` back to `z-50` — it must stay at `z-40` so modals cover it.
- Do NOT use Framer Motion `drag` on any container that has scrollable children — use `onTouchStart`/`onTouchEnd` for swipe gestures instead.

---

### 8. CONFIDENCE & FRESHNESS

- **Section 1 (Project Identity):** HIGH CONFIDENCE — verified against codebase this session
- **Section 2 (Current State):** HIGH CONFIDENCE — built/fixed directly this session
- **Section 3 (Architecture):** HIGH CONFIDENCE — verified files and routes this session
- **Section 4 (Recent Work — Session 5):** HIGH CONFIDENCE — all work done this session with successful builds and pushes
- **Section 5 (What Could Go Wrong):** MEDIUM — edge cases inferred from code review, not exhaustively tested
- **Section 6 (How to Think):** HIGH CONFIDENCE — points 4 and 5 confirmed by debugging this session
- **Section 7 (Do Not Touch):** HIGH CONFIDENCE — derived from explicit user feedback and memory files

---
