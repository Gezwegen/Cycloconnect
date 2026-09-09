import { useState, useEffect, useCallback } from 'react';
import { StravaAuthStatus, StravaAuthState, SyncState, SyncProgress, RideTrack, MioDevice } from '../../types';
import { NotificationType } from './useNotification';

interface UseStravaSyncProps {
  device: MioDevice | null;
  tracks: RideTrack[];
  setTracks: React.Dispatch<React.SetStateAction<RideTrack[]>>;
  isElectron: boolean;
  showToast: (message: string, type?: NotificationType) => void;
}

export function useStravaSync({ device, tracks, setTracks, isElectron, showToast }: UseStravaSyncProps) {
  const [stravaStatus, setStravaStatus] = useState<StravaAuthStatus>({ isAuthenticated: false });
  const [stravaAuthState, setStravaAuthState] = useState<StravaAuthState>({ status: 'unauthenticated' });
  const [syncState, setSyncState] = useState<SyncState>({ status: 'idle' });
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    inProgress: false,
    step: 'Idle',
    progressPercent: 0,
  });

  // Initial load & sync progress event subscription
  useEffect(() => {
    let unmountSyncEvent: (() => void) | undefined;

    async function initStrava() {
      // Clean up any legacy or simulated plaintext credentials from storage
      localStorage.removeItem('cycloconnect_mock_strava');

      if (isElectron && window.electronAPI) {
        try {
          const status = await window.electronAPI.getStravaStatus();
          setStravaStatus(status);
          setStravaAuthState(
            status.isAuthenticated && status.athlete
              ? { status: 'authenticated', athlete: status.athlete, expiresAt: status.expiresAt }
              : { status: 'unauthenticated' }
          );

          unmountSyncEvent = window.electronAPI.onSyncProgress((progress) => {
            setSyncProgress(progress);
            if (progress.inProgress) {
              setSyncState({
                status: 'syncing',
                currentItem: progress.currentItem || 'Activity',
                completedCount: progress.completedItems || 0,
                totalCount: progress.totalItems || 1,
                progressPercent: progress.progressPercent,
                stepDescription: progress.step,
              });
            } else {
              setSyncState({
                status: 'completed',
                totalCount: progress.totalItems || 0,
                successCount: progress.completedItems || 0,
                failCount: (progress.totalItems || 0) - (progress.completedItems || 0),
              });
            }
          });
        } catch (err) {
          setStravaAuthState({ status: 'error', message: (err as Error).message });
        }
      } else {
        setStravaStatus({ isAuthenticated: false });
        setStravaAuthState({ status: 'unauthenticated' });
      }
    }

    initStrava();

    return () => {
      if (unmountSyncEvent) unmountSyncEvent();
    };
  }, [isElectron]);

  // Connect Strava OAuth flow
  const connectStrava = useCallback(async () => {
    if (isElectron && window.electronAPI) {
      setStravaAuthState({ status: 'authenticating' });
      try {
        const res = await window.electronAPI.stravaLogin();
        setStravaStatus(res);
        if (res.isAuthenticated && res.athlete) {
          setStravaAuthState({ status: 'authenticated', athlete: res.athlete, expiresAt: res.expiresAt });
          showToast(`Connected to Strava as ${res.athlete.firstname} ${res.athlete.lastname}`, 'success');
        } else {
          setStravaAuthState({ status: 'unauthenticated' });
        }
      } catch (err) {
        const errMsg = (err as Error).message;
        setStravaAuthState({ status: 'error', message: errMsg });
        showToast(`Strava connection failed: ${errMsg}`, 'error');
      }
    } else {
      showToast('Strava OAuth integration is available in the CycloConnect desktop application.', 'info');
    }
  }, [isElectron, showToast]);

  // Disconnect Strava
  const disconnectStrava = useCallback(async () => {
    if (isElectron && window.electronAPI) {
      await window.electronAPI.stravaDisconnect();
    }
    localStorage.removeItem('cycloconnect_mock_strava');
    setStravaStatus({ isAuthenticated: false });
    setStravaAuthState({ status: 'unauthenticated' });
    showToast('Strava account disconnected', 'info');
  }, [isElectron, showToast]);

  // Upload single ride (.fit only)
  const uploadTrackToStrava = useCallback(
    async (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;

      if (track.extension !== 'fit') {
        showToast(`Cannot upload "${track.fileName}": unridden GPX routes cannot be exported to Strava.`, 'error');
        return;
      }

      if (!stravaStatus.isAuthenticated) {
        showToast('Please authenticate with your Strava account in Settings first.', 'error');
        return;
      }

      setTracks((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, uploadStatus: 'uploading', uploadError: undefined } : t))
      );

      if (isElectron && window.electronAPI) {
        try {
          const res = await window.electronAPI.uploadRideToStrava(track.filePath, track.fileName);
          if (res.uploadId) {
            const finalStatus = await window.electronAPI.pollStravaUploadStatus(res.uploadId);
            if (finalStatus.status === 'ready' || finalStatus.activityId) {
              setTracks((prev) =>
                prev.map((t) =>
                  t.id === trackId
                    ? {
                        ...t,
                        uploadStatus: 'synced',
                        stravaUploaded: true,
                        stravaUploadId: res.uploadId,
                        stravaActivityId: finalStatus.activityId,
                      }
                    : t
                )
              );
              showToast(`Activity successfully uploaded to Strava!`, 'success');
              return;
            }
          }

          setTracks((prev) =>
            prev.map((t) =>
              t.id === trackId ? { ...t, uploadStatus: 'synced', stravaUploaded: true, stravaUploadId: res.uploadId } : t
            )
          );
          showToast(`Uploaded ${track.fileName} to Strava queue.`, 'success');
        } catch (err) {
          const errMsg = (err as Error).message;
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, uploadStatus: 'error', uploadError: errMsg } : t))
          );
          showToast(`Upload failed: ${errMsg}`, 'error');
        }
      } else {
        showToast('Direct Strava uploads require the CycloConnect desktop application.', 'info');
        setTracks((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, uploadStatus: 'idle' } : t))
        );
      }
    },
    [tracks, stravaStatus, isElectron, setTracks, showToast]
  );

  // Batch sync all unsynced .fit activities
  const syncAllToStrava = useCallback(async () => {
    const unsynced = tracks.filter((t) => t.extension === 'fit' && !t.stravaUploaded);

    if (unsynced.length === 0) {
      showToast('All recorded activities are already synchronized with Strava!', 'info');
      return;
    }

    if (!stravaStatus.isAuthenticated) {
      showToast('Please log into your Strava account in Settings before syncing.', 'error');
      return;
    }

    if (isElectron && window.electronAPI) {
      try {
        setSyncState({
          status: 'syncing',
          currentItem: unsynced[0].fileName,
          completedCount: 0,
          totalCount: unsynced.length,
          progressPercent: 0,
          stepDescription: 'Preparing batch sync...',
        });

        const result = await window.electronAPI.syncAllNewRidesToStrava();
        showToast(`Sync completed: ${result.successful} uploaded, ${result.failed} failed.`, 'success');

        if (device?.tracksPath) {
          const fresh = await window.electronAPI.getRideHistory(device.tracksPath);
          setTracks(fresh);
        }

        setSyncState({
          status: 'completed',
          totalCount: result.total,
          successCount: result.successful,
          failCount: result.failed,
        });
      } catch (err) {
        const errMsg = (err as Error).message;
        setSyncState({ status: 'error', message: errMsg });
        showToast(`Sync failed: ${errMsg}`, 'error');
      }
    } else {
      showToast('Batch activity sync requires the CycloConnect desktop application.', 'info');
    }
  }, [tracks, stravaStatus, device, isElectron, setTracks, showToast]);

  return {
    stravaStatus,
    stravaAuthState,
    syncState,
    syncProgress,
    connectStrava,
    disconnectStrava,
    uploadTrackToStrava,
    syncAllToStrava,
  };
}

