import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'strava' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080a0f] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none';

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.2 text-xs sm:text-sm gap-2',
    lg: 'px-6 py-2.8 text-sm sm:text-base gap-2.5',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 focus-visible:ring-emerald-400',
    strava:
      'bg-[#fc4c02] hover:bg-[#e04000] text-white font-bold shadow-lg shadow-[#fc4c02]/25 focus-visible:ring-[#fc4c02]',
    secondary:
      'bg-[#162030] hover:bg-[#1e2b40] text-white border border-[#2d3a4f] shadow-sm focus-visible:ring-cyan-400',
    outline:
      'bg-transparent hover:bg-[#162030] text-slate-300 hover:text-white border border-[#2d3a4f] focus-visible:ring-slate-400',
    ghost:
      'bg-transparent hover:bg-[#162030] text-slate-400 hover:text-white focus-visible:ring-slate-400',
    danger:
      'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 focus-visible:ring-rose-400',
  };

  const isDisabled = disabled || isLoading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

