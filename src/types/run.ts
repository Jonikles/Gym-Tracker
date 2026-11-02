/**
 * Where a run came from
 */
export type RunSource = 'strava' | 'manual';

/**
 * Kind of run (Strava's Run / TrailRun / VirtualRun, or a treadmill run)
 */
export type RunKind = 'road' | 'trail' | 'treadmill';

/**
 * One kilometre split (from Strava's splits_metric)
 */
export interface RunSplit {
  distance: number; // meters (the last split is usually < 1000)
  movingTime: number; // seconds
  averageHeartrate?: number;
  elevationDifference?: number; // meters
}

/**
 * Fastest segment of a given distance within a run, as computed by Strava
 * (e.g. "1k", "5k", "10k")
 */
export interface RunBestEffort {
  name: string; // Strava's label, e.g. "5k"
  distance: number; // meters
  movingTime: number; // seconds
}

/**
 * Run entity - a run synced from Strava or entered by hand
 */
export interface Run {
  id: string;
  source: RunSource;
  stravaId?: number; // Strava activity id (synced runs only)
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
  /** Strava runs: splits/best efforts fetched (they need a second, per-run request) */
  detailsFetched?: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
