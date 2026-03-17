export function VehicleListLoadingState() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Loading vehicles">
      {Array.from({ length: 2 }).map((_, index) => (
        <article key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex gap-4">
            <div className="h-20 w-20 rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/5 rounded bg-slate-200" />
              <div className="h-3 w-3/5 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          </div>
          <div className="mt-4 h-16 rounded-xl bg-slate-100" />
        </article>
      ))}
    </div>
  );
}

export function VehicleDetailLoadingState() {
  return (
    <section className="animate-pulse space-y-4" aria-label="Loading vehicle details">
      <div className="h-11 w-36 rounded-xl bg-slate-200" />
      <article className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex gap-4">
          <div className="h-24 w-24 rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-2/5 rounded bg-slate-200" />
            <div className="h-3 w-3/5 rounded bg-slate-100" />
            <div className="h-3 w-2/5 rounded bg-slate-100" />
          </div>
        </div>
      </article>
    </section>
  );
}
