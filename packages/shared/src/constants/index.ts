/**
 * Singr Platform — Shared constants
 */

/** Default port for the API server */
export const API_PORT = 3001

/** Default ports for all services (local development) */
export const SERVICE_PORTS = {
  API: 3001,
  MARKETING: 3010,
  HOST_PORTAL: 3011,
  SINGER_APP: 3012,
  ADMIN_PORTAL: 3013,
  POSTGRES: 5433,
  REDIS: 6380,
} as const

/** Legacy OpenKJ adapter path — must match exactly for C++ compatibility */
export const LEGACY_OKJ_PATH = '/api/v1/legacy/okj/api.php'

/** BullMQ queue names */
export const QUEUE_NAMES = {
  SONG_SYNC: 'song-sync',
} as const

/** Song sync debounce delay in milliseconds */
export const SONG_SYNC_DEBOUNCE_MS = 5000

/** Maximum songs per addSongs chunk (legacy API constraint) */
export const MAX_SONGS_PER_CHUNK = 1000

/** Venue sync rate limit: max 1 Google Places sync per 24 hours */
export const VENUE_SYNC_RATE_LIMIT_MS = 24 * 60 * 60 * 1000
