import type { RoutePoint } from '../../types/models';

const EARTH_RADIUS_METERS = 6_371_000;
const DEFAULT_MAX_ACCURACY_METERS = 120;
const DEFAULT_MAX_POINT_GAP_METERS = 5_000;
const DEFAULT_MAX_POINT_GAP_SECONDS = 90;
const DEFAULT_MAX_DERIVED_SPEED_KMH = 220;
const DEFAULT_MAX_BROWSER_DERIVED_DELTA_KMH = 65;

export type UnreliablePointReason =
  | 'invalid-coordinate'
  | 'invalid-timestamp'
  | 'low-accuracy'
  | 'non-increasing-timestamp';

export type TrackingGapReason = 'signal-gap' | 'jumped-distance';

export type DiscardedSpeedEstimateReason =
  | 'invalid-duration'
  | 'gap-segment'
  | 'exceeds-max-derived-speed'
  | 'browser-derived-mismatch'
  | 'missing-speed-source';

export type TrustedSpeedSource = 'browser-reported' | 'derived-adjacent-points';

export interface ValidRoutePoint {
  point: RoutePoint;
  rawIndex: number;
}

export interface UnreliableRoutePoint {
  point: RoutePoint;
  rawIndex: number;
  reason: UnreliablePointReason;
}

export interface TrackingGap {
  start: RoutePoint;
  end: RoutePoint;
  startIndex: number;
  endIndex: number;
  reason: TrackingGapReason;
  elapsedSeconds: number;
  distanceMeters: number;
}

export interface DiscardedSpeedEstimate {
  start: RoutePoint;
  end: RoutePoint;
  startIndex: number;
  endIndex: number;
  reason: DiscardedSpeedEstimateReason;
  elapsedSeconds?: number;
  distanceMeters?: number;
  derivedSpeedKmh?: number;
  browserSpeedKmh?: number;
}

export interface ValidatedRouteSegment {
  start: RoutePoint;
  end: RoutePoint;
  startIndex: number;
  endIndex: number;
  distanceMeters: number;
  elapsedSeconds: number;
  representativeSpeedKmh: number;
  speedSource: TrustedSpeedSource;
}

export interface RoutePointAuditResult {
  validPoints: ValidRoutePoint[];
  unreliablePoints: UnreliableRoutePoint[];
  gaps: TrackingGap[];
  discardedSpeedEstimates: DiscardedSpeedEstimate[];
  validatedSegments: ValidatedRouteSegment[];
}

export interface RoutePointAuditOptions {
  maxAccuracyMeters?: number;
  maxPointGapMeters?: number;
  maxPointGapSeconds?: number;
  maxDerivedSpeedKmh?: number;
  maxBrowserDerivedDeltaKmh?: number;
}

/**
 * Tracking quality policy:
 * - Keep raw points untouched for diagnostics.
 * - Mark invalid/low-trust points and keep them out of metrics.
 * - Detect GPS/data gaps (large time or distance jumps) and avoid deriving speed across gaps.
 * - Build trusted validated segments only when distance/time/speed checks pass.
 *
 * This prevents unrealistically high speed spikes after temporary signal loss.
 */
export function auditRoutePointPipeline(
  rawPoints: RoutePoint[],
  options?: RoutePointAuditOptions
): RoutePointAuditResult {
  const maxAccuracyMeters = options?.maxAccuracyMeters ?? DEFAULT_MAX_ACCURACY_METERS;
  const maxPointGapMeters = options?.maxPointGapMeters ?? DEFAULT_MAX_POINT_GAP_METERS;
  const maxPointGapSeconds = options?.maxPointGapSeconds ?? DEFAULT_MAX_POINT_GAP_SECONDS;
  const maxDerivedSpeedKmh = options?.maxDerivedSpeedKmh ?? DEFAULT_MAX_DERIVED_SPEED_KMH;
  const maxBrowserDerivedDeltaKmh = options?.maxBrowserDerivedDeltaKmh ?? DEFAULT_MAX_BROWSER_DERIVED_DELTA_KMH;

  const validPoints: ValidRoutePoint[] = [];
  const unreliablePoints: UnreliableRoutePoint[] = [];
  const gaps: TrackingGap[] = [];
  const discardedSpeedEstimates: DiscardedSpeedEstimate[] = [];
  const validatedSegments: ValidatedRouteSegment[] = [];

  for (let rawIndex = 0; rawIndex < rawPoints.length; rawIndex += 1) {
    const point = rawPoints[rawIndex];

    if (!isFiniteCoordinate(point.lat) || !isFiniteCoordinate(point.lng)) {
      unreliablePoints.push({ point, rawIndex, reason: 'invalid-coordinate' });
      continue;
    }

    if (point.accuracy !== undefined && point.accuracy > maxAccuracyMeters) {
      unreliablePoints.push({ point, rawIndex, reason: 'low-accuracy' });
      continue;
    }

    const timestampMs = toTimestampMs(point.timestamp);
    if (timestampMs === undefined) {
      unreliablePoints.push({ point, rawIndex, reason: 'invalid-timestamp' });
      continue;
    }

    const previousValid = validPoints[validPoints.length - 1];
    if (!previousValid) {
      validPoints.push({ point, rawIndex });
      continue;
    }

    const previousTimestampMs = toTimestampMs(previousValid.point.timestamp);
    if (previousTimestampMs === undefined || timestampMs <= previousTimestampMs) {
      unreliablePoints.push({ point, rawIndex, reason: 'non-increasing-timestamp' });
      continue;
    }

    const elapsedSeconds = (timestampMs - previousTimestampMs) / 1000;
    const distanceMeters = calculateDistanceMeters(previousValid.point, point);

    validPoints.push({ point, rawIndex });

    const gapReason = detectGapReason(elapsedSeconds, distanceMeters, maxPointGapSeconds, maxPointGapMeters);

    if (gapReason) {
      gaps.push({
        start: previousValid.point,
        end: point,
        startIndex: previousValid.rawIndex,
        endIndex: rawIndex,
        reason: gapReason,
        elapsedSeconds,
        distanceMeters
      });

      discardedSpeedEstimates.push({
        start: previousValid.point,
        end: point,
        startIndex: previousValid.rawIndex,
        endIndex: rawIndex,
        reason: 'gap-segment',
        elapsedSeconds,
        distanceMeters
      });
      continue;
    }

    const speedSelection = selectTrustedRepresentativeSpeed({
      start: previousValid.point,
      end: point,
      elapsedSeconds,
      distanceMeters,
      maxDerivedSpeedKmh,
      maxBrowserDerivedDeltaKmh
    });

    if (!speedSelection) {
      discardedSpeedEstimates.push({
        start: previousValid.point,
        end: point,
        startIndex: previousValid.rawIndex,
        endIndex: rawIndex,
        elapsedSeconds,
        distanceMeters,
        reason: 'missing-speed-source'
      });
      continue;
    }

    if (speedSelection.discardedReason) {
      discardedSpeedEstimates.push({
        start: previousValid.point,
        end: point,
        startIndex: previousValid.rawIndex,
        endIndex: rawIndex,
        elapsedSeconds,
        distanceMeters,
        reason: speedSelection.discardedReason,
        derivedSpeedKmh: speedSelection.derivedSpeedKmh,
        browserSpeedKmh: speedSelection.browserSpeedKmh
      });

      if (speedSelection.discardedReason === 'invalid-duration' || speedSelection.discardedReason === 'exceeds-max-derived-speed') {
        continue;
      }
    }

    validatedSegments.push({
      start: previousValid.point,
      end: point,
      startIndex: previousValid.rawIndex,
      endIndex: rawIndex,
      elapsedSeconds,
      distanceMeters,
      representativeSpeedKmh: speedSelection.speedKmh,
      speedSource: speedSelection.source
    });
  }

  return {
    validPoints,
    unreliablePoints,
    gaps,
    discardedSpeedEstimates,
    validatedSegments
  };
}

export function sanitizeRoutePoints(
  points: RoutePoint[],
  options?: RoutePointAuditOptions
): RoutePoint[] {
  const audit = auditRoutePointPipeline(points, options);
  return audit.validPoints.map((entry) => entry.point);
}

export function extractValidatedRoutePoints(audit: RoutePointAuditResult): RoutePoint[] {
  if (audit.validatedSegments.length === 0) {
    return audit.validPoints.length > 0 ? [audit.validPoints[0].point] : [];
  }

  const points: RoutePoint[] = [audit.validatedSegments[0].start];
  for (const segment of audit.validatedSegments) {
    points.push(segment.end);
  }

  return points;
}

export function calculateCumulativeDistanceKmFromSegments(segments: ValidatedRouteSegment[]): number {
  if (segments.length === 0) return 0;
  const totalMeters = segments.reduce((sum, segment) => sum + segment.distanceMeters, 0);
  return roundToOneDecimal(totalMeters / 1000);
}

export function deriveCurrentSpeedKmhFromSegments(segments: ValidatedRouteSegment[]): number {
  if (segments.length === 0) return 0;
  return roundToOneDecimal(segments[segments.length - 1].representativeSpeedKmh);
}

export function deriveMaxSpeedKmhFromSegments(segments: ValidatedRouteSegment[]): number {
  if (segments.length === 0) return 0;

  let maxSpeed = 0;
  for (const segment of segments) {
    if (segment.representativeSpeedKmh > maxSpeed) {
      maxSpeed = segment.representativeSpeedKmh;
    }
  }

  return roundToOneDecimal(maxSpeed);
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

export function deriveAverageSpeedKmh(distanceKm: number, elapsedSeconds: number): number {
  if (distanceKm <= 0 || elapsedSeconds <= 0) return 0;
  return roundToOneDecimal(distanceKm / (elapsedSeconds / 3600));
}

interface SpeedSelectionResult {
  speedKmh: number;
  source: TrustedSpeedSource;
  browserSpeedKmh?: number;
  derivedSpeedKmh?: number;
  discardedReason?: DiscardedSpeedEstimateReason;
}

function selectTrustedRepresentativeSpeed(input: {
  start: RoutePoint;
  end: RoutePoint;
  elapsedSeconds: number;
  distanceMeters: number;
  maxDerivedSpeedKmh: number;
  maxBrowserDerivedDeltaKmh: number;
}): SpeedSelectionResult | undefined {
  if (input.elapsedSeconds <= 0) {
    return { speedKmh: 0, source: 'derived-adjacent-points', discardedReason: 'invalid-duration' };
  }

  const derivedSpeedKmh = (input.distanceMeters / input.elapsedSeconds) * 3.6;
  const isDerivedReliable = isReliableSpeedKmh(derivedSpeedKmh, input.maxDerivedSpeedKmh);

  if (!isDerivedReliable) {
    return {
      speedKmh: 0,
      source: 'derived-adjacent-points',
      derivedSpeedKmh,
      discardedReason: 'exceeds-max-derived-speed'
    };
  }

  const browserSpeedKmh = pickReliableBrowserSpeed(input.start.speedKmh, input.end.speedKmh, input.maxDerivedSpeedKmh);

  if (browserSpeedKmh !== undefined) {
    const delta = Math.abs(browserSpeedKmh - derivedSpeedKmh);

    if (delta <= input.maxBrowserDerivedDeltaKmh) {
      return {
        speedKmh: roundToOneDecimal(browserSpeedKmh),
        source: 'browser-reported',
        browserSpeedKmh,
        derivedSpeedKmh
      };
    }

    return {
      speedKmh: roundToOneDecimal(derivedSpeedKmh),
      source: 'derived-adjacent-points',
      browserSpeedKmh,
      derivedSpeedKmh,
      discardedReason: 'browser-derived-mismatch'
    };
  }

  return {
    speedKmh: roundToOneDecimal(derivedSpeedKmh),
    source: 'derived-adjacent-points',
    derivedSpeedKmh
  };
}

function pickReliableBrowserSpeed(
  startSpeedKmh: number | undefined,
  endSpeedKmh: number | undefined,
  maxDerivedSpeedKmh: number
): number | undefined {
  const candidates = [startSpeedKmh, endSpeedKmh].filter((value): value is number =>
    isReliableSpeedKmh(value, maxDerivedSpeedKmh)
  );

  if (candidates.length === 0) {
    return undefined;
  }

  return candidates.reduce((sum, value) => sum + value, 0) / candidates.length;
}

function detectGapReason(
  elapsedSeconds: number,
  distanceMeters: number,
  maxPointGapSeconds: number,
  maxPointGapMeters: number
): TrackingGapReason | undefined {
  if (elapsedSeconds > maxPointGapSeconds) {
    return 'signal-gap';
  }

  if (distanceMeters > maxPointGapMeters) {
    return 'jumped-distance';
  }

  return undefined;
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

function isReliableSpeedKmh(value: number | undefined, maxKmh: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= maxKmh;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
