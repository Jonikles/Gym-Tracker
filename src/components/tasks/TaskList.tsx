import { useState } from 'react';
import { Button, Input, Select } from '../common';
import {
  useTasks,
  createTask,
  completeTask,
  uncompleteTask,
  deleteTask,
} from '../../hooks/useTasks';
import { useExercises, useExercise } from '../../hooks/useExercises';
import type { Task } from '../../types';
import styles from './TaskList.module.css';

function TaskItem({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const relatedExercise = useExercise(task.exerciseId);
  const dueExercise = useExercise(task.dueExerciseId);

  return (
    <div className={`${styles.taskItem} ${task.isCompleted ? styles.completed : ''}`}>
      <button className={styles.checkbox} onClick={onToggle} type="button">
        {task.isCompleted ? '✓' : '○'}
      </button>
      <div className={styles.taskContent}>
        <span className={styles.taskText}>{task.text}</span>
        <div className={styles.taskMeta}>
          {relatedExercise && (
            <span className={styles.metaTag}>📎 {relatedExercise.name}</span>
          )}
          {dueExercise && (
            <span className={styles.metaTagDue}>🔔 Due: {dueExercise.name}</span>
          )}
          <span className={styles.taskDate}>
            {new Date(task.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <button className={styles.deleteBtn} onClick={onDelete} type="button">
        ×
      </button>
    </div>
  );
}

export function TaskList() {
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskExerciseId, setNewTaskExerciseId] = useState('');
  const [newTaskDueExerciseId, setNewTaskDueExerciseId] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const tasks = useTasks({ showCompleted });
  const exercises = useExercises() ?? [];

  const handleAddTask = async () => {
    if (!newTaskText.trim()) return;
    await createTask({
      text: newTaskText,
      exerciseId: newTaskExerciseId || undefined,
      dueExerciseId: newTaskDueExerciseId || undefined,
    });
    setNewTaskText('');
    setNewTaskExerciseId('');
    setNewTaskDueExerciseId('');
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isExpanded) {
      handleAddTask();
    }
  };

  const handleToggle = async (task: Task) => {
    if (task.isCompleted) {
      await uncompleteTask(task.id);
    } else {
      await completeTask(task.id);
    }
  };

  const incompleteTasks = tasks.filter((t) => !t.isCompleted);
  const completedTasks = tasks.filter((t) => t.isCompleted);

  const exerciseOptions = exercises.map((ex) => ({
    value: ex.id,
    label: ex.name,
  }));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Tasks</h1>
        <span className={styles.count}>{incompleteTasks.length} open</span>
      </header>

      <div className={styles.addTask}>
        <div className={styles.addTaskRow}>
          <Input
            placeholder="Add a task..."
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsExpanded(true)}
          />
          <Button onClick={handleAddTask} disabled={!newTaskText.trim()}>
            Add
          </Button>
        </div>
        {isExpanded && (
          <div className={styles.addTaskOptions}>
            <Select
              value={newTaskExerciseId}
              onChange={(e) => setNewTaskExerciseId(e.target.value)}
              options={exerciseOptions}
              placeholder="Related exercise (optional)"
            />
            <Select
              value={newTaskDueExerciseId}
              onChange={(e) => setNewTaskDueExerciseId(e.target.value)}
              options={exerciseOptions}
              placeholder="Remind me when doing... (optional)"
            />
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
              Collapse
            </Button>
          </div>
        )}
      </div>

      <div className={styles.list}>
        {incompleteTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={() => handleToggle(task)}
            onDelete={() => deleteTask(task.id)}
          />
        ))}
        {incompleteTasks.length === 0 && (
          <p className={styles.empty}>No open tasks. Nice!</p>
        )}
      </div>

      <div className={styles.toggleRow}>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          <span>Show completed ({completedTasks.length})</span>
        </label>
      </div>

      {showCompleted && completedTasks.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Completed</h2>
          <div className={styles.list}>
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggle(task)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
