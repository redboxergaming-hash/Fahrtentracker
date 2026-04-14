import type { RoutePoint } from '../../types/models';
import { deriveTrustedTripSpeedMetrics } from './trustedTripSpeedMetrics';

export interface RouteInsightSummary {
  routePoints: number;
  minSpeedKmh?: number;
  maxSpeedKmh?: number;
  averageSpeedKmh?: number;
  verySlowSegmentCount: number;
  nearStopDurationSeconds?: number;
}

const VERY_SLOW_SPEED_THRESHOLD_KMH = 10;

/**
 * Derives compact route insights from trusted segments only.
 *
 * Data honesty rules:
 * - speed metrics are omitted when no reliable segments exist
 * - near-stop duration is shown only when validated segment durations are available
 */
export function summarizeRouteInsights(points: RoutePoint[]): RouteInsightSummary {
  const trusted = deriveTrustedTripSpeedMetrics(points);

  if (trusted.validSegmentCount === 0) {
    return {
      routePoints: points.length,
      verySlowSegmentCount: 0,
      minSpeedKmh: undefined,
      maxSpeedKmh: undefined,
      averageSpeedKmh: undefined,
      nearStopDurationSeconds: undefined
    };
  }

  const validSegments = points.length > 1 ? trusted.validSegmentCount : 0;
  const averageValidSegmentDurationSeconds =
    validSegments > 0
      ? Math.max(1, Math.round(trusted.validDurationSeconds / validSegments))
      : 0;

  const verySlowSegmentCount = trusted.minSpeedKmh !== undefined && trusted.minSpeedKmh <= VERY_SLOW_SPEED_THRESHOLD_KMH
    ? 1
    : 0;

  return {
    routePoints: points.length,
    minSpeedKmh: trusted.minSpeedKmh,
    maxSpeedKmh: trusted.maxSpeedKmh,
    averageSpeedKmh: trusted.averageSpeedKmh,
    verySlowSegmentCount,
    nearStopDurationSeconds:
      verySlowSegmentCount > 0 && averageValidSegmentDurationSeconds > 0
        ? averageValidSegmentDurationSeconds
        : undefined
  };
}
