import { useState, useRef } from 'react';
import { Input, Select, Button, ConfirmDialog, Card } from '../common';
import {
  useSettings,
  updateSetting,
  resetSettings,
  exportData,
  importData,
  clearAllData,
  factoryReset,
} from '../../hooks/useSettings';
import { seedDatabase } from '../../db/seed';
import styles from './Settings.module.css';

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

  const handleConfirm = async () => {
    if (confirmAction === 'resetSettings') {
      await resetSettings();
    } else if (confirmAction === 'clearData') {
      await clearAllData();
    } else if (confirmAction === 'factoryReset') {
      await factoryReset();
      // Re-seed preset exercises
      await seedDatabase();
    }
    setConfirmAction(null);
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
        <h1>Settings</h1>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Workout Defaults</h2>
        <Card>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Weight Increment</span>
              <span className={styles.settingDesc}>Default weight step for progressive overload suggestions</span>
            </div>
            <Input
              type="text"
              inputMode="decimal"
              value={String(settings.weightIncrement)}
              onChange={(e) => {
                const filtered = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\./g, '$1');
                const parsed = parseFloat(filtered);
                if (!isNaN(parsed)) {
                  updateSetting('weightIncrement', parsed);
                } else if (filtered === '' || filtered === '.') {
                  updateSetting('weightIncrement', 0);
                }
              }}
              style={{ width: 100 }}
            />
          </div>
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Display</h2>
        <Card>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Week Start Day</span>
              <span className={styles.settingDesc}>First day of the week for routine schedules</span>
            </div>
            <Select
              value={String(settings.weekStartDay)}
              onChange={(e) => updateSetting('weekStartDay', parseInt(e.target.value, 10))}
              options={DAYS_OF_WEEK.map((d) => ({ value: String(d.value), label: d.label }))}
            />
          </div>
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Management</h2>
        <Card>
          <div className={styles.dataRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Export Data</span>
              <span className={styles.settingDesc}>Download all data as JSON backup</span>
            </div>
            <Button variant="secondary" onClick={handleExport}>
              Export
            </Button>
          </div>

          <div className={styles.dataRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Import Data</span>
              <span className={styles.settingDesc}>Restore from JSON backup (replaces all data)</span>
            </div>
            <Button variant="secondary" onClick={handleImportClick}>
              Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {importMessage && (
            <div
              className={`${styles.message} ${
                importMessage.type === 'success' ? styles.success : styles.error
              }`}
            >
              {importMessage.text}
            </div>
          )}
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Reset</h2>
        <Card className={styles.dangerZone}>
          <div className={styles.dataRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Reset Settings</span>
              <span className={styles.settingDesc}>Restore all settings to defaults</span>
            </div>
            <Button variant="ghost" onClick={() => setConfirmAction('resetSettings')}>
              Reset
            </Button>
          </div>

          <div className={styles.dataRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Clear Workout Data</span>
              <span className={styles.settingDesc}>Delete sessions, sets, and PRs</span>
            </div>
            <Button variant="danger" onClick={() => setConfirmAction('clearData')}>
              Clear
            </Button>
          </div>

          <div className={styles.dataRow}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>Factory Reset</span>
              <span className={styles.settingDesc}>Delete everything and start fresh</span>
            </div>
            <Button variant="danger" onClick={() => setConfirmAction('factoryReset')}>
              Reset All
            </Button>
          </div>
        </Card>
      </section>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirm}
        {...getConfirmProps()}
      />
    </div>
  );
}
