import React, { useState } from 'react';
import {
  Compass,
  Download,
  CheckCircle2,
  Bike,
  Search,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { MetricCardSkeleton } from './common/SkeletonLoader';
import { EmptyState } from './common/EmptyState';
import { Badge } from './common/Badge';
import { Button } from './common/Button';
import { KomootTour, KomootAuthStatus, MioDevice } from '../../types/cycloconnect';

interface KomootToursProps {
  tours: KomootTour[];
  komootStatus: KomootAuthStatus;
  device: MioDevice | null;
  onDownloadTour: (tourId: string | number, tourName: string) => void;
  onLogin: (email: string, pass: string) => void;
  isLoading: boolean;
}

export const KomootTours: React.FC<KomootToursProps> = ({
  tours,
  komootStatus,
  device,
  onDownloadTour,
  onLogin,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  const isJoggingOrRunning = (sport?: string) => {
    if (!sport) return false;
    const s = sport.toLowerCase().trim();
    return (
      s === 'jogging' ||
      s === 'running' ||
      s === 'trailrunning' ||
      s === 'run' ||
      s.includes('jog') ||
      s.includes('running')
    );
  };

  const filteredTours = tours
    .filter((t) => !isJoggingOrRunning(t.sport))
    .filter((t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sport.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // If not authenticated, display login form
  if (!komootStatus.isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto p-8 rounded-2xl bg-[#0f141d] border border-[#1f2937] shadow-xl text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#13241b] border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
          <Compass className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Connect Komoot Account</h3>
        <p className="text-xs text-[#94a3b8] mb-6 leading-relaxed">
          Access all your planned Komoot cycling routes and transfer them directly into your Mio Cyclo's <code className="bg-[#1e293b] text-emerald-400 px-1 py-0.5 rounded font-mono">\Dodge\Tracks</code> directory.
        </p>

        <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-semibold text-[#94a3b8] block mb-1.5">Komoot Account Email</label>
            <input
              id="komoot-email-input"
              type="email"
              required
              placeholder="rider@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141a24] border border-[#232d3f] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#94a3b8] block mb-1.5">Password</label>
            <input
              id="komoot-password-input"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141a24] border border-[#232d3f] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div className="p-3 rounded-lg bg-[#121722] border border-[#1e293b] text-[11px] text-[#64748b] flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Credentials encrypted securely on machine with Electron safeStorage.</span>
          </div>

          <Button
            id="btn-komoot-signin"
            type="submit"
            variant="primary"
            isLoading={isLoading}
            leftIcon={<Compass className="w-4 h-4" />}
            className="w-full py-3"
          >
            {isLoading ? 'Authenticating with Komoot...' : 'Log In & Load Planned Tours'}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0f141d] border border-[#1f2937]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Komoot Connected</span>
          </div>
          <h3 className="text-base font-bold text-white mt-0.5">
            Planned Tours ({tours.length})
          </h3>
          <span className="text-[11px] text-[#64748b]">
            Logged in as {komootStatus.user?.display_name || komootStatus.user?.id}
          </span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#64748b] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-komoot-tours"
            type="text"
            placeholder="Search planned tours..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#141a24] border border-[#232d3f] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Tours Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      ) : filteredTours.length === 0 ? (
        searchQuery ? (
          <EmptyState
            type="search-empty"
            onAction={() => setSearchQuery('')}
            actionText="Clear Tour Filter"
          />
        ) : (
          <EmptyState
            type="no-komoot"
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTours.map((tour) => {
            const isTransferred = tour.transferStatus === 'transferred' || tour.downloadedToDevice;
            const isTransferring = tour.transferStatus === 'transferring';

            return (
              <div
                key={tour.id}
                className="rounded-2xl bg-[#0f141d] border border-[#1f2937] hover:border-[#2a374a] p-5 flex flex-col justify-between transition-all shadow-lg group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-md bg-[#162030] text-[#38bdf8] text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 border border-[#1e2d42]">
                      <Bike className="w-3 h-3" />
                      {tour.sport}
                    </span>
                    <Badge
                      variant={
                        tour.difficulty === 'easy'
                          ? 'emerald'
                          : tour.difficulty === 'difficult'
                          ? 'amber'
                          : 'cyan'
                      }
                    >
                      {tour.difficulty || 'moderate'}
                    </Badge>
                  </div>

                  <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2 mb-3">
                    {tour.name}
                  </h4>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#121824] border border-[#1a2333] mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-[#64748b] block">Distance</span>
                      <span className="text-xs font-bold font-mono text-white">{tour.distanceKm} km</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#64748b] block">Elev. Gain</span>
                      <span className="text-xs font-bold font-mono text-emerald-400">+{tour.elevation_up} m</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#64748b] block">Est. Time</span>
                      <span className="text-xs font-bold font-mono text-[#cbd5e1]">{tour.durationFormatted}</span>
                    </div>
                  </div>
                </div>

                {/* Transfer Button */}
                <div className="pt-3 border-t border-[#18202e]">
                  {isTransferred ? (
                    <Badge variant="emerald" dot className="w-full justify-center py-2 text-xs">
                      On Device (\Dodge\Tracks)
                    </Badge>
                  ) : (
                    <Button
                      id={`btn-transfer-tour-${tour.id}`}
                      variant="primary"
                      onClick={() => onDownloadTour(tour.id, tour.name)}
                      disabled={!device}
                      isLoading={isTransferring}
                      leftIcon={<Download className="w-4 h-4" />}
                      className="w-full"
                    >
                      {!device
                        ? 'Connect Mio USB to Transfer'
                        : isTransferring
                        ? 'Streaming GPX...'
                        : 'Transfer GPX to Mio'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
