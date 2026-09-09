import { useState, useEffect, useCallback, useMemo } from 'react';
import { MioDevice, RideTrack, GpsPoint, Waypoint, TrackFilterType, TrackSortOption } from '../../types';
import { parseGpxXml } from '../../utils/gpxParser';
import { NotificationType } from './useNotification';

interface UseRideTracksProps {
  device: MioDevice | null;
  isElectron: boolean;
  showToast: (message: string, type?: NotificationType) => void;
}

export function useRideTracks({ device, isElectron, showToast }: UseRideTracksProps) {
  const [tracks, setTracks] = useState<RideTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TrackFilterType>('all');
  const [sortOption, setSortOption] = useState<TrackSortOption>('date-desc');
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);

  // Fetch tracks from connected device
  const fetchTracks = useCallback(async (tracksPath?: string) => {
    if (!tracksPath) {
      setTracks([]);
      return;
    }

    setIsLoadingTracks(true);
    if (isElectron && window.electronAPI) {
      try {
        const history = await window.electronAPI.getRideHistory(tracksPath);
        setTracks(history);
      } catch (err) {
        showToast(`Failed loading ride tracks: ${(err as Error).message}`, 'error');
      }
    } else {
      setTracks([]);
    }
    setIsLoadingTracks(false);
  }, [isElectron, showToast]);

  // Refresh tracks whenever device connection changes
  useEffect(() => {
    if (device?.connected && device.tracksPath) {
      fetchTracks(device.tracksPath);
    } else {
      setTracks([]);
    }
  }, [device?.connected, device?.tracksPath, fetchTracks]);

  // Load genuine GPX route points & waypoints on demand
  const loadTrackRouteGpx = useCallback(
    async (trackId: string): Promise<{ points: GpsPoint[]; waypoints: Waypoint[] } | null> => {
      try {
        const targetTrack = tracks.find((t) => t.id === trackId);
        if (!targetTrack || targetTrack.extension !== 'gpx') return null;

        if (targetTrack.points && targetTrack.points.length > 0) {
          return { points: targetTrack.points, waypoints: targetTrack.waypoints || [] };
        }

        let gpxXml = '';
        if (isElectron && window.electronAPI?.getTrackGpx) {
          gpxXml = await window.electronAPI.getTrackGpx(targetTrack.filePath);
        }

        if (gpxXml) {
          const parsedData = parseGpxXml(gpxXml);
          if (parsedData.points.length > 0) {
            setTracks((prev) =>
              prev.map((t) =>
                t.id === trackId
                  ? {
                      ...t,
                      points: parsedData.points,
                      waypoints: parsedData.waypoints,
                      distanceKm: parsedData.distanceMeters
                        ? (parsedData.distanceMeters / 1000).toFixed(1)
                        : t.distanceKm,
                      elevationGainM: parsedData.elevationGainMeters || t.elevationGainM,
                    }
                  : t
              )
            );
            return { points: parsedData.points, waypoints: parsedData.waypoints };
          }
        }
      } catch (err) {
        showToast(`Failed loading GPX track data: ${(err as Error).message}`, 'error');
      }
      return null;
    },
    [isElectron, tracks, showToast]
  );

  // Add custom dropped file (.fit or .gpx)
  const addCustomRideFile = useCallback(
    async (file: File) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'fit' && ext !== 'gpx') {
        showToast(`Unsupported file: ${file.name}. Only .fit and .gpx files are supported.`, 'error');
        return;
      }

      const newTrack: RideTrack = {
        id: `manual-${Date.now()}-${file.name}`,
        fileName: file.name,
        filePath: file.name,
        relativePath: file.name,
        directory: 'Imported',
        fileSizeBytes: file.size,
        fileSizeFormatted: `${(file.size / 1024).toFixed(1)} KB`,
        extension: ext,
        dateModified: new Date(file.lastModified).toISOString(),
        profile: 'Imported',
        uploadStatus: 'idle',
        rawFile: file,
      };

      setTracks((prev) => [newTrack, ...prev]);
      showToast(`Loaded ${file.name} into CycloConnect`, 'success');
    },
    [showToast]
  );

  // Filtered & sorted tracks
  const filteredTracks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return tracks
      .filter((t) => {
        const matchesQuery =
          !query ||
          t.fileName.toLowerCase().includes(query) ||
          t.profile.toLowerCase().includes(query) ||
          t.directory.toLowerCase().includes(query);

        if (!matchesQuery) return false;

        if (filterType === 'fit') return t.extension === 'fit';
        if (filterType === 'gpx') return t.extension === 'gpx';
        if (filterType === 'unsynced') return t.extension === 'fit' && !t.stravaUploaded;

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'date-desc') {
          return new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime();
        }
        if (sortOption === 'date-asc') {
          return new Date(a.dateModified).getTime() - new Date(b.dateModified).getTime();
        }
        if (sortOption === 'size-desc') {
          return b.fileSizeBytes - a.fileSizeBytes;
        }
        if (sortOption === 'name-asc') {
          return a.fileName.localeCompare(b.fileName);
        }
        return 0;
      });
  }, [tracks, searchQuery, filterType, sortOption]);

  const pendingCount = useMemo(
    () => tracks.filter((t) => t.extension === 'fit' && !t.stravaUploaded).length,
    [tracks]
  );

  const syncedCount = useMemo(
    () => tracks.filter((t) => t.extension === 'fit' && t.stravaUploaded).length,
    [tracks]
  );

  return {
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
    fetchTracks,
    loadTrackRouteGpx,
    addCustomRideFile,
    setTracks,
  };
}

