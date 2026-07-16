// React Doctor configuration.
//
// Every entry below is a deliberate, documented decision — not a blanket
// silence. Security, correctness (bugs), and accessibility rules stay fully
// active; the raw-SQL suppression is scoped to five specific, verified files
// (the rule keeps firing on all other code, including anything new).

module.exports = {
  $schema: 'https://react.doctor/schema/config.json',

  rules: {
    // Framer Motion LazyMotion refactor. This app needs the domMax feature set
    // (layout / layoutId, drag-based swipe nav, AnimatePresence), so LazyMotion
    // tree-shaking would save ~0 bundle. The refactor also requires importing
    // `m`, which collides with the many `.map((m) => …)` callbacks that render
    // motion elements inside them — high regression risk across 42 files with no
    // test suite, for no payoff. The rule's own guidance says to suppress when
    // "the LazyMotion provider overhead negates the saving," which is the case here.
    'react-doctor/use-lazy-motion': 'off',

    // Perf micro-optimizations on small, bounded arrays (a handful of locations,
    // ≤7 programs, per-student log lists). Negligible real impact on this app's
    // data sizes, and several flagged spots sit in security-sensitive
    // access-control code (location_ids validation) we intentionally don't churn.
    // The suggested rewrites also read no better than the originals here.
    'react-doctor/js-combine-iterations': 'off',
    'react-doctor/js-flatmap-filter': 'off',
    'react-doctor/js-set-map-lookups': 'off',

    // The flagged code already sorts immutably via [...arr].sort(); the suggested
    // Array.prototype.toSorted() drops support for older iOS/Safari that the
    // parent-facing portal still needs. Keep the compatible spread-sort.
    'react-doctor/js-tosorted-immutable': 'off',
  },

  ignore: {
    // Generated build output, not source.
    files: ['client/dist/**'],

    overrides: [
      {
        // Verified false positives. These queries are parameterized ($1, $2, …);
        // the only interpolated parts are hardcoded literals — clause fragments,
        // $N placeholder indices, and column names — never user input. The rule
        // stays active for every other file.
        files: [
          'server/routes/clubs.js',
          'server/routes/curriculum.js',
          'server/routes/parent.js',
          'server/routes/progress.js',
          'server/routes/students.js',
        ],
        rules: ['react-doctor/raw-sql-injection-risk'],
      },
      {
        // Real entry points, reachable outside the client import graph:
        // api/index.js is the Vercel serverless entry; the seed scripts are run
        // directly via `node`.
        files: [
          'api/index.js',
          'server/db/seed_belt_projects.js',
          'server/db/seed_curriculum.js',
        ],
        rules: ['deslop/unused-file'],
      },
    ],
  },
};
