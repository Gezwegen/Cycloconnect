import * as path from 'path';

/**
 * Standard filesystem paths, partition volume labels, and XML manifests for Mio Cyclo devices.
 */
export const MIO_DEVICE_PATHS = {
  // Volume Names
  DATA_VOLUME_NAME: 'Mio_data',
  SYSTEM_VOLUME_PREFIX: 'MIO_SYSTEM',

  // Tracks directory structure
  TRACKS_SUBDIR: path.join('Dodge', 'Tracks'),

  // Hardware manifest files
  USER_MANIFEST: 'user.xml',
  DEVICE_MANIFEST: 'device.xml',

  // Supported extensions
  EXT_FIT: '.fit',
  EXT_GPX: '.gpx',
} as const;

export const DEFAULT_DEVICE_MODELS: Record<string, { modelName: string; defaultCapacityBytes: number }> = {
  CYCLO_305: {
    modelName: 'Mio Cyclo 305',
    defaultCapacityBytes: 4 * 1000 * 1000 * 1000,
  },
  CYCLO_405: {
    modelName: 'Mio Cyclo 405',
    defaultCapacityBytes: 8 * 1000 * 1000 * 1000,
  },
  CYCLO_210: {
    modelName: 'Mio Cyclo 210',
    defaultCapacityBytes: 8 * 1000 * 1000 * 1000,
  },
};

