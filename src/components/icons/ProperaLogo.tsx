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
