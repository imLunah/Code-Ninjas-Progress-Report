// Builds the CREATE sticker book out of the IMPACT achievement icons.
//
//   node scripts/build-impact-stickers.mjs [path-to/Code Ninjas IMPACT]
//
// Writes `client/public/impact/*.png` (cropped, downscaled) and regenerates
// `client/src/lib/createStickers.js`. Both outputs are committed, so this only
// needs running when the source folder changes; it is here so the next person
// can see exactly where 218 stickers came from rather than trusting a blob.
//
// The source is the shared franchise Canva account, exported to a local assets
// folder with a manifest (see that folder's README). It is deliberately NOT in
// this repo: it is 271 icons plus 486 ninjas at full resolution, most of which
// this app has no use for.
//
// What this replaces: the sticker book used to be 35 pieces of belt spot art
// under invented titles, mapped to levels by hand. All four of the White
// belt's stickers came from a level other than the one they claimed (`white-1`
// is the Level 2 achievement "That Belongs in a Museum", shown as "First
// Coder" for Level 1). The achievements are real, named, and already belong
// to a level, so the mapping is now read rather than authored.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode, alphaBounds, crop, resize, quantize, encodeIndexed } from './png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = process.argv[2] || '/Users/john/Documents/Assets/Code Ninjas IMPACT';
const ICONS = path.join(SOURCE, 'impact-icons');
const OUT_DIR = path.join(ROOT, 'client/public/impact');
const OUT_DATA = path.join(ROOT, 'client/src/lib/createStickers.js');

// The biggest a sticker is ever drawn is the 176px record on the sticker book,
// and it scales to 1.05 under the pointer. 200 covers that with a little room
// and matches the Code.AI sticker set already in `public/stickers`.
const MAX_PX = 200;

// Canva filenames are the only names these icons have, and some of them are
// wrong. Everything here is either a plain misspelling or an apostrophe the
// uploader dropped; nothing is a rewrite. Apostrophes ARE legal in the source
// ("It's Alive!", "Hey I'm Walking Here" both have one), so a missing one is
// a slip rather than a filesystem restriction.
//
// "Say What Now-" is the exception that IS a filename artifact: a trailing
// dash where a question mark could not go.
//
// Delete a line here and the franchise's own spelling comes back.
const TITLE_FIXES = {
  'Painters Palette': "Painter's Palette",
  'Whats in a Name': "What's in a Name",
  'Lets Try That Again': "Let's Try That Again",
  'Checkin It Twice': "Checkin' It Twice",
  'Free Fallin': "Free Fallin'",
  'The Times, They are a Changin': "The Times, They Are a Changin'",
  'Say What Now-': 'Say What Now?',
  'Effective Immedieatley': 'Effective Immediately',
  'Asset Depriciation': 'Asset Depreciation',
  'Comparitively Speaking': 'Comparatively Speaking',
  'Reasses the Situation': 'Reassess the Situation',
};

// One Blue Level 4 icon is uploaded as `BB_4 -.png` with no name at all. It is
// real artwork (a game screen, a donut, a cursor), but a book that prints a
// franchise name under every sticker cannot carry one whose name we would have
// to invent — inventing names is the thing this build exists to stop. It is
// left out until someone reads the name off Canva and adds it.
const SKIP_UNTITLED = true;

const BELT_ORDER = ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Red', 'Black'];

const slug = (title) => title
  .toLowerCase()
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

function readManifest() {
  const manifest = JSON.parse(fs.readFileSync(path.join(ICONS, 'manifest.json'), 'utf8'));
  const out = [];
  for (const belt of manifest.belts) {
    // White through Brown keep their achievements in per-level folders; Red and
    // Black have no level folders in Canva and sit at the belt root, with the
    // level carried on the entry instead.
    const entries = [
      ...(belt.levels || []).flatMap((lvl) => lvl.items.map((it) => ({ ...it, dir: lvl.folder, level: lvl.level }))),
      ...(belt.files || []).map((it) => ({ ...it, dir: belt.folder })),
    ];
    for (const item of entries) {
      if (item.type !== 'achievement') continue;
      const title = (TITLE_FIXES[item.title] ?? item.title ?? '').trim();
      if (!title) {
        if (SKIP_UNTITLED) continue;
        throw new Error(`Untitled achievement: ${item.dir}/${item.file}`);
      }
      out.push({
        belt: belt.belt,
        level: Number(item.level),
        title,
        file: path.join(ICONS, item.dir, item.file),
      });
    }
  }
  out.sort((a, b) => BELT_ORDER.indexOf(a.belt) - BELT_ORDER.indexOf(b.belt)
    || a.level - b.level
    || a.title.localeCompare(b.title));
  return out;
}

function build() {
  const items = readManifest();

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const seen = new Set();
  const stickers = [];
  let bytes = 0;

  for (const item of items) {
    const id = `${item.belt.toLowerCase()}-${item.level}-${slug(item.title)}`;
    if (seen.has(id)) throw new Error(`Duplicate sticker id ${id} (${item.file})`);
    seen.add(id);

    const img = decode(item.file);
    const out = encodeIndexed(quantize(resize(crop(img, alphaBounds(img)), MAX_PX)));
    fs.writeFileSync(path.join(OUT_DIR, `${id}.png`), out);
    bytes += out.length;

    stickers.push({ id, belt: item.belt, level: item.level, title: item.title, src: `/impact/${id}.png` });
  }

  fs.writeFileSync(OUT_DATA, dataFile(stickers));

  const perBelt = BELT_ORDER.map((b) => `${b} ${stickers.filter((s) => s.belt === b).length}`).join(', ');
  console.log(`${stickers.length} stickers  (${perBelt})`);
  console.log(`${(bytes / 1024 / 1024).toFixed(2)} MB in ${path.relative(ROOT, OUT_DIR)}`);
  console.log(`wrote ${path.relative(ROOT, OUT_DATA)}`);
}

function dataFile(stickers) {
  const lines = [];
  let belt = null;
  let level = null;
  for (const s of stickers) {
    if (s.belt !== belt) {
      belt = s.belt;
      level = null;
      lines.push(`\n  // ${belt} belt`);
    }
    if (s.level !== level) {
      level = s.level;
      lines.push(`  //   Level ${level}`);
    }
    lines.push(`  a('${s.belt}', ${s.level}, ${JSON.stringify(s.title)}),`);
  }

  const levelCount = new Set(stickers.map((s) => `${s.belt}-${s.level}`)).size;

  return `// GENERATED by scripts/build-impact-stickers.mjs. Do not edit by hand.
//
// Every achievement in the Code Ninjas IMPACT curriculum, read off the
// franchise Canva export rather than authored here: ${stickers.length} of them across the
// ${levelCount} CREATE levels, each with the name Code Ninjas gave it and the
// level it actually belongs to.
//
// This file used to hold 35 hand-written milestones over belt spot art, with
// invented titles ("First Coder") on artwork that came from a different level
// than the one it claimed. Those are gone. If a sticker's name or level looks
// wrong now, it is wrong in the source folder's manifest, and the fix belongs
// there and in the build script's TITLE_FIXES table.
//
// A ninja earns every achievement in a level when they finish that level.
// DojoLink knows where a ninja is standing and which projects are logged; it
// does not know which in-game actions they took, and the achievements are
// awarded inside MakeCode rather than by us. Level completion is the honest
// approximation and it is the only claim any surface makes.
// See lib/stickerProgress.js for the one definition of "earned".

const a = (belt, level, title) => {
  const id = \`\${belt.toLowerCase()}-\${level}-\${title.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}\`;
  return { id, belt, level, title, src: \`/impact/\${id}.png\` };
};

export const CREATE_STICKERS = [${lines.join('\n')}
];

// Belt order is the order of the array, which is curriculum order.
export const STICKER_BELTS = [...new Set(CREATE_STICKERS.map((item) => item.belt))];

export function stickersForBelt(belt) {
  return CREATE_STICKERS.filter((item) => item.belt === belt);
}

// The levels of a belt that carry achievements, in order, each with its own.
// Red and Black have one apiece; Blue Level 4 has nine.
export function levelsForBelt(belt) {
  const out = [];
  for (const item of stickersForBelt(belt)) {
    const last = out[out.length - 1];
    if (last && last.level === item.level) last.stickers.push(item);
    else out.push({ level: item.level, stickers: [item] });
  }
  return out;
}

export function stickerRequirement({ belt, level }) {
  return \`Complete \${belt} Belt Level \${level}\`;
}
`;
}

build();
