import { useState } from 'react';
import { BELTS, getMaxLevel } from '../../utils/beltConfig';

const KNOWN_BELTS = new Set(BELTS.map((b) => b.name));

export default function BeltProgressFields({ beltLevel, setBeltLevel, beltSublevel, setBeltSublevel, setProject }) {
  const [isCustomBelt, setIsCustomBelt] = useState(() => !!beltLevel && !KNOWN_BELTS.has(beltLevel));
  const maxLevel = getMaxLevel(beltLevel);

  const handleBeltChange = (e) => {
    if (e.target.value === '__custom__') {
      setIsCustomBelt(true);
      setBeltLevel('');
      setBeltSublevel('');
      setProject?.('');
      return;
    }
    setIsCustomBelt(false);
    setBeltLevel(e.target.value);
    setBeltSublevel('');
    setProject?.('');
  };

  const handleSublevelChange = (e) => {
    const raw = e.target.value;
    if (raw === '') { setBeltSublevel(''); setProject?.(''); return; }
    const val = parseInt(raw);
    if (!val || val < 1 || (maxLevel && val > maxLevel)) return;
    setBeltSublevel(raw);
    setProject?.('');
  };

  const exitCustomBelt = () => {
    setIsCustomBelt(false);
    setBeltLevel('');
    setBeltSublevel('');
    setProject?.('');
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
          Belt Level
        </label>
        {isCustomBelt ? (
          <div className="space-y-1.5">
            <input
              type="text"
              value={beltLevel}
              onChange={(e) => { setBeltLevel(e.target.value); setProject?.(''); }}
              placeholder="e.g., Advanced, Post-Red, Special..."
              className="w-full bg-white border border-ninja-blue text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
              autoFocus
            />
            <button
              type="button"
              onClick={exitCustomBelt}
              className="text-ninja-muted hover:text-ninja-navy text-xs font-ninja underline"
            >
              ← Use standard belt
            </button>
          </div>
        ) : (
          <select
            value={beltLevel}
            onChange={handleBeltChange}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          >
            <option value="">Select belt...</option>
            {BELTS.map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
            <option value="__custom__">Custom...</option>
          </select>
        )}
      </div>

      {!isCustomBelt && beltLevel && maxLevel && (
        <div>
          <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
            Sublevel (1–{maxLevel})
          </label>
          <input
            type="number"
            value={beltSublevel}
            onChange={handleSublevelChange}
            min={1}
            max={maxLevel}
            placeholder={`1 to ${maxLevel}`}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          />
          {beltSublevel && parseInt(beltSublevel) > maxLevel && (
            <p className="text-ninja-red text-xs font-ninja mt-1">
              Sublevel cannot exceed {maxLevel} for {beltLevel} belt
            </p>
          )}
        </div>
      )}
    </div>
  );
}
