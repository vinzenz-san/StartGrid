import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface ElementInspectorCtx {
  copiedElements: string[];
  addCopiedElement: (text: string) => void;
  clearCopiedElements: () => void;
}

const Ctx = createContext<ElementInspectorCtx | null>(null);

/**
 * Transient (non-persisted) "copy stack" for the DOM Element Inspector —
 * deliberately kept out of AppSettings/browser.storage since it's a
 * session-only scratch list, not a durable preference.
 */
export function ElementInspectorProvider({ children }: { children: ReactNode }) {
  const [copiedElements, setCopiedElements] = useState<string[]>([]);

  const addCopiedElement = useCallback((text: string) => {
    setCopiedElements(prev => [...prev, text]);
  }, []);

  const clearCopiedElements = useCallback(() => setCopiedElements([]), []);

  return (
    <Ctx.Provider value={{ copiedElements, addCopiedElement, clearCopiedElements }}>
      {children}
    </Ctx.Provider>
  );
}

export function useElementInspectorHistory() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useElementInspectorHistory must be used within ElementInspectorProvider');
  return ctx;
}
