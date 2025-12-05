import React from "react";

interface ProperaLogoProps {
  className?: string;
  size?: number;
  variant?: "full" | "mark" | "wordmark";
  showWordmark?: boolean;
}

// The Propera mark - a stylized "P" with a horizon line representing resort/ocean
export const ProperaMark: React.FC<{ className?: string; size?: number }> = ({
  className = "",
  size = 32,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Propera"
  >
    {/* Outer circle - represents the sun/horizon */}
    <circle
      cx="16"
      cy="16"
      r="14"
      stroke="currentColor"
      strokeWidth="2"
      className="text-primary"
    />
    {/* Stylized P - vertical bar */}
    <path
      d="M11 8V24"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="text-sand"
    />
    {/* P curve - representing the horizon/wave */}
    <path
      d="M11 8H17C19.7614 8 22 10.2386 22 13C22 15.7614 19.7614 18 17 18H11"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-sand"
    />
    {/* Horizon line */}
    <path
      d="M6 20H26"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="text-primary opacity-60"
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
    {/* Background */}
    <rect width="32" height="32" rx="6" fill="#050A14" />
    {/* Circle */}
    <circle cx="16" cy="16" r="11" stroke="#2F8C84" strokeWidth="2" />
    {/* P mark */}
    <path
      d="M12 9V23"
      stroke="#E5D4B3"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M12 9H16.5C18.7091 9 20.5 10.7909 20.5 13C20.5 15.2091 18.7091 17 16.5 17H12"
      stroke="#E5D4B3"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ProperaLogo;
