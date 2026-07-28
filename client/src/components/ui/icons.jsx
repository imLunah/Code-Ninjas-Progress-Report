// The app's icon set. These are lucide glyphs, re-exported under the names the
// codebase already used so call sites didn't have to churn.
//
// Lucide icons still take currentColor, so the accent and dark mode work the
// way the hand-written SVGs did. They also spread props, so callers keep
// passing their own className and strokeWidth exactly as before.
//
// Import icons from here (or straight from lucide-react) rather than pasting
// paths into a component — that duplication is what this module replaced.
export {
  MoonIcon,
  SunIcon,
  RocketIcon,
  CameraIcon,
  // Named for the job they do here, not for lucide's glyph name.
  CircleAlertIcon as WarningIcon,
  Trash2Icon as TrashIcon,
} from 'lucide-react';
