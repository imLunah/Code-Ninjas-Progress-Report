import { useEffect, useState } from 'react';
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

// Ninjas past the last level a sticker covers, out of the whole histogram.
function earnedCount(item, positions) {
  const target = beltIndex.get(item.belt);
  if (target == null) return 0;
  const last = item.levels[item.levels.length - 1];
  return positions.reduce((sum, at) => {
    const here = beltIndex.get(at.belt);
    if (here == null) return sum;
    const past = here > target || (here === target && Number(at.level) > last);
    return past ? sum + at.count : sum;
  }, 0);
}

// sticker id -> { key, label, chip, tint, share, percent }. Null when there is
// no roster to measure against.
export function stickerRarity({ ninjas, positions } = {}) {
  if (!ninjas || ninjas < MIN_NINJAS || !Array.isArray(positions)) return null;
  const map = {};
  for (const item of CREATE_STICKERS) {
    const share = earnedCount(item, positions) / ninjas;
    const tier = tierFor(share);
    map[item.id] = { ...tier, share, percent: sharePercent(share) };
  }
  return map;
}

// Module-level cache, the same shape CurriculumContext uses: the histogram is
// the same for every child and every sticker surface, so one page load makes
// one request no matter how many of them mount.
let _cache = null;
let _inflight = null;

function load() {
  if (_cache) return Promise.resolve(_cache);
  if (!_inflight) {
    _inflight = api.get('/parent/sticker-rarity')
      .then((data) => { _cache = stickerRarity(data); _inflight = null; return _cache; })
      .catch(() => { _inflight = null; return null; });
  }
  return _inflight;
}

// Rarity is decoration on top of a sticker book that works without it, so a
// failed request resolves to null and every surface simply omits the label.
export function useStickerRarity() {
  const [rarity, setRarity] = useState(_cache);
  useEffect(() => {
    if (_cache) return;
    let live = true;
    load().then((data) => { if (live) setRarity(data); });
    return () => { live = false; };
  }, []);
  return rarity;
}
