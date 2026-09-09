import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronRight,
  Bell,
  Usb,
  CheckCircle2,
  HardDrive,
  X,
} from 'lucide-react';
import { MioDevice, StravaAuthStatus, KomootAuthStatus } from '../../types/cycloconnect';

interface TopNavProps {
  activeTab: string;
  setActiveTab: (tab: 'dashboard' | 'route' | 'rides' | 'komoot' | 'device' | 'settings') => void;
  device: MioDevice | null;
  stravaStatus: StravaAuthStatus;
  komootStatus?: KomootAuthStatus;
  pendingCount?: number;
  onConnectRealDevice: () => void;
  isLoading: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  device,
  stravaStatus,
  komootStatus,
  pendingCount = 0,
  onConnectRealDevice,
  isLoading,
}) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    if (isNotificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  // Breadcrumb generation based on active tab
  const getBreadcrumbs = () => {
    switch (activeTab) {
      case 'route':
        return [
          { label: 'Dashboard', id: 'dashboard' as const },
          { label: 'Tactical Route & Map', id: 'route' as const },
        ];
      case 'rides':
        return [
          { label: 'Dashboard', id: 'dashboard' as const },
          { label: 'Ride Recordings', id: 'rides' as const },
        ];
      case 'komoot':
        return [
          { label: 'Dashboard', id: 'dashboard' as const },
          { label: 'Komoot Route Manager', id: 'komoot' as const },
        ];
      case 'device':
        return [
          { label: 'Dashboard', id: 'dashboard' as const },
          { label: 'Mio Storage & USB', id: 'device' as const },
        ];
      case 'settings':
        return [
          { label: 'Dashboard', id: 'dashboard' as const },
          { label: 'Accounts & Settings', id: 'settings' as const },
        ];
      default:
        return [
          { label: 'Dashboard', id: 'dashboard' as const },
          { label: 'Overview', id: 'dashboard' as const },
        ];
    }
  };

  const breadcrumbs = getBreadcrumbs();

  const athleteName = stravaStatus.isAuthenticated
    ? `${stravaStatus.athlete?.firstname || 'Athlete'} ${stravaStatus.athlete?.lastname || ''}`.trim()
    : 'Mio Cyclist';

  const athleteRole = stravaStatus.isAuthenticated
    ? (stravaStatus.athlete?.username ? `@${stravaStatus.athlete.username}` : 'Strava Connected')
    : 'Connect in Settings';

  return (
    <header className="h-16 px-6 bg-[#0f1114] border-b border-[#1e232a] flex items-center justify-between shrink-0 select-none relative z-40">
      {/* Interactive Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-semibold">
        {breadcrumbs.map((bc, idx) => {
          const isLast = idx === breadcrumbs.length - 1;

          return (
            <React.Fragment key={bc.label}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#4b5563]" />}
              <button
                type="button"
                onClick={() => setActiveTab(bc.id)}
                className={`transition-colors text-left ${
                  isLast
                    ? 'text-white font-bold tracking-wide cursor-default'
                    : 'text-[#6b7280] hover:text-[#00e599] cursor-pointer'
                }`}
              >
                {bc.label}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Right Controls: Real Hardware Status + Notifications + Profile Chip */}
      <div className="flex items-center gap-4">
        {/* Real Hardware Connect / Status Button */}
        {device?.connected ? (
          <button
            onClick={onConnectRealDevice}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#00e599]/10 border border-[#00e599]/30 text-[#00e599] text-xs font-semibold hover:bg-[#00e599]/20 transition-all shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-[#00e599] animate-pulse" />
            <Usb className="w-3.5 h-3.5" />
            <span className="font-mono">{device.modelName || 'Mio Cyclo'} ({device.deviceId})</span>
          </button>
        ) : (
          <button
            onClick={onConnectRealDevice}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#161a22] hover:bg-[#202836] border border-[#2a3547] text-[#cbd5e1] hover:text-white text-xs font-semibold transition-all shadow-sm"
          >
            <Usb className="w-3.5 h-3.5 text-[#00e599]" />
            <span>{isLoading ? 'Scanning USB...' : 'Plug in Mio Cyclo'}</span>
          </button>
        )}

        {/* Notification Bell Popover Button */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all relative ${
              isNotificationsOpen
                ? 'bg-[#1a2333] border-[#00e599] text-[#00e599]'
                : 'bg-[#16191d] border-[#23272e] text-[#94a3b8] hover:text-white hover:border-[#384252]'
            }`}
            title="System & Sync Notifications"
          >
            <Bell className="w-4 h-4" />
            {(device?.connected || pendingCount > 0) && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#00e599]" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-12 w-80 p-4 rounded-2xl bg-[#16191d]/98 backdrop-blur-xl border border-[#2a313d] shadow-2xl text-xs space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#23272e] pb-2">
                <span className="font-bold text-white">System Status & Activity</span>
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="p-1 rounded-lg text-[#64748b] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {/* USB Device Status */}
                <div
                  onClick={() => {
                    setActiveTab('device');
                    setIsNotificationsOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-[#0f1114] border border-[#23272e] hover:border-[#00e599]/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                      Mio USB Storage
                    </span>
                    <span className={`text-[10px] font-bold ${device?.connected ? 'text-emerald-400' : 'text-[#64748b]'}`}>
                      {device?.connected ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94a3b8]">
                    {device?.connected
                      ? `${device.modelName || 'Mio Cyclo'} mounted on ${device.deviceId} (${device.volumeName})`
                      : 'Connect your device with a USB data cable and select "Connect to PC"'}
                  </p>
                </div>

                {/* Strava Status */}
                <div
                  onClick={() => {
                    setActiveTab('settings');
                    setIsNotificationsOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-[#0f1114] border border-[#23272e] hover:border-[#fc4c02]/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#fc4c02]" />
                      Strava Uploads
                    </span>
                    <span className={`text-[10px] font-bold ${stravaStatus.isAuthenticated ? 'text-emerald-400' : 'text-[#64748b]'}`}>
                      {stravaStatus.isAuthenticated ? 'READY' : 'NOT LINKED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94a3b8]">
                    {stravaStatus.isAuthenticated
                      ? `Signed in as ${athleteName}. ${pendingCount} ride(s) ready to upload.`
                      : 'Click to authorize Strava account in Settings.'}
                  </p>
                </div>
              </div>

              <div className="pt-1 text-center">
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setIsNotificationsOpen(false);
                  }}
                  className="text-[11px] text-[#00e599] hover:underline font-semibold"
                >
                  Manage All Accounts & Settings &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Chip with Navigation to Settings */}
        <button
          onClick={() => setActiveTab('settings')}
          title="Go to Settings & Accounts"
          className="flex items-center gap-3 pl-2 group text-left cursor-pointer rounded-xl p-1 hover:bg-[#161a22] transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-[#1c222c] border border-[#2c3545] group-hover:border-[#00e599] flex items-center justify-center text-xs font-bold text-white uppercase overflow-hidden shadow-md transition-colors">
            {stravaStatus.isAuthenticated && stravaStatus.athlete?.profile ? (
              <img
                src={stravaStatus.athlete.profile}
                alt="Profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{athleteName.charAt(0)}</span>
            )}
          </div>

          <div className="hidden sm:block">
            <span className="text-xs font-bold text-white group-hover:text-[#00e599] transition-colors block leading-tight">
              {athleteName}
            </span>
            <span className="text-[10px] text-[#6b7280] block font-mono">
              {athleteRole}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};
