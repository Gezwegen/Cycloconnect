import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { AuthManager } from './authManager';
import { UsbManager } from './usbManager';
import { KomootAuthStatus, KomootTour, KomootUser, RawKomootTourItem } from '../types';
import { KOMOOT_CONFIG } from '../constants/api';
import { PathSecurity } from './pathSecurity';
import { logger } from './logger';

const TAG = 'KomootService';

export class KomootService {
  private authManager: AuthManager;
  private usbManager: UsbManager;

  constructor(authManager: AuthManager, usbManager: UsbManager) {
    this.authManager = authManager;
    this.usbManager = usbManager;
  }

  /**
   * Login to Komoot using internal authentication endpoint:
   * GET https://api.komoot.de/v006/account/email/{email}/
   */
  public async login(email: string, password: string): Promise<KomootAuthStatus> {
    logger.info(TAG, `Authenticating user: ${email}`);

    const basicCredentials = Buffer.from(`${email}:${password}`).toString('base64');
    const response = await fetch(KOMOOT_CONFIG.LOGIN_URL(email), {
      method: 'GET',
      headers: {
        Authorization: `Basic ${basicCredentials}`,
        Accept: 'application/hal+json,application/json',
        'User-Agent': KOMOOT_CONFIG.USER_AGENT,
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid Komoot credentials. Please check your email and password.');
      }
      if (response.status === 429) {
        throw new Error('Komoot rate limit exceeded. Please wait a few moments before trying again.');
      }

      let errorMessage = `Komoot login failed (${response.status})`;
      try {
        const errorData = (await response.json()) as { message?: string; error?: string };
        if (errorData.message) errorMessage = errorData.message;
        else if (errorData.error) errorMessage = errorData.error;
      } catch {
        const errorBody = await response.text();
        if (errorBody) errorMessage = `${errorMessage}: ${errorBody}`;
      }

      logger.error(TAG, `Login failed (${response.status}):`, errorMessage);
      throw new Error(errorMessage);
    }

    const rawData = (await response.json()) as {
      user?: {
        username?: string;
        displayname?: string;
        display_name?: string;
        avatar?: {
          src?: string;
        };
        avatar_url?: string;
      };
      username?: string;
      password?: string;
      token?: string;
      _username?: string;
    };

    const userId = rawData.username || rawData._username || (rawData.user && rawData.user.username) || email;
    const displayName = (rawData.user && (rawData.user.displayname || rawData.user.display_name)) || userId;
    const token = rawData.password || rawData.token || '';

    const komootUser: KomootUser = {
      id: String(userId),
      display_name: displayName,
      email,
      avatar_url: (rawData.user && (rawData.user.avatar?.src || rawData.user.avatar_url)) || undefined,
    };

    this.authManager.saveKomootAuth({
      user: komootUser,
      token,
    });

    return {
      isAuthenticated: true,
      user: komootUser,
    };
  }

  /**
   * Fetch user's planned cycling tours from Komoot API
   */
  public async getPlannedTours(): Promise<KomootTour[]> {
    const auth = this.authManager.getKomootAuth();
    if (!auth || !auth.user || !auth.user.id) {
      throw new Error('Not authenticated with Komoot. Please log in.');
    }

    const url = KOMOOT_CONFIG.PLANNED_TOURS_URL(auth.user.id);
    const headers: Record<string, string> = {
      Accept: 'application/hal+json,application/json',
      'User-Agent': KOMOOT_CONFIG.USER_AGENT,
    };

    if (auth.token) {
      const basicAuth = Buffer.from(`${auth.user.id}:${auth.token}`).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Komoot session expired or unauthorized. Please log in again.');
      }
      if (response.status === 429) {
        throw new Error('Komoot rate limit exceeded. Please wait a few moments before trying again.');
      }
      const errorText = await response.text();
      logger.error(TAG, `Failed to fetch tours (${response.status}):`, errorText);
      throw new Error(`Failed to load Komoot tours (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as {
      _embedded?: {
        tours?: RawKomootTourItem[];
      };
    };

    const rawTours = data._embedded?.tours || [];

    // Filter out running / jogging routes
    const isJoggingOrRunning = (sport?: string) => {
      if (!sport) return false;
      const s = sport.toLowerCase().trim();
      return (
        s === 'jogging' ||
        s === 'running' ||
        s === 'trailrunning' ||
        s === 'run' ||
        s.includes('jog') ||
        s.includes('running')
      );
    };

    const cyclingTours = rawTours.filter((t) => !isJoggingOrRunning(t.sport));

    return cyclingTours.map((t) => {
      const distanceKm = (t.distance / 1000).toFixed(1);
      const hours = Math.floor(t.duration / 3600);
      const minutes = Math.floor((t.duration % 3600) / 60);
      const durationFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      let diff: 'easy' | 'moderate' | 'difficult' = 'moderate';
      if (t.difficulty?.grade === 'easy') diff = 'easy';
      if (t.difficulty?.grade === 'difficult' || t.difficulty?.grade === 'expert') diff = 'difficult';

      return {
        id: t.id,
        name: t.name || `Tour #${t.id}`,
        distance: t.distance,
        distanceKm,
        duration: t.duration,
        durationFormatted,
        elevation_up: Math.round(t.elevation_up || 0),
        elevation_down: Math.round(t.elevation_down || 0),
        sport: t.sport || 'cycling',
        date: t.date || new Date().toISOString(),
        difficulty: diff,
        transferStatus: 'idle',
      };
    });
  }

  /**
   * Download a planned tour as .gpx and stream write directly into Mio device tracks directory
   */
  public async downloadTourToDevice(
    tourId: string | number,
    tourName: string,
    customDestinationDir?: string
  ): Promise<{ success: boolean; targetPath: string; error?: string }> {
    const auth = this.authManager.getKomootAuth();
    if (!auth || !auth.user) {
      throw new Error('Please log into Komoot to download tours.');
    }

    const device = this.usbManager.getLastKnownDevice();
    if (!device || !device.connected) {
      throw new Error('No Mio Cyclo device connected. Connect your device via USB to download route.');
    }

    const canonicalTracksDir = path.resolve(device.tracksPath);
    let targetTracksDir = canonicalTracksDir;

    if (customDestinationDir) {
      const resolvedCustom = path.resolve(customDestinationDir);
      if (resolvedCustom.toLowerCase().startsWith(canonicalTracksDir.toLowerCase())) {
        targetTracksDir = resolvedCustom;
      } else {
        logger.warn(TAG, `Destination dir outside tracks folder, defaulting to: ${canonicalTracksDir}`);
      }
    }

    await this.usbManager.ensureTracksDirectory(targetTracksDir);

    const safeName = PathSecurity.sanitizeFilename(tourName, `Tour_${tourId}`);
    const targetFilePath = path.resolve(targetTracksDir, `${safeName}.gpx`);

    PathSecurity.assertContainment(canonicalTracksDir, targetFilePath, 'Target GPX file');

    const gpxUrl = KOMOOT_CONFIG.TOUR_GPX_URL(tourId);
    const headers: Record<string, string> = {
      Accept: 'application/gpx+xml,application/octet-stream',
      'User-Agent': KOMOOT_CONFIG.USER_AGENT,
    };

    if (auth.token) {
      const basicAuth = Buffer.from(`${auth.user.id}:${auth.token}`).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    }

    logger.info(TAG, `Downloading tour ${tourId} to ${targetFilePath}...`);

    const response = await fetch(gpxUrl, { headers });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Komoot session expired or unauthorized. Please log in again.');
      }
      if (response.status === 429) {
        throw new Error('Komoot rate limit exceeded. Please wait a few moments before trying again.');
      }
      const err = await response.text();
      throw new Error(`Failed to download GPX from Komoot (${response.status}): ${err}`);
    }

    if (!response.body) {
      throw new Error('Empty response body received from Komoot GPX endpoint.');
    }

    // Convert Web ReadableStream to Node stream and stream write to file
    const fileStream = fs.createWriteStream(targetFilePath);
    const nodeReadable = Readable.fromWeb(response.body as unknown as import('stream/web').ReadableStream);

    await pipeline(nodeReadable, fileStream);

    logger.info(TAG, `Successfully saved GPX to ${targetFilePath}`);

    return {
      success: true,
      targetPath: targetFilePath,
    };
  }

  /**
   * Fetch raw GPX XML string for a specific planned Komoot tour on-demand
   */
  public async getTourGpx(tourId: string | number): Promise<string> {
    const auth = this.authManager.getKomootAuth();
    if (!auth || !auth.user) {
      throw new Error('Please log into Komoot to inspect tour route.');
    }

    const gpxUrl = KOMOOT_CONFIG.TOUR_GPX_URL(tourId);
    const headers: Record<string, string> = {
      Accept: 'application/gpx+xml,application/octet-stream,text/xml',
      'User-Agent': KOMOOT_CONFIG.USER_AGENT,
    };

    if (auth.token) {
      const basicAuth = Buffer.from(`${auth.user.id}:${auth.token}`).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    }

    logger.info(TAG, `Fetching GPX for tour ${tourId}...`);
    const response = await fetch(gpxUrl, { headers });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Komoot session expired or unauthorized. Please log in again.');
      }
      if (response.status === 429) {
        throw new Error('Komoot rate limit exceeded. Please wait a few moments before trying again.');
      }
      const err = await response.text();
      logger.error(TAG, `Failed to load tour ${tourId} GPX (${response.status}):`, err);
      throw new Error(`Failed to load Komoot tour GPX (${response.status}): ${err}`);
    }

    return await response.text();
  }
}
