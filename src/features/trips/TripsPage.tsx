import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Route, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { db } from '../../db/database';
import { TripListItem, getVehicleLabel } from './components/TripListItem';
import { filterTrips, type TripFilters } from './tripPresentation';

const defaultFilters: TripFilters = {
  searchText: '',
  vehicleId: '',
  category: '',
  startDate: '',
  endDate: ''
};

export default function TripsPage() {
  const navigate = useNavigate();
  const trips = useLiveQuery(() => db.trips.orderBy('startTime').reverse().toArray(), []);
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []);
  const [filters, setFilters] = useState<TripFilters>(defaultFilters);

  const safeTrips = trips ?? [];
  const safeVehicles = vehicles ?? [];

  const vehicleById = useMemo(
    () => new Map(safeVehicles.map((vehicle) => [vehicle.id, vehicle])),
    [safeVehicles]
  );

  const categoryOptions = useMemo(() => {
    const unique = new Set(
      safeTrips
        .map((trip) => trip.category?.trim())
        .filter((value): value is string => Boolean(value))
    );

    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [safeTrips]);

  const filteredTrips = useMemo(() => filterTrips(safeTrips, filters), [safeTrips, filters]);

  const hasNoTrips = trips && trips.length === 0;
  const hasActiveFilters =
    filters.searchText || filters.vehicleId || filters.category || filters.startDate || filters.endDate;

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Trips</h2>
          <p className="text-sm text-slate-600">A clear overview of your saved drives, including manual entries.</p>
        </div>
        <Link
          to="/trips/new"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={18} />
          Add Trip
        </Link>
      </header>

      {!hasNoTrips ? (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <SlidersHorizontal size={16} />
              Search & filters
            </div>
            <p className="text-xs text-slate-500">{filteredTrips.length} result{filteredTrips.length === 1 ? '' : 's'}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-xs font-medium text-slate-600 sm:col-span-2 lg:col-span-1">
              Search
              <div className="relative mt-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={filters.searchText}
                  onChange={(event) => setFilters((prev) => ({ ...prev, searchText: event.target.value }))}
                  placeholder="Location labels or notes"
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            </label>

            <label className="block text-xs font-medium text-slate-600">
              Vehicle
              <select
                value={filters.vehicleId}
                onChange={(event) => setFilters((prev) => ({ ...prev, vehicleId: event.target.value }))}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">All vehicles</option>
                {safeVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-slate-600">
              Category
              <select
                value={filters.category}
                onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-slate-600">
              From
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <label className="block text-xs font-medium text-slate-600">
              To
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>

          {hasActiveFilters ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFilters(defaultFilters)}
                className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {hasNoTrips ? (
        <EmptyState
          title="No trips yet"
          description="Start with a quick manual trip entry to build your trip history."
          primaryActionLabel="Add Trip"
          onPrimaryAction={() => navigate('/trips/new')}
          secondaryHint="Trips saved here are available instantly, even offline."
          icon={<Route size={20} />}
        />
      ) : filteredTrips.length === 0 ? (
        <EmptyState
          title="No trips match your filters"
          description="Try adjusting your search text or filter values to see more trips."
          primaryActionLabel="Clear filters"
          onPrimaryAction={() => setFilters(defaultFilters)}
          secondaryHint="Filtering is local and instant, so your data stays on-device."
          icon={<Search size={20} />}
        />
      ) : (
        <div className="space-y-3">
          {filteredTrips.map((trip) => (
            <TripListItem
              key={trip.id}
              trip={trip}
              vehicleName={getVehicleLabel(vehicleById.get(trip.vehicleId))}
            />
          ))}
        </div>
      )}
    </section>
  );
}
