import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Input, Select, Button, ConfirmDialog } from '../common';
import { useSessions, deleteSession } from '../../hooks/useSessions';
import { useRoutines } from '../../hooks/useRoutines';
import { db } from '../../db';
import type { Session, PRType } from '../../types';
import { matchesAllWords } from '../../utils/search';
import { CalendarView } from './CalendarView';
import { useSetting } from '../../hooks/useSettings';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useScrollRestore } from '../../hooks/useScrollRestore';
import styles from './SessionHistory.module.css';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startedAt: number, completedAt?: number): string {
  if (!completedAt) return 'Incomplete';
  const mins = Math.floor((completedAt - startedAt) / 1000 / 60);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

function getDurationMinutes(startedAt: number, completedAt?: number): number {
  if (!completedAt) return 0;
  return Math.floor((completedAt - startedAt) / 1000 / 60);
}

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

interface SessionCardProps {
  session: Session;
  routineName?: string;
  templateName?: string;
  prCount: number;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onClick: () => void;
}

function SessionCard({ session, routineName, templateName, prCount, selectionMode, isSelected, onToggleSelect, onClick }: SessionCardProps) {
  const title = routineName && templateName
    ? `${routineName} – ${templateName}`
    : routineName ?? templateName ?? 'Blank Workout';

  const notes = session.notes
    ? session.notes.length > 50
      ? session.notes.slice(0, 50) + '...'
      : session.notes
    : null;

  return (
    <div
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
      onClick={selectionMode ? onToggleSelect : onClick}
    >
      {selectionMode && (
        <input
          type="checkbox"
          className={styles.cardCheckbox}
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div className={styles.cardLeft}>
        <span className={styles.cardTitle}>{title}</span>
        {notes && <span className={styles.cardNotes}>{notes}</span>}
      </div>
      <div className={styles.cardRight}>
        <div className={styles.cardTopRight}>
          <span className={styles.date}>{formatDate(session.startedAt)}</span>
          <span className={styles.time}>{formatTime(session.startedAt)}</span>
        </div>
        <div className={styles.cardBottomRight}>
          {prCount > 0 && (
            <span className={styles.prCountBadge}>🏆 {prCount}</span>
          )}
          <span className={styles.duration}>
            {formatDuration(session.startedAt, session.completedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SessionHistory() {
  const navigate = useNavigate();
  useScrollRestore();
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
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState(''); // Don't persist in-modal search
  const [sortBy, setSortBy] = usePersistedState('history.sort', 'date-desc');
  const [viewMode, setViewMode] = usePersistedState<'list' | 'calendar'>('history.viewMode', 'list');
  const [selectionMode, setSelectionMode] = useState(false); // Don't persist selection mode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const [showAdvancedFilters, setShowAdvancedFilters] = usePersistedState('history.advancedOpen', false);
  const [showExportMenu, setShowExportMenu] = useState(false); // Don't persist dropdown

  const routines = useRoutines();
  const weekStartDay = useSetting('weekStartDay') as number;

  // Today as YYYY-MM-DD for date input max constraint
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const isCustomRange = dateFilter === 'custom';

  // Compute effective date range from either preset or custom inputs
  const sessionFilters = useMemo(() => {
    let startDate: number | undefined;
    let endDate: number | undefined;

    if (dateFilter && dateFilter !== 'custom') {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      switch (dateFilter) {
        case 'week':
          startDate = now - 7 * day;
          break;
        case 'month':
          startDate = now - 30 * day;
          break;
        case '3months':
          startDate = now - 90 * day;
          break;
        case '6months':
          startDate = now - 180 * day;
          break;
        case 'year':
          startDate = now - 365 * day;
          break;
      }
    } else if (isCustomRange) {
      startDate = dateFrom ? dateStringToStart(dateFrom) : undefined;
      endDate = dateTo ? dateStringToEnd(dateTo) : undefined;
    }

    return { completed: true, startDate, endDate };
  }, [dateFilter, dateFrom, dateTo, isCustomRange]);

  const allSessions = useSessions(sessionFilters);

  // Build a map of sessionId → total set count for the sets filter
  const sessionSetCounts = useLiveQuery(async () => {
    if (!minSets && !maxSets) return null; // Skip query if no sets filter
    const allSE = await db.sessionExercises.toArray();
    const allSets = await db.sets.toArray();
    // Map sessionExerciseId → sessionId
    const seToSession = new Map<string, string>();
    for (const se of allSE) seToSession.set(se.id, se.sessionId);
    // Count sets per session
    const counts = new Map<string, number>();
    for (const set of allSets) {
      const sid = seToSession.get(set.sessionExerciseId);
      if (sid) counts.set(sid, (counts.get(sid) ?? 0) + 1);
    }
    return counts;
  }, [minSets, maxSets]);

  // Build exercises that have PRs (for the exercise dropdown)
  const exercisesWithPRs = useLiveQuery(async () => {
    if (!prFilter) return [];
    const prs = await db.prs.toArray();
    const exerciseIds = new Set(prs.map((p) => p.exerciseId));
    const exercises = await db.exercises.toArray();
    return exercises
      .filter((e) => exerciseIds.has(e.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [prFilter]);

  // Build a set of sessionIds that have matching PRs (or NO PRs for 'none')
  const prSessionIds = useLiveQuery(async () => {
    if (!prFilter) return null;

    const allPrs = await db.prs.toArray();
    const allSets = await db.sets.toArray();
    const allSE = await db.sessionExercises.toArray();

    // For "no PR" filter: find sessions with NO PRs at all
    if (prFilter === 'none') {
      // Build set of all session IDs that DO have PRs
      const prSetIds = new Set(allPrs.map((p) => p.setId));
      const seIdsWithPR = new Set<string>();
      for (const s of allSets) {
        if (prSetIds.has(s.id)) seIdsWithPR.add(s.sessionExerciseId);
      }
      const sessionsWithPR = new Set<string>();
      for (const se of allSE) {
        if (seIdsWithPR.has(se.id)) sessionsWithPR.add(se.sessionId);
      }
      // Return all session IDs that are NOT in sessionsWithPR
      const allSessionIds = await db.sessions.toCollection().primaryKeys();
      return new Set(allSessionIds.filter((id) => !sessionsWithPR.has(id as string)) as string[]);
    }

    // Filter PRs by type and optionally exercise
    let prs = [...allPrs];
    if (prFilter !== 'any') {
      prs = prs.filter((p) => p.type === (prFilter as PRType));
    }
    if (prExerciseFilter) {
      prs = prs.filter((p) => p.exerciseId === prExerciseFilter);
    }
    if (prs.length === 0) return new Set<string>();

    // Get the setIds from these PRs
    const prSetIds = new Set(prs.map((p) => p.setId));

    // Walk: setId → sessionExerciseId → sessionId
    const matchingSEIds = new Set<string>();
    for (const s of allSets) {
      if (prSetIds.has(s.id)) matchingSEIds.add(s.sessionExerciseId);
    }

    const sessionIds = new Set<string>();
    for (const se of allSE) {
      if (matchingSEIds.has(se.id)) sessionIds.add(se.sessionId);
    }

    return sessionIds;
  }, [prFilter, prExerciseFilter]);

  // Build exercises that have been used in any session (for exercise filter chips)
  const usedExercises = useLiveQuery(async () => {
    const allSE = await db.sessionExercises.toArray();
    const usedIds = new Set(allSE.map((se) => se.exerciseId));
    const exercises = await db.exercises.toArray();
    return exercises
      .filter((e) => usedIds.has(e.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Build sessionId → Set<exerciseId> map for the exercise filter
  const sessionExerciseMap = useLiveQuery(async () => {
    if (exerciseFilters.length === 0) return null;
    const allSE = await db.sessionExercises.toArray();
    const map = new Map<string, Set<string>>();
    for (const se of allSE) {
      const existing = map.get(se.sessionId);
      if (existing) {
        existing.add(se.exerciseId);
      } else {
        map.set(se.sessionId, new Set([se.exerciseId]));
      }
    }
    return map;
  }, [exerciseFilters.length]);

  // Build template name map
  const templateMap = useLiveQuery(async () => {
    const templates = await db.templates.toArray();
    const map = new Map<string, string>();
    for (const t of templates) map.set(t.id, t.name);
    return map;
  }, []);

  // Build sessionId → PR count map
  const sessionPRCounts = useLiveQuery(async () => {
    const allPrs = await db.prs.toArray();
    const allSets = await db.sets.toArray();
    const allSE = await db.sessionExercises.toArray();
    // PR.setId → Set.sessionExerciseId → SessionExercise.sessionId
    const setToSE = new Map<string, string>();
    for (const s of allSets) setToSE.set(s.id, s.sessionExerciseId);
    const seToSession = new Map<string, string>();
    for (const se of allSE) seToSession.set(se.id, se.sessionId);
    const counts = new Map<string, number>();
    for (const pr of allPrs) {
      const seId = setToSE.get(pr.setId);
      if (!seId) continue;
      const sessionId = seToSession.get(seId);
      if (!sessionId) continue;
      counts.set(sessionId, (counts.get(sessionId) ?? 0) + 1);
    }
    return counts;
  }, []);

  // Create routine name map
  const routineMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of routines) {
      map.set(r.id, r.name);
    }
    return map;
  }, [routines]);

  // Apply client-side filters
  const filteredSessions = useMemo(() => {
    let result = [...allSessions];

    // Routine filter
    if (routineFilter) {
      if (routineFilter === 'blank') {
        result = result.filter((s) => !s.routineId);
      } else {
        result = result.filter((s) => s.routineId === routineFilter);
      }
    }

    // Search filter (by routine name or notes)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const routineName = s.routineId ? routineMap.get(s.routineId) : 'blank';
        return (
          routineName?.toLowerCase().includes(query) ||
          s.notes?.toLowerCase().includes(query)
        );
      });
    }

    // Duration filter
    const minMins = minDuration ? parseInt(minDuration, 10) : 0;
    const maxMins = maxDuration ? parseInt(maxDuration, 10) : Infinity;
    if (minMins > 0 || maxMins < Infinity) {
      result = result.filter((s) => {
        const dur = getDurationMinutes(s.startedAt, s.completedAt);
        return dur >= minMins && dur <= maxMins;
      });
    }

    // Sets filter
    const minS = minSets ? parseInt(minSets, 10) : 0;
    const maxS = maxSets ? parseInt(maxSets, 10) : Infinity;
    if ((minS > 0 || maxS < Infinity) && sessionSetCounts) {
      result = result.filter((s) => {
        const count = sessionSetCounts.get(s.id) ?? 0;
        return count >= minS && count <= maxS;
      });
    }

    // PR filter
    if (prFilter && prSessionIds) {
      result = result.filter((s) => prSessionIds.has(s.id));
    }

    // Exercise filter (ANY/ALL)
    if (exerciseFilters.length > 0 && sessionExerciseMap) {
      result = result.filter((s) => {
        const exercisesInSession = sessionExerciseMap.get(s.id);
        if (!exercisesInSession) return false;
        if (exerciseFilterMode === 'any') {
          return exerciseFilters.some((id) => exercisesInSession.has(id));
        } else {
          return exerciseFilters.every((id) => exercisesInSession.has(id));
        }
      });
    }

    // Sort
    switch (sortBy) {
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
        result.sort((a, b) => (sessionPRCounts?.get(b.id) ?? 0) - (sessionPRCounts?.get(a.id) ?? 0));
        break;
      default: // date-desc
        result.sort((a, b) => b.startedAt - a.startedAt);
    }

    return result;
  }, [allSessions, routineFilter, searchQuery, routineMap, minDuration, maxDuration, minSets, maxSets, sessionSetCounts, prFilter, prSessionIds, exerciseFilters, exerciseFilterMode, sessionExerciseMap, sortBy, sessionPRCounts]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredSessions.map((s) => s.id)));
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteSession(id);
    }
    setSelectedIds(new Set());
    setSelectionMode(false);
    setShowBulkDeleteConfirm(false);
  };

  const handleExport = (format: 'json' | 'csv') => {
    const sessionsToExport = filteredSessions.filter((s) =>
      selectedIds.size > 0 ? selectedIds.has(s.id) : true
    );
    const data = sessionsToExport.map((s) => ({
      id: s.id,
      routine: s.routineId ? routineMap.get(s.routineId) ?? '' : '',
      template: s.templateId ? templateMap?.get(s.templateId) ?? '' : '',
      date: new Date(s.startedAt).toISOString(),
      duration: s.completedAt ? Math.floor((s.completedAt - s.startedAt) / 1000 / 60) : 0,
      notes: s.notes ?? '',
      prs: sessionPRCounts?.get(s.id) ?? 0,
    }));

    let content: string;
    let mimeType: string;
    let ext: string;

    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    } else {
      const headers = ['id', 'routine', 'template', 'date', 'duration', 'notes', 'prs'];
      const rows = data.map((d) =>
        headers.map((h) => {
          const val = String(d[h as keyof typeof d]);
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')
      );
      content = [headers.join(','), ...rows].join('\n');
      mimeType = 'text/csv';
      ext = 'csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-history.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    setVisibleCount(30);
  };

  const handleExerciseToggle = (exerciseId: string) => {
    setExerciseFilters((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  // Filter the exercise chips by the exercise search query
  const filteredExerciseChips = useMemo(() => {
    if (!usedExercises) return [];
    if (!exerciseSearchQuery) return usedExercises;
    return usedExercises.filter((e) => matchesAllWords(e.name, exerciseSearchQuery));
  }, [usedExercises, exerciseSearchQuery]);

  // Infinite scroll: load more when sentinel becomes visible
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 30);
        }
      });
      observerRef.current.observe(node);
    },
    []
  );

  // Close export dropdown on outside click
  const exportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showExportMenu) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExportMenu]);

  // Custom range with no dates filled = no active date filter
  const hasDateFilter = dateFilter && (dateFilter !== 'custom' || dateFrom || dateTo);
  const hasFilters = routineFilter || hasDateFilter || searchQuery || minDuration || maxDuration || minSets || maxSets || prFilter || exerciseFilters.length > 0;

  // Count active advanced filters (for the "More filters" badge)
  const advancedFilterCount = useMemo(() => {
    let count = 0;
    if (minDuration || maxDuration) count++;
    if (minSets || maxSets) count++;
    if (prFilter) count++;
    if (exerciseFilters.length > 0) count++;
    return count;
  }, [minDuration, maxDuration, minSets, maxSets, prFilter, exerciseFilters]);

  // Windowed sessions for virtual scroll
  const visibleSessions = useMemo(
    () => filteredSessions.slice(0, visibleCount),
    [filteredSessions, visibleCount]
  );
  const hasMore = visibleCount < filteredSessions.length;

  // Group visible sessions by date
  const groupedSessions = useMemo(() => {
    const groups = new Map<string, Session[]>();
    for (const session of visibleSessions) {
      const dateKey = new Date(session.startedAt).toDateString();
      const existing = groups.get(dateKey) ?? [];
      existing.push(session);
      groups.set(dateKey, existing);
    }
    return Array.from(groups.entries());
  }, [visibleSessions]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>History</h1>
        <div className={styles.headerRight}>
          <span className={styles.count}>{filteredSessions.length} sessions</span>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: 'date-desc', label: 'Newest first' },
              { value: 'date-asc', label: 'Oldest first' },
              { value: 'duration-desc', label: 'Longest first' },
              { value: 'duration-asc', label: 'Shortest first' },
              { value: 'prs-desc', label: 'Most PRs first' },
            ]}
          />
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'calendar' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              Cal
            </button>
          </div>
          <div className={styles.exportWrapper} ref={exportRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Export sessions"
            >
              Export
            </Button>
            {showExportMenu && (
              <div className={styles.exportDropdown}>
                <button className={styles.exportOption} onClick={() => { handleExport('csv'); setShowExportMenu(false); }}>
                  CSV
                </button>
                <button className={styles.exportOption} onClick={() => { handleExport('json'); setShowExportMenu(false); }}>
                  JSON
                </button>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectionMode(!selectionMode);
              setSelectedIds(new Set());
            }}
          >
            {selectionMode ? 'Cancel' : 'Select'}
          </Button>
        </div>
      </header>

      {selectionMode && (
        <div className={styles.selectionBar}>
          <span className={styles.selectionCount}>{selectedIds.size} selected</span>
          <Button variant="ghost" size="sm" onClick={selectAll}>Select all</Button>
          {selectedIds.size === 2 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const ids = [...selectedIds];
                navigate(`/history/compare?a=${ids[0]}&b=${ids[1]}`);
              }}
            >
              Compare
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowBulkDeleteConfirm(true)}
            disabled={selectedIds.size === 0}
          >
            Delete ({selectedIds.size})
          </Button>
        </div>
      )}

      <div className={styles.filters}>
        <div className={styles.topRow}>
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          <Select
            value={routineFilter}
            onChange={(e) => setRoutineFilter(e.target.value)}
            options={[
              { value: 'blank', label: 'Blank Workouts' },
              ...routines.map((r) => ({ value: r.id, label: r.name })),
            ]}
            placeholder="All routines"
          />
          <Select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              if (e.target.value !== 'custom') {
                setDateFrom('');
                setDateTo('');
              }
            }}
            options={[
              { value: 'week', label: 'Past Week' },
              { value: 'month', label: 'Past Month' },
              { value: '3months', label: 'Past 3 Months' },
              { value: '6months', label: 'Past 6 Months' },
              { value: 'year', label: 'Past Year' },
              { value: 'custom', label: 'Custom Range...' },
            ]}
            placeholder="All time"
          />
        </div>

        {isCustomRange && (
          <div className={styles.customDateRow}>
            <div className={styles.dateField}>
              <label className={styles.filterLabel}>From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo || todayStr}
              />
            </div>
            <div className={styles.dateField}>
              <label className={styles.filterLabel}>To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
                max={todayStr}
              />
            </div>
          </div>
        )}

        <div className={styles.moreFiltersRow}>
          <button
            className={styles.moreFiltersToggle}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <span>More filters{advancedFilterCount > 0 ? ` (${advancedFilterCount})` : ''}</span>
            <span className={styles.chevron}>{showAdvancedFilters ? '▲' : '▼'}</span>
          </button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className={styles.clearBtn}>
              Clear all
            </Button>
          )}
        </div>

        {showAdvancedFilters && (
          <>
            <div className={styles.secondaryRow}>
              <div className={styles.rangeFilter}>
                <label className={styles.filterLabel}>Duration (min)</label>
                <div className={styles.rangeInputs}>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minDuration}
                    onChange={(e) => setMinDuration(e.target.value)}
                    min={0}
                  />
                  <span className={styles.rangeSeparator}>–</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(e.target.value)}
                    min={0}
                  />
                </div>
              </div>
              <div className={styles.rangeFilter}>
                <label className={styles.filterLabel}>Sets</label>
                <div className={styles.rangeInputs}>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={minSets}
                    onChange={(e) => setMinSets(e.target.value)}
                    min={0}
                  />
                  <span className={styles.rangeSeparator}>–</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={maxSets}
                    onChange={(e) => setMaxSets(e.target.value)}
                    min={0}
                  />
                </div>
              </div>
              <div className={styles.prFilter}>
                <label className={styles.filterLabel}>PR</label>
                <Select
                  value={prFilter}
                  onChange={(e) => {
                    setPrFilter(e.target.value);
                    if (!e.target.value || e.target.value === 'none') setPrExerciseFilter('');
                  }}
                  options={[
                    { value: 'any', label: 'Any PR' },
                    { value: 'none', label: 'No PR' },
                    { value: 'weight', label: 'Weight PR' },
                    { value: 'reps', label: 'Reps PR' },
                    { value: 'e1rm', label: 'E1RM PR' },
                    { value: 'progression', label: 'Progression' },
                  ]}
                  placeholder="All"
                />
              </div>
              {prFilter && prFilter !== 'none' && (
                <div className={styles.prFilter}>
                  <label className={styles.filterLabel}>Exercise</label>
                  <Select
                    value={prExerciseFilter}
                    onChange={(e) => setPrExerciseFilter(e.target.value)}
                    options={(exercisesWithPRs ?? []).map((ex) => ({
                      value: ex.id,
                      label: ex.name,
                    }))}
                    placeholder="All exercises"
                  />
                </div>
              )}
            </div>

            {/* Exercise Multi-Select Filter - Collapsible */}
            <div className={styles.exerciseFilterSection}>
              <button
                className={styles.exerciseFilterToggle}
                onClick={() => setIsExerciseFilterOpen(!isExerciseFilterOpen)}
              >
                <span className={styles.exerciseFilterLabel}>
                  Exercises{exerciseFilters.length > 0 ? `: ${exerciseFilters.length} selected` : ''}
                </span>
                <span className={styles.chevron}>{isExerciseFilterOpen ? '▲' : '▼'}</span>
              </button>

              {isExerciseFilterOpen && (
                <div className={styles.exerciseFilterDropdown}>
                  {exerciseFilters.length > 1 && (
                    <div className={styles.filterModeRow}>
                      <span className={styles.filterModeLabel}>Match:</span>
                      <div className={styles.filterModeToggle}>
                        <button
                          className={`${styles.modeButton} ${exerciseFilterMode === 'any' ? styles.modeActive : ''}`}
                          onClick={() => setExerciseFilterMode('any')}
                        >
                          ANY
                        </button>
                        <button
                          className={`${styles.modeButton} ${exerciseFilterMode === 'all' ? styles.modeActive : ''}`}
                          onClick={() => setExerciseFilterMode('all')}
                        >
                          ALL
                        </button>
                      </div>
                    </div>
                  )}
                  <Input
                    placeholder="Search exercises..."
                    value={exerciseSearchQuery}
                    onChange={(e) => setExerciseSearchQuery(e.target.value)}
                  />
                  <div className={styles.exerciseChips}>
                    {filteredExerciseChips.map((ex) => (
                      <button
                        key={ex.id}
                        className={`${styles.exerciseChip} ${exerciseFilters.includes(ex.id) ? styles.exerciseChipActive : ''}`}
                        onClick={() => handleExerciseToggle(ex.id)}
                      >
                        {ex.name}
                      </button>
                    ))}
                    {filteredExerciseChips.length === 0 && (
                      <span className={styles.noChips}>No exercises match</span>
                    )}
                  </div>
                  {exerciseFilters.length > 0 && (
                    <button
                      className={styles.clearChipsBtn}
                      onClick={() => { setExerciseFilters([]); setExerciseSearchQuery(''); }}
                    >
                      Clear exercise filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView
          sessions={filteredSessions}
          sessionPRCounts={sessionPRCounts ?? undefined}
          weekStartDay={weekStartDay}
          onDayClick={(dateStr, daySessions) => {
            if (daySessions.length === 1) {
              navigate(`/history/${daySessions[0].id}`);
            } else {
              // Switch to list view filtered to this date
              setDateFilter('custom');
              setDateFrom(dateStr);
              setDateTo(dateStr);
              setViewMode('list');
            }
          }}
        />
      ) : (
        <div className={styles.list}>
          {groupedSessions.map(([dateKey, sessions]) => (
            <div key={dateKey} className={styles.dateGroup}>
              <h3 className={styles.dateHeader}>{dateKey}</h3>
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  routineName={session.routineId ? routineMap.get(session.routineId) : undefined}
                  templateName={session.templateId ? templateMap?.get(session.templateId) : undefined}
                  prCount={sessionPRCounts?.get(session.id) ?? 0}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(session.id)}
                  onToggleSelect={() => toggleSelect(session.id)}
                  onClick={() => navigate(`/history/${session.id}`)}
                />
              ))}
            </div>
          ))}
          {hasMore && <div ref={sentinelRef} className={styles.sentinel} />}
          {filteredSessions.length === 0 && (
            <p className={styles.empty}>
              {hasFilters
                ? 'No sessions match your filters.'
                : 'No workout history yet.'}
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Sessions"
        message={`Permanently delete ${selectedIds.size} session${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
