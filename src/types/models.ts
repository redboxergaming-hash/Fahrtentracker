export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid';

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
  speedKmh?: number;
  accuracy?: number;
  altitude?: number;
}

export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  licensePlate?: string;
  fuelType: FuelType;
  tankCapacityLiters?: number;
  defaultConsumptionLPer100Km?: number;
  color?: string;
  imageUrl?: string;
  isDefault: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  vehicleId: string;
  status: 'draft' | 'confirmed' | 'completed';
  source: 'manual' | 'tracked' | 'auto-draft';
  category?: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  startLocationLabel?: string;
  endLocationLabel?: string;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  odometerStart?: number;
  odometerEnd?: number;
  notes?: string;
  weather?: string;
  routePoints: RoutePoint[];
  createdAt: string;
  updatedAt: string;
}

export interface FuelEntry {
  id: string;
  vehicleId: string;
  date: string;
  time?: string;
  liters: number;
  pricePerLiter: number;
  totalPrice: number;
  fuelType?: string;
  stationName?: string;
  odometer?: number;
  fullTank: boolean;
  imageRef?: string;
  ocrRawText?: string;
  ocrConfidence?: number;
  userVerified: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
