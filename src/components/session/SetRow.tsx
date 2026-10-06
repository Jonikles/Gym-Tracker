import { useState, useEffect, useRef } from 'react';
import { Input, Button } from '../common';
import { PRNotification } from './PRNotification';
import type { Set, IntensityTechnique, ExerciseField, PR, TechniqueData, MyoRepsTechniqueData, DropSetTechniqueData, ClusterTechniqueData, PartialsTechniqueData } from '../../types';
import { updateSet, deleteSet, type UpdateSetInput } from '../../hooks/useSets';
import { useUndo } from '../../context/UndoContext';
import { db } from '../../db';
import { useDebouncedSave } from './useDebouncedSave';
import styles from './SetRow.module.css';

interface SetRowProps {
  set: Set;
  setNumber: number;
  defaultFields: ExerciseField[];
  showValidation?: boolean;
  /** PRs achieved by this specific set, computed by the parent across all sibling sets */
  livePRs?: PR[];
  /** The matching set from the last session of this exercise (used for placeholders / fill) */
  previousSet?: Set;
}

// All set types including warmup — used by the type picker
const SET_TYPES: { value: string; label: string; short: string }[] = [
  { value: 'warmup', label: 'Warmup', short: 'W' },
  { value: 'standard', label: 'Standard', short: 'STD' },
  { value: 'failure', label: 'To Failure', short: 'F' },
  { value: 'dropset', label: 'Drop Set', short: 'DS' },
  { value: 'myoreps', label: 'Myo Reps', short: 'MR' },
  { value: 'forcedreps', label: 'Forced Reps', short: 'FR' },
  { value: 'partials', label: 'Partials', short: 'PT' },
  { value: 'cluster', label: 'Cluster', short: 'CL' },
];

function isMyoRepsData(data: TechniqueData | undefined): data is MyoRepsTechniqueData {
  return data !== undefined && 'activationReps' in data && 'miniSets' in data;
}

function isDropSetData(data: TechniqueData | undefined): data is DropSetTechniqueData {
  return data !== undefined && 'drops' in data;
}

function isClusterData(data: TechniqueData | undefined): data is ClusterTechniqueData {
  return data !== undefined && 'clusters' in data;
}

function isPartialsData(data: TechniqueData | undefined): data is PartialsTechniqueData {
  return data !== undefined && 'mainReps' in data && 'partialReps' in data;
}

// Regex filters for numeric input — strips anything that isn't a valid number
const filterDecimal = (v: string) => v.replace(/[^0-9.]/g, '').replace(/(\..*?)\./g, '$1');
const filterInteger = (v: string) => v.replace(/[^0-9]/g, '');

// Stable ids for dynamic sub-lists (mini-sets, drops, clusters)
let uidCounter = 0;
const uid = () => `i${++uidCounter}`;

type ListItem = { id: string; value: string };
type DropItem = { id: string; weight: string; reps: string };

const toStr = (n: number | undefined) => (n === undefined || n === null ? '' : String(n));

export function SetRow({ set, setNumber, defaultFields, showValidation, livePRs, previousSet }: SetRowProps) {
  const { showUndo } = useUndo();
  const [weight, setWeight] = useState(toStr(set.weight));
  const [reps, setReps] = useState(toStr(set.reps));
  const [time, setTime] = useState(toStr(set.time));
  const [distance, setDistance] = useState(toStr(set.distance));
  const [isWarmup, setIsWarmup] = useState(set.isWarmup);
  const [technique, setTechnique] = useState<IntensityTechnique>(set.intensityTechnique ?? 'standard');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const typePickerRef = useRef<HTMLDivElement>(null);

  // ── Technique-specific state (seeded from stored data, re-seeded on type change) ──
  const [myoActivationReps, setMyoActivationReps] = useState<string>(
    isMyoRepsData(set.techniqueData) ? set.techniqueData.activationReps.toString() : ''
  );
  const [myoMiniSets, setMyoMiniSets] = useState<ListItem[]>(() =>
    isMyoRepsData(set.techniqueData)
      ? set.techniqueData.miniSets.map((n) => ({ id: uid(), value: String(n) }))
      : []
  );
  const [drops, setDrops] = useState<DropItem[]>(() =>
    isDropSetData(set.techniqueData)
      ? set.techniqueData.drops.map((d) => ({ id: uid(), weight: d.weight.toString(), reps: d.reps.toString() }))
      : [{ id: uid(), weight: toStr(set.weight), reps: toStr(set.reps) }]
  );
  const [clusters, setClusters] = useState<ListItem[]>(() =>
    isClusterData(set.techniqueData)
      ? set.techniqueData.clusters.map((n) => ({ id: uid(), value: String(n) }))
      : [{ id: uid(), value: toStr(set.reps) }]
  );
  const [mainReps, setMainReps] = useState<string>(
    isPartialsData(set.techniqueData) ? set.techniqueData.mainReps.toString() : toStr(set.reps)
  );
  const [partialReps, setPartialReps] = useState<string>(
    isPartialsData(set.techniqueData) ? set.techniqueData.partialReps.toString() : ''
  );
  const [partialWeight, setPartialWeight] = useState<string>(
    isPartialsData(set.techniqueData) ? set.techniqueData.partialWeight.toString() : toStr(set.weight)
  );

  // ── Debounced persistence ──
  // Only user edits mark the row dirty, so mounting a row never rewrites the set.
  // Pending edits are flushed on unmount (collapse, navigation, delete…) and by Complete.
  const dirtyRef = useRef(false);
  const setId = set.id;
  const { schedule: scheduleSave, flush } = useDebouncedSave<UpdateSetInput>(
    `set:${setId}`,
    (payload) => updateSet(setId, payload)
  );

  const markDirty = () => { dirtyRef.current = true; };

  // Close type picker when clicking outside
  useEffect(() => {
    if (!showTypePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (typePickerRef.current && !typePickerRef.current.contains(e.target as Node)) {
        setShowTypePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTypePicker]);

  /** Primary reps as currently shown, accounting for the active technique UI */
  const getPrimaryReps = (): string => {
    if (technique === 'myoreps' && myoActivationReps) return myoActivationReps;
    if (technique === 'dropset' && drops[0]?.reps) return drops[0].reps;
    if (technique === 'cluster' && clusters[0]?.value) return clusters[0].value;
    if (technique === 'partials' && mainReps) return mainReps;
    return reps;
  };

  const handleTypeChange = async (typeValue: string) => {
    setShowTypePicker(false);
    const nextWarmup = typeValue === 'warmup';
    const nextTechnique: IntensityTechnique = nextWarmup ? 'standard' : (typeValue as IntensityTechnique);

    // Re-seed technique sub-state from the *current* weight/reps
    const currentReps = getPrimaryReps();
    const currentWeight = weight;
    setReps(currentReps);
    setMyoActivationReps(currentReps);
    setMyoMiniSets([]);
    setDrops([{ id: uid(), weight: currentWeight, reps: currentReps }]);
    setClusters([{ id: uid(), value: currentReps }]);
    setMainReps(currentReps);
    setPartialReps('');
    setPartialWeight(currentWeight);

    setIsWarmup(nextWarmup);
    setTechnique(nextTechnique);
    markDirty();
    await updateSet(setId, { isWarmup: nextWarmup, intensityTechnique: nextTechnique, techniqueData: undefined });
  };

  const currentTypeValue = isWarmup ? 'warmup' : technique;
  const currentTypeInfo = SET_TYPES.find((t) => t.value === currentTypeValue) ?? SET_TYPES[1];

  const buildTechniqueData = (): TechniqueData | undefined => {
    switch (technique) {
      case 'myoreps': {
        const activation = parseInt(myoActivationReps, 10);
        const miniSetReps = myoMiniSets.map((s) => parseInt(s.value, 10)).filter((n) => !isNaN(n));
        return isNaN(activation) ? undefined : { activationReps: activation, miniSets: miniSetReps };
      }
      case 'dropset': {
        const validDrops = drops
          .map((d) => ({ weight: parseFloat(d.weight), reps: parseInt(d.reps, 10) }))
          .filter((d) => !isNaN(d.weight) && !isNaN(d.reps));
        return validDrops.length > 0 ? { drops: validDrops } : undefined;
      }
      case 'cluster': {
        const clusterReps = clusters.map((c) => parseInt(c.value, 10)).filter((n) => !isNaN(n));
        return clusterReps.length > 0 ? { clusters: clusterReps } : undefined;
      }
      case 'partials': {
        const main = parseInt(mainReps, 10);
        const partial = parseInt(partialReps, 10);
        const pWeight = parseFloat(partialWeight) || parseFloat(weight) || 0;
        if (isNaN(main)) return undefined;
        return { mainReps: main, partialReps: isNaN(partial) ? 0 : partial, partialWeight: pWeight };
      }
      default:
        return undefined;
    }
  };

  // Schedule a save 500ms after the last user edit (never on mount).
  useEffect(() => {
    if (!dirtyRef.current) return;

    const primaryReps = getPrimaryReps();
    scheduleSave({
      weight: weight ? parseFloat(weight) : undefined,
      reps: primaryReps ? parseInt(primaryReps, 10) : undefined,
      time: time ? parseInt(time, 10) : undefined,
      distance: distance ? parseFloat(distance) : undefined,
      techniqueData: buildTechniqueData(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId, weight, reps, time, distance, isWarmup, technique, myoActivationReps, myoMiniSets, drops, clusters, mainReps, partialReps, partialWeight]);

  const handleDelete = async () => {
    await flush();
    const snapshot = await db.sets.get(setId);
    await deleteSet(setId);
    if (!snapshot) return;
    showUndo('Set deleted', async () => {
      // Only restore if the parent exercise still exists
      const parent = await db.sessionExercises.get(snapshot.sessionExerciseId);
      if (parent) await db.sets.put(snapshot);
    });
  };

  // Fill empty fields from the same set of the previous session
  const canFill =
    !!previousSet &&
    ((defaultFields.includes('weight') && !weight && previousSet.weight !== undefined) ||
      (defaultFields.includes('reps') && !reps && previousSet.reps !== undefined) ||
      (defaultFields.includes('time') && !time && previousSet.time !== undefined) ||
      (defaultFields.includes('distance') && !distance && previousSet.distance !== undefined));

  const fillFromPrevious = () => {
    if (!previousSet || !canFill) return;
    markDirty();
    if (!weight && previousSet.weight !== undefined) {
      const w = String(previousSet.weight);
      setWeight(w);
      if (technique === 'partials' && !partialWeight) setPartialWeight(w);
      if (technique === 'dropset' && !drops[0]?.weight) setDrops((d) => d.map((x, i) => (i === 0 ? { ...x, weight: w } : x)));
    }
    if (!reps && previousSet.reps !== undefined) {
      const r = String(previousSet.reps);
      setReps(r);
      if (technique === 'myoreps' && !myoActivationReps) setMyoActivationReps(r);
      if (technique === 'partials' && !mainReps) setMainReps(r);
      if (technique === 'dropset' && !drops[0]?.reps) setDrops((d) => d.map((x, i) => (i === 0 ? { ...x, reps: r } : x)));
      if (technique === 'cluster' && !clusters[0]?.value) setClusters((c) => c.map((x, i) => (i === 0 ? { ...x, value: r } : x)));
    }
    if (!time && previousSet.time !== undefined) setTime(String(previousSet.time));
    if (!distance && previousSet.distance !== undefined) setDistance(String(previousSet.distance));
  };

  // ── Edit handlers (all mark the row dirty) ──
  const changeWeight = (v: string) => { markDirty(); setWeight(filterDecimal(v)); };
  const changeReps = (v: string) => { markDirty(); setReps(filterInteger(v)); };
  const changeTime = (v: string) => { markDirty(); setTime(filterInteger(v)); };
  const changeDistance = (v: string) => { markDirty(); setDistance(filterDecimal(v)); };

  // Myo Reps
  const addMiniSet = () => { markDirty(); setMyoMiniSets((m) => [...m, { id: uid(), value: '' }]); };
  const updateMiniSet = (id: string, value: string) => {
    markDirty();
    setMyoMiniSets((m) => m.map((x) => (x.id === id ? { ...x, value } : x)));
  };
  const removeMiniSet = (id: string) => { markDirty(); setMyoMiniSets((m) => m.filter((x) => x.id !== id)); };

  // Drop Set
  const addDrop = () => {
    markDirty();
    const lastDrop = drops[drops.length - 1];
    const suggestedWeight = lastDrop?.weight ? (parseFloat(lastDrop.weight) * 0.8).toFixed(1) : '';
    setDrops([...drops, { id: uid(), weight: suggestedWeight, reps: '' }]);
  };
  const updateDrop = (index: number, field: 'weight' | 'reps', value: string) => {
    markDirty();
    setDrops((d) => d.map((x, i) => (i === index ? { ...x, [field]: value } : x)));
    // Sync first drop to main weight/reps
    if (index === 0) {
      if (field === 'weight') setWeight(value);
      if (field === 'reps') setReps(value);
    }
  };
  const removeDrop = (id: string) => {
    if (drops.length <= 1) return;
    markDirty();
    setDrops((d) => d.filter((x) => x.id !== id));
  };

  // Cluster
  const addCluster = () => { markDirty(); setClusters((c) => [...c, { id: uid(), value: '' }]); };
  const updateCluster = (index: number, value: string) => {
    markDirty();
    setClusters((c) => c.map((x, i) => (i === index ? { ...x, value } : x)));
    if (index === 0) setReps(value);
  };
  const removeCluster = (id: string) => {
    if (clusters.length <= 1) return;
    markDirty();
    setClusters((c) => c.filter((x) => x.id !== id));
  };

  const getInputClass = (isEmpty: boolean) =>
    showValidation && isEmpty ? `${styles.input} ${styles.invalid}` : styles.input;

  const getMiniInputClass = (isEmpty: boolean) =>
    showValidation && isEmpty ? `${styles.miniInput} ${styles.invalid}` : styles.miniInput;

  const prevPlaceholder = (n: number | undefined, fallback: string) =>
    n !== undefined && n !== null ? String(n) : fallback;

  /** Numeric field with a small unit label kept visible inside it */
  const renderField = (
    value: string,
    onChange: (v: string) => void,
    unit: string,
    placeholder: string,
    mode: 'decimal' | 'numeric',
    ariaLabel: string
  ) => (
    <div className={styles.field}>
      <Input
        type="text"
        inputMode={mode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={getInputClass(!value)}
      />
      <span className={styles.unit} aria-hidden="true">{unit}</span>
    </div>
  );

  const renderStandardInputs = () => (
    <div className={styles.fields}>
      {defaultFields.includes('weight') &&
        renderField(weight, changeWeight, 'kg', prevPlaceholder(previousSet?.weight, ''), 'decimal', 'Weight in kg')}
      {defaultFields.includes('reps') &&
        renderField(reps, changeReps, technique === 'forcedreps' ? 'total' : 'reps', prevPlaceholder(previousSet?.reps, ''), 'numeric', 'Reps')}
      {defaultFields.includes('time') &&
        renderField(time, changeTime, 's', prevPlaceholder(previousSet?.time, ''), 'numeric', 'Time in seconds')}
      {defaultFields.includes('distance') &&
        renderField(distance, changeDistance, 'm', prevPlaceholder(previousSet?.distance, ''), 'decimal', 'Distance in meters')}
    </div>
  );

  const renderMyoRepsUI = () => (
    <div className={styles.techniqueUI}>
      <div className={styles.techniqueInputRow}>
        {renderField(weight, changeWeight, 'kg', prevPlaceholder(previousSet?.weight, ''), 'decimal', 'Weight in kg')}
        <span className={styles.techniqueLabel}>Weight</span>
      </div>

      <div className={styles.techniqueInputRow}>
        <div className={styles.field}>
          <Input
            type="text"
            inputMode="numeric"
            value={myoActivationReps}
            onChange={(e) => { markDirty(); setMyoActivationReps(filterInteger(e.target.value)); }}
            placeholder={prevPlaceholder(previousSet?.reps, '')}
            aria-label="Activation reps"
            className={getInputClass(!myoActivationReps)}
          />
          <span className={styles.unit} aria-hidden="true">reps</span>
        </div>
        <span className={styles.techniqueLabel}>Activation</span>
      </div>

      {myoMiniSets.length > 0 && (
        <div className={styles.techniqueSubSection}>
          <span className={styles.techniqueSubLabel}>Mini-Sets:</span>
          {myoMiniSets.map((miniSet, index) => (
            <div key={miniSet.id} className={styles.miniSetRow}>
              <Input
                type="text"
                inputMode="numeric"
                value={miniSet.value}
                onChange={(e) => updateMiniSet(miniSet.id, filterInteger(e.target.value))}
                placeholder={`mini ${index + 1}`}
                className={styles.miniInput}
              />
              <button type="button" className={styles.iconBtn} onClick={() => removeMiniSet(miniSet.id)} aria-label="Remove mini-set">×</button>
            </div>
          ))}
        </div>
      )}

      <Button variant="secondary" size="sm" onClick={addMiniSet} className={styles.addButton}>
        + Add Mini-Set
      </Button>
    </div>
  );

  const renderDropSetUI = () => (
    <div className={styles.techniqueUI}>
      {drops.map((drop, index) => (
        <div key={drop.id} className={styles.dropRow}>
          <span className={styles.dropLabel}>Drop {index + 1}:</span>
          <Input
            type="text"
            inputMode="decimal"
            value={drop.weight}
            onChange={(e) => updateDrop(index, 'weight', filterDecimal(e.target.value))}
            placeholder="kg"
            className={getMiniInputClass(!drop.weight)}
          />
          <span className={styles.timesSign}>×</span>
          <Input
            type="text"
            inputMode="numeric"
            value={drop.reps}
            onChange={(e) => updateDrop(index, 'reps', filterInteger(e.target.value))}
            placeholder="reps"
            className={getMiniInputClass(!drop.reps)}
          />
          {drops.length > 1 && (
            <button type="button" className={styles.iconBtn} onClick={() => removeDrop(drop.id)} aria-label="Remove drop">×</button>
          )}
        </div>
      ))}

      <Button variant="secondary" size="sm" onClick={addDrop} className={styles.addButton}>
        + Add Drop
      </Button>
    </div>
  );

  const renderClusterUI = () => (
    <div className={styles.techniqueUI}>
      <div className={styles.techniqueInputRow}>
        {renderField(weight, changeWeight, 'kg', prevPlaceholder(previousSet?.weight, ''), 'decimal', 'Weight in kg')}
        <span className={styles.techniqueLabel}>Weight (all clusters)</span>
      </div>

      <div className={styles.clusterSection}>
        <span className={styles.techniqueSubLabel}>Clusters:</span>
        <div className={styles.clusterGrid}>
          {clusters.map((cluster, index) => (
            <div key={cluster.id} className={styles.clusterItem}>
              <Input
                type="text"
                inputMode="numeric"
                value={cluster.value}
                onChange={(e) => updateCluster(index, filterInteger(e.target.value))}
                placeholder={`#${index + 1}`}
                className={getMiniInputClass(!cluster.value)}
              />
              {clusters.length > 1 && (
                <button type="button" className={styles.iconBtn} onClick={() => removeCluster(cluster.id)} aria-label="Remove cluster">×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button variant="secondary" size="sm" onClick={addCluster} className={styles.addButton}>
        + Add Cluster
      </Button>
    </div>
  );

  const renderPartialsUI = () => (
    <div className={styles.techniqueUI}>
      <div className={styles.partialsSection}>
        <span className={styles.techniqueSubLabel}>Main Set:</span>
        <div className={styles.partialsRow}>
          <Input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(e) => changeWeight(e.target.value)}
            placeholder={prevPlaceholder(previousSet?.weight, 'kg')}
            className={getMiniInputClass(!weight)}
          />
          <span className={styles.timesSign}>×</span>
          <Input
            type="text"
            inputMode="numeric"
            value={mainReps}
            onChange={(e) => { markDirty(); setMainReps(filterInteger(e.target.value)); }}
            placeholder={prevPlaceholder(previousSet?.reps, 'reps')}
            className={getMiniInputClass(!mainReps)}
          />
        </div>
      </div>

      <div className={styles.partialsSection}>
        <span className={styles.techniqueSubLabel}>Partials:</span>
        <div className={styles.partialsRow}>
          <Input
            type="text"
            inputMode="decimal"
            value={partialWeight}
            onChange={(e) => { markDirty(); setPartialWeight(filterDecimal(e.target.value)); }}
            placeholder="kg"
            className={styles.miniInput}
          />
          <span className={styles.timesSign}>×</span>
          <Input
            type="text"
            inputMode="numeric"
            value={partialReps}
            onChange={(e) => { markDirty(); setPartialReps(filterInteger(e.target.value)); }}
            placeholder="partials"
            className={styles.miniInput}
          />
        </div>
      </div>
    </div>
  );

  const hasStandardInputs = ['standard', 'failure', 'forcedreps'].includes(technique);
  const hasAdvancedTechniqueUI = !hasStandardInputs;

  return (
    <div className={`${styles.row} ${isWarmup ? styles.warmup : ''} ${hasAdvancedTechniqueUI ? styles.expandedRow : ''} ${showTypePicker ? styles.pickerOpen : ''}`}>
      <div className={styles.mainRow}>
        <button
          type="button"
          className={`${styles.setNumber} ${canFill ? styles.setNumberFillable : ''}`}
          onClick={fillFromPrevious}
          disabled={!canFill}
          title={canFill ? 'Fill from last time' : undefined}
          aria-label={canFill ? `Set ${setNumber}: fill from last time` : `Set ${setNumber}`}
        >
          {isWarmup ? 'W' : setNumber}
        </button>

        <div className={styles.typePickerWrapper} ref={typePickerRef}>
          <button
            type="button"
            className={styles.typeSwapButton}
            onClick={() => setShowTypePicker(!showTypePicker)}
            title={`Set type: ${currentTypeInfo.label}`}
            aria-label={`Set type: ${currentTypeInfo.label}`}
          >
            <span className={styles.typeShort}>{currentTypeInfo.short}</span>
            <span className={styles.typeSwapIcon} aria-hidden="true">▾</span>
          </button>
          {showTypePicker && (
            <div className={styles.typePickerDropdown}>
              {SET_TYPES.map((type) => (
                <button
                  type="button"
                  key={type.value}
                  className={`${styles.typePickerOption} ${type.value === currentTypeValue ? styles.typePickerOptionActive : ''}`}
                  onClick={() => handleTypeChange(type.value)}
                >
                  <span className={styles.typePickerShort}>{type.short}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {hasStandardInputs ? renderStandardInputs() : <div className={styles.fields} />}

        <button
          type="button"
          className={styles.deleteBtn}
          onClick={handleDelete}
          title="Delete set"
          aria-label="Delete set"
        >
          ×
        </button>
      </div>

      {technique === 'myoreps' && renderMyoRepsUI()}
      {technique === 'dropset' && renderDropSetUI()}
      {technique === 'cluster' && renderClusterUI()}
      {technique === 'partials' && renderPartialsUI()}

      {livePRs && livePRs.length > 0 && <PRNotification prs={livePRs} />}
    </div>
  );
}
