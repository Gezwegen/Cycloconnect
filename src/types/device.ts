/**
 * Mio Cyclo Hardware and USB Device Typings
 */

export type HardwareSource = 'cim-wmi' | 'wmic' | 'file-system-access' | 'folder-upload' | 'simulated';

export interface MioDevice {
  readonly connected: boolean;
  readonly deviceId: string; // e.g. "E:"
  readonly volumeName: string; // "Mio_data"
  readonly sizeBytes: number;
  readonly freeSizeBytes: number;
  readonly sizeGB: number;
  readonly freeSpaceGB: number;
  readonly usedSpaceGB: number;
  readonly usedPercentage: number;
  readonly tracksPath: string; // e.g. "E:\Dodge\Tracks"
  readonly modelName?: string;
  readonly serialNumber?: string;
  readonly rawDriveType?: string;
  readonly isRealHardware?: boolean;
  readonly hardwareSource?: HardwareSource;
}

export type DeviceState =
  | { readonly status: 'disconnected' }
  | { readonly status: 'scanning' }
  | { readonly status: 'connected'; readonly device: MioDevice }
  | { readonly status: 'error'; readonly message: string };

export interface LogicalDiskRaw {
  readonly DeviceId?: string;
  readonly VolumeName?: string;
  readonly Size?: number;
  readonly FreeSpace?: number;
  readonly DriveType?: number;
}

