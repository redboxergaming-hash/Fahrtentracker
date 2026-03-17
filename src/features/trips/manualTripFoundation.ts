import type { Trip } from '../../types/models';
import { z } from 'zod';

const optionalNumberString = z
  .string()
  .optional()
  .refine((value) => !value || Number.isFinite(Number(value)), 'Please enter a valid number.');

export const manualTripFormSchema = z
  .object({
    vehicleId: z.string().min(1, 'Please select a vehicle.'),
    startTime: z.string().min(1, 'Please provide a start time.'),
    endTime: z.string().min(1, 'Please provide an end time.'),
    category: z.string().optional(),
    startLocationLabel: z.string().optional(),
    endLocationLabel: z.string().optional(),
    startLat: optionalNumberString,
    startLng: optionalNumberString,
    endLat: optionalNumberString,
    endLng: optionalNumberString,
    odometerStart: optionalNumberString,
    odometerEnd: optionalNumberString,
    directDistanceKm: optionalNumberString,
    notes: z.string().optional(),
    weather: z.string().optional()
  })
  .superRefine((values, ctx) => {
    if (!isEndTimeAfterStart(values.startTime, values.endTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'End time must not be before start time.'
      });
    }

    const odometerStart = parseOptionalNumber(values.odometerStart);
    const odometerEnd = parseOptionalNumber(values.odometerEnd);

    if (!isOdometerRangeValid(odometerStart, odometerEnd)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['odometerEnd'],
        message: 'Odometer end must be greater than or equal to odometer start.'
      });
    }
  });

export type ManualTripFormValues = z.input<typeof manualTripFormSchema>;

export interface ManualTripDerivedValues {
  durationSeconds: number;
  distanceKm: number;
  avgSpeedKmh: number;
}

export const manualTripDefaultValues: ManualTripFormValues = {
  vehicleId: '',
  startTime: toDateTimeLocal(new Date()),
  endTime: toDateTimeLocal(new Date(Date.now() + 30 * 60 * 1000)),
  category: '',
  startLocationLabel: '',
  endLocationLabel: '',
  notes: '',
  weather: '',
  startLat: '',
  startLng: '',
  endLat: '',
  endLng: '',
  odometerStart: '',
  odometerEnd: '',
  directDistanceKm: ''
};

export function toManualTripFormValues(trip: Trip): ManualTripFormValues {
  return {
    vehicleId: trip.vehicleId,
    startTime: toDateTimeLocal(new Date(trip.startTime)),
    endTime: toDateTimeLocal(new Date(trip.endTime)),
    category: trip.category ?? '',
    startLocationLabel: trip.startLocationLabel ?? '',
    endLocationLabel: trip.endLocationLabel ?? '',
    notes: trip.notes ?? '',
    weather: trip.weather ?? '',
    startLat: toOptionalString(trip.startLat),
    startLng: toOptionalString(trip.startLng),
    endLat: toOptionalString(trip.endLat),
    endLng: toOptionalString(trip.endLng),
    odometerStart: toOptionalString(trip.odometerStart),
    odometerEnd: toOptionalString(trip.odometerEnd),
    directDistanceKm: ''
  };
}

export function isEndTimeAfterStart(startTime: string, endTime: string): boolean {
  const startDate = parseDate(startTime);
  const endDate = parseDate(endTime);

  if (!startDate || !endDate) return false;
  return endDate.getTime() >= startDate.getTime();
}

export function isOdometerRangeValid(odometerStart?: number, odometerEnd?: number): boolean {
  if (odometerStart === undefined || odometerEnd === undefined) return true;
  return odometerEnd >= odometerStart;
}

export function deriveDurationSeconds(startTime: string, endTime: string): number {
  const startDate = parseDate(startTime);
  const endDate = parseDate(endTime);
  if (!startDate || !endDate) return 0;

  const diffSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
  return Math.max(0, diffSeconds);
}

export function deriveDistanceKm(params: {
  odometerStart?: number;
  odometerEnd?: number;
  directDistanceKm?: number;
}): number {
  const { odometerStart, odometerEnd, directDistanceKm } = params;

  if (
    odometerStart !== undefined &&
    odometerEnd !== undefined &&
    isOdometerRangeValid(odometerStart, odometerEnd)
  ) {
    return roundToOneDecimal(odometerEnd - odometerStart);
  }

  if (directDistanceKm !== undefined && directDistanceKm >= 0) {
    return roundToOneDecimal(directDistanceKm);
  }

  return 0;
}

export function deriveAvgSpeedKmh(distanceKm: number, durationSeconds: number): number {
  if (distanceKm <= 0 || durationSeconds <= 0) return 0;

  const hours = durationSeconds / 3600;
  if (!Number.isFinite(hours) || hours <= 0) return 0;

  return roundToOneDecimal(distanceKm / hours);
}

export function deriveManualTripValues(values: ManualTripFormValues): ManualTripDerivedValues {
  const durationSeconds = deriveDurationSeconds(values.startTime, values.endTime);

  const distanceKm = deriveDistanceKm({
    odometerStart: parseOptionalNumber(values.odometerStart),
    odometerEnd: parseOptionalNumber(values.odometerEnd),
    directDistanceKm: parseOptionalNumber(values.directDistanceKm)
  });

  return {
    durationSeconds,
    distanceKm,
    avgSpeedKmh: deriveAvgSpeedKmh(distanceKm, durationSeconds)
  };
}

export function parseOptionalNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDate(value: string): Date | undefined {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function toOptionalString(value?: number): string {
  return value === undefined ? '' : String(value);
}

function toDateTimeLocal(value: Date): string {
  const offsetMs = value.getTimezoneOffset() * 60 * 1000;
  return new Date(value.getTime() - offsetMs).toISOString().slice(0, 16);
}
