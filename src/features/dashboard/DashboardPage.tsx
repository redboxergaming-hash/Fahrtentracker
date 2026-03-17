import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';

export default function DashboardPage() {
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []);
  const trips = useLiveQuery(() => db.trips.orderBy('startTime').reverse().toArray(), []);

  const tripMetrics = useMemo(() => {
    const safeTrips = trips ?? [];
    const totalDistanceKm = safeTrips.reduce((sum, trip) => sum + trip.distanceKm, 0);
    const averageSpeedKmh = safeTrips.length > 0
      ? safeTrips.reduce((sum, trip) => sum + trip.avgSpeedKmh, 0) / safeTrips.length
      : 0;

    return {
      totalDistanceKm,
      averageSpeedKmh,
      recentTrip: safeTrips[0]
    };
  }, [trips]);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-slate-500">Local-first driving insights.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Vehicles" value={vehicles?.length ?? 0} />
        <Metric label="Trips" value={trips?.length ?? 0} />
        <Metric label="Distance" value={`${tripMetrics.totalDistanceKm.toFixed(1)} km`} />
        <Metric label="Avg Speed" value={`${tripMetrics.averageSpeedKmh.toFixed(1)} km/h`} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-lg font-medium">Recent Trip</h3>
        {tripMetrics.recentTrip ? (
          <p className="text-sm text-slate-600">
            {tripMetrics.recentTrip.startLocationLabel} → {tripMetrics.recentTrip.endLocationLabel} · {tripMetrics.recentTrip.distanceKm} km
          </p>
        ) : (
          <p className="text-sm text-slate-500">No trips yet.</p>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
