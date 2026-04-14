import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CarFront, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { db } from '../../db/database';
import { VehicleCard, type VehicleMetrics } from './components/VehicleCard';
import { VehicleListLoadingState } from './components/VehicleLoadingState';

export default function VehiclesPage() {
  const navigate = useNavigate();
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []);
  const trips = useLiveQuery(() => db.trips.toArray(), []);
  const fuelEntries = useLiveQuery(() => db.fuelEntries.toArray(), []);

  const isLoading = vehicles === undefined || trips === undefined || fuelEntries === undefined;

  const metricsByVehicle = useMemo(() => {
    const map = new Map<string, VehicleMetrics>();

    vehicles?.forEach((vehicle) => {
      const vehicleTrips = trips?.filter((trip) => trip.vehicleId === vehicle.id) ?? [];
      const vehicleFuel = fuelEntries?.filter((entry) => entry.vehicleId === vehicle.id) ?? [];

      map.set(vehicle.id, {
        totalTrips: vehicleTrips.length,
        totalDistanceKm: vehicleTrips.reduce((sum, trip) => sum + trip.distanceKm, 0),
        totalFuelSpend: vehicleFuel.reduce((sum, entry) => sum + entry.totalPrice, 0)
      });
    });

    return map;
  }, [vehicles, trips, fuelEntries]);

  const hasNoVehicles = vehicles?.length === 0;

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Vehicles</h2>
          <p className="mt-1 text-sm text-slate-600">
            Overview of your cars, key specs, and quick usage metrics.
          </p>
        </div>
        <Link
          to="/vehicles/new"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={18} />
          Add Vehicle
        </Link>
      </header>

      {isLoading ? (
        <VehicleListLoadingState />
      ) : hasNoVehicles ? (
        <EmptyState
          icon={<CarFront size={24} aria-hidden />}
          title="No vehicles added yet"
          description="Start by adding your first vehicle so you can log trips, track routes, and analyze costs in one place."
          primaryActionLabel="Add your first vehicle"
          onPrimaryAction={() => navigate('/vehicles/new')}
          secondaryHint="After you add a vehicle, you can start trip tracking and fuel logging with vehicle-specific insights."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {vehicles?.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              metrics={metricsByVehicle.get(vehicle.id)}
              to={`/vehicles/${vehicle.id}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
