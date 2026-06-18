import { BELTS, getLevels } from '../../utils/beltConfig';

// Black + bonus tracks don't use an explicit level step (the project implies it).
const NO_LEVEL_BELTS = ['Black', 'Bronze', 'Silver', 'Platinum'];

export default function BeltProgressFields({ beltLevel, setBeltLevel, beltSublevel, setBeltSublevel, setProject }) {
  const levels = NO_LEVEL_BELTS.includes(beltLevel) ? [] : getLevels(beltLevel);

  const handleBeltChange = (e) => {
    setBeltLevel(e.target.value);
    setBeltSublevel('');
    setProject?.('');
  };

  const handleSublevelChange = (e) => {
    const raw = e.target.value;
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
            <option key={b.name} value={b.name}>{b.bonus ? `${b.name} (Bonus)` : b.name}</option>
          ))}
        </select>
      </div>

      {beltLevel && levels.length > 0 && (
        <div>
          <label className="block text-ninja-muted text-sm font-ninja font-semibold mb-1 uppercase tracking-wide">
            Level
          </label>
          <select
            value={beltSublevel}
            onChange={handleSublevelChange}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
          >
            <option value="">Select level...</option>
            {levels.map((lv) => (
              <option key={lv} value={lv}>Level {lv}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
