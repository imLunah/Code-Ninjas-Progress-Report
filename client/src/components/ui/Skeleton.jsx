import { CARD } from '../../lib/surfaces';

// Loading placeholders shaped like the content that is coming, instead of the
// word "Loading". The page keeps its height and structure, so nothing jumps
// when the data lands.
//
// aria-hidden on the shapes and aria-busy on the wrapper: a screen reader
// should hear "loading", not a description of grey rectangles.

export function Skeleton({ className = '', style }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-ninja-bg ${className}`} style={style} />;
}

function Wrap({ label, children }) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      {children}
    </div>
  );
}

// Rows of text with a leading avatar block. Rosters, staff lists, user tables.
export function SkeletonList({ rows = 6, label = 'Loading' }) {
  return (
    <Wrap label={label}>
      <div className="space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={`${CARD} p-4 flex items-center gap-3`}>
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-3.5" style={{ width: `${45 + ((i * 13) % 30)}%` }} />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </Wrap>
  );
}

// A grid of cards. Clubs, reports tiles, anything laid out in a grid.
export function SkeletonCards({ count = 6, cols = 'sm:grid-cols-2 lg:grid-cols-3', height = 140, label = 'Loading' }) {
  return (
    <Wrap label={label}>
      <div className={`grid grid-cols-1 ${cols} gap-4`}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={`${CARD} p-5 space-y-3`} style={{ minHeight: height }}>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </Wrap>
  );
}

// Header block plus body, for detail pages.
export function SkeletonProfile({ label = 'Loading' }) {
  return (
    <Wrap label={label}>
      <div className="space-y-6">
        <div className={`${CARD} p-6 flex items-center gap-4`}>
          <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`${CARD} p-5 lg:col-span-2 space-y-3`}>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className={`${CARD} p-5 space-y-3`}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </div>
    </Wrap>
  );
}

export default Skeleton;
