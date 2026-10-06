import { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Select, Button, ConfirmDialog, SkeletonList } from '../common';
import { deleteSession } from '../../hooks/useSessions';
import { db } from '../../db';
import type { Session } from '../../types';
import { getSetVolume } from '../../utils/volume';
import { CalendarView } from './CalendarView';
import { HistoryFilterPanel } from './HistoryFilterPanel';
import { HistoryMoreMenu } from './HistoryMoreMenu';
import { useHistoryFilters } from './useHistoryFilters';
import { formatDuration, formatGroupDate, formatTime, formatVolume } from '../common/format';
import { useSetting } from '../../hooks/useSettings';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useScrollRestore } from '../../hooks/useScrollRestore';
import styles from './SessionHistory.module.css';

interface SessionStats {
  exercises: number;
  sets: number;
  volume: number;
}

interface SessionCardProps {
  session: Session;
  title: string;
  prCount: number;
  stats?: SessionStats;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onClick: () => void;
}

function SessionCard({ session, title, prCount, stats, selectionMode, isSelected, onToggleSelect, onClick }: SessionCardProps) {
  const notes = session.notes
    ? session.notes.length > 50
      ? session.notes.slice(0, 50) + '...'
      : session.notes
    : null;

  // exercises · sets · volume
  const statParts: { value: string; unit: string }[] = [];
  if (stats) {
    statParts.push({ value: String(stats.exercises), unit: 'ex' });
    statParts.push({ value: String(stats.sets), unit: 'sets' });
    if (stats.volume > 0) statParts.push({ value: formatVolume(stats.volume).replace(/kg$/, ''), unit: 'kg' });
  }

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
      <div className={styles.cardBody}>
        <div className={styles.cardTopRow}>
          <span className={styles.cardTitle}>{title}</span>
          {prCount > 0 && <span className="chip chip-pr num">🏆 {prCount}</span>}
        </div>
        <span className={`num ${styles.cardWhen}`}>
          {formatTime(session.startedAt)} · {formatDuration(session.startedAt, session.completedAt)}
        </span>
        <div className={styles.cardStats}>
          {statParts.length > 0
            ? statParts.map((p) => (
                <span key={p.unit} className={styles.cardStat}>
                  <span className={`num ${styles.cardStatValue}`}>{p.value}</span> {p.unit}
                </span>
              ))
            :' '}
        </div>
        {notes && <span className={styles.cardNotes}>{notes}</span>}
      </div>
      {!selectionMode && <span className={styles.cardChevron} aria-hidden="true">›</span>}
    </div>
  );
}

export function SessionHistory() {
  const navigate = useNavigate();
  useScrollRestore();
  const f = useHistoryFilters();
  const [viewMode, setViewMode] = usePersistedState<'list' | 'calendar'>('history.viewMode', 'list');
  const [selectionMode, setSelectionMode] = useState(false); // Don't persist selection mode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);

  const weekStartDay = useSetting('weekStartDay') as number;
  const filteredSessions = f.filteredSessions;
  const isLoading = filteredSessions === undefined;
  const sessions = useMemo(() => filteredSessions ?? [], [filteredSessions]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(sessions.map((s) => s.id)));
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
    const sessionsToExport = sessions.filter((s) =>
      selectedIds.size > 0 ? selectedIds.has(s.id) : true
    );
    const data = sessionsToExport.map((s) => ({
      id: s.id,
      routine: s.routineId ? f.routineMap.get(s.routineId) ?? '' : '',
      template: s.templateId ? f.templateMap?.get(s.templateId) ?? '' : '',
      date: new Date(s.startedAt).toISOString(),
      duration: s.completedAt ? Math.floor((s.completedAt - s.startedAt) / 1000 / 60) : 0,
      notes: s.notes ?? '',
      prs: f.sessionPRCounts.get(s.id) ?? 0,
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

  // Infinite scroll: load more when sentinel becomes visible
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => prev + 30);
      }
    });
    observerRef.current.observe(node);
  }, []);

  const visibleSessions = useMemo(() => sessions.slice(0, visibleCount), [sessions, visibleCount]);
  const hasMore = visibleCount < sessions.length;

  // Card stats (exercises · sets · volume) — computed for the visible sessions only
  const visibleIdsKey = viewMode === 'list' ? visibleSessions.map((s) => s.id).join(',') : '';
  const sessionStats = useLiveQuery(async () => {
    const stats = new Map<string, SessionStats>();
    if (!visibleIdsKey) return stats;
    const ses = await db.sessionExercises.where('sessionId').anyOf(visibleIdsKey.split(',')).toArray();
    if (ses.length === 0) return stats;
    const seToSession = new Map<string, string>();
    for (const se of ses) {
      seToSession.set(se.id, se.sessionId);
      const st = stats.get(se.sessionId) ?? { exercises: 0, sets: 0, volume: 0 };
      st.exercises++;
      stats.set(se.sessionId, st);
    }
    const sets = await db.sets.where('sessionExerciseId').anyOf([...seToSession.keys()]).toArray();
    for (const set of sets) {
      if (set.isWarmup) continue;
      const st = stats.get(seToSession.get(set.sessionExerciseId) ?? '');
      if (!st) continue;
      st.sets++;
      st.volume += getSetVolume(set);
    }
    return stats;
  }, [visibleIdsKey]);

  // Group visible sessions by local calendar day
  const groupedSessions = useMemo(() => {
    const groups = new Map<string, { label: string; sessions: Session[] }>();
    for (const session of visibleSessions) {
      const dateKey = new Date(session.startedAt).toDateString();
      const existing = groups.get(dateKey);
      if (existing) existing.sessions.push(session);
      else groups.set(dateKey, { label: formatGroupDate(session.startedAt), sessions: [session] });
    }
    return Array.from(groups.entries());
  }, [visibleSessions]);

  const clearAndReset = () => {
    f.clearFilters();
    setVisibleCount(30);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="page-title">History</h1>
        <div className={styles.headerRight}>
          {!isLoading && (
            <span className={styles.count}>
              <span className="num">{sessions.length}</span> sessions
            </span>
          )}
          <Select
            value={f.sortBy}
            onChange={(e) => f.setSortBy(e.target.value)}
            aria-label="Sort"
            options={[
              { value: 'date-desc', label: 'Newest first' },
              { value: 'date-asc', label: 'Oldest first' },
              { value: 'duration-desc', label: 'Longest first' },
              { value: 'duration-asc', label: 'Shortest first' },
              { value: 'prs-desc', label: 'Most PRs first' },
            ]}
          />
          <HistoryMoreMenu
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onExport={handleExport}
            selectionMode={selectionMode}
            onToggleSelectionMode={() => {
              setSelectionMode(!selectionMode);
              setSelectedIds(new Set());
            }}
          />
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

      <HistoryFilterPanel filters={{ ...f, clearFilters: clearAndReset }} />

      {isLoading ? (
        <SkeletonList count={5} lines={2} />
      ) : viewMode === 'calendar' ? (
        <CalendarView
          sessions={sessions}
          sessionPRCounts={f.sessionPRCounts}
          weekStartDay={weekStartDay}
          onDayClick={(dateStr, daySessions) => {
            if (daySessions.length === 1) {
              navigate(`/history/${daySessions[0].id}`);
            } else {
              // Switch to list view filtered to this date
              f.setDateFilter('custom');
              f.setDateFrom(dateStr);
              f.setDateTo(dateStr);
              setViewMode('list');
            }
          }}
        />
      ) : (
        <div className={styles.list}>
          {groupedSessions.map(([dateKey, group]) => (
            <div key={dateKey} className={styles.dateGroup}>
              <h3 className={`eyebrow ${styles.dateHeader}`}>{group.label}</h3>
              {group.sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  title={f.getSessionTitle(session)}
                  prCount={f.sessionPRCounts.get(session.id) ?? 0}
                  stats={sessionStats?.get(session.id)}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(session.id)}
                  onToggleSelect={() => toggleSelect(session.id)}
                  onClick={() => navigate(`/history/${session.id}`)}
                />
              ))}
            </div>
          ))}
          {hasMore && <div ref={sentinelRef} className={styles.sentinel} />}
          {sessions.length === 0 && (
            <p className={styles.empty}>
              {f.hasFilters ? 'No sessions match your filters.' : 'No workout history yet.'}
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
