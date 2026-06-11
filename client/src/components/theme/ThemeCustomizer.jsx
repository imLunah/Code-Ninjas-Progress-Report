import { motion, MotionConfig } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getAccent } from '../../lib/accents';
import ModeToggle from './ModeToggle';
import ColorPalette from './ColorPalette';
import IntensitySlider from './IntensitySlider';
import GlowKnob from './GlowKnob';
import PreviewOrb from './PreviewOrb';

/**
 * Theme customizer. A clean, native-feeling settings card built on the app's
 * own ninja-* tokens, so it recolors with the chosen accent and reads at home
 * in both light and dark. Drives the live theme through ThemeContext.
 *
 * `onClose` (optional) renders a close button — used when shown in the desktop
 * popup. Omit it for the full-page (mobile) view.
 */
export default function ThemeCustomizer({ onClose, className = '' }) {
  const { settings, setMode, setAccent, setIntensity, setGlow } = useTheme();
  const accent = getAccent(settings.accentColor);

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label="Theme customizer"
        className={`w-full bg-white border border-ninja-border rounded-3xl shadow-lg overflow-hidden ${className}`}
      >
        {/* header */}
        <header className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgb(var(--ninja-blue) / 0.12)' }}
            >
              <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: accent.swatch }} />
            </span>
            <div>
              <h2 className="text-base font-bold font-ninja text-ninja-navy leading-tight">Theme</h2>
              <p className="text-xs font-ninja text-ninja-muted leading-tight">{accent.label} · {settings.mode === 'dark' ? 'Dark' : 'Light'}</p>
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
          <ModeToggle mode={settings.mode} onChange={setMode} />

          {/* preview */}
          <PreviewOrb accentSwatch={accent.swatch} intensity={settings.intensity} glow={settings.glow} />

          {/* palette */}
          <div>
            <p className="text-xs font-bold font-ninja uppercase tracking-wide text-ninja-muted mb-2.5">Accent</p>
            <ColorPalette value={settings.accentColor} onChange={setAccent} />
          </div>

          {/* divider */}
          <div className="h-px bg-ninja-border" />

          {/* intensity + glow */}
          <div className="flex items-end gap-5">
            <div className="flex-1 min-w-0">
              <IntensitySlider value={settings.intensity} onChange={setIntensity} />
            </div>
            <GlowKnob value={settings.glow} onChange={setGlow} />
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
