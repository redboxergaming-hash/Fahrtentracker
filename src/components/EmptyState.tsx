import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  primaryActionLabel: string;
  onPrimaryAction?: () => void;
  secondaryHint?: string;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryHint,
  icon
}: EmptyStateProps) {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm sm:p-8">
      {icon ? <div className="mx-auto mb-3 flex w-fit items-center justify-center rounded-full bg-slate-100 p-3 text-slate-600">{icon}</div> : null}
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{description}</p>
      <button
        type="button"
        onClick={onPrimaryAction}
        className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
      >
        {primaryActionLabel}
      </button>
      {secondaryHint ? <p className="mx-auto mt-3 max-w-md text-xs text-slate-500">{secondaryHint}</p> : null}
    </section>
  );
}
