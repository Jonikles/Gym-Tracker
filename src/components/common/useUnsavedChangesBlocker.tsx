import { useCallback, useEffect, useRef, type ReactElement } from 'react';
import { useBlocker, useLocation } from 'react-router-dom';
import { ConfirmDialog } from './ConfirmDialog';

interface UnsavedChangesOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  /** Called right before the blocked navigation proceeds (e.g. to clear local dirty state) */
  onDiscard?: () => void;
}

interface UnsavedChangesBlocker {
  /**
   * Let the next navigation through without prompting — call it right before
   * a programmatic `navigate()` after a save/delete, while `isDirty` may still be true.
   */
  allowNextNavigation: () => void;
  /** The "Unsaved Changes" confirm dialog — render it somewhere in the component */
  dialog: ReactElement;
}

/**
 * Blocks in-app navigation while `isDirty` is true and shows an
 * "Unsaved Changes" confirm dialog.
 */
export function useUnsavedChangesBlocker(
  isDirty: boolean,
  {
    title = 'Unsaved Changes',
    message = 'You have unsaved changes. Leave without saving?',
    confirmLabel = 'Discard & Leave',
    onDiscard,
  }: UnsavedChangesOptions = {}
): UnsavedChangesBlocker {
  const allowNavRef = useRef(false);
  const proceedingRef = useRef(false);
  const location = useLocation();

  // A bypass only applies to one navigation — re-arm once the location changes
  useEffect(() => {
    allowNavRef.current = false;
    proceedingRef.current = false;
  }, [location.key]);

  const blocker = useBlocker(() => isDirty && !allowNavRef.current);
  const blockerRef = useRef(blocker);
  useEffect(() => {
    blockerRef.current = blocker;
  });

  const allowNextNavigation = useCallback(() => {
    allowNavRef.current = true;
  }, []);

  const handleConfirm = () => {
    const b = blockerRef.current;
    if (b.state !== 'blocked') return;
    proceedingRef.current = true;
    onDiscard?.();
    b.proceed();
  };

  const handleClose = () => {
    // ConfirmDialog calls onClose after a successful confirm too — don't
    // cancel a navigation that is already proceeding.
    if (proceedingRef.current) return;
    const b = blockerRef.current;
    if (b.state === 'blocked') b.reset();
  };

  const dialog = (
    <ConfirmDialog
      isOpen={blocker.state === 'blocked'}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      variant="danger"
    />
  );

  return { allowNextNavigation, dialog };
}
