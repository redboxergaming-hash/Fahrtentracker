import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { db } from '../../db/database';
import { VehicleForm } from './components/VehicleForm';
import { VehicleDetailLoadingState } from './components/VehicleLoadingState';
import { mapVehicleToFormValues, toOptionalNumber, type VehicleFormValues } from './vehicleFormSchema';
import { updateVehicle } from './vehicleMutations';

export default function VehicleEditPage() {
  const navigate = useNavigate();
  const { vehicleId = '' } = useParams<{ vehicleId: string }>();
  const vehicle = useLiveQuery(() => db.vehicles.get(vehicleId), [vehicleId]);

  if (vehicle === undefined) {
    return <VehicleDetailLoadingState />;
  }

  if (!vehicle) {
    return (
      <EmptyState
        title="Vehicle not found"
        description="This vehicle could not be loaded for editing."
        primaryActionLabel="Back to vehicles"
        onPrimaryAction={() => navigate('/vehicles')}
      />
    );
  }

  const onSubmit = async (values: VehicleFormValues) => {
    await updateVehicle(vehicle.id, {
      name: values.name,
      brand: values.brand,
      model: values.model,
      year: Number(values.year),
      licensePlate: values.licensePlate,
      fuelType: values.fuelType,
      tankCapacityLiters: toOptionalNumber(values.tankCapacityLiters),
      defaultConsumptionLPer100Km: toOptionalNumber(values.defaultConsumptionLPer100Km),
      color: values.color,
      notes: values.notes,
      imageUrl: values.imageUrl,
      isDefault: Boolean(values.isDefault)
    });

    navigate(`/vehicles/${vehicle.id}`, { replace: true });
  };

  return (
    <VehicleForm
      title="Edit Vehicle"
      description="Update vehicle details and preferences."
      submitLabel="Update vehicle"
      backTo={`/vehicles/${vehicle.id}`}
      cancelTo={`/vehicles/${vehicle.id}`}
      initialValues={mapVehicleToFormValues(vehicle)}
      onSubmit={onSubmit}
    />
  );
}
