import type { RoutePoint } from '../../types/models';
import { buildRouteSpeedSegments } from './routeSpeedSegmentation';

export interface RouteInsightSummary {
  routePoints: number;
  minSpeedKmh?: number;
  maxSpeedKmh?: number;
  averageSpeedKmh?: number;
  verySlowSegmentCount: number;
  nearStopDurationSeconds?: number;
}

/**
 * Derives compact route insights from speed-aware segments.
 *
 * Data honesty rules:
 * - speed metrics are omitted when no reliable segments exist
 * - near-stop duration is shown only when duration deltas are available
 */
export function summarizeRouteInsights(points: RoutePoint[]): RouteInsightSummary {
  const segments = buildRouteSpeedSegments(points);

  if (segments.length === 0) {
    return {
      routePoints: points.length,
      verySlowSegmentCount: 0,
      minSpeedKmh: undefined,
      maxSpeedKmh: undefined,
      averageSpeedKmh: undefined,
      nearStopDurationSeconds: undefined
    };
  }

  const speeds = segments.map((segment) => segment.representativeSpeedKmh);
  const minSpeedKmh = Math.min(...speeds);
  const maxSpeedKmh = Math.max(...speeds);
  const averageSpeedKmh = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;

  const verySlowSegments = segments.filter((segment) => segment.speedBand === 'very-slow');
  const knownNearStopDurations = verySlowSegments
    .map((segment) => segment.durationSeconds)
    .filter((seconds): seconds is number => typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0);

  return {
    routePoints: points.length,
    minSpeedKmh: roundToOneDecimal(minSpeedKmh),
    maxSpeedKmh: roundToOneDecimal(maxSpeedKmh),
    averageSpeedKmh: roundToOneDecimal(averageSpeedKmh),
    verySlowSegmentCount: verySlowSegments.length,
    nearStopDurationSeconds:
      knownNearStopDurations.length > 0
        ? Math.round(knownNearStopDurations.reduce((sum, value) => sum + value, 0))
        : undefined
  };
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
