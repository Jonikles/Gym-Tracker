import { useState, useEffect, useRef, useCallback } from 'react';
import { Input, Button } from '../common';
import { PRNotification } from './PRNotification';
import type { Set, IntensityTechnique, ExerciseField, PR, TechniqueData, MyoRepsTechniqueData, DropSetTechniqueData, ClusterTechniqueData, PartialsTechniqueData } from '../../types';
import { updateSet, deleteSet } from '../../hooks/useSets';
import { detectPRsPreview } from '../../utils/pr';
import { detectProgressionAdvancementsPreview } from '../../utils/progression';
import styles from './SetRow.module.css';

interface SetRowProps {
  set: Set;
  setNumber: number;
  defaultFields: ExerciseField[];
  exerciseId: string;
  onDelete: () => void;
  showValidation?: boolean;
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

// Helper to check if technique data is MyoReps
function isMyoRepsData(data: TechniqueData | undefined): data is MyoRepsTechniqueData {
  return data !== undefined && 'activationReps' in data && 'miniSets' in data;
}

// Helper to check if technique data is DropSet
function isDropSetData(data: TechniqueData | undefined): data is DropSetTechniqueData {
  return data !== undefined && 'drops' in data;
}

// Helper to check if technique data is Cluster
function isClusterData(data: TechniqueData | undefined): data is ClusterTechniqueData {
  return data !== undefined && 'clusters' in data;
}

// Helper to check if technique data is Partials
function isPartialsData(data: TechniqueData | undefined): data is PartialsTechniqueData {
  return data !== undefined && 'mainReps' in data && 'partialReps' in data;
}

// Regex filters for numeric input — strips anything that isn't a valid number
const filterDecimal = (v: string) => v.replace(/[^0-9.]/g, '').replace(/(\..*?)\./g, '$1');
const filterInteger = (v: string) => v.replace(/[^0-9]/g, '');

export function SetRow({ set, setNumber, defaultFields, exerciseId, onDelete, showValidation }: SetRowProps) {
  const [weight, setWeight] = useState(set.weight?.toString() ?? '');
  const [reps, setReps] = useState(set.reps?.toString() ?? '');
  const [time, setTime] = useState(set.time?.toString() ?? '');
  const [distance, setDistance] = useState(set.distance?.toString() ?? '');
  // Warmup and technique are now editable via the type picker
  const [isWarmup, setIsWarmup] = useState(set.isWarmup);
  const [technique, setTechnique] = useState<IntensityTechnique>(set.intensityTechnique ?? 'standard');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const typePickerRef = useRef<HTMLDivElement>(null);
  const [detectedPRs, setDetectedPRs] = useState<PR[]>([]);

  // Technique-specific state
  // Myo Reps
  const [myoActivationReps, setMyoActivationReps] = useState<string>(
    isMyoRepsData(set.techniqueData) ? set.techniqueData.activationReps.toString() : ''
  );
  const [myoMiniSets, setMyoMiniSets] = useState<string[]>(
    isMyoRepsData(set.techniqueData) ? set.techniqueData.miniSets.map(String) : []
  );

  // Drop Set
  const [drops, setDrops] = useState<Array<{ weight: string; reps: string }>>(
    isDropSetData(set.techniqueData)
      ? set.techniqueData.drops.map(d => ({ weight: d.weight.toString(), reps: d.reps.toString() }))
      : [{ weight: weight, reps: reps }]
  );

  // Cluster
  const [clusters, setClusters] = useState<string[]>(
    isClusterData(set.techniqueData)
      ? set.techniqueData.clusters.map(String)
      : [reps]
  );

  // Partials
  const [mainReps, setMainReps] = useState<string>(
    isPartialsData(set.techniqueData) ? set.techniqueData.mainReps.toString() : reps
  );
  const [partialReps, setPartialReps] = useState<string>(
    isPartialsData(set.techniqueData) ? set.techniqueData.partialReps.toString() : ''
  );
  const [partialWeight, setPartialWeight] = useState<string>(
    isPartialsData(set.techniqueData) ? set.techniqueData.partialWeight.toString() : weight
  );

  // Track if we've already checked for PRs with current values
  const lastCheckedRef = useRef<string>('');

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

  // Handle type change from the picker
  const handleTypeChange = useCallback(async (typeValue: string) => {
    setShowTypePicker(false);

    if (typeValue === 'warmup') {
      setIsWarmup(true);
      setTechnique('standard');
      await updateSet(set.id, { isWarmup: true, intensityTechnique: 'standard', techniqueData: undefined });
    } else {
      const newTechnique = typeValue as IntensityTechnique;
      setIsWarmup(false);
      setTechnique(newTechnique);
      await updateSet(set.id, { isWarmup: false, intensityTechnique: newTechnique, techniqueData: undefined });
    }
  }, [set.id]);

  // Get the current type value for display
  const currentTypeValue = isWarmup ? 'warmup' : technique;
  const currentTypeInfo = SET_TYPES.find(t => t.value === currentTypeValue) ?? SET_TYPES[1];

  // Build techniqueData based on current technique
  const buildTechniqueData = (): TechniqueData | undefined => {
    switch (technique) {
      case 'myoreps': {
        const activation = parseInt(myoActivationReps, 10);
        const miniSetReps = myoMiniSets.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
        if (!isNaN(activation)) {
          return { activationReps: activation, miniSets: miniSetReps };
        }
        return undefined;
      }
      case 'dropset': {
        const validDrops = drops
          .map(d => ({ weight: parseFloat(d.weight), reps: parseInt(d.reps, 10) }))
          .filter(d => !isNaN(d.weight) && !isNaN(d.reps));
        if (validDrops.length > 0) {
          return { drops: validDrops };
        }
        return undefined;
      }
      case 'cluster': {
        const clusterReps = clusters.map(c => parseInt(c, 10)).filter(n => !isNaN(n));
        if (clusterReps.length > 0) {
          return { clusters: clusterReps };
        }
        return undefined;
      }
      case 'partials': {
        const main = parseInt(mainReps, 10);
        const partial = parseInt(partialReps, 10);
        const pWeight = parseFloat(partialWeight) || parseFloat(weight) || 0;
        if (!isNaN(main)) {
          return {
            mainReps: main,
            partialReps: isNaN(partial) ? 0 : partial,
            partialWeight: pWeight
          };
        }
        return undefined;
      }
      default:
        return undefined;
    }
  };

  // Debounced save and PR detection
  useEffect(() => {
    let cancelled = false;

    const timeout = setTimeout(async () => {
      const parsedWeight = weight ? parseFloat(weight) : undefined;
      let parsedReps = reps ? parseInt(reps, 10) : undefined;

      // For techniques, use primary reps from technique data
      if (technique === 'myoreps' && myoActivationReps) {
        parsedReps = parseInt(myoActivationReps, 10);
      } else if (technique === 'dropset' && drops[0]?.reps) {
        parsedReps = parseInt(drops[0].reps, 10);
      } else if (technique === 'cluster' && clusters[0]) {
        parsedReps = parseInt(clusters[0], 10);
      } else if (technique === 'partials' && mainReps) {
        parsedReps = parseInt(mainReps, 10);
      }

      const parsedTime = time ? parseInt(time, 10) : undefined;
      const parsedDistance = distance ? parseFloat(distance) : undefined;
      const techniqueData = buildTechniqueData();

      await updateSet(set.id, {
        weight: parsedWeight,
        reps: parsedReps,
        time: parsedTime,
        distance: parsedDistance,
        techniqueData,
      });

      // Bail if a newer debounce has started (values changed while saving)
      if (cancelled) return;

      // Check for PRs only if not warmup and values have changed
      // Only for standard/failure/forcedreps (e1RM calculation)
      // NOTE: PRs are only previewed here — actual saves happen on session completion
      const checkKey = `${parsedWeight}-${parsedReps}-${isWarmup}-${technique}`;
      const canCalculatePR = ['standard', 'failure', 'forcedreps'].includes(technique);
      const allPRs: PR[] = [];

      if (!isWarmup && parsedWeight && parsedReps && canCalculatePR && checkKey !== lastCheckedRef.current) {
        lastCheckedRef.current = checkKey;

        // Use the exact values that were just saved to DB for PR detection
        const tempSet: Set = {
          ...set,
          weight: parsedWeight,
          reps: parsedReps,
          isWarmup,
          intensityTechnique: technique,
          techniqueData,
        };

        const prs = await detectPRsPreview(tempSet, exerciseId);
        if (!cancelled) allPRs.push(...prs);
      }

      // Check for progression level-ups (any non-warmup set counts)
      if (!isWarmup && (parsedWeight || parsedReps || parsedTime || parsedDistance)) {
        const progressionPRs = await detectProgressionAdvancementsPreview(exerciseId, set.id);
        if (!cancelled) allPRs.push(...progressionPRs);
      }

      if (!cancelled && allPRs.length > 0) {
        setDetectedPRs(allPRs);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  // Note: `set` object excluded from deps — Dexie's useLiveQuery returns new references
  // on every render which would cause infinite re-render loops. Individual fields are tracked instead.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set.id, weight, reps, time, distance, isWarmup, technique, exerciseId, myoActivationReps, myoMiniSets, drops, clusters, mainReps, partialReps, partialWeight]);

  const handleDelete = async () => {
    await deleteSet(set.id);
    onDelete();
  };


  // Myo Reps handlers
  const addMiniSet = () => {
    setMyoMiniSets([...myoMiniSets, '']);
  };

  const updateMiniSet = (index: number, value: string) => {
    const updated = [...myoMiniSets];
    updated[index] = value;
    setMyoMiniSets(updated);
  };

  const removeMiniSet = (index: number) => {
    setMyoMiniSets(myoMiniSets.filter((_, i) => i !== index));
  };

  // Drop Set handlers
  const addDrop = () => {
    const lastDrop = drops[drops.length - 1];
    // Suggest reduced weight
    const suggestedWeight = lastDrop?.weight ? (parseFloat(lastDrop.weight) * 0.8).toFixed(1) : '';
    setDrops([...drops, { weight: suggestedWeight, reps: '' }]);
  };

  const updateDrop = (index: number, field: 'weight' | 'reps', value: string) => {
    const updated = [...drops];
    updated[index] = { ...updated[index], [field]: value };
    setDrops(updated);
    // Sync first drop to main weight/reps
    if (index === 0) {
      if (field === 'weight') setWeight(value);
      if (field === 'reps') setReps(value);
    }
  };

  const removeDrop = (index: number) => {
    if (drops.length > 1) {
      setDrops(drops.filter((_, i) => i !== index));
    }
  };

  // Cluster handlers
  const addCluster = () => {
    setClusters([...clusters, '']);
  };

  const updateCluster = (index: number, value: string) => {
    const updated = [...clusters];
    updated[index] = value;
    setClusters(updated);
    // Sync first cluster to main reps
    if (index === 0) setReps(value);
  };

  const removeCluster = (index: number) => {
    if (clusters.length > 1) {
      setClusters(clusters.filter((_, i) => i !== index));
    }
  };

  // Helper to get input class with validation
  const getInputClass = (isEmpty: boolean) => {
    if (showValidation && isEmpty) {
      return `${styles.input} ${styles.invalid}`;
    }
    return styles.input;
  };

  // Render standard inputs (weight + reps)
  const renderStandardInputs = () => (
    <div className={styles.fields}>
      {defaultFields.includes('weight') && (
        <Input
          type="text"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(filterDecimal(e.target.value))}
          placeholder="kg"
          className={getInputClass(!weight)}
        />
      )}

      {defaultFields.includes('reps') && (
        <Input
          type="text"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(filterInteger(e.target.value))}
          placeholder={technique === 'forcedreps' ? 'total reps' : 'reps'}
          className={getInputClass(!reps)}
        />
      )}

      {defaultFields.includes('time') && (
        <Input
          type="text"
          inputMode="numeric"
          value={time}
          onChange={(e) => setTime(filterInteger(e.target.value))}
          placeholder="time (s)"
          className={getInputClass(!time)}
        />
      )}

      {defaultFields.includes('distance') && (
        <Input
          type="text"
          inputMode="decimal"
          value={distance}
          onChange={(e) => setDistance(filterDecimal(e.target.value))}
          placeholder="dist"
          className={getInputClass(!distance)}
        />
      )}
    </div>
  );

  // Render Myo Reps UI
  const renderMyoRepsUI = () => (
    <div className={styles.techniqueUI}>
      <div className={styles.techniqueInputRow}>
        <Input
          type="text"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(filterDecimal(e.target.value))}
          placeholder="kg"
          className={getInputClass(!weight)}
        />
        <span className={styles.techniqueLabel}>Weight</span>
      </div>

      <div className={styles.techniqueInputRow}>
        <Input
          type="text"
          inputMode="numeric"
          value={myoActivationReps}
          onChange={(e) => setMyoActivationReps(filterInteger(e.target.value))}
          placeholder="activation"
          className={getInputClass(!myoActivationReps)}
        />
        <span className={styles.techniqueLabel}>Activation Reps</span>
      </div>

      {myoMiniSets.length > 0 && (
        <div className={styles.techniqueSubSection}>
          <span className={styles.techniqueSubLabel}>Mini-Sets:</span>
          {myoMiniSets.map((miniSet, index) => (
            <div key={index} className={styles.miniSetRow}>
              <Input
                type="text"
                inputMode="numeric"
                value={miniSet}
                onChange={(e) => updateMiniSet(index, filterInteger(e.target.value))}
                placeholder={`mini ${index + 1}`}
                className={styles.miniInput}
              />
              <Button variant="ghost" size="sm" onClick={() => removeMiniSet(index)}>×</Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="secondary" size="sm" onClick={addMiniSet} className={styles.addButton}>
        + Add Mini-Set
      </Button>
    </div>
  );

  // Helper to get mini input class with validation
  const getMiniInputClass = (isEmpty: boolean) => {
    if (showValidation && isEmpty) {
      return `${styles.miniInput} ${styles.invalid}`;
    }
    return styles.miniInput;
  };

  // Render Drop Set UI
  const renderDropSetUI = () => (
    <div className={styles.techniqueUI}>
      {drops.map((drop, index) => (
        <div key={index} className={styles.dropRow}>
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
            <Button variant="ghost" size="sm" onClick={() => removeDrop(index)}>×</Button>
          )}
        </div>
      ))}

      <Button variant="secondary" size="sm" onClick={addDrop} className={styles.addButton}>
        + Add Drop
      </Button>
    </div>
  );

  // Render Cluster Set UI
  const renderClusterUI = () => (
    <div className={styles.techniqueUI}>
      <div className={styles.techniqueInputRow}>
        <Input
          type="text"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(filterDecimal(e.target.value))}
          placeholder="kg"
          className={getInputClass(!weight)}
        />
        <span className={styles.techniqueLabel}>Weight (all clusters)</span>
      </div>

      <div className={styles.clusterSection}>
        <span className={styles.techniqueSubLabel}>Clusters:</span>
        <div className={styles.clusterGrid}>
          {clusters.map((cluster, index) => (
            <div key={index} className={styles.clusterItem}>
              <Input
                type="text"
                inputMode="numeric"
                value={cluster}
                onChange={(e) => updateCluster(index, filterInteger(e.target.value))}
                placeholder={`#${index + 1}`}
                className={getMiniInputClass(!cluster)}
              />
              {clusters.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeCluster(index)}>×</Button>
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

  // Render Partials UI
  const renderPartialsUI = () => (
    <div className={styles.techniqueUI}>
      <div className={styles.partialsSection}>
        <span className={styles.techniqueSubLabel}>Main Set:</span>
        <div className={styles.partialsRow}>
          <Input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(filterDecimal(e.target.value))}
            placeholder="kg"
            className={getMiniInputClass(!weight)}
          />
          <span className={styles.timesSign}>×</span>
          <Input
            type="text"
            inputMode="numeric"
            value={mainReps}
            onChange={(e) => setMainReps(filterInteger(e.target.value))}
            placeholder="reps"
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
            onChange={(e) => setPartialWeight(filterDecimal(e.target.value))}
            placeholder="kg"
            className={styles.miniInput}
          />
          <span className={styles.timesSign}>×</span>
          <Input
            type="text"
            inputMode="numeric"
            value={partialReps}
            onChange={(e) => setPartialReps(filterInteger(e.target.value))}
            placeholder="partials"
            className={styles.miniInput}
          />
        </div>
      </div>
    </div>
  );

  // Determine which inputs to render based on technique
  const renderInputs = () => {
    if (['standard', 'failure', 'forcedreps'].includes(technique)) {
      return renderStandardInputs();
    }
    return null; // Technique-specific UI will be rendered below
  };

  const hasAdvancedTechniqueUI = ['myoreps', 'dropset', 'cluster', 'partials'].includes(technique);

  return (
    <div className={`${styles.row} ${isWarmup ? styles.warmup : ''} ${hasAdvancedTechniqueUI ? styles.expandedRow : ''} ${showTypePicker ? styles.pickerOpen : ''}`}>
      <div className={styles.mainRow}>
        <div className={styles.setNumber}>
          {isWarmup ? 'W' : setNumber}
        </div>

        {renderInputs()}

        <div className={styles.actions}>
          <div className={styles.typePickerWrapper} ref={typePickerRef}>
            <button
              className={styles.typeSwapButton}
              onClick={() => setShowTypePicker(!showTypePicker)}
              title={`Set type: ${currentTypeInfo.label}`}
            >
              <span className={styles.typeSwapIcon}>⇄</span>
              <span className={styles.typeShort}>{currentTypeInfo.short}</span>
            </button>
            {showTypePicker && (
              <div className={styles.typePickerDropdown}>
                {SET_TYPES.map((type) => (
                  <button
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
          <Button variant="ghost" size="sm" onClick={handleDelete} title="Delete set">
            ×
          </Button>
        </div>
      </div>

      {technique === 'myoreps' && renderMyoRepsUI()}
      {technique === 'dropset' && renderDropSetUI()}
      {technique === 'cluster' && renderClusterUI()}
      {technique === 'partials' && renderPartialsUI()}

      {detectedPRs.length > 0 && (
        <div className={styles.prNotification}>
          <PRNotification prs={detectedPRs} />
        </div>
      )}
    </div>
  );
}
