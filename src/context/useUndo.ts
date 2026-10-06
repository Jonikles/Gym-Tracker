import { createContext, useContext } from 'react';

export interface UndoContextValue {
  /**
   * Show an undo toast. Execute the destructive action first, then call this.
   * If the user clicks "Undo", the undo callback fires to restore the data.
   * @param message - e.g. "Set deleted"
   * @param undo - callback to reverse the action
   * @param durationMs - how long the toast stays visible (default 5000)
   */
  showUndo: (message: string, undo: () => void | Promise<void>, durationMs?: number) => void;
}

export const UndoCtx = createContext<UndoContextValue | null>(null);

export function useUndo() {
  const ctx = useContext(UndoCtx);
  if (!ctx) throw new Error('useUndo must be used within UndoProvider');
  return ctx;
}
