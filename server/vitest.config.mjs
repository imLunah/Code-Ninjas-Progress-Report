import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/_env.js'],
    // All test files share one Postgres container, so run them serially — parallel
    // workers would clobber each other's seed data mid-test.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    include: ['tests/**/*.test.js'],
  },
});
