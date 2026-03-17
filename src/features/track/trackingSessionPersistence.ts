import type { TrackingSession, TrackingStatus } from './trackingTypes';

type PersistedTrackingSession = {
  version: 1;
  savedAt: string;
  session: TrackingSession;
};

const STORAGE_KEY = 'fahrtentracker:active-tracking-session';

const RESTORABLE_STATUSES: TrackingStatus[] = ['requesting-permission', 'active', 'paused'];

export function persistTrackingSession(session: TrackingSession): void {
  if (typeof window === 'undefined') return;

  const payload: PersistedTrackingSession = {
    version: 1,
    savedAt: new Date().toISOString(),
    session
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearPersistedTrackingSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function readPersistedTrackingSession(): PersistedTrackingSession | undefined {
  if (typeof window === 'undefined') return undefined;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as PersistedTrackingSession;

    if (parsed.version !== 1 || !parsed.session) {
      return undefined;
    }

    if (!isRestorableStatus(parsed.session.status) || !parsed.session.startedAt) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
}

function isRestorableStatus(status: TrackingStatus): boolean {
  return RESTORABLE_STATUSES.includes(status);
}
