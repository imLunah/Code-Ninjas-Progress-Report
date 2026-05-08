# Changelog

All notable changes to the Code Ninjas Dojo Tracker are documented here.

---

## [0.3.0] — 2026-05-08

### Multi-Program Support

Ninjas can now be enrolled in multiple programs simultaneously. A ninja taking CREATE and Robotics Academy gets two separate rows on the session board and separate progress logs per class.

**Schema changes**
- Introduced `student_programs` junction table — each enrollment is its own row with belt/project fields (CREATE only)
- Removed `program`, `belt_level`, `belt_sublevel`, `current_project`, `project_status` columns from `students`
- Added `program` column to `daily_assignments`; unique constraint changed from `(student_id, session_date)` to `(student_id, program, session_date)`
- Added `program` column to `progress_logs`

**Session board**
- Directors can now add each of a ninja's programs separately to the board
- Add Ninja modal shows each enrolled program as its own row with an individual Add button
- Board completion is tracked per program (logging CREATE marks only the CREATE row done)

**Ninja profiles**
- New Programs section showing all enrollments with belt/project details
- Directors can add new program enrollments, edit CREATE belt/project details, and remove enrollments inline
- Log Progress buttons split per program when a ninja has multiple enrollments
- Progress history shows a program filter tab bar when logs span multiple programs

**Add Ninja flow**
- Supports adding multiple program enrollments at creation time
- CREATE-specific fields (belt, sublevel, project, status) shown inline per enrollment

**Progress logging**
- Program selector appears on the log page when a ninja has multiple enrollments
- URL carries `?program=` so navigating from the board lands on the correct program pre-selected
- "Update ninja profile" checkbox now writes to `student_programs` instead of `students`

**Roster**
- Each ninja shows all enrolled program badges
- Belt and project columns reflect the CREATE enrollment

---

## [0.2.0] — 2026-05-07

### Staff Management & Director Parity

**Senseis page**
- Center Directors can view all senseis, their total progress log counts, and click through to full log history
- Directors can add new sensei accounts and soft-delete existing ones
- Senseis can view the page and other staff profiles but cannot make changes

**Director parity**
- Center Directors can now log progress for any ninja (previously sensei-only)
- Pinned notes — persistent staff notes per ninja, editable by all roles, visible on the profile page and the log progress page

**UI renames**
- Nav: "Students" → "Ninjas", "Staff" → "Senseis"
- All user-facing text changed from "student/students" to "ninja/ninjas" throughout

**Roster improvements**
- Sort dropdown: Name (A–Z), Last Active (most recent session first), Newest Members
- Program filter retained; belt filter removed (CREATE-only scope made it misleading with multi-program)

---

## [0.1.0] — 2026-05-06

### Initial Release

**Core tracking**
- Daily session board — directors build the board each day; senseis log notes against it
- CREATE program: full belt level, sublevel, project, and status tracking with snapshot logging
- Robotics Academy, AI Academy, JR: session board and notes

**Multi-location**
- Three fully isolated centers: Yorba Linda, Fullerton, Cerritos
- Center Directors can view any center; writes locked to home center
- Senseis scoped to their home center only

**Roles**
- Manager (Center Director): full access — build board, manage roster, edit profiles
- Sensei: log progress, view roster and profiles (read-only)

**Auth**
- Session-based login with role-based route guards
- `requireOwnLocation` middleware blocks cross-center writes server-side
