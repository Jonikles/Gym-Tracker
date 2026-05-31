import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import styles from './UndoToast.module.css';

interface UndoAction {
  id: string;
  message: string;
  undo: () => void | Promise<void>;
  expiresAt: number;
}

interface UndoContextValue {
  /**
   * Show an undo toast. Execute the destructive action first, then call this.
   * If the user clicks "Undo", the undo callback fires to restore the data.
   * @param message - e.g. "Template archived"
   * @param undo - callback to reverse the action
   * @param durationMs - how long the toast stays visible (default 5000)
   */
  showUndo: (message: string, undo: () => void | Promise<void>, durationMs?: number) => void;
}

const UndoCtx = createContext<UndoContextValue | null>(null);

export function UndoProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<UndoAction | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const dismiss = useCallback(() => {
    setAction(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const showUndo = useCallback(
    (message: string, undo: () => void | Promise<void>, durationMs = 5000) => {
      // Clear previous toast if any
      if (timerRef.current) clearTimeout(timerRef.current);

      const id = crypto.randomUUID();
      setAction({ id, message, undo, expiresAt: Date.now() + durationMs });

      timerRef.current = setTimeout(() => {
        setAction((prev) => (prev?.id === id ? null : prev));
      }, durationMs);
    },
    []
  );

  const handleUndo = useCallback(async () => {
    if (!action) return;
    await action.undo();
    dismiss();
  }, [action, dismiss]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <UndoCtx.Provider value={{ showUndo }}>
      {children}

      {/* Toast rendered at app level */}
      {action && (
        <div className={styles.toast} key={action.id}>
          <span className={styles.message}>{action.message}</span>
          <button className={styles.undoBtn} onClick={handleUndo}>
            Undo
          </button>
          <button className={styles.dismissBtn} onClick={dismiss} title="Dismiss">
            ×
          </button>
        </div>
      )}
    </UndoCtx.Provider>
  );
}

export function useUndo() {
  const ctx = useContext(UndoCtx);
  if (!ctx) throw new Error('useUndo must be used within UndoProvider');
  return ctx;
}
