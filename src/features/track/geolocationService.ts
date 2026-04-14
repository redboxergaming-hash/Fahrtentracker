import type { TrackingGeolocationError, TrackingPosition } from './trackingTypes';

export type WatchPositionCallbacks = {
  onPosition: (position: TrackingPosition) => void;
  onError: (error: TrackingGeolocationError) => void;
};

/**
 * One-shot geolocation read for MVP scaffolding.
 */
export async function getCurrentBrowserPosition(options?: PositionOptions): Promise<TrackingPosition> {
  if (!isGeolocationSupported()) {
    throw createTrackingError(0, 'Geolocation is not supported in this browser.');
  }

  return await new Promise<TrackingPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(toTrackingPosition(position));
      },
      (error) => {
        reject(createTrackingError(error.code, mapGeolocationErrorMessage(error)));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
        ...options
      }
    );
  });
}

export function startBrowserPositionWatch(
  callbacks: WatchPositionCallbacks,
  options?: PositionOptions
): number {
  if (!isGeolocationSupported()) {
    callbacks.onError(createTrackingError(0, 'Geolocation is not supported in this browser.'));
    return -1;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callbacks.onPosition(toTrackingPosition(position));
    },
    (error) => {
      callbacks.onError(createTrackingError(error.code, mapGeolocationErrorMessage(error)));
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
      ...options
    }
  );
}

export function stopBrowserPositionWatch(watchId?: number): void {
  if (watchId === undefined || watchId < 0 || !isGeolocationSupported()) {
    return;
  }

  navigator.geolocation.clearWatch(watchId);
}

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export function isPermissionDeniedError(error?: TrackingGeolocationError): boolean {
  return error?.code === 1;
}

function mapGeolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === 1) {
    return 'Location permission was denied. Allow access to capture your position.';
  }

  if (error.code === 2) {
    return 'Could not determine your location. Please try again in an open area.';
  }

  if (error.code === 3) {
    return 'Location request timed out. Please try again.';
  }

  return 'Could not get current location. Please try again.';
}

function createTrackingError(code: number, message: string): TrackingGeolocationError {
  return {
    code,
    message,
    occurredAt: new Date().toISOString()
  };
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function toTrackingPosition(position: GeolocationPosition): TrackingPosition {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude ?? undefined,
    speedKmh:
      position.coords.speed !== null && position.coords.speed >= 0
        ? roundToOneDecimal(position.coords.speed * 3.6)
        : undefined,
    heading: position.coords.heading ?? undefined,
    timestamp: new Date(position.timestamp).toISOString()
  };
}
