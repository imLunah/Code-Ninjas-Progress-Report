import { useEffect, useState } from 'react';
import { MotionConfig, AnimatePresence, motion } from 'framer-motion';
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
  const { settings, setMode, setAccent, previewAccent } = useTheme();
  const headerSwatch = swatchFor(settings.accentColor);
  const headerLabel = labelFor(settings.accentColor);

  // One-time "you found a hidden setting" message — shown the first time the
  // customizer is ever opened on this device.
  const [discovered, setDiscovered] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem('dj-theme-found')) {
        setDiscovered(true);
        localStorage.setItem('dj-theme-found', '1');
      }
    } catch {}
  }, []);

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

        <AnimatePresence>
          {discovered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="px-5 overflow-hidden"
            >
              <div
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 mb-1"
                style={{ backgroundColor: 'rgb(var(--ninja-blue) / 0.1)' }}
              >
                <span className="text-ninja-blue flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3z" /></svg>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold font-ninja text-ninja-navy leading-tight">You found a hidden setting!</p>
                  <p className="text-xs font-ninja text-ninja-muted leading-tight">Make DojoLink your own — pick a theme color.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDiscovered(false)}
                  aria-label="Dismiss"
                  className="ml-auto flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-ninja-muted hover:text-ninja-navy hover:bg-white/60 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-5 pb-5 pt-1 flex flex-col gap-5">
          {/* mode */}
          <div>
            <p className="text-xs font-bold font-ninja uppercase tracking-wide text-ninja-muted mb-2.5">Mode</p>
            <ModeToggle mode={settings.mode} onChange={setMode} />
          </div>

          {/* hue / shade color map */}
          <ColorMap value={settings.accentColor} onChange={setAccent} onPreview={previewAccent} />

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
