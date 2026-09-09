import { useState, useEffect, useCallback, useRef } from 'react';
import { KomootAuthStatus, KomootAuthState, KomootTour, MioDevice, GpsPoint, Waypoint } from '../../types';
import { parseGpxXml } from '../../utils/gpxParser';
import { NotificationType } from './useNotification';

interface UseKomootToursProps {
  device: MioDevice | null;
  isElectron: boolean;
  showToast: (message: string, type?: NotificationType) => void;
}

export function useKomootTours({ device, isElectron, showToast }: UseKomootToursProps) {
  const [komootStatus, setKomootStatus] = useState<KomootAuthStatus>({ isAuthenticated: false });
  const [komootAuthState, setKomootAuthState] = useState<KomootAuthState>({ status: 'unauthenticated' });
  const [komootTours, setKomootTours] = useState<KomootTour[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState(false);
  const volatileTokenRef = useRef<string | null>(null);

  // Initial load
  useEffect(() => {
    async function initKomoot() {
      // Clean legacy plaintext keys from storage
      localStorage.removeItem('cycloconnect_komoot_auth');
      localStorage.removeItem('cycloconnect_mock_komoot');

      if (isElectron && window.electronAPI) {
        try {
          const status = await window.electronAPI.getKomootStatus();
          setKomootStatus(status);
          if (status.isAuthenticated && status.user) {
            setKomootAuthState({ status: 'authenticated', user: status.user });
            setIsLoadingTours(true);
            const tours = await window.electronAPI.getKomootTours();
            setKomootTours(tours);
          } else {
            setKomootAuthState({ status: 'unauthenticated' });
          }
        } catch (err) {
          setKomootAuthState({ status: 'error', message: (err as Error).message });
        } finally {
          setIsLoadingTours(false);
        }
      } else {
        setKomootStatus({ isAuthenticated: false });
        setKomootAuthState({ status: 'unauthenticated' });
      }
    }

    initKomoot();
  }, [isElectron]);

  // Login
  const loginKomoot = useCallback(
    async (email: string, pass: string) => {
      if (!email || !pass) {
        showToast('Please enter both email and password for Komoot.', 'error');
        return;
      }

      setKomootAuthState({ status: 'authenticating' });
      if (isElectron && window.electronAPI) {
        try {
          const res = await window.electronAPI.komootLogin(email, pass);
          setKomootStatus(res);
          if (res.isAuthenticated && res.user) {
            setKomootAuthState({ status: 'authenticated', user: res.user });
            setIsLoadingTours(true);
            const tours = await window.electronAPI.getKomootTours();
            setKomootTours(tours);
            showToast(`Logged into Komoot as ${res.user.display_name}`, 'success');
          }
        } catch (err) {
          const errMsg = (err as Error).message;
          setKomootAuthState({ status: 'error', message: errMsg });
          showToast(`Komoot login failed: ${errMsg}`, 'error');
        } finally {
          setIsLoadingTours(false);
        }
      } else {
        showToast('Komoot credentials are encrypted via DPAPI in the desktop application.', 'info');
        setKomootAuthState({ status: 'unauthenticated' });
      }
    },
    [isElectron, showToast]
  );

  // Logout
  const logoutKomoot = useCallback(async () => {
    if (isElectron && window.electronAPI) {
      await window.electronAPI.komootLogout();
    }
    volatileTokenRef.current = null;
    localStorage.removeItem('cycloconnect_komoot_auth');
    localStorage.removeItem('cycloconnect_mock_komoot');
    setKomootStatus({ isAuthenticated: false });
    setKomootAuthState({ status: 'unauthenticated' });
    setKomootTours([]);
    showToast('Komoot session logged out.', 'info');
  }, [isElectron, showToast]);

  // Load genuine GPX track points & waypoints on-demand for TacticalMap
  const loadTourRouteGpx = useCallback(
    async (tourId: string | number): Promise<{ points: GpsPoint[]; waypoints: Waypoint[] } | null> => {
      try {
        let gpxXml = '';
        if (isElectron && window.electronAPI?.getKomootTourGpx) {
          gpxXml = await window.electronAPI.getKomootTourGpx(tourId);
        }

        if (gpxXml) {
          const parsedData = parseGpxXml(gpxXml);
          if (parsedData.points.length > 0) {
            setKomootTours((prev) =>
              prev.map((t) =>
                String(t.id) === String(tourId)
                  ? {
                      ...t,
                      points: parsedData.points,
                      waypoints: parsedData.waypoints,
                      elevation_up: parsedData.elevationGainMeters || t.elevation_up,
                    }
                  : t
              )
            );
            return { points: parsedData.points, waypoints: parsedData.waypoints };
          }
        }
      } catch (err) {
        showToast(`Failed loading tour GPX: ${(err as Error).message}`, 'error');
      }
      return null;
    },
    [isElectron, showToast]
  );

  // Download planned tour directly to connected Mio device (\Dodge\Tracks)
  const transferKomootTourToDevice = useCallback(
    async (tourId: string | number, tourName: string) => {
      if (!device || !device.connected) {
        showToast('Connect your Mio Cyclo device via USB to transfer routes.', 'error');
        return;
      }

      setKomootTours((prev) =>
        prev.map((t) => (t.id === tourId ? { ...t, transferStatus: 'transferring' } : t))
      );

      if (isElectron && window.electronAPI) {
        try {
          const res = await window.electronAPI.downloadKomootTourToDevice(tourId, tourName);
          if (res.success) {
            setKomootTours((prev) =>
              prev.map((t) =>
                t.id === tourId ? { ...t, transferStatus: 'transferred', downloadedToDevice: true } : t
              )
            );
            showToast(`Route saved directly to Mio: ${res.targetPath}`, 'success');
          }
        } catch (err) {
          const errMsg = (err as Error).message;
          setKomootTours((prev) =>
            prev.map((t) => (t.id === tourId ? { ...t, transferStatus: 'error', transferError: errMsg } : t))
          );
          showToast(`Failed transferring route: ${errMsg}`, 'error');
        }
      } else {
        showToast('Direct USB route transfer requires the CycloConnect desktop application.', 'info');
      }
    },
    [device, isElectron, showToast]
  );

  return {
    komootStatus,
    komootAuthState,
    komootTours,
    isLoadingTours,
    loginKomoot,
    logoutKomoot,
    loadTourRouteGpx,
    transferKomootTourToDevice,
    setKomootTours,
  };
}

