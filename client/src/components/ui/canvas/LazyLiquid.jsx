import { lazy, Suspense } from 'react';

// Liquid is a self-contained WebGL2 fluid sim (Canvas UI, MIT + Commons Clause;
// source vendored in Liquid.tsx). It carries no npm deps but the shader code is
// heavy, so it stays out of the eager graph — same reason Tiptap loads lazily.
// No fallback: the hero renders its own background underneath, so the canvas
// simply fades in once the chunk arrives.
const Liquid = lazy(() => import('./Liquid.tsx'));

export default function LazyLiquid(props) {
  return (
    <Suspense fallback={null}>
      <Liquid {...props} />
    </Suspense>
  );
}
