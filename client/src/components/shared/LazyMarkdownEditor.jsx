import { lazy, Suspense } from 'react';

// Tiptap is heavy — only load it when an editor is actually shown.
const MarkdownEditor = lazy(() => import('./MarkdownEditor'));

export default function LazyMarkdownEditor(props) {
  // The bare variant sits on a colored surface, so its placeholder must not
  // bring a white card along for the half second before Tiptap lands.
  const fallback =
    props.variant === 'bare' ? (
      <div className="font-ninja text-sm opacity-60">Loading editor…</div>
    ) : (
      <div className="rounded-xl bg-white border border-ninja-border px-3 py-2.5 font-ninja text-sm text-ninja-muted min-h-[5.5rem]">
        Loading editor…
      </div>
    );

  return (
    <Suspense fallback={fallback}>
      <MarkdownEditor {...props} />
    </Suspense>
  );
}
