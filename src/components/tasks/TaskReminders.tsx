import { useTasksDueForExercises, completeTask } from '../../hooks/useTasks';
import { useExercise } from '../../hooks/useExercises';
import type { Task } from '../../types';
import styles from './TaskReminders.module.css';

interface TaskRemindersProps {
  exerciseIds: string[];
}

function ReminderItem({ task }: { task: Task }) {
  const exercise = useExercise(task.dueExerciseId);

  return (
    <div className={styles.reminder}>
      <div className={styles.reminderContent}>
        <span className={styles.reminderText}>{task.text}</span>
        {exercise && (
          <span className={styles.reminderExercise}>for {exercise.name}</span>
        )}
      </div>
      <button
        className={styles.doneBtn}
        onClick={() => completeTask(task.id)}
        type="button"
      >
        Done
      </button>
    </div>
  );
}

export function TaskReminders({ exerciseIds }: TaskRemindersProps) {
  const tasks = useTasksDueForExercises(exerciseIds);

  if (tasks.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.icon}>🔔</span>
        <span className={styles.title}>Tasks to remember</span>
      </div>
      <div className={styles.list}>
        {tasks.map((task) => (
          <ReminderItem key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
