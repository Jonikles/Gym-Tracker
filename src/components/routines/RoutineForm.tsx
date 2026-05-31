import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Button, Input, Select } from '../common';
import type { RoutineType } from '../../types';
import styles from './RoutineForm.module.css';

interface RoutineFormProps {
  initialValues?: {
    name: string;
    type: RoutineType;
  };
  onSubmit: (data: RoutineFormData) => void;
  onCancel: () => void;
  isEdit?: boolean;
  error?: string | null;
}

export interface RoutineFormData {
  name: string;
  type: RoutineType;
}

export function RoutineForm({
  initialValues,
  onSubmit,
  onCancel,
  isEdit = false,
  error,
}: RoutineFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [type, setType] = useState<RoutineType>(initialValues?.type ?? 'fixed');
  const nameRef = useRef<HTMLInputElement>(null);

  // Focus name input after dialog opens (autoFocus doesn't work with <dialog>.showModal())
  useEffect(() => {
    const timer = setTimeout(() => nameRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      type,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div>
        <Input
          ref={nameRef}
          label="Routine Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., PPL Split, Upper/Lower"
          required
        />
        {error && <p className={styles.error}>{error}</p>}
      </div>

      {!isEdit && (
        <Select
          label="Schedule Type"
          value={type}
          onChange={(e) => setType(e.target.value as RoutineType)}
          options={[
            { value: 'fixed', label: 'Weekly (same days each week)' },
            { value: 'rolling', label: 'Rolling (cycle through days)' },
          ]}
        />
      )}

      {!isEdit && (
        <div className={styles.typeHint}>
          {type === 'fixed' ? (
            <p>
              <strong>Weekly:</strong> Assign templates to specific days of the week
              (e.g., Push on Monday, Pull on Wednesday).
            </p>
          ) : (
            <p>
              <strong>Rolling:</strong> Cycle through your templates regardless of
              weekday (e.g., A → B → C → Rest → A...).
            </p>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          {isEdit ? 'Save Changes' : 'Create Routine'}
        </Button>
      </div>
    </form>
  );
}
