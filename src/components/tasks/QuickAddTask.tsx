import { useState } from 'react';
import { Button, Input, Modal, Select } from '../common';
import { createTask } from '../../hooks/useTasks';
import { useExercises } from '../../hooks/useExercises';
import styles from './QuickAddTask.module.css';

interface QuickAddTaskProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

export function QuickAddTask({
  isOpen,
  onClose,
  sessionId,
}: QuickAddTaskProps) {
  const [text, setText] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [dueExerciseId, setDueExerciseId] = useState('');

  const exercises = useExercises() ?? [];

  const handleSubmit = async () => {
    if (!text.trim()) return;

    await createTask({
      text,
      sessionId,
      exerciseId: exerciseId || undefined,
      dueExerciseId: dueExerciseId || undefined,
    });

    setText('');
    setExerciseId('');
    setDueExerciseId('');
    onClose();
  };

  const handleClose = () => {
    setText('');
    setExerciseId('');
    setDueExerciseId('');
    onClose();
  };

  const exerciseOptions = exercises.map((ex) => ({
    value: ex.id,
    label: ex.name,
  }));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Task">
      <div className={styles.form}>
        <Input
          placeholder="What do you need to remember?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <Select
          label="Related to"
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
          options={exerciseOptions}
          placeholder="Select exercise (optional)"
        />
        <Select
          label="Remind me when doing"
          value={dueExerciseId}
          onChange={(e) => setDueExerciseId(e.target.value)}
          options={exerciseOptions}
          placeholder="Select exercise (optional)"
        />
        <div className={styles.actions}>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!text.trim()}>
            Add Task
          </Button>
        </div>
      </div>
    </Modal>
  );
}
