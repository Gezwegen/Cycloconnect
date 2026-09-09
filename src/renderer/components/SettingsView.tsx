import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Compass,
  CheckCircle2,
  Lock,
  RefreshCw,
  LogOut,
  HardDrive,
} from 'lucide-react';
import { Badge } from './common/Badge';
import { Button } from './common/Button';
import { StravaAuthStatus, KomootAuthStatus, MioDevice } from '../../types/cycloconnect';

interface SettingsViewProps {
  stravaStatus: StravaAuthStatus;
  komootStatus: KomootAuthStatus;
  device: MioDevice | null;
  onConnectStrava: () => void;
  onDisconnectStrava: () => void;
  onLoginKomoot: (email: string, pass: string) => void;
  onLogoutKomoot: () => void;
  onRescanDevice: () => void;
  isLoading: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  stravaStatus,
  komootStatus,
  device,
  onConnectStrava,
  onDisconnectStrava,
  onLoginKomoot,
  onLogoutKomoot,
  onRescanDevice,
  isLoading,
}) => {
  const [komootEmail, setKomootEmail] = useState('');
  const [komootPassword, setKomootPassword] = useState('');

  const handleKomootSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginKomoot(komootEmail, komootPassword);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Security Architecture Banner */}
      <div className="p-5 rounded-2xl bg-[#0f141d] border border-[#1f2937] shadow-xl flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <h3 className="text-sm font-bold text-white">Hardware Security & SafeStorage Enabled</h3>
          <p className="text-[#94a3b8] leading-relaxed">
            All Strava OAuth tokens, refresh keys, and Komoot session cookies are encrypted using Electron's native{' '}
            <code className="bg-[#1a2333] px-1 py-0.5 rounded text-emerald-400 font-mono">safeStorage</code> API (backed by Windows DPAPI). Tokens are never written to disk in plain text.
          </p>
        </div>
      </div>

      {/* Strava Settings Card */}
      <div className="p-6 rounded-2xl bg-[#0f141d] border border-[#1f2937] shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#1f2937]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fc4c02]/15 border border-[#fc4c02]/30 flex items-center justify-center text-[#fc4c02]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Strava API & OAuth2 Integration</h3>
              <p className="text-xs text-[#94a3b8]">Direct activity upload engine to https://www.strava.com/api/v3/uploads</p>
            </div>
          </div>

          {stravaStatus.isAuthenticated ? (
            <Badge variant="emerald" dot>
              Connected
            </Badge>
          ) : (
            <Badge variant="zinc" dot>
              Disconnected
            </Badge>
          )}
        </div>

        <div className="mt-5">
          {stravaStatus.isAuthenticated ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#141a24] border border-[#1e293b] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#64748b] block">Authenticated Athlete</span>
                  <span className="text-base font-bold text-white">
                    {stravaStatus.athlete?.firstname} {stravaStatus.athlete?.lastname}
                  </span>
                  <span className="text-xs text-[#94a3b8] block mt-0.5">
                    Athlete ID: <strong className="font-mono text-white">{stravaStatus.athlete?.id}</strong>
                    {stravaStatus.athlete?.city && ` • ${stravaStatus.athlete.city}, ${stravaStatus.athlete.country}`}
                  </span>
                </div>

                <Button
                  id="btn-disconnect-strava"
                  size="sm"
                  variant="danger"
                  onClick={onDisconnectStrava}
                  leftIcon={<LogOut className="w-3.5 h-3.5" />}
                >
                  Disconnect
                </Button>
              </div>

              <div className="text-[11px] text-[#64748b] flex items-center gap-1.5 font-mono">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Scope: read, activity:read_all, activity:write (Auto-refreshes before expiry)</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Connect your Strava account to enable one-click uploads of your Mio Cyclo ride recordings (.fit and .gpx formats). CycloConnect intercepts the OAuth code in an isolated Electron window without exposing tokens.
              </p>

              <Button
                id="btn-connect-strava"
                variant="strava"
                onClick={onConnectStrava}
                leftIcon={<Zap className="w-4 h-4" />}
                className="px-6 py-2.5"
              >
                Authorize with Strava
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Komoot Settings Card */}
      <div className="p-6 rounded-2xl bg-[#0f141d] border border-[#1f2937] shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#1f2937]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Komoot Tours Integration</h3>
              <p className="text-xs text-[#94a3b8]">Internal API for planned route fetching & binary GPX streaming</p>
            </div>
          </div>

          {komootStatus.isAuthenticated ? (
            <Badge variant="emerald" dot>
              Connected
            </Badge>
          ) : (
            <Badge variant="zinc" dot>
              Not Signed In
            </Badge>
          )}
        </div>

        <div className="mt-5">
          {komootStatus.isAuthenticated ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#141a24] border border-[#1e293b] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#64748b] block">Komoot User</span>
                  <span className="text-base font-bold text-white">
                    {komootStatus.user?.display_name || komootStatus.user?.id}
                  </span>
                  <span className="text-xs text-[#94a3b8] block mt-0.5">
                    User ID: <strong className="font-mono text-white">{komootStatus.user?.id}</strong>
                    {komootStatus.user?.email && ` • ${komootStatus.user.email}`}
                  </span>
                </div>

                <Button
                  id="btn-logout-komoot"
                  size="sm"
                  variant="danger"
                  onClick={onLogoutKomoot}
                  leftIcon={<LogOut className="w-3.5 h-3.5" />}
                >
                  Log Out
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleKomootSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#94a3b8] block mb-1.5">Email</label>
                  <input
                    id="settings-komoot-email"
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={komootEmail}
                    onChange={(e) => setKomootEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#141a24] border border-[#232d3f] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#94a3b8] block mb-1.5">Password</label>
                  <input
                    id="settings-komoot-pass"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={komootPassword}
                    onChange={(e) => setKomootPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#141a24] border border-[#232d3f] text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <Button
                id="btn-settings-komoot-login"
                type="submit"
                variant="primary"
                isLoading={isLoading}
                leftIcon={<Compass className="w-4 h-4" />}
                className="px-6 py-2.5"
              >
                Log In to Komoot
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Connected Device & Storage Diagnostics */}
      <div className="p-6 rounded-2xl bg-[#0f141d] border border-[#1f2937] shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1f2937]">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-[#38bdf8]" />
            <h3 className="text-sm font-bold text-white">USB Device Diagnostics & Storage</h3>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={onRescanDevice}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Rescan USB Disks
          </Button>
        </div>

        <p className="text-xs text-[#94a3b8] leading-relaxed">
          CycloConnect monitors connected removable storage volumes to locate your Mio Cyclo navigation computer.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#94a3b8]">
          <div className="p-3 rounded-lg bg-[#121824] border border-[#1e293b]">
            <strong className="text-white block mb-1">Target Volume</strong>
            <span className="font-mono text-emerald-400">{device ? device.volumeName : 'Mio_data'}</span>
            <p className="text-[11px] text-[#64748b] mt-1">Mio Cyclo filesystem partition</p>
          </div>

          <div className="p-3 rounded-lg bg-[#121824] border border-[#1e293b]">
            <strong className="text-white block mb-1">Connection State</strong>
            <span className={`font-mono ${device?.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {device?.connected ? `${device.modelName || 'Mio Cyclo'} (${device.deviceId})` : 'Disconnected'}
            </span>
            <p className="text-[11px] text-[#64748b] mt-1">{device?.connected ? 'Device mounted and ready' : 'Plug in via USB data cable'}</p>
          </div>

          <div className="p-3 rounded-lg bg-[#121824] border border-[#1e293b]">
            <strong className="text-white block mb-1">Tracks Directory</strong>
            <span className="font-mono text-[#fc4c02] truncate block">{device?.connected ? device.tracksPath : '${drive}\\Dodge\\Tracks'}</span>
            <p className="text-[11px] text-[#64748b] mt-1">Stores tracks & ride history</p>
          </div>
        </div>
      </div>
    </div>
  );
};
