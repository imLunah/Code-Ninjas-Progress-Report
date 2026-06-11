import { MotionConfig } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { swatchFor, labelFor } from '../../lib/accents';
import ModeToggle from './ModeToggle';
import ColorMap from './ColorMap';
import ColorPalette from './ColorPalette';

/**
 * Theme customizer. A clean, native-feeling settings card built on the app's
 * own ninja-* tokens, so it recolors with the chosen accent and reads at home
 * in both light and dark. Controls: light/dark mode + accent color (with a
 * Default option that restores the original DojoLink theme).
 *
 * `onClose` (optional) renders a close button — used in the desktop popup.
 */
export default function ThemeCustomizer({ onClose, className = '' }) {
  const { settings, setMode, setAccent } = useTheme();
  const headerSwatch = swatchFor(settings.accentColor);
  const headerLabel = labelFor(settings.accentColor);

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label="Theme customizer"
        className={`w-full bg-white border border-ninja-border rounded-3xl shadow-lg overflow-hidden ${className}`}
      >
        {/* header */}
        <header className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-ninja-bg">
              <span className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: headerSwatch }} />
            </span>
            <div>
              <h2 className="text-base font-bold font-ninja text-ninja-navy leading-tight">Theme</h2>
              <p className="text-xs font-ninja text-ninja-muted leading-tight">{headerLabel} · {settings.mode === 'dark' ? 'Dark' : 'Light'}</p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ninja-muted
                         hover:text-ninja-navy hover:bg-ninja-bg transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </header>

        <div className="px-5 pb-5 flex flex-col gap-5">
          {/* mode */}
          <div>
            <p className="text-xs font-bold font-ninja uppercase tracking-wide text-ninja-muted mb-2.5">Mode</p>
            <ModeToggle mode={settings.mode} onChange={setMode} />
          </div>

          {/* hue / shade color map */}
          <ColorMap value={settings.accentColor} onChange={setAccent} />

          {/* quick swatches */}
          <div>
            <p className="text-xs font-bold font-ninja uppercase tracking-wide text-ninja-muted mb-3 text-center">Presets</p>
            <ColorPalette value={settings.accentColor} onChange={setAccent} />
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
