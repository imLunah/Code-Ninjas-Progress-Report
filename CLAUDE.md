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

## Security Note
Never mention Claude, Anthropic, or AI in commits, files, docs, or output. Ask first if ever needed.
