import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useClickOutside } from '../session/useClickOutside';
import styles from './MoreMenu.module.css';

interface MoreMenuProps {
  /** Menu content; receives `close` so items can dismiss the menu */
  children: (close: () => void) => ReactNode;
  label?: string;
  className?: string;
}

/** ⋮ icon button with a dropdown, closes on outside tap */
export function MoreMenu({ children, label = 'More options', className = '' }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  return (
    <div className={`${styles.wrapper} ${className}`} ref={ref}>
      <button
        type="button"
        className={`icon-btn ${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen((o) => !o)}
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        ⋮
      </button>
      {open && (
        <div className={styles.dropdown} role="menu">
          {children(close)}
        </div>
      )}
    </div>
  );
}

interface MoreMenuItemProps {
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}

export function MoreMenuItem({ onClick, danger, children }: MoreMenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`${styles.item} ${danger ? styles.danger : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Small labelled block inside the menu (e.g. a view toggle) */
export function MoreMenuSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>{label}</span>
      {children}
    </div>
  );
}
