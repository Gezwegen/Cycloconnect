import 'dotenv/config';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { UsbManager } from './usbManager';
import { AuthManager } from './authManager';
import { StravaService } from './stravaService';
import { KomootService } from './komootService';
import { MioDevice, RideTrack } from '../types';
import { IPC_CHANNELS } from '../constants/ipc';
import { PathSecurity } from './pathSecurity';
import { logger } from './logger';

const TAG = 'MainProcess';

class CycloConnectApp {
  private mainWindow: BrowserWindow | null = null;
  private usbManager: UsbManager;
  private authManager: AuthManager;
  private stravaService: StravaService;
  private komootService: KomootService;
  private usbPollTimer: NodeJS.Timeout | null = null;
  private lastConnectedState = false;

  constructor() {
    this.usbManager = new UsbManager();
    this.authManager = new AuthManager();
    this.stravaService = new StravaService(this.authManager, this.usbManager);
    this.komootService = new KomootService(this.authManager, this.usbManager);
  }

  public init(): void {
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
      app.quit();
      return;
    }

    app.on('second-instance', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) this.mainWindow.restore();
        this.mainWindow.focus();
      }
    });

    app.whenReady().then(async () => {
      await this.createMainWindow();
      this.registerIpcHandlers();
      this.startUsbPolling();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      this.stopUsbPolling();
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  private async createMainWindow(): Promise<void> {
    const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

    this.mainWindow = new BrowserWindow({
      width: 1240,
      height: 840,
      minWidth: 1000,
      minHeight: 680,
      backgroundColor: '#0a0d12',
      title: 'CycloConnect - Mio Cyclo Companion',
      autoHideMenuBar: true,
      webPreferences: {
        preload: fs.existsSync(path.join(__dirname, 'preload.cjs'))
          ? path.join(__dirname, 'preload.cjs')
          : path.join(app.getAppPath(), 'dist-electron', 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    // Enforce external link containment: open web links in user's default OS browser
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    // Prevent arbitrary navigation within the Electron window
    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      try {
        const parsed = new URL(navigationUrl);
        if (isDev && parsed.origin === 'http://localhost:3000') {
          return;
        }
        if (navigationUrl.startsWith('file://')) {
          return;
        }
      } catch {
        // ignore parse error
      }
      event.preventDefault();
      shell.openExternal(navigationUrl);
    });

    const localDist = path.join(__dirname, '../dist/index.html');
    const packagedDist = path.join(app.getAppPath(), 'dist/index.html');
    const distIndexPath = fs.existsSync(localDist) ? localDist : packagedDist;
    const startUrl = process.env.ELECTRON_START_URL;

    if (startUrl) {
      this.mainWindow.loadURL(startUrl).catch((err) => {
        logger.warn(TAG, 'Failed to load ELECTRON_START_URL, falling back to local build:', err?.message);
        if (fs.existsSync(distIndexPath)) {
          this.mainWindow?.loadFile(distIndexPath);
        }
      });
    } else if (fs.existsSync(distIndexPath)) {
      this.mainWindow.loadFile(distIndexPath);
    } else {
      // Fallback to dev server
      this.mainWindow.loadURL('http://localhost:3000').catch(() => {
        if (fs.existsSync(distIndexPath)) {
          this.mainWindow?.loadFile(distIndexPath);
        }
      });
    }

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  /**
   * Register all strictly typed IPC handlers using IPC_CHANNELS constants
   */
  private registerIpcHandlers(): void {
    // ================= DEVICE / USB =================
    ipcMain.handle(IPC_CHANNELS.DEVICE_GET_STATUS, async (): Promise<MioDevice | null> => {
      return await this.usbManager.detectMioDevice();
    });

    ipcMain.handle(IPC_CHANNELS.DEVICE_RESCAN, async (): Promise<MioDevice | null> => {
      return await this.usbManager.detectMioDevice();
    });

    ipcMain.handle(
      IPC_CHANNELS.DEVICE_GET_TRACKS,
      async (_event, customTracksPath?: string): Promise<RideTrack[]> => {
        const device = this.usbManager.getLastKnownDevice();
        if (!device) return [];

        let targetPath = device.tracksPath;
        if (customTracksPath && typeof customTracksPath === 'string') {
          try {
            targetPath = PathSecurity.assertContainment(device.deviceId, customTracksPath, 'Custom tracks path');
          } catch (err) {
            logger.warn(TAG, 'Blocked query for tracks outside connected Mio device:', err);
            return [];
          }
        }
        return await this.usbManager.getRideHistory(targetPath);
      }
    );

    ipcMain.handle(IPC_CHANNELS.DEVICE_GET_TRACK_GPX, async (_event, filePath: string): Promise<string> => {
      return await this.usbManager.getTrackGpx(filePath);
    });

    // ================= STRAVA =================
    ipcMain.handle(IPC_CHANNELS.STRAVA_LOGIN, async () => {
      if (!this.mainWindow) throw new Error('Main window not ready');
      await this.authManager.launchStravaOAuthWindow(this.mainWindow);
      return this.authManager.getStravaAuthStatus();
    });

    ipcMain.handle(IPC_CHANNELS.STRAVA_DISCONNECT, async () => {
      this.authManager.clearStravaTokens();
      return true;
    });

    ipcMain.handle(IPC_CHANNELS.STRAVA_GET_STATUS, async () => {
      return this.authManager.getStravaAuthStatus();
    });

    ipcMain.handle(IPC_CHANNELS.STRAVA_UPLOAD_RIDE, async (_event, filePath: string, customName?: string) => {
      return await this.stravaService.uploadRide(filePath, customName);
    });

    ipcMain.handle(IPC_CHANNELS.STRAVA_POLL_UPLOAD, async (_event, uploadId: string) => {
      return await this.stravaService.pollUploadStatus(uploadId);
    });

    ipcMain.handle(IPC_CHANNELS.STRAVA_SYNC_ALL, async () => {
      const device = await this.usbManager.detectMioDevice();
      if (!device) {
        throw new Error('No Mio device connected. Connect device to sync rides.');
      }

      const allTracks = await this.usbManager.getRideHistory(device.tracksPath);
      // Strictly filter to recorded .fit files only
      const tracks = allTracks.filter((t) => t.extension === 'fit');
      let successful = 0;
      let failed = 0;

      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        this.mainWindow?.webContents.send(IPC_CHANNELS.STRAVA_SYNC_PROGRESS_EVENT, {
          inProgress: true,
          step: `Uploading ride ${i + 1} of ${tracks.length}`,
          progressPercent: Math.round(((i + 0.5) / tracks.length) * 100),
          currentItem: track.fileName,
          totalItems: tracks.length,
          completedItems: i,
        });

        try {
          const result = await this.stravaService.uploadRide(track.filePath);
          if (result.uploadId) {
            await this.stravaService.pollUploadStatus(result.uploadId, 8, 1500);
            successful++;
          }
        } catch (uploadErr) {
          logger.error(TAG, `Failed syncing track ${track.fileName}:`, uploadErr);
          failed++;
        }
      }

      this.mainWindow?.webContents.send(IPC_CHANNELS.STRAVA_SYNC_PROGRESS_EVENT, {
        inProgress: false,
        step: `Sync completed: ${successful} uploaded, ${failed} errors`,
        progressPercent: 100,
        totalItems: tracks.length,
        completedItems: successful,
      });

      return { total: tracks.length, successful, failed };
    });

    // ================= KOMOOT =================
    ipcMain.handle(IPC_CHANNELS.KOMOOT_LOGIN, async (_event, email: string, pass: string) => {
      return await this.komootService.login(email, pass);
    });

    ipcMain.handle(IPC_CHANNELS.KOMOOT_LOGOUT, async () => {
      this.authManager.clearKomootAuth();
      return true;
    });

    ipcMain.handle(IPC_CHANNELS.KOMOOT_GET_STATUS, async () => {
      return this.authManager.getKomootAuthStatus();
    });

    ipcMain.handle(IPC_CHANNELS.KOMOOT_GET_TOURS, async () => {
      return await this.komootService.getPlannedTours();
    });

    ipcMain.handle(
      IPC_CHANNELS.KOMOOT_DOWNLOAD_TOUR,
      async (_event, tourId: string | number, tourName: string) => {
        return await this.komootService.downloadTourToDevice(tourId, tourName);
      }
    );

    ipcMain.handle(IPC_CHANNELS.KOMOOT_GET_TOUR_GPX, async (_event, tourId: string | number) => {
      return await this.komootService.getTourGpx(tourId);
    });

    // ================= SYSTEM =================
    ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_FOLDER, async (_event, folderPath: string) => {
      if (!folderPath || typeof folderPath !== 'string') return false;
      const device = this.usbManager.getLastKnownDevice();
      if (!device) return false;

      try {
        const canonical = PathSecurity.assertContainment(device.deviceId, folderPath, 'Explorer folder');
        if (fs.existsSync(canonical)) {
          await shell.openPath(canonical);
          return true;
        }
      } catch (err) {
        logger.warn(TAG, 'Blocked attempt to open folder outside Mio device:', err);
      }
      return false;
    });

    ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_VERSION, async () => {
      return app.getVersion();
    });
  }

  /**
   * Hardware detection poller
   */
  private startUsbPolling(): void {
    this.usbPollTimer = setInterval(async () => {
      try {
        const device = await this.usbManager.detectMioDevice();
        const isConnected = !!device;

        if (isConnected !== this.lastConnectedState) {
          this.lastConnectedState = isConnected;
          logger.info(TAG, `USB Device State Changed: ${isConnected ? 'Connected' : 'Disconnected'}`);
          this.mainWindow?.webContents.send(IPC_CHANNELS.DEVICE_CHANGED_EVENT, device);
        }
      } catch {
        // silent polling catch
      }
    }, 3500);
  }

  private stopUsbPolling(): void {
    if (this.usbPollTimer) {
      clearInterval(this.usbPollTimer);
      this.usbPollTimer = null;
    }
  }
}

// Start application
const cycloConnect = new CycloConnectApp();
cycloConnect.init();

export default cycloConnect;
