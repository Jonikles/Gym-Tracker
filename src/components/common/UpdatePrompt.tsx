import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './UpdatePrompt.module.css';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className={styles.banner}>
      <span className={styles.text}>New version available</span>
      <button
        className={styles.updateBtn}
        onClick={() => updateServiceWorker(true)}
      >
        Update
      </button>
    </div>
  );
}
