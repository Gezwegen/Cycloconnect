/**
 * GPS Ride Track, Waypoint, and Activity Types
 */

export interface GpsPoint {
  readonly lat: number;
  readonly lng: number;
  readonly ele?: number;
  readonly time?: string;
}

export type WaypointType = 'start' | 'pass' | 'summit' | 'finish' | 'waypoint';

export interface Waypoint {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lng: number;
  readonly ele?: number;
  readonly coordFormatted?: string;
  readonly type?: WaypointType;
}

export type TrackExtension = 'fit' | 'gpx';

export type UploadStatus = 'idle' | 'uploading' | 'synced' | 'error';

export interface RideTrack {
  readonly id: string;
  readonly fileName: string;
  readonly filePath: string;
  readonly relativePath: string;
  readonly directory: string;
  readonly fileSizeBytes: number;
  readonly fileSizeFormatted: string;
  readonly extension: TrackExtension;
  readonly dateModified: string;
  readonly profile: string;
  readonly stravaUploaded?: boolean;
  readonly stravaUploadId?: string;
  readonly stravaActivityId?: string;
  readonly uploadStatus?: UploadStatus;
  readonly uploadError?: string;
  readonly points?: GpsPoint[];
  readonly waypoints?: Waypoint[];
  readonly distanceKm?: string;
  readonly elevationGainM?: number;
  readonly durationFormatted?: string;
  readonly avgSpeedKmh?: string;
  readonly rawFile?: File;
  readonly fileHandle?: FileSystemFileHandle;
}

export interface ParsedTrackData {
  readonly points: GpsPoint[];
  readonly waypoints: Waypoint[];
  readonly distanceMeters: number;
  readonly elevationGainMeters: number;
  readonly durationSeconds: number;
  readonly name?: string;
}

export type TrackFilterType = 'all' | 'fit' | 'gpx' | 'unsynced';
export type TrackSortOption = 'date-desc' | 'date-asc' | 'size-desc' | 'name-asc';

