import { z } from 'zod';
import type { Vehicle } from '../../types/models';

const currentYear = new Date().getFullYear();

const optionalPositiveNumberString = z
  .string()
  .optional()
  .refine((value) => !value || Number.isFinite(Number(value)), 'Please enter a valid number.')
  .refine((value) => !value || Number(value) > 0, 'Value must be greater than 0.');

export const vehicleFormSchema = z.object({
  name: z.string().trim().min(2, 'Please enter a vehicle name.'),
  brand: z.string().trim().min(2, 'Please enter a brand name.'),
  model: z.string().trim().min(1, 'Please enter a model.'),
  year: z
    .string()
    .regex(/^\d{4}$/, 'Please enter a 4-digit year.')
    .refine((value) => Number(value) >= 1950, 'Year must be 1950 or later.')
    .refine((value) => Number(value) <= currentYear + 1, `Year must be ${currentYear + 1} or earlier.`),
  licensePlate: z.string().optional(),
  fuelType: z.enum(['petrol', 'diesel', 'electric', 'hybrid']),
  tankCapacityLiters: optionalPositiveNumberString,
  defaultConsumptionLPer100Km: optionalPositiveNumberString,
  color: z.string().optional(),
  notes: z.string().max(300, 'Please keep notes under 300 characters.').optional(),
  imageUrl: z.string().optional(),
  isDefault: z.boolean().default(false)
});

export type VehicleFormValues = z.input<typeof vehicleFormSchema>;

export const defaultVehicleFormValues: VehicleFormValues = {
  name: '',
  brand: '',
  model: '',
  year: String(currentYear),
  licensePlate: '',
  fuelType: 'petrol',
  tankCapacityLiters: '',
  defaultConsumptionLPer100Km: '',
  color: '',
  notes: '',
  imageUrl: '',
  isDefault: false
};

export function mapVehicleToFormValues(vehicle: Vehicle): VehicleFormValues {
  return {
    name: vehicle.name,
    brand: vehicle.brand,
    model: vehicle.model,
    year: String(vehicle.year),
    licensePlate: vehicle.licensePlate ?? '',
    fuelType: vehicle.fuelType,
    tankCapacityLiters: vehicle.tankCapacityLiters != null ? String(vehicle.tankCapacityLiters) : '',
    defaultConsumptionLPer100Km:
      vehicle.defaultConsumptionLPer100Km != null ? String(vehicle.defaultConsumptionLPer100Km) : '',
    color: vehicle.color ?? '',
    notes: vehicle.notes ?? '',
    imageUrl: vehicle.imageUrl ?? '',
    isDefault: vehicle.isDefault
  };
}

export function toOptionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
