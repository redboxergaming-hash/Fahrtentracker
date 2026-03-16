import type { FuelEntry } from '../../types/models';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium'
});

const literFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

export function getRecentFuelEntries(entries: FuelEntry[], limit = 5): FuelEntry[] {
  return [...entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export function formatFuelDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return dateFormatter.format(parsed);
}

export function formatLiters(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${literFormatter.format(safeValue)} L`;
}
