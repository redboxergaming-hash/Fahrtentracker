import { ArrowLeft, MapPin, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { db } from '../../db/database';
import type { Trip, Vehicle } from '../../types/models';
import { deleteManualTrip } from './tripMutations';
import {
  formatTripAvgSpeed,
  formatTripDate,
  formatTripDistance,
  formatTripDuration,
  formatTripSourceLabel,
  getTripRouteSummary
} from './tripPresentation';

export default function TripDetailPage() {
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!tripId) {
        if (isMounted) {
          setTrip(null);
          setVehicle(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      const foundTrip = await db.trips.get(tripId);
      const foundVehicle = foundTrip ? await db.vehicles.get(foundTrip.vehicleId) : undefined;

      if (!isMounted) return;
      setTrip(foundTrip ?? null);
      setVehicle(foundVehicle ?? null);
      setIsLoading(false);
      setShowDeleteConfirm(false);
      setDeleteError(null);
      setIsDeleting(false);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [tripId]);

  const handleDelete = async () => {
    if (!trip) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteManualTrip(trip.id);
      navigate('/trips', { replace: true });
    } catch (error) {
      console.error(error);
      setDeleteError('Could not delete trip. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!tripId) {
    return (
      <EmptyState
        title="Trip not found"
        description="No trip ID was provided."
        primaryActionLabel="Back to trips"
        onPrimaryAction={() => navigate('/trips')}
      />
    );
  }

  if (isLoading) {
    return (
      <section className="space-y-4">
        <BackToTripsLink />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-600">Loading trip details…</p>
        </div>
      </section>
    );
  }

  if (!trip) {
    return (
      <section className="space-y-4">
        <BackToTripsLink />
        <EmptyState
          title="Trip not found"
          description="This trip may have been removed or the link is invalid."
          primaryActionLabel="Go to Trips"
          onPrimaryAction={() => navigate('/trips')}
        />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <BackToTripsLink />

      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{formatTripDate(trip.startTime)}</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">{getTripRouteSummary(trip)}</h2>
            <p className="mt-1 text-sm text-slate-600">{vehicle ? `${vehicle.name} · ${vehicle.brand} ${vehicle.model}` : 'Unknown vehicle'}</p>
          </div>

          {trip.source === 'manual' ? (
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/trips/${trip.id}/edit`}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil size={14} />
                Edit trip
              </Link>

              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm((value) => !value);
                  setDeleteError(null);
                }}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
              >
                <Trash2 size={14} />
                Delete trip
              </button>
            </div>
          ) : null}
        </div>

        {showDeleteConfirm ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-sm font-medium text-rose-900">Delete this trip permanently?</p>
            <p className="mt-1 text-xs text-rose-700">This cannot be undone. This action only deletes the current manual trip.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex min-h-10 items-center rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {isDeleting ? 'Deleting…' : 'Yes, delete trip'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
            {deleteError ? <p className="mt-2 text-xs text-rose-700">{deleteError}</p> : null}
          </div>
        ) : null}
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Trip stats</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Distance" value={formatTripDistance(trip.distanceKm)} />
          <Stat label="Duration" value={formatTripDuration(trip.durationSeconds)} />
          <Stat label="Avg speed" value={formatTripAvgSpeed(trip.avgSpeedKmh)} />
          <Stat label="Max speed" value={trip.maxSpeedKmh > 0 ? `${trip.maxSpeedKmh} km/h` : '—'} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Trip details</h3>
        <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Detail label="Start date/time" value={formatDateTime(trip.startTime)} />
          <Detail label="End date/time" value={formatDateTime(trip.endTime)} />
          <Detail label="Vehicle" value={vehicle ? `${vehicle.name} · ${vehicle.brand} ${vehicle.model}` : 'Unknown vehicle'} />
          <Detail label="Category" value={trip.category?.trim() || '—'} />
          <Detail label="Source" value={formatTripSourceLabel(trip.source)} />
          <Detail label="Start location" value={trip.startLocationLabel?.trim() || '—'} />
          <Detail label="End location" value={trip.endLocationLabel?.trim() || '—'} />
          <Detail label="Odometer start" value={formatOptionalKm(trip.odometerStart)} />
          <Detail label="Odometer end" value={formatOptionalKm(trip.odometerEnd)} />
          <Detail label="Weather" value={trip.weather?.trim() || '—'} />
          <Detail label="Notes" value={trip.notes?.trim() || '—'} className="sm:col-span-2" />
        </dl>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
        <h3 className="text-lg font-semibold text-slate-900">Route</h3>
        <p className="mt-2 text-sm text-slate-600">Map and route visualization will be added in a later step.</p>
        <div className="mt-3 flex min-h-24 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
          <MapPin size={18} className="mr-2" /> Route placeholder
        </div>
      </section>
    </section>
  );
}


function BackToTripsLink() {
  return (
    <Link
      to="/trips"
      className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <ArrowLeft size={16} />
      Back to trips
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value}</p>
    </div>
  );
}

function Detail({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
}

function formatOptionalKm(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return `${Math.round(value * 10) / 10} km`;
}
