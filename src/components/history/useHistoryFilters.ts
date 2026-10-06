import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useRoutines } from '../../hooks/useRoutines';
import { usePersistedState } from '../../hooks/usePersistedState';
import { matchesAllWords } from '../../utils/search';
import type { PR, PRType, Session } from '../../types';
import { getDurationMinutes } from '../common/format';

/** Convert a YYYY-MM-DD string to start-of-day timestamp in local timezone */
function dateStringToStart(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

/** Convert a YYYY-MM-DD string to end-of-day timestamp in local timezone */
function dateStringToEnd(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

const DAY = 24 * 60 * 60 * 1000;
const PRESET_DAYS: Record<string, number> = {
  week: 7,
  month: 30,
  '3months': 90,
  '6months': 180,
  year: 365,
};

export type SortBy = 'date-desc' | 'date-asc' | 'duration-desc' | 'duration-asc' | 'prs-desc';

/**
 * All History filter state (persisted per tab) plus the targeted queries behind it.
 * Queries only touch rows they need: PR lookups walk prs → sets → sessionExercises
 * by key, and per-session counts are limited to the sessions being filtered.
 */
export function useHistoryFilters() {
  const [routineFilter, setRoutineFilter] = usePersistedState('history.routine', '');
  const [dateFilter, setDateFilter] = usePersistedState('history.datePreset', '');
  const [dateFrom, setDateFrom] = usePersistedState('history.dateFrom', '');
  const [dateTo, setDateTo] = usePersistedState('history.dateTo', '');
  const [searchQuery, setSearchQuery] = usePersistedState('history.search', '');
  const [minDuration, setMinDuration] = usePersistedState('history.minDuration', '');
  const [maxDuration, setMaxDuration] = usePersistedState('history.maxDuration', '');
  const [minSets, setMinSets] = usePersistedState('history.minSets', '');
  const [maxSets, setMaxSets] = usePersistedState('history.maxSets', '');
  const [prFilter, setPrFilter] = usePersistedState('history.prFilter', '');
  const [prExerciseFilter, setPrExerciseFilter] = usePersistedState('history.prExercise', '');
  const [exerciseFilters, setExerciseFilters] = usePersistedState<string[]>('history.exercises', []);
  const [exerciseFilterMode, setExerciseFilterMode] = usePersistedState<'any' | 'all'>('history.exerciseMode', 'any');
  const [isExerciseFilterOpen, setIsExerciseFilterOpen] = usePersistedState('history.exerciseFilterOpen', false);
  const [filtersOpen, setFiltersOpen] = usePersistedState('history.filtersOpen', false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState(''); // Don't persist in-panel search
  const [sortBy, setSortBy] = usePersistedState<string>('history.sort', 'date-desc');

  const routines = useRoutines();
  const isCustomRange = dateFilter === 'custom';

  // Completed sessions in range — `undefined` while loading (so the UI can show a skeleton)
  const allSessions = useLiveQuery(async () => {
    // Effective date range from either preset or custom inputs
    let startDate: number | undefined;
    let endDate: number | undefined;
    if (dateFilter && dateFilter !== 'custom') {
      const days = PRESET_DAYS[dateFilter];
      if (days) startDate = Date.now() - days * DAY;
    } else if (dateFilter === 'custom') {
      startDate = dateFrom ? dateStringToStart(dateFrom) : undefined;
      endDate = dateTo ? dateStringToEnd(dateTo) : undefined;
    }
    const collection =
      startDate !== undefined || endDate !== undefined
        ? db.sessions.where('startedAt').between(startDate ?? -Infinity, endDate ?? Infinity, true, true)
        : db.sessions.toCollection();
    const results = await collection.filter((s) => s.completedAt != null).toArray();
    results.sort((a, b) => b.startedAt - a.startedAt);
    return results;
  }, [dateFilter, dateFrom, dateTo]);

  const sessionIdsKey = useMemo(() => (allSessions ?? []).map((s) => s.id).join(','), [allSessions]);

  // Template id → name (small table)
  const templateMap = useLiveQuery(async () => {
    const templates = await db.templates.toArray();
    return new Map(templates.map((t) => [t.id, t.name] as const));
  }, []);

  const routineMap = useMemo(() => new Map(routines.map((r) => [r.id, r.name] as const)), [routines]);

  // PR → session index: prs, then only the sets / sessionExercises those PRs point to
  const prIndex = useLiveQuery(async () => {
    const prs = await db.prs.toArray();
    if (prs.length === 0) return [] as { pr: PR; sessionId: string }[];
    const setIds = [...new Set(prs.map((p) => p.setId))];
    const sets = await db.sets.bulkGet(setIds);
    const setToSE = new Map<string, string>();
    for (const s of sets) if (s) setToSE.set(s.id, s.sessionExerciseId);
    const seIds = [...new Set(setToSE.values())];
    const ses = await db.sessionExercises.bulkGet(seIds);
    const seToSession = new Map<string, string>();
    for (const se of ses) if (se) seToSession.set(se.id, se.sessionId);

    const result: { pr: PR; sessionId: string }[] = [];
    for (const pr of prs) {
      const seId = setToSE.get(pr.setId);
      const sessionId = seId ? seToSession.get(seId) : undefined;
      if (sessionId) result.push({ pr, sessionId });
    }
    return result;
  }, []);

  const sessionPRCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { sessionId } of prIndex ?? []) counts.set(sessionId, (counts.get(sessionId) ?? 0) + 1);
    return counts;
  }, [prIndex]);

  // Exercises that have PRs (for the PR exercise dropdown)
  const exercisesWithPRs = useLiveQuery(async () => {
    if (!prFilter || !prIndex) return [];
    const ids = [...new Set(prIndex.map((p) => p.pr.exerciseId))];
    const exercises = await db.exercises.bulkGet(ids);
    return exercises
      .filter((e): e is NonNullable<typeof e> => !!e)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [prFilter, prIndex]);

  // Sessions matching the PR filter (null = no PR filter)
  const prSessionIds = useMemo(() => {
    if (!prFilter || !prIndex) return null;
    if (prFilter === 'none') {
      const withPR = new Set(prIndex.map((p) => p.sessionId));
      return new Set((allSessions ?? []).filter((s) => !withPR.has(s.id)).map((s) => s.id));
    }
    const ids = new Set<string>();
    for (const { pr, sessionId } of prIndex) {
      if (prFilter !== 'any' && pr.type !== (prFilter as PRType)) continue;
      if (prExerciseFilter && pr.exerciseId !== prExerciseFilter) continue;
      ids.add(sessionId);
    }
    return ids;
  }, [prFilter, prExerciseFilter, prIndex, allSessions]);

  // Set counts per session — only when a sets filter is active, only for sessions in range.
  // Reads index keys (sessionExerciseId) instead of whole set rows.
  const sessionSetCounts = useLiveQuery(async () => {
    if ((!minSets && !maxSets) || !sessionIdsKey) return null;
    const ses = await db.sessionExercises.where('sessionId').anyOf(sessionIdsKey.split(',')).toArray();
    if (ses.length === 0) return new Map<string, number>();
    const seToSession = new Map(ses.map((se) => [se.id, se.sessionId] as const));
    const setSEKeys = await db.sets.where('sessionExerciseId').anyOf([...seToSession.keys()]).keys();
    const counts = new Map<string, number>();
    for (const key of setSEKeys) {
      const sid = seToSession.get(String(key));
      if (sid) counts.set(sid, (counts.get(sid) ?? 0) + 1);
    }
    return counts;
  }, [minSets, maxSets, sessionIdsKey]);

  // sessionId → exerciseIds, only for sessions in range and only when the exercise filter is active
  const sessionExerciseMap = useLiveQuery(async () => {
    if (exerciseFilters.length === 0 || !sessionIdsKey) return null;
    const ses = await db.sessionExercises.where('sessionId').anyOf(sessionIdsKey.split(',')).toArray();
    const map = new Map<string, Set<string>>();
    for (const se of ses) {
      const existing = map.get(se.sessionId);
      if (existing) existing.add(se.exerciseId);
      else map.set(se.sessionId, new Set([se.exerciseId]));
    }
    return map;
  }, [exerciseFilters.length > 0, sessionIdsKey]);

  // Exercises used in any session (filter chips) — only loaded when the chip panel is open
  const usedExercises = useLiveQuery(async () => {
    if (!filtersOpen || !isExerciseFilterOpen) return [];
    const usedIds = (await db.sessionExercises.orderBy('exerciseId').uniqueKeys()) as string[];
    const exercises = await db.exercises.bulkGet(usedIds);
    return exercises
      .filter((e): e is NonNullable<typeof e> => !!e)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtersOpen, isExerciseFilterOpen]);

  const filteredExerciseChips = useMemo(() => {
    if (!usedExercises) return [];
    if (!exerciseSearchQuery) return usedExercises;
    return usedExercises.filter((e) => matchesAllWords(e.name, exerciseSearchQuery));
  }, [usedExercises, exerciseSearchQuery]);

  /** Same title the card shows: "Routine – Template", or whichever exists */
  const getSessionTitle = useMemo(
    () => (s: Session) => {
      const routineName = s.routineId ? routineMap.get(s.routineId) : undefined;
      const templateName = s.templateId ? templateMap?.get(s.templateId) : undefined;
      return routineName && templateName
        ? `${routineName} – ${templateName}`
        : routineName ?? templateName ?? 'Blank Workout';
    },
    [routineMap, templateMap]
  );

  // Apply client-side filters. `undefined` while sessions are loading.
  const filteredSessions = useMemo(() => {
    if (!allSessions) return undefined;
    let result = [...allSessions];

    if (routineFilter) {
      result = routineFilter === 'blank'
        ? result.filter((s) => !s.routineId)
        : result.filter((s) => s.routineId === routineFilter);
    }

    // Search: title as shown on the card (routine + template) and notes
    if (searchQuery.trim()) {
      result = result.filter((s) =>
        matchesAllWords(`${getSessionTitle(s)} ${s.notes ?? ''}`, searchQuery)
      );
    }

    const minMins = minDuration ? parseInt(minDuration, 10) : 0;
    const maxMins = maxDuration ? parseInt(maxDuration, 10) : Infinity;
    if (minMins > 0 || maxMins < Infinity) {
      result = result.filter((s) => {
        const dur = getDurationMinutes(s.startedAt, s.completedAt);
        return dur >= minMins && dur <= maxMins;
      });
    }

    const minS = minSets ? parseInt(minSets, 10) : 0;
    const maxS = maxSets ? parseInt(maxSets, 10) : Infinity;
    if ((minS > 0 || maxS < Infinity) && sessionSetCounts) {
      result = result.filter((s) => {
        const count = sessionSetCounts.get(s.id) ?? 0;
        return count >= minS && count <= maxS;
      });
    }

    if (prFilter && prSessionIds) {
      result = result.filter((s) => prSessionIds.has(s.id));
    }

    if (exerciseFilters.length > 0 && sessionExerciseMap) {
      result = result.filter((s) => {
        const inSession = sessionExerciseMap.get(s.id);
        if (!inSession) return false;
        return exerciseFilterMode === 'any'
          ? exerciseFilters.some((id) => inSession.has(id))
          : exerciseFilters.every((id) => inSession.has(id));
      });
    }

    switch (sortBy as SortBy) {
      case 'date-asc':
        result.sort((a, b) => a.startedAt - b.startedAt);
        break;
      case 'duration-desc':
        result.sort((a, b) => getDurationMinutes(b.startedAt, b.completedAt) - getDurationMinutes(a.startedAt, a.completedAt));
        break;
      case 'duration-asc':
        result.sort((a, b) => getDurationMinutes(a.startedAt, a.completedAt) - getDurationMinutes(b.startedAt, b.completedAt));
        break;
      case 'prs-desc':
        result.sort((a, b) => (sessionPRCounts.get(b.id) ?? 0) - (sessionPRCounts.get(a.id) ?? 0));
        break;
      default: // date-desc
        result.sort((a, b) => b.startedAt - a.startedAt);
    }

    return result;
  }, [allSessions, routineFilter, searchQuery, getSessionTitle, minDuration, maxDuration, minSets, maxSets, sessionSetCounts, prFilter, prSessionIds, exerciseFilters, exerciseFilterMode, sessionExerciseMap, sortBy, sessionPRCounts]);

  const clearFilters = () => {
    setRoutineFilter('');
    setDateFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setMinDuration('');
    setMaxDuration('');
    setMinSets('');
    setMaxSets('');
    setPrFilter('');
    setPrExerciseFilter('');
    setExerciseFilters([]);
    setExerciseFilterMode('any');
    setExerciseSearchQuery('');
  };

  const toggleExerciseFilter = (exerciseId: string) => {
    setExerciseFilters((prev) =>
      prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId]
    );
  };

  // Custom range with no dates filled = no active date filter
  const hasDateFilter = !!dateFilter && (dateFilter !== 'custom' || !!dateFrom || !!dateTo);

  // Filters inside the collapsible panel (search is always visible, so not counted)
  let panelFilterCount = 0;
  if (routineFilter) panelFilterCount++;
  if (hasDateFilter) panelFilterCount++;
  if (minDuration || maxDuration) panelFilterCount++;
  if (minSets || maxSets) panelFilterCount++;
  if (prFilter) panelFilterCount++;
  if (exerciseFilters.length > 0) panelFilterCount++;

  const hasFilters = panelFilterCount > 0 || !!searchQuery;

  return {
    // state
    routineFilter, setRoutineFilter,
    dateFilter, setDateFilter,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    isCustomRange,
    searchQuery, setSearchQuery,
    minDuration, setMinDuration,
    maxDuration, setMaxDuration,
    minSets, setMinSets,
    maxSets, setMaxSets,
    prFilter, setPrFilter,
    prExerciseFilter, setPrExerciseFilter,
    exerciseFilters, setExerciseFilters, toggleExerciseFilter,
    exerciseFilterMode, setExerciseFilterMode,
    isExerciseFilterOpen, setIsExerciseFilterOpen,
    exerciseSearchQuery, setExerciseSearchQuery,
    filtersOpen, setFiltersOpen,
    sortBy, setSortBy,
    // derived data
    routines,
    routineMap,
    templateMap,
    sessionPRCounts,
    exercisesWithPRs,
    filteredExerciseChips,
    filteredSessions,
    getSessionTitle,
    clearFilters,
    hasFilters,
    panelFilterCount,
  };
}

export type HistoryFilters = ReturnType<typeof useHistoryFilters>;
