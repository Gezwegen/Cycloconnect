/**
 * API configuration endpoints, scopes, and timeouts for Strava and Komoot
 */
export const STRAVA_CONFIG = {
  BASE_URL: 'https://www.strava.com',
  API_URL: 'https://www.strava.com/api/v3',
  AUTH_URL: 'https://www.strava.com/oauth/authorize',
  TOKEN_URL: 'https://www.strava.com/oauth/token',
  UPLOADS_URL: 'https://www.strava.com/api/v3/uploads',
  ATHLETE_URL: 'https://www.strava.com/api/v3/athlete',
  ACTIVITIES_URL: 'https://www.strava.com/api/v3/athlete/activities',
  REDIRECT_URI: 'http://localhost/cycloconnect/oauth/callback',
  SCOPE: 'read,activity:read_all,activity:write',
  TOKEN_REFRESH_WINDOW_SECONDS: 300,
  POLL_INTERVAL_MS: 2000,
  MAX_POLL_RETRIES: 15,
} as const;

export const KOMOOT_CONFIG = {
  BASE_URL: 'https://api.komoot.de',
  LOGIN_URL: (email: string) => `https://api.komoot.de/v006/account/email/${encodeURIComponent(email)}/`,
  PLANNED_TOURS_URL: (userId: string) => `https://api.komoot.de/v007/users/${encodeURIComponent(userId)}/tours/?type=tour_planned`,
  TOUR_GPX_URL: (tourId: string | number) => `https://api.komoot.de/v007/tours/${tourId}.gpx`,
  USER_AGENT: 'CycloConnect/1.0 (Windows NT 10.0; Win64; x64)',
} as const;

