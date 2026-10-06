import { useState } from 'react';
import { MoreMenu, MoreMenuItem } from '../history/MoreMenu';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Modal, ConfirmDialog, Select, SkeletonList } from '../common';
import { useUnsavedChangesBlocker } from '../common/useUnsavedChangesBlocker';
import { RoutineForm, type RoutineFormData } from './RoutineForm';
import { RoutineCalendar } from './RoutineCalendar';
import { db } from '../../db';
import {
  updateRoutine,
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
    <div className={`${styles.scheduleRow} ${day.templateId ? styles.workoutRow : styles.restRow}`}>
      <div className={styles.dayHead}>
        <div className={styles.dayLabel}>
          {isFixed ? DAY_NAMES[day.dayIndex] : `Day ${day.dayIndex + 1}`}
          {day.label && <span className={styles.daySubLabel}>({day.label})</span>}
        </div>
        {currentTemplate ? (
          <span className={`num ${styles.templatePreview}`}>
            {currentTemplate.exercises.length} ex ·{' '}
            {currentTemplate.exercises.reduce((sum, e) => sum + e.sets.length, 0)} sets
          </span>
        ) : (
          <span className={styles.restTag}>Rest</span>
        )}
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
          <Button variant="ghost" size="sm" onClick={onRemove} className={styles.removeDayBtn} aria-label="Remove day">
            ×
          </Button>
        )}
      </div>
    </div>
  );
}

export function RoutineDetail({ routineId }: RoutineDetailProps) {
  const navigate = useNavigate();
  // undefined = loading, null = not found
  const routine = useLiveQuery(
    () => db.routines.get(routineId).then((r) => r ?? null),
    [routineId]
  );
  const templates = useTemplates() ?? [];
  const activeRoutineId = useSetting('activeRoutineId');
  const weekStartDay = useSetting('weekStartDay') as number;
  const isActive = activeRoutineId === routineId;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSetActiveConfirm, setShowSetActiveConfirm] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'calendar'>('schedule');
  const [actionError, setActionError] = useState<string | null>(null);

  // Local schedule state for editing
  const [localSchedule, setLocalSchedule] = useState<RoutineDay[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local schedule when a (different) routine loads — adjusted during
  // render instead of in an effect
  const [syncedRoutineId, setSyncedRoutineId] = useState<string | undefined>(undefined);
  if (routine?.id !== syncedRoutineId) {
    setSyncedRoutineId(routine?.id);
    if (routine) {
      setLocalSchedule(routine.schedule);
      setHasChanges(false);
    }
  }

  // Block navigation when there are unsaved changes
  const { allowNextNavigation, dialog: unsavedChangesDialog } = useUnsavedChangesBlocker(
    hasChanges,
    {
      message: 'You have unsaved schedule changes. Leave without saving?',
      onDiscard: () => setHasChanges(false),
    }
  );

  if (routine === undefined) {
    return (
      <div className={styles.container}>
        <SkeletonList count={4} lines={2} />
      </div>
    );
  }

  if (routine === null) {
    return (
      <div className={styles.container}>
        <p className={styles.notFound}>Routine not found. It may have been deleted.</p>
        <Button variant="secondary" onClick={() => navigate('/routines')}>
          Back to Routines
        </Button>
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
    setActionError(null);
    try {
      const newId = await duplicateRoutine(routineId);
      navigate(`/routines/${newId}`);
    } catch (err) {
      console.error('Duplicate routine failed:', err);
      setActionError(err instanceof Error ? err.message : 'Could not duplicate routine');
    }
  };

  // Throws are caught and shown by ConfirmDialog
  const handleDelete = async () => {
    await deleteRoutine(routineId);
    sessionStorage.removeItem('draftRoutineId');
    // Routine is gone — unsaved schedule edits are moot, skip the blocker
    allowNextNavigation();
    navigate('/routines');
  };

  const handleSetAsActive = async () => {
    await updateSetting('activeRoutineId', routineId);
    // Auto-skip should never backfill days from before this routine became active
    await updateSetting('activeRoutineSetAt', Date.now());
    await updateSetting('lastAutoSkipCheckAt', null);
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

  const handleSaveSchedule = async () => {
    await updateRoutine(routineId, { schedule: localSchedule });
    setHasChanges(false);
  };

  const handleBack = () => {
    if (!hasAnyTemplate) {
      setShowIncompleteWarning(true);
      return;
    }
    sessionStorage.removeItem('draftRoutineId');
    navigate('/routines');
  };

  const handleConfirmIncomplete = async () => {
    if (isDraft) {
      await deleteRoutine(routineId);
      sessionStorage.removeItem('draftRoutineId');
    }
    setHasChanges(false);
    // hasChanges is still true in this render — bypass the blocker explicitly
    allowNextNavigation();
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
        <div className={styles.headerTop}>
          <Button variant="ghost" onClick={handleBack} className={styles.backBtn}>
            ← Back
          </Button>
          <div className={styles.headerActions}>
            {hasChanges && (
              <Button size="sm" onClick={handleSaveSchedule} className={styles.headerBtn}>
                Save
              </Button>
            )}
            {!isActive && (
              <Button
                size="sm"
                variant={hasChanges ? 'secondary' : 'primary'}
                onClick={() => setShowSetActiveConfirm(true)}
                className={styles.headerBtn}
              >
                Set as Active
              </Button>
            )}
            <MoreMenu>
              {(close) => (
                <>
                  <MoreMenuItem onClick={() => { setIsEditModalOpen(true); close(); }}>
                    Edit
                  </MoreMenuItem>
                  <MoreMenuItem onClick={() => { handleDuplicate(); close(); }}>
                    Duplicate
                  </MoreMenuItem>
                  <MoreMenuItem danger onClick={() => { setShowDeleteConfirm(true); close(); }}>
                    Delete
                  </MoreMenuItem>
                </>
              )}
            </MoreMenu>
          </div>
        </div>
        <div className={styles.titleBlock}>
          <span className="eyebrow">
            {routine.type === 'fixed' ? 'Weekly routine' : 'Rolling routine'}
          </span>
          <div className={styles.titleRow}>
            <h1 className={`page-title ${styles.title}`}>{routine.name}</h1>
            {isActive && <span className="chip chip-accent">Active</span>}
          </div>
          <div className={styles.meta}>
            <span className={`num ${styles.metaValue}`}>{activeDays.length}</span> workouts
            {localSchedule.length - activeDays.length > 0 && (
              <>
                {' · '}
                <span className={`num ${styles.metaValue}`}>{localSchedule.length - activeDays.length}</span> rest
              </>
            )}
          </div>
        </div>
      </header>

      {actionError && (
        <p className={styles.actionError} role="alert">
          {actionError}
        </p>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'schedule'}
          className={`${styles.tab} ${activeTab === 'schedule' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          Schedule
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'calendar'}
          className={`${styles.tab} ${activeTab === 'calendar' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar
        </button>
      </div>

      {activeTab === 'schedule' && (
        <section className={styles.scheduleSection}>
          {routine.type === 'rolling' && (
            <div className={styles.scheduleHeader}>
              <h2 className="section-title">Rotation</h2>
              <Button size="sm" variant="secondary" onClick={handleAddDay}>
                + Add Day
              </Button>
            </div>
          )}
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

      {/* Navigation blocker when unsaved changes */}
      {unsavedChangesDialog}
    </div>
  );
}
