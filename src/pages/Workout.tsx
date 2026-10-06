import { ActiveSession } from '../components/session';
import styles from './Workout.module.css';

export function Workout() {
  return (
    <div className={`page ${styles.workoutPage}`}>
      <ActiveSession />
    </div>
  );
}
