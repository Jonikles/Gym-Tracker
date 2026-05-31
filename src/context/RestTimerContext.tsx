import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { useSetting } from '../hooks/useSettings';

interface RestTimerState {
  /** Whether the timer is currently counting down */
  isRunning: boolean;
  /** Seconds remaining */
  remaining: number;
  /** Total seconds for the current countdown (for progress bar) */
  total: number;
  /** Start the rest timer (optionally override duration) */
  start: (durationOverride?: number) => void;
  /** Skip / dismiss the timer */
  skip: () => void;
  /** Add time to the running timer */
  addTime: (seconds: number) => void;
}

const RestTimerContext = createContext<RestTimerState | null>(null);

export function useRestTimer(): RestTimerState {
  const ctx = useContext(RestTimerContext);
  if (!ctx) throw new Error('useRestTimer must be used within RestTimerProvider');
  return ctx;
}

// Generate a short beep using Web Audio API
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880; // A5
    oscillator.type = 'sine';
    gain.gain.value = 0.3;

    oscillator.start();
    // Two beeps
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0, ctx.currentTime + 0.4);
    oscillator.stop(ctx.currentTime + 0.5);

    // Cleanup
    setTimeout(() => ctx.close(), 600);
  } catch {
    // Audio not available
  }
}

function vibrate() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  } catch {
    // Vibration not available
  }
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const defaultDuration = useSetting('restTimerDuration');
  const soundEnabled = useSetting('restTimerSound');
  const vibrateEnabled = useSetting('restTimerVibrate');

  const [isRunning, setIsRunning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(0);

  // Keep ref in sync
  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const onComplete = useCallback(() => {
    cleanup();
    setIsRunning(false);
    setRemaining(0);

    if (soundEnabled) playBeep();
    if (vibrateEnabled) vibrate();
  }, [cleanup, soundEnabled, vibrateEnabled]);

  const start = useCallback((durationOverride?: number) => {
    const duration = durationOverride ?? defaultDuration;
    if (duration <= 0) return; // Timer disabled

    cleanup();
    setTotal(duration);
    setRemaining(duration);
    remainingRef.current = duration;
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1;
      if (remainingRef.current <= 0) {
        setRemaining(0);
        onComplete();
      } else {
        setRemaining(remainingRef.current);
      }
    }, 1000);
  }, [defaultDuration, cleanup, onComplete]);

  const skip = useCallback(() => {
    cleanup();
    setIsRunning(false);
    setRemaining(0);
  }, [cleanup]);

  const addTime = useCallback((seconds: number) => {
    if (!isRunning) return;
    setRemaining((prev) => {
      const newVal = prev + seconds;
      remainingRef.current = newVal;
      return newVal;
    });
    setTotal((prev) => prev + seconds);
  }, [isRunning]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  return (
    <RestTimerContext.Provider value={{ isRunning, remaining, total, start, skip, addTime }}>
      {children}
    </RestTimerContext.Provider>
  );
}
