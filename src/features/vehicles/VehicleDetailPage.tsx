import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Pencil, Fuel, TriangleAlert, Trash2, Wrench } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { db } from '../../db/database';
import {
  formatFuelDate,
  formatLiters,
  getRecentFuelEntries
} from '../fuel/fuelPresentation';
import {
  formatTripDate,
  formatTripDuration,
  getRecentTrips,
  getTripRouteSummary
} from '../trips/tripPresentation';
import { VehicleImage } from './components/VehicleCard';
import {
  formatCurrency,
  formatDistanceKm,
  formatInteger,
  getVehicleDerivedMetrics
} from './vehicleMetrics';
import { deleteVehicleSafely } from './vehicleMutations';
import { VehicleDetailLoadingState } from './components/VehicleLoadingState';

export default function VehicleDetailPage() {
  const navigate = useNavigate();
  const { vehicleId = '' } = useParams<{ vehicleId: string }>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  const vehicle = useLiveQuery(() => db.vehicles.get(vehicleId), [vehicleId]);
  const trips = useLiveQuery(() => db.trips.where('vehicleId').equals(vehicleId).toArray(), [vehicleId]);
  const fuelEntries = useLiveQuery(() => db.fuelEntries.where('vehicleId').equals(vehicleId).toArray(), [vehicleId]);

  const tripList = trips ?? [];
  const vehicleFuelEntries = fuelEntries ?? [];
  const summary = useMemo(
    () => getVehicleDerivedMetrics(tripList, vehicleFuelEntries),
    [tripList, vehicleFuelEntries]
  );
  const recentTrips = useMemo(() => getRecentTrips(tripList, 5), [tripList]);
  const recentFuelEntries = useMemo(
    () => getRecentFuelEntries(vehicleFuelEntries, 5),
    [vehicleFuelEntries]
  );

  if (vehicle === undefined) {
    return <VehicleDetailLoadingState />;
  }

  if (!vehicle) {
    return (
      <section className="space-y-5">
        <BackLink />
        <EmptyState
          title="Vehicle not found"
          description="This vehicle does not exist anymore or the link is invalid."
          primaryActionLabel="Back to vehicles"
          onPrimaryAction={() => window.history.back()}
          secondaryHint="You can return to your vehicle list and choose another one."
        />
      </section>
    );
  }

  const hasLinkedRecords = tripList.length > 0 || vehicleFuelEntries.length > 0;

  const handleDelete = async () => {
    const result = await deleteVehicleSafely(vehicle.id);

    if (result.ok) {
      navigate('/vehicles', { replace: true });
      return;
    }

    if (result.reason === 'linked_records') {
      setDeleteMessage('This vehicle cannot be deleted because it has linked trips or fuel entries.');
    } else {
      setDeleteMessage('Vehicle could not be deleted. Please refresh and try again.');
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <BackLink />
        <Link
          to={`/vehicles/${vehicle.id}/edit`}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-4">
          <VehicleImage imageUrl={vehicle.imageUrl} name={vehicle.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-slate-900">{vehicle.name}</h2>
              {vehicle.isDefault && (
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">Default</span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {vehicle.brand} · {vehicle.model} · {vehicle.year}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Pill icon={<Fuel size={12} />} label={vehicle.fuelType} />
              <Pill label={vehicle.licensePlate ?? 'No license plate'} />
            </div>
            {vehicle.notes ? <p className="mt-3 text-sm text-slate-600">{vehicle.notes}</p> : null}
            <p className="mt-3 text-xs text-slate-500">Last activity: {summary.lastActivityLabel}</p>
          </div>
        </div>
      </article>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Total trips" value={formatInteger(summary.totalTrips)} />
        <SummaryCard label="Total distance" value={formatDistanceKm(summary.totalDistanceKm)} />
        <SummaryCard label="Fuel spend" value={formatCurrency(summary.totalFuelSpend)} />
        <SummaryCard label="Fuel entries" value={formatInteger(summary.totalFuelEntries)} />
        <SummaryCard label="Maintenance" value="Coming soon" icon={<Wrench size={14} />} muted />
      </div>

      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-2">
          <TriangleAlert size={18} className="mt-0.5 text-rose-600" />
          <div>
            <h3 className="text-base font-semibold text-rose-900">Delete vehicle</h3>
            <p className="mt-1 text-sm text-rose-800">
              Deletion is permanent. For safety, vehicles with linked trips or fuel entries cannot be deleted.
            </p>
            {hasLinkedRecords ? (
              <p className="mt-2 text-xs text-rose-700">
                Linked records found: {tripList.length} trip(s), {vehicleFuelEntries.length} fuel entr{vehicleFuelEntries.length === 1 ? 'y' : 'ies'}.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {!showDeleteConfirm ? (
            <button
              type="button"
              disabled={hasLinkedRecords}
              onClick={() => {
                setShowDeleteConfirm(true);
                setDeleteMessage(null);
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={14} />
              Delete vehicle
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white"
              >
                Confirm delete
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="inline-flex min-h-10 items-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700"
              >
                Cancel
              </button>
            </div>
          )}
          {deleteMessage ? <p className="text-xs text-rose-700">{deleteMessage}</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Recent Trips</h3>
            <p className="text-sm text-slate-600">Latest drives recorded for this vehicle.</p>
          </div>
          <Link
            to="/trips"
            className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
          >
            View all
          </Link>
        </div>

        {recentTrips.length === 0 ? (
          <EmptyState
            title="No trips yet"
            description="Trips for this vehicle will appear here once you add a manual trip or save a tracked drive."
            primaryActionLabel="Go to trips"
            onPrimaryAction={() => navigate('/trips')}
            secondaryHint="You can start with a quick manual entry from the Trips page."
          />
        ) : (
          <div className="space-y-2">
            {recentTrips.map((trip) => (
              <article key={trip.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{formatTripDate(trip.startTime)}</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{getTripRouteSummary(trip)}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {formatDistanceKm(trip.distanceKm)} · {formatTripDuration(trip.durationSeconds)}
                  {trip.avgSpeedKmh > 0 ? ` · Avg ${Math.round(trip.avgSpeedKmh)} km/h` : ''}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Recent Fuel Entries</h3>
            <p className="text-sm text-slate-600">Latest refuels recorded for this vehicle.</p>
          </div>
          <Link
            to="/fuel"
            className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
          >
            View all
          </Link>
        </div>

        {recentFuelEntries.length === 0 ? (
          <EmptyState
            title="No fuel entries yet"
            description="Your recent fuel history will appear here after you log your first refuel."
            primaryActionLabel="Go to fuel"
            onPrimaryAction={() => navigate('/fuel')}
            secondaryHint="Track liters, prices, and stations to understand running costs over time."
          />
        ) : (
          <div className="space-y-2">
            {recentFuelEntries.map((entry) => (
              <article key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500">{formatFuelDate(entry.date)}</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{entry.stationName || 'Station not specified'}</p>
                  </div>
                  {entry.fullTank ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-800">
                      Full tank
                    </span>
                  ) : null}
                </div>

                <p className="mt-1 text-xs text-slate-600">
                  {formatLiters(entry.liters)} · {formatCurrency(entry.totalPrice)} · {formatCurrency(entry.pricePerLiter)}/L
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function BackLink() {
  return (
    <Link
      to="/vehicles"
      className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
    >
      <ArrowLeft size={16} />
      Back to vehicles
    </Link>
  );
}

function SummaryCard({ label, value, icon, muted = false }: { label: string; value: string; icon?: ReactNode; muted?: boolean }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>
      <p className={`mt-2 text-lg font-semibold ${muted ? 'text-slate-500' : 'text-slate-900'}`}>{value}</p>
    </article>
  );
}

function Pill({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
      {icon}
      {label}
    </span>
  );
}
