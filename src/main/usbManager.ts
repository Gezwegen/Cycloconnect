import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { MioDevice, RideTrack, LogicalDiskRaw } from '../types';
import { MIO_DEVICE_PATHS } from '../constants/paths';
import { PathSecurity } from './pathSecurity';
import { logger } from './logger';

const execAsync = promisify(exec);
const TAG = 'UsbManager';

export class UsbManager {
  private lastKnownDevice: MioDevice | null = null;
  private isScanning = false;

  /**
   * Run PowerShell CIM query (with WMIC fallback on older Windows) to detect Mio Cyclo device.
   * Reads user.xml / device.xml to identify exact model and true hardware storage.
   */
  public async detectMioDevice(): Promise<MioDevice | null> {
    if (this.isScanning) {
      return this.lastKnownDevice;
    }
    this.isScanning = true;

    try {
      let drives: LogicalDiskRaw[] = [];

      // 1. Primary detection: PowerShell Get-CimInstance Win32_LogicalDisk
      try {
        const psCmd =
          'powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk | Select-Object DeviceId, VolumeName, Size, FreeSpace, DriveType | ConvertTo-Json"';
        const { stdout } = await execAsync(psCmd);
        if (stdout && stdout.trim().length > 0) {
          const parsed = JSON.parse(stdout) as LogicalDiskRaw | LogicalDiskRaw[];
          drives = Array.isArray(parsed) ? parsed : [parsed];
        }
      } catch (psErr) {
        logger.warn(TAG, 'PowerShell disk query failed, trying legacy fallback:', psErr);
        // Fallback: WMIC (legacy Windows)
        try {
          const wmicCommand = 'wmic logicaldisk where "drivetype=2" get deviceid,volumename,size,freespace /format:csv';
          const { stdout } = await execAsync(wmicCommand);
          const wmicDevice = this.parseWmicOutput(stdout);
          if (wmicDevice) {
            this.lastKnownDevice = wmicDevice;
            return wmicDevice;
          }
        } catch {
          // silent fallback failure
        }
      }

      if (drives.length === 0) {
        this.lastKnownDevice = null;
        return null;
      }

      // 2. Identify Mio data drive containing Dodge\Tracks
      let dataDrive = drives.find(
        (d) => d.VolumeName && d.VolumeName.toLowerCase() === MIO_DEVICE_PATHS.DATA_VOLUME_NAME.toLowerCase()
      );

      if (!dataDrive) {
        for (const d of drives) {
          if (d.DeviceId) {
            const clean = d.DeviceId.endsWith(path.sep) ? d.DeviceId : `${d.DeviceId}${path.sep}`;
            const candidateTracks = path.join(clean, MIO_DEVICE_PATHS.TRACKS_SUBDIR);
            if (fs.existsSync(candidateTracks)) {
              dataDrive = d;
              break;
            }
          }
        }
      }

      if (!dataDrive || !dataDrive.DeviceId) {
        this.lastKnownDevice = null;
        return null;
      }

      // 3. Find companion system drive (MIO_SYSTEM) if present
      const systemDrive = drives.find(
        (d) =>
          d.DeviceId !== dataDrive!.DeviceId &&
          d.VolumeName &&
          d.VolumeName.toUpperCase().includes(MIO_DEVICE_PATHS.SYSTEM_VOLUME_PREFIX)
      );

      // 4. Read user.xml / device.xml to get exact hardware model and storage capacity
      let modelName = 'Mio Cyclo Cycling Computer';
      let totalHardwareCapacityBytes = 0;

      const candidateDrives = [dataDrive, ...(systemDrive ? [systemDrive] : []), ...drives];
      for (const drv of candidateDrives) {
        if (!drv.DeviceId) continue;
        const cleanId = drv.DeviceId.endsWith(path.sep) ? drv.DeviceId : `${drv.DeviceId}${path.sep}`;
        for (const xmlName of [MIO_DEVICE_PATHS.USER_MANIFEST, MIO_DEVICE_PATHS.DEVICE_MANIFEST]) {
          const xmlPath = path.join(cleanId, xmlName);
          try {
            if (fs.existsSync(xmlPath)) {
              const xmlContent = fs.readFileSync(xmlPath, 'utf8');
              const modelMatch = xmlContent.match(/<displayname>([^<]+)<\/displayname>/i);
              if (modelMatch && modelMatch[1]) {
                modelName = modelMatch[1].trim();
              }
              const sizeMatch = xmlContent.match(/<storage>\s*<size>([^<]+)<\/size>/i);
              if (sizeMatch && sizeMatch[1]) {
                const raw = sizeMatch[1].trim();
                const bytes = raw.startsWith('0x') ? parseInt(raw, 16) : parseInt(raw, 10);
                if (!isNaN(bytes) && bytes > 0) {
                  totalHardwareCapacityBytes = bytes;
                }
              }
              break;
            }
          } catch {
            // ignore unreadable manifest
          }
        }
        if (totalHardwareCapacityBytes > 0 && modelName !== 'Mio Cyclo Cycling Computer') {
          break;
        }
      }

      // 5. Calculate storage metrics
      const cleanDataId = dataDrive.DeviceId.endsWith(path.sep)
        ? dataDrive.DeviceId
        : `${dataDrive.DeviceId}${path.sep}`;
      const tracksPath = path.join(cleanDataId, MIO_DEVICE_PATHS.TRACKS_SUBDIR);

      let totalSizeBytes = (dataDrive.Size || 0) + (systemDrive?.Size || 0);
      const totalFreeBytes = (dataDrive.FreeSpace || 0) + (systemDrive?.FreeSpace || 0);

      if (totalHardwareCapacityBytes > 0) {
        totalSizeBytes = totalHardwareCapacityBytes;
      }

      const bytesInGB = 1000 * 1000 * 1000;
      const sizeGB = Number((totalSizeBytes / bytesInGB).toFixed(1));
      const freeSpaceGB = Number((totalFreeBytes / bytesInGB).toFixed(2));
      const usedSpaceGB = Number(Math.max(0, sizeGB - freeSpaceGB).toFixed(2));
      const usedPercentage = sizeGB > 0 ? Math.min(100, Math.round((usedSpaceGB / sizeGB) * 100)) : 0;

      const device: MioDevice = {
        connected: true,
        deviceId: dataDrive.DeviceId.replace(/\\$/, ''),
        volumeName: dataDrive.VolumeName || MIO_DEVICE_PATHS.DATA_VOLUME_NAME,
        sizeBytes: totalSizeBytes,
        freeSizeBytes: totalFreeBytes,
        sizeGB,
        freeSpaceGB,
        usedSpaceGB,
        usedPercentage,
        tracksPath,
        modelName,
        rawDriveType: 'Removable Disk (USB)',
        isRealHardware: true,
        hardwareSource: 'cim-wmi',
      };

      this.lastKnownDevice = device;
      return device;
    } catch (error) {
      logger.error(TAG, 'Failed to detect Mio device:', error);
      return null;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Parse CSV output from wmic logicaldisk as legacy fallback
   */
  public parseWmicOutput(csvData: string): MioDevice | null {
    if (!csvData || typeof csvData !== 'string') {
      return null;
    }

    const lines = csvData
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length < 2) {
      return null;
    }

    const headerLine = lines[0];
    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());

    const deviceIdIdx = headers.indexOf('deviceid');
    const volumeNameIdx = headers.indexOf('volumename');
    const sizeIdx = headers.indexOf('size');
    const freeSpaceIdx = headers.indexOf('freespace');

    if (deviceIdIdx === -1 || volumeNameIdx === -1) {
      return null;
    }

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((c) => c.trim());
      if (row.length < headers.length) continue;

      const volumeName = row[volumeNameIdx];
      const deviceId = row[deviceIdIdx];

      if (volumeName && volumeName.toLowerCase() === MIO_DEVICE_PATHS.DATA_VOLUME_NAME.toLowerCase()) {
        const sizeBytes = parseInt(row[sizeIdx], 10) || 0;
        const freeSizeBytes = parseInt(row[freeSpaceIdx], 10) || 0;

        const bytesInGB = 1000 * 1000 * 1000;
        const sizeGB = Number((sizeBytes / bytesInGB).toFixed(1));
        const freeSpaceGB = Number((freeSizeBytes / bytesInGB).toFixed(2));
        const usedSpaceGB = Number(Math.max(0, sizeGB - freeSpaceGB).toFixed(2));
        const usedPercentage = sizeGB > 0 ? Math.min(100, Math.round((usedSpaceGB / sizeGB) * 100)) : 0;

        const cleanDeviceId = deviceId.endsWith(path.sep) ? deviceId : `${deviceId}${path.sep}`;
        const tracksPath = path.join(cleanDeviceId, MIO_DEVICE_PATHS.TRACKS_SUBDIR);

        return {
          connected: true,
          deviceId: deviceId.replace(/\\$/, ''),
          volumeName: volumeName,
          sizeBytes,
          freeSizeBytes,
          sizeGB,
          freeSpaceGB,
          usedSpaceGB,
          usedPercentage,
          tracksPath,
          modelName: 'Mio Cyclo Cycling Computer',
          rawDriveType: 'Removable Disk (USB)',
          isRealHardware: true,
          hardwareSource: 'wmic',
        };
      }
    }

    return null;
  }

  /**
   * Scan for .fit and .gpx ride tracks in tracks directory and profile subdirectories.
   * Uses lightweight metadata reading without loading file contents.
   */
  public async getRideHistory(customTracksPath?: string): Promise<RideTrack[]> {
    const targetDir = customTracksPath || (this.lastKnownDevice ? this.lastKnownDevice.tracksPath : null);

    if (!targetDir) {
      return [];
    }

    const tracks: RideTrack[] = [];

    try {
      const exists = await fs.promises.stat(targetDir).catch(() => null);
      if (!exists || !exists.isDirectory()) {
        return [];
      }

      await this.scanDirectoryRecursive(targetDir, targetDir, tracks);
    } catch (err) {
      logger.error(TAG, `Failed reading ride history from ${targetDir}:`, err);
    }

    // Sort newest rides first
    return tracks.sort((a, b) => new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime());
  }

  /**
   * Recursive directory traversal for ride recordings
   */
  private async scanDirectoryRecursive(baseDir: string, currentDir: string, results: RideTrack[]): Promise<void> {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await this.scanDirectoryRecursive(baseDir, fullPath, results);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === MIO_DEVICE_PATHS.EXT_FIT || ext === MIO_DEVICE_PATHS.EXT_GPX) {
          const stats = await fs.promises.stat(fullPath);
          const relativePath = path.relative(baseDir, fullPath);
          const dirName = path.basename(path.dirname(fullPath));
          const profileName = dirName === 'Tracks' || dirName === '' ? 'Default' : dirName;

          results.push({
            id: Buffer.from(relativePath).toString('base64'),
            fileName: entry.name,
            filePath: fullPath,
            relativePath,
            directory: dirName,
            fileSizeBytes: stats.size,
            fileSizeFormatted: this.formatBytes(stats.size),
            extension: ext.substring(1) as 'fit' | 'gpx',
            dateModified: stats.mtime.toISOString(),
            profile: profileName,
            uploadStatus: 'idle',
          });
        }
      }
    }
  }

  /**
   * Securely read GPX track contents on-demand.
   * Strictly enforces path containment within connected Mio device storage.
   */
  public async getTrackGpx(filePath: string): Promise<string> {
    const device = this.lastKnownDevice;
    if (!device || !device.connected) {
      throw new Error('No Mio Cyclo device connected.');
    }

    PathSecurity.assertContainment(device.deviceId, filePath, 'GPX Track');
    PathSecurity.validateGpxExtension(filePath);

    return await fs.promises.readFile(filePath, 'utf8');
  }

  /**
   * Ensure the target route directory (${deviceId}\Dodge\Tracks) exists on the device.
   */
  public async ensureTracksDirectory(tracksPath: string): Promise<void> {
    await fs.promises.mkdir(tracksPath, { recursive: true });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  public getLastKnownDevice(): MioDevice | null {
    return this.lastKnownDevice;
  }
}
