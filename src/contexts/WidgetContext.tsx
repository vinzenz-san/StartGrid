import { createContext, useContext, type ReactNode } from 'react';
import { useStorage } from '../hooks/useStorage';
import type { Widget } from '../types/widget';

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'demo-1', type: 'placeholder', col: 1, row: 1, w: 2, h: 2, data: { title: 'Small (2×2)' } },
  { id: 'demo-2', type: 'placeholder', col: 3, row: 1, w: 4, h: 3, data: { title: 'Medium (4×3)' } },
  { id: 'demo-3', type: 'placeholder', col: 7, row: 1, w: 2, h: 2, data: { title: 'Small (2×2)' } },
  { id: 'demo-4', type: 'placeholder', col: 1, row: 3, w: 3, h: 2, data: { title: 'Wide (3×2)' } },
];

interface WidgetContextType {
  widgets: Widget[];
  updateWidget: (id: string, updates: Partial<Widget>) => void;
  removeWidget: (id: string) => void;
  addWidget: (widget: Omit<Widget, 'id'>) => Widget;
  loaded: boolean;
}

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: ReactNode }) {
  const [widgets, setWidgets, loaded] = useStorage<Widget[]>('widgets', DEFAULT_WIDGETS);

  const updateWidget = (id: string, updates: Partial<Widget>) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const addWidget = (widget: Omit<Widget, 'id'>): Widget => {
    const newWidget: Widget = { ...widget, id: `w-${Date.now()}` };
    setWidgets(prev => [...prev, newWidget]);
    return newWidget;
  };

  return (
    <WidgetContext.Provider value={{ widgets, updateWidget, removeWidget, addWidget, loaded }}>
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidgets() {
  const ctx = useContext(WidgetContext);
  if (!ctx) throw new Error('useWidgets must be used within WidgetProvider');
  return ctx;
}
