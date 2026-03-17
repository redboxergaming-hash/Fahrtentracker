import type { Trip } from '../../types/models';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium'
});

export interface TripFilters {
  searchText: string;
  vehicleId: string;
  category: string;
  startDate: string;
  endDate: string;
}

export function getRecentTrips(trips: Trip[], limit = 5): Trip[] {
  return [...trips]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, limit);
}

export function filterTrips(trips: Trip[], filters: TripFilters): Trip[] {
  const search = filters.searchText.trim().toLowerCase();
  const category = filters.category.trim().toLowerCase();
  const startMs = toStartOfDayMs(filters.startDate);
  const endMs = toEndOfDayMs(filters.endDate);

  return trips.filter((trip) => {
    if (filters.vehicleId && trip.vehicleId !== filters.vehicleId) {
      return false;
    }

    if (category) {
      const tripCategory = trip.category?.trim().toLowerCase() ?? '';
      if (tripCategory !== category) {
        return false;
      }
    }

    if (search) {
      const searchable = [trip.startLocationLabel, trip.endLocationLabel, trip.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchable.includes(search)) {
        return false;
      }
    }

    const tripStartMs = new Date(trip.startTime).getTime();
    if (Number.isNaN(tripStartMs)) return false;

    if (startMs !== undefined && tripStartMs < startMs) {
      return false;
    }

    if (endMs !== undefined && tripStartMs > endMs) {
      return false;
    }

    return true;
  });
}

export function formatTripDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return dateFormatter.format(parsed);
}

export function formatTripDuration(durationSeconds: number): string {
  const safeSeconds = Number.isFinite(durationSeconds) && durationSeconds > 0 ? Math.floor(durationSeconds) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} min`;
}

export function formatTripDistance(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return '0 km';
  return `${Math.round(distanceKm * 10) / 10} km`;
}

export function formatTripAvgSpeed(avgSpeedKmh: number): string {
  if (!Number.isFinite(avgSpeedKmh) || avgSpeedKmh <= 0) return '0 km/h';
  return `${Math.round(avgSpeedKmh * 10) / 10} km/h`;
}

export function formatTripSourceLabel(source: Trip['source']): string {
  if (source === 'manual') return 'Manual';
  if (source === 'tracked') return 'Tracked';
  return 'Auto draft';
}

export function getTripRouteSummary(trip: Trip): string {
  const start = trip.startLocationLabel?.trim();
  const end = trip.endLocationLabel?.trim();

  if (start && end) return `${start} → ${end}`;
  if (start) return `${start} → Unnamed destination`;
  if (end) return `Unnamed start → ${end}`;

  return trip.source === 'manual' ? 'Manual trip' : 'Unnamed route';
}

function toStartOfDayMs(dateValue: string): number | undefined {
  if (!dateValue) return undefined;
  const parsed = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.getTime();
}

function toEndOfDayMs(dateValue: string): number | undefined {
  if (!dateValue) return undefined;
  const parsed = new Date(`${dateValue}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.getTime();
}
