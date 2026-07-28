import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { MoonIcon, SunIcon } from './icons';

export default function ThemeToggle({ className = '' }) {
  const { dark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
        dark
          ? 'text-yellow-300 bg-yellow-400/10 hover:bg-yellow-400/20'
          : 'text-ninja-muted bg-ninja-bg hover:bg-ninja-border'
      } ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? 'moon' : 'sun'}
          initial={{ opacity: 0, rotate: dark ? -60 : 60, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: dark ? 60 : -60, scale: 0.5 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex items-center justify-center"
        >
          {dark ? <MoonIcon width="15" height="15" /> : <SunIcon width="15" height="15" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
