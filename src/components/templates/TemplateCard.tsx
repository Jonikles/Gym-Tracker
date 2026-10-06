import { useNavigate } from 'react-router-dom';
import { Card } from '../common';
import type { Template } from '../../types';
import styles from './TemplateCard.module.css';

export function TemplateCard({ template }: { template: Template }) {
  const navigate = useNavigate();

  const exerciseCount = template.exercises.length;
  const totalSets = template.exercises.reduce((sum, e) => sum + e.sets.length, 0);

  // Group by technique (count exercises that have non-standard techniques)
  const techniqueCounts = template.exercises.reduce((acc, e) => {
    for (const set of e.sets) {
      if (set.intensityTechnique !== 'standard') {
        acc[set.intensityTechnique] = (acc[set.intensityTechnique] || 0) + 1;
      }
    }
    return acc;
  }, {} as Record<string, number>);

  const hasSpecialTechniques = Object.keys(techniqueCounts).length > 0;

  return (
    <Card
      className={styles.card}
      onClick={() => navigate(`/templates/${template.id}`)}
      interactive
    >
      <div className={styles.content}>
        <h3 className={styles.name}>{template.name}</h3>
        <div className={styles.stats}>
          <span>
            <span className={`num ${styles.statValue}`}>{exerciseCount}</span> exercises
          </span>
          <span>
            <span className={`num ${styles.statValue}`}>{totalSets}</span> sets
          </span>
        </div>
        {hasSpecialTechniques && (
          <div className={styles.techniques}>
            {Object.entries(techniqueCounts).map(([technique, count]) => (
              <span key={technique} className={`chip num ${styles.technique}`}>
                {technique} ({count})
              </span>
            ))}
          </div>
        )}
      </div>
      <span className={styles.chevron} aria-hidden="true">›</span>
    </Card>
  );
}
