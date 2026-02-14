import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, ConfirmDialog, Select } from '../common';
import { RoutineForm, type RoutineFormData } from './RoutineForm';
import { RoutineCalendar } from './RoutineCalendar';
import {
  useRoutine,
  updateRoutine,
  archiveRoutine,
  deleteRoutine,
  duplicateRoutine,
} from '../../hooks/useRoutines';
import { useTemplates } from '../../hooks/useTemplates';
import { useSetting, updateSetting } from '../../hooks/useSettings';
import type { RoutineDay, Template } from '../../types';
import styles from './RoutineDetail.module.css';

interface RoutineDetailProps {
  routineId: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function ScheduleDayRow({
  day,
  templates,
  isFixed,
  onUpdate,
  onRemove,
  showRemove,
}: {
  day: RoutineDay;
  templates: Template[];
  isFixed: boolean;
  onUpdate: (updates: Partial<RoutineDay>) => void;
  onRemove?: () => void;
  showRemove: boolean;
}) {
  const currentTemplate = templates.find((t) => t.id === day.templateId);

  return (
    <div className={styles.scheduleRow}>
      <div className={styles.dayLabel}>
        {isFixed ? DAY_NAMES[day.dayIndex] : `Day ${day.dayIndex + 1}`}
        {day.label && <span className={styles.daySubLabel}>({day.label})</span>}
      </div>
      <div className={styles.dayControls}>
        <Select
          value={day.templateId ?? ''}
          onChange={(e) => onUpdate({ templateId: e.target.value || undefined })}
          options={[
            { value: '', label: 'Rest Day' },
            ...templates.map((t) => ({ value: t.id, label: t.name })),
          ]}
        />
        <input
          type="text"
          className={styles.labelInput}
          placeholder="Label (optional)"
          value={day.label ?? ''}
          onChange={(e) => onUpdate({ label: e.target.value || undefined })}
        />
        {showRemove && onRemove && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            ×
          </Button>
        )}
      </div>
      {currentTemplate && (
        <div className={styles.templatePreview}>
          {currentTemplate.exercises.length} exercises,{' '}
          {currentTemplate.exercises.reduce((sum, e) => sum + e.sets.length, 0)} sets
        </div>
      )}
    </div>
  );
}

export function RoutineDetail({ routineId }: RoutineDetailProps) {
  const navigate = useNavigate();
  const routine = useRoutine(routineId);
  const templates = useTemplates() ?? [];
  const activeRoutineId = useSetting('activeRoutineId');
  const isActive = activeRoutineId === routineId;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showSetActiveConfirm, setShowSetActiveConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'calendar'>('schedule');
  
  // Local schedule state for editing
  const [localSchedule, setLocalSchedule] = useState<RoutineDay[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local schedule when routine loads
  useEffect(() => {
    if (routine) {
      setLocalSchedule(routine.schedule);
      setHasChanges(false);
    }
  }, [routine?.id, routine?.schedule]);

  if (!routine) {
    return (
      <div className={styles.container}>
        <p>Loading routine...</p>
      </div>
    );
  }

  const handleUpdateMeta = async (data: RoutineFormData) => {
    await updateRoutine(routineId, data);
    setIsEditModalOpen(false);
  };

  const handleDuplicate = async () => {
    const newId = await duplicateRoutine(routineId);
    navigate(`/routines/${newId}`);
  };

  const handleArchive = async () => {
    await archiveRoutine(routineId);
    navigate('/routines');
  };

  const handleDelete = async () => {
    await deleteRoutine(routineId);
    navigate('/routines');
  };

  const handleSetAsActive = async () => {
    await updateSetting('activeRoutineId', routineId);
    setShowSetActiveConfirm(false);
  };

  const handleUpdateDay = (dayIndex: number, updates: Partial<RoutineDay>) => {
    setLocalSchedule((prev) =>
      prev.map((day) =>
        day.dayIndex === dayIndex ? { ...day, ...updates } : day
      )
    );
    setHasChanges(true);
  };

  const handleAddDay = () => {
    const maxIndex = Math.max(-1, ...localSchedule.map((d) => d.dayIndex));
    setLocalSchedule((prev) => [
      ...prev,
      { dayIndex: maxIndex + 1, templateId: undefined },
    ]);
    setHasChanges(true);
  };

  const handleRemoveDay = (dayIndex: number) => {
    setLocalSchedule((prev) =>
      prev
        .filter((d) => d.dayIndex !== dayIndex)
        .map((d, i) => ({ ...d, dayIndex: i }))
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validate: at least one template must be assigned
    const hasTemplate = localSchedule.some((d) => d.templateId);
    if (!hasTemplate) {
      alert('Assign at least one template to your routine');
      return;
    }

    setIsSaving(true);
    try {
      await updateRoutine(routineId, { schedule: localSchedule });
      setHasChanges(false);
      navigate('/routines');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setLocalSchedule(routine.schedule);
    setHasChanges(false);
    setShowDiscardConfirm(false);
  };

  const handleBack = () => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      navigate('/routines');
    }
  };

  const sortedSchedule = [...localSchedule].sort((a, b) => a.dayIndex - b.dayIndex);
  const activeDays = localSchedule.filter((d) => d.templateId);

  return (
    <div className={styles.container}>
        <header className={styles.header}>
            <div className={styles.headerLeft}>
                <Button variant="ghost" size="sm" onClick={handleBack}>
                    ← Back
                </Button>
                <div className={styles.titleBlock}>
                    <div className={styles.titleRow}>
                        <h1 className={styles.title}>{routine.name}</h1>
                        {isActive && <span className={styles.activeBadge}>Active</span>}
                    </div>
                    <div className={styles.meta}>
                        <span>{routine.type === 'fixed' ? 'Weekly' : 'Rolling'}</span>
                        <span>•</span>
                        <span>{activeDays.length} workouts</span>
                    </div>
                </div>
            </div>
            <div className={styles.headerActions}>
                {!isActive && (
                <Button onClick={() => setShowSetActiveConfirm(true)}>
                    Set as Active
                </Button>
                )}
                <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
                Edit
                </Button>
                <Button variant="ghost" onClick={handleDuplicate}>
                Duplicate
                </Button>
                <Button variant="ghost" onClick={() => setShowArchiveConfirm(true)}>
                Archive
                </Button>
                <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                Delete
                </Button>
            </div>
        </header>

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'schedule' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          Schedule
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'calendar' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar
        </button>
      </div>

      {activeTab === 'schedule' && (
        <section className={styles.scheduleSection}>
          <div className={styles.scheduleHeader}>
            <h2>Schedule</h2>
            {routine.type === 'rolling' && (
              <Button size="sm" onClick={handleAddDay}>
                Add Day
              </Button>
            )}
          </div>
          <div className={styles.scheduleList}>
            {sortedSchedule.map((day) => (
              <ScheduleDayRow
                key={day.dayIndex}
                day={day}
                templates={templates}
                isFixed={routine.type === 'fixed'}
                onUpdate={(updates) => handleUpdateDay(day.dayIndex, updates)}
                onRemove={() => handleRemoveDay(day.dayIndex)}
                showRemove={routine.type === 'rolling' && localSchedule.length > 1}
              />
            ))}
          </div>
          {routine.type === 'rolling' && routine.currentPosition !== undefined && (
            <div className={styles.currentPosition}>
              Current position: Day {routine.currentPosition + 1}
              {sortedSchedule[routine.currentPosition]?.label &&
                ` (${sortedSchedule[routine.currentPosition].label})`}
            </div>
          )}
        </section>
      )}

      {activeTab === 'calendar' && (
        <section className={styles.calendarSection}>
          <RoutineCalendar routine={routine} />
        </section>
      )}

      {/* Save/Cancel buttons - only show when there are changes */}
      {hasChanges && (
        <div className={styles.saveActions}>
          <Button
            variant="ghost"
            onClick={() => setShowDiscardConfirm(true)}
            disabled={isSaving}
          >
            Discard Changes
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Routine'}
          </Button>
        </div>
      )}

      {/* Edit Details Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Routine"
      >
        <RoutineForm
          initialValues={{
            name: routine.name,
            type: routine.type,
          }}
          onSubmit={handleUpdateMeta}
          onCancel={() => setIsEditModalOpen(false)}
          isEdit
        />
      </Modal>

      {/* Archive Confirmation */}
      <ConfirmDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        onConfirm={handleArchive}
        title="Archive Routine"
        message={`Archive "${routine.name}"? It will no longer appear in the routine list.`}
        confirmLabel="Archive"
        variant="danger"
      />

      {/* Discard Changes Confirmation */}
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={handleDiscard}
        title="Discard Changes"
        message="Discard unsaved changes to this routine?"
        confirmLabel="Discard"
        variant="danger"
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Routine Permanently"
        message={`Delete "${routine.name}" permanently? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Set as Active Confirmation */}
      <ConfirmDialog
        isOpen={showSetActiveConfirm}
        onClose={() => setShowSetActiveConfirm(false)}
        onConfirm={handleSetAsActive}
        title="Set as Active Routine"
        message={`Make "${routine.name}" your active routine? This will be used for your home screen workouts.`}
        confirmLabel="Set as Active"
      />
    </div>
  );
}
