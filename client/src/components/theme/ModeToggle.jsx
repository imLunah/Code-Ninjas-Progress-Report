import Segmented from '../ui/Segmented';

const OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/**
 * Segmented Light / Dark control. The behaviour — roving focus, arrow keys, the
 * sliding pill — lives in Segmented now, so the second such control in the app
 * did not have to be a copy of this one.
 */
export default function ModeToggle({ mode, onChange }) {
  return (
    <Segmented
      options={OPTIONS}
      value={mode}
      onChange={onChange}
      label="Appearance mode"
      layoutId="modeTogglePill"
    />
  );
}
