import { motion } from 'framer-motion';

// One exclusive choice, shown as its options rather than hidden behind a
// dropdown. Generalised out of the theme's Light/Dark toggle, which was the
// app's only one and was hardwired to those two strings.
//
// A radiogroup, not a row of buttons: it is one answer to one question, and a
// screen reader should hear it that way. Arrow keys move the choice and only
// the chosen option is tabbable, which is what a radiogroup is supposed to do
// and what a row of buttons never does.
//
// `layoutId` must be unique per instance on screen, or two controls will trade
// the same sliding pill between them.
export default function Segmented({ options, value, onChange, label, layoutId, size = 'md' }) {
  const at = options.findIndex((o) => o.value === value);

  const handleKey = (e) => {
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (!forward && !back) return;
    e.preventDefault();
    const next = (at + (forward ? 1 : -1) + options.length) % options.length;
    onChange(options[next].value);
  };

  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKey}
      className="relative inline-grid gap-1 p-1 rounded-2xl bg-ninja-bg border border-ninja-border"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={`relative flex items-center justify-center gap-1.5 rounded-xl font-bold font-ninja outline-none focus-visible:ring-2 focus-visible:ring-ninja-blue/40 ${pad}`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                className="absolute inset-0 rounded-xl bg-white border border-ninja-border shadow-sm"
              />
            )}
            <span className={`relative z-10 flex items-center gap-1.5 ${active ? 'text-ninja-navy' : 'text-ninja-muted'}`}>
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
