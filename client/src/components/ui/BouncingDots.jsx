// Three dots travelling in a wave, for a wait with no progress to report.
//
// Used where a skeleton would lie about the shape of what is coming: the booked
// list can be four rows or none, so drawing four grey bars promises a result
// that may not arrive. The keyframe and the phase offsets live in index.css.
//
// The label rides on the container rather than a visually hidden child, because
// the phase offsets are nth-child and an extra element would shift every dot
// onto the wrong beat.
export default function BouncingDots({ label = 'Loading', className = '' }) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`dot-wave flex items-center justify-center gap-1.5 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-ninja-muted" />
      <span className="w-1.5 h-1.5 rounded-full bg-ninja-muted" />
      <span className="w-1.5 h-1.5 rounded-full bg-ninja-muted" />
    </div>
  );
}
