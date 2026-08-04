// Halloween mode dressing: a cobweb in each top corner and a spider bobbing
// on a thread. Pure decoration — fixed, pointer-events-none, aria-hidden —
// and it draws in currentColor so it follows the theme's ink in both modes.
// Rendered by Layout only while the Halloween toggle is on.

function CornerWeb({ className }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      {/* Spokes out of the corner, then three sagging rings across them. */}
      <path
        d="M0 0H100 M0 0L87 50 M0 0L50 87 M0 0V100
           M35 0 Q28.8 7.7 30.5 17.5 Q21.1 21.1 17.5 30.5 Q7.7 28.8 0 35
           M60 0 Q49.3 13.2 52 30 Q36.1 36.1 30 52 Q13.2 49.3 0 60
           M85 0 Q70 18.7 74 42.5 Q51.3 51.3 42.5 74 Q18.7 70 0 85"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Spider({ className }) {
  return (
    <svg viewBox="0 0 24 72" fill="none" className={className}>
      <path d="M12 0V45" stroke="currentColor" strokeWidth="1" />
      {/* Legs, three a side */}
      <path
        d="M8.5 51 Q3 49 2 44 M7.5 54 Q2 54 0.5 50 M8.5 57 Q4 59 3 63
           M15.5 51 Q21 49 22 44 M16.5 54 Q22 54 23.5 50 M15.5 57 Q20 59 21 63"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="12" cy="53" r="5" fill="currentColor" />
      <circle cx="12" cy="60.5" r="3.2" fill="currentColor" />
    </svg>
  );
}

export default function HalloweenDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <CornerWeb className="absolute top-0 left-0 w-28 h-28 lg:w-36 lg:h-36 text-ninja-muted/35" />
      <CornerWeb className="absolute top-0 right-0 w-28 h-28 lg:w-36 lg:h-36 text-ninja-muted/35 -scale-x-100" />
      <div className="halloween-spider absolute top-0 right-16 lg:right-48">
        <Spider className="w-6 h-[72px] text-ninja-navy/50" />
      </div>
    </div>
  );
}
