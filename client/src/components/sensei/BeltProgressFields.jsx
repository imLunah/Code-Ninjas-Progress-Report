import { BELTS, getMaxLevel } from '../../utils/beltConfig';

export default function BeltProgressFields({ beltLevel, setBeltLevel, beltSublevel, setBeltSublevel, setProject }) {
  const maxLevel = getMaxLevel(beltLevel);

  const handleBeltChange = (e) => {
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

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
          Belt Level
        </label>
        <select
          value={beltLevel}
          onChange={handleBeltChange}
          className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
        >
          <option value="">Select belt...</option>
          {BELTS.map((b) => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
        </select>
      </div>

      {beltLevel && maxLevel && (
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
