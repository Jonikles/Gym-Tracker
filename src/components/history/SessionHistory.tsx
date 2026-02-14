import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Select, Button } from '../common';
import { useSessions } from '../../hooks/useSessions';
import { useRoutines } from '../../hooks/useRoutines';
import type { Session } from '../../types';
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

interface SessionCardProps {
  session: Session;
  routineName?: string;
  onClick: () => void;
}

function SessionCard({ session, routineName, onClick }: SessionCardProps) {
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.cardHeader}>
        <span className={styles.date}>{formatDate(session.startedAt)}</span>
        <span className={styles.time}>{formatTime(session.startedAt)}</span>
        {!session.completedAt && <span className={styles.incomplete}>Incomplete</span>}
      </div>
      <div className={styles.cardBody}>
        <span className={styles.routineName}>{routineName ?? 'Blank Workout'}</span>
        <span className={styles.duration}>
          {formatDuration(session.startedAt, session.completedAt)}
        </span>
      </div>
    </div>
  );
}

export function SessionHistory() {
  const navigate = useNavigate();
  const [routineFilter, setRoutineFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const routines = useRoutines();
  const allSessions = useSessions();

  // Create routine name map
  const routineMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of routines) {
      map.set(r.id, r.name);
    }
    return map;
  }, [routines]);

  // Apply filters
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

    // Date filter
    if (dateFilter) {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1000;
      let startDate: number;

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
        default:
          startDate = 0;
      }

      result = result.filter((s) => s.startedAt >= startDate);
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

    return result;
  }, [allSessions, routineFilter, dateFilter, searchQuery, routineMap]);

  const clearFilters = () => {
    setRoutineFilter('');
    setDateFilter('');
    setSearchQuery('');
  };

  const hasFilters = routineFilter || dateFilter || searchQuery;

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const groups = new Map<string, Session[]>();
    for (const session of filteredSessions) {
      const dateKey = new Date(session.startedAt).toDateString();
      const existing = groups.get(dateKey) ?? [];
      existing.push(session);
      groups.set(dateKey, existing);
    }
    return Array.from(groups.entries());
  }, [filteredSessions]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>History</h1>
        <span className={styles.count}>{filteredSessions.length} sessions</span>
      </header>

      <div className={styles.filters}>
        <Input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
          onChange={(e) => setDateFilter(e.target.value)}
          options={[
            { value: 'week', label: 'Past Week' },
            { value: 'month', label: 'Past Month' },
            { value: '3months', label: 'Past 3 Months' },
          ]}
          placeholder="All time"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      <div className={styles.list}>
        {groupedSessions.map(([dateKey, sessions]) => (
          <div key={dateKey} className={styles.dateGroup}>
            <h3 className={styles.dateHeader}>{dateKey}</h3>
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                routineName={session.routineId ? routineMap.get(session.routineId) : undefined}
                onClick={() => navigate(`/history/${session.id}`)}
              />
            ))}
          </div>
        ))}
        {filteredSessions.length === 0 && (
          <p className={styles.empty}>
            {hasFilters
              ? 'No sessions match your filters.'
              : 'No workout history yet.'}
          </p>
        )}
      </div>

    </div>
  );
}
