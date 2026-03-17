import { useCallback, useEffect, useRef, useState } from 'react';
import {
  calculateCumulativeDistanceKm,
  deriveAverageSpeedKmh,
  deriveCurrentSpeedKmh,
  deriveMaxSpeedKmh,
  sanitizeRoutePoints
} from './trackingCalculations';
import {
  isPermissionDeniedError,
  startBrowserPositionWatch,
  stopBrowserPositionWatch
} from './geolocationService';
import {
  clearPersistedTrackingSession,
  persistTrackingSession,
  readPersistedTrackingSession
} from './trackingSessionPersistence';
import { initialTrackingSession } from './trackingTypes';
import type { GpsAvailabilityStatus, TrackingSession } from './trackingTypes';

export function useActiveTrackingSession() {
  const [session, setSession] = useState<TrackingSession>(initialTrackingSession);
  const [restoredSession, setRestoredSession] = useState<TrackingSession>();
  const [restoredSavedAt, setRestoredSavedAt] = useState<string>();
  const [hasCheckedRestore, setHasCheckedRestore] = useState(false);

  const watchIdRef = useRef<number | undefined>(undefined);
  const elapsedIntervalRef = useRef<number | undefined>(undefined);

  const stopTrackingResources = useCallback(() => {
    stopBrowserPositionWatch(watchIdRef.current);
    watchIdRef.current = undefined;

    if (elapsedIntervalRef.current !== undefined) {
      window.clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = undefined;
    }
  }, []);

  const beginWatchLoop = useCallback(
    (setAcquiringStatus = false) => {
      stopTrackingResources();

      if (setAcquiringStatus) {
        setSession((previous) => ({
          ...previous,
          gpsAvailability: 'acquiring',
          geolocationError: undefined
        }));
      }

      watchIdRef.current = startBrowserPositionWatch({
        onPosition: (position) => {
          setSession((previous) => {
            if (!previous.startedAt || previous.status !== 'active') {
              return previous;
            }

            const point = {
              lat: position.lat,
              lng: position.lng,
              timestamp: position.timestamp,
              speedKmh: position.speedKmh,
              accuracy: position.accuracy,
              altitude: position.altitude
            };

            const routePoints = sanitizeRoutePoints([...previous.routePoints, point]);
            const totalDistanceKm = calculateCumulativeDistanceKm(routePoints);
            const currentSpeedKmh = deriveCurrentSpeedKmh(routePoints);
            const maxSpeedKmh = deriveMaxSpeedKmh(routePoints);
            const elapsedSeconds = calculateActiveElapsedSeconds(
              previous.startedAt,
              previous.accumulatedPausedSeconds
            );

            return {
              ...previous,
              currentPosition: position,
              lastSuccessfulGpsAt: position.timestamp,
              routePoints,
              totalDistanceKm,
              currentSpeedKmh,
              maxSpeedKmh,
              elapsedSeconds,
              averageSpeedKmh: deriveAverageSpeedKmh(totalDistanceKm, elapsedSeconds),
              gpsAvailability: 'available',
              geolocationError: undefined,
              pausedAt: undefined
            };
          });
        },
        onError: (geolocationError) => {
          setSession((previous) => {
            if (previous.status !== 'active') {
              return previous;
            }

            const gpsAvailability = isPermissionDeniedError(geolocationError)
              ? 'denied'
              : geolocationError.code === 2 || geolocationError.code === 3
                ? 'temporarily-unavailable'
                : 'error';

            return {
              ...previous,
              gpsAvailability,
              geolocationError,
              currentSpeedKmh: 0
            };
          });

          if (isPermissionDeniedError(geolocationError)) {
            stopBrowserPositionWatch(watchIdRef.current);
            watchIdRef.current = undefined;
          }
        }
      });

      elapsedIntervalRef.current = window.setInterval(() => {
        setSession((previous) => {
          if (previous.status !== 'active' || !previous.startedAt) {
            return previous;
          }

          const elapsedSeconds = calculateActiveElapsedSeconds(
            previous.startedAt,
            previous.accumulatedPausedSeconds
          );

          const gpsAvailability = resolveStaleGpsAvailability(previous);

          return {
            ...previous,
            elapsedSeconds,
            averageSpeedKmh: deriveAverageSpeedKmh(previous.totalDistanceKm, elapsedSeconds),
            gpsAvailability
          };
        });
      }, 1000);
    },
    [stopTrackingResources]
  );

  const startTracking = useCallback(() => {
    const startedAt = new Date().toISOString();

    setSession((previous) => ({
      ...previous,
      status: 'active',
      gpsAvailability: 'acquiring',
      geolocationError: undefined,
      startedAt,
      pausedAt: undefined,
      accumulatedPausedSeconds: 0,
      elapsedSeconds: 0,
      totalDistanceKm: 0,
      currentSpeedKmh: 0,
      averageSpeedKmh: 0,
      maxSpeedKmh: 0,
      routePoints: [],
      lastSuccessfulGpsAt: undefined
    }));

    beginWatchLoop();
  }, [beginWatchLoop]);

  const pauseTracking = useCallback(() => {
    stopTrackingResources();

    setSession((previous) => {
      if (previous.status !== 'active') {
        return previous;
      }

      return {
        ...previous,
        status: 'paused',
        pausedAt: new Date().toISOString(),
        currentSpeedKmh: 0
      };
    });
  }, [stopTrackingResources]);

  const resumeTracking = useCallback(() => {
    setSession((previous) => {
      if (previous.status !== 'paused') {
        return previous;
      }

      const resumedAtMs = Date.now();
      const pausedAtMs = previous.pausedAt ? new Date(previous.pausedAt).getTime() : resumedAtMs;
      const pausedSeconds = Math.max(0, Math.floor((resumedAtMs - pausedAtMs) / 1000));

      return {
        ...previous,
        status: 'active',
        gpsAvailability: 'acquiring',
        pausedAt: undefined,
        accumulatedPausedSeconds: previous.accumulatedPausedSeconds + pausedSeconds,
        elapsedSeconds: previous.startedAt
          ? calculateActiveElapsedSeconds(previous.startedAt, previous.accumulatedPausedSeconds + pausedSeconds)
          : previous.elapsedSeconds,
        geolocationError: undefined
      };
    });

    beginWatchLoop();
  }, [beginWatchLoop]);

  const discardRestoredSession = useCallback(() => {
    setRestoredSession(undefined);
    setRestoredSavedAt(undefined);
    clearPersistedTrackingSession();
  }, []);

  const continueRestoredSession = useCallback(() => {
    if (!restoredSession) {
      return;
    }

    const now = Date.now();
    const savedAtMs = restoredSavedAt ? new Date(restoredSavedAt).getTime() : now;
    const interruptionSeconds = Number.isNaN(savedAtMs)
      ? 0
      : Math.max(0, Math.floor((now - savedAtMs) / 1000));

    const resumedIsPaused = restoredSession.status === 'paused';
    const restoredGpsAvailability = getRestoredGpsAvailability(restoredSession, resumedIsPaused);
    const hydratedSession: TrackingSession = {
      ...restoredSession,
      status: resumedIsPaused ? 'paused' : 'active',
      gpsAvailability: restoredGpsAvailability,
      pausedAt: resumedIsPaused ? restoredSession.pausedAt : undefined,
      accumulatedPausedSeconds: resumedIsPaused
        ? restoredSession.accumulatedPausedSeconds
        : restoredSession.accumulatedPausedSeconds + interruptionSeconds,
      elapsedSeconds: restoredSession.startedAt
        ? calculateActiveElapsedSeconds(
            restoredSession.startedAt,
            resumedIsPaused
              ? restoredSession.accumulatedPausedSeconds
              : restoredSession.accumulatedPausedSeconds + interruptionSeconds
          )
        : restoredSession.elapsedSeconds,
      currentSpeedKmh: resumedIsPaused ? 0 : restoredSession.currentSpeedKmh,
      geolocationError: shouldPreserveGpsError(restoredSession.gpsAvailability)
        ? restoredSession.geolocationError
        : undefined
    };

    setSession(hydratedSession);
    setRestoredSession(undefined);
    setRestoredSavedAt(undefined);

    if (!resumedIsPaused) {
      beginWatchLoop(true);
    }
  }, [beginWatchLoop, restoredSavedAt, restoredSession]);

  useEffect(() => {
    const persisted = readPersistedTrackingSession();

    if (persisted) {
      setRestoredSession(persisted.session);
      setRestoredSavedAt(persisted.savedAt);
    }

    setHasCheckedRestore(true);
  }, []);

  useEffect(() => {
    if (!hasCheckedRestore) return;
    if (restoredSession) return;

    if (session.status === 'active' || session.status === 'paused') {
      persistTrackingSession(session);
      return;
    }

    clearPersistedTrackingSession();
  }, [hasCheckedRestore, restoredSession, session]);

  useEffect(() => {
    return () => {
      stopTrackingResources();
    };
  }, [stopTrackingResources]);

  const clearCurrentSession = useCallback(() => {
    stopTrackingResources();
    setSession(initialTrackingSession);
    clearPersistedTrackingSession();
    setRestoredSession(undefined);
    setRestoredSavedAt(undefined);
  }, [stopTrackingResources]);

  const setSelectedVehicleId = useCallback((vehicleId?: string) => {
    setSession((previous) => ({
      ...previous,
      selectedVehicleId: vehicleId
    }));
  }, []);

  return {
    session,
    setSelectedVehicleId,
    startTracking,
    pauseTracking,
    resumeTracking,
    restoredSession,
    restoredSavedAt,
    continueRestoredSession,
    discardRestoredSession,
    clearCurrentSession
  };
}

function calculateActiveElapsedSeconds(startedAt: string, accumulatedPausedSeconds: number): number {
  const startedMs = new Date(startedAt).getTime();
  if (Number.isNaN(startedMs)) return 0;

  const activeSeconds = Math.floor((Date.now() - startedMs) / 1000) - accumulatedPausedSeconds;
  return Math.max(0, activeSeconds);
}


function getRestoredGpsAvailability(session: TrackingSession, isPaused: boolean): GpsAvailabilityStatus {
  if (isPaused) {
    return 'unknown';
  }

  if (session.gpsAvailability === 'temporarily-unavailable' || session.gpsAvailability === 'denied' || session.gpsAvailability === 'error') {
    return session.gpsAvailability;
  }

  return 'acquiring';
}

function shouldPreserveGpsError(gpsAvailability: GpsAvailabilityStatus): boolean {
  return gpsAvailability === 'temporarily-unavailable' || gpsAvailability === 'denied' || gpsAvailability === 'error';
}

const GPS_STALE_AFTER_SECONDS = 15;

function resolveStaleGpsAvailability(session: TrackingSession): GpsAvailabilityStatus {
  if (session.gpsAvailability === 'denied' || session.gpsAvailability === 'error') {
    return session.gpsAvailability;
  }

  if (!session.lastSuccessfulGpsAt) {
    return session.gpsAvailability;
  }

  const lastSuccessMs = new Date(session.lastSuccessfulGpsAt).getTime();
  if (Number.isNaN(lastSuccessMs)) {
    return session.gpsAvailability;
  }

  const staleSeconds = Math.floor((Date.now() - lastSuccessMs) / 1000);
  if (staleSeconds >= GPS_STALE_AFTER_SECONDS) {
    return 'temporarily-unavailable';
  }

  if (session.gpsAvailability === 'temporarily-unavailable' || session.gpsAvailability === 'acquiring') {
    return 'available';
  }

  return session.gpsAvailability;
}
