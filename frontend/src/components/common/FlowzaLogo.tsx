import React from 'react';

interface FlowzaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textClassName?: string;
  className?: string;
  badge?: string;
  accent?: 'amber' | 'teal' | 'monochrome';
}

export const FlowzaLogo: React.FC<FlowzaLogoProps> = ({
  size = 'md',
  showText = true,
  textClassName = '',
  className = '',
  badge,
  accent = 'amber',
}) => {
  const sizeMap = {
    xs: { icon: 18, font: 'text-sm' },
    sm: { icon: 22, font: 'text-base' },
    md: { icon: 28, font: 'text-lg' },
    lg: { icon: 38, font: 'text-2xl' },
    xl: { icon: 48, font: 'text-3xl' },
  };

  const { icon: iconSize, font: fontSize } = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* Pure Vector Transparent Logomark (No Black Box) */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105"
      >
        <defs>
          <linearGradient id="flowza-amber-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="flowza-dark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
        </defs>

        {/* Primary Dynamic Structural F-Beams */}
        {/* Top Horizontal Bar */}
        <rect
          x="4"
          y="6"
          width="26"
          height="5.5"
          rx="2.5"
          className="fill-slate-900 dark:fill-white"
        />
        
        {/* Middle Offset Flow Beam with Accent */}
        <rect
          x="4"
          y="15.5"
          width="18"
          height="5"
          rx="2.5"
          fill="url(#flowza-amber-grad)"
        />

        {/* Vertical Anchor Stem */}
        <rect
          x="4"
          y="6"
          width="5.5"
          height="24"
          rx="2.5"
          className="fill-slate-900 dark:fill-white"
        />

        {/* Precision Geometric Pulse Node */}
        <circle
          cx="28.5"
          cy="22.5"
          r="3.5"
          fill="url(#flowza-amber-grad)"
        />
        <circle
          cx="28.5"
          cy="22.5"
          r="1.5"
          className="fill-white dark:fill-slate-950"
        />
      </svg>

      {/* Brand Logotype Typography */}
      {showText && (
        <div className="flex items-baseline gap-1.5 leading-none">
          <span
            className={`font-heading font-black tracking-tight text-slate-950 dark:text-white ${fontSize} ${textClassName}`}
          >
            FLOWZA
          </span>
          {badge && (
            <span className="text-[9px] uppercase font-mono font-bold tracking-widest px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
