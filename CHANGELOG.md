# Changelog

## v1.2.0 — 28 May 2026

### New Features

#### Admin Panel (`/admin/*`)
- **Locations** — Create new locations (with auto-generated manager account), rename, deactivate/reactivate, and cascade hard-delete (removes all students, staff, progress logs, clubs, and assignments in a transaction)
- **Users** — Create staff accounts (auto-generated temp password shown once), edit display name/role/location, reset passwords, deactivate/restore, and permanently delete accounts with FK cleanup
- **Curriculum** — Module and lesson editor for AI Academy, Robotics Academy, and JR programs; belt-project editor for CREATE; read-only view before seeding
- **Settings** — Announcement banner: free-text (max 300 chars) shown to all staff on every page until dismissed; clears with a single click

#### Announcement Banner
- Admin-set message displayed app-wide at the top of every staff page
- Themed to match the app's design (not generic amber)
- Dismissable per session; reappears if the message changes
- Shows immediately on login (included in login response)

#### Student Archive vs. Permanent Delete
- **Archive** (soft delete) — sets `students.active = false`; student is recoverable from the Archived view in the roster
- **Permanent Delete** — cascade hard-delete with confirmation; removes all progress logs, programs, and assignments
- Both actions available from Student Profile and from bulk-select on the Roster
- Archived view and all restore/delete actions are gated behind the manager role — senseis see neither

#### Accessibility
- New `/accessibility` page with WCAG 2.1 AA conformance statement, known limitations, assistive tech support list, and feedback contact
- All animations now respect the OS `prefers-reduced-motion` setting (WCAG 2.3.3)
- Accessibility link added to LandingPage and LoginPage footers

#### Legal Updates
- Privacy Policy: added COPPA section (children's data handling), CCPA section (California privacy rights), and analytics/localStorage disclosure (Vercel Analytics, theme preference, banner dismissal)
- Terms and Accessibility pages linked from all public footers

#### UI Polish
- **AdminBar (mobile)** — collapsed to a small icon pill above the Report Bug button; no longer overlaps the main bottom navigation
- **Sidebar icons** — report and roster nav icons updated to correctly sized 64×64 PNGs
- **Program logos** — logo icons shown alongside program names on sensei dashboard student cards

---

### Bug Fixes

#### Data Integrity
- Progress log POST is now fully atomic — log inserts, enrollment update, and board assignment completion are wrapped in a single database transaction
- Student bulk CSV import now wraps each row's student + program inserts in a transaction; partial rows no longer leave orphaned student records
- Location cascade delete now nullifies all foreign-key references (`progress_log_comments.user_id`, `club_session_comments.user_id`, `progress_logs.sensei_id`, etc.) before deleting users, preventing FK violations
- Transaction `ROLLBACK` in the catch block no longer swallows the original error

#### Auth & Authorization
- Bug report submissions from the parent portal were being rejected with 403; fixed by replacing `requireSensei` with a session-agnostic check that accepts both staff and parent sessions
- Managers could reset another manager's password via `PATCH /users/:id/credentials`; fixed with a role guard that restricts credential resets to sensei-role targets
- `PATCH /students/:id/programs` never verified that the student belonged to the active location; fixed by joining on `location_id` in the UPDATE query
- Multiple `isManager` checks throughout the codebase used `role === 'manager'` instead of `['manager','admin'].includes(role)`, blocking admin from archived student profiles and club session note edits
- Parent login error message no longer reveals whether an email address exists in the system

#### Incorrect Data
- Inactive-students report used `daily_assignments` for the inactivity check but `progress_logs` for the `last_session` date; both now use `progress_logs` consistently
- Announcement banner was missing from the login response and only appeared after a page refresh; it is now included in the `POST /auth/login` response
- `/auth/me` could return `undefined` for `activeLocation` if the location had been deleted; now filters by `active = true` and returns an empty array instead

#### Client Crashes
- `btoa(text)` used for announcement dismissal key throws on emoji, em-dash, and other non-Latin-1 characters; replaced with `encodeURIComponent(text)`
- StaffPage `handleRemove` called `setConfirmRemoveId(null)` in its `finally` block, but that state setter was never declared (`ReferenceError` on every removal)
- AdminBar had a Rules of Hooks violation: `useEffect` appeared after an early return, causing a React error for non-admin users
- ClubSessionPage crashed when the session fetch failed — the loading guard only checked `!clubDef`, not `!session`
- ClubSessionsPanel crashed with `TypeError: sessions is not iterable` when the `sessions` prop was `undefined`

#### Silent Failures & Stale State
- The curriculum context module-level cache (`_cache`) was never cleared on logout; a second user logging into the same tab received the previous user's curriculum data until a full page reload
- `ClubSessionsPanel.saveAttendees` called `onAttendeesUpdated` with an empty array when the student list had silently failed to load, wiping the displayed attendee list
- ProgressVisuals was completely hidden for newly enrolled students with zero session logs, preventing them from seeing the belt journey and program cards
- If student creation succeeded but program enrollment failed on AddStudentPage, a generic error was shown with no recovery path; the app now navigates to the created student's profile instead
- `AuthContext.logout()` only cleared user state on success; a network failure left the client in a logged-in state despite the user navigating away

#### Wrong Logic
- `EnrollmentEditModal` incorrectly hid the sublevel input for Purple, Brown, and Red belts (all of which have numbered sublevels); the restriction now applies only to Black belt
- `CurriculumPage` sent the sub-program name (e.g., `"Scratch 1"`) as the `program` field when adding modules instead of the parent program name (e.g., `"AI Academy"`)
- Ozobot Evo was missing from the Robotics Academy kit order and totals in ProgressVisuals; students in that kit saw 0% progress and no highlighted node on the kit path
- The Edit Login button in SenseiProfileModal was shown for manager-role staff; clicking it now returns a 403 from the server, so the button is hidden when `sensei.role === 'manager'`
