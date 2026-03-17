import Dexie, { type Table } from 'dexie';
import type { FuelEntry, Trip, Vehicle } from '../types/models';

export class FahrtentrackerDB extends Dexie {
  vehicles!: Table<Vehicle, string>;
  trips!: Table<Trip, string>;
  fuelEntries!: Table<FuelEntry, string>;

  constructor() {
    super('fahrtentracker');
    this.version(1).stores({
      vehicles: 'id, name, brand, model, year, isDefault, createdAt',
      trips: 'id, vehicleId, status, source, startTime, endTime, distanceKm, createdAt',
      fuelEntries: 'id, vehicleId, date, stationName, totalPrice, fullTank, createdAt'
    });
  }
}

export const db = new FahrtentrackerDB();
const DEMO_SEED_MARKER_KEY = 'fahrtentracker:demo-seed-initialized';

const now = new Date().toISOString();

export const demoVehicles: Vehicle[] = [
  {
    id: 'v1',
    name: 'Family Wagon',
    brand: 'Skoda',
    model: 'Octavia Combi',
    year: 2021,
    fuelType: 'diesel',
    tankCapacityLiters: 50,
    defaultConsumptionLPer100Km: 5.8,
    isDefault: true,
    color: '#1d4ed8',
    notes: 'Main family car',
    createdAt: now,
    updatedAt: now
  }
];

export const demoTrips: Trip[] = [
  {
    id: 't1',
    vehicleId: 'v1',
    status: 'completed',
    source: 'tracked',
    category: 'commute',
    startTime: now,
    endTime: now,
    durationSeconds: 1800,
    startLocationLabel: 'Home',
    endLocationLabel: 'Office',
    distanceKm: 23.4,
    avgSpeedKmh: 46.8,
    maxSpeedKmh: 82,
    weather: 'Cloudy',
    routePoints: [
      { lat: 48.1374, lng: 11.5755, timestamp: now, speedKmh: 28 },
      { lat: 48.165, lng: 11.61, timestamp: now, speedKmh: 52 },
      { lat: 48.18, lng: 11.64, timestamp: now, speedKmh: 61 }
    ],
    createdAt: now,
    updatedAt: now
  }
];

export const demoFuelEntries: FuelEntry[] = [
  {
    id: 'f1',
    vehicleId: 'v1',
    date: now,
    liters: 42,
    pricePerLiter: 1.78,
    totalPrice: 74.76,
    stationName: 'Aral Munich',
    fullTank: true,
    userVerified: true,
    createdAt: now,
    updatedAt: now
  }
];

export async function seedDemoData(enableDemoData: boolean) {
  if (!enableDemoData) return;

  const [vehicleCount, tripCount] = await Promise.all([db.vehicles.count(), db.trips.count()]);
  if (vehicleCount > 0 || tripCount > 0) return;

  /**
   * Demo data should only auto-seed once for a true first-run experience.
   * After users modify/delete demo entities, we keep respecting that choice
   * and do not recreate the seed records on every reload.
   */
  if (typeof window !== 'undefined' && window.localStorage.getItem(DEMO_SEED_MARKER_KEY) === '1') {
    return;
  }

  await db.transaction('rw', db.vehicles, db.trips, db.fuelEntries, async () => {
    await db.vehicles.bulkPut(demoVehicles);
    await db.trips.bulkPut(demoTrips);
    await db.fuelEntries.bulkPut(demoFuelEntries);
  });

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(DEMO_SEED_MARKER_KEY, '1');
  }
}
