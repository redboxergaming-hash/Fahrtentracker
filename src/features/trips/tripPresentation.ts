import type { Trip } from '../../types/models';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium'
});

export function getRecentTrips(trips: Trip[], limit = 5): Trip[] {
  return [...trips]
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, limit);
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

export function getTripRouteSummary(trip: Trip): string {
  const start = trip.startLocationLabel?.trim();
  const end = trip.endLocationLabel?.trim();

  if (start && end) return `${start} → ${end}`;
  if (start) return `${start} → Unnamed destination`;
  if (end) return `Unnamed start → ${end}`;

  return trip.source === 'manual' ? 'Manual trip' : 'Unnamed route';
}
