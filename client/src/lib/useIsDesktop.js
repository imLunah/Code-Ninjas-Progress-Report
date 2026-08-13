import { useState, useEffect } from 'react';

// Whether there is room beside the thing you are looking at.
//
// Asked in JS rather than answered with `lg:hidden` on two copies of the same
// markup, because the things that ask this question are dialogs and forms:
// rendering both layouts would mean two sets of inputs bound to one piece of
// state, one of them invisible and both of them writing to it.
//
// 1024px is the app's own desktop line — the nav's breakpoint, and the width
// below which there is no beside.
const QUERY = '(min-width: 1024px)';

export default function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}
