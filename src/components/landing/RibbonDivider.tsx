import { memo } from 'react';

interface RibbonDividerProps {
  className?: string;
  variant?: 'default' | 'accent' | 'subtle';
}

export const RibbonDivider = memo(function RibbonDivider({ 
  className = '', 
  variant = 'default' 
}: RibbonDividerProps) {
  const gradients = {
    default: 'from-transparent via-primary/40 to-transparent',
    accent: 'from-transparent via-teal-400/50 to-transparent',
    subtle: 'from-transparent via-border/60 to-transparent',
  };

  return (
    <div className={`relative w-full h-px ${className}`}>
      {/* Main ribbon line */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradients[variant]}`} />
      
      {/* Curved accent */}
      <svg 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-4 opacity-60"
        viewBox="0 0 128 16" 
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        <path 
          d="M0 8 Q32 2, 64 8 T128 8" 
          stroke="url(#ribbon-gradient)" 
          strokeWidth="1.5" 
          fill="none"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="ribbon-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(175 50% 45%)" stopOpacity="0" />
            <stop offset="30%" stopColor="hsl(175 50% 45%)" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(175 50% 55%)" stopOpacity="0.8" />
            <stop offset="70%" stopColor="hsl(175 50% 45%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(175 50% 45%)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
});
