import React from 'react';
import { RefreshCw, CheckCircle2, ArrowUpRight, Zap, AlertCircle } from 'lucide-react';
import { SyncProgress, StravaAuthStatus } from '../../types/cycloconnect';

interface SyncButtonProps {
  pendingCount: number;
  totalRides: number;
  isSyncing: boolean;
  syncProgress: SyncProgress;
  stravaStatus: StravaAuthStatus;
  onSyncAll: () => void;
  onConnectStrava: () => void;
}

export const SyncButton: React.FC<SyncButtonProps> = ({
  pendingCount,
  totalRides,
  isSyncing,
  syncProgress,
  stravaStatus,
  onSyncAll,
  onConnectStrava,
}) => {
  if (!stravaStatus.isAuthenticated) {
    return (
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#171b26] to-[#121620] border border-[#fc4c02]/30 shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#fc4c02]/10 border border-[#fc4c02]/30 flex items-center justify-center text-[#fc4c02] shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Connect Strava to Enable Auto-Sync</h3>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                CycloConnect will automatically detect new .fit ride activities and upload them to your Strava profile.
              </p>
            </div>
          </div>

          <button
            id="btn-hero-connect-strava"
            onClick={onConnectStrava}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#fc4c02] hover:bg-[#e04000] text-white font-semibold text-xs tracking-wide transition-all shadow-md shadow-[#fc4c02]/20 shrink-0"
          >
            <span>Authorize Strava</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-[#0f141d] border border-[#1f2937] shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#fc4c02]">Strava Cloud Sync</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            {pendingCount > 0
              ? `${pendingCount} New ${pendingCount === 1 ? 'Ride' : 'Rides'} Ready for Strava`
              : 'All Mio Rides Synchronized'}
          </h3>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            {pendingCount > 0
              ? `Sync pending .fit recorded rides directly to athlete ${stravaStatus.athlete?.firstname || 'Strava'}`
              : `Total of ${totalRides} ride activities archived on Mio device`}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {pendingCount > 0 ? (
            <button
              id="btn-hero-sync-all"
              onClick={onSyncAll}
              disabled={isSyncing}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-[#fc4c02] to-[#ff5d1a] hover:from-[#e04000] hover:to-[#e84f11] text-white font-semibold text-sm tracking-wide transition-all shadow-lg shadow-[#fc4c02]/25 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing Rides...' : `Sync ${pendingCount} ${pendingCount === 1 ? 'Ride' : 'Rides'} Now`}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#13241b] border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Up to Date</span>
            </div>
          )}
        </div>
      </div>

      {/* Real-time sync progress bar */}
      {isSyncing && (
        <div className="mt-5 pt-5 border-t border-[#1f2937] space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#38bdf8] flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{syncProgress.step}</span>
            </span>
            <span className="text-[#94a3b8]">{syncProgress.progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#1e293b] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#fc4c02] transition-all duration-300"
              style={{ width: `${syncProgress.progressPercent}%` }}
            />
          </div>
          {syncProgress.currentItem && (
            <span className="text-[11px] text-[#64748b] font-mono block truncate">
              File: {syncProgress.currentItem}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
