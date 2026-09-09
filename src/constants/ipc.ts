/**
 * Centralized IPC channel definitions for CycloConnect
 * Eliminates magic strings across main, preload, and renderer processes.
 */
export const IPC_CHANNELS = {
  // Device & USB
  DEVICE_GET_STATUS: 'device:getStatus',
  DEVICE_RESCAN: 'device:rescan',
  DEVICE_GET_TRACKS: 'device:getTracks',
  DEVICE_GET_TRACK_GPX: 'device:getTrackGpx',
  DEVICE_CHANGED_EVENT: 'device:changed',

  // Strava Integration
  STRAVA_LOGIN: 'strava:login',
  STRAVA_DISCONNECT: 'strava:disconnect',
  STRAVA_GET_STATUS: 'strava:getStatus',
  STRAVA_UPLOAD_RIDE: 'strava:uploadRide',
  STRAVA_POLL_UPLOAD: 'strava:pollUpload',
  STRAVA_SYNC_ALL: 'strava:syncAll',
  STRAVA_SYNC_PROGRESS_EVENT: 'sync:progress',

  // Komoot Integration
  KOMOOT_LOGIN: 'komoot:login',
  KOMOOT_LOGOUT: 'komoot:logout',
  KOMOOT_GET_STATUS: 'komoot:getStatus',
  KOMOOT_GET_TOURS: 'komoot:getTours',
  KOMOOT_DOWNLOAD_TOUR: 'komoot:downloadTour',
  KOMOOT_GET_TOUR_GPX: 'komoot:getTourGpx',

  // System
  SYSTEM_OPEN_FOLDER: 'system:openFolder',
  SYSTEM_GET_VERSION: 'system:getVersion',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

