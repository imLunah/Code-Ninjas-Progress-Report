import { motion, MotionConfig } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getAccent } from '../../lib/accents';
import ModeToggle from './ModeToggle';
import ColorPalette from './ColorPalette';
import IntensitySlider from './IntensitySlider';
import GlowKnob from './GlowKnob';
import PreviewOrb from './PreviewOrb';

/**
 * Arc-inspired theme customizer. A frosted dark-green glass panel whose
 * controls drive the live app theme through ThemeContext (accent re-skins the
 * whole app; mode toggles light/dark; intensity + glow set global CSS vars).
 */
export default function ThemeCustomizer({ className = '' }) {
  const { settings, setMode, setAccent, setIntensity, setGlow } = useTheme();
  const accent = getAccent(settings.accentColor);

  return (
    <MotionConfig reducedMotion="user">
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      aria-label="Theme customizer"
      className={`relative w-full max-w-md mx-auto overflow-hidden rounded-[32px] p-6 sm:p-7 ${className}`}
      style={{
        background:
          'linear-gradient(160deg, rgba(18,46,36,0.92) 0%, rgba(9,28,22,0.94) 55%, rgba(6,20,16,0.96) 100%)',
        boxShadow:
          '0 30px 80px -20px rgba(0,0,0,0.7), 0 2px 0 rgba(255,255,255,0.05) inset, 0 0 0 1px rgba(255,255,255,0.06) inset',
      }}
    >
      {/* ambient depth blobs */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full blur-3xl opacity-40"
           style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.5), transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-24 -left-16 w-64 h-64 rounded-full blur-3xl opacity-30"
           style={{ background: 'radial-gradient(circle, rgb(var(--ninja-blue) / 0.5), transparent 70%)' }} />

      <div className="relative z-10 flex flex-col gap-6">
        {/* header + mode toggle */}
        <header className="flex flex-col items-center gap-4">
          <div className="text-center">
            <h2 className="text-lg font-bold font-ninja text-white tracking-tight">Theme</h2>
            <p className="text-xs font-ninja text-white/45">Customize your workspace</p>
          </div>
          <ModeToggle mode={settings.mode} onChange={setMode} />
        </header>

        {/* preview */}
        <PreviewOrb accentSwatch={accent.swatch} intensity={settings.intensity} glow={settings.glow} />

        {/* palette */}
        <ColorPalette value={settings.accentColor} onChange={setAccent} />

        {/* intensity + glow */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-6 pt-1">
          <div className="flex-1 min-w-0">
            <IntensitySlider value={settings.intensity} onChange={setIntensity} />
          </div>
          <div className="flex-shrink-0 self-center sm:self-end">
            <GlowKnob value={settings.glow} onChange={setGlow} />
          </div>
        </div>
      </div>
    </motion.section>
    </MotionConfig>
  );
}
