import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { BELTS } from '../utils/beltConfig';
import { CREATE_STICKERS } from './createStickers';

// How rare each sticker is, measured against every CREATE ninja in the dojo.
//
// A sticker's rarity is not a property someone typed onto it. It is the share
// of ninjas who have actually earned it, so it moves on its own: White belt
// stickers stay Common because most of the roster is past White, and the
// capstone stays Legendary for as long as few ninjas reach Black. Nothing here
// is stored — /api/parent/sticker-rarity sends back where the roster is
// standing on the ladder, and the counting happens here, next to the belt
// order and the sticker definitions it needs.
//
// A ninja has earned a sticker once they are past the last level it covers,
// which is stickerProgress.js's rule minus the one case it can only answer
// from a child's own logs: the ninja standing ON that last level with its last
// project finished. Those ninjas are counted as not-yet here. The gap is at
// most one level per ninja on a four-tier label, so it cannot move a sticker
// between tiers, and paying for 300 ninjas' logs to close it would be silly.

// The four tiers, commonest first, each with the smallest share of the dojo
// that still counts as that tier. Order matters: `tierFor` takes the first
// floor a share clears, so the list has to run down from the highest.
//
// The numbers are cut to the real spread of a roster: most ninjas sit in the
// first three belts, and the ones who reach Purple mostly finish, so the back
// half of the book flattens out around one ninja in eight. Tune these if the
// shape of the roster changes; nothing else needs to move.
export const RARITY_TIERS = [
  {
    key: 'common',
    label: 'Common',
    min: 0.50,
    chip: 'bg-slate-500/[0.12] text-slate-600',
    tint: 'text-slate-600',
  },
  {
    key: 'uncommon',
    label: 'Uncommon',
    min: 0.30,
    chip: 'bg-teal-500/[0.14] text-teal-700',
    tint: 'text-teal-700',
  },
  {
    key: 'rare',
    label: 'Rare',
    min: 0.15,
    chip: 'bg-violet-500/[0.14] text-violet-700',
    tint: 'text-violet-700',
  },
  {
    key: 'legendary',
    label: 'Legendary',
    min: 0,
    chip: 'bg-amber-500/[0.16] text-amber-700',
    tint: 'text-amber-700',
  },
];

// Under this many ninjas the four tiers are noise: one Brown belt joining
// would swing a sticker two tiers. A dojo that small gets no rarity at all
// rather than a made-up one, and every surface already renders without it.
const MIN_NINJAS = 25;

export function tierFor(share) {
  return RARITY_TIERS.find((tier) => share >= tier.min) || RARITY_TIERS[RARITY_TIERS.length - 1];
}

// The share as the page says it out loud. Rounds to a whole percent, and
// refuses to round a sticker somebody has earned down to "0% of ninjas".
export function sharePercent(share) {
  const pct = Math.round(share * 100);
  return pct < 1 ? '<1' : String(pct);
}

const beltIndex = new Map(BELTS.map((belt, i) => [belt.name, i]));

// Has a ninja standing at (belt, level) walked past the last level a sticker
// covers? The one rule both counts below are built from.
function past(item, belt, level) {
  const target = beltIndex.get(item.belt);
  const here = beltIndex.get(belt);
  if (target == null || here == null) return false;
  const last = item.levels[item.levels.length - 1];
  return here > target || (here === target && Number(level) > last);
}

// Ninjas past the last level a sticker covers, out of the whole histogram.
function earnedCount(item, positions) {
  return positions.reduce((sum, at) => (past(item, at.belt, at.level) ? sum + at.count : sum), 0);
}

// How many of the book a ninja standing at (belt, level) has earned.
function stickersAt(belt, level) {
  return CREATE_STICKERS.reduce((sum, item) => (past(item, belt, level) ? sum + 1 : sum), 0);
}

// Is this roster big enough to say anything about? Under MIN_NINJAS the four
// tiers are noise and a percentile moves several points per ninja, so both
// answers are withheld rather than made up.
function measurable(data) {
  return Boolean(data && data.ninjas >= MIN_NINJAS && Array.isArray(data.positions));
}

// sticker id -> { key, label, chip, tint, share, percent }. Null when there is
// no roster to measure against.
export function stickerRarity(data) {
  if (!measurable(data)) return null;
  const { ninjas, positions } = data;
  const map = {};
  for (const item of CREATE_STICKERS) {
    const share = earnedCount(item, positions) / ninjas;
    const tier = tierFor(share);
    map[item.id] = { ...tier, share, percent: sharePercent(share) };
  }
  return map;
}

// Where a ninja's sticker count sits against the whole CREATE roster, as the
// whole percent of ninjas holding strictly fewer stickers. Strictly, so a
// ninja is never told they are ahead of the ninjas standing beside them, and
// so the first sticker of all reads 0% rather than a flattering number.
//
// The histogram only knows where each ninja is standing, not whether they have
// finished the level they are on, which is the same one-level blind spot the
// tiers have (see the note at the top of this file). It shifts a ninja by at
// most one sticker against a roster of hundreds.
export function stickerPercentile(data, earned) {
  if (!measurable(data) || !Number.isFinite(earned)) return null;
  const behind = data.positions.reduce(
    (sum, at) => (stickersAt(at.belt, at.level) < earned ? sum + at.count : sum), 0);
  return Math.round((behind / data.ninjas) * 100);
}

// Module-level cache, the same shape CurriculumContext uses: the histogram is
// the same for every child and every sticker surface, so one page load makes
// one request no matter how many of them mount. The raw histogram is what gets
// cached, not a tier map, because a dojo too small for tiers still returns a
// perfectly good payload and re-asking for it on every mount would be waste.
let _cache = null;
let _inflight = null;

function load() {
  if (_cache) return Promise.resolve(_cache);
  if (!_inflight) {
    _inflight = api.get('/parent/sticker-rarity')
      .then((data) => { _cache = data || null; _inflight = null; return _cache; })
      .catch(() => { _inflight = null; return null; });
  }
  return _inflight;
}

// The roster histogram itself, for the surfaces that measure a child against
// it rather than a sticker.
export function useStickerCohort() {
  const [cohort, setCohort] = useState(_cache);
  useEffect(() => {
    if (_cache) return;
    let live = true;
    load().then((data) => { if (live) setCohort(data); });
    return () => { live = false; };
  }, []);
  return cohort;
}

// Rarity is decoration on top of a sticker book that works without it, so a
// failed request resolves to null and every surface simply omits the label.
export function useStickerRarity() {
  const cohort = useStickerCohort();
  return useMemo(() => stickerRarity(cohort), [cohort]);
}
