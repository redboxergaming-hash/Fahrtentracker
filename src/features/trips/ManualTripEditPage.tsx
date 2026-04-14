import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/EmptyState';
import { db } from '../../db/database';
import { ManualTripForm } from './components/ManualTripForm';
import {
  manualTripDefaultValues,
  toManualTripFormValues,
  type ManualTripFormValues
} from './manualTripFoundation';
import { updateManualTrip } from './tripMutations';

export default function ManualTripEditPage() {
  const navigate = useNavigate();
  const { tripId } = useParams<{ tripId: string }>();

  const trip = useLiveQuery(
    async () => (tripId ? db.trips.get(tripId) : undefined),
    [tripId]
  );

  if (!tripId) {
    return (
      <EmptyState
        title="Trip not found"
        description="No trip ID was provided."
        primaryActionLabel="Back to Trips"
        onPrimaryAction={() => navigate('/trips')}
      />
    );
  }

  if (trip === undefined) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">Loading trip…</p>
      </section>
    );
  }

  if (!trip) {
    return (
      <EmptyState
        title="Trip not found"
        description="This trip may have been removed or the link is invalid."
        primaryActionLabel="Back to Trips"
        onPrimaryAction={() => navigate('/trips')}
      />
    );
  }

  if (trip.source !== 'manual') {
    return (
      <EmptyState
        title="Editing not supported"
        description="Only manual trips can be edited in this step."
        primaryActionLabel="Back to trip"
        onPrimaryAction={() => navigate(`/trips/${trip.id}`)}
      />
    );
  }

  const onSubmit = async (values: ManualTripFormValues) => {
    await updateManualTrip(trip.id, values);
    navigate(`/trips/${trip.id}`, { replace: true });
  };

  return (
    <ManualTripForm
      title="Edit Manual Trip"
      description="Update trip details. Derived values are recalculated on save."
      submitLabel="Update trip"
      backTo={`/trips/${trip.id}`}
      cancelTo={`/trips/${trip.id}`}
      initialValues={toManualTripFormValues(trip) || manualTripDefaultValues}
      onSubmit={onSubmit}
    />
  );
}
