import { useState, useRef } from 'react';
import { Input, Select, Button, ConfirmDialog } from '../common';
import {
  useSettings,
  updateSetting,
  resetSettings,
  exportData,
  importData,
  clearAllData,
  factoryReset,
} from '../../hooks/useSettings';
import styles from './Settings.module.css';

/**
 * Decimal number input that keeps its own text while typing (so "2." or an
 * empty field are allowed mid-edit) and commits a parsed value only when valid.
 * Empty / invalid text on blur reverts to the stored value.
 */
function DecimalSettingInput({
  value,
  onCommit,
  allowZero = true,
  placeholder,
  ariaLabel,
}: {
  value: number | undefined;
  onCommit: (value: number) => void;
  allowZero?: boolean;
  placeholder?: string;
  ariaLabel: string;
}) {
  const format = (v: number | undefined) => (v ? String(v) : '');
  const [text, setText] = useState(() => format(value));
  const [focused, setFocused] = useState(false);

  // Follow external changes (reset, import) while not editing
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (!focused) setText(format(value));
  }

  const parse = (t: string): number | null => {
    if (t === '' || t === '.') return null;
    const n = parseFloat(t);
    if (!Number.isFinite(n) || n < 0) return null;
    if (!allowZero && n === 0) return null;
    return n;
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-label={ariaLabel}
      value={text}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        // Accept digits and a single decimal separator (comma → dot for EU keyboards)
        const filtered = e.target.value
          .replace(',', '.')
          .replace(/[^0-9.]/g, '')
          .replace(/(\..*?)\./g, '$1');
        setText(filtered);
        const parsed = parse(filtered);
        if (parsed !== null && !filtered.endsWith('.') && parsed !== value) onCommit(parsed);
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parse(text);
        if (parsed === null) {
          setText(format(value));
        } else {
          if (parsed !== value) onCommit(parsed);
          setText(String(parsed));
        }
      }}
      className={styles.numberInput}
    />
  );
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function SettingsPage() {
  const settings = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmAction, setConfirmAction] = useState<
    'resetSettings' | 'clearData' | 'factoryReset' | null
  >(null);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gym-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const result = await importData(text);
    setImportMessage({
      type: result.success ? 'success' : 'error',
      text: result.message,
    });

    // Reset file input
    e.target.value = '';

    // Auto-hide message after 5s
    setTimeout(() => setImportMessage(null), 5000);
  };

  // Errors are caught and shown by ConfirmDialog; it closes itself on success
  const handleConfirm = async () => {
    if (confirmAction === 'resetSettings') {
      await resetSettings();
    } else if (confirmAction === 'clearData') {
      await clearAllData();
    } else if (confirmAction === 'factoryReset') {
      await factoryReset();
      // Re-seed preset exercises (seed data loaded on demand, not in this chunk)
      const { seedDatabase } = await import('../../db/seed');
      await seedDatabase();
    }
  };

  const getConfirmProps = () => {
    switch (confirmAction) {
      case 'resetSettings':
        return {
          title: 'Reset Settings',
          message: 'Reset all settings to default values?',
          confirmLabel: 'Reset',
          variant: 'danger' as const,
        };
      case 'clearData':
        return {
          title: 'Clear Workout Data',
          message:
            'Delete all workout sessions, sets, and PRs? Your exercises, templates, and routines will be kept.',
          confirmLabel: 'Clear Data',
          variant: 'danger' as const,
        };
      case 'factoryReset':
        return {
          title: 'Factory Reset',
          message:
            'Delete ALL data including exercises, templates, routines, and settings? This cannot be undone.',
          confirmLabel: 'Factory Reset',
          variant: 'danger' as const,
        };
      default:
        return { title: '', message: '', confirmLabel: '', variant: 'danger' as const };
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="page-title">Settings</h1>
      </header>

      <section className={styles.section} aria-labelledby="settings-training">
        <h2 id="settings-training" className="eyebrow">Training</h2>
        <div className={`surface ${styles.group}`}>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Weight increment</span>
              <span className={styles.settingDesc}>Step for progressive overload suggestions</span>
            </div>
            <div className={styles.control}>
              <DecimalSettingInput
                value={settings.weightIncrement}
                onCommit={(v) => updateSetting('weightIncrement', v)}
                allowZero={false}
                ariaLabel="Weight increment (kg)"
              />
              <span className={styles.suffix}>kg</span>
            </div>
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Bodyweight</span>
              <span className={styles.settingDesc}>For strength standards and relative strength</span>
            </div>
            <div className={styles.control}>
              <DecimalSettingInput
                value={settings.bodyweight}
                onCommit={(v) => updateSetting('bodyweight', v)}
                placeholder="0"
                ariaLabel="Bodyweight (kg)"
              />
              <span className={styles.suffix}>kg</span>
            </div>
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Week starts on</span>
              <span className={styles.settingDesc}>For routine schedules and the week strip</span>
            </div>
            <div className={`${styles.control} ${styles.selectControl}`}>
              <Select
                aria-label="Week start day"
                value={String(settings.weekStartDay)}
                onChange={(e) => updateSetting('weekStartDay', parseInt(e.target.value, 10))}
                options={DAYS_OF_WEEK.map((d) => ({ value: String(d.value), label: d.label }))}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="settings-data">
        <h2 id="settings-data" className="eyebrow">Backup</h2>
        <div className={`surface ${styles.group}`}>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Export data</span>
              <span className={styles.settingDesc}>Download everything as a JSON backup</span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleExport} className={styles.rowButton}>
              Export
            </Button>
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Import data</span>
              <span className={styles.settingDesc}>Restore a JSON backup (replaces all data)</span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleImportClick} className={styles.rowButton}>
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              hidden
            />
          </div>

          {importMessage && (
            <div
              role="status"
              className={`${styles.message} ${
                importMessage.type === 'success' ? styles.success : styles.error
              }`}
            >
              {importMessage.text}
            </div>
          )}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="settings-danger">
        <h2 id="settings-danger" className={`eyebrow ${styles.dangerTitle}`}>Danger zone</h2>
        <div className={`surface ${styles.group} ${styles.dangerZone}`}>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Reset settings</span>
              <span className={styles.settingDesc}>Restore all settings to defaults</span>
            </div>
            <Button variant="danger" size="sm" onClick={() => setConfirmAction('resetSettings')} className={styles.rowButton}>
              Reset
            </Button>
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Clear workout data</span>
              <span className={styles.settingDesc}>Delete sessions, sets and PRs</span>
            </div>
            <Button variant="danger" size="sm" onClick={() => setConfirmAction('clearData')} className={styles.rowButton}>
              Clear
            </Button>
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Factory reset</span>
              <span className={styles.settingDesc}>Delete everything and start fresh</span>
            </div>
            <Button variant="danger" size="sm" onClick={() => setConfirmAction('factoryReset')} className={styles.rowButton}>
              Reset all
            </Button>
          </div>
        </div>
      </section>

      <p className={styles.version}>
        Gym Tracker <span className="num">v{__APP_VERSION__}</span>
      </p>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        {...getConfirmProps()}
      />
    </div>
  );
}
