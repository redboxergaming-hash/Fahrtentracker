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
import type { TrackingGeolocationError, TrackingSession } from './trackingTypes';

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
    (setRequestingStatus = false) => {
      stopTrackingResources();

      if (setRequestingStatus) {
        setSession((previous) => ({
          ...previous,
          status: 'requesting-permission',
          geolocationError: undefined
        }));
      }

      watchIdRef.current = startBrowserPositionWatch({
        onPosition: (position) => {
          setSession((previous) => {
            if (!previous.startedAt || previous.status === 'paused') {
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
              status: 'active',
              currentPosition: position,
              routePoints,
              totalDistanceKm,
              currentSpeedKmh,
              maxSpeedKmh,
              elapsedSeconds,
              averageSpeedKmh: deriveAverageSpeedKmh(totalDistanceKm, elapsedSeconds),
              geolocationError: undefined,
              pausedAt: undefined
            };
          });
        },
        onError: (geolocationError) => {
          stopTrackingResources();
          setSession((previous) => ({
            ...previous,
            status: isPermissionDeniedError(geolocationError) ? 'permission-denied' : 'error',
            geolocationError,
            pausedAt: undefined,
            currentSpeedKmh: 0
          }));
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

          return {
            ...previous,
            elapsedSeconds,
            averageSpeedKmh: deriveAverageSpeedKmh(previous.totalDistanceKm, elapsedSeconds)
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
      status: 'requesting-permission',
      geolocationError: undefined,
      startedAt,
      pausedAt: undefined,
      accumulatedPausedSeconds: 0,
      elapsedSeconds: 0,
      totalDistanceKm: 0,
      currentSpeedKmh: 0,
      averageSpeedKmh: 0,
      maxSpeedKmh: 0,
      routePoints: []
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
        status: 'requesting-permission',
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

    const hydratedSession: TrackingSession = {
      ...restoredSession,
      status: restoredSession.status === 'paused' ? 'paused' : 'requesting-permission',
      pausedAt: restoredSession.status === 'paused' ? restoredSession.pausedAt : undefined,
      accumulatedPausedSeconds:
        restoredSession.status === 'paused'
          ? restoredSession.accumulatedPausedSeconds
          : restoredSession.accumulatedPausedSeconds + interruptionSeconds,
      elapsedSeconds: restoredSession.startedAt
        ? calculateActiveElapsedSeconds(
            restoredSession.startedAt,
            restoredSession.status === 'paused'
              ? restoredSession.accumulatedPausedSeconds
              : restoredSession.accumulatedPausedSeconds + interruptionSeconds
          )
        : restoredSession.elapsedSeconds,
      currentSpeedKmh: restoredSession.status === 'paused' ? 0 : restoredSession.currentSpeedKmh,
      geolocationError: undefined
    };

    setSession(hydratedSession);
    setRestoredSession(undefined);
    setRestoredSavedAt(undefined);

    if (hydratedSession.status !== 'paused') {
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

    if (session.status === 'active' || session.status === 'paused' || session.status === 'requesting-permission') {
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
