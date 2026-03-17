import type { SpeedBandId, SpeedColorToken } from './routeSpeedSegmentation';

export interface SpeedLegendBand {
  key: SpeedBandId;
  label: string;
  /**
   * Upper bound used for classification and range rendering.
   */
  maxKmh: number;
  colorToken: SpeedColorToken;
  colorValue: string;
  thresholdMeaning: string;
  shortDescription?: string;
}

/**
 * Single source of truth for speed-band semantics and visuals.
 */
export const SPEED_LEGEND_BANDS: SpeedLegendBand[] = [
  {
    key: 'very-slow',
    label: 'Very slow / stop',
    maxKmh: 5,
    colorToken: 'route-speed-very-slow',
    colorValue: '#94a3b8',
    thresholdMeaning: '≤ 5 km/h',
    shortDescription: 'Stopped, walking pace, or heavy creeping.'
  },
  {
    key: 'slow-city',
    label: 'Slow city',
    maxKmh: 30,
    colorToken: 'route-speed-slow-city',
    colorValue: '#22c55e',
    thresholdMeaning: '6–30 km/h',
    shortDescription: 'Typical dense urban movement.'
  },
  {
    key: 'moderate',
    label: 'Moderate',
    maxKmh: 70,
    colorToken: 'route-speed-moderate',
    colorValue: '#0ea5e9',
    thresholdMeaning: '31–70 km/h',
    shortDescription: 'City connectors and standard roads.'
  },
  {
    key: 'fast',
    label: 'Fast',
    maxKmh: 110,
    colorToken: 'route-speed-fast',
    colorValue: '#f59e0b',
    thresholdMeaning: '71–110 km/h',
    shortDescription: 'High-speed roads and faster stretches.'
  },
  {
    key: 'very-fast',
    label: 'Very fast',
    maxKmh: Number.POSITIVE_INFINITY,
    colorToken: 'route-speed-very-fast',
    colorValue: '#ef4444',
    thresholdMeaning: '> 110 km/h',
    shortDescription: 'Very high speed; verify data quality if unexpected.'
  }
];

export function getSpeedBandColor(token: SpeedColorToken): string {
  return SPEED_LEGEND_BANDS.find((band) => band.colorToken === token)?.colorValue ?? '#0ea5e9';
}
