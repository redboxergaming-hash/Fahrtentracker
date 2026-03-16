import type { FuelEntry, Trip } from '../../types/models';

export interface VehicleDerivedMetrics {
  totalTrips: number;
  totalDistanceKm: number;
  totalFuelSpend: number;
  totalFuelEntries: number;
  lastActivityLabel: string;
}

const numberFormatter = new Intl.NumberFormat('en-US');
const decimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

export function getVehicleDerivedMetrics(trips: Trip[], fuelEntries: FuelEntry[]): VehicleDerivedMetrics {
  const totalTrips = trips.length;
  const totalDistanceKm = trips.reduce((sum, trip) => sum + sanitizeNumber(trip.distanceKm), 0);
  const totalFuelSpend = fuelEntries.reduce((sum, entry) => sum + sanitizeNumber(entry.totalPrice), 0);
  const totalFuelEntries = fuelEntries.length;

  return {
    totalTrips,
    totalDistanceKm,
    totalFuelSpend,
    totalFuelEntries,
    lastActivityLabel: getLastActivityLabel(trips, fuelEntries)
  };
}

export function formatInteger(value: number): string {
  return numberFormatter.format(sanitizeNumber(value));
}

export function formatDistanceKm(value: number): string {
  return `${decimalFormatter.format(sanitizeNumber(value))} km`;
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(sanitizeNumber(value));
}

function getLastActivityLabel(trips: Trip[], fuelEntries: FuelEntry[]): string {
  const tripDate = maxDate(
    trips
      .map((trip) => parseDate(trip.endTime) ?? parseDate(trip.startTime))
      .filter((value): value is Date => value instanceof Date)
  );

  const fuelDate = maxDate(
    fuelEntries
      .map((entry) => {
        const withTime = entry.time ? `${entry.date}T${entry.time}` : entry.date;
        return parseDate(withTime) ?? parseDate(entry.date);
      })
      .filter((value): value is Date => value instanceof Date)
  );

  const latest = maxDate([tripDate, fuelDate].filter((value): value is Date => value instanceof Date));

  if (!latest) {
    return 'No activity yet';
  }

  return dateFormatter.format(latest);
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function maxDate(values: Date[]): Date | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((latest, current) => (current > latest ? current : latest));
}

function sanitizeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
