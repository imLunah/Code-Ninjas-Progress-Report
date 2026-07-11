# Docker setup for the test database

The integration tests (`server/tests/`) run against a real Postgres database. Instead
of installing Postgres on your Mac, we run it inside **Docker** — a throwaway database
in a container that never touches your live Supabase data. This guide gets you from
zero to a passing `npm test`.

---

## 1. What you're setting up (the 30-second version)

```
  ┌─────────────────────────┐        ┌──────────────────────────────┐
  │  npm test  (vitest)     │  ───▶  │  Docker container            │
  │  server/tests/*.test.js │        │  postgres:17                 │
  │                         │  ◀───  │  dojolink-test-db            │
  └─────────────────────────┘        │  localhost:55432             │
                                     │  db = dojolink_test          │
                                     └──────────────────────────────┘
```

- The container is a **fake, disposable copy** of the DB. Wiping it does nothing to prod.
- Its schema is a snapshot of the real production schema (`test/db/prod-schema.sql`),
  so the tests catch real DB-layer bugs.
- Nothing here shares data with Supabase. The tests set their own `DATABASE_URL` and
  the app can't fall back to the real one.

---

## 2. Install Docker (one time)

You already have this working (Docker 29.6.1), so you can skip to step 3. Keeping the
steps here for a fresh machine.

**Option A — Docker Desktop (GUI, easiest):**
1. Download from <https://www.docker.com/products/docker-desktop/> (Apple Silicon build).
2. Open the `.dmg`, drag Docker to Applications, launch it.
3. Wait for the whale icon in the menu bar to stop animating = daemon running.

**Option B — colima (headless, no GUI, lighter):**
```bash
brew install colima docker
colima start
```

Either way, the daemon (the background Docker engine) must be **running** before tests.

Verify:
```bash
docker --version      # prints a version
docker ps             # lists running containers (empty is fine) — no error = daemon up
```
If `docker ps` errors with "Cannot connect to the Docker daemon", start Docker Desktop
(or run `colima start`) and try again.

---

## 3. First-time database setup

From the repo root, one command builds the container and loads the schema:

```bash
test/db/init.sh
```

Expected output:
```
waiting for postgres...
test DB ready on localhost:55432 (db=dojolink_test, 25 tables)
```

What it does, step by step:
1. Removes any old `dojolink-test-db` container (safe to re-run anytime).
2. Starts a fresh `postgres:17` container on port **55432**.
3. Creates stub roles (`anon`, `authenticated`, `service_role`) the schema dump expects.
4. Loads `test/db/prod-schema.sql` — all 23 production tables + their constraints.

The first run also downloads the `postgres:17` image (~150 MB, one time). Later runs
are instant.

---

## 4. Run the tests

From the repo root:

```bash
npm test
```

Expected:
```
 Test Files  3 passed (3)
      Tests  19 passed (19)
```

Watch mode (re-runs on file save) — from the `server/` folder:
```bash
cd server
npm run test:watch
```

---

## 5. Everyday workflow

| Situation | Command |
|---|---|
| Container already running, just run tests | `npm test` |
| Mac rebooted / Docker restarted — container stopped | `cd server && npm run test:db:up` then `npm test` |
| Schema looks wrong / want a clean slate | `test/db/init.sh` |
| Done for the day, free the resources | `cd server && npm run test:db:down` |

`test:db:up` only **starts** the container; it does not reload the schema. Use
`init.sh` whenever you need the schema (re)loaded.

---

## 6. Troubleshooting

**`Cannot connect to the Docker daemon`**
Docker isn't running. Launch Docker Desktop (or `colima start`), wait for it to be
ready, retry.

**`port is already allocated` / `55432 ... in use`**
An old container is holding the port:
```bash
docker rm -f dojolink-test-db
test/db/init.sh
```

**Tests fail with connection refused / `ECONNREFUSED ... 55432`**
The container isn't up. Run `test/db/init.sh`, confirm `docker ps` shows
`dojolink-test-db`, then `npm test`.

**Tests fail right after a real schema change in Supabase**
The snapshot is stale. Refresh it (uses the SESSION pooler on port 5432, not the
6543 transaction pooler, and the postgres:17 client to match the live server):
```bash
set -a; source .env; set +a
DUMP_URL=$(echo "$DATABASE_URL" | sed -E 's/:6543/:5432/')
docker run --rm postgres:17 pg_dump "$DUMP_URL" \
  --schema=public --schema-only --no-owner --no-privileges --no-comments \
  > test/db/prod-schema.sql
test/db/init.sh
```

**Want to poke around the test DB directly**
```bash
docker exec -it dojolink-test-db psql -U postgres -d dojolink_test
# \dt to list tables, \q to quit
```

---

## 7. Is any of this touching production?

No.
- The container is local and disposable.
- Tests force `DATABASE_URL` to `localhost:55432` before the app loads
  (`server/tests/_env.js`), and `dotenv` never overrides an already-set value, so the
  real `.env` (prod pooler) cannot leak into a test run.
- `test/db/prod-schema.sql` is **schema only** — table/column/constraint definitions,
  zero rows, no credentials.

Deleting the container, the image, or the whole `test/` folder cannot affect the live
app or Supabase.
