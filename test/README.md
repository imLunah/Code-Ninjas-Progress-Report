# Server integration tests

Vitest + supertest exercising the real Express app against a local Postgres that
mirrors the production `public` schema (including the CHECK constraints the repo's
`server/db/schema.sql` no longer reflects). Tests hit routes over HTTP with real
sessions — they catch the DB-layer / auth bugs that manual click-testing misses.

## What's covered

Focused on the security regressions that have actually bitten this app, so they
can never silently return on a refactor:

- **auth** (`server/tests/auth.test.js`) — bad creds → 401, CSRF header required,
  `admin` bypasses `requireOwnLocation`, a manager can't write at an unassigned
  center, a sensei can't hit a manager-only route.
- **progress** (`server/tests/progress.test.js`) — enrollment guard rejects an
  un-enrolled/junk `program` (session 26 ZAP injection), `belt_sublevel_at` bound
  rejects `1000` (session 27 exploit), invalid belt labels rejected, delete
  ownership (sensei own vs others, manager any).
- **daily** (`server/tests/daily.test.js`) — enrollment guard, and a same-day
  repeat check-in creates a *second* session row (session 28 fix).

## Running

One-time (or after a schema change): bring up the test DB container.

```bash
test/db/init.sh          # creates dojolink-test-db on localhost:55432, loads schema
npm test                 # from repo root — runs the server suite
```

Container already up? Just `npm test`. Handy scripts (from `server/`):

```bash
npm run test:watch       # vitest watch mode
npm run test:db:up       # start the container (does NOT load schema — use init.sh for that)
npm run test:db:down     # remove the container
```

## How it stays isolated from prod

- `server/tests/_env.js` (a vitest `setupFile`) forces `DATABASE_URL` to the local
  container **before** `db/pool.js` reads it. `dotenv` never overrides an already-set
  var, so the real `.env` (prod pooler) can't leak into a test run.
- `NODE_ENV=test` makes the rate limiters skip (many logins from one IP otherwise
  trip the 10/15min login cap). Production behavior is unchanged.
- `resetDb()` truncates + reseeds a fixed fixture world before every test.

## Refreshing the schema snapshot

`test/db/prod-schema.sql` is a `pg_dump --schema-only --schema=public` of the live
DB via the **session** pooler (port 5432, not the 6543 transaction pooler). Regenerate
after a live schema change so tests keep matching prod.
