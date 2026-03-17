import type { ChangeEvent, ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ImagePlus, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { resizeImageFileToDataUrl } from '../imageProcessing';
import { vehicleFormSchema, type VehicleFormValues } from '../vehicleFormSchema';

interface VehicleFormProps {
  title: string;
  description: string;
  submitLabel: string;
  backTo: string;
  cancelTo: string;
  initialValues: VehicleFormValues;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
}

export function VehicleForm({
  title,
  description,
  submitLabel,
  backTo,
  cancelTo,
  initialValues,
  onSubmit
}: VehicleFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    setError
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: initialValues
  });

  const imagePreview = watch('imageUrl');

  useEffect(() => {
    reset(initialValues);
    setImageError(null);
  }, [initialValues, reset]);

  const submit = async (values: VehicleFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      console.error(error);
      setError('root', { message: 'Could not save vehicle. Please try again.' });
    }
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file.');
      return;
    }

    try {
      const processedDataUrl = await resizeImageFileToDataUrl(file);
      setValue('imageUrl', processedDataUrl, { shouldDirty: true });
      setImageError(null);
    } catch (error) {
      console.error(error);
      setImageError('Could not process the selected image. Try another file.');
    }
  };

  const removeImage = () => {
    setValue('imageUrl', '', { shouldDirty: true });
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <section className="space-y-5">
      <Link
        to={backTo}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <header>
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-700">Vehicle image</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-20 w-20 overflow-hidden rounded-xl bg-slate-200">
              {imagePreview ? (
                <img src={imagePreview} alt="Selected vehicle" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">No image</div>
              )}
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <ImagePlus size={14} />
                {imagePreview ? 'Change image' : 'Upload image'}
              </button>
              {imagePreview ? (
                <button
                  type="button"
                  onClick={removeImage}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              ) : null}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFileChange}
            className="hidden"
          />
          {imageError ? <p className="mt-2 text-xs text-rose-600">{imageError}</p> : null}
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name" error={errors.name?.message}>
            <input {...register('name')} className={inputClass} placeholder="Family Wagon" />
          </Field>

          <Field label="Brand" error={errors.brand?.message}>
            <input {...register('brand')} className={inputClass} placeholder="Skoda" />
          </Field>

          <Field label="Model" error={errors.model?.message}>
            <input {...register('model')} className={inputClass} placeholder="Octavia" />
          </Field>

          <Field label="Year" error={errors.year?.message}>
            <input {...register('year')} className={inputClass} inputMode="numeric" />
          </Field>

          <Field label="License plate (optional)" error={errors.licensePlate?.message}>
            <input {...register('licensePlate')} className={inputClass} placeholder="M-AB 1234" />
          </Field>

          <Field label="Fuel type" error={errors.fuelType?.message}>
            <select {...register('fuelType')} className={inputClass}>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Electric</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </Field>

          <Field label="Tank capacity (L, optional)" error={errors.tankCapacityLiters?.message}>
            <input {...register('tankCapacityLiters')} className={inputClass} inputMode="decimal" placeholder="50" />
          </Field>

          <Field label="Default consumption (L/100km, optional)" error={errors.defaultConsumptionLPer100Km?.message}>
            <input
              {...register('defaultConsumptionLPer100Km')}
              className={inputClass}
              inputMode="decimal"
              placeholder="5.8"
            />
          </Field>

          <Field label="Color (optional)" error={errors.color?.message}>
            <input {...register('color')} className={inputClass} placeholder="#1d4ed8" />
          </Field>
        </div>

        <Field label="Notes (optional)" error={errors.notes?.message}>
          <textarea {...register('notes')} className={`${inputClass} min-h-24`} placeholder="Main family car" />
        </Field>

        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <input type="checkbox" {...register('isDefault')} className="h-4 w-4 rounded border-slate-300" />
          Set as default vehicle
        </label>

        {errors.root?.message ? <p className="text-sm text-rose-700">{errors.root.message}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link
            to={cancelTo}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {submitLabel.toLowerCase().includes('update') ? <Save size={16} /> : <Plus size={16} />}
            {isSubmitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}

const inputClass =
  'mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
      {error ? <span className="mt-1 block text-xs text-rose-600">{error}</span> : null}
    </label>
  );
}
