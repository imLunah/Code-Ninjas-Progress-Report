import { lazy, Suspense } from 'react';

// Tiptap is heavy — only load it when an editor is actually shown.
const MarkdownEditor = lazy(() => import('./MarkdownEditor'));

export default function LazyMarkdownEditor(props) {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl bg-white border border-ninja-border px-3 py-2.5 font-ninja text-sm text-ninja-muted min-h-[5.5rem]">
          Loading editor…
        </div>
      }
    >
      <MarkdownEditor {...props} />
    </Suspense>
  );
}
