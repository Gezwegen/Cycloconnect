import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  const baseClasses = 'animate-pulse bg-[#161f2e] border border-[#1e293b]/50';

  const variantClasses = {
    rectangular: 'rounded-xl',
    circular: 'rounded-full',
    text: 'rounded-md h-4',
  }[variant];

  const style: React.CSSProperties = {
    width: width ?? undefined,
    height: height ?? undefined,
  };

  return <div className={`${baseClasses} ${variantClasses} ${className}`} style={style} />;
};

export const MetricCardSkeleton: React.FC = () => (
  <div className="p-5 rounded-2xl bg-[#0f141d] border border-[#1f2937] space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton variant="text" className="w-24" />
      <Skeleton variant="circular" className="w-6 h-6" />
    </div>
    <Skeleton variant="text" className="w-36 h-7" />
    <Skeleton variant="text" className="w-28 h-3" />
  </div>
);

export const TableRowSkeleton: React.FC = () => (
  <div className="flex items-center justify-between p-4 rounded-xl bg-[#0f141d] border border-[#1a2333] space-x-4">
    <div className="flex items-center space-x-3 flex-1">
      <Skeleton variant="circular" className="w-8 h-8 shrink-0" />
      <div className="space-y-1.5 flex-1">
        <Skeleton variant="text" className="w-1/3" />
        <Skeleton variant="text" className="w-1/4 h-3" />
      </div>
    </div>
    <Skeleton variant="rectangular" className="w-20 h-7" />
  </div>
);

