import type { PathOptions } from 'leaflet';

export const SPEED_ROUTE_PATH_OPTIONS: PathOptions = {
  weight: 5,
  opacity: 0.95,
  lineCap: 'round',
  lineJoin: 'round'
};

export const NEUTRAL_ROUTE_PATH_OPTIONS: PathOptions = {
  color: '#0ea5e9',
  weight: 4,
  opacity: 0.9,
  lineCap: 'round',
  lineJoin: 'round'
};

export function getSpeedColorFallbackMessage(context: 'trip' | 'live'): string {
  if (context === 'trip') {
    return 'Speed coloring is limited for this route, so a neutral route line is shown for accuracy.';
  }

  return 'Speed color preview is limited right now, so the map uses a neutral route line until more reliable points are available.';
}
