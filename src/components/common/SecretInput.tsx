import { useState, type InputHTMLAttributes } from 'react';
import { Input } from './Input';
import styles from './SecretInput.module.css';

interface SecretInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Used for the input's and the eye button's accessible names, e.g. "backup key" */
  name: string;
  error?: string;
}

/**
 * Password-style input for keys and secrets, with an eye button to show what
 * was typed. Starts hidden on every mount.
 */
export function SecretInput({ name, error, className = '', ...props }: SecretInputProps) {
  const [shown, setShown] = useState(false);
  return (
    <div className={styles.field}>
      <Input
        type={shown ? 'text' : 'password'}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={name.charAt(0).toUpperCase() + name.slice(1)}
        error={error}
        className={`${styles.input} ${className}`}
        {...props}
      />
      <button
        type="button"
        className={styles.reveal}
        onClick={() => setShown((v) => !v)}
        aria-label={`${shown ? 'Hide' : 'Show'} ${name}`}
        aria-pressed={shown}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
          {shown && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}
