import { useNavigate } from 'react-router-dom';
import { VehicleForm } from './components/VehicleForm';
import { defaultVehicleFormValues, toOptionalNumber, type VehicleFormValues } from './vehicleFormSchema';
import { createVehicle } from './vehicleMutations';

export default function VehicleCreatePage() {
  const navigate = useNavigate();

  const onSubmit = async (values: VehicleFormValues) => {
    const createdVehicle = await createVehicle({
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

    navigate(`/vehicles/${createdVehicle.id}`, { replace: true });
  };

  return (
    <VehicleForm
      title="Add Vehicle"
      description="Create your vehicle profile to unlock trip and fuel tracking."
      submitLabel="Create vehicle"
      backTo="/vehicles"
      cancelTo="/vehicles"
      initialValues={defaultVehicleFormValues}
      onSubmit={onSubmit}
    />
  );
}
