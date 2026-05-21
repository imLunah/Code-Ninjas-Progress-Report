import { createContext, useContext, useState, useCallback } from 'react';

const Ctx = createContext(null);

export function TransitionProvider({ children }) {
  const [pending, setPending] = useState(null);
  const start = useCallback((to, state) => setPending({ to, state }), []);
  const end   = useCallback(() => setPending(null), []);
  return <Ctx.Provider value={{ pending, start, end }}>{children}</Ctx.Provider>;
}

export const usePageTransition = () => useContext(Ctx);
