import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, ConfirmDialog, Select } from '../common';
import { RoutineForm, type RoutineFormData } from './RoutineForm';
import { RoutineCalendar } from './RoutineCalendar';
import {
  useRoutine,
  updateRoutine,
  archiveRoutine,
  restoreRoutine,
  deleteRoutine,
  duplicateRoutine,
} from '../../hooks/useRoutines';
import { useTemplates } from '../../hooks/useTemplates';
import { useSetting, updateSetting } from '../../hooks/useSettings';
import { useUndo } from '../../context/UndoContext';
import type { RoutineDay, Template } from '../../types';
import styles from './RoutineDetail.module.css';

interface RoutineDetailProps {
  routineId: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Reorder dayIndices so the week starts on the given day */
function getWeekOrder(weekStartDay: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStartDay + i) % 7);
}

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
  const weekStartDay = useSetting('weekStartDay') as number;
  const isActive = activeRoutineId === routineId;
  const { showUndo } = useUndo();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSetActiveConfirm, setShowSetActiveConfirm] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'calendar'>('schedule');

  // Local schedule state for editing
  const [localSchedule, setLocalSchedule] = useState<RoutineDay[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  // Initialize local schedule when routine loads
  useEffect(() => {
    if (routine) {
      setLocalSchedule(routine.schedule);
      setHasChanges(false);
      isInitialLoadRef.current = true;
    }
  }, [routine?.id]);

  // Auto-save schedule changes to DB (debounced) so navigating away doesn't lose data
  // Only saves when at least one template is assigned — never persists an invalid (all rest) state
  useEffect(() => {
    // Skip the initial load (when localSchedule is set from routine.schedule)
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    if (!hasChanges) return;

    // Don't persist a schedule with 0 templates — that's an invalid state
    const hasTemplate = localSchedule.some((d) => d.templateId);
    if (!hasTemplate) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      await updateRoutine(routineId, { schedule: localSchedule });
    }, 500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [localSchedule, hasChanges, routineId]);

  if (!routine) {
    return (
      <div className={styles.container}>
        <p>Loading routine...</p>
      </div>
    );
  }

  const handleUpdateMeta = async (data: RoutineFormData) => {
    try {
      setEditError(null);
      await updateRoutine(routineId, data);
      setIsEditModalOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update routine');
    }
  };

  const handleDuplicate = async () => {
    const newId = await duplicateRoutine(routineId);
    navigate(`/routines/${newId}`);
  };

  const handleArchive = async () => {
    sessionStorage.removeItem('draftRoutineId');
    await archiveRoutine(routineId);
    navigate('/routines');
    showUndo('Routine archived', () => restoreRoutine(routineId));
  };

  const handleDelete = async () => {
    sessionStorage.removeItem('draftRoutineId');
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

  const isDraft = sessionStorage.getItem('draftRoutineId') === routineId;
  const hasAnyTemplate = localSchedule.some((d) => d.templateId);

  const handleBack = () => {
    // If no templates assigned, warn the user regardless of draft status
    if (!hasAnyTemplate) {
      setShowIncompleteWarning(true);
      return;
    }

    // Clear draft marker when leaving via back button
    sessionStorage.removeItem('draftRoutineId');
    // Flush any pending auto-save immediately
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      updateRoutine(routineId, { schedule: localSchedule });
    }
    navigate('/routines');
  };

  const handleConfirmIncomplete = async () => {
    // Cancel any pending auto-save (shouldn't exist for 0-template state, but be safe)
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (isDraft) {
      // Draft with no templates — delete it
      sessionStorage.removeItem('draftRoutineId');
      await deleteRoutine(routineId);
    }
    // Existing routine — DB still has the last valid state, just leave
    navigate('/routines');
  };

  // For fixed routines, sort days starting from weekStartDay
  const sortedSchedule = routine.type === 'fixed'
    ? getWeekOrder(weekStartDay).map((di) => localSchedule.find((d) => d.dayIndex === di)).filter((d): d is RoutineDay => d !== undefined)
    : [...localSchedule].sort((a, b) => a.dayIndex - b.dayIndex);
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
                <Button variant="ghost" onClick={handleArchive}>
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

      {/* Edit Details Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditError(null); }}
        title="Edit Routine"
      >
        <RoutineForm
          initialValues={{
            name: routine.name,
            type: routine.type,
          }}
          onSubmit={handleUpdateMeta}
          onCancel={() => { setIsEditModalOpen(false); setEditError(null); }}
          isEdit
          error={editError}
        />
      </Modal>

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

      {/* Incomplete Routine Warning */}
      <ConfirmDialog
        isOpen={showIncompleteWarning}
        onClose={() => setShowIncompleteWarning(false)}
        onConfirm={handleConfirmIncomplete}
        title="No Templates Assigned"
        message={
          isDraft
            ? `"${routine.name}" has no templates assigned. Going back will delete this routine. Are you sure?`
            : `"${routine.name}" has no templates assigned. Your changes will be reverted. Are you sure?`
        }
        confirmLabel={isDraft ? 'Delete Routine' : 'Revert & Leave'}
        variant="danger"
      />
    </div>
  );
}
