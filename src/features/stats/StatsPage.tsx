import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarRange, ChartNoAxesColumn, CarFront, Filter } from 'lucide-react';
import { db } from '../../db/database';

type DatePreset = 'all-time' | 'this-month' | 'year-to-date' | 'custom';

interface StatsFilters {
  vehicleId: string;
  datePreset: DatePreset;
  startDate: string;
  endDate: string;
  category: string;
}

const defaultFilters: StatsFilters = {
  vehicleId: '',
  datePreset: 'all-time',
  startDate: '',
  endDate: '',
  category: ''
};

export default function StatsPage() {
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []);
  const [filters, setFilters] = useState<StatsFilters>(defaultFilters);

  const safeVehicles = vehicles ?? [];

  const datePresetHint = useMemo(() => {
    if (filters.datePreset === 'all-time') {
      return 'Showing all available records.';
    }

    if (filters.datePreset === 'this-month') {
      return 'Quick preset for the current month.';
    }

    if (filters.datePreset === 'year-to-date') {
      return 'Quick preset from January 1st until today.';
    }

    return 'Custom range will be used once statistics cards are connected.';
  }, [filters.datePreset]);

  const updatePreset = (datePreset: DatePreset) => {
    setFilters((previous) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;

      if (datePreset === 'this-month') {
        return { ...previous, datePreset, startDate: `${year}-${month}-01`, endDate: today };
      }

      if (datePreset === 'year-to-date') {
        return { ...previous, datePreset, startDate: `${year}-01-01`, endDate: today };
      }

      if (datePreset === 'all-time') {
        return { ...previous, datePreset, startDate: '', endDate: '' };
      }

      return { ...previous, datePreset };
    });
  };

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-2xl font-semibold text-slate-900">Statistics</h2>
        <p className="mt-1 text-sm text-slate-600">
          Summarize your driving and fuel habits with reusable filters across all vehicles.
        </p>
      </header>

      <section className="top-2 z-10 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:sticky sm:p-5">
        <div className="flex items-center gap-2 text-slate-700">
          <Filter size={16} />
          <h3 className="text-sm font-semibold uppercase tracking-wide">Filters</h3>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-medium text-slate-600">
            Vehicle
            <div className="relative mt-1">
              <CarFront size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={filters.vehicleId}
                onChange={(event) => setFilters((prev) => ({ ...prev, vehicleId: event.target.value }))}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">All vehicles</option>
                {safeVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="text-xs font-medium text-slate-600">
            Date preset
            <select
              value={filters.datePreset}
              onChange={(event) => updatePreset(event.target.value as DatePreset)}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              <option value="all-time">All time</option>
              <option value="this-month">This month</option>
              <option value="year-to-date">Year to date</option>
              <option value="custom">Custom range</option>
            </select>
          </label>

          <label className="text-xs font-medium text-slate-600">
            Start date
            <div className="relative mt-1">
              <CalendarRange size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value, datePreset: 'custom' }))}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </label>

          <label className="text-xs font-medium text-slate-600">
            End date
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value, datePreset: 'custom' }))}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="text-xs font-medium text-slate-600 md:col-span-2 xl:col-span-1">
            Category (coming soon)
            <select
              value={filters.category}
              onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              disabled
            >
              <option value="">All categories</option>
            </select>
          </label>
        </div>

        <p className="text-xs text-slate-500">{datePresetHint}</p>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-slate-700">
          <ChartNoAxesColumn size={16} />
          <h3 className="text-base font-semibold">Summary cards</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50" />
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-base font-semibold text-slate-900">Charts</h3>
        <div className="h-52 rounded-xl border border-dashed border-slate-300 bg-slate-50" />
      </section>
    </section>
  );
}
