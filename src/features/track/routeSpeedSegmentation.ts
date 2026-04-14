import type { RoutePoint } from '../../types/models';
import { calculateDistanceMeters } from './trackingCalculations';
import { SPEED_LEGEND_BANDS } from './speedLegend';

export type SpeedBandId = 'very-slow' | 'slow-city' | 'moderate' | 'fast' | 'very-fast';

export type SpeedColorToken =
  | 'route-speed-very-slow'
  | 'route-speed-slow-city'
  | 'route-speed-moderate'
  | 'route-speed-fast'
  | 'route-speed-very-fast';

export interface SpeedBandDefinition {
  id: SpeedBandId;
  maxKmh: number;
  colorToken: SpeedColorToken;
}

export interface RouteSpeedSegment {
  start: RoutePoint;
  end: RoutePoint;
  representativeSpeedKmh: number;
  distanceMeters: number;
  durationSeconds?: number;
  speedBand: SpeedBandId;
  colorToken: SpeedColorToken;
}

export interface GroupedRouteSpeedSegment {
  speedBand: SpeedBandId;
  colorToken: SpeedColorToken;
  points: RoutePoint[];
  segmentCount: number;
  totalDistanceMeters: number;
  totalDurationSeconds?: number;
}

export interface GroupedRouteSpeedSegmentsOptions {
  /**
   * Noise guard: tiny one-group speed spikes between two same-band groups can be folded
   * into surrounding groups to keep rendering clean on noisy GPS readings.
   */
  flattenIsolatedSpikes?: boolean;
}


export type RouteSpeedDataQuality = 'strong' | 'limited' | 'weak';

export interface RouteSpeedDataQualitySummary {
  totalAdjacentPairs: number;
  reliableSegmentCount: number;
  reliabilityRatio: number;
  quality: RouteSpeedDataQuality;
}

export const DEFAULT_SPEED_BANDS: SpeedBandDefinition[] = SPEED_LEGEND_BANDS.map((band) => ({
  id: band.key,
  maxKmh: band.maxKmh,
  colorToken: band.colorToken
}));

const MAX_RELIABLE_POINT_SPEED_KMH = 220;

/**
 * Converts adjacent route points into render-ready segments.
 *
 * Fallback policy:
 * - Prefer reliable point speed values (`speedKmh`) when available.
 * - Otherwise derive speed from distance + timestamp delta.
 * - Skip pairs that cannot produce a reliable finite speed.
 */
export function buildRouteSpeedSegments(
  points: RoutePoint[],
  speedBands: SpeedBandDefinition[] = DEFAULT_SPEED_BANDS
): RouteSpeedSegment[] {
  if (points.length < 2) return [];

  const segments: RouteSpeedSegment[] = [];

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];

    const segment = toRouteSpeedSegment(start, end, speedBands);
    if (segment) {
      segments.push(segment);
    }
  }

  return segments;
}

/**
 * Groups contiguous same-band segments to avoid excessive tiny polylines.
 */
export function groupContiguousSpeedSegments(segments: RouteSpeedSegment[]): GroupedRouteSpeedSegment[] {
  if (segments.length === 0) return [];

  const grouped: GroupedRouteSpeedSegment[] = [];

  for (const segment of segments) {
    const previous = grouped[grouped.length - 1];

    if (!previous || previous.speedBand !== segment.speedBand || !isContinuousJoin(previous, segment)) {
      grouped.push({
        speedBand: segment.speedBand,
        colorToken: segment.colorToken,
        points: [segment.start, segment.end],
        segmentCount: 1,
        totalDistanceMeters: segment.distanceMeters,
        totalDurationSeconds: segment.durationSeconds
      });
      continue;
    }

    previous.points.push(segment.end);
    previous.segmentCount += 1;
    previous.totalDistanceMeters += segment.distanceMeters;
    previous.totalDurationSeconds = addDurationSeconds(previous.totalDurationSeconds, segment.durationSeconds);
  }

  return grouped;
}

export function buildGroupedRouteSpeedSegments(
  points: RoutePoint[],
  options: GroupedRouteSpeedSegmentsOptions = {}
): GroupedRouteSpeedSegment[] {
  const grouped = groupContiguousSpeedSegments(buildRouteSpeedSegments(points));

  if (!options.flattenIsolatedSpikes) {
    return grouped;
  }

  return flattenIsolatedSpeedSpikes(grouped);
}

export function summarizeRouteSpeedDataQuality(points: RoutePoint[]): RouteSpeedDataQualitySummary {
  const totalAdjacentPairs = Math.max(0, points.length - 1);

  if (totalAdjacentPairs === 0) {
    return {
      totalAdjacentPairs,
      reliableSegmentCount: 0,
      reliabilityRatio: 0,
      quality: 'weak'
    };
  }

  const reliableSegmentCount = buildRouteSpeedSegments(points).length;
  const reliabilityRatio = reliableSegmentCount / totalAdjacentPairs;

  return {
    totalAdjacentPairs,
    reliableSegmentCount,
    reliabilityRatio,
    quality: classifyRouteSpeedDataQuality(totalAdjacentPairs, reliableSegmentCount, reliabilityRatio)
  };
}

export function shouldRenderSpeedColoredRoute(qualitySummary: RouteSpeedDataQualitySummary): boolean {
  if (qualitySummary.reliableSegmentCount < 2) {
    return false;
  }

  if (qualitySummary.totalAdjacentPairs < 3) {
    return false;
  }

  return qualitySummary.quality !== 'weak';
}

function classifyRouteSpeedDataQuality(
  totalAdjacentPairs: number,
  reliableSegmentCount: number,
  reliabilityRatio: number
): RouteSpeedDataQuality {
  if (totalAdjacentPairs < 3 || reliableSegmentCount < 2 || reliabilityRatio < 0.45) {
    return 'weak';
  }

  if (reliabilityRatio < 0.75) {
    return 'limited';
  }

  return 'strong';
}


export function buildRenderableGroupedSpeedSegments(
  points: RoutePoint[],
  options: GroupedRouteSpeedSegmentsOptions = { flattenIsolatedSpikes: true }
): GroupedRouteSpeedSegment[] {
  const qualitySummary = summarizeRouteSpeedDataQuality(points);

  if (!shouldRenderSpeedColoredRoute(qualitySummary)) {
    return [];
  }

  return buildGroupedRouteSpeedSegments(points, options);
}

export function toRouteSpeedSegment(
  start: RoutePoint,
  end: RoutePoint,
  speedBands: SpeedBandDefinition[] = DEFAULT_SPEED_BANDS
): RouteSpeedSegment | undefined {
  if (!isValidPoint(start) || !isValidPoint(end)) {
    return undefined;
  }

  const distanceMeters = calculateDistanceMeters(start, end);
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return undefined;
  }

  const durationSeconds = getPositiveDurationSeconds(start.timestamp, end.timestamp);
  const representativeSpeedKmh = getRepresentativeSegmentSpeedKmh(start, end, distanceMeters, durationSeconds);

  if (!isReliableSpeedKmh(representativeSpeedKmh)) {
    return undefined;
  }

  const speedBand = classifySpeedBand(representativeSpeedKmh, speedBands);

  return {
    start,
    end,
    representativeSpeedKmh,
    distanceMeters,
    durationSeconds,
    speedBand: speedBand.id,
    colorToken: speedBand.colorToken
  };
}

export function classifySpeedBand(
  speedKmh: number,
  speedBands: SpeedBandDefinition[] = DEFAULT_SPEED_BANDS
): SpeedBandDefinition {
  const safeBands = speedBands.length > 0 ? speedBands : DEFAULT_SPEED_BANDS;
  const normalizedSpeed = Number.isFinite(speedKmh) && speedKmh >= 0 ? speedKmh : 0;

  return safeBands.find((band) => normalizedSpeed <= band.maxKmh) ?? safeBands[safeBands.length - 1];
}

export function getRepresentativeSegmentSpeedKmh(
  start: RoutePoint,
  end: RoutePoint,
  distanceMeters: number,
  durationSeconds?: number
): number | undefined {
  const pointSpeedKmh = averageReliablePointSpeed(start.speedKmh, end.speedKmh);
  if (pointSpeedKmh !== undefined) {
    return pointSpeedKmh;
  }

  if (!durationSeconds || durationSeconds <= 0) {
    return undefined;
  }

  const derivedSpeedKmh = (distanceMeters / durationSeconds) * 3.6;
  return isReliableSpeedKmh(derivedSpeedKmh) ? roundToOneDecimal(derivedSpeedKmh) : undefined;
}

function averageReliablePointSpeed(...candidateSpeeds: Array<number | undefined>): number | undefined {
  const reliable = candidateSpeeds.filter(isReliableSpeedKmh);
  if (reliable.length === 0) {
    return undefined;
  }

  const total = reliable.reduce((sum, value) => sum + value, 0);
  return roundToOneDecimal(total / reliable.length);
}

function getPositiveDurationSeconds(fromTimestamp: string, toTimestamp: string): number | undefined {
  const fromMs = toTimestampMs(fromTimestamp);
  const toMs = toTimestampMs(toTimestamp);

  if (fromMs === undefined || toMs === undefined || toMs <= fromMs) {
    return undefined;
  }

  return (toMs - fromMs) / 1000;
}

function toTimestampMs(timestamp: string): number | undefined {
  const parsed = new Date(timestamp).getTime();
  return Number.isNaN(parsed) ? undefined : parsed;
}

function isValidPoint(point: RoutePoint): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

function isReliableSpeedKmh(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_RELIABLE_POINT_SPEED_KMH;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function isContinuousJoin(previousGroup: GroupedRouteSpeedSegment, nextSegment: RouteSpeedSegment): boolean {
  const previousEnd = previousGroup.points[previousGroup.points.length - 1];
  return Boolean(previousEnd) && areSameRoutePoint(previousEnd, nextSegment.start);
}

function areSameRoutePoint(a: RoutePoint, b: RoutePoint): boolean {
  return a.lat === b.lat && a.lng === b.lng && a.timestamp === b.timestamp;
}

function addDurationSeconds(base?: number, add?: number): number | undefined {
  if (base === undefined && add === undefined) {
    return undefined;
  }

  return (base ?? 0) + (add ?? 0);
}

function flattenIsolatedSpeedSpikes(groups: GroupedRouteSpeedSegment[]): GroupedRouteSpeedSegment[] {
  if (groups.length < 3) {
    return groups;
  }

  const flattened: GroupedRouteSpeedSegment[] = [];

  for (let index = 0; index < groups.length; index += 1) {
    const current = groups[index];
    const previous = flattened[flattened.length - 1];
    const next = groups[index + 1];

    if (
      previous
      && next
      && previous.speedBand === next.speedBand
      && current.speedBand !== previous.speedBand
      && isTinyTransientGroup(current)
      && canBridgeGroups(previous, current, next)
    ) {
      const nextPointsWithoutJoin = next.points.slice(1);
      previous.points.push(...current.points.slice(1), ...nextPointsWithoutJoin);
      previous.segmentCount += current.segmentCount + next.segmentCount;
      previous.totalDistanceMeters += current.totalDistanceMeters + next.totalDistanceMeters;
      previous.totalDurationSeconds = addDurationSeconds(
        addDurationSeconds(previous.totalDurationSeconds, current.totalDurationSeconds),
        next.totalDurationSeconds
      );
      index += 1;
      continue;
    }

    flattened.push({ ...current, points: [...current.points] });
  }

  return flattened;
}

function canBridgeGroups(
  left: GroupedRouteSpeedSegment,
  middle: GroupedRouteSpeedSegment,
  right: GroupedRouteSpeedSegment
): boolean {
  const leftEnd = left.points[left.points.length - 1];
  const middleStart = middle.points[0];
  const middleEnd = middle.points[middle.points.length - 1];
  const rightStart = right.points[0];

  if (!leftEnd || !middleStart || !middleEnd || !rightStart) {
    return false;
  }

  return areSameRoutePoint(leftEnd, middleStart) && areSameRoutePoint(middleEnd, rightStart);
}

function isTinyTransientGroup(group: GroupedRouteSpeedSegment): boolean {
  if (group.segmentCount !== 1) {
    return false;
  }

  if (group.totalDistanceMeters > 35) {
    return false;
  }

  if (group.totalDurationSeconds !== undefined && group.totalDurationSeconds > 8) {
    return false;
  }

  return true;
}
