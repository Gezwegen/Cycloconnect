import React from 'react';

export type BadgeVariant = 'emerald' | 'strava' | 'cyan' | 'amber' | 'zinc' | 'danger';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'zinc',
  className = '',
  dot = false,
  ...props
}) => {
  const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string; dotColor: string }> = {
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      dotColor: 'bg-emerald-400',
    },
    strava: {
      bg: 'bg-[#fc4c02]/10',
      text: 'text-[#fc4c02]',
      border: 'border-[#fc4c02]/25',
      dotColor: 'bg-[#fc4c02]',
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/20',
      dotColor: 'bg-cyan-400',
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      dotColor: 'bg-amber-400',
    },
    danger: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      dotColor: 'bg-rose-400',
    },
    zinc: {
      bg: 'bg-slate-800/60',
      text: 'text-slate-300',
      border: 'border-slate-700/50',
      dotColor: 'bg-slate-400',
    },
  };

  const style = variantStyles[variant];

  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dotColor} animate-pulse`} />}
      {children}
    </span>
  );
};
