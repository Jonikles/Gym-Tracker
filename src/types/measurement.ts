/**
 * Body measurement entry — tracks bodyweight and optional body part measurements over time.
 */
export interface BodyMeasurement {
  id: string;
  date: number; // Date.now() — one entry per day conceptually
  bodyweight?: number; // kg
  neck?: number; // cm
  shoulders?: number;
  chest?: number;
  leftBicep?: number;
  rightBicep?: number;
  waist?: number;
  hips?: number;
  leftThigh?: number;
  rightThigh?: number;
  leftCalf?: number;
  rightCalf?: number;
  createdAt: number;
  updatedAt: number;
}

/** All optional measurement fields (excluding bodyweight) */
export const MEASUREMENT_FIELDS = [
  { key: 'neck', label: 'Neck' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'chest', label: 'Chest' },
  { key: 'leftBicep', label: 'L Bicep' },
  { key: 'rightBicep', label: 'R Bicep' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'leftThigh', label: 'L Thigh' },
  { key: 'rightThigh', label: 'R Thigh' },
  { key: 'leftCalf', label: 'L Calf' },
  { key: 'rightCalf', label: 'R Calf' },
] as const;

export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number]['key'];
