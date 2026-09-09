import { useCallback } from 'react';
import { useNotification } from './useNotification';
import { useMioDevice } from './useMioDevice';
import { useRideTracks } from './useRideTracks';
import { useStravaSync } from './useStravaSync';
import { useKomootTours } from './useKomootTours';
import { pickAndMountMioDevice, parseUploadedMioDirectory } from '../../utils/webUsbFileSystem';

/**
 * CycloConnect Unified Application Hook
 * Composes domain-specific hooks (Device, Tracks, Strava, Komoot, Notifications)
 * with strict typing and separation of concerns.
 */
export function useElectronIPC() {
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);

  // 1. Toast Notification System
  const { activeNotification, showToast, dismissToast } = useNotification();

  // 2. Hardware Device Management
  const { device, deviceState, isLoading: isDeviceLoading, rescanDevice, openFolder, setDevice } = useMioDevice({
    isElectron,
    showToast,
  });

  // 3. Ride Recordings & Tracks
  const {
    tracks,
    filteredTracks,
    selectedTrackId,
    setSelectedTrackId,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortOption,
    setSortOption,
    isLoadingTracks,
    pendingCount,
    syncedCount,
    loadTrackRouteGpx,
    addCustomRideFile,
    setTracks,
  } = useRideTracks({
    device,
    isElectron,
    showToast,
  });

  // 4. Strava Synchronization
  const {
    stravaStatus,
    stravaAuthState,
    syncState,
    syncProgress,
    connectStrava,
    disconnectStrava,
    uploadTrackToStrava,
    syncAllToStrava,
  } = useStravaSync({
    device,
    tracks,
    setTracks,
    isElectron,
    showToast,
  });

  // 5. Komoot Planned Tours
  const {
    komootStatus,
    komootAuthState,
    komootTours,
    isLoadingTours,
    loginKomoot,
    logoutKomoot,
    loadTourRouteGpx,
    transferKomootTourToDevice,
  } = useKomootTours({
    device,
    isElectron,
    showToast,
  });

  const isLoading = isDeviceLoading || isLoadingTracks || isLoadingTours;

  const mountRealDeviceUsingPicker = useCallback(async () => {
    try {
      const session = await pickAndMountMioDevice();
      setDevice(session.device);
      setTracks(session.tracks);
      showToast(`Mounted ${session.device.volumeName} (${session.tracks.length} rides found)`, 'success');
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        showToast(err.message, 'error');
      }
    }
  }, [setDevice, setTracks, showToast]);

  const mountRealDeviceUsingFolder = useCallback(async (files: FileList) => {
    try {
      const parsed = await parseUploadedMioDirectory(files);
      setDevice(parsed.device);
      setTracks(parsed.tracks);
      showToast(`Mounted ${parsed.device.volumeName} (${parsed.tracks.length} rides found)`, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error mounting directory', 'error');
    }
  }, [setDevice, setTracks, showToast]);

  return {
    isElectron,
    isLoading,
    activeNotification,
    showToast,
    dismissToast,

    // Device
    device,
    deviceState,
    rescanDevice,
    openFolder,
    mountRealDeviceUsingPicker,
    mountRealDeviceUsingFolder,

    // Tracks
    tracks,
    filteredTracks,
    selectedTrackId,
    setSelectedTrackId,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortOption,
    setSortOption,
    pendingCount,
    syncedCount,
    loadTrackRouteGpx,
    addCustomRideFile,

    // Strava
    stravaStatus,
    stravaAuthState,
    syncState,
    syncProgress,
    connectStrava,
    disconnectStrava,
    uploadTrackToStrava,
    syncAllToStrava,

    // Komoot
    komootStatus,
    komootAuthState,
    komootTours,
    loginKomoot,
    logoutKomoot,
    loadTourRouteGpx,
    transferKomootTourToDevice,
  };
}

export type CycloConnectHook = ReturnType<typeof useElectronIPC>;
