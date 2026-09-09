import React from 'react';
import {
  Zap,
  HardDrive,
  Compass,
  History,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  Clock,
  Bike,
  ShieldCheck,
} from 'lucide-react';
import { DeviceStatus } from './DeviceStatus';
import { SyncButton } from './SyncButton';
import { MetricCardSkeleton } from './common/SkeletonLoader';
import { Badge } from './common/Badge';
import { Button } from './common/Button';
import {
  MioDevice,
  RideTrack,
  KomootTour,
  StravaAuthStatus,
  KomootAuthStatus,
  SyncProgress,
} from '../../types/cycloconnect';

interface DashboardProps {
  device: MioDevice | null;
  tracks: RideTrack[];
  komootTours: KomootTour[];
  stravaStatus: StravaAuthStatus;
  komootStatus: KomootAuthStatus;
  syncProgress: SyncProgress;
  onOpenTracksFolder: (path: string) => void;
  onRescan: () => void;
  onSyncAll: () => void;
  onConnectStrava: () => void;
  onUploadTrack: (trackId: string) => void;
  onDownloadTour: (tourId: string | number, tourName: string) => void;
  setActiveTab: (tab: 'dashboard' | 'route' | 'rides' | 'komoot' | 'device' | 'settings') => void;
  isLoading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  device,
  tracks,
  komootTours,
  stravaStatus,
  komootStatus,
  syncProgress,
  onOpenTracksFolder,
  onRescan,
  onSyncAll,
  onConnectStrava,
  onUploadTrack,
  onDownloadTour,
  setActiveTab,
  isLoading,
}) => {
  const pendingTracks = tracks.filter((t) => t.extension === 'fit' && !t.stravaUploaded);
  const syncedTracks = tracks.filter((t) => t.extension === 'fit' && t.stravaUploaded);

  const isJoggingOrRunning = (sport?: string) => {
    if (!sport) return false;
    const s = sport.toLowerCase().trim();
    return s === 'jogging' || s === 'running' || s === 'trailrunning' || s === 'run' || s.includes('jog') || s.includes('running');
  };
  const cyclingTours = komootTours.filter((t) => !isJoggingOrRunning(t.sport));

  return (
    <div className="space-y-6">
      {/* Top Athletic Metrics Row */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Device Hardware Card */}
          <div
            onClick={() => setActiveTab('device')}
            className="p-4 rounded-2xl bg-[#0f141d] border border-[#1f2937] hover:border-[#334155] transition-all cursor-pointer group shadow-md"
          >
          <div className="flex items-center justify-between text-[#64748b] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Mio USB Device</span>
            <HardDrive className="w-4 h-4 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {device?.connected ? `${device.deviceId} (${device.volumeName})` : 'Disconnected'}
          </div>
          <span className="text-xs text-[#94a3b8] mt-1 block">
            {device?.connected
              ? device.sizeGB < 1.0
                ? `${Math.round(device.freeSizeBytes / (1024 * 1024))} MB Free / ${Math.round(device.sizeBytes / (1024 * 1024))} MB`
                : `${device.freeSpaceGB} GB Free / ${device.sizeGB} GB`
              : 'Plug in via USB'}
          </span>
        </div>

        {/* Pending Rides Card */}
        <div
          onClick={() => setActiveTab('rides')}
          className="p-4 rounded-2xl bg-[#0f141d] border border-[#1f2937] hover:border-[#fc4c02]/50 transition-all cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between text-[#64748b] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Unsynced Rides</span>
            <History className="w-4 h-4 group-hover:text-[#fc4c02] transition-colors" />
          </div>
          <div className="text-xl font-bold font-mono text-[#fc4c02]">
            {pendingTracks.length} {pendingTracks.length === 1 ? 'Ride' : 'Rides'}
          </div>
          <span className="text-xs text-[#94a3b8] mt-1 block">
            {syncedTracks.length} already uploaded to Strava
          </span>
        </div>

        {/* Strava Athlete Card */}
        <div
          onClick={() => setActiveTab('settings')}
          className="p-4 rounded-2xl bg-[#0f141d] border border-[#1f2937] hover:border-[#fc4c02]/50 transition-all cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between text-[#64748b] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Strava Account</span>
            <Zap className="w-4 h-4 group-hover:text-[#fc4c02] transition-colors" />
          </div>
          <div className="text-xl font-bold text-white truncate">
            {stravaStatus.isAuthenticated
              ? `${stravaStatus.athlete?.firstname || 'Athlete'} ${stravaStatus.athlete?.lastname || ''}`
              : 'Not Connected'}
          </div>
          <span className="text-xs text-[#94a3b8] mt-1 block">
            {stravaStatus.isAuthenticated ? 'OAuth token secure (safeStorage)' : 'Click to authorize'}
          </span>
        </div>

        {/* Komoot Tours Card */}
        <div
          onClick={() => setActiveTab('komoot')}
          className="p-4 rounded-2xl bg-[#0f141d] border border-[#1f2937] hover:border-emerald-500/50 transition-all cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between text-[#64748b] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Komoot Tours</span>
            <Compass className="w-4 h-4 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {komootStatus.isAuthenticated ? `${cyclingTours.length} Planned` : 'Not Signed In'}
          </div>
          <span className="text-xs text-[#94a3b8] mt-1 block">
            Ready for Mio \Dodge\Tracks
          </span>
        </div>
      </div>
    )}

      {/* Sync Hero Action */}
      <SyncButton
        pendingCount={pendingTracks.length}
        totalRides={tracks.length}
        isSyncing={syncProgress.inProgress}
        syncProgress={syncProgress}
        stravaStatus={stravaStatus}
        onSyncAll={onSyncAll}
        onConnectStrava={onConnectStrava}
      />

      {/* Device Overview Card */}
      <DeviceStatus
        device={device}
        onOpenTracksFolder={onOpenTracksFolder}
        onRescan={onRescan}
        isLoading={isLoading}
      />

      {/* Two Column Grid: Pending Rides & Komoot Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Unsynced Rides */}
        <div className="p-6 rounded-2xl bg-[#0f141d] border border-[#1f2937] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#fc4c02]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Pending Mio Activities
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('rides')}
                className="text-xs text-[#94a3b8] hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>View All ({tracks.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {pendingTracks.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748b]">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50 mb-2" />
                <span>All recorded rides on your Mio Cyclo are synced with Strava!</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingTracks.slice(0, 3).map((trk) => (
                  <div
                    key={trk.id}
                    className="p-3 rounded-xl bg-[#141a24] border border-[#1e293b] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#fc4c02]/10 border border-[#fc4c02]/30 flex items-center justify-center font-mono font-bold text-[10px] text-[#fc4c02]">
                        .{trk.extension}
                      </div>
                      <div>
                        <span className="font-semibold text-white block font-mono">{trk.fileName}</span>
                        <span className="text-[10px] text-[#64748b]">
                          {trk.profile} • {trk.fileSizeFormatted}
                        </span>
                      </div>
                    </div>

                    {trk.extension === 'fit' ? (
                      <Button
                        size="sm"
                        variant="strava"
                        onClick={() => onUploadTrack(trk.id)}
                        leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                      >
                        Sync
                      </Button>
                    ) : (
                      <Badge variant="amber">Route (.GPX)</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Komoot Quick Routes */}
        <div className="p-6 rounded-2xl bg-[#0f141d] border border-[#1f2937] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Komoot Planned Tours
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('komoot')}
                className="text-xs text-[#94a3b8] hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>Browse All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {cyclingTours.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748b]">
                <Compass className="w-8 h-8 mx-auto text-[#475569] mb-2" />
                <span>No planned routes loaded. Connect Komoot in Accounts tab.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cyclingTours.slice(0, 3).map((tour) => (
                  <div
                    key={tour.id}
                    className="p-3 rounded-xl bg-[#141a24] border border-[#1e293b] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Bike className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-semibold text-white block truncate max-w-[200px]">
                          {tour.name}
                        </span>
                        <span className="text-[10px] text-[#64748b]">
                          {tour.distanceKm} km • +{tour.elevation_up}m elev
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={tour.downloadedToDevice ? 'secondary' : 'primary'}
                      onClick={() => onDownloadTour(tour.id, tour.name)}
                      disabled={!device}
                    >
                      {tour.downloadedToDevice ? 'Transferred' : 'Send to Mio'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
