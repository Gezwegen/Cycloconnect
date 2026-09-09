import React, { useState, useRef } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ExternalLink,
  FolderOpen,
  Calendar,
  Layers,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { TableRowSkeleton } from './common/SkeletonLoader';
import { EmptyState } from './common/EmptyState';
import { Badge } from './common/Badge';
import { Button } from './common/Button';
import { RideTrack, StravaAuthStatus } from '../../types/cycloconnect';

interface RideHistoryProps {
  tracks: RideTrack[];
  stravaStatus: StravaAuthStatus;
  onUploadTrack: (trackId: string) => void;
  onOpenFolder: (path: string) => void;
  onAddCustomFile: (file: File) => void;
  isLoading?: boolean;
}

export const RideHistory: React.FC<RideHistoryProps> = ({
  tracks,
  stravaStatus,
  onUploadTrack,
  onOpenFolder,
  onAddCustomFile,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'fit' | 'gpx' | 'unsynced'>('all');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        onAddCustomFile(e.dataTransfer.files[i]);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      for (let i = 0; i < e.target.files.length; i++) {
        onAddCustomFile(e.target.files[i]);
      }
    }
  };

  // Filtered tracks
  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      t.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.profile.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.relativePath.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'fit') return t.extension === 'fit';
    if (filterType === 'gpx') return t.extension === 'gpx';
    if (filterType === 'unsynced') return t.extension === 'fit' && !t.stravaUploaded;

    return true;
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0f141d] border border-[#1f2937]">
        {/* Search */}
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-tracks"
            type="text"
            placeholder="Search rides by filename, profile, date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#141a24] border border-[#232d3f] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#fc4c02]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-[#64748b] mr-1 hidden sm:block" />
          {(['all', 'unsynced', 'fit', 'gpx'] as const).map((ft) => (
            <button
              key={ft}
              id={`filter-btn-${ft}`}
              onClick={() => setFilterType(ft)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                filterType === ft
                  ? 'bg-[#fc4c02] text-white shadow-sm'
                  : 'bg-[#141a24] text-[#94a3b8] hover:text-white border border-[#1e293b]'
              }`}
            >
              {ft === 'all' ? 'All Rides' : ft === 'unsynced' ? 'Unsynced' : `.${ft.toUpperCase()}`}
            </button>
          ))}

          {/* Manual Load button */}
          <button
            id="btn-import-ride-file"
            onClick={() => fileInputRef.current?.click()}
            title="Import or test a .fit or .gpx file from computer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a2233] hover:bg-[#253147] text-[#38bdf8] text-xs font-semibold border border-[#38bdf8]/30 transition-all whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Load File</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".fit,.gpx"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
          isDragging
            ? 'border-[#fc4c02] bg-[#fc4c02]/5 text-white'
            : 'border-[#1e293b] bg-[#0c1017]/60 text-[#64748b]'
        }`}
      >
        <span className="text-xs">
          Drop <strong className="text-[#94a3b8]">.fit</strong> or <strong className="text-[#94a3b8]">.gpx</strong> ride files here to simulate or test device track parsing
        </span>
      </div>

      {/* Tracks Table */}
      {isLoading ? (
        <div className="rounded-2xl bg-[#0f141d] border border-[#1f2937] p-4 space-y-3 shadow-xl">
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
          <TableRowSkeleton />
        </div>
      ) : filteredTracks.length === 0 ? (
        tracks.length === 0 ? (
          <EmptyState
            type="no-rides"
            onAction={() => fileInputRef.current?.click()}
            actionText="Import .FIT Activity"
          />
        ) : (
          <EmptyState
            type="search-empty"
            onAction={() => {
              setSearchQuery('');
              setFilterType('all');
            }}
            actionText="Reset Filters"
          />
        )
      ) : (
        <div className="rounded-2xl bg-[#0f141d] border border-[#1f2937] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1f2937] bg-[#121824] text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
                  <th className="py-3 px-4">Track File</th>
                  <th className="py-3 px-4">Profile & Path</th>
                  <th className="py-3 px-4">Date Recorded</th>
                  <th className="py-3 px-4">File Size</th>
                  <th className="py-3 px-4">Strava Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18202e] text-xs">
                {filteredTracks.map((track) => (
                  <tr key={track.id} className="hover:bg-[#131a26] transition-colors">
                    {/* Track File */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] uppercase font-mono ${
                            track.extension === 'fit'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          .{track.extension}
                        </div>
                        <div>
                          <span className="font-semibold text-white block font-mono">{track.fileName}</span>
                          <span className="text-[11px] text-[#64748b]">Mio Cyclo Binary Format</span>
                        </div>
                      </div>
                    </td>

                    {/* Profile & Path */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-[#94a3b8]">
                        <Layers className="w-3.5 h-3.5 text-[#64748b]" />
                        <span className="font-medium text-white">{track.profile}</span>
                      </div>
                      <span className="text-[10px] text-[#475569] font-mono block mt-0.5">
                        {track.relativePath}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-[#94a3b8]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#64748b]" />
                        <span>{formatDate(track.dateModified)}</span>
                      </div>
                    </td>

                    {/* File Size */}
                    <td className="py-3.5 px-4 font-mono text-[#cbd5e1]">
                      {track.fileSizeFormatted}
                    </td>

                    {/* Strava Status Badge */}
                    <td className="py-3.5 px-4">
                      {track.extension === 'gpx' ? (
                        <Badge variant="amber" dot title="Planned route file: unridden routes cannot be exported to Strava">
                          Route (.GPX)
                        </Badge>
                      ) : track.stravaUploaded || track.uploadStatus === 'synced' ? (
                        <Badge variant="emerald" dot>
                          Synced {track.stravaActivityId ? `(#${track.stravaActivityId.substring(0, 6)}...)` : ''}
                        </Badge>
                      ) : track.uploadStatus === 'uploading' ? (
                        <Badge variant="strava" dot>
                          Uploading...
                        </Badge>
                      ) : track.uploadStatus === 'error' ? (
                        <Badge variant="danger" dot title={track.uploadError || 'Upload error'}>
                          Upload Failed
                        </Badge>
                      ) : (
                        <Badge variant="zinc" dot>
                          Pending Sync
                        </Badge>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {track.extension === 'gpx' ? (
                          <span
                            title="Unridden routes cannot be exported to Strava as activities"
                            className="px-2.5 py-1 rounded-lg bg-[#141a24] text-[#64748b] text-[11px] font-semibold border border-[#232d3f] cursor-default"
                          >
                            Unridden Route
                          </span>
                        ) : track.stravaUploaded || track.uploadStatus === 'synced' ? (
                          <button
                            disabled
                            className="px-3 py-1 rounded-lg bg-[#141a24] text-[#64748b] text-xs font-semibold cursor-default"
                          >
                            Synchronized
                          </button>
                        ) : (
                          <Button
                            id={`btn-upload-track-${track.id}`}
                            size="sm"
                            variant="strava"
                            onClick={() => onUploadTrack(track.id)}
                            isLoading={track.uploadStatus === 'uploading'}
                            leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                          >
                            Upload
                          </Button>
                        )}

                        <button
                          id={`btn-open-folder-${track.id}`}
                          onClick={() => onOpenFolder(track.filePath)}
                          title="Open folder in Windows Explorer"
                          className="p-1.5 rounded-lg bg-[#141a24] hover:bg-[#1f2838] text-[#94a3b8] hover:text-white border border-[#232d3f] transition-all"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
