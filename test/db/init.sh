#!/usr/bin/env bash
# Provision the local integration-test Postgres. Loads the production `public`
# schema snapshot (prod-schema.sql) into a throwaway container so route tests run
# against the real table/constraint shape — the CHECK constraints and columns the
# repo's own db/schema.sql no longer reflects.
#
# Usage:  test/db/init.sh        (recreate + load, safe to re-run)
set -euo pipefail

NAME=dojolink-test-db
HERE="$(cd "$(dirname "$0")" && pwd)"

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" \
  -e POSTGRES_PASSWORD=testpass -e POSTGRES_DB=dojolink_test \
  -p 55432:5432 postgres:17 >/dev/null

echo "waiting for postgres..."
for _ in $(seq 1 30); do
  docker exec "$NAME" pg_isready -U postgres -d dojolink_test >/dev/null 2>&1 && break
  sleep 1
done

# Stub the Supabase roles the dumped RLS policies/grants reference.
docker exec "$NAME" psql -U postgres -d dojolink_test -q \
  -c "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;" >/dev/null 2>&1 || true

docker cp "$HERE/prod-schema.sql" "$NAME":/tmp/schema.sql
# ON_ERROR_STOP=0: a couple of Supabase-only statements (schema already exists,
# ownership) are expected to no-op on vanilla Postgres; tables/constraints load fine.
docker exec "$NAME" psql -U postgres -d dojolink_test -v ON_ERROR_STOP=0 -f /tmp/schema.sql >/dev/null 2>&1

TABLES=$(docker exec "$NAME" psql -U postgres -d dojolink_test -tAc \
  "select count(*) from information_schema.tables where table_schema='public';")
echo "test DB ready on localhost:55432 (db=dojolink_test, ${TABLES// /} tables)"
