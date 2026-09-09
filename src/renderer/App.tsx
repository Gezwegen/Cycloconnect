import React, { useState } from 'react';
import { useElectronIPC } from './hooks/useElectronIPC';
import { SidebarRail } from './components/SidebarRail';
import { TopNav } from './components/TopNav';
import { TacticalMap } from './components/TacticalMap';
import { Dashboard } from './components/Dashboard';
import { RideHistory } from './components/RideHistory';
import { KomootTours } from './components/KomootTours';
import { DeviceStatus } from './components/DeviceStatus';
import { SettingsView } from './components/SettingsView';
import { RealDeviceConnectModal } from './components/RealDeviceConnectModal';
import { CheckCircle2, AlertCircle, Info, Usb } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'route' | 'rides' | 'komoot' | 'device' | 'settings'
  >('route'); // Default to Tactical Route & Map matching user's inspiration

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const {
    isElectron,
    isLoading,
    device,
    tracks,
    komootTours,
    stravaStatus,
    komootStatus,
    syncProgress,
    activeNotification,
    selectedTrackId,
    setSelectedTrackId,
    mountRealDeviceUsingPicker,
    mountRealDeviceUsingFolder,
    rescanDevice,
    uploadTrackToStrava,
    syncAllToStrava,
    connectStrava,
    disconnectStrava,
    loginKomoot,
    logoutKomoot,
    transferKomootTourToDevice,
    openFolder,
    addCustomRideFile,
    loadTourRouteGpx,
    loadTrackRouteGpx,
  } = useElectronIPC();

  const pendingCount = tracks.filter((t) => t.extension === 'fit' && !t.stravaUploaded).length;

  return (
    <div className="min-h-screen h-screen bg-[#080a0f] text-[#e2e8f0] flex overflow-hidden font-sans selection:bg-[#00e599]/30 selection:text-white">
      {/* Sleek Vertical Icon Sidebar Rail matching image.png */}
      <SidebarRail
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isRealHardware={device?.isRealHardware}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0c0e12]">
        {/* Top Breadcrumb Bar matching image.png */}
        <TopNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          device={device}
          stravaStatus={stravaStatus}
          komootStatus={komootStatus}
          pendingCount={pendingCount}
          onConnectRealDevice={() => setIsConnectModalOpen(true)}
          isLoading={isLoading}
        />

        {/* Dynamic Viewport Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          {/* Tactical Route & Map View (Matching User Inspiration Image Exactly) */}
          {activeTab === 'route' && (
            <TacticalMap
              tracks={tracks}
              komootTours={komootTours}
              device={device}
              selectedTrackId={selectedTrackId}
              onSelectTrack={(id) => setSelectedTrackId(id)}
              onUploadToStrava={(id) => uploadTrackToStrava(id)}
              onDownloadToMio={(tourId, tourName) => transferKomootTourToDevice(tourId, tourName)}
              onConnectRealDevice={() => setIsConnectModalOpen(true)}
              onLoadKomootRoute={loadTourRouteGpx}
              onLoadTrackRoute={loadTrackRouteGpx}
            />
          )}

          {/* Overview Dashboard */}
          {activeTab === 'dashboard' && (
            <Dashboard
              device={device}
              tracks={tracks}
              komootTours={komootTours}
              stravaStatus={stravaStatus}
              komootStatus={komootStatus}
              syncProgress={syncProgress}
              onOpenTracksFolder={openFolder}
              onRescan={rescanDevice}
              onSyncAll={syncAllToStrava}
              onConnectStrava={connectStrava}
              onUploadTrack={uploadTrackToStrava}
              onDownloadTour={transferKomootTourToDevice}
              setActiveTab={setActiveTab}
              isLoading={isLoading}
            />
          )}

          {/* Ride Recordings & Uploads */}
          {activeTab === 'rides' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Mio Cyclo Ride Recordings</h1>
                    {device?.isRealHardware && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#00e599]/15 border border-[#00e599]/30 text-[#00e599] text-[10px] font-bold uppercase tracking-wider">
                        Real USB Live
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#94a3b8] mt-1">
                    Direct sync from {device?.tracksPath || 'E:\\Dodge\\Tracks'} across Profile directories
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsConnectModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#161a22] hover:bg-[#212836] border border-[#2a3547] text-white font-semibold text-xs transition-all"
                  >
                    <Usb className="w-3.5 h-3.5 text-[#00e599]" />
                    <span>{device?.isRealHardware ? 'Rescan Real USB' : 'Plug in Real Mio'}</span>
                  </button>

                  {pendingCount > 0 && stravaStatus.isAuthenticated && (
                    <button
                      id="btn-sync-all-header"
                      onClick={syncAllToStrava}
                      disabled={syncProgress.inProgress}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00e599] hover:bg-[#00c785] text-black font-bold text-xs transition-all shadow-md shadow-[#00e599]/20 disabled:opacity-50"
                    >
                      <span>Sync All {pendingCount} Pending Rides</span>
                    </button>
                  )}
                </div>
              </div>

              <RideHistory
                tracks={tracks}
                stravaStatus={stravaStatus}
                onUploadTrack={uploadTrackToStrava}
                onOpenFolder={openFolder}
                onAddCustomFile={addCustomRideFile}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Komoot Tours */}
          {activeTab === 'komoot' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Komoot Route Manager</h1>
                <p className="text-xs text-[#94a3b8] mt-1">
                  Transfer planned cycling routes directly to your Mio Cyclo computer as GPX files in {'\\Dodge\\Tracks'}
                </p>
              </div>

              <KomootTours
                tours={komootTours}
                komootStatus={komootStatus}
                device={device}
                onDownloadTour={transferKomootTourToDevice}
                onLogin={loginKomoot}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Mio Device Storage */}
          {activeTab === 'device' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Storage & Hardware Details</h1>
                  <p className="text-xs text-[#94a3b8] mt-1">
                    USB mass storage file system allocation, volume inspection, and partition health
                  </p>
                </div>
                <button
                  onClick={() => setIsConnectModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#00e599] hover:bg-[#00c785] text-black font-bold text-xs transition-all shadow-md shadow-[#00e599]/20"
                >
                  Plug in Real Mio Cyclo
                </button>
              </div>

              <DeviceStatus
                device={device}
                onOpenTracksFolder={openFolder}
                onRescan={rescanDevice}
                isLoading={isLoading}
              />
            </div>
          )}

          {/* Settings & Accounts */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Accounts & System Configuration</h1>
                <p className="text-xs text-[#94a3b8] mt-1">
                  Manage Strava OAuth2 credentials, Komoot session tokens, and USB parsing parameters
                </p>
              </div>

              <SettingsView
                stravaStatus={stravaStatus}
                komootStatus={komootStatus}
                device={device}
                onConnectStrava={connectStrava}
                onDisconnectStrava={disconnectStrava}
                onLoginKomoot={loginKomoot}
                onLogoutKomoot={logoutKomoot}
                onRescanDevice={rescanDevice}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Real Hardware Connect Modal */}
      <RealDeviceConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSelectDrivePicker={async () => {
          await mountRealDeviceUsingPicker();
          setIsConnectModalOpen(false);
        }}
        onFolderSelected={async (files) => {
          await mountRealDeviceUsingFolder(files);
          setIsConnectModalOpen(false);
        }}
        device={device}
        tracks={tracks}
        isLoading={isLoading}
      />

      {/* Toast Notification Banner */}
      {activeNotification && (
        <div className="fixed bottom-6 right-6 z-[99999] animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold ${
              activeNotification.type === 'success'
                ? 'bg-[#0e221b]/95 border-[#00e599]/40 text-[#00e599]'
                : activeNotification.type === 'error'
                ? 'bg-[#261314]/95 border-red-500/40 text-red-300'
                : 'bg-[#141b27]/95 border-[#38bdf8]/40 text-[#38bdf8]'
            }`}
          >
            {activeNotification.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {activeNotification.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {activeNotification.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
            <span>{activeNotification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
