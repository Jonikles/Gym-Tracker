import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../common';
import {
  PROGRESSION_DEFINITIONS,
  PROGRESSION_CATEGORIES,
  type ProgressionCategory,
} from '../../data/progressions';
import { useProgressionAchievements } from '../../hooks/useProgressions';
import { useExercises } from '../../hooks/useExercises';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useScrollRestore } from '../../hooks/useScrollRestore';
import styles from './ProgressionList.module.css';

export function ProgressionList() {
  const navigate = useNavigate();
  useScrollRestore();
  const [searchQuery, setSearchQuery] = usePersistedState('progressions.search', '');
  const [expandedCategory, setExpandedCategory] = usePersistedState<ProgressionCategory | null>('progressions.expanded', null);
  const exercises = useExercises();
  const achievements = useProgressionAchievements() ?? {};

  const progressionsByCategory = useMemo(() => {
    const grouped: Record<string, typeof PROGRESSION_DEFINITIONS> = {};
    for (const cat of PROGRESSION_CATEGORIES) {
      grouped[cat] = PROGRESSION_DEFINITIONS.filter((p) => p.category === cat);
    }
    return grouped;
  }, []);

  const progressionStats = useMemo(() => {
    const stats: Record<string, { count: number; maxLevel: number }> = {};
    for (const def of PROGRESSION_DEFINITIONS) {
      const members = exercises.filter((e) =>
        e.progressionMemberships?.some((pm) => pm.progressionId === def.id)
      );
      stats[def.id] = {
        count: members.length,
        maxLevel: Math.max(0, ...members.flatMap((e) =>
          e.progressionMemberships?.filter((pm) => pm.progressionId === def.id).map((pm) => pm.level) ?? []
        )),
      };
    }
    return stats;
  }, [exercises]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return PROGRESSION_CATEGORIES;
    const q = searchQuery.toLowerCase();
    return PROGRESSION_CATEGORIES.filter((cat) =>
      progressionsByCategory[cat]?.some((p) => p.name.toLowerCase().includes(q))
    );
  }, [searchQuery, progressionsByCategory]);

  const toggleCategory = (cat: ProgressionCategory) => {
    setExpandedCategory((prev) => (prev === cat ? null : cat));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Progressions</h1>
      </header>

      <Input
        placeholder="Search progressions..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        autoFocus
      />

      <div className={styles.categories}>
        {filteredCategories.map((cat) => {
          const progs = progressionsByCategory[cat]?.filter(
            (p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
          if (!progs || progs.length === 0) return null;
          const isExpanded = expandedCategory === cat || !!searchQuery;

          return (
            <div key={cat} className={styles.category}>
              <button
                className={styles.categoryHeader}
                onClick={() => toggleCategory(cat)}
              >
                <span className={styles.categoryName}>{cat}</span>
                <span className={styles.categoryCount}>{progs.length}</span>
                <span className={styles.chevron}>{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div className={styles.progressionCards}>
                  {progs.map((prog) => {
                    const stats = progressionStats[prog.id];
                    const achieved = achievements[prog.id];
                    return (
                      <button
                        key={prog.id}
                        className={styles.progressionCard}
                        onClick={() => navigate(`/progressions/${prog.id}`)}
                      >
                        <div className={styles.cardTop}>
                          <span className={styles.progressionName}>{prog.name}</span>
                          {achieved && (
                            <span className={styles.achievedBadge}>
                              Lvl {achieved}
                            </span>
                          )}
                        </div>
                        <div className={styles.cardBottom}>
                          <span className={styles.stat}>
                            {stats?.count ?? 0} exercises
                          </span>
                          <span className={styles.stat}>
                            Max Lvl {stats?.maxLevel ?? 0}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
