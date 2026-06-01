import { Link, useNavigate } from 'react-router-dom';
import { Button, ConfirmDialog } from '../components/common';
import { useRoutine, useTodaysTemplate } from '../hooks/useRoutines';
import {
  useActiveSession,
  startSessionFromTemplate,
  skipWorkout,
  markSick,
  useTodaysSession,
} from '../hooks/useSessions';
import { useSessionContext } from '../context/SessionContext';
import { useSetting } from '../hooks/useSettings';
import { useStreaks } from '../hooks/useStreaks';
import { useState } from 'react';
import styles from './Home.module.css';

function StreakDisplay() {
  const streaks = useStreaks();
  if (!streaks || streaks.totalWorkouts === 0) return null;

  return (
    <div className={styles.streakBar}>
      <div className={styles.streakItem}>
        <span className={styles.streakValue}>{streaks.currentStreak}</span>
        <span className={styles.streakLabel}>Current Streak</span>
      </div>
      <div className={styles.streakDivider} />
      <div className={styles.streakItem}>
        <span className={styles.streakValue}>{streaks.longestStreak}</span>
        <span className={styles.streakLabel}>Best Streak</span>
      </div>
      <div className={styles.streakDivider} />
      <div className={styles.streakItem}>
        <span className={styles.streakValue}>{streaks.totalWorkouts}</span>
        <span className={styles.streakLabel}>Total</span>
      </div>
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const activeSession = useActiveSession();
  const { startBlank, isLoading } = useSessionContext();

  // Get active routine from settings
  const activeRoutineId = useSetting('activeRoutineId');
  const activeRoutine = useRoutine(activeRoutineId ?? undefined);

  // Get week start day setting
  const weekStartDay = useSetting('weekStartDay');

  // Get today's template based on active routine
  const todaysWorkout = useTodaysTemplate(weekStartDay);

  // Get today's session if already completed
  const todaysSession = useTodaysSession(activeRoutineId);

  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showSickConfirm, setShowSickConfirm] = useState(false);

  // If there's an active session, show continue button
  if (activeSession) {
    return (
      <div className="page">
        <div className={styles.hero}>
          <h1 className={styles.title}>Workout in Progress</h1>
          <p className={styles.subtitle}>
            Started {new Date(activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className={styles.actions}>
          <Link to="/workout">
            <Button size="lg">Continue Workout</Button>
          </Link>
        </div>

        <StreakDisplay />
      </div>
    );
  }

  // Check if today's workout is already completed
  if (todaysSession) {
    const duration = todaysSession.completedAt
      ? Math.floor((todaysSession.completedAt - todaysSession.startedAt) / 60000)
      : 0;

    return (
      <div className="page">
        <div className={styles.hero}>
          {activeRoutine && (
            <Link to={`/routines/${activeRoutine.id}`} className={styles.routineLink}>
              Current Routine: {activeRoutine.name}
            </Link>
          )}
          <h1 className={styles.title}>Workout Complete! 🎉</h1>
        </div>

        <div className={styles.completedCard}>
          <p className={styles.completedTemplate}>
            {todaysWorkout?.template.name ?? 'Workout'}
          </p>
          {todaysSession.status === 'completed' && (
            <>
              <p className={styles.completedStat}>Duration: {duration} min</p>
              <Link to={`/history/${todaysSession.id}`}>
                <Button variant="secondary">View Details</Button>
              </Link>
            </>
          )}
          {todaysSession.status === 'skipped' && (
            <p className={styles.statusBadge + ' ' + styles.skipped}>Skipped</p>
          )}
          {todaysSession.status === 'sick' && (
            <p className={styles.statusBadge + ' ' + styles.sick}>Marked as Sick</p>
          )}
        </div>

        <div className={styles.otherOptions}>
          <Button variant="secondary" onClick={startBlank} disabled={isLoading}>
            Start Another Workout
          </Button>
        </div>

        <StreakDisplay />
      </div>
    );
  }

  const handleStartFromTemplate = async () => {
    if (!todaysWorkout) return;
    await startSessionFromTemplate(todaysWorkout.template.id, todaysWorkout.routine.id);
    navigate('/workout');
  };

  const handleSkip = async () => {
    if (!todaysWorkout) return;
    await skipWorkout(todaysWorkout.routine.id, todaysWorkout.template.id);
    setShowSkipConfirm(false);
  };

  const handleSick = async () => {
    if (!todaysWorkout) return;
    await markSick(todaysWorkout.routine.id, todaysWorkout.template.id);
    setShowSickConfirm(false);
  };

  // No active routine selected
  if (!activeRoutineId || !activeRoutine) {
    return (
      <div className="page">
        <div className={styles.hero}>
          <h1 className={styles.title}>Gym Tracker</h1>
          <p className={styles.subtitle}>Track your workouts. See your progress.</p>
        </div>

        <div className={styles.noRoutineCard}>
          <p className={styles.noRoutineText}>No routine selected</p>
          <Link to="/routines">
            <Button size="lg">Choose a Routine</Button>
          </Link>
          <div className={styles.divider}>
            <span>or</span>
          </div>
          <Button variant="secondary" onClick={startBlank} disabled={isLoading}>
            Start Blank Workout
          </Button>
        </div>

        <StreakDisplay />
      </div>
    );
  }

  // Check if today is a rest day
  const isRestDay = todaysWorkout === undefined || !todaysWorkout.template;

  if (isRestDay) {
    return (
      <div className="page">
        <div className={styles.hero}>
          <h1 className={styles.title}>
            <Link to={`/routines/${activeRoutine.id}`}>
              Current Routine: {activeRoutine.name}
            </Link>
          </h1>
          <h2 className={styles.RestDaySubtitle}>Rest Day 😴</h2>
          <p className={styles.caption}>Take it easy today</p>
        </div>

        <div className={styles.otherOptions}>
          <Button variant="secondary" onClick={startBlank} disabled={isLoading}>
            Start Unplanned Workout
          </Button>
        </div>

        <StreakDisplay />
      </div>
    );
  }

  // Normal workout day
  return (
    <div className="page">
      <div className={styles.hero}>
        <h1 className={styles.title}>
          <Link to={`/routines/${activeRoutine.id}`}>
            Current Routine: {activeRoutine.name}
          </Link>
        </h1>
        <h2 className={styles.WorkoutDaySubtitle}>
          <Link to={`/templates/${todaysWorkout.template.id}`}>
            Today: {todaysWorkout.template.name}
          </Link>
        </h2>
      </div>

      <div className={styles.startSection}>
        <Button size="lg" onClick={handleStartFromTemplate} disabled={isLoading}>
          Start Workout
        </Button>

        <div className={styles.skipButtons}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSkipConfirm(true)}
          >
            Skip
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSickConfirm(true)}
          >
            Sick
          </Button>
        </div>
      </div>

      <div className={styles.otherOptions}>
        <Button variant="secondary" onClick={startBlank} disabled={isLoading}>
          Blank Workout
        </Button>
      </div>

      {/* Skip Confirmation */}
      <ConfirmDialog
        isOpen={showSkipConfirm}
        onClose={() => setShowSkipConfirm(false)}
        onConfirm={handleSkip}
        title="Skip Workout"
        message="Mark today's workout as skipped? This will move to the next day in your routine."
        confirmLabel="Skip"
        variant="danger"
      />

      {/* Sick Confirmation */}
      <ConfirmDialog
        isOpen={showSickConfirm}
        onClose={() => setShowSickConfirm(false)}
        onConfirm={handleSick}
        title="Mark as Sick"
        message="Mark today as a sick day? This will move to the next day in your routine."
        confirmLabel="Mark Sick"
        variant="danger"
      />

      <StreakDisplay />
    </div>
  );
}
