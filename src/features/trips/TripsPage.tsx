import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';

export default function TripsPage() {
  const trips = useLiveQuery(() => db.trips.toArray(), []);

  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">Trips</h2>
      <div className="space-y-3">
        {trips?.map((trip) => (
          <article key={trip.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-medium">{trip.startLocationLabel} → {trip.endLocationLabel}</p>
            <p className="text-sm text-slate-500">{new Date(trip.startTime).toLocaleDateString()} · {trip.distanceKm} km · {trip.durationSeconds / 60} min</p>
          </article>
        ))}
      </div>
    </section>
  );
}
