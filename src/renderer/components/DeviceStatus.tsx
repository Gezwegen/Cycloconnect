import React from 'react';
import { HardDrive, FolderOpen, Usb, CheckCircle, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import { EmptyState } from './common/EmptyState';
import { Badge } from './common/Badge';
import { Button } from './common/Button';
import { MioDevice } from '../../types/cycloconnect';

interface DeviceStatusProps {
  device: MioDevice | null;
  onOpenTracksFolder: (path: string) => void;
  onRescan: () => void;
  isLoading: boolean;
}

export const DeviceStatus: React.FC<DeviceStatusProps> = ({
  device,
  onOpenTracksFolder,
  onRescan,
  isLoading,
}) => {
  if (!device || !device.connected) {
    return (
      <EmptyState
        type="device-disconnected"
        onAction={onRescan}
        actionText="Scan Connected Disks"
        isLoading={isLoading}
      />
    );
  }

  const freePercentage = device.sizeGB > 0 ? Math.round((device.freeSpaceGB / device.sizeGB) * 100) : 0;
  const isMBMode = device.sizeGB < 1.0;
  const totalDisplayVal = isMBMode ? Math.round(device.sizeBytes / (1024 * 1024)) : device.sizeGB;
  const totalDisplayUnit = isMBMode ? 'MB' : 'GB';

  const freeDisplayVal = isMBMode ? Math.round(device.freeSizeBytes / (1024 * 1024)) : device.freeSpaceGB;
  const freeDisplayUnit = isMBMode ? 'MB' : 'GB';

  const usedDisplayVal = isMBMode
    ? Math.round(Math.max(0, device.sizeBytes - device.freeSizeBytes) / (1024 * 1024))
    : device.usedSpaceGB;
  const usedDisplayUnit = isMBMode ? 'MB' : 'GB';

  return (
    <div className="rounded-2xl bg-[#0f141d] border border-[#1f2937] p-6 shadow-xl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-[#1f2937]">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#14231e] border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <HardDrive className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white">{device.modelName || 'Mio Cyclo Computer'}</h2>
              <Badge variant="emerald" dot>
                Mounted
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#94a3b8] mt-1">
              <span>Drive: <strong className="text-white font-mono">{device.deviceId}</strong></span>
              <span>•</span>
              <span>Volume: <strong className="text-emerald-400 font-mono">{device.volumeName}</strong></span>
              <span>•</span>
              <span>Type: Removable USB Mass Storage</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          <Button
            id="btn-open-tracks-folder"
            size="md"
            variant="secondary"
            onClick={() => onOpenTracksFolder(device.tracksPath)}
            leftIcon={<FolderOpen className="w-4 h-4 text-[#38bdf8]" />}
          >
            Open Tracks in Explorer
          </Button>
        </div>
      </div>

      {/* Storage Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        <div className="p-4 rounded-xl bg-[#141a24] border border-[#1e293b]">
          <span className="text-xs font-medium text-[#64748b]">Total Capacity</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-white">{totalDisplayVal}</span>
            <span className="text-xs text-[#94a3b8]">{totalDisplayUnit}</span>
          </div>
          <span className="text-[11px] text-[#475569] font-mono mt-1 block">
            {device.sizeBytes.toLocaleString()} bytes
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#141a24] border border-[#1e293b]">
          <span className="text-xs font-medium text-[#64748b]">Free Space Available</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-400">{freeDisplayVal}</span>
            <span className="text-xs text-emerald-400/80">{freeDisplayUnit} ({freePercentage}%)</span>
          </div>
          <span className="text-[11px] text-[#475569] font-mono mt-1 block">
            {device.freeSizeBytes.toLocaleString()} bytes
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#141a24] border border-[#1e293b]">
          <span className="text-xs font-medium text-[#64748b]">Used Storage</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#fc4c02]">{usedDisplayVal}</span>
            <span className="text-xs text-[#fc4c02]/80">{usedDisplayUnit} ({device.usedPercentage}%)</span>
          </div>
          <span className="text-[11px] text-[#475569] font-mono mt-1 block">
            Tracks, Maps & Profiles
          </span>
        </div>
      </div>

      {/* Storage Progress Meter */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-xs text-[#94a3b8]">
          <span>Disk Allocation Meter</span>
          <span className="font-mono">{device.usedPercentage}% Allocated</span>
        </div>
        <div className="w-full h-3 rounded-full bg-[#1e293b] overflow-hidden p-0.5 flex">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#fc4c02] to-[#ff7a00] transition-all duration-500 shadow-sm"
            style={{ width: `${Math.min(100, Math.max(5, device.usedPercentage))}%` }}
          />
        </div>
      </div>

      {/* Path Resolution Mapping Card */}
      <div className="p-4 rounded-xl bg-[#121722] border border-[#1e293b] space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Device Architecture & Path Resolution</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#0b0e14] border border-[#1a2233]">
            <span className="text-[#64748b] block mb-1">Route Uploads Destination:</span>
            <div className="flex items-center gap-1.5 font-mono text-emerald-400">
              <ArrowRight className="w-3.5 h-3.5 text-[#64748b]" />
              <span>{device.tracksPath}</span>
            </div>
            <span className="text-[11px] text-[#475569] mt-1 block">Komoot .gpx tours transferred here</span>
          </div>

          <div className="p-3 rounded-lg bg-[#0b0e14] border border-[#1a2233]">
            <span className="text-[#64748b] block mb-1">Recorded Ride History:</span>
            <div className="flex items-center gap-1.5 font-mono text-[#38bdf8]">
              <ArrowRight className="w-3.5 h-3.5 text-[#64748b]" />
              <span>{device.tracksPath}\Profile*</span>
            </div>
            <span className="text-[11px] text-[#475569] mt-1 block">Reads .fit & .gpx files across all profiles</span>
          </div>
        </div>
      </div>
    </div>
  );
};
