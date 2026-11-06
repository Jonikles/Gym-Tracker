import { useState } from 'react';
import { Button, Modal } from '../common';
import { SecretInput } from '../common/SecretInput';
import { connectGarmin, GARMIN_KEY_URL } from '../../utils/garmin';
import styles from './Running.module.css';

interface GarminConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after the key was checked and saved */
  onConnected?: () => void;
}

/** Paste a Garmin Personal API key; it's checked against Garmin before saving */
export function GarminConnectModal({ isOpen, onClose, onConnected }: GarminConnectModalProps) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setKey('');
    setError(null);
    onClose();
  };

  const connect = async () => {
    if (busy || !key.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await connectGarmin(key);
      setKey('');
      onClose();
      onConnected?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to Garmin');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="Connect Garmin">
      <div className={styles.connectStack}>
        <ol className={styles.connectSteps}>
          <li>
            Open{' '}
            <a href={GARMIN_KEY_URL} target="_blank" rel="noopener noreferrer">
              Garmin Connect → Personal API
            </a>{' '}
            and sign in.
          </li>
          <li>Create a key and pick the longest expiry (1 year).</li>
          <li>Copy it — Garmin shows it only once — and paste it here.</li>
        </ol>
        {isOpen && (
          <SecretInput
            name="Garmin API key"
            placeholder="Garmin API key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && connect()}
            error={error ?? undefined}
          />
        )}
        <Button onClick={connect} disabled={busy || !key.trim()}>
          {busy ? 'Checking…' : 'Connect'}
        </Button>
        <p className={styles.connectNote}>
          The key stays on this phone. When it expires, create a new one and connect again.
        </p>
      </div>
    </Modal>
  );
}
