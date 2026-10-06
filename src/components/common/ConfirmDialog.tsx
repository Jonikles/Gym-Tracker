import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** May be async — the dialog stays open (busy) until it settles, and shows the error if it throws */
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear stale error/busy state whenever the dialog is (re)opened
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setError(null);
      setBusy(false);
    }
  }

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await onConfirm();
      setBusy(false);
      onClose();
    } catch (err) {
      console.error('Confirm action failed:', err);
      setBusy(false);
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <p className={styles.message}>{message}</p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="secondary" onClick={handleClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          onClick={handleConfirm}
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
