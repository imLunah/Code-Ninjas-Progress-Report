// Sensei-facing reference documents, grouped by the program they belong to.
//
// These live as JS modules rather than .md files on disk on purpose: Vercel
// traces `require` to decide what ships with the function, and a runtime
// fs.readFileSync of a data file is not traced, so the file would be missing in
// production. Requiring them guarantees they deploy.
//
// To add a document: write a module in this folder exporting
// { slug, program, title, description, note, body } and list it here.
const RESOURCES = [
  require('./aiAcademyPasscodes'),
  require('./roboticsAcademyPasscodes'),
];

// Listing shape — deliberately without `body`, so browsing the Resources tab
// doesn't hand out the passcodes before a document is opened.
function listResources(program) {
  return RESOURCES
    .filter((r) => !program || r.program === program)
    .map(({ slug, program: p, title, description }) => ({ slug, program: p, title, description }));
}

function getResource(slug) {
  return RESOURCES.find((r) => r.slug === slug) || null;
}

module.exports = { listResources, getResource };
