# PROJECT CONTINUATION DOCUMENT
## Session 1 — 14 May 2026

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

- **What was worked on this session:**
  1. Mobile navigation: registered `MobileNav.jsx` in Layout, added location switcher, made Senseis tab visible to all staff roles
  2. StaffPage mobile: hid inline Edit Login/Remove buttons on mobile (sm:hidden), moved them into SenseiProfileModal footer
  3. SenseiProfileModal: full Framer Motion redesign — navy hero header, circular avatar, role badge, stat cards, staggered log feed, CN star watermark
  4. Fixed orphaned `</div>` in SenseiProfileModal that caused Vercel build failures
  5. Fixed `/parent/me` returning 401 (changed to 200 null) — was flooding console on every staff page
  6. Vite chunk splitting: all major vendors split into separate chunks, chunkSizeWarningLimit: 600
  7. UI overhaul: Framer Motion added to TodayBoard, ManagerDashboard stats, ClubsPage, AccountPage
  8. Login page: full redesign matching user mockup — white bg, left-aligned, tab switcher (Sensei/Director ↔ Parent) with spring sliding indicator, username+password with eye toggle, animated checkbox, alpha modal spring animation. No floating star background elements.
  9. Parent tab: inline email field calling `useParentAuth.login()` directly — no more redirect to `/parent/login`
  10. Parent sign-out: `ParentLayout` and `ParentRoute` now redirect to `/login?tab=parent`; LoginPage reads `?tab` param to initialize tab state
  11. Profile photos: diagnosed Supabase RLS policies were missing → applied migration adding anon insert/update/select policies on `profile-pics` bucket
  12. Photo crop modal: installed `react-easy-crop`, created `CropModal.jsx` + `cropImage.js`, wired into AccountPage (file → DataURL → crop modal → canvas → blob → Supabase upload)

- **Decisions made and why:**
  - **No floating stars on login:** User explicitly requested removal of moving background elements
  - **Parent email inline on login page:** User said "just have them enter their email there" — avoids navigation to separate page
  - **Redirect to `/login?tab=parent` on sign-out:** Keeps the unified login page as single entry point
  - **Circular crop shape:** Standard for profile photos; `aspect=1` ensures square crop
  - **Upload as JPEG blob with fixed path `avatar.jpg`:** Simpler than preserving original extension; upsert replaces old file

- **What changed in the system:**
  - New files: `MobileNav.jsx`, `CropModal.jsx`, `cropImage.js`
  - Supabase: 3 new RLS policies on `storage.objects` for `profile-pics` bucket
  - All staff-facing pages now have entrance animations via Framer Motion

- **Discussed but not implemented:**
  - "Keep me signed in" persistence (checkbox exists as UI only)
  - Google/Apple SSO (intentionally excluded per user)
  - "New center? Get DojoLink" link (no URL yet)

- **Open threads:**
  - Old `/parent/login` page (`ParentLogin.jsx`) still exists and is routed — could be cleaned up or kept as fallback
  - Mobile responsiveness was focused on login + staff pages; other pages may still have mobile layout issues

---

### 5. WHAT COULD GO WRONG

- **Known issues:**
  - `ParentLogin.jsx` at `/parent/login` still exists — if someone navigates there directly they see the old page. Low priority but could confuse.
  - "Keep me signed in" checkbox does nothing server-side — user expectation mismatch if they expect persistent sessions.

- **Edge cases:**
  - Profile pic upload: if Supabase storage goes down or anon key is rotated, uploads fail silently with "Upload failed. Try again." — no retry logic.
  - getCroppedImg uses `crossOrigin: 'anonymous'` — could fail with CORS if image src is not Supabase (unlikely since we generate the DataURL locally).
  - Tab switching on login: if parent login fails, the error shows under the Parent tab correctly; if user switches tabs the error is cleared (`setError('')`) which is correct.

- **Technical debt:**
  - `react-easy-crop` CSS may need to be imported explicitly in some setups — it's included via the npm package automatically but worth verifying.
  - The `cropImage.js` canvas approach uses `maxSize = Math.max(width, height)` for rotation — for very large images this creates a large canvas but it's fine for typical photo sizes.
  - `progressData.js` is ~11KB of hardcoded curriculum data — not in DB. If curriculum changes, this file must be updated manually.

- **Assumptions that could be wrong:**
  - Assumes `user.id` is always available when uploading profile pic — if session expires mid-upload, the path would be `users/undefined/avatar.jpg`.
  - Assumes Supabase anon key has storage access — verified this session via RLS migration, but if bucket permissions change on Supabase dashboard it will break.
  - The `profile_pic_url` column exists on the `users` table — was added in a previous session, not re-verified this session.

---

### 6. HOW TO THINK ABOUT THIS PROJECT

1. **Core architectural pattern:** The app uses Express sessions (not JWT, not Supabase Auth) stored in PostgreSQL via `connect-pg-simple`. This is the single most important thing to understand — all auth, middleware (`requireSensei`, `requireParent`), and session checks flow through `req.session`. The Supabase JS client is a thin wrapper used ONLY for storage bucket operations with the anon key. Never mix these up.

2. **Most common mistake a new person would make:** Assuming Supabase Auth is in use and trying to use `supabase.auth.getUser()` or RLS policies that reference `auth.uid()`. They would also likely try to add Supabase Auth middleware instead of using the Express session middleware already in place.

3. **What looks like it should be refactored but shouldn't be:** The `progressData.js` file looks like it should live in the database — it's a large hardcoded curriculum object. It's intentionally kept client-side because it's static reference data that never changes during a session and would add unnecessary DB queries on every log. The per-program `percent_complete` semantics are also intentionally different per program (CREATE uses belt sublevels, Robotics uses module counts, AI Academy uses lesson-within-module) — don't try to unify this logic.

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

---

### 8. CONFIDENCE & FRESHNESS

- **Section 1 (Project Identity):** HIGH CONFIDENCE — verified against CLAUDE.md and codebase this session
- **Section 2 (Current State):** HIGH CONFIDENCE — built/fixed directly this session
- **Section 3 (Architecture):** HIGH CONFIDENCE — verified files and routes this session
- **Section 4 (Recent Work):** HIGH CONFIDENCE — all work done this session with successful builds and pushes
- **Section 5 (What Could Go Wrong):** MEDIUM — edge cases inferred from code review, not exhaustively tested
- **Section 6 (How to Think):** MEDIUM — based on session observations and CLAUDE.md, not full historical codebase audit
- **Section 7 (Do Not Touch):** HIGH CONFIDENCE — derived from explicit user feedback and memory files

---
