import { MioDevice } from './device';
import { RideTrack } from './track';
import { StravaAuthStatus, UploadResult, SyncProgress } from './strava';
import { KomootAuthStatus, KomootTour } from './komoot';

/**
 * Strictly typed Electron IPC Bridge Contract
 * Exposes specific, non-generic functions through contextBridge.
 */
export interface ElectronAPI {
  // Device & USB
  getDeviceStatus: () => Promise<MioDevice | null>;
  rescanDevice: () => Promise<MioDevice | null>;
  getRideHistory: (customTracksPath?: string) => Promise<RideTrack[]>;
  getTrackGpx: (filePath: string) => Promise<string>;
  openFolder: (folderPath: string) => Promise<boolean>;

  // Strava
  stravaLogin: () => Promise<StravaAuthStatus>;
  stravaDisconnect: () => Promise<boolean>;
  getStravaStatus: () => Promise<StravaAuthStatus>;
  uploadRideToStrava: (filePath: string, customName?: string) => Promise<UploadResult>;
  pollStravaUploadStatus: (uploadId: string) => Promise<{ status: string; activityId?: string; error?: string }>;
  syncAllNewRidesToStrava: () => Promise<{ total: number; successful: number; failed: number }>;

  // Komoot
  komootLogin: (email: string, password: string) => Promise<KomootAuthStatus>;
  komootLogout: () => Promise<boolean>;
  getKomootStatus: () => Promise<KomootAuthStatus>;
  getKomootTours: () => Promise<KomootTour[]>;
  downloadKomootTourToDevice: (
    tourId: string | number,
    tourName: string
  ) => Promise<{ success: boolean; targetPath: string; error?: string }>;
  getKomootTourGpx: (tourId: string | number) => Promise<string>;

  // Event Subscriptions
  onDeviceEvent: (callback: (device: MioDevice | null) => void) => () => void;
  onSyncProgress: (callback: (progress: SyncProgress) => void) => () => void;

  // System
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

