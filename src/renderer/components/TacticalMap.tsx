import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  MoreVertical,
  MapPin,
  Flag,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Download,
  UploadCloud,
  Bike,
  Compass,
  Crosshair,
  RotateCcw,
  Copy,
  Loader2,
} from 'lucide-react';
import { RideTrack, KomootTour, Waypoint, MioDevice, GpsPoint } from '../../types/cycloconnect';
import { formatToDMS } from '../../utils/gpxParser';

interface TacticalMapProps {
  tracks: RideTrack[];
  komootTours: KomootTour[];
  device: MioDevice | null;
  selectedTrackId: string | null;
  onSelectTrack: (trackId: string) => void;
  onUploadToStrava: (trackId: string) => void;
  onDownloadToMio: (tourId: string | number, tourName: string) => void;
  onConnectRealDevice: () => void;
  onLoadKomootRoute?: (tourId: string | number) => Promise<{ points: GpsPoint[]; waypoints: Waypoint[] } | null>;
  onLoadTrackRoute?: (trackId: string) => Promise<{ points: GpsPoint[]; waypoints: Waypoint[] } | null>;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  tracks,
  komootTours,
  device,
  selectedTrackId,
  onSelectTrack,
  onUploadToStrava,
  onDownloadToMio,
  onConnectRealDevice,
  onLoadKomootRoute,
  onLoadTrackRoute,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Active filter tab: 'MIO' (Mio Cyclo tracks) | 'KOMOOT' | 'ALL'
  const [activeSegment, setActiveSegment] = useState<'MIO' | 'KOMOOT' | 'ALL'>(
    komootTours.length > 0 ? 'KOMOOT' : 'MIO'
  );
  const [selectedKomootId, setSelectedKomootId] = useState<string | number | null>(
    komootTours[0]?.id || null
  );
  const [showMioTracksOnMap, setShowMioTracksOnMap] = useState(true);
  const [showKomootOnMap, setShowKomootOnMap] = useState(true);
  const [showDetailsDropdown, setShowDetailsDropdown] = useState(false);
  const [showRouteMenu, setShowRouteMenu] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [editingWaypointId, setEditingWaypointId] = useState<string | null>(null);
  const [customWaypointName, setCustomWaypointName] = useState('');
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  // Ensure selectedKomootId syncs with available tours
  useEffect(() => {
    if (!selectedKomootId && komootTours.length > 0) {
      setSelectedKomootId(komootTours[0].id);
    }
  }, [komootTours, selectedKomootId]);

  // Find currently selected track or fallback to first
  const currentTrack = tracks.find((t) => t.id === selectedTrackId) || tracks[0] || null;

  // Find currently selected Komoot tour
  const currentKomootTour =
    komootTours.find((k) => String(k.id) === String(selectedKomootId)) || komootTours[0] || null;

  // Auto-fetch real GPX track & waypoints when Komoot tour is selected and has no points yet
  useEffect(() => {
    if (
      (activeSegment === 'KOMOOT' || activeSegment === 'ALL') &&
      currentKomootTour &&
      (!currentKomootTour.points || currentKomootTour.points.length === 0)
    ) {
      if (onLoadKomootRoute) {
        setIsRouteLoading(true);
        onLoadKomootRoute(currentKomootTour.id)
          .catch((err) => {
            console.error('[TacticalMap] Failed loading tour route:', err);
          })
          .finally(() => {
            setIsRouteLoading(false);
          });
      }
    }
  }, [activeSegment, currentKomootTour?.id, onLoadKomootRoute, currentKomootTour?.points]);

  // Pre-load Mio track route on-demand (for GPX files without parsed points)
  useEffect(() => {
    if (
      (activeSegment === 'MIO' || activeSegment === 'ALL') &&
      currentTrack &&
      currentTrack.extension === 'gpx' &&
      (!currentTrack.points || currentTrack.points.length === 0)
    ) {
      if (onLoadTrackRoute) {
        setIsRouteLoading(true);
        onLoadTrackRoute(currentTrack.id)
          .catch((err) => {
            console.error('[TacticalMap] Failed loading track route:', err);
          })
          .finally(() => {
            setIsRouteLoading(false);
          });
      }
    }
  }, [activeSegment, currentTrack?.id, onLoadTrackRoute, currentTrack?.points, currentTrack?.extension]);

  // Local editable waypoints
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  useEffect(() => {
    if (activeSegment === 'KOMOOT') {
      if (currentKomootTour?.waypoints && currentKomootTour.waypoints.length > 0) {
        setWaypoints(currentKomootTour.waypoints);
      } else if (currentKomootTour?.points && currentKomootTour.points.length > 0) {
        const pts = currentKomootTour.points;
        const start = pts[0];
        let maxEleIdx = 0;
        let maxEle = -9999;
        pts.forEach((p, idx) => {
          if (p.ele !== undefined && p.ele > maxEle) {
            maxEle = p.ele;
            maxEleIdx = idx;
          }
        });
        const midIdx = Math.floor(pts.length / 2);
        const summitIdx = maxEle > -9999 && maxEleIdx > 0 && maxEleIdx < pts.length - 1 ? maxEleIdx : midIdx;
        const midPt = pts[summitIdx];
        const end = pts[pts.length - 1];

        const wpts: Waypoint[] = [
          {
            id: `k-wpt-start-${currentKomootTour.id}`,
            name: `${currentKomootTour.name} (Start)`,
            lat: start.lat,
            lng: start.lng,
            ele: start.ele,
            coordFormatted: formatToDMS(start.lat, start.lng),
            type: 'start',
          },
        ];

        if (pts.length > 3) {
          wpts.push({
            id: `k-wpt-summit-${currentKomootTour.id}`,
            name: maxEle > -9999 ? `Elevation Peak (+${Math.round(maxEle)}m)` : 'Sector Midpoint',
            lat: midPt.lat,
            lng: midPt.lng,
            ele: midPt.ele,
            coordFormatted: formatToDMS(midPt.lat, midPt.lng),
            type: 'summit',
          });
        }

        wpts.push({
          id: `k-wpt-finish-${currentKomootTour.id}`,
          name: `${currentKomootTour.name} (Finish - ${currentKomootTour.distanceKm}km)`,
          lat: end.lat,
          lng: end.lng,
          ele: end.ele,
          coordFormatted: formatToDMS(end.lat, end.lng),
          type: 'finish',
        });

        setWaypoints(wpts);
      } else {
        setWaypoints([]);
      }
    } else if (activeSegment === 'MIO') {
      if (currentTrack?.waypoints && currentTrack.waypoints.length > 0) {
        setWaypoints(currentTrack.waypoints);
      } else if (currentTrack?.points && currentTrack.points.length > 0) {
        const pts = currentTrack.points;
        const start = pts[0];
        const mid = pts[Math.floor(pts.length / 2)];
        const end = pts[pts.length - 1];

        setWaypoints([
          {
            id: 'wpt-start',
            name: `${currentTrack.fileName} (Start)`,
            lat: start.lat,
            lng: start.lng,
            ele: start.ele,
            coordFormatted: formatToDMS(start.lat, start.lng),
            type: 'start',
          },
          {
            id: 'wpt-mid',
            name: 'Midpoint Checkpoint',
            lat: mid.lat,
            lng: mid.lng,
            ele: mid.ele,
            coordFormatted: formatToDMS(mid.lat, mid.lng),
            type: 'waypoint',
          },
          {
            id: 'wpt-finish',
            name: `${currentTrack.fileName} (Finish)`,
            lat: end.lat,
            lng: end.lng,
            ele: end.ele,
            coordFormatted: formatToDMS(end.lat, end.lng),
            type: 'finish',
          },
        ]);
      } else {
        setWaypoints([]);
      }
    } else {
      // 'ALL' mode
      if (currentKomootTour?.waypoints && currentKomootTour.waypoints.length > 0) {
        setWaypoints(currentKomootTour.waypoints);
      } else if (currentTrack?.waypoints && currentTrack.waypoints.length > 0) {
        setWaypoints(currentTrack.waypoints);
      } else if (currentKomootTour?.points && currentKomootTour.points.length > 0) {
        const pts = currentKomootTour.points;
        setWaypoints([
          {
            id: `all-start-${currentKomootTour.id}`,
            name: `${currentKomootTour.name} (Start)`,
            lat: pts[0].lat,
            lng: pts[0].lng,
            ele: pts[0].ele,
            coordFormatted: formatToDMS(pts[0].lat, pts[0].lng),
            type: 'start',
          },
          {
            id: `all-finish-${currentKomootTour.id}`,
            name: `${currentKomootTour.name} (Finish)`,
            lat: pts[pts.length - 1].lat,
            lng: pts[pts.length - 1].lng,
            ele: pts[pts.length - 1].ele,
            coordFormatted: formatToDMS(pts[pts.length - 1].lat, pts[pts.length - 1].lng),
            type: 'finish',
          },
        ]);
      } else {
        setWaypoints([]);
      }
    }
  }, [activeSegment, currentTrack, currentKomootTour]);

  // Fit map helper
  const fitMapToBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (activeSegment === 'KOMOOT' && currentKomootTour?.points && currentKomootTour.points.length > 0) {
      map.fitBounds(L.latLngBounds(currentKomootTour.points.map((p) => [p.lat, p.lng])), { padding: [50, 50], maxZoom: 15 });
    } else if (currentTrack?.points && currentTrack.points.length > 0) {
      map.fitBounds(L.latLngBounds(currentTrack.points.map((p) => [p.lat, p.lng])), { padding: [50, 50], maxZoom: 15 });
    } else if (waypoints.length > 0) {
      map.fitBounds(L.latLngBounds(waypoints.map((w) => [w.lat, w.lng])), { padding: [50, 50], maxZoom: 15 });
    }
  }, [activeSegment, currentKomootTour, currentTrack, waypoints]);

  // Reverse route direction helper
  const invertWaypoints = useCallback(() => {
    setWaypoints((prev) => {
      const reversed = [...prev].reverse();
      return reversed.map((wpt, idx) => ({
        ...wpt,
        type: idx === 0 ? 'start' : idx === reversed.length - 1 ? 'finish' : 'waypoint',
      }));
    });
  }, []);

  // Copy GPS Coordinates helper
  const copyCoordinates = useCallback(() => {
    if (waypoints.length === 0) return;
    const formatted = waypoints
      .map((w) => `${w.name}: ${w.lat.toFixed(5)}, ${w.lng.toFixed(5)} (${w.coordFormatted || ''})`)
      .join('\n');
    navigator.clipboard.writeText(formatted);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  }, [waypoints]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [50.8503, 4.3517],
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);
      routesLayerGroupRef.current = L.layerGroup().addTo(map);
      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    if (routesLayerGroupRef.current) routesLayerGroupRef.current.clearLayers();
    if (markersGroupRef.current) markersGroupRef.current.clearLayers();

    const allRoutePoints: [number, number][] = [];

    // 1. Draw Komoot Route if applicable
    const shouldShowKomoot =
      (activeSegment === 'KOMOOT' || activeSegment === 'ALL') && showKomootOnMap;

    if (shouldShowKomoot && currentKomootTour?.points && currentKomootTour.points.length > 0) {
      const kCoords: [number, number][] = currentKomootTour.points.map((p) => [p.lat, p.lng]);
      const komootPolyline = L.polyline(kCoords, {
        color: '#10b981', // Emerald green
        weight: 4,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      });
      routesLayerGroupRef.current?.addLayer(komootPolyline);
      allRoutePoints.push(...kCoords);
    }

    // 2. Draw Mio Track if applicable
    const shouldShowMio =
      (activeSegment === 'MIO' || activeSegment === 'ALL') && showMioTracksOnMap;

    if (shouldShowMio && currentTrack?.points && currentTrack.points.length > 0) {
      const mCoords: [number, number][] = currentTrack.points.map((p) => [p.lat, p.lng]);
      const mioPolyline = L.polyline(mCoords, {
        color: '#00e599', // Cyclo signature mint green
        weight: 3.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      });
      routesLayerGroupRef.current?.addLayer(mioPolyline);
      allRoutePoints.push(...mCoords);
    }

    // 3. Fallback polyline from waypoints if no points were loaded
    if (allRoutePoints.length === 0 && waypoints.length > 1) {
      const wCoords: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);
      const fallbackPolyline = L.polyline(wCoords, {
        color: activeSegment === 'KOMOOT' ? '#10b981' : '#00e599',
        weight: 3.5,
        dashArray: '6, 8',
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
      });
      routesLayerGroupRef.current?.addLayer(fallbackPolyline);
      allRoutePoints.push(...wCoords);
    }

    // 4. Place Waypoint Markers
    waypoints.forEach((wpt, index) => {
      const isStart = wpt.type === 'start' || index === 0;
      const isFinish = wpt.type === 'finish' || index === waypoints.length - 1;
      const isSummit = wpt.type === 'summit' || wpt.type === 'pass';

      let markerHtml = '';
      if (isStart) {
        markerHtml = `
          <div class="relative flex items-center justify-center">
            <div class="w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/50">
              <div class="w-2 h-2 rounded-full bg-emerald-300"></div>
            </div>
            <div class="absolute -top-4 text-emerald-400 font-bold text-[10px] bg-black/80 px-1 rounded">START</div>
          </div>`;
      } else if (isFinish) {
        markerHtml = `
          <div class="relative flex items-center justify-center">
            <div class="w-6 h-6 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center shadow-lg shadow-red-500/50">
              <div class="w-2 h-2 rounded-full bg-red-400"></div>
            </div>
            <div class="absolute -top-4 -right-1 text-red-500 font-bold text-xs">⚑</div>
          </div>`;
      } else if (isSummit) {
        markerHtml = `
          <div class="relative flex items-center justify-center">
            <div class="w-6 h-6 rounded-full bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/50">
              <div class="w-2 h-2 rounded-full bg-purple-300"></div>
            </div>
            <div class="absolute -top-4 text-purple-400 font-bold text-[10px] bg-black/80 px-1 rounded">▲</div>
          </div>`;
      } else {
        markerHtml = `
          <div class="w-5 h-5 rounded-full bg-[#161a22] border-2 border-white flex items-center justify-center shadow-md">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>`;
      }

      const customIcon = L.divIcon({
        className: 'tactical-marker',
        html: markerHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([wpt.lat, wpt.lng], { icon: customIcon }).bindPopup(
        `<div style="background:#16191d; color:#fff; padding:8px 12px; border-radius:8px; font-family:sans-serif; font-size:12px; border:1px solid #282f3a;">
          <strong style="color:#00e599; font-size:13px;">${wpt.name}</strong><br/>
          ${wpt.ele !== undefined ? `<span style="color:#38bdf8; font-size:11px;">Elevation: +${Math.round(wpt.ele)}m</span><br/>` : ''}
          <span style="color:#94a3b8; font-size:11px; font-family:monospace;">${wpt.coordFormatted || `${wpt.lat.toFixed(5)}, ${wpt.lng.toFixed(5)}`}</span>
        </div>`
      );

      markersGroupRef.current?.addLayer(marker);
    });

    // 5. Fit bounds to the actual GPS points!
    if (allRoutePoints.length > 0) {
      const bounds = L.latLngBounds(allRoutePoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 250);
  }, [activeSegment, currentTrack, currentKomootTour, waypoints, showMioTracksOnMap, showKomootOnMap]);

  const handleSaveWaypointName = (id: string) => {
    if (!customWaypointName.trim()) {
      setEditingWaypointId(null);
      return;
    }
    setWaypoints((prev) =>
      prev.map((w) => (w.id === id ? { ...w, name: customWaypointName.trim() } : w))
    );
    setEditingWaypointId(null);
    setCustomWaypointName('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-145px)] min-h-[640px] rounded-2xl bg-[#121417] border border-[#23272e] overflow-hidden shadow-2xl isolate relative z-0">
      {/* Route Title Bar */}
      <div className="px-6 py-3.5 bg-[#16191d] border-b border-[#23272e] flex items-center justify-between relative z-30">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-white tracking-wide">Route</h2>
          {device?.connected && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold tracking-wider uppercase flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Mio Hardware Data
            </span>
          )}
          {isRouteLoading && (
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Importing Komoot GPX route & waypoints...
            </span>
          )}
          {copiedToast && (
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-semibold animate-in fade-in">
              GPS Coordinates Copied!
            </span>
          )}
        </div>

        {/* Route Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowRouteMenu(!showRouteMenu)}
            title="Route Actions"
            className="p-1 rounded-lg hover:bg-[#23272e] text-[#6b7280] hover:text-white transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showRouteMenu && (
            <div className="absolute right-0 top-8 w-52 p-2 rounded-xl bg-[#16191d]/98 backdrop-blur-xl border border-[#2a313d] shadow-2xl text-xs space-y-1 z-50 animate-in fade-in zoom-in-95">
              <button
                onClick={() => {
                  fitMapToBounds();
                  setShowRouteMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-[#202734] transition-colors flex items-center gap-2"
              >
                <Crosshair className="w-3.5 h-3.5 text-[#00e599]" />
                <span>Center & Fit to Route</span>
              </button>
              <button
                onClick={() => {
                  invertWaypoints();
                  setShowRouteMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-[#202734] transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                <span>Reverse Direction</span>
              </button>
              <button
                onClick={() => {
                  copyCoordinates();
                  setShowRouteMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-[#202734] transition-colors flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-purple-400" />
                <span>Copy GPS Coordinates</span>
              </button>

              {activeSegment !== 'KOMOOT' && currentTrack && (
                currentTrack.extension === 'fit' ? (
                  <button
                    onClick={() => {
                      onUploadToStrava(currentTrack.id);
                      setShowRouteMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-[#202734] transition-colors flex items-center gap-2 border-t border-[#23272e] pt-2"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-[#fc4c02]" />
                    <span>Export FIT to Strava</span>
                  </button>
                ) : (
                  <div
                    title="Unridden GPX routes cannot be exported to Strava as activities."
                    className="w-full text-left px-3 py-2 text-[11px] text-[#64748b] flex items-center gap-2 border-t border-[#23272e] pt-2 cursor-not-allowed select-none"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 shrink-0" />
                    <span>Route (.GPX) unexportable</span>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Tactical Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Left Floating/Docked Waypoint Panel */}
        <div className="w-full lg:w-[360px] bg-[#16191d] border-r border-[#23272e] flex flex-col justify-between z-10 p-5 overflow-y-auto">
          <div className="space-y-5">
            {/* Segmented Control Buttons (MIO-USB | KOMOOT | ALL) */}
            <div className="p-1 rounded-xl bg-[#0f1114] border border-[#23272e] grid grid-cols-3 gap-1 text-center">
              <button
                onClick={() => setActiveSegment('MIO')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeSegment === 'MIO'
                    ? 'bg-[#00e599]/20 text-[#00e599] border border-[#00e599]/40 shadow-sm'
                    : 'text-[#6b7280] hover:text-[#e2e8f0]'
                }`}
              >
                MIO-USB
              </button>
              <button
                onClick={() => setActiveSegment('KOMOOT')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeSegment === 'KOMOOT'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'text-[#6b7280] hover:text-[#e2e8f0]'
                }`}
              >
                KOMOOT
              </button>
              <button
                onClick={() => setActiveSegment('ALL')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeSegment === 'ALL'
                    ? 'bg-[#00e599]/20 text-[#00e599] border border-[#00e599]/40 shadow-sm'
                    : 'text-[#6b7280] hover:text-[#e2e8f0]'
                }`}
              >
                ALL
              </button>
            </div>

            {/* Segment-Aware Route Selector Dropdown */}
            {activeSegment === 'KOMOOT' ? (
              komootTours.length > 0 ? (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block mb-1.5">
                    Planned Komoot Tour ({komootTours.length} tours)
                  </label>
                  <select
                    value={currentKomootTour?.id || ''}
                    onChange={(e) => setSelectedKomootId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0f1114] border border-emerald-500/30 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {komootTours.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name} ({k.distanceKm}km • {k.durationFormatted})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#0f1114] border border-[#23272e] text-center text-xs text-[#64748b]">
                  No planned Komoot routes. Log in on Accounts tab.
                </div>
              )
            ) : tracks.length > 0 ? (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] block mb-1.5">
                  Selected Mio Ride ({tracks.length} on disk)
                </label>
                <select
                  value={currentTrack?.id || ''}
                  onChange={(e) => onSelectTrack(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0f1114] border border-[#282f3a] text-xs text-white focus:outline-none focus:border-[#00e599]"
                >
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fileName} ({t.directory}) {t.distanceKm ? `• ${t.distanceKm}km` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[#0f1114] border border-[#23272e] text-center text-xs text-[#64748b]">
                No recorded tracks found on connected Mio device.
              </div>
            )}

            {/* Waypoint List Header */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#94a3b8] mb-3">
                <span className="tracking-wide">Waypoint List</span>
                <span className="text-[11px] text-[#6b7280] font-mono">{waypoints.length} Checkpoints</span>
              </div>

              {/* Waypoints with vertical dashed line connector */}
              {isRouteLoading ? (
                <div className="p-4 rounded-xl bg-[#0f1114] border border-emerald-500/30 text-center space-y-2 my-2">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mx-auto" />
                  <p className="text-xs text-emerald-300 font-semibold">Streaming GPS points from Komoot...</p>
                  <p className="text-[10px] text-[#64748b]">Calculating elevation peaks and turn milestones</p>
                </div>
              ) : waypoints.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#0f1114] border border-[#23272e] text-center text-xs text-[#64748b] my-2">
                  {activeSegment === 'KOMOOT'
                    ? 'No GPS track data loaded for this Komoot route.'
                    : 'No recorded track points on Mio device.'}
                </div>
              ) : (
                <div className="space-y-4 relative">
                  <div className="absolute left-[13px] top-4 bottom-4 w-0.5 border-l-2 border-dashed border-[#2f3846] pointer-events-none" />

                  {waypoints.map((wpt) => {
                    const isEditing = editingWaypointId === wpt.id;

                    return (
                      <div key={wpt.id} className="relative flex items-start gap-3 group">
                        {/* Pin Circle */}
                        <div className="w-7 h-7 rounded-full bg-[#121417] border border-[#2f3846] flex items-center justify-center shrink-0 z-10 group-hover:border-[#00e599] transition-colors">
                          {wpt.type === 'finish' ? (
                            <Flag className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-[#00e599]" />
                          )}
                        </div>

                        {/* Waypoint Content */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  autoFocus
                                  value={customWaypointName}
                                  onChange={(e) => setCustomWaypointName(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveWaypointName(wpt.id)}
                                  placeholder="Rename waypoint..."
                                  className="w-full px-2.5 py-1 rounded-lg bg-[#0f1114] border border-[#00e599] text-xs text-white focus:outline-none"
                                />
                                <button
                                  onClick={() => handleSaveWaypointName(wpt.id)}
                                  className="p-1 rounded-md bg-[#00e599] text-black hover:opacity-90"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-1 rounded bg-[#0f1114] border border-[#282f3a] text-[10px] font-mono text-[#94a3b8]">
                                  {wpt.lat.toFixed(5)}° N
                                </span>
                                <span className="px-2 py-1 rounded bg-[#0f1114] border border-[#282f3a] text-[10px] font-mono text-[#94a3b8]">
                                  {wpt.lng.toFixed(5)}° E
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white group-hover:text-[#00e599] transition-colors truncate">
                                  {wpt.name}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingWaypointId(wpt.id);
                                    setCustomWaypointName(wpt.name);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-[#6b7280] hover:text-white transition-opacity"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="text-[10px] font-mono text-[#6b7280] block mt-0.5">
                                {wpt.coordFormatted || `${wpt.lat.toFixed(4)}° N, ${wpt.lng.toFixed(4)}° E`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="pt-4 border-t border-[#23272e] flex items-center gap-3">
            <button
              onClick={onConnectRealDevice}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#0f1114] hover:bg-[#1c2129] border border-[#282f3a] text-xs font-semibold text-[#cbd5e1] transition-all flex items-center justify-center gap-1.5"
            >
              <HardDrive className="w-3.5 h-3.5 text-[#00e599]" />
              <span>{device?.connected ? 'Mio Connected' : 'Plug in Mio'}</span>
            </button>

            {activeSegment === 'KOMOOT' && currentKomootTour ? (
              <button
                onClick={() => onDownloadToMio(currentKomootTour.id, currentKomootTour.name)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Send to Mio</span>
              </button>
            ) : currentTrack ? (
              currentTrack.extension === 'fit' ? (
                <button
                  onClick={() => onUploadToStrava(currentTrack.id)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#fc4c02] hover:bg-[#e04000] text-white font-bold text-xs tracking-wide transition-all shadow-lg shadow-[#fc4c02]/20 flex items-center justify-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Export to Strava</span>
                  <span className="text-sm">›</span>
                </button>
              ) : (
                <div
                  title="Unridden GPX routes cannot be exported to Strava as activities. Only recorded .fit files can be uploaded."
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#141a24] border border-[#232d3f] text-center text-[11px] text-[#94a3b8] flex items-center justify-center gap-1.5 select-none"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="truncate">Route (.GPX) • Unridden route not exportable</span>
                </div>
              )
            ) : null}
          </div>
        </div>

        {/* Right Map Canvas with Floating Controls */}
        <div className="flex-1 relative h-full min-h-[450px]">
          {/* Leaflet Map Div */}
          <div ref={mapContainerRef} className="tactical-dark-map absolute inset-0 w-full h-full bg-[#0a0c0f]" />

          {/* Floating Top Controls */}
          <div className="absolute top-4 left-4 right-4 z-[400] pointer-events-none flex items-center justify-between">
            {/* Filter Checkboxes */}
            <div className="pointer-events-auto flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#16191d]/90 backdrop-blur-md border border-[#2a313d] text-xs font-semibold text-white cursor-pointer select-none hover:border-[#00e599]/50 transition-colors shadow-lg">
                <input
                  type="checkbox"
                  checked={showMioTracksOnMap}
                  onChange={(e) => setShowMioTracksOnMap(e.target.checked)}
                  className="rounded bg-[#0f1114] border-[#2f3846] text-[#00e599] focus:ring-0 w-3.5 h-3.5 accent-[#00e599]"
                />
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00e599]" />
                  <span>MIO-Tracks</span>
                </span>
              </label>

              <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#16191d]/90 backdrop-blur-md border border-[#2a313d] text-xs font-semibold text-[#94a3b8] cursor-pointer select-none hover:text-white transition-colors shadow-lg">
                <input
                  type="checkbox"
                  checked={showKomootOnMap}
                  onChange={(e) => setShowKomootOnMap(e.target.checked)}
                  className="rounded bg-[#0f1114] border-[#2f3846] text-[#00e599] focus:ring-0 w-3.5 h-3.5 accent-[#00e599]"
                />
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3 h-3 text-emerald-400" />
                  <span>Komoot</span>
                </span>
              </label>
            </div>

            {/* Mission Details Dropdown Button */}
            <div className="pointer-events-auto relative">
              <button
                onClick={() => setShowDetailsDropdown(!showDetailsDropdown)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#16191d]/95 backdrop-blur-md border border-[#2a313d] text-xs font-semibold text-white hover:border-[#00e599]/50 transition-all shadow-lg"
              >
                <span>Mission Details</span>
                {showDetailsDropdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {/* Floating Mission Telemetry Card */}
              {showDetailsDropdown && (
                <div className="absolute right-0 top-10 w-72 p-4 rounded-2xl bg-[#16191d]/98 backdrop-blur-xl border border-[#2a313d] shadow-2xl text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-[#23272e] pb-2">
                    <span className="font-bold text-white">Telemetry & Telematics</span>
                    <span className="text-[10px] font-mono text-[#00e599]">
                      {activeSegment === 'KOMOOT' ? 'KOMOOT PLAN' : `${currentTrack?.extension?.toUpperCase() || 'FIT'} ACTIVE`}
                    </span>
                  </div>

                  {activeSegment === 'KOMOOT' && currentKomootTour ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-[#0f1114] border border-[#23272e]">
                          <span className="text-[10px] text-[#6b7280] block">Distance</span>
                          <span className="text-sm font-bold font-mono text-white">
                            {currentKomootTour.distanceKm} km
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#0f1114] border border-[#23272e]">
                          <span className="text-[10px] text-[#6b7280] block">Elev. Gain</span>
                          <span className="text-sm font-bold font-mono text-emerald-400">
                            +{currentKomootTour.elevation_up || 0} m
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#0f1114] border border-[#23272e]">
                          <span className="text-[10px] text-[#6b7280] block">Est. Duration</span>
                          <span className="text-sm font-bold font-mono text-white">
                            {currentKomootTour.durationFormatted}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#0f1114] border border-[#23272e]">
                          <span className="text-[10px] text-[#6b7280] block">Difficulty</span>
                          <span className="text-sm font-bold font-mono text-emerald-400 capitalize">
                            {currentKomootTour.difficulty || 'moderate'}
                          </span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#0f1114] border border-[#23272e] text-[11px] text-[#94a3b8] space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Sport Type:</span>
                          <span className="font-mono text-white capitalize">{currentKomootTour.sport}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Target Folder:</span>
                          <span className="font-mono text-emerald-400">\Dodge\Tracks</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Route Geometry:</span>
                          <span className="font-mono text-emerald-400 font-semibold">
                            {currentKomootTour.points?.length ? `${currentKomootTour.points.length} GPS Points` : isRouteLoading ? 'Fetching GPX...' : 'Standard'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-[#0f1114] border border-[#23272e]">
                          <span className="text-[10px] text-[#6b7280] block">Distance</span>
                          <span className="text-sm font-bold font-mono text-white">
                            {currentTrack?.distanceKm || '45.2'} km
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#0f1114] border border-[#23272e]">
                          <span className="text-[10px] text-[#6b7280] block">Elev. Gain</span>
                          <span className="text-sm font-bold font-mono text-[#00e599]">
                            +{currentTrack?.elevationGainM || '620'} m
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#0f1114] border border-[#23272e]">
                          <span className="text-[10px] text-[#6b7280] block">Est. Duration</span>
                          <span className="text-sm font-bold font-mono text-white">
                            {currentTrack?.durationFormatted || '1h 48m'}
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-[#0f1114] border border-[#23272e]">
                          <span className="text-[10px] text-[#6b7280] block">Avg Speed</span>
                          <span className="text-sm font-bold font-mono text-white">
                            {currentTrack?.avgSpeedKmh || '25.4'} km/h
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#0f1114] border border-[#23272e] text-[11px] text-[#94a3b8] space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Source Path:</span>
                          <span className="font-mono text-white truncate max-w-[140px]">
                            {currentTrack?.filePath || 'E:\\Dodge\\Tracks'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Size on Disk:</span>
                          <span className="font-mono text-white">{currentTrack?.fileSizeFormatted || '471 KB'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
