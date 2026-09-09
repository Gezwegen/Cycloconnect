import * as fs from 'fs';
import * as path from 'path';
import { AuthManager } from './authManager';
import { UsbManager } from './usbManager';
import { UploadResult } from '../types';
import { STRAVA_CONFIG } from '../constants/api';
import { PathSecurity } from './pathSecurity';
import { logger } from './logger';

const TAG = 'StravaService';

interface StravaUploadResponse {
  readonly id: number;
  readonly id_str: string;
  readonly error: string | null;
  readonly status: string;
  readonly activity_id: number | null;
}

export class StravaService {
  private authManager: AuthManager;
  private usbManager: UsbManager;

  constructor(authManager: AuthManager, usbManager: UsbManager) {
    this.authManager = authManager;
    this.usbManager = usbManager;
  }

  /**
   * Upload a ride file (.fit) from the Mio Cyclo USB drive to Strava.
   * Strictly enforces device path containment and .fit file type.
   */
  public async uploadRide(filePath: string, customName?: string): Promise<UploadResult> {
    const accessToken = await this.authManager.getValidStravaAccessToken();

    // 1. Validate connected device
    const device = this.usbManager.getLastKnownDevice();
    if (!device || !device.connected) {
      throw new Error('No Mio Cyclo device connected. Connect your device via USB to upload rides.');
    }

    // 2. Canonical containment validation
    const canonicalPath = PathSecurity.assertContainment(device.deviceId, filePath, 'Ride recording');

    // 3. Validate file exists
    const stats = await fs.promises.stat(canonicalPath);
    if (!stats.isFile()) {
      throw new Error(`Invalid ride file path: "${canonicalPath}".`);
    }

    // 4. Validate .fit extension (unridden .gpx routes are strictly prohibited from activity sync)
    PathSecurity.validateFitExtension(canonicalPath);

    // 5. Read binary file
    const fileBuffer = await fs.promises.readFile(canonicalPath);
    const fileName = path.basename(canonicalPath);

    // 6. Construct multipart/form-data payload
    const formData = new FormData();
    const fileBlob = new Blob([fileBuffer], { type: 'application/octet-stream' });

    formData.append('file', fileBlob, fileName);
    formData.append('data_type', 'fit');
    formData.append('name', customName || 'Mio Cyclo Ride');
    formData.append('description', 'Recorded on Mio Cyclo, synchronized seamlessly via CycloConnect');

    logger.info(TAG, `Uploading ${fileName} (${fileBuffer.length} bytes) to Strava...`);

    const response = await fetch(STRAVA_CONFIG.UPLOADS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(TAG, `Upload failed with status ${response.status}:`, errorText);
      throw new Error(`Strava API upload failed (${response.status}): ${errorText}`);
    }

    const uploadData = (await response.json()) as StravaUploadResponse;

    return {
      uploadId: String(uploadData.id),
      activityId: uploadData.activity_id ? String(uploadData.activity_id) : undefined,
      status: uploadData.status || 'Processing upload',
      error: uploadData.error || undefined,
    };
  }

  /**
   * Poll status of an upload until processing finishes or times out.
   */
  public async pollUploadStatus(
    uploadId: string,
    maxRetries: number = STRAVA_CONFIG.MAX_POLL_RETRIES,
    intervalMs: number = STRAVA_CONFIG.POLL_INTERVAL_MS
  ): Promise<{ status: string; activityId?: string; error?: string }> {
    const accessToken = await this.authManager.getValidStravaAccessToken();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const response = await fetch(`${STRAVA_CONFIG.UPLOADS_URL}/${uploadId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check Strava upload status: ${response.statusText}`);
      }

      const statusData = (await response.json()) as StravaUploadResponse;

      if (statusData.error) {
        return {
          status: 'error',
          error: statusData.error,
        };
      }

      if (statusData.activity_id) {
        return {
          status: 'ready',
          activityId: String(statusData.activity_id),
        };
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    return {
      status: 'timeout',
      error: 'Strava processing took longer than expected. Check your Strava feed shortly.',
    };
  }

  /**
   * Fetch recent activities from authenticated athlete for verification
   */
  public async getRecentActivities(perPage = 10): Promise<unknown[]> {
    const accessToken = await this.authManager.getValidStravaAccessToken();
    const res = await fetch(`${STRAVA_CONFIG.ACTIVITIES_URL}?per_page=${perPage}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Strava activities: ${res.statusText}`);
    }

    return (await res.json()) as unknown[];
  }
}
