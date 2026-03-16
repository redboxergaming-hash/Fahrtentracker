import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';

export default function DashboardPage() {
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []);
  const trips = useLiveQuery(() => db.trips.toArray(), []);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-slate-500">Local-first driving insights.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Vehicles" value={vehicles?.length ?? 0} />
        <Metric label="Trips" value={trips?.length ?? 0} />
        <Metric label="Distance" value={`${(trips?.reduce((sum, t) => sum + t.distanceKm, 0) ?? 0).toFixed(1)} km`} />
        <Metric label="Avg Speed" value={`${(trips?.reduce((sum, t) => sum + t.avgSpeedKmh, 0) ?? 0).toFixed(1)} km/h`} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-lg font-medium">Recent Trip</h3>
        {trips?.[0] ? (
          <p className="text-sm text-slate-600">{trips[0].startLocationLabel} → {trips[0].endLocationLabel} · {trips[0].distanceKm} km</p>
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
