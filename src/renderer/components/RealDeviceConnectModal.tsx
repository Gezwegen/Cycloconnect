import React, { useRef, useState } from 'react';
import {
  Usb,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  X,
  ArrowRight,
  RefreshCw,
  FileCode,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { MioDevice, RideTrack } from '../../types/cycloconnect';

interface RealDeviceConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDrivePicker: () => Promise<void>;
  onFolderSelected: (files: FileList) => Promise<void>;
  device: MioDevice | null;
  tracks: RideTrack[];
  isLoading: boolean;
}

export const RealDeviceConnectModal: React.FC<RealDeviceConnectModalProps> = ({
  isOpen,
  onClose,
  onSelectDrivePicker,
  onFolderSelected,
  device,
  tracks,
  isLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDrivePickerClick = async () => {
    setErrorMsg(null);
    try {
      await onSelectDrivePicker();
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setErrorMsg(err.message || 'Failed to access selected drive.');
      } else if (!(err instanceof Error)) {
        setErrorMsg('Failed to access selected drive.');
      }
    }
  };

  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setErrorMsg(null);
      try {
        await onFolderSelected(e.target.files);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to read files from folder.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="max-w-xl w-full rounded-2xl bg-[#121417] border border-[#262c36] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#16191d] border-b border-[#23272e] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#00e599]/15 border border-[#00e599]/30 flex items-center justify-center text-[#00e599]">
              <Usb className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Plug In & Mount Mio Cyclo</h3>
              <p className="text-[11px] text-[#6b7280]">Direct USB mass-storage read & write bridge</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6b7280] hover:text-white hover:bg-[#23272e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-[#94a3b8]">
          {/* Step-by-Step Instructions Banner */}
          <div className="p-4 rounded-xl bg-[#0f1114] border border-[#1e232a] space-y-2">
            <span className="text-xs font-bold text-white block">How to connect:</span>
            <ol className="list-decimal list-inside space-y-1 text-[#cbd5e1] leading-relaxed">
              <li>Plug your Mio Cyclo into your PC with the USB cable.</li>
              <li>Wait for the device screen to show the USB connection icon.</li>
              <li>
                Click <strong className="text-white">"Select Mio USB Drive"</strong> below and choose your mounted{' '}
                <code className="bg-[#1c222c] text-[#00e599] px-1 py-0.5 rounded font-mono">Mio_data</code> drive (or{' '}
                <code className="bg-[#1c222c] text-[#00e599] px-1 py-0.5 rounded font-mono">\Dodge\Tracks</code> folder).
              </li>
            </ol>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Device Status */}
          {device?.isRealHardware ? (
            <div className="p-4 rounded-xl bg-[#0e221b] border border-[#00e599]/40 text-[#00e599] space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-bold text-white">Real Mio Cyclo Connected & Active!</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#cbd5e1] font-mono pt-1">
                <div>Volume: <strong className="text-white">{device.volumeName}</strong></div>
                <div>Drive: <strong className="text-white">{device.deviceId}</strong></div>
                <div>Path: <strong className="text-white">{device.tracksPath}</strong></div>
                <div>Tracks Found: <strong className="text-white">{tracks.length} Real Rides</strong></div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Option 1: Native Web File System Access (Full Read/Write) */}
              <button
                id="btn-select-mio-drive"
                onClick={handleDrivePickerClick}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#00e599] hover:bg-[#00c785] text-black font-bold text-xs tracking-wide transition-all shadow-lg shadow-[#00e599]/20 flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                <span>Select Mio USB Drive (Direct Read & Write)</span>
              </button>

              {/* Option 2: Folder Selection fallback */}
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  /* @ts-ignore */
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={handleFolderInputChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#16191d] hover:bg-[#1e232a] border border-[#282f3a] text-[#cbd5e1] hover:text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-4 h-4 text-[#94a3b8]" />
                  <span>Choose \Dodge\Tracks Folder (Directory Upload)</span>
                </button>
              </div>
            </div>
          )}

          {/* Security & FAT32 note */}
          <div className="flex items-center gap-2 text-[11px] text-[#6b7280]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00e599] shrink-0" />
            <span>
              Direct FAT32 communication. GPX routes downloaded from Komoot are written straight to your device.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#16191d] border-t border-[#23272e] flex items-center justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-[#202632] hover:bg-[#2b3342] text-white font-semibold text-xs transition-colors"
          >
            {device?.isRealHardware ? 'Done (View Real Tracks)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
