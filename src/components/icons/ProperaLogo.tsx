import React from "react";

interface ProperaLogoProps {
  className?: string;
  size?: number;
  variant?: "full" | "mark" | "wordmark";
  showWordmark?: boolean;
}

// The Propera mark - a flowing ribbon-style "P" with layered gradients
export const ProperaMark: React.FC<{ className?: string; size?: number }> = ({
  className = "",
  size = 32,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Propera"
  >
    <defs>
      {/* Dark teal gradient for back ribbon */}
      <linearGradient id="ribbonBack" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0E7490" />
        <stop offset="50%" stopColor="#0891B2" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
      {/* Mid teal gradient for middle ribbon */}
      <linearGradient id="ribbonMid" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#14B8A6" />
        <stop offset="50%" stopColor="#2DD4BF" />
        <stop offset="100%" stopColor="#5EEAD4" />
      </linearGradient>
      {/* Light teal gradient for front ribbon */}
      <linearGradient id="ribbonFront" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#99F6E4" />
        <stop offset="50%" stopColor="#5EEAD4" />
        <stop offset="100%" stopColor="#2DD4BF" />
      </linearGradient>
      {/* Deep shadow gradient */}
      <linearGradient id="ribbonShadow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0F766E" />
        <stop offset="100%" stopColor="#115E59" />
      </linearGradient>
    </defs>
    
    {/* Back ribbon layer - darker, creates depth */}
    <path
      d="M16 6C16 6 12 8 12 16C12 24 12 38 16 42C18 44 20 44 22 42"
      stroke="url(#ribbonShadow)"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    
    {/* Middle ribbon - flowing curve of the P bowl */}
    <path
      d="M14 8C14 8 14 12 14 20C14 28 14 36 18 40"
      stroke="url(#ribbonBack)"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    
    {/* P bowl - the curved top part */}
    <path
      d="M18 10C22 8 32 8 36 14C40 20 38 28 32 30C26 32 20 30 18 26"
      stroke="url(#ribbonMid)"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    
    {/* Front flowing accent - light highlight */}
    <path
      d="M20 12C24 10 30 10 34 16C36 20 35 24 32 26"
      stroke="url(#ribbonFront)"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    
    {/* Inner highlight on stem */}
    <path
      d="M16 14C16 18 16 28 18 34"
      stroke="url(#ribbonFront)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity="0.7"
    />
  </svg>
);

// Animated loading variant of the Propera mark
export const ProperaMarkAnimated: React.FC<{ className?: string; size?: number }> = ({
  className = "",
  size = 48,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Propera Loading"
  >
    <defs>
      {/* Animated gradient for flowing effect */}
      <linearGradient id="animRibbonBack" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0E7490">
          <animate attributeName="stop-color" values="#0E7490;#14B8A6;#0E7490" dur="2s" repeatCount="indefinite" />
        </stop>
        <stop offset="50%" stopColor="#0891B2">
          <animate attributeName="stop-color" values="#0891B2;#2DD4BF;#0891B2" dur="2s" repeatCount="indefinite" />
        </stop>
        <stop offset="100%" stopColor="#06B6D4">
          <animate attributeName="stop-color" values="#06B6D4;#5EEAD4;#06B6D4" dur="2s" repeatCount="indefinite" />
        </stop>
      </linearGradient>
      
      <linearGradient id="animRibbonMid" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#14B8A6">
          <animate attributeName="stop-color" values="#14B8A6;#5EEAD4;#14B8A6" dur="1.5s" repeatCount="indefinite" />
        </stop>
        <stop offset="50%" stopColor="#2DD4BF">
          <animate attributeName="stop-color" values="#2DD4BF;#99F6E4;#2DD4BF" dur="1.5s" repeatCount="indefinite" />
        </stop>
        <stop offset="100%" stopColor="#5EEAD4">
          <animate attributeName="stop-color" values="#5EEAD4;#CCFBF1;#5EEAD4" dur="1.5s" repeatCount="indefinite" />
        </stop>
      </linearGradient>
      
      <linearGradient id="animRibbonFront" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#99F6E4">
          <animate attributeName="stop-color" values="#99F6E4;#CCFBF1;#99F6E4" dur="1.8s" repeatCount="indefinite" />
        </stop>
        <stop offset="100%" stopColor="#2DD4BF">
          <animate attributeName="stop-color" values="#2DD4BF;#5EEAD4;#2DD4BF" dur="1.8s" repeatCount="indefinite" />
        </stop>
      </linearGradient>
      
      <linearGradient id="animRibbonShadow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0F766E">
          <animate attributeName="stop-color" values="#0F766E;#0E7490;#0F766E" dur="2.2s" repeatCount="indefinite" />
        </stop>
        <stop offset="100%" stopColor="#115E59">
          <animate attributeName="stop-color" values="#115E59;#0F766E;#115E59" dur="2.2s" repeatCount="indefinite" />
        </stop>
      </linearGradient>
    </defs>
    
    {/* Back ribbon layer with draw animation */}
    <path
      d="M16 6C16 6 12 8 12 16C12 24 12 38 16 42C18 44 20 44 22 42"
      stroke="url(#animRibbonShadow)"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray="100"
      strokeDashoffset="0"
    >
      <animate 
        attributeName="stroke-dashoffset" 
        values="100;0;0;100" 
        dur="3s" 
        repeatCount="indefinite"
        keyTimes="0;0.4;0.6;1"
      />
      <animate 
        attributeName="opacity" 
        values="0.6;1;1;0.6" 
        dur="3s" 
        repeatCount="indefinite"
        keyTimes="0;0.4;0.6;1"
      />
    </path>
    
    {/* Middle ribbon with delayed draw animation */}
    <path
      d="M14 8C14 8 14 12 14 20C14 28 14 36 18 40"
      stroke="url(#animRibbonBack)"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray="80"
      strokeDashoffset="0"
    >
      <animate 
        attributeName="stroke-dashoffset" 
        values="80;0;0;80" 
        dur="3s" 
        begin="0.1s"
        repeatCount="indefinite"
        keyTimes="0;0.4;0.6;1"
      />
    </path>
    
    {/* P bowl with flowing animation */}
    <path
      d="M18 10C22 8 32 8 36 14C40 20 38 28 32 30C26 32 20 30 18 26"
      stroke="url(#animRibbonMid)"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray="90"
      strokeDashoffset="0"
    >
      <animate 
        attributeName="stroke-dashoffset" 
        values="90;0;0;90" 
        dur="3s" 
        begin="0.2s"
        repeatCount="indefinite"
        keyTimes="0;0.4;0.6;1"
      />
    </path>
    
    {/* Front flowing accent with shimmer */}
    <path
      d="M20 12C24 10 30 10 34 16C36 20 35 24 32 26"
      stroke="url(#animRibbonFront)"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray="60"
      strokeDashoffset="0"
    >
      <animate 
        attributeName="stroke-dashoffset" 
        values="60;0;0;60" 
        dur="3s" 
        begin="0.3s"
        repeatCount="indefinite"
        keyTimes="0;0.4;0.6;1"
      />
      <animate 
        attributeName="opacity" 
        values="0.5;1;1;0.5" 
        dur="3s" 
        begin="0.3s"
        repeatCount="indefinite"
        keyTimes="0;0.4;0.6;1"
      />
    </path>
    
    {/* Inner highlight with pulse */}
    <path
      d="M16 14C16 18 16 28 18 34"
      stroke="url(#animRibbonFront)"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray="40"
      strokeDashoffset="0"
    >
      <animate 
        attributeName="stroke-dashoffset" 
        values="40;0;0;40" 
        dur="3s" 
        begin="0.15s"
        repeatCount="indefinite"
        keyTimes="0;0.4;0.6;1"
      />
      <animate 
        attributeName="opacity" 
        values="0.3;0.8;0.8;0.3" 
        dur="3s" 
        begin="0.15s"
        repeatCount="indefinite"
        keyTimes="0;0.4;0.6;1"
      />
    </path>
  </svg>
);

// Loading spinner with animated logo
export const ProperaLoader: React.FC<{ 
  className?: string; 
  size?: number;
  text?: string;
}> = ({
  className = "",
  size = 48,
  text,
}) => (
  <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
    <ProperaMarkAnimated size={size} />
    {text && (
      <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
    )}
  </div>
);

// Full logo with wordmark
export const ProperaLogo: React.FC<ProperaLogoProps> = ({
  className = "",
  size = 32,
  variant = "full",
  showWordmark = true,
}) => {
  if (variant === "mark") {
    return <ProperaMark className={className} size={size} />;
  }

  if (variant === "wordmark") {
    return (
      <span
        className={`font-display font-semibold tracking-tight text-foreground ${className}`}
        style={{ fontSize: size * 0.625 }}
      >
        Propera
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <ProperaMark size={size} />
      {showWordmark && (
        <span
          className="font-display font-semibold tracking-tight text-foreground"
          style={{ fontSize: size * 0.625 }}
        >
          Propera
        </span>
      )}
    </div>
  );
};

// Favicon-optimized version (simpler for small sizes)
export const ProperaFavicon: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="favGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0E7490" />
        <stop offset="100%" stopColor="#14B8A6" />
      </linearGradient>
      <linearGradient id="favGradient2" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#2DD4BF" />
        <stop offset="100%" stopColor="#5EEAD4" />
      </linearGradient>
    </defs>
    {/* Background */}
    <rect width="32" height="32" rx="6" fill="#0F172A" />
    {/* Simplified flowing P */}
    <path
      d="M10 6C10 6 9 10 9 16C9 22 9 26 11 28"
      stroke="url(#favGradient1)"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M12 8C15 6 21 6 23 10C25 14 24 18 20 20C16 22 12 20 11 17"
      stroke="url(#favGradient2)"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export default ProperaLogo;
