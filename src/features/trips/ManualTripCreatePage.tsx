import { useNavigate } from 'react-router-dom';
import { ManualTripForm } from './components/ManualTripForm';
import { manualTripDefaultValues, type ManualTripFormValues } from './manualTripFoundation';
import { createManualTrip } from './tripMutations';

export default function ManualTripCreatePage() {
  const navigate = useNavigate();

  const onSubmit = async (values: ManualTripFormValues) => {
    await createManualTrip(values);
    navigate('/trips', { replace: true });
  };

  return (
    <ManualTripForm
      title="Add Manual Trip"
      description="Core fields first. Advanced fields are optional and can be filled in later."
      submitLabel="Save trip"
      backTo="/trips"
      cancelTo="/trips"
      initialValues={manualTripDefaultValues}
      onSubmit={onSubmit}
    />
  );
}
