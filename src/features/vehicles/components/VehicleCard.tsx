import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CarFront, Fuel, MapPinned, ReceiptText } from 'lucide-react';
import type { Vehicle } from '../../../types/models';

export interface VehicleMetrics {
  totalTrips: number;
  totalDistanceKm: number;
  totalFuelSpend: number;
}

interface VehicleCardProps {
  vehicle: Vehicle;
  metrics?: VehicleMetrics;
  to?: string;
}

export function VehicleCard({ vehicle, metrics, to }: VehicleCardProps) {
  const cardContent = (
    <>
      <div className="flex items-start gap-4">
        <VehicleImage imageUrl={vehicle.imageUrl} name={vehicle.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{vehicle.name}</h3>
            {vehicle.isDefault && (
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">
                Default
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {vehicle.brand} · {vehicle.model} · {vehicle.year}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Chip icon={<Fuel size={12} />} label={vehicle.fuelType} />
            <Chip label={vehicle.licensePlate ?? 'No license plate'} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
        <Metric label="Trips" value={(metrics?.totalTrips ?? 0).toString()} icon={<MapPinned size={14} />} />
        <Metric
          label="Distance"
          value={metrics ? `${metrics.totalDistanceKm.toFixed(1)} km` : '—'}
          icon={<CarFront size={14} />}
        />
        <Metric
          label="Fuel spend"
          value={metrics ? `€${metrics.totalFuelSpend.toFixed(2)}` : '—'}
          icon={<ReceiptText size={14} />}
        />
      </div>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow-md"
      >
        {cardContent}
      </Link>
    );
  }

  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{cardContent}</article>;
}

export function VehicleImage({ imageUrl, name, size = 'md' }: { imageUrl?: string; name: string; size?: 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-24 w-24' : 'h-20 w-20';

  if (imageUrl) {
    return <img src={imageUrl} alt={name} className={`${sizeClass} rounded-xl object-cover`} />;
  }

  return (
    <div className={`flex ${sizeClass} items-center justify-center rounded-xl bg-slate-100 text-slate-600`}>
      <CarFront size={size === 'lg' ? 34 : 30} aria-hidden />
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-lg bg-white p-2">
      <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Chip({ label, icon }: { label: string; icon?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
      {icon}
      {label}
    </span>
  );
}
