import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CarFront } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { db } from '../../db/database';

export default function DashboardPage() {
  const navigate = useNavigate();
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []);
  const trips = useLiveQuery(() => db.trips.orderBy('startTime').reverse().toArray(), []);

  const safeVehicles = vehicles ?? [];
  const safeTrips = trips ?? [];

  const tripMetrics = useMemo(() => {
    const totalDistanceKm = safeTrips.reduce((sum, trip) => sum + trip.distanceKm, 0);
    const averageSpeedKmh = safeTrips.length > 0
      ? safeTrips.reduce((sum, trip) => sum + trip.avgSpeedKmh, 0) / safeTrips.length
      : 0;

    return {
      totalDistanceKm,
      averageSpeedKmh,
      recentTrip: safeTrips[0]
    };
  }, [safeTrips]);

  const isEmpty = safeVehicles.length === 0 && safeTrips.length === 0;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-sm text-slate-500">Local-first driving insights.</p>
      </header>

      {isEmpty ? (
        <EmptyState
          icon={<CarFront size={22} aria-hidden />}
          title="Start by adding a vehicle or tracking a trip"
          description="Your dashboard will show distance, speed, and recent activity once you create your first records."
          primaryActionLabel="Add vehicle"
          onPrimaryAction={() => navigate('/vehicles/new')}
          secondaryHint="You can then add manual trips or use live tracking while the app is open."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Vehicles" value={safeVehicles.length} />
            <Metric label="Trips" value={safeTrips.length} />
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
        </>
      )}
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
