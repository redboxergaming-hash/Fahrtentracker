import type { ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { db } from '../../../db/database';
import { manualTripFormSchema, type ManualTripFormValues } from '../manualTripFoundation';

interface ManualTripFormProps {
  title: string;
  description: string;
  submitLabel: string;
  backTo: string;
  cancelTo: string;
  initialValues: ManualTripFormValues;
  onSubmit: (values: ManualTripFormValues) => Promise<void>;
}

export function ManualTripForm({
  title,
  description,
  submitLabel,
  backTo,
  cancelTo,
  initialValues,
  onSubmit
}: ManualTripFormProps) {
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ManualTripFormValues>({
    resolver: zodResolver(manualTripFormSchema),
    defaultValues: initialValues
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const submit = async (values: ManualTripFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      console.error(error);
      setError('root', { message: 'Could not save trip. Please try again.' });
    }
  };

  return (
    <section className="space-y-5">
      <Link
        to={backTo}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <ArrowLeft size={16} />
        Back to trips
      </Link>

      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <header className="space-y-2">
          <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">Manual trip</span>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
        </header>

        <FormSection title="Core trip info" description="Minimum details needed to define this trip." tone="core">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Vehicle" error={errors.vehicleId?.message} helperText="Required.">
              <select {...register('vehicleId')} className={inputClass}>
                <option value="">Select vehicle</option>
                {vehicles?.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} · {vehicle.brand} {vehicle.model}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Category" error={errors.category?.message} helperText="Optional, e.g. commute or business.">
              <input {...register('category')} className={inputClass} placeholder="Commute" />
            </Field>

            <Field label="Start date/time" error={errors.startTime?.message} helperText="Required.">
              <input {...register('startTime')} className={inputClass} type="datetime-local" />
            </Field>

            <Field label="End date/time" error={errors.endTime?.message} helperText="Required and must not be before start.">
              <input {...register('endTime')} className={inputClass} type="datetime-local" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Route & location info" description="Optional route details for better trip context." tone="optional">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Start location" error={errors.startLocationLabel?.message} helperText="Optional.">
              <input {...register('startLocationLabel')} className={optionalInputClass} placeholder="Home" />
            </Field>
            <Field label="End location" error={errors.endLocationLabel?.message} helperText="Optional.">
              <input {...register('endLocationLabel')} className={optionalInputClass} placeholder="Office" />
            </Field>
            <Field label="Start latitude" error={errors.startLat?.message} helperText="Optional decimal coordinate.">
              <input {...register('startLat')} className={optionalInputClass} inputMode="decimal" placeholder="48.1374" />
            </Field>
            <Field label="Start longitude" error={errors.startLng?.message} helperText="Optional decimal coordinate.">
              <input {...register('startLng')} className={optionalInputClass} inputMode="decimal" placeholder="11.5755" />
            </Field>
            <Field label="End latitude" error={errors.endLat?.message} helperText="Optional decimal coordinate.">
              <input {...register('endLat')} className={optionalInputClass} inputMode="decimal" placeholder="48.1500" />
            </Field>
            <Field label="End longitude" error={errors.endLng?.message} helperText="Optional decimal coordinate.">
              <input {...register('endLng')} className={optionalInputClass} inputMode="decimal" placeholder="11.5000" />
            </Field>
            <Field
              label="Direct distance (km)"
              error={errors.directDistanceKm?.message}
              helperText="Optional fallback if odometer values are unavailable."
            >
              <input {...register('directDistanceKm')} className={optionalInputClass} inputMode="decimal" placeholder="12.8" />
            </Field>
          </div>
        </FormSection>

        <FormSection
          title="Vehicle & odometer info"
          description="Optional, but preferred for accurate distance and metrics."
          tone="optional"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Odometer start" error={errors.odometerStart?.message} helperText="Optional total km at trip start.">
              <input {...register('odometerStart')} className={optionalInputClass} inputMode="decimal" placeholder="12540.0" />
            </Field>
            <Field
              label="Odometer end"
              error={errors.odometerEnd?.message}
              helperText="Optional total km at trip end. Must be ≥ start odometer."
            >
              <input {...register('odometerEnd')} className={optionalInputClass} inputMode="decimal" placeholder="12552.8" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="Notes & additional info" description="Any extra context you want to remember later." tone="optional">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Weather" error={errors.weather?.message} helperText="Optional.">
              <input {...register('weather')} className={optionalInputClass} placeholder="Cloudy" />
            </Field>
          </div>

          <Field label="Notes" error={errors.notes?.message} helperText="Optional free-form details.">
            <textarea {...register('notes')} className={`${optionalInputClass} min-h-24`} placeholder="Any additional details" />
          </Field>
        </FormSection>

        {errors.root?.message ? <p className="text-sm text-amber-700">{errors.root.message}</p> : null}

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Link
            to={cancelTo}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !vehicles || vehicles.length === 0}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            <Save size={16} />
            {isSubmitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}

const inputClass =
  'mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

const optionalInputClass =
  'mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100';

function FormSection({
  title,
  description,
  tone,
  children
}: {
  title: string;
  description: string;
  tone: 'core' | 'optional';
  children: ReactNode;
}) {
  return (
    <section className={tone === 'core' ? 'space-y-3' : 'space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4'}>
      <header>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-600">{description}</p>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  helperText,
  children
}: {
  label: string;
  error?: string;
  helperText?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-rose-600">{error}</span>
      ) : helperText ? (
        <span className="mt-1 block text-xs font-normal text-slate-500">{helperText}</span>
      ) : null}
    </label>
  );
}
