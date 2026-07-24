import { lazy, Suspense } from 'react';

// Peel is a heavy WebGL component (Canvas UI, vendored in Peel.tsx). Kept out of
// the eager graph. While the chunk loads — and on any browser without the
// experimental HTML-in-canvas API — the app renders plain and fully usable; the
// peel is pure enhancement on top.
const Peel = lazy(() => import('./Peel.tsx'));

export default function LazyPeel({ children, className, ...props }) {
  return (
    <Suspense fallback={<div className={className}>{children}</div>}>
      <Peel className={className} {...props}>{children}</Peel>
    </Suspense>
  );
}
