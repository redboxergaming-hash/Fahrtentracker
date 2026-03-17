import type { RoutePoint } from '../../types/models';

export type TrackingStatus = 'idle' | 'active' | 'paused' | 'stopped';

export type GpsAvailabilityStatus =
  | 'unknown'
  | 'acquiring'
  | 'available'
  | 'temporarily-unavailable'
  | 'denied'
  | 'error';

export interface TrackingGeolocationError {
  code: number;
  message: string;
  occurredAt: string;
}

export interface TrackingPosition {
  lat: number;
  lng: number;
  timestamp: string;
  accuracy?: number;
  altitude?: number;
  speedKmh?: number;
  heading?: number;
}

export interface TrackingSession {
  selectedVehicleId?: string;
  status: TrackingStatus;
  gpsAvailability: GpsAvailabilityStatus;
  startedAt?: string;
  pausedAt?: string;
  accumulatedPausedSeconds: number;
  currentPosition?: TrackingPosition;
  lastSuccessfulGpsAt?: string;
  routePoints: RoutePoint[];
  elapsedSeconds: number;
  totalDistanceKm: number;
  currentSpeedKmh: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  geolocationError?: TrackingGeolocationError;
}

export const initialTrackingSession: TrackingSession = {
  selectedVehicleId: undefined,
  status: 'idle',
  gpsAvailability: 'unknown',
  startedAt: undefined,
  pausedAt: undefined,
  accumulatedPausedSeconds: 0,
  currentPosition: undefined,
  lastSuccessfulGpsAt: undefined,
  routePoints: [],
  elapsedSeconds: 0,
  totalDistanceKm: 0,
  currentSpeedKmh: 0,
  averageSpeedKmh: 0,
  maxSpeedKmh: 0,
  geolocationError: undefined
};
