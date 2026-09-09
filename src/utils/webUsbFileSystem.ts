import { MioDevice, RideTrack } from '../types/cycloconnect';
import { parseGpxXml, parseFitBuffer } from './gpxParser';

export interface WebMioSession {
  rootHandle: FileSystemDirectoryHandle;
  tracksHandle: FileSystemDirectoryHandle;
  device: MioDevice;
  tracks: RideTrack[];
}

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: (options: {
    id: string;
    mode: string;
    startIn: string;
  }) => Promise<FileSystemDirectoryHandle>;
}

interface IterableDirectoryHandle {
  values(): AsyncIterable<FileSystemFileHandle | FileSystemDirectoryHandle>;
}

/**
 * Connect to a physically plugged-in Mio Cyclo USB Drive using File System Access API.
 * The user selects the USB Drive (e.g. E: / Mio_data) or the \Dodge\Tracks folder.
 */
export async function pickAndMountMioDevice(): Promise<WebMioSession> {
  const win = window as DirectoryPickerWindow;
  if (!win.showDirectoryPicker) {
    throw new Error(
      'Your browser does not support the File System Access API. Please use Google Chrome, Microsoft Edge, or the native Electron desktop build.'
    );
  }

  // Open directory picker
  const rootHandle = await win.showDirectoryPicker({
    id: 'mio-cyclo-usb-drive',
    mode: 'readwrite',
    startIn: 'desktop',
  });

  const deviceName = rootHandle.name || 'Mio_data';
  let tracksHandle = null;
  let tracksRelativePath = '\\Dodge\\Tracks';

  // Check structure:
  // Case A: User selected drive root (e.g. E: or Mio_data) containing "Dodge"
  try {
    const dodgeHandle = await rootHandle.getDirectoryHandle('Dodge', { create: false });
    tracksHandle = await dodgeHandle.getDirectoryHandle('Tracks', { create: false });
    tracksRelativePath = `${deviceName}\\Dodge\\Tracks`;
  } catch {
    // Case B: User selected "Dodge" folder directly
    try {
      tracksHandle = await rootHandle.getDirectoryHandle('Tracks', { create: false });
      tracksRelativePath = `Dodge\\Tracks`;
    } catch {
      // Case C: User selected "Tracks" folder directly or drive root containing tracks directly
      if (rootHandle.name.toLowerCase() === 'tracks') {
        tracksHandle = rootHandle;
        tracksRelativePath = `Tracks`;
      } else {
        // Fallback: Use selected folder as tracks directory
        tracksHandle = rootHandle;
        tracksRelativePath = `${deviceName}\\Tracks`;
      }
    }
  }

  // Scan for real .fit and .gpx ride recordings
  const tracks: RideTrack[] = [];
  let totalTrackBytes = 0;

  async function scanDirectory(dirHandle: FileSystemDirectoryHandle, currentRelative: string, profileName: string) {
    const iterableDir = dirHandle as unknown as IterableDirectoryHandle;
    for await (const entry of iterableDir.values()) {
      if (entry.kind === 'file') {
        const fileEntry = entry as FileSystemFileHandle;
        const lowerName = fileEntry.name.toLowerCase();
        if (lowerName.endsWith('.fit') || lowerName.endsWith('.gpx')) {
          const file: File = await fileEntry.getFile();
          totalTrackBytes += file.size;
          const ext = lowerName.endsWith('.fit') ? 'fit' : 'gpx';

          // Parse actual GPS track content
          let parsedData;
          try {
            if (ext === 'gpx') {
              const text = await file.text();
              parsedData = parseGpxXml(text, file.name);
            } else {
              const buffer = await file.arrayBuffer();
              parsedData = await parseFitBuffer(buffer, file.name);
            }
          } catch (e) {
            console.warn(`Could not parse GPS data from ${file.name}:`, e);
          }

          const distKm = parsedData?.distanceMeters ? (parsedData.distanceMeters / 1000).toFixed(1) : undefined;
          const durationMins = parsedData?.durationSeconds ? Math.round(parsedData.durationSeconds / 60) : undefined;
          const durationFormatted = durationMins
            ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
            : undefined;
          const avgSpeed =
            distKm && durationMins && durationMins > 0
              ? ((parseFloat(distKm) / (durationMins / 60))).toFixed(1)
              : undefined;

          tracks.push({
            id: `real-${fileEntry.name}-${file.lastModified}`,
            fileName: fileEntry.name,
            filePath: `${tracksRelativePath}\\${currentRelative ? currentRelative + '\\' : ''}${fileEntry.name}`,
            relativePath: `${currentRelative ? currentRelative + '\\' : ''}${fileEntry.name}`,
            directory: profileName,
            fileSizeBytes: file.size,
            fileSizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
            extension: ext,
            dateModified: new Date(file.lastModified).toISOString(),
            profile: profileName,
            uploadStatus: 'idle',
            points: parsedData?.points,
            waypoints: parsedData?.waypoints,
            distanceKm: distKm,
            elevationGainM: parsedData?.elevationGainMeters,
            durationFormatted,
            avgSpeedKmh: avgSpeed,
            rawFile: file,
            fileHandle: fileEntry,
          });
        }
      } else if (entry.kind === 'directory') {
        const dirEntry = entry as FileSystemDirectoryHandle;
        // Recurse into Profile folders (e.g. Profile1, Profile2, etc.)
        const subProfile = dirEntry.name.startsWith('Profile')
          ? `Profile ${dirEntry.name.replace('Profile', '')}`
          : dirEntry.name;
        await scanDirectory(dirEntry, `${currentRelative ? currentRelative + '\\' : ''}${dirEntry.name}`, subProfile);
      }
    }
  }

  await scanDirectory(tracksHandle, '', 'Default Profile');

  // Sort by date modified descending (newest rides first)
  tracks.sort((a, b) => new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime());

  // Auto-detect hardware model and true flash storage from user.xml / device.xml
  let modelName = 'Mio Cyclo Cycling Computer';
  let totalCapacityBytes = 4026531840; // 4.0 GB standard Mio default (e.g. Cyclo 305 / 315)
  let totalCapacityGB = 4.0;

  try {
    let xmlFile: File | null = null;
    for (const xmlName of ['user.xml', 'device.xml']) {
      try {
        const fileHandle = await rootHandle.getFileHandle(xmlName);
        xmlFile = await fileHandle.getFile();
        if (xmlFile) break;
      } catch {
        // continue
      }
    }

    if (xmlFile) {
      const xmlText = await xmlFile.text();
      const modelMatch = xmlText.match(/<displayname>([^<]+)<\/displayname>/i);
      if (modelMatch && modelMatch[1]) {
        modelName = modelMatch[1].trim();
      }
      const sizeMatch = xmlText.match(/<storage>\s*<size>([^<]+)<\/size>/i);
      if (sizeMatch && sizeMatch[1]) {
        const raw = sizeMatch[1].trim();
        const bytes = raw.startsWith('0x') ? parseInt(raw, 16) : parseInt(raw, 10);
        if (!isNaN(bytes) && bytes > 0) {
          totalCapacityBytes = bytes;
          totalCapacityGB = Number((bytes / (1000 * 1000 * 1000)).toFixed(1));
        }
      }
    }
  } catch (e) {
    console.warn('Could not read user.xml/device.xml from directory handle:', e);
  }

  // Model-based fallback if XML not found
  if (modelName.includes('210') || modelName.includes('215') || modelName.includes('405') || modelName.includes('605')) {
    totalCapacityGB = 8.0;
    totalCapacityBytes = 8000000000;
  }

  // Base system OS + map allocation is typically 1.85 GB on 4GB devices, 3.8 GB on 8GB devices
  const systemReserveGB = totalCapacityGB >= 8.0 ? 3.8 : 1.85;
  const tracksUsedGB = Number((totalTrackBytes / (1000 * 1000 * 1000)).toFixed(3));
  const usedSpaceGB = Number((systemReserveGB + tracksUsedGB).toFixed(2));
  const freeSpaceGB = Number(Math.max(0, totalCapacityGB - usedSpaceGB).toFixed(2));
  const usedPercentage = Math.min(100, Math.round((usedSpaceGB / totalCapacityGB) * 100));

  const device: MioDevice = {
    connected: true,
    deviceId: deviceName.includes(':') ? deviceName : `${deviceName}:`,
    volumeName: 'Mio_data',
    sizeBytes: totalCapacityBytes,
    freeSizeBytes: Math.round(freeSpaceGB * 1000 * 1000 * 1000),
    sizeGB: totalCapacityGB,
    freeSpaceGB,
    usedSpaceGB,
    usedPercentage,
    tracksPath: tracksRelativePath,
    modelName: modelName !== 'Mio Cyclo Cycling Computer' ? modelName : 'Mio Cyclo Computer',
    rawDriveType: 'Removable USB Flash Storage',
    isRealHardware: true,
    hardwareSource: 'file-system-access',
  };

  return {
    rootHandle,
    tracksHandle,
    device,
    tracks,
  };
}

/**
 * Write a real GPX route directly to the plugged-in Mio Cyclo's \Dodge\Tracks\ folder!
 */
export async function writeGpxToRealDevice(
  tracksHandle: FileSystemDirectoryHandle,
  fileName: string,
  gpxContent: string
): Promise<{ success: boolean; filePath: string }> {
  if (!tracksHandle) {
    throw new Error('No real Mio Cyclo drive handle available');
  }

  const cleanName = fileName.endsWith('.gpx') ? fileName : `${fileName}.gpx`;
  const safeName = cleanName.replace(/[\\/:*?"<>|]/g, '_').trim();

  // Create file in \Dodge\Tracks
  const fileHandle = await tracksHandle.getFileHandle(safeName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(gpxContent);
  await writable.close();

  return {
    success: true,
    filePath: `\\Dodge\\Tracks\\${safeName}`,
  };
}

/**
 * Fallback: Process files selected via standard webkitdirectory folder upload
 */
export async function parseUploadedMioDirectory(fileList: FileList): Promise<{ device: MioDevice; tracks: RideTrack[] }> {
  const tracks: RideTrack[] = [];
  let totalTrackBytes = 0;

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const path = file.webkitRelativePath || file.name;
    const lower = path.toLowerCase();

    if (lower.endsWith('.fit') || lower.endsWith('.gpx')) {
      totalTrackBytes += file.size;
      const ext = lower.endsWith('.fit') ? 'fit' : 'gpx';

      let parsedData;
      try {
        if (ext === 'gpx') {
          const text = await file.text();
          parsedData = parseGpxXml(text, file.name);
        } else {
          const buffer = await file.arrayBuffer();
          parsedData = await parseFitBuffer(buffer, file.name);
        }
      } catch (err) {
        console.warn('GPS parse error:', err);
      }

      const distKm = parsedData?.distanceMeters ? (parsedData.distanceMeters / 1000).toFixed(1) : undefined;
      const durationMins = parsedData?.durationSeconds ? Math.round(parsedData.durationSeconds / 60) : undefined;
      const durationFormatted = durationMins
        ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`
        : undefined;

      const parts = path.split('/');
      const profileName = parts.length > 2 && parts[parts.length - 2].includes('Profile')
        ? parts[parts.length - 2]
        : 'Tracks';

      tracks.push({
        id: `upload-${file.name}-${file.lastModified}`,
        fileName: file.name,
        filePath: path,
        relativePath: path,
        directory: profileName,
        fileSizeBytes: file.size,
        fileSizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
        extension: ext,
        dateModified: new Date(file.lastModified).toISOString(),
        profile: profileName,
        uploadStatus: 'idle',
        points: parsedData?.points,
        waypoints: parsedData?.waypoints,
        distanceKm: distKm,
        elevationGainM: parsedData?.elevationGainMeters,
        durationFormatted,
        rawFile: file,
      });
    }
  }

  tracks.sort((a, b) => new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime());

  let modelName = 'Mio Cyclo Cycling Computer';
  let totalCapacityGB = 4.0;
  let totalCapacityBytes = 4026531840;

  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    const lowerName = f.name.toLowerCase();
    if (lowerName === 'user.xml' || lowerName === 'device.xml') {
      try {
        const text = await f.text();
        const modelMatch = text.match(/<displayname>([^<]+)<\/displayname>/i);
        if (modelMatch && modelMatch[1]) modelName = modelMatch[1].trim();
        const sizeMatch = text.match(/<storage>\s*<size>([^<]+)<\/size>/i);
        if (sizeMatch && sizeMatch[1]) {
          const raw = sizeMatch[1].trim();
          const bytes = raw.startsWith('0x') ? parseInt(raw, 16) : parseInt(raw, 10);
          if (!isNaN(bytes) && bytes > 0) {
            totalCapacityBytes = bytes;
            totalCapacityGB = Number((bytes / (1000 * 1000 * 1000)).toFixed(1));
          }
        }
      } catch {
        // ignore
      }
    }
  }

  if (modelName.includes('210') || modelName.includes('215') || modelName.includes('405') || modelName.includes('605')) {
    totalCapacityGB = 8.0;
    totalCapacityBytes = 8000000000;
  }

  const systemReserveGB = totalCapacityGB >= 8.0 ? 3.8 : 1.85;
  const tracksUsedGB = Number((totalTrackBytes / (1000 * 1000 * 1000)).toFixed(3));
  const usedSpaceGB = Number((systemReserveGB + tracksUsedGB).toFixed(2));
  const freeSpaceGB = Number(Math.max(0, totalCapacityGB - usedSpaceGB).toFixed(2));
  const usedPercentage = Math.min(100, Math.round((usedSpaceGB / totalCapacityGB) * 100));

  const device: MioDevice = {
    connected: true,
    deviceId: 'Mio_data',
    volumeName: 'Mio_data',
    sizeBytes: totalCapacityBytes,
    freeSizeBytes: Math.round(freeSpaceGB * 1000 * 1000 * 1000),
    sizeGB: totalCapacityGB,
    freeSpaceGB,
    usedSpaceGB,
    usedPercentage,
    tracksPath: 'Mio_data\\Dodge\\Tracks',
    modelName: modelName !== 'Mio Cyclo Cycling Computer' ? modelName : 'Mio Cyclo Computer',
    rawDriveType: 'Removable USB Storage',
    isRealHardware: true,
    hardwareSource: 'folder-upload',
  };

  return { device, tracks };
}
