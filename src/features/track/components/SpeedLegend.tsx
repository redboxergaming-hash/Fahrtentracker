import { SPEED_LEGEND_BANDS } from '../speedLegend';

export function SpeedLegend() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <h4 className="text-sm font-semibold text-slate-900">Speed legend</h4>
      <p className="mt-1 text-xs text-slate-600">Each segment color reflects the representative speed between adjacent points.</p>

      <ul className="mt-3 space-y-2">
        {SPEED_LEGEND_BANDS.map((band) => (
          <li
            key={band.key}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-3.5 w-3.5 flex-shrink-0 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: band.colorValue }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-900">{band.label}</p>
                {band.shortDescription ? <p className="text-[11px] text-slate-500">{band.shortDescription}</p> : null}
              </div>
            </div>
            <span className="w-fit rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700">
              {band.thresholdMeaning}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
