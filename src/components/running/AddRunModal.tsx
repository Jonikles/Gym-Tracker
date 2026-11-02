import { useState } from 'react';
import { Button, Input, Modal, Select } from '../common';
import { formatDateInputValue } from '../common/format';
import { createManualRun } from '../../hooks/useRuns';
import { RUN_KIND_LABELS, formatPace, paceSecondsPerKm, parseDurationInput } from '../../utils/run';
import type { RunKind } from '../../types';
import styles from './Running.module.css';

interface AddRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded?: (runId: string) => void;
}

const KIND_OPTIONS = (Object.keys(RUN_KIND_LABELS) as RunKind[]).map((k) => ({ value: k, label: RUN_KIND_LABELS[k] }));

function nowTimeValue(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Hand-entered run, for days the watch didn't record one */
export function AddRunModal({ isOpen, onClose, onAdded }: AddRunModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Run">
      {isOpen && <AddRunForm onClose={onClose} onAdded={onAdded} />}
    </Modal>
  );
}

function AddRunForm({ onClose, onAdded }: Omit<AddRunModalProps, 'isOpen'>) {
  const [date, setDate] = useState(() => formatDateInputValue(new Date()));
  const [time, setTime] = useState(nowTimeValue);
  const [distanceKm, setDistanceKm] = useState('');
  const [duration, setDuration] = useState('');
  const [kind, setKind] = useState<RunKind>('road');
  const [heartrate, setHeartrate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meters = Math.round(parseFloat(distanceKm.replace(',', '.')) * 1000);
  const seconds = parseDurationInput(duration);
  const valid = meters > 0 && seconds != null;
  const pace = valid ? paceSecondsPerKm(meters, seconds) : undefined;

  const handleSave = async () => {
    if (!valid || saving) return;
    const [y, mo, d] = date.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    const startedAt = new Date(y, mo - 1, d, h || 0, mi || 0).getTime();
    if (!Number.isFinite(startedAt)) {
      setError('Pick a valid date');
      return;
    }
    const hr = parseInt(heartrate, 10);
    setSaving(true);
    try {
      const id = await createManualRun({
        kind,
        startedAt,
        distance: meters,
        movingTime: seconds,
        averageHeartrate: hr > 0 ? hr : undefined,
        notes,
      });
      onAdded?.(id);
      onClose();
    } catch {
      setError('Could not save the run');
      setSaving(false);
    }
  };

  return (
    <div className={styles.form}>
      <div className={styles.formRow}>
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input label="Start" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className={styles.formRow}>
        <Input
          label="Distance (km)"
          inputMode="decimal"
          placeholder="5.0"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value.replace(/[^0-9.,]/g, ''))}
        />
        <Input
          label="Time"
          inputMode="numeric"
          placeholder="28:30"
          value={duration}
          onChange={(e) => setDuration(e.target.value.replace(/[^0-9:.,]/g, ''))}
        />
      </div>
      <div className={styles.formRow}>
        <Select label="Type" value={kind} onChange={(e) => setKind(e.target.value as RunKind)} options={KIND_OPTIONS} />
        <Input
          label="Avg HR (optional)"
          inputMode="numeric"
          placeholder="bpm"
          value={heartrate}
          onChange={(e) => setHeartrate(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <p className={styles.formHint}>
        {pace != null
          ? <>Pace <span className="num">{formatPace(pace)}</span></>
          : 'Time as mm:ss, h:mm:ss or minutes'}
      </p>
      {error && <p className={styles.syncError} role="alert">{error}</p>}
      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={!valid || saving}>{saving ? 'Saving…' : 'Add Run'}</Button>
      </div>
    </div>
  );
}
