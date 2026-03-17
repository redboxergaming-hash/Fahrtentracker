import type { RoutePoint } from '../../types/models';

const EARTH_RADIUS_METERS = 6_371_000;
const DEFAULT_MAX_ACCURACY_METERS = 120;
const DEFAULT_MAX_POINT_GAP_METERS = 5_000;
const DEFAULT_MAX_DERIVED_SPEED_KMH = 220;

/**
 * Browser geolocation can report low-quality points (poor accuracy spikes, old timestamps,
 * and missing speed). Keep filtering/sanitization in reusable helpers so UI stays clean.
 */
export function sanitizeRoutePoints(
  points: RoutePoint[],
  options?: { maxAccuracyMeters?: number; maxPointGapMeters?: number; maxDerivedSpeedKmh?: number }
): RoutePoint[] {
  const maxAccuracyMeters = options?.maxAccuracyMeters ?? DEFAULT_MAX_ACCURACY_METERS;
  const maxPointGapMeters = options?.maxPointGapMeters ?? DEFAULT_MAX_POINT_GAP_METERS;
  const maxDerivedSpeedKmh = options?.maxDerivedSpeedKmh ?? DEFAULT_MAX_DERIVED_SPEED_KMH;

  const sanitized: RoutePoint[] = [];

  for (const point of points) {
    if (!isFiniteCoordinate(point.lat) || !isFiniteCoordinate(point.lng)) continue;

    if (point.accuracy !== undefined && point.accuracy > maxAccuracyMeters) continue;

    const timestampMs = toTimestampMs(point.timestamp);
    if (timestampMs === undefined) continue;

    const previous = sanitized[sanitized.length - 1];
    if (!previous) {
      sanitized.push(point);
      continue;
    }

    const previousTimestampMs = toTimestampMs(previous.timestamp);
    if (previousTimestampMs === undefined || timestampMs <= previousTimestampMs) continue;

    const pointDistanceMeters = calculateDistanceMeters(previous, point);
    if (pointDistanceMeters > maxPointGapMeters) continue;

    const elapsedSeconds = (timestampMs - previousTimestampMs) / 1000;
    if (elapsedSeconds <= 0) continue;

    const derivedSpeedKmh = (pointDistanceMeters / elapsedSeconds) * 3.6;
    if (derivedSpeedKmh > maxDerivedSpeedKmh) continue;

    sanitized.push(point);
  }

  return sanitized;
}

export function calculateDistanceMeters(
  from: Pick<RoutePoint, 'lat' | 'lng'>,
  to: Pick<RoutePoint, 'lat' | 'lng'>
): number {
  const fromLatRad = toRadians(from.lat);
  const toLatRad = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const sinDeltaLat = Math.sin(deltaLat / 2);
  const sinDeltaLng = Math.sin(deltaLng / 2);

  const haversine =
    sinDeltaLat * sinDeltaLat +
    Math.cos(fromLatRad) * Math.cos(toLatRad) * sinDeltaLng * sinDeltaLng;

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_METERS * arc;
}

export function calculateCumulativeDistanceKm(points: RoutePoint[]): number {
  if (points.length < 2) return 0;

  let totalMeters = 0;
  for (let index = 1; index < points.length; index += 1) {
    totalMeters += calculateDistanceMeters(points[index - 1], points[index]);
  }

  return roundToOneDecimal(totalMeters / 1000);
}

/**
 * `GeolocationPosition.coords.speed` can be null on many devices/browsers.
 * Fallback to coordinate/time deltas when speed is not available.
 */
export function deriveCurrentSpeedKmh(points: RoutePoint[]): number {
  if (points.length < 2) return 0;

  const latest = points[points.length - 1];
  if (latest.speedKmh !== undefined && latest.speedKmh >= 0) {
    return roundToOneDecimal(latest.speedKmh);
  }

  const previous = points[points.length - 2];
  const elapsedSeconds = calculateElapsedSeconds(previous.timestamp, latest.timestamp);
  if (elapsedSeconds <= 0) return 0;

  const distanceMeters = calculateDistanceMeters(previous, latest);
  return deriveSpeedKmh(distanceMeters, elapsedSeconds);
}

export function deriveAverageSpeedKmh(distanceKm: number, elapsedSeconds: number): number {
  if (distanceKm <= 0 || elapsedSeconds <= 0) return 0;
  return roundToOneDecimal(distanceKm / (elapsedSeconds / 3600));
}

export function deriveMaxSpeedKmh(points: RoutePoint[]): number {
  if (points.length === 0) return 0;

  let maxSpeed = 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (point.speedKmh !== undefined && point.speedKmh > maxSpeed) {
      maxSpeed = point.speedKmh;
      continue;
    }

    if (index === 0) continue;

    const previous = points[index - 1];
    const elapsedSeconds = calculateElapsedSeconds(previous.timestamp, point.timestamp);
    if (elapsedSeconds <= 0) continue;

    const derivedSpeed = deriveSpeedKmh(calculateDistanceMeters(previous, point), elapsedSeconds);
    if (derivedSpeed > maxSpeed) {
      maxSpeed = derivedSpeed;
    }
  }

  return roundToOneDecimal(maxSpeed);
}

function deriveSpeedKmh(distanceMeters: number, elapsedSeconds: number): number {
  if (distanceMeters <= 0 || elapsedSeconds <= 0) return 0;
  const metersPerSecond = distanceMeters / elapsedSeconds;
  return roundToOneDecimal(metersPerSecond * 3.6);
}

function calculateElapsedSeconds(fromTimestamp: string, toTimestamp: string): number {
  const fromMs = toTimestampMs(fromTimestamp);
  const toMs = toTimestampMs(toTimestamp);
  if (fromMs === undefined || toMs === undefined || toMs <= fromMs) return 0;
  return (toMs - fromMs) / 1000;
}

function isFiniteCoordinate(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= 180;
}

function toTimestampMs(value: string): number | undefined {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
