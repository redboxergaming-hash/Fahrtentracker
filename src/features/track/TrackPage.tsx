import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  LocateFixed,
  MapPinned,
  Navigation,
  Pause,
  Play,
  ShieldAlert,
  Square,
  Timer,
  Trash2
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../db/database';
import { createTrackedTripFromSession } from '../trips/tripMutations';
import { isGeolocationSupported, isPermissionDeniedError } from './geolocationService';
import { LiveTrackingMap } from './components/LiveTrackingMap';
import type { TrackingSession } from './trackingTypes';
import { useActiveTrackingSession } from './useActiveTrackingSession';
import { shouldRenderSpeedColoredRoute, summarizeRouteSpeedDataQuality } from './routeSpeedSegmentation';
import { getSpeedColorFallbackMessage } from './speedRouteUx';

export default function TrackPage() {
  const navigate = useNavigate();
  const vehicles = useLiveQuery(() => db.vehicles.toArray(), []);
  const {
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
  } = useActiveTrackingSession();

  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);

  const selectedVehicle = useMemo(
    () => vehicles?.find((vehicle) => vehicle.id === session.selectedVehicleId),
    [vehicles, session.selectedVehicleId]
  );

  const sessionStatusLabel = getSessionStatusLabel(session, Boolean(selectedVehicle));
  const sessionStatusToneClass = getSessionStatusToneClass(session);
  const gpsStatusLabel = getGpsAvailabilityLabel(session.gpsAvailability);
  const gpsStatusMessage = getGpsStatusMessage(session);
  const currentSpeedDisplay = getCurrentSpeedDisplay(session);
  const canStart =
    Boolean(session.selectedVehicleId) &&
    session.status !== 'active' &&
    !restoredSession;

  const canStop =
    !isSavingTrip &&
    (session.status === 'active' || session.status === 'paused');

  const liveSpeedDataQuality = useMemo(() => summarizeRouteSpeedDataQuality(session.routePoints), [session.routePoints]);
  const canPreviewSpeedColors = shouldRenderSpeedColoredRoute(liveSpeedDataQuality);

  const stopAndSaveTrip = async () => {
    setSaveFeedback(null);

    try {
      setIsSavingTrip(true);
      const trip = await createTrackedTripFromSession(session);
      clearCurrentSession();
      navigate(`/trips/${trip.id}`, { replace: true });
    } catch (error) {
      setSaveFeedback(error instanceof Error ? error.message : 'Could not save tracked trip. Please try again.');
    } finally {
      setIsSavingTrip(false);
      setIsStopConfirmOpen(false);
    }
  };

  return (
    <section className="space-y-4">
      <header className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-sky-700">
          <LocateFixed size={18} />
          <p className="text-xs font-semibold uppercase tracking-wide">Live tracking</p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Track Drive</h2>
          <p className="mt-1 text-sm text-slate-600">Tracking runs only while this app is open and active.</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-start gap-2 font-medium">
            <ShieldAlert size={16} className="mt-0.5" />
            Safety first: keep interactions simple and do not use this screen while actively driving.
          </p>
        </div>
      </header>

      {restoredSession ? (
        <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm sm:p-5">
          <p className="flex items-start gap-2 text-sm font-medium">
            <AlertTriangle size={16} className="mt-0.5" />
            Unfinished tracking session found from{' '}
            {restoredSavedAt ? new Date(restoredSavedAt).toLocaleString() : 'a previous run'}.
          </p>
          <p className="text-xs text-amber-800">
            Tracking did not continue in the background while the app was closed. Continue to resume from the saved
            route or discard it.
          </p>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-amber-200 bg-white/60 p-2 text-xs text-amber-900 sm:grid-cols-5">
            <InfoRow label="Route points" value={`${restoredSession.routePoints.length}`} />
            <InfoRow label="Distance" value={`${restoredSession.totalDistanceKm.toFixed(1)} km`} />
            <InfoRow label="Elapsed" value={formatElapsed(restoredSession.elapsedSeconds)} />
            <InfoRow label="Session" value={restoredSession.status === 'paused' ? 'Paused' : 'Active'} />
            <InfoRow label="GPS" value={getGpsAvailabilityLabel(restoredSession.gpsAvailability)} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={continueRestoredSession}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              <Play size={16} />
              Continue restored session
            </button>
            <button
              type="button"
              onClick={discardRestoredSession}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              <Trash2 size={16} />
              Discard restored session
            </button>
          </div>
        </section>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <label className="block text-sm font-medium text-slate-700">
          Vehicle
          <select
            value={session.selectedVehicleId ?? ''}
            onChange={(event) => setSelectedVehicleId(event.target.value || undefined)}
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">Select vehicle</option>
            {vehicles?.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} · {vehicle.brand} {vehicle.model}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className={`rounded-xl border p-3 ${sessionStatusToneClass}`}>
            <p className="text-xs uppercase tracking-wide">Tracking session</p>
            <p className="mt-1 text-sm font-medium">{sessionStatusLabel}</p>
          </div>

          {session.status !== 'idle' ? (
            <div className={`rounded-xl border p-3 ${getGpsToneClass(session.gpsAvailability)}`}>
              <p className="text-xs uppercase tracking-wide">GPS signal</p>
              <p className="mt-1 text-sm font-medium">{gpsStatusLabel}</p>
              <p className="mt-1 text-xs">{gpsStatusMessage}</p>
              {session.lastSuccessfulGpsAt ? (
                <p className="mt-1 text-xs text-slate-600">
                  Last GPS fix: {new Date(session.lastSuccessfulGpsAt).toLocaleTimeString()}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {session.geolocationError && (session.gpsAvailability === 'denied' || session.gpsAvailability === 'error') ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <p className="font-medium">
              {isPermissionDeniedError(session.geolocationError) ? 'Permission denied' : 'Location error'}
            </p>
            <p className="mt-1">{session.geolocationError.message}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {session.status === 'active' ? (
            <button
              type="button"
              onClick={pauseTracking}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              <Pause size={16} />
              Pause
            </button>
          ) : session.status === 'paused' ? (
            <button
              type="button"
              onClick={resumeTracking}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Play size={16} />
              Resume
            </button>
          ) : (
            <button
              type="button"
              onClick={startTracking}
              disabled={!canStart}
              className="sm:col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Navigation size={16} />
              Start live tracking
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsStopConfirmOpen(true)}
            disabled={!canStop}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Square size={16} />
            {isSavingTrip ? 'Saving trip…' : 'Stop & save'}
          </button>
        </div>

        {saveFeedback ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{saveFeedback}</div>
        ) : null}

        {!isGeolocationSupported() ? (
          <p className="text-xs text-rose-700">This browser does not support geolocation APIs.</p>
        ) : null}
      </section>

      {isStopConfirmOpen ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Stop tracking and save this trip?</p>
          <p className="mt-1 text-xs text-slate-600">
            This session will be saved with {session.routePoints.length} recorded route point{session.routePoints.length === 1 ? '' : 's'}.
            {session.routePoints.length === 0
              ? ' No GPS points were captured yet, so it will be saved as a tracked draft to avoid data loss.'
              : ''}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={stopAndSaveTrip}
              disabled={isSavingTrip}
              className="inline-flex min-h-11 items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isSavingTrip ? 'Saving…' : 'Yes, stop & save'}
            </button>
            <button
              type="button"
              onClick={() => setIsStopConfirmOpen(false)}
              disabled={isSavingTrip}
              className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Elapsed time" value={formatElapsed(session.elapsedSeconds)} icon={<Timer size={14} />} />
        <MetricCard label="Distance" value={`${session.totalDistanceKm.toFixed(1)} km`} />
        <MetricCard label="Current speed" value={currentSpeedDisplay} />
        <MetricCard label="Average speed" value={`${session.averageSpeedKmh.toFixed(1)} km/h`} />
        <MetricCard
          label="Max speed"
          value={`${session.maxSpeedKmh.toFixed(1)} km/h`}
          className="col-span-2 sm:col-span-1"
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-slate-700">
          <MapPinned size={16} />
          <div>
            <h3 className="text-base font-semibold">Live map</h3>
            <p className="text-xs text-slate-500">Route color updates reflect speed quality in real time.</p>
          </div>
        </div>

        <LiveTrackingMap routePoints={session.routePoints} currentPosition={session.currentPosition} />

        {session.routePoints.length >= 2 && !canPreviewSpeedColors ? (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {getSpeedColorFallbackMessage('live')}
          </p>
        ) : null}

        {session.currentPosition ? (
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-5">
            <InfoRow label="Latitude" value={session.currentPosition.lat.toFixed(6)} />
            <InfoRow label="Longitude" value={session.currentPosition.lng.toFixed(6)} />
            <InfoRow
              label="Accuracy"
              value={session.currentPosition.accuracy ? `${Math.round(session.currentPosition.accuracy)} m` : '—'}
            />
            <InfoRow label="Route points" value={`${session.routePoints.length}`} />
            <InfoRow label="Updated" value={new Date(session.currentPosition.timestamp).toLocaleTimeString()} />
          </div>
        ) : null}
      </section>
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon,
  className
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <article className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${className ?? ''}`.trim()}>
      <p className="flex items-center gap-1 text-xs text-slate-500">
        {icon}
        <span>{label}</span>
      </p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value}</p>
    </div>
  );
}

function getSessionStatusLabel(session: TrackingSession, hasVehicle: boolean): string {
  if (session.status === 'active') {
    return 'Tracking active';
  }

  if (session.status === 'paused') {
    return 'Tracking paused';
  }

  if (session.status === 'stopped') {
    return 'Tracking stopped';
  }

  if (!hasVehicle) {
    return 'Idle — select a vehicle to start tracking.';
  }

  return 'Idle — ready to start live tracking.';
}

function getSessionStatusToneClass(session: TrackingSession): string {
  if (session.status === 'active') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (session.status === 'paused') {
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }

  if (session.status === 'stopped') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function getGpsToneClass(gpsAvailability: TrackingSession['gpsAvailability']): string {
  if (gpsAvailability === 'available') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (gpsAvailability === 'acquiring' || gpsAvailability === 'temporarily-unavailable') {
    return 'border-sky-200 bg-sky-50 text-sky-800';
  }

  if (gpsAvailability === 'denied' || gpsAvailability === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-800';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function getGpsAvailabilityLabel(gpsAvailability: TrackingSession['gpsAvailability']): string {
  switch (gpsAvailability) {
    case 'available':
      return 'Available';
    case 'acquiring':
      return 'Acquiring signal';
    case 'temporarily-unavailable':
      return 'Temporarily unavailable';
    case 'denied':
      return 'Permission denied';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
}

function getGpsStatusMessage(session: TrackingSession): string {
  if (session.gpsAvailability === 'available') {
    return 'Location updates are being recorded.';
  }

  if (session.gpsAvailability === 'acquiring') {
    return 'Waiting for GPS signal. Tracking continues and points will appear once available.';
  }

  if (session.gpsAvailability === 'temporarily-unavailable') {
    return 'GPS signal unavailable — route points will resume when signal returns.';
  }

  if (session.gpsAvailability === 'denied') {
    return 'Location permission is denied. Tracking session is still active.';
  }

  if (session.gpsAvailability === 'error') {
    return 'Location updates paused due to a temporary error. Tracking session is still active.';
  }

  return 'GPS status will appear once tracking starts.';
}

function getCurrentSpeedDisplay(session: TrackingSession): string {
  if (session.status !== 'active') {
    return '—';
  }

  if (session.gpsAvailability !== 'available') {
    return '—';
  }

  return `${session.currentSpeedKmh.toFixed(1)} km/h`;
}

function formatElapsed(elapsedSeconds: number): string {
  const hours = Math.floor(elapsedSeconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((elapsedSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(elapsedSeconds % 60)
    .toString()
    .padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}
