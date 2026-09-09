import React from 'react';
import {
  Home,
  Shield,
  Compass,
  HardDrive,
  Settings,
  ChevronRight,
  ChevronLeft,
  Bike,
  Activity,
} from 'lucide-react';

interface SidebarRailProps {
  activeTab: 'dashboard' | 'route' | 'rides' | 'komoot' | 'device' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'route' | 'rides' | 'komoot' | 'device' | 'settings') => void;
  isCollapsed: boolean;
  setIsCollapsed: (c: boolean) => void;
  isRealHardware?: boolean;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isRealHardware,
}) => {
  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: Home,
    },
    {
      id: 'route' as const,
      label: 'Tactical Route & Map',
      icon: Shield,
    },
    {
      id: 'rides' as const,
      label: 'Ride Recordings',
      icon: Bike,
    },
    {
      id: 'komoot' as const,
      label: 'Komoot Routes',
      icon: Compass,
    },
    {
      id: 'device' as const,
      label: 'Mio Storage & USB',
      icon: HardDrive,
    },
    {
      id: 'settings' as const,
      label: 'Settings & Cloud',
      icon: Settings,
    },
  ];

  return (
    <aside
      className={`bg-[#0d0f12] border-r border-[#1e232a] flex flex-col justify-between py-5 transition-all duration-200 z-30 shrink-0 ${
        isCollapsed ? 'w-18 px-2.5 items-center' : 'w-56 px-4'
      }`}
    >
      {/* Top Logo & App Branding */}
      <div className="flex flex-col items-center">
        <div
          onClick={() => setActiveTab('dashboard')}
          className="cursor-pointer group flex items-center gap-3 w-full"
        >
          {/* Circular Badge matching image.png top logo */}
          <div className="w-10 h-10 rounded-full bg-[#161a22] border border-[#2c3545] group-hover:border-[#00e599] flex items-center justify-center text-[#00e599] shadow-lg shadow-black/60 shrink-0 transition-all">
            <div className="relative flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#00e599] group-hover:rotate-45 transition-transform duration-300" />
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#00e599] animate-pulse" />
            </div>
          </div>

          {!isCollapsed && (
            <div className="min-w-0">
              <span className="text-sm font-extrabold tracking-tight text-white block">
                Cyclo<span className="text-[#00e599]">Connect</span>
              </span>
              <span className="text-[10px] text-[#6b7280] font-mono block -mt-0.5">
                {isRealHardware ? 'Mio USB Live' : 'Mio Cyclo Hub'}
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-full my-6 h-[1px] bg-[#1a1f26]" />

        {/* Navigation List */}
        <nav className="w-full space-y-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`w-full flex items-center gap-3.5 transition-all rounded-xl ${
                  isCollapsed ? 'justify-center p-3' : 'px-3.5 py-3'
                } ${
                  isActive
                    ? 'bg-[#16191d] border border-[#00e599] text-[#00e599] shadow-lg shadow-[#00e599]/10 font-bold'
                    : 'text-[#6b7280] hover:text-[#e2e8f0] hover:bg-[#14171d] border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#00e599]' : ''}`} />
                {!isCollapsed && (
                  <span className="text-xs font-semibold tracking-wide truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Rail Section with Collapse Toggle */}
      <div className="pt-4 border-t border-[#1a1f26] w-full flex flex-col items-center gap-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2 rounded-xl text-[#6b7280] hover:text-white hover:bg-[#16191d] transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
