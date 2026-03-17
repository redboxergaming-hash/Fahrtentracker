import type { Trip, Vehicle } from '../../../types/models';
import { Link } from 'react-router-dom';
import {
  formatTripAvgSpeed,
  formatTripDate,
  formatTripDistance,
  formatTripDuration,
  formatTripSourceLabel,
  getTripRouteSummary
} from '../tripPresentation';

interface TripListItemProps {
  trip: Trip;
  vehicleName?: string;
}

export function TripListItem({ trip, vehicleName }: TripListItemProps) {
  const sourceLabel = formatTripSourceLabel(trip.source);
  const isManual = trip.source === 'manual';

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="group block space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:bg-sky-50/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{formatTripDate(trip.startTime)}</p>
          <p className="truncate text-base font-semibold text-slate-900 group-hover:text-sky-900">{getTripRouteSummary(trip)}</p>
          <p className="mt-1 text-sm text-slate-600">{vehicleName ?? 'Unknown vehicle'}</p>
          <p className="mt-1 text-xs text-slate-500">Tap for details</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            isManual ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {sourceLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Metric label="Distance" value={formatTripDistance(trip.distanceKm)} />
        <Metric label="Duration" value={formatTripDuration(trip.durationSeconds)} />
        <Metric label="Avg speed" value={formatTripAvgSpeed(trip.avgSpeedKmh)} />
        <Metric label="Category" value={trip.category?.trim() || '—'} />
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value}</p>
    </div>
  );
}

export function getVehicleLabel(vehicle?: Vehicle): string {
  if (!vehicle) return 'Unknown vehicle';
  return `${vehicle.name} · ${vehicle.brand} ${vehicle.model}`;
}
