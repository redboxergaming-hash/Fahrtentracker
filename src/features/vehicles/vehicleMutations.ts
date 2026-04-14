import { db } from '../../db/database';
import type { FuelType, Vehicle } from '../../types/models';

export interface CreateVehicleInput {
  name: string;
  brand: string;
  model: string;
  year: number;
  licensePlate?: string;
  fuelType: FuelType;
  tankCapacityLiters?: number;
  defaultConsumptionLPer100Km?: number;
  color?: string;
  notes?: string;
  imageUrl?: string;
  isDefault: boolean;
}

export async function createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
  const timestamp = new Date().toISOString();
  const vehicle: Vehicle = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    brand: input.brand.trim(),
    model: input.model.trim(),
    year: input.year,
    licensePlate: emptyToUndefined(input.licensePlate),
    fuelType: input.fuelType,
    tankCapacityLiters: input.tankCapacityLiters,
    defaultConsumptionLPer100Km: input.defaultConsumptionLPer100Km,
    color: emptyToUndefined(input.color),
    isDefault: input.isDefault,
    notes: emptyToUndefined(input.notes),
    imageUrl: emptyToUndefined(input.imageUrl),
    createdAt: timestamp,
    updatedAt: timestamp
  };

  await db.transaction('rw', db.vehicles, async () => {
    if (vehicle.isDefault) {
      await db.vehicles.toCollection().modify({ isDefault: false, updatedAt: timestamp });
    }
    await db.vehicles.add(vehicle);
  });

  return vehicle;
}

export async function updateVehicle(id: string, input: CreateVehicleInput): Promise<Vehicle> {
  const existing = await db.vehicles.get(id);
  if (!existing) {
    throw new Error('Vehicle not found');
  }

  const timestamp = new Date().toISOString();
  const updatedVehicle: Vehicle = {
    ...existing,
    name: input.name.trim(),
    brand: input.brand.trim(),
    model: input.model.trim(),
    year: input.year,
    licensePlate: emptyToUndefined(input.licensePlate),
    fuelType: input.fuelType,
    tankCapacityLiters: input.tankCapacityLiters,
    defaultConsumptionLPer100Km: input.defaultConsumptionLPer100Km,
    color: emptyToUndefined(input.color),
    isDefault: input.isDefault,
    notes: emptyToUndefined(input.notes),
    imageUrl: emptyToUndefined(input.imageUrl),
    createdAt: existing.createdAt,
    updatedAt: timestamp
  };

  await db.transaction('rw', db.vehicles, async () => {
    if (updatedVehicle.isDefault) {
      await db.vehicles.toCollection().modify({ isDefault: false, updatedAt: timestamp });
    }
    await db.vehicles.put(updatedVehicle);
  });

  return updatedVehicle;
}

export interface DeleteVehicleResult {
  ok: boolean;
  reason?: 'linked_records' | 'not_found';
}

/**
 * Safety-first MVP deletion policy:
 * - block deletion when linked trips or fuel entries exist
 * - never cascade-delete related records implicitly
 */
export async function deleteVehicleSafely(id: string): Promise<DeleteVehicleResult> {
  const vehicle = await db.vehicles.get(id);
  if (!vehicle) {
    return { ok: false, reason: 'not_found' };
  }

  const [tripCount, fuelCount] = await Promise.all([
    db.trips.where('vehicleId').equals(id).count(),
    db.fuelEntries.where('vehicleId').equals(id).count()
  ]);

  if (tripCount > 0 || fuelCount > 0) {
    return { ok: false, reason: 'linked_records' };
  }

  await db.transaction('rw', db.vehicles, async () => {
    await db.vehicles.delete(id);

    if (vehicle.isDefault) {
      const replacement = await db.vehicles.orderBy('createdAt').first();
      if (replacement) {
        await db.vehicles.update(replacement.id, {
          isDefault: true,
          updatedAt: new Date().toISOString()
        });
      }
    }
  });

  return { ok: true };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
