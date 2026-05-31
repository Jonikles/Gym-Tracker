import { useState } from 'react';
import { Button, Card, Input, Modal, ConfirmDialog } from '../common';
import {
  useMeasurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
} from '../../hooks/useMeasurements';
import { updateSetting } from '../../hooks/useSettings';
import { MEASUREMENT_FIELDS, type BodyMeasurement, type MeasurementField } from '../../types';
import styles from './MeasurementLog.module.css';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateInput(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateInput(str: string): number {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime(); // noon to avoid TZ issues
}

interface MeasurementFormState {
  date: string;
  bodyweight: string;
  measurements: Record<MeasurementField, string>;
}

function emptyForm(): MeasurementFormState {
  const measurements = {} as Record<MeasurementField, string>;
  for (const f of MEASUREMENT_FIELDS) {
    measurements[f.key] = '';
  }
  return {
    date: formatDateInput(Date.now()),
    bodyweight: '',
    measurements,
  };
}

function formFromEntry(entry: BodyMeasurement): MeasurementFormState {
  const measurements = {} as Record<MeasurementField, string>;
  for (const f of MEASUREMENT_FIELDS) {
    const val = entry[f.key as keyof BodyMeasurement];
    measurements[f.key] = val != null ? String(val) : '';
  }
  return {
    date: formatDateInput(entry.date),
    bodyweight: entry.bodyweight != null ? String(entry.bodyweight) : '',
    measurements,
  };
}

export function MeasurementLog() {
  const entries = useMeasurements() ?? [];
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingEntry, setViewingEntry] = useState<BodyMeasurement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<MeasurementFormState>(emptyForm);

  const latest = entries[0];
  const previous = entries[1];

  // Calculate delta between latest and previous
  const getDelta = (field: 'bodyweight' | MeasurementField) => {
    if (!latest || !previous) return null;
    const curr = latest[field as keyof BodyMeasurement] as number | undefined;
    const prev = previous[field as keyof BodyMeasurement] as number | undefined;
    if (curr == null || prev == null) return null;
    return curr - prev;
  };

  const openCreate = () => {
    setForm(emptyForm());
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEdit = (entry: BodyMeasurement) => {
    setForm(formFromEntry(entry));
    setEditingId(entry.id);
    setViewingEntry(null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    const bw = parseFloat(form.bodyweight) || undefined;
    const data: Record<string, unknown> = {
      date: parseDateInput(form.date),
      bodyweight: bw,
    };
    for (const f of MEASUREMENT_FIELDS) {
      const val = parseFloat(form.measurements[f.key]);
      data[f.key] = !isNaN(val) ? val : undefined;
    }

    if (editingId) {
      await updateMeasurement(editingId, data as Partial<BodyMeasurement>);
    } else {
      await createMeasurement(data as Omit<BodyMeasurement, 'id' | 'createdAt' | 'updatedAt'>);
    }

    // Also update the bodyweight setting if provided
    if (bw && bw > 0) {
      await updateSetting('bodyweight', bw);
    }

    setIsFormOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMeasurement(deleteId);
      setDeleteId(null);
      setViewingEntry(null);
    }
  };

  const updateField = (field: string, value: string) => {
    const filtered = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\./g, '$1');
    if (field === 'bodyweight') {
      setForm((f) => ({ ...f, bodyweight: filtered }));
    } else {
      setForm((f) => ({
        ...f,
        measurements: { ...f.measurements, [field]: filtered },
      }));
    }
  };

  // Count how many measurement fields are filled for an entry
  const countFields = (entry: BodyMeasurement) => {
    let count = 0;
    for (const f of MEASUREMENT_FIELDS) {
      if ((entry[f.key as keyof BodyMeasurement] as number | undefined) != null) count++;
    }
    return count;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Body Log</h1>
        <Button onClick={openCreate}>New Entry</Button>
      </header>

      {/* Summary — latest values with delta */}
      {latest && (
        <div className={styles.summaryRow}>
          {latest.bodyweight != null && (
            <Card className={styles.summaryCard}>
              <span className={styles.summaryValue}>{latest.bodyweight} kg</span>
              <span className={styles.summaryLabel}>Bodyweight</span>
              <DeltaDisplay value={getDelta('bodyweight')} unit="kg" />
            </Card>
          )}
          {MEASUREMENT_FIELDS.map((f) => {
            const val = latest[f.key as keyof BodyMeasurement] as number | undefined;
            if (val == null) return null;
            return (
              <Card key={f.key} className={styles.summaryCard}>
                <span className={styles.summaryValue}>{val} cm</span>
                <span className={styles.summaryLabel}>{f.label}</span>
                <DeltaDisplay value={getDelta(f.key)} unit="cm" />
              </Card>
            );
          })}
        </div>
      )}

      {/* Entry history */}
      <div className={styles.list}>
        {entries.map((entry) => (
          <Card
            key={entry.id}
            className={styles.entryCard}
            onClick={() => setViewingEntry(entry)}
            interactive
          >
            <div className={styles.entryRow}>
              <span className={styles.entryDate}>{formatDate(entry.date)}</span>
              {entry.bodyweight != null && (
                <span className={styles.entryWeight}>{entry.bodyweight} kg</span>
              )}
            </div>
            {countFields(entry) > 0 && (
              <span className={styles.entryMeta}>
                {countFields(entry)} measurement{countFields(entry) !== 1 ? 's' : ''}
              </span>
            )}
          </Card>
        ))}
        {entries.length === 0 && (
          <p className={styles.empty}>
            No entries yet. Log your first measurement to start tracking.
          </p>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingId ? 'Edit Entry' : 'New Entry'}
      >
        <div className={styles.form}>
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />

          <div className={styles.formSection}>
            <span className={styles.formSectionTitle}>Bodyweight</span>
            <Input
              label="Bodyweight (kg)"
              type="text"
              inputMode="decimal"
              placeholder="75.0"
              value={form.bodyweight}
              onChange={(e) => updateField('bodyweight', e.target.value)}
            />
          </div>

          <div className={styles.formSection}>
            <span className={styles.formSectionTitle}>Measurements (cm)</span>
            <div className={styles.formGrid}>
              {MEASUREMENT_FIELDS.map((f) => (
                <Input
                  key={f.key}
                  label={f.label}
                  type="text"
                  inputMode="decimal"
                  placeholder="—"
                  value={form.measurements[f.key]}
                  onChange={(e) => updateField(f.key, e.target.value)}
                />
              ))}
            </div>
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? 'Save' : 'Add Entry'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Detail Modal */}
      <Modal
        isOpen={!!viewingEntry}
        onClose={() => setViewingEntry(null)}
        title={viewingEntry ? formatDate(viewingEntry.date) : ''}
      >
        {viewingEntry && (
          <div className={styles.form}>
            <div className={styles.detailGrid}>
              {viewingEntry.bodyweight != null && (
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Bodyweight</span>
                  <span className={styles.detailValue}>{viewingEntry.bodyweight} kg</span>
                </div>
              )}
              {MEASUREMENT_FIELDS.map((f) => {
                const val = viewingEntry[f.key as keyof BodyMeasurement] as number | undefined;
                if (val == null) return null;
                return (
                  <div key={f.key} className={styles.detailItem}>
                    <span className={styles.detailLabel}>{f.label}</span>
                    <span className={styles.detailValue}>{val} cm</span>
                  </div>
                );
              })}
            </div>
            <div className={styles.formActions}>
              <Button
                variant="danger"
                size="sm"
                className={styles.deleteBtn}
                onClick={() => setDeleteId(viewingEntry.id)}
              >
                Delete
              </Button>
              <Button variant="secondary" onClick={() => openEdit(viewingEntry)}>
                Edit
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Entry"
        message="Delete this measurement entry? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function DeltaDisplay({ value, unit }: { value: number | null; unit: string }) {
  if (value == null) return null;
  const abs = Math.abs(value);
  if (abs < 0.01) return <span className={`${styles.summaryDelta} ${styles.deltaNeutral}`}>—</span>;
  const sign = value > 0 ? '+' : '';
  const cls = value > 0 ? styles.deltaUp : styles.deltaDown;
  return (
    <span className={`${styles.summaryDelta} ${cls}`}>
      {sign}{value.toFixed(1)} {unit}
    </span>
  );
}
