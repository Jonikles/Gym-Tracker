import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Select, Button, Modal } from '../common';
import { RoutineCard } from './RoutineCard';
import { RoutineForm, type RoutineFormData } from './RoutineForm';
import {
  useRoutines,
  createRoutine,
  type RoutineFilters,
} from '../../hooks/useRoutines';
import { useSetting } from '../../hooks/useSettings';
import type { RoutineType } from '../../types';
import styles from './RoutineList.module.css';

type SortOrder = 'recent' | 'name-asc' | 'name-desc';

const DRAFT_ROUTINE_KEY = 'draftRoutineId';

export function RoutineList() {
  const navigate = useNavigate();
  const activeRoutineId = useSetting('activeRoutineId');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RoutineType | ''>('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const filters: RoutineFilters = {
    searchQuery,
    type: typeFilter || undefined,
    includeArchived: showArchived,
  };

  const routines = useRoutines(filters);

  // If there's a draft routine in progress, redirect to it
  useEffect(() => {
    const draftId = sessionStorage.getItem(DRAFT_ROUTINE_KEY);
    if (draftId && routines.some((r) => r.id === draftId)) {
      navigate(`/routines/${draftId}`, { replace: true });
    }
  }, [routines, navigate]);

    const sortedRoutines = useMemo(() => {
        const list = [...routines];

        // Always put active routine first
        list.sort((a, b) => {
            if (a.id === activeRoutineId) return -1;
            if (b.id === activeRoutineId) return 1;

            switch (sortOrder) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'recent':
                default:
                    return b.updatedAt - a.updatedAt;
            }
        }); return list;
    }, [routines, sortOrder, activeRoutineId]);

  const handleCreate = async (data: RoutineFormData) => {
    setCreateError(null);
    try {
      const id = await createRoutine(data);
      setIsCreateModalOpen(false);
      // Mark as draft so navigating away and back returns here
      sessionStorage.setItem(DRAFT_ROUTINE_KEY, id);
      navigate(`/routines/${id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create routine');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('');
  };

  const hasFilters = searchQuery || typeFilter;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Routines</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          New Routine
        </Button>
      </header>

      <div className={styles.filters}>
        <Input
          placeholder="Search routines..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as RoutineType | '')}
          options={[
            { value: 'fixed', label: 'Fixed' },
            { value: 'rolling', label: 'Rolling' },
          ]}
          placeholder="All types"
        />
        <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            options={[
                { value: 'recent', label: 'Recent' },
                { value: 'name-asc', label: 'A → Z' },
                { value: 'name-desc', label: 'Z → A' },
            ]}
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        )}
      </div>

      <div className={styles.toggleRow}>
        <label className={styles.toggle}>
          <input className={styles.toggleInput}
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          <span>Show archived</span>
        </label>
        <span className={styles.count}>{routines.length} routines</span>
      </div>

    <div className={styles.list}>
        {sortedRoutines.map((routine) => (
            <div
                key={routine.id}
                className={`${styles.cardWrapper} ${routine.id === activeRoutineId ? styles.activeWrapper : ''}`}
            >
                {routine.id === activeRoutineId && (
                    <span className={styles.activeBadge}>Active</span>
                )}
                <RoutineCard
                    routine={routine}
                    onClick={() => navigate(`/routines/${routine.id}`)}
                />
            </div>
        ))}
        {sortedRoutines.length === 0 && (
            <p className={styles.empty}>
                {hasFilters
                    ? 'No routines match your filters.'
                    : 'No routines yet. Create one to get started.'}
            </p>
        )}
    </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="New Routine"
      >
        <RoutineForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          error={createError}
        />
      </Modal>
    </div>
  );
}
