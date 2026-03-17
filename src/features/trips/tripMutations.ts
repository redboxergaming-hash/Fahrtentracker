import { db } from '../../db/database';
import type { Trip } from '../../types/models';
import {
  deriveManualTripValues,
  parseOptionalNumber,
  type ManualTripFormValues
} from './manualTripFoundation';

export async function createManualTrip(values: ManualTripFormValues): Promise<Trip> {
  const timestamp = new Date().toISOString();
  const derived = deriveManualTripValues(values);

  const trip: Trip = {
    id: crypto.randomUUID(),
    vehicleId: values.vehicleId,
    status: 'completed',
    source: 'manual',
    category: emptyToUndefined(values.category),
    startTime: values.startTime,
    endTime: values.endTime,
    durationSeconds: derived.durationSeconds,
    startLocationLabel: emptyToUndefined(values.startLocationLabel),
    endLocationLabel: emptyToUndefined(values.endLocationLabel),
    startLat: parseOptionalNumber(values.startLat),
    startLng: parseOptionalNumber(values.startLng),
    endLat: parseOptionalNumber(values.endLat),
    endLng: parseOptionalNumber(values.endLng),
    distanceKm: derived.distanceKm,
    avgSpeedKmh: derived.avgSpeedKmh,
    maxSpeedKmh: 0,
    odometerStart: parseOptionalNumber(values.odometerStart),
    odometerEnd: parseOptionalNumber(values.odometerEnd),
    notes: emptyToUndefined(values.notes),
    weather: emptyToUndefined(values.weather),
    routePoints: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await db.trips.add(trip);
  return trip;
}

export async function updateManualTrip(id: string, values: ManualTripFormValues): Promise<Trip> {
  const existing = await db.trips.get(id);
  if (!existing) {
    throw new Error('Trip not found');
  }

  if (existing.source !== 'manual') {
    throw new Error('Only manual trips can be updated');
  }

  const derived = deriveManualTripValues(values);
  const timestamp = new Date().toISOString();

  const updatedTrip: Trip = {
    ...existing,
    vehicleId: values.vehicleId,
    category: emptyToUndefined(values.category),
    startTime: values.startTime,
    endTime: values.endTime,
    durationSeconds: derived.durationSeconds,
    startLocationLabel: emptyToUndefined(values.startLocationLabel),
    endLocationLabel: emptyToUndefined(values.endLocationLabel),
    startLat: parseOptionalNumber(values.startLat),
    startLng: parseOptionalNumber(values.startLng),
    endLat: parseOptionalNumber(values.endLat),
    endLng: parseOptionalNumber(values.endLng),
    distanceKm: derived.distanceKm,
    avgSpeedKmh: derived.avgSpeedKmh,
    odometerStart: parseOptionalNumber(values.odometerStart),
    odometerEnd: parseOptionalNumber(values.odometerEnd),
    notes: emptyToUndefined(values.notes),
    weather: emptyToUndefined(values.weather),
    updatedAt: timestamp,
    createdAt: existing.createdAt
  };

  await db.trips.put(updatedTrip);
  return updatedTrip;
}


export async function deleteManualTrip(id: string): Promise<void> {
  const existing = await db.trips.get(id);
  if (!existing) {
    throw new Error('Trip not found');
  }

  if (existing.source !== 'manual') {
    throw new Error('Only manual trips can be deleted in this step');
  }

  await db.trips.delete(id);
}

function emptyToUndefined(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
