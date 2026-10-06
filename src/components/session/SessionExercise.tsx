import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { Button, Card } from '../common';
import { SetRow } from './SetRow';
import { SetHistory } from './SetHistory';
import { OverloadHint } from './OverloadHint';
import { ProgressionLevelPicker } from './ProgressionLevelPicker';
import { VariantChips } from '../exercises/VariantChips';
import { familyTitleFor } from '../../utils/exerciseFamilies';
import { useDebouncedSave } from './useDebouncedSave';
import { useSets, createSet, quickFillFromPrevious, getPreviousSets } from '../../hooks/useSets';
import { useExercise } from '../../hooks/useExercises';
import { updateSessionExerciseNotes } from '../../hooks/useSessions';
import { PROGRESSION_MAP } from '../../data/progressions';
import { previewExercisePRs } from '../../utils/pr';
import { previewProgressionAdvancementsForSets } from '../../utils/progression';
import type { SessionExercise as SessionExerciseType, ExerciseField, TemplateExercise, Exercise, PR, Set as SetType } from '../../types';
import styles from './SessionExercise.module.css';

const DEFAULT_FIELDS: ExerciseField[] = ['weight', 'reps'];

interface SessionExerciseProps {
  sessionExercise: SessionExerciseType;
  templateExercise?: TemplateExercise;
  /** Called with this card's sessionExercise id (keeps the callback stable for memo) */
  onRemove: (sessionExerciseId: string) => void;
  onSwitchProgression?: (sessionExerciseId: string, newExerciseId: string) => Promise<string | undefined>;
  /** Swap to another variant of the same exercise family (keeps sets) */
  onSwitchVariant?: (sessionExerciseId: string, newExerciseId: string) => Promise<void>;
  /** Called with (sessionExerciseId, direction); omit to hide the move buttons */
  onMove?: (sessionExerciseId: string, direction: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showValidation?: boolean;
}

export const SessionExercise = memo(function SessionExercise({
  sessionExercise,
  templateExercise,
  onRemove,
  onSwitchProgression,
  onSwitchVariant,
  onMove,
  canMoveUp,
  canMoveDown,
  showValidation,
}: SessionExerciseProps) {
  const exercise = useExercise(sessionExercise.exerciseId);
  const sets = useSets(sessionExercise.id) ?? [];
  const [livePRsBySet, setLivePRsBySet] = useState<Map<string, PR[]>>(new Map());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [quickFillMessage, setQuickFillMessage] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(!!sessionExercise.notes);
  const [notes, setNotes] = useState(sessionExercise.notes ?? '');
  const [showLevelPicker, setShowLevelPicker] = useState(false);
  // Last session's sets — fetched once here and shared by SetHistory, OverloadHint and the rows
  const [previousSets, setPreviousSets] = useState<SetType[] | undefined>(undefined);

  const sessionExerciseId = sessionExercise.id;
  const exerciseId = sessionExercise.exerciseId;

  useEffect(() => {
    let cancelled = false;
    setPreviousSets(undefined);
    getPreviousSets(exerciseId).then((result) => {
      if (!cancelled) setPreviousSets(result);
    });
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  const isProgression = !!sessionExercise.progressionId;
  const progressionDef = isProgression ? PROGRESSION_MAP[sessionExercise.progressionId!] : null;
  const exerciseLevel = isProgression
    ? exercise?.progressionMemberships?.find(
        (pm) => pm.progressionId === sessionExercise.progressionId
      )?.level
    : undefined;

  // Notes: debounced save, flushed on blur / unmount / Complete
  const { schedule: scheduleNotesSave, flush: flushNotes } = useDebouncedSave<string>(
    `seNotes:${sessionExerciseId}`,
    (value) => updateSessionExerciseNotes(sessionExerciseId, value)
  );

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    scheduleNotesSave(value);
  }, [scheduleNotesSave]);

  const exerciseFields = exercise?.defaultFields;
  const defaultFields = useMemo(() => exerciseFields ?? DEFAULT_FIELDS, [exerciseFields]);

  // Live PR preview across all sets of this exercise in the active session — a record
  // is per exercise, not per set, so only the single best set gets flagged.
  const setsDepKey = sets
    .map((s: SetType) => `${s.id}:${s.weight}:${s.reps}:${s.time}:${s.distance}:${s.isWarmup}:${s.intensityTechnique}`)
    .join('|');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [prMap, progressionMap] = await Promise.all([
        previewExercisePRs(sets, exerciseId),
        previewProgressionAdvancementsForSets(sets, exerciseId),
      ]);

      if (cancelled) return;

      const merged = new Map<string, PR[]>(prMap);
      for (const [setId, prs] of progressionMap) {
        merged.set(setId, [...(merged.get(setId) ?? []), ...prs]);
      }
      setLivePRsBySet(merged);
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId, setsDepKey]);

  const handleAddSet = useCallback(async () => {
    // User-added sets are always blank — template only defines initial sets
    await createSet({
      sessionExerciseId,
      isWarmup: false,
      intensityTechnique: 'standard',
    });
  }, [sessionExerciseId]);

  const handleQuickFill = useCallback(async () => {
    const filled = await quickFillFromPrevious(sessionExerciseId, exerciseId);
    if (!filled) {
      setQuickFillMessage('No previous data found');
      setTimeout(() => setQuickFillMessage(null), 3000);
    }
  }, [sessionExerciseId, exerciseId]);

  const handleSwitchLevel = useCallback(async (newExercise: Exercise) => {
    if (onSwitchProgression) {
      await onSwitchProgression(sessionExerciseId, newExercise.id);
    }
  }, [onSwitchProgression, sessionExerciseId]);

  const handleSwitchVariant = useCallback(async (newExercise: Exercise) => {
    if (onSwitchVariant) await onSwitchVariant(sessionExerciseId, newExercise.id);
  }, [onSwitchVariant, sessionExerciseId]);

  // Previous session's working / warmup sets, for per-row placeholders and "fill from last time"
  const previousWorking = useMemo(() => (previousSets ?? []).filter((s) => !s.isWarmup), [previousSets]);
  const previousWarmup = useMemo(() => (previousSets ?? []).filter((s) => s.isWarmup), [previousSets]);

  if (!exercise) {
    return (
      <Card className={styles.card}>
        <span className={styles.missing}>Exercise not found</span>
      </Card>
    );
  }

  let workingSetNumber = 0;
  let warmupIndex = 0;

  // Show targets if from template
  const getTargetInfo = () => {
    if (!templateExercise) return null;
    const setCount = templateExercise.sets.length;
    const targetReps = templateExercise.targetReps;
    const firstWorkingSet = templateExercise.sets.find((s) => !s.isWarmup);
    const technique = firstWorkingSet?.intensityTechnique;
    let info = `${setCount}×${targetReps}`;
    if (templateExercise.weight) info += ` @ ${templateExercise.weight}kg`;
    if (technique && technique !== 'standard') info += ` (${technique})`;
    return info;
  };
  const targetInfo = getTargetInfo();

  return (
    <div className={`${styles.container} ${sessionExercise.groupId ? styles.grouped : ''}`}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.titleRow}
          onClick={() => setIsCollapsed((c) => !c)}
          aria-expanded={!isCollapsed}
        >
          <span className={styles.chevron} aria-hidden="true">{isCollapsed ? '▸' : '▾'}</span>
          <span className={styles.titleGroup}>
            {isProgression && progressionDef && (
              <span className={`chip chip-accent ${styles.progressionLabel}`}>{progressionDef.name}</span>
            )}
            <span className={styles.name}>
              {isProgression ? exercise.name : familyTitleFor(exercise)}
              {isProgression && exerciseLevel !== undefined && (
                <span className={styles.levelBadge}>Lvl {exerciseLevel}</span>
              )}
            </span>
          </span>
        </button>
        <div className={styles.headerActions}>
          {onMove && (
            <>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => onMove(sessionExerciseId, -1)}
                disabled={!canMoveUp}
                title="Move up"
                aria-label="Move exercise up"
              >
                ▲
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => onMove(sessionExerciseId, 1)}
                disabled={!canMoveDown}
                title="Move down"
                aria-label="Move exercise down"
              >
                ▼
              </button>
            </>
          )}
          <button
            type="button"
            className={`${styles.iconBtn} ${notes ? styles.noteButtonActive : ''}`}
            onClick={() => setShowNotes(!showNotes)}
            title={showNotes ? 'Hide notes' : 'Add notes'}
            aria-label={showNotes ? 'Hide notes' : 'Add notes'}
          >
            {showNotes ? '📝' : '📋'}
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.removeBtn}`}
            onClick={() => onRemove(sessionExerciseId)}
            title="Remove exercise"
            aria-label="Remove exercise"
          >
            ×
          </button>
        </div>
      </div>

      {!isProgression && onSwitchVariant && (
        <VariantChips exercise={exercise} onChange={handleSwitchVariant} />
      )}

      {(targetInfo || isProgression) && (
        <div className={styles.subHeader}>
          {targetInfo && <span className={`chip ${styles.target}`}>Target: {targetInfo}</span>}
          {isProgression && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLevelPicker(true)}
              title="Switch progression level"
              className={styles.switchBtn}
            >
              Switch level
            </Button>
          )}
        </div>
      )}

      {showNotes && (
        <textarea
          className={styles.notes}
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          onBlur={() => { void flushNotes(); }}
          placeholder="Exercise notes..."
          rows={2}
        />
      )}

      {/* Collapsing only hides the content, so rows keep their state and nothing re-queries */}
      <div className={isCollapsed ? styles.collapsed : styles.body}>
        <OverloadHint
          previousSets={previousSets}
          templateExercise={templateExercise}
          defaultFields={defaultFields}
        />

        <SetHistory previousSets={previousSets} />

        <div className={styles.sets}>
          {sets.map((set) => {
            let previousSet: SetType | undefined;
            if (set.isWarmup) {
              previousSet = previousWarmup[warmupIndex++];
            } else {
              previousSet = previousWorking[workingSetNumber];
              workingSetNumber++;
            }
            return (
              <SetRow
                key={set.id}
                set={set}
                setNumber={workingSetNumber}
                defaultFields={defaultFields}
                showValidation={showValidation}
                livePRs={livePRsBySet.get(set.id)}
                previousSet={previousSet}
              />
            );
          })}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleAddSet} className={`${styles.actionBtn} ${styles.addSetBtn}`}>
            + Add Set
          </Button>
          {sets.length === 0 && (
            <Button variant="ghost" onClick={handleQuickFill} className={styles.actionBtn}>
              Quick Fill
            </Button>
          )}
          {quickFillMessage && (
            <span className={styles.quickFillMessage}>{quickFillMessage}</span>
          )}
        </div>
      </div>

      {isProgression && sessionExercise.progressionId && showLevelPicker && (
        <ProgressionLevelPicker
          isOpen
          onClose={() => setShowLevelPicker(false)}
          progressionId={sessionExercise.progressionId}
          currentExerciseId={exerciseId}
          onSelect={handleSwitchLevel}
        />
      )}
    </div>
  );
});
