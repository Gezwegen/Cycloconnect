import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { MioDevice, RideTrack, KomootTour, StravaAuthStatus, KomootAuthStatus, SyncProgress, UploadResult, ElectronAPI } from '../types';
import { IPC_CHANNELS } from '../constants/ipc';

/**
 * Preload Script for CycloConnect Desktop
 * Exposes a strictly typed, hardened bridge over Electron IPC.
 * contextIsolation enabled, nodeIntegration disabled, sandbox enabled.
 */
const api: ElectronAPI = {
  // Device & USB
  getDeviceStatus: (): Promise<MioDevice | null> => ipcRenderer.invoke(IPC_CHANNELS.DEVICE_GET_STATUS),
  rescanDevice: (): Promise<MioDevice | null> => ipcRenderer.invoke(IPC_CHANNELS.DEVICE_RESCAN),
  getRideHistory: (customTracksPath?: string): Promise<RideTrack[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.DEVICE_GET_TRACKS, customTracksPath),
  getTrackGpx: (filePath: string): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.DEVICE_GET_TRACK_GPX, filePath),
  openFolder: (folderPath: string): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_FOLDER, folderPath),

  // Strava Integration
  stravaLogin: (): Promise<StravaAuthStatus> => ipcRenderer.invoke(IPC_CHANNELS.STRAVA_LOGIN),
  stravaDisconnect: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.STRAVA_DISCONNECT),
  getStravaStatus: (): Promise<StravaAuthStatus> => ipcRenderer.invoke(IPC_CHANNELS.STRAVA_GET_STATUS),
  uploadRideToStrava: (filePath: string, customName?: string): Promise<UploadResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.STRAVA_UPLOAD_RIDE, filePath, customName),
  pollStravaUploadStatus: (uploadId: string): Promise<{ status: string; activityId?: string; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.STRAVA_POLL_UPLOAD, uploadId),
  syncAllNewRidesToStrava: (): Promise<{ total: number; successful: number; failed: number }> =>
    ipcRenderer.invoke(IPC_CHANNELS.STRAVA_SYNC_ALL),

  // Komoot Integration
  komootLogin: (email: string, password: string): Promise<KomootAuthStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.KOMOOT_LOGIN, email, password),
  komootLogout: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.KOMOOT_LOGOUT),
  getKomootStatus: (): Promise<KomootAuthStatus> => ipcRenderer.invoke(IPC_CHANNELS.KOMOOT_GET_STATUS),
  getKomootTours: (): Promise<KomootTour[]> => ipcRenderer.invoke(IPC_CHANNELS.KOMOOT_GET_TOURS),
  downloadKomootTourToDevice: (
    tourId: string | number,
    tourName: string
  ): Promise<{ success: boolean; targetPath: string; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.KOMOOT_DOWNLOAD_TOUR, tourId, tourName),
  getKomootTourGpx: (tourId: string | number): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.KOMOOT_GET_TOUR_GPX, tourId),

  // Event Subscriptions
  onDeviceEvent: (callback: (device: MioDevice | null) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, device: MioDevice | null) => callback(device);
    ipcRenderer.on(IPC_CHANNELS.DEVICE_CHANGED_EVENT, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.DEVICE_CHANGED_EVENT, handler);
    };
  },

  onSyncProgress: (callback: (progress: SyncProgress) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, progress: SyncProgress) => callback(progress);
    ipcRenderer.on(IPC_CHANNELS.STRAVA_SYNC_PROGRESS_EVENT, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.STRAVA_SYNC_PROGRESS_EVENT, handler);
    };
  },

  // System & App
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_VERSION),
};

contextBridge.exposeInMainWorld('electronAPI', api);
