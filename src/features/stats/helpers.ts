import type { FuelEntry, Trip } from '../../types/models';

export interface StatsDateRange {
  start?: string;
  end?: string;
}

export interface StatsAggregationOptions {
  vehicleId?: string;
  dateRange?: StatsDateRange;
}

export interface AggregatedStats {
  totalTrips: number;
  totalDistanceKm: number;
  totalDriveTimeSeconds: number;
  averageSpeedKmh?: number;
  maxSpeedKmh?: number;
  totalFuelLiters: number;
  totalFuelCost: number;
  avgFuelConsumptionLPer100Km?: number;
  bestConsumptionLPer100Km?: number;
  worstConsumptionLPer100Km?: number;
  avgCostPerKm?: number;
  lastTripDate?: string;
}

export function aggregateStats(
  allTrips: Trip[],
  allFuelEntries: FuelEntry[],
  options: StatsAggregationOptions = {}
): AggregatedStats {
  const trips = filterTrips(allTrips, options);
  const fuelEntries = filterFuelEntries(allFuelEntries, options);

  const totalTrips = trips.length;
  const totalDistanceKm = sum(trips.map((trip) => sanitizeNumber(trip.distanceKm)));
  const totalDriveTimeSeconds = sum(trips.map((trip) => Math.max(0, sanitizeNumber(trip.durationSeconds))));

  const averageSpeedKmh = deriveAverageSpeedKmh(trips);
  const maxSpeedKmh = deriveMaxSpeedKmh(trips);

  const totalFuelLiters = sum(fuelEntries.map((entry) => sanitizeNumber(entry.liters)));
  const totalFuelCost = sum(fuelEntries.map((entry) => sanitizeNumber(entry.totalPrice)));

  const observedConsumptions = deriveObservedConsumptions(fuelEntries);
  const avgFuelConsumptionLPer100Km = deriveAverageFuelConsumption(totalFuelLiters, totalDistanceKm, observedConsumptions);

  const bestConsumptionLPer100Km = observedConsumptions.length
    ? Math.min(...observedConsumptions)
    : undefined;

  const worstConsumptionLPer100Km = observedConsumptions.length
    ? Math.max(...observedConsumptions)
    : undefined;

  const avgCostPerKm = totalDistanceKm > 0 ? round(totalFuelCost / totalDistanceKm) : undefined;

  const lastTripDate = deriveLastTripDate(trips);

  return {
    totalTrips,
    totalDistanceKm: round(totalDistanceKm),
    totalDriveTimeSeconds: Math.round(totalDriveTimeSeconds),
    averageSpeedKmh,
    maxSpeedKmh,
    totalFuelLiters: round(totalFuelLiters),
    totalFuelCost: round(totalFuelCost),
    avgFuelConsumptionLPer100Km,
    bestConsumptionLPer100Km,
    worstConsumptionLPer100Km,
    avgCostPerKm,
    lastTripDate
  };
}

export function aggregateGlobalStats(
  allTrips: Trip[],
  allFuelEntries: FuelEntry[],
  dateRange?: StatsDateRange
): AggregatedStats {
  return aggregateStats(allTrips, allFuelEntries, { dateRange });
}

export function aggregateVehicleStats(
  vehicleId: string,
  allTrips: Trip[],
  allFuelEntries: FuelEntry[],
  dateRange?: StatsDateRange
): AggregatedStats {
  return aggregateStats(allTrips, allFuelEntries, { vehicleId, dateRange });
}

function filterTrips(trips: Trip[], options: StatsAggregationOptions): Trip[] {
  return trips.filter((trip) => {
    if (options.vehicleId && trip.vehicleId !== options.vehicleId) {
      return false;
    }

    return isInDateRange(trip.startTime, options.dateRange);
  });
}

function filterFuelEntries(entries: FuelEntry[], options: StatsAggregationOptions): FuelEntry[] {
  return entries.filter((entry) => {
    if (options.vehicleId && entry.vehicleId !== options.vehicleId) {
      return false;
    }

    return isInDateRange(entry.date, options.dateRange);
  });
}

function isInDateRange(value: string | undefined, range: StatsDateRange | undefined): boolean {
  if (!range?.start && !range?.end) {
    return true;
  }

  const timestamp = Date.parse(value ?? '');
  if (Number.isNaN(timestamp)) {
    return false;
  }

  const afterStart = range.start ? timestamp >= Date.parse(range.start) : true;
  const beforeEnd = range.end ? timestamp <= Date.parse(range.end) : true;
  return afterStart && beforeEnd;
}

function deriveAverageSpeedKmh(trips: Trip[]): number | undefined {
  const tripsWithDuration = trips.filter((trip) => sanitizeNumber(trip.durationSeconds) > 0);
  if (!tripsWithDuration.length) {
    return undefined;
  }

  const weightedSpeedSum = sum(
    tripsWithDuration.map((trip) => sanitizeNumber(trip.avgSpeedKmh) * sanitizeNumber(trip.durationSeconds))
  );

  const totalDuration = sum(tripsWithDuration.map((trip) => sanitizeNumber(trip.durationSeconds)));
  if (totalDuration <= 0) {
    return undefined;
  }

  return round(weightedSpeedSum / totalDuration);
}

function deriveMaxSpeedKmh(trips: Trip[]): number | undefined {
  const speeds = trips
    .map((trip) => sanitizeNumber(trip.maxSpeedKmh))
    .filter((speed) => speed > 0);

  return speeds.length ? round(Math.max(...speeds)) : undefined;
}

function deriveLastTripDate(trips: Trip[]): string | undefined {
  const timestamps = trips
    .map((trip) => Date.parse(trip.endTime || trip.startTime))
    .filter((value) => !Number.isNaN(value));

  if (!timestamps.length) {
    return undefined;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function deriveObservedConsumptions(entries: FuelEntry[]): number[] {
  const withOdometer = entries
    .filter((entry) => typeof entry.odometer === 'number' && entry.odometer > 0)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  const consumptions: number[] = [];

  for (let index = 1; index < withOdometer.length; index += 1) {
    const previous = withOdometer[index - 1];
    const current = withOdometer[index];

    const distanceKm = sanitizeNumber(current.odometer) - sanitizeNumber(previous.odometer);
    const liters = sanitizeNumber(current.liters);

    if (distanceKm <= 0 || liters <= 0) {
      continue;
    }

    const consumption = (liters / distanceKm) * 100;
    if (Number.isFinite(consumption) && consumption > 0) {
      consumptions.push(round(consumption));
    }
  }

  return consumptions;
}

function deriveAverageFuelConsumption(
  totalFuelLiters: number,
  totalDistanceKm: number,
  observedConsumptions: number[]
): number | undefined {
  if (observedConsumptions.length > 0) {
    return round(sum(observedConsumptions) / observedConsumptions.length);
  }

  // Without odometer-linked fuel observations, consumption would be speculative.
  return undefined;
}

function sum(values: number[]): number {
  return values.reduce((accumulator, value) => accumulator + sanitizeNumber(value), 0);
}

function sanitizeNumber(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }

  return value;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
