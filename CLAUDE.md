# PROJECT CONTINUATION DOCUMENT
## Session 7 — 15 May 2026

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
  - Deploy target is **Vercel** via auto-deploy from `imLunah/dojolink` `main` branch. Every push to `main` is live on `dojolink-neon.vercel.app`.
  - **Sandbox-first workflow:** All new features and changes go to the `sandbox` branch first. Only push to `main` when the user explicitly says to release/ship it. Never push to `main` on your own.
  - **Always commit and push to sandbox immediately** — user tests on the sandbox Vercel preview URL.
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
  - **JR sequential progress:** JR Coding tracks highest module reached (all prior credited). Snap Circuits tracks highest Project N / 24. `jr_percent_complete` in `student_monthly_summary` view for Zapier.
  - **CREATE belt curriculum with full project names:** `beltConfig.js` has `BELT_LEVEL_PROJECTS` covering White–Red. Project dropdown shows actual game titles with Build/Solve/Adventure section labels (White–Blue) or plain titles (Purple/Brown/Red).

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
  - `client/src/utils/beltConfig.js` — belt metadata + full `BELT_LEVEL_PROJECTS` map (White–Red game titles)
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

- **What was worked on (Session 7 — 15 May 2026):**
  1. **Custom Classes — built and fully removed:** A complete custom program feature was built (managers create programs with modules/lessons, full check-in and progress tracking, parent portal integration, Zapier view columns). User then requested it be removed entirely. All code, routes, context, pages, DB tables (`custom_programs`, `custom_program_modules`, `custom_program_lessons`), and view columns were deleted. `ProgramBadge` simplified back to a self-contained component with no context dependency. Nav tabs (Classes) removed from Sidebar and MobileNav. This feature does NOT exist in the codebase — do not reference it.
  2. **`student_programs_current_project_check` constraint dropped:** This DB constraint only allowed `['Build 1', 'Build 2', 'Build 3', 'Solve 1', 'Solve 2', 'Solve 3', 'Adventure']` for `current_project`. Broke progress logging once full game titles from `beltConfig.js` were introduced in Session 6. Dropped via migration — `current_project` now accepts any string.
  3. **JR sequential progress (built this session):** `POST /api/progress` now computes JR percent_complete sequentially: JR Coding uses highest module index reached (all prior credited, not distinct count); Snap Circuits uses highest "Project N" number / 24. `student_monthly_summary` view gained `jr_percent_complete` column.
  4. **Parent portal JR visuals:** `ProgressVisuals.jsx` shows per-kit progress for JR — JR Coding has module dot grid (greened up to highest reached), Snap Circuits shows "Project X of 24" progress bar.

- **What was worked on (Session 6 — 14 May 2026):**
  1. **CREATE belt curriculum — full project names:** `beltConfig.js` now contains `BELT_LEVEL_PROJECTS` covering all belts (White through Red). Each belt level maps to its actual project names from the "Belt Project Names.md" curriculum doc. Project dropdown on the CREATE log form shows these names once a sublevel is selected.
  2. **Section labels on project dropdown:** White–Blue belts show `Build 1: [name]`, `Solve 1: [name]`, …, `Adventure: [name]` — label derived from array position (even=Build, odd=Solve, last=Adventure). Purple/Brown/Red show plain game titles only.
  3. **Purple/Brown/Red level counts fixed:** Purple=11, Brown=17, Red=4 (were all `null` — senseis couldn't enter a sublevel for these belts at all).
  4. **Build 4/5 and Solve 4/5 added to PROJECTS list** — needed for Green level 5 (11 columns) and Blue level 2 (9 columns).
  5. **Sublevel 0 rejected:** `BeltProgressFields` now blocks input of 0 or negative — only 1 through `maxLevel` accepted. `ProjectFields` `needsSublevel` guard also catches `< 1`.
  6. **Project cleared on belt/sublevel change:** `BeltProgressFields` calls `setProject('')` whenever belt or sublevel changes so stale project names from a different level don't carry over.
  7. **"Prove Yourself" naming:** PYS variants for Purple/Brown are labeled "Prove Yourself - [name]" (e.g. "Prove Yourself - Color Drop"). Not a separate level — same level's harder variant.
  8. **Canva avatar picker — built and scrapped:** Downloaded 12 ninja illustrations from Canva "Ninjas" folder, uploaded to `profile-pics/avatars/` in Supabase, built a picker grid on AccountPage. User scrapped the feature. Code reverted. Images remain in Supabase storage (user to delete via dashboard — anon key lacks DELETE permission on storage).
  9. **Log Progress button hidden for read-only managers:** `ClubSessionsPanel` wraps the "Log Progress" button with `!isReadOnly` — managers viewing another location's clubs can no longer see or click it.

- **What was worked on (Session 5 — 14 May 2026):**
  1. **Add Staff / role toggle:** `AddSenseiModal` renamed concept to "Add Staff"; added two-button role toggle (Sensei / Center Director); sensei display names auto-prefixed with "Sensei " on submit if not already prefixed; live preview hint shown while typing; button label updates to "Add Sensei" or "Add Center Director"
  2. **Staff page role labels:** Every row in StaffPage now shows a role badge — "Sensei" in muted gray for senseis, "Director" in blue for managers (previously only Directors had a label)
  3. **Sensei staff nav:** Added `/manager/staff` to `senseiLinks` in Sidebar.jsx — senseis can now navigate to the Staff page from the desktop sidebar (MobileNav already showed it to all roles)
  4. **Location isolation — LogClubPage:** Added `isReadOnly` check; managers viewing another location see a blocked amber state instead of the log form — prevents creating club sessions for the wrong center
  5. **Location isolation — club comments:** `POST /api/clubs/:id/comments` was missing `requireOwnLocation` — added so staff can't comment on another location's club sessions
  6. **Mobile logout:** `AccountPage` now imports `useNavigate` + `logout`; "Sign Out" button added at bottom of page with `ninja-red` border styling
  7. **Parent note on log page:** Removed `ParentNote` component (sensei→parent note, now scrapped). Replaced with read-only display of `student.special_instructions` (parent's "Note for Senseis") shown as a blue card on LogProgressPage — senseis see what parents wrote, without being able to edit it from there
  8. **Parent portal cleanup:** Removed "Note from Your Sensei" block from `ParentStudentProfile.jsx` (was reading `parent_note` which is no longer written anywhere); deleted `ParentNote.jsx`

- **What was worked on (Sessions 1–4 — 14 May 2026):**
  - Multiple check-ins per day, session number badges, multi-lesson log form, SenseiProfileModal redesign, profile photos, crop modals, Framer Motion animations — all detailed in prior session entries.

- **Decisions made and why:**
  - **Custom Classes removed:** User decided the feature concept didn't fit. Entire feature (code + DB) torn out cleanly. Do not re-introduce.
  - **`current_project` constraint dropped:** The old constraint was a leftover from before full game titles existed. Now that `beltConfig.js` has real project names, any string must be allowed.
  - **JR sequential vs. distinct progress:** "If student starts at Module 5, prior modules are credited." Solved with `MAX(module_index)` not `COUNT(DISTINCT)`.

- **What changed in the system (Session 7):**
  - DB: dropped `student_programs_current_project_check` constraint (was blocking full game titles)
  - DB: dropped `custom_programs`, `custom_program_modules`, `custom_program_lessons` tables
  - DB: `student_monthly_summary` view — added `jr_percent_complete` column (at end); removed `custom_programs_this_month`/`custom_sessions_this_month` columns (added and removed same session)
  - `server/routes/progress.js`: JR sequential logic added; custom program block removed
  - `server/routes/daily.js`: custom program auto-enrollment block removed; back to standard enrollment check only
  - `server/routes/parent.js`: `is_custom` field removed from programs subquery
  - `server/index.js`: `custom-programs` route registration removed
  - `client/src/components/ui/ProgramBadge.jsx`: simplified — no context dependency, no `isCustom` prop, just PROGRAM_COLORS map + gray fallback
  - `client/src/components/layout/Sidebar.jsx`: Classes link removed from both managerLinks and senseiLinks; classes NavIcon removed
  - `client/src/components/layout/MobileNav.jsx`: Classes tab and `ClassesIcon` removed
  - `client/src/App.jsx`: `CustomProgramsProvider` wrapper removed; `/manager/classes` route removed
  - `client/src/components/manager/AddStudentToday.jsx`: custom programs appending removed
  - `client/src/components/sensei/LogEntryForm.jsx`: custom program detection removed; `LessonEntryRow` simplified (no `customCurriculum` prop)
  - `client/src/pages/parent/ParentStudentProfile.jsx`: `is_custom` references removed
  - `client/src/components/parent/ProgressVisuals.jsx`: `CustomProgramProgress` component removed; entry point simplified; JR section added with sequential kit progress
  - Deleted: `server/routes/custom-programs.js`, `client/src/context/CustomProgramsContext.jsx`, `client/src/pages/manager/CustomProgramsPage.jsx`

- **What changed in the system (Session 6):**
  - `client/src/utils/beltConfig.js`: `BELT_LEVEL_PROJECTS` added covering White/Yellow/Orange/Green/Blue/Purple/Brown/Red; Purple→11, Brown→17, Red→4 levels; `PROJECTS` gains Build 4/5, Solve 4/5; `getLevelProjects()` helper exported
  - `client/src/components/sensei/ProjectFields.jsx`: imports `BELT_LEVEL_PROJECTS`/`getLevelProjects`; shows "select sublevel first" for any belt with specific project data; applies `Build N:` / `Solve N:` / `Adventure:` prefix labels for White–Blue; Purple/Brown/Red plain titles only
  - `client/src/components/sensei/BeltProgressFields.jsx`: rejects sublevel 0/negative; accepts `setProject` prop and clears project on belt or sublevel change
  - `client/src/components/sensei/LogEntryForm.jsx`: passes `beltLevel`/`beltSublevel` to `ProjectFields`; passes `setProject` to `BeltProgressFields`
  - `client/src/components/shared/ClubSessionsPanel.jsx`: "Log Progress" button wrapped with `!isReadOnly`

- **Discussed but not implemented:**
  - "Keep me signed in" persistence (checkbox exists as UI only)
  - Google/Apple SSO (intentionally excluded per user)
  - "New center? Get DojoLink" link (no URL yet)

- **Open threads:**
  - Old `/parent/login` page (`ParentLogin.jsx`) still exists and is routed — could be cleaned up
  - Mobile responsiveness was focused on login + staff pages; other pages may still have mobile layout issues
  - Club cover photos upload to `club-resources` bucket without cache-busting on update — if a cover is replaced, the old URL's CDN cache may serve the stale image briefly
  - `parent_note` column still exists on the `students` table in the DB — data is no longer written or read by the app but the column was not dropped (safe to leave or drop later)
  - 12 ninja avatar images still sitting in `profile-pics/avatars/` on Supabase storage — user to delete via Supabase dashboard (Storage → profile-pics → avatars folder). Anon key has no DELETE permission so cannot be removed programmatically.

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
  - JR percent_complete is updated based on which sub-program was just logged. Only one `percent_complete` column per student/program row. If a student does Snap Circuits, it updates the overall JR percent — JR Coding's progress is recalculated dynamically in the parent portal from `session_logs`, not from `percent_complete`.

- **Technical debt:**
  - `react-easy-crop` CSS may need to be imported explicitly in some setups — it's included via the npm package automatically but worth verifying.
  - The `cropImage.js` canvas approach uses `maxSize = Math.max(width, height)` for rotation — for very large images this creates a large canvas but it's fine for typical photo sizes.
  - `progressData.js` is ~11KB of hardcoded curriculum data — not in DB. If curriculum changes, this file must be updated manually.
  - Club cover photos are stored as new files on each upload (timestamp path) — old files in the `club-resources` bucket are never cleaned up automatically.

- **Assumptions that could be wrong:**
  - Assumes `user.id` is always available when uploading profile pic — if session expires mid-upload, the path would be `users/undefined/avatar.jpg`.
  - Assumes Supabase anon key has storage access — verified in a prior session via RLS migration, but if bucket permissions change on Supabase dashboard it will break.
  - The `profile_pic_url` column exists on the `users` table — was added in a previous session, not re-verified this session.

---

### 6. HOW TO THINK ABOUT THIS PROJECT

1. **Core architectural pattern:** The app uses Express sessions (not JWT, not Supabase Auth) stored in PostgreSQL via `connect-pg-simple`. This is the single most important thing to understand — all auth, middleware (`requireSensei`, `requireParent`), and session checks flow through `req.session`. The Supabase JS client is a thin wrapper used ONLY for storage bucket operations with the anon key. Never mix these up.

2. **Most common mistake a new person would make:** Assuming Supabase Auth is in use and trying to use `supabase.auth.getUser()` or RLS policies that reference `auth.uid()`. They would also likely try to add Supabase Auth middleware instead of using the Express session middleware already in place.

3. **What looks like it should be refactored but shouldn't be:** The `progressData.js` file looks like it should live in the database — it's a large hardcoded curriculum object. It's intentionally kept client-side because it's static reference data that never changes during a session and would add unnecessary DB queries on every log. The per-program `percent_complete` semantics are also intentionally different per program (CREATE uses belt sublevels, Robotics uses module counts, AI Academy uses lesson-within-module, JR uses sequential module index) — don't try to unify this logic.

4. **Z-index layering rule:** MobileNav is `z-40`. All modals/overlays are `z-50`. This is intentional — MobileNav must be lower so modals cover it. Do NOT raise MobileNav back to `z-50`.

5. **Framer Motion `drag` blocks child scroll:** Never put `drag` on a container that has `overflow-y-auto` children. Framer Motion applies `touch-action: none` to draggable elements, which the browser interprets as "I'm handling all touch events" — scrolling inside child elements stops working. For swipe-to-dismiss on bottom sheets, use raw `onTouchStart`/`onTouchEnd` on the header area instead.

6. **DB check constraints and new features:** The `student_programs_current_project_check` constraint (now dropped) was a lesson learned — don't add enumerative CHECK constraints on fields that will grow (like project names). Accept any string at the DB level and validate in application logic if needed.

7. **Vercel deploy timing + DB changes:** When dropping DB tables/columns and pushing code changes in the same session, there's a window where Vercel may be running old code against the new DB schema, causing 500s. The safest order: push the code change FIRST, wait for Vercel to deploy, THEN do the DB migration. Dropping tables before the code referencing them is deployed will cause temporary 500s.

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
- Do NOT re-introduce the custom classes / custom programs feature — it was explicitly removed by the user.
- Do NOT add enumerative DB CHECK constraints on fields that may grow (like project names, program names) — accept any string at the DB level.

---

### 8. CONFIDENCE & FRESHNESS

- **Section 1 (Project Identity):** HIGH CONFIDENCE — verified against codebase this session
- **Section 2 (Current State):** HIGH CONFIDENCE — built/fixed directly this session
- **Section 3 (Architecture):** HIGH CONFIDENCE — verified files and routes this session
- **Section 4 (Recent Work — Session 7):** HIGH CONFIDENCE — all work done this session with successful builds and pushes
- **Section 5 (What Could Go Wrong):** MEDIUM — edge cases inferred from code review, not exhaustively tested
- **Section 6 (How to Think):** HIGH CONFIDENCE — points 4, 5, 6, 7 confirmed by debugging this session
- **Section 7 (Do Not Touch):** HIGH CONFIDENCE — derived from explicit user feedback and memory files

---
