import React from 'react';
import { Usb, History, Compass, Search } from 'lucide-react';
import { Button } from './Button';

export type EmptyStateType = 'device-disconnected' | 'no-rides' | 'no-komoot' | 'search-empty';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  isLoading?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionText,
  onAction,
  isLoading,
}) => {
  const configs: Record<
    EmptyStateType,
    { icon: React.ReactNode; defaultTitle: string; defaultDescription: string; defaultAction?: string }
  > = {
    'device-disconnected': {
      icon: <Usb className="w-8 h-8 text-amber-400" />,
      defaultTitle: 'Mio Cyclo Disconnected',
      defaultDescription:
        'Connect your Mio Cyclo GPS computer using a USB data cable and select "Connect to PC" on the device screen.',
      defaultAction: 'Rescan USB Ports',
    },
    'no-rides': {
      icon: <History className="w-8 h-8 text-[#fc4c02]" />,
      defaultTitle: 'No Recorded Rides Found',
      defaultDescription:
        'Your Mio Cyclo does not have any recorded activities in the Dodge\\Tracks directory yet. Go for a ride to record your first track!',
      defaultAction: 'Import .FIT Activity',
    },
    'no-komoot': {
      icon: <Compass className="w-8 h-8 text-emerald-400" />,
      defaultTitle: 'No Planned Cycling Tours',
      defaultDescription:
        'You have no upcoming planned cycling routes on Komoot. Plan a route on komoot.com and it will appear here automatically.',
      defaultAction: 'Refresh Komoot Tours',
    },
    'search-empty': {
      icon: <Search className="w-8 h-8 text-slate-400" />,
      defaultTitle: 'No Matching Routes Found',
      defaultDescription: 'No tracks match your current filter or search criteria. Try adjusting your query.',
      defaultAction: 'Clear Filter',
    },
  };

  const config = configs[type];

  return (
    <div className="p-8 sm:p-12 rounded-2xl bg-[#0f141d] border border-[#1f2937] text-center max-w-lg mx-auto shadow-xl space-y-4">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-[#162030] border border-[#2d3a4f] flex items-center justify-center shadow-inner">
        {config.icon}
      </div>
      <div>
        <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">{title || config.defaultTitle}</h3>
        <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">{description || config.defaultDescription}</p>
      </div>
      {onAction && (
        <div className="pt-2">
          <Button variant="secondary" onClick={onAction} isLoading={isLoading}>
            {actionText || config.defaultAction}
          </Button>
        </div>
      )}
    </div>
  );
};

