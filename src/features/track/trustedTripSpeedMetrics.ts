import type { RoutePoint } from '../../types/models';
import { auditRoutePointPipeline } from './trackingCalculations';

export interface TrustedTripSpeedMetrics {
  validSegmentCount: number;
  validDurationSeconds: number;
  validDistanceKm: number;
  averageSpeedKmh?: number;
  maxSpeedKmh?: number;
  minSpeedKmh?: number;
}

/**
 * Central trusted speed policy for persisted trip route points.
 *
 * Only validated segments from the tracking audit pipeline are considered.
 * Gaps/invalid segments are excluded so speed metrics stay realistic.
 */
export function deriveTrustedTripSpeedMetrics(routePoints: RoutePoint[]): TrustedTripSpeedMetrics {
  const audit = auditRoutePointPipeline(routePoints);
  const segments = audit.validatedSegments;

  if (segments.length === 0) {
    return {
      validSegmentCount: 0,
      validDurationSeconds: 0,
      validDistanceKm: 0,
      averageSpeedKmh: undefined,
      maxSpeedKmh: undefined,
      minSpeedKmh: undefined
    };
  }

  const validDurationSeconds = segments.reduce((sum, segment) => sum + segment.elapsedSeconds, 0);
  const validDistanceKm = roundToOneDecimal(segments.reduce((sum, segment) => sum + segment.distanceMeters, 0) / 1000);

  const speeds = segments.map((segment) => segment.representativeSpeedKmh);
  const minSpeedKmh = Math.min(...speeds);
  const maxSpeedKmh = Math.max(...speeds);

  return {
    validSegmentCount: segments.length,
    validDurationSeconds: Math.round(validDurationSeconds),
    validDistanceKm,
    averageSpeedKmh:
      validDurationSeconds > 0
        ? roundToOneDecimal(validDistanceKm / (validDurationSeconds / 3600))
        : undefined,
    maxSpeedKmh: roundToOneDecimal(maxSpeedKmh),
    minSpeedKmh: roundToOneDecimal(minSpeedKmh)
  };
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
