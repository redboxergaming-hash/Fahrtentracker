/**
 * Demo data is opt-in and disabled by default to keep first-run state clean.
 * Enable with `VITE_ENABLE_DEMO_DATA=true` in local development.
 */
export const ENABLE_DEMO_DATA = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';
