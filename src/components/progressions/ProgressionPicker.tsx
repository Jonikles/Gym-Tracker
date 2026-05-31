import { useState, useRef, useEffect, useMemo } from 'react';
import { Modal, Input, Button } from '../common';
import {
  PROGRESSION_DEFINITIONS,
  PROGRESSION_CATEGORIES,
  type ProgressionDefinition,
} from '../../data/progressions';
import styles from './ProgressionPicker.module.css';

interface ProgressionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (progressionId: string) => void;
  excludeProgressionIds?: string[];
}

export function ProgressionPicker({
  isOpen,
  onClose,
  onSelect,
  excludeProgressionIds = [],
}: ProgressionPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    let results = PROGRESSION_DEFINITIONS.filter(
      (p) => !excludeProgressionIds.includes(p.id)
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    return results;
  }, [searchQuery, excludeProgressionIds]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, ProgressionDefinition[]> = {};
    for (const cat of PROGRESSION_CATEGORIES) {
      const items = filtered.filter((p) => p.category === cat);
      if (items.length > 0) {
        groups[cat] = items;
      }
    }
    return groups;
  }, [filtered]);

  const handleSelect = (progressionId: string) => {
    onSelect(progressionId);
    onClose();
    setSearchQuery('');
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Select Progression">
      <div className={styles.container}>
        <div className={styles.filters}>
          <Input
            ref={searchRef}
            placeholder="Search progressions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.list}>
          {Object.entries(grouped).map(([category, progressions]) => (
            <div key={category} className={styles.categoryGroup}>
              <div className={styles.categoryHeader}>{category}</div>
              {progressions.map((progression) => (
                <button
                  key={progression.id}
                  className={styles.progressionItem}
                  onClick={() => handleSelect(progression.id)}
                >
                  <span className={styles.progressionName}>{progression.name}</span>
                  <span className={styles.arrow}>&rsaquo;</span>
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className={styles.empty}>No progressions found.</p>
          )}
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
