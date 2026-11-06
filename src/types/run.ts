/**
 * Where a run came from
 */
export type RunSource = 'garmin' | 'strava' | 'manual'; // 'strava': runs synced before the Garmin connection

/**
 * Kind of run (Strava's Run / TrailRun / VirtualRun, or a treadmill run)
 */
export type RunKind = 'road' | 'trail' | 'treadmill';

/**
 * One kilometre split
 */
export interface RunSplit {
  distance: number; // meters (the last split is usually < 1000)
  movingTime: number; // seconds
  averageHeartrate?: number;
  elevationDifference?: number; // meters
}

/**
 * Fastest segment of a given distance within a run
 * (e.g. "1k", "5k", "10k")
 */
export interface RunBestEffort {
  name: string; // e.g. "5k" (see BEST_TIME_DISTANCES in utils/runStats.ts)
  distance: number; // meters
  movingTime: number; // seconds
}

/**
 * Run entity - a run synced from Garmin (or, earlier, Strava) or entered by hand
 */
export interface Run {
  id: string;
  source: RunSource;
  garminId?: number; // Garmin activity id (Garmin runs only)
  stravaId?: number; // Strava activity id (older Strava-synced runs)
  name: string;
  kind: RunKind;
  startedAt: number; // ms timestamp
  distance: number; // meters
  movingTime: number; // seconds
  elapsedTime?: number; // seconds, including stops
  averageHeartrate?: number;
  maxHeartrate?: number;
  averageCadence?: number; // steps per minute (both feet)
  elevationGain?: number; // meters
  splits?: RunSplit[];
  bestEfforts?: RunBestEffort[];
  /** Synced runs: splits/best efforts fetched (they need a second, per-run request) */
  detailsFetched?: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
