// Runs via vitest `setupFiles` BEFORE any test file evaluates, so it sets the
// DB target before server/index.js -> db/pool.js reads process.env.DATABASE_URL.
// dotenv.config() in index.js does NOT override already-set vars, so the real
// .env (prod pooler URL) can never leak into a test run.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:testpass@localhost:55432/dojolink_test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';
