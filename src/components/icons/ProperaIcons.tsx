import { cn } from '@/lib/utils';

interface IconProps {
  className?: string;
  size?: number;
}

// Custom Propera Icon System - Ocean-inspired resort icons
// Each icon uses theme-aware stroke colors via currentColor

export function IconPropera({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Palm tree over water wave */}
      <path d="M12 22v-8" />
      <path d="M12 14c-4-1-6-4-6-4 2.5-.5 5 0 6 1" />
      <path d="M12 14c4-1 6-4 6-4-2.5-.5-5 0-6 1" />
      <path d="M12 10c-3.5-2-4-5-4-5 2-.5 4 0 4 2" />
      <path d="M12 10c3.5-2 4-5 4-5-2-.5-4 0-4 2" />
      <path d="M3 22c2-2 5-2 9-2s7 0 9 2" />
      <path d="M2 18c4-1 8 0 10 1s6 2 10 1" className="opacity-50" />
    </svg>
  );
}

export function IconDashboard({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Abstract island with chart bars */}
      <rect x="3" y="14" width="4" height="7" rx="1" />
      <rect x="10" y="10" width="4" height="11" rx="1" />
      <rect x="17" y="6" width="4" height="15" rx="1" />
      <path d="M2 21c3-2 6-1 10 0s7 1 10-1" className="opacity-60" />
      <circle cx="6" cy="5" r="2" className="opacity-40" />
    </svg>
  );
}

export function IconGuests({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Stylized pair of people */}
      <circle cx="9" cy="7" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <path d="M17 21v-1.5a3 3 0 0 0-2-2.83" />
      <path d="M20 21v-1.5a3 3 0 0 0-3-3" />
    </svg>
  );
}

export function IconActivities({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Wave with snorkel/fin motif */}
      <path d="M2 12c2-3 4-4 6-3s4 3 6 3 4-2 6-3 4 0 6 3" />
      <path d="M2 16c2-2 4-3 6-2s4 2 6 2 4-1 6-2 4 0 6 2" className="opacity-50" />
      <path d="M10 8V4a2 2 0 0 1 4 0" />
      <circle cx="12" cy="4" r="1" />
      <path d="M15 9l3-3" />
    </svg>
  );
}

export function IconDiving({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Scuba tank and fin */}
      <ellipse cx="8" cy="12" rx="3" ry="6" />
      <path d="M8 6V4" />
      <circle cx="8" cy="3" r="1" />
      <path d="M5 12h6" />
      <path d="M14 10c2 0 4 1 6 3-2 2-4 3-6 3" />
      <path d="M14 16l6 4" />
    </svg>
  );
}

export function IconRestaurants({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Plate with palm leaf accent */}
      <circle cx="12" cy="14" r="7" />
      <circle cx="12" cy="14" r="4" className="opacity-50" />
      <path d="M18 5c-2 1-4 3-6 4" />
      <path d="M18 5c-1 2-1 4-1 6" className="opacity-60" />
      <path d="M18 5c1 2 2 4 2 6" className="opacity-40" />
    </svg>
  );
}

export function IconReports({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Chart inside rounded card */}
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7 16l3-4 3 2 4-6" />
      <circle cx="17" cy="8" r="1" />
      <path d="M7 20c3-1 6-1 10 0" className="opacity-40" />
    </svg>
  );
}

export function IconSettings({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Gear with wave element */}
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.93 19.07 1.41-1.41" />
      <path d="m17.66 6.34 1.41-1.41" />
      <path d="M3 22c4-2 8-2 12-2s5 0 6 2" className="opacity-30" />
    </svg>
  );
}

export function IconGuestRequests({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Inbox with star */}
      <path d="M3 9l4 6h10l4-6" />
      <rect x="3" y="9" width="18" height="12" rx="2" />
      <path d="M12 5l1 2 2 .5-1.5 1.5.5 2-2-1-2 1 .5-2L9 7.5l2-.5 1-2z" className="opacity-80" />
    </svg>
  );
}

export function IconStay({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Villa over water on stilts */}
      <path d="M4 10l8-6 8 6" />
      <rect x="6" y="10" width="12" height="7" rx="1" />
      <path d="M10 17v3" />
      <path d="M14 17v3" />
      <path d="M2 20c4-1 8-1 12 0s6 1 8 0" />
      <rect x="10" y="12" width="4" height="3" className="opacity-50" />
    </svg>
  );
}

export function IconCalendar({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Calendar with wave underline */}
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <circle cx="8" cy="14" r="1" />
      <circle cx="12" cy="14" r="1" />
      <circle cx="16" cy="14" r="1" />
      <path d="M2 22c4-1 8 0 10 0s6-1 10 0" className="opacity-40" />
    </svg>
  );
}

export function IconClock({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Clock with curved outer ring */}
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
      <path d="M4 4c-2 2-2 4-1 6" className="opacity-40" />
      <path d="M20 4c2 2 2 4 1 6" className="opacity-40" />
    </svg>
  );
}

export function IconFeedback({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Speech bubble with heart */}
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      <path d="M12 8.5c-.5-1.5-2.5-1.5-3 0-.3.8 0 1.7.7 2.3l2.3 2.2 2.3-2.2c.7-.6 1-1.5.7-2.3-.5-1.5-2.5-1.5-3 0z" className="opacity-80" />
    </svg>
  );
}

export function IconSuccess({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );
}

export function IconWarning({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function IconError({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6" />
      <path d="M9 9l6 6" />
    </svg>
  );
}

export function IconInfo({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function IconCheckmark({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      <path d="M5 12l5 5 9-9" />
    </svg>
  );
}

export function IconArrow({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

export function IconBack({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

export function IconBookings({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Clipboard with list */}
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v2" />
      <path d="M15 3v2" />
      <path d="M9 10h6" />
      <path d="M9 14h4" />
      <path d="M9 18h2" />
    </svg>
  );
}

export function IconResort({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Multiple buildings */}
      <rect x="3" y="10" width="6" height="11" rx="1" />
      <rect x="9" y="6" width="6" height="15" rx="1" />
      <rect x="15" y="10" width="6" height="11" rx="1" />
      <path d="M12 2v4" />
      <path d="M5 14h2" className="opacity-50" />
      <path d="M11 10h2" className="opacity-50" />
      <path d="M17 14h2" className="opacity-50" />
    </svg>
  );
}

export function IconLogout({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function IconWave({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      <path d="M2 6c2-2 4-2 6-1s4 3 6 3 4-2 6-3 4-1 6 1" />
      <path d="M2 12c2-2 4-2 6-1s4 3 6 3 4-2 6-3 4-1 6 1" className="opacity-70" />
      <path d="M2 18c2-2 4-2 6-1s4 3 6 3 4-2 6-3 4-1 6 1" className="opacity-40" />
    </svg>
  );
}

// Activity Category Icons

export function IconSpa({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Lotus flower icon */}
      <path d="M12 22c-4-3-7-6-7-10a7 7 0 0 1 14 0c0 4-3 7-7 10z" />
      <path d="M12 22c-1.5-2-2.5-4-2.5-6 0-2 1-3.5 2.5-4.5" className="opacity-60" />
      <path d="M12 22c1.5-2 2.5-4 2.5-6 0-2-1-3.5-2.5-4.5" className="opacity-60" />
      <path d="M12 2v6" className="opacity-40" />
      <path d="M8 4l4 4 4-4" className="opacity-40" />
    </svg>
  );
}

export function IconWatersports({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Surfboard/paddle icon */}
      <ellipse cx="12" cy="12" rx="3" ry="9" />
      <path d="M12 3v18" className="opacity-50" />
      <path d="M9 8h6" className="opacity-60" />
      <path d="M2 18c3-2 6-1 10 0s7-2 10 0" />
    </svg>
  );
}

export function IconExcursion({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Boat/speedboat icon */}
      <path d="M2 20l2-2h16l2 2" />
      <path d="M4 18l1-6h14l1 6" />
      <path d="M12 12V6" />
      <path d="M9 6h6" />
      <path d="M12 6l4-3" />
      <circle cx="8" cy="15" r="1" className="opacity-50" />
    </svg>
  );
}

export function IconSnorkeling({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Snorkel mask and tube */}
      <ellipse cx="12" cy="10" rx="6" ry="4" />
      <path d="M18 10v-4c0-1 1-2 2-2h1" />
      <circle cx="21" cy="3" r="1" />
      <path d="M6 10l-3 4" />
      <path d="M18 10l3 4" />
      <path d="M2 18c4-2 8-1 10 0s6-2 10 0" className="opacity-50" />
    </svg>
  );
}

export function IconFitness({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Dumbbell icon */}
      <path d="M6.5 6.5a2 2 0 0 0-3 0v11a2 2 0 0 0 3 0" />
      <path d="M17.5 6.5a2 2 0 0 1 3 0v11a2 2 0 0 1-3 0" />
      <path d="M6.5 12h11" />
      <path d="M3.5 9v6" />
      <path d="M20.5 9v6" />
    </svg>
  );
}

export function IconKids({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Happy face / child icon */}
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconTransfer({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Speedboat transfer icon */}
      <path d="M3 17l2-1h14l2 1" />
      <path d="M5 16l1-4h12l1 4" />
      <path d="M10 12V9h4v3" />
      <path d="M2 20c4-2 8-1 10 0s6-2 10 0" className="opacity-50" />
    </svg>
  );
}

export function IconBar({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Cocktail glass icon */}
      <path d="M8 2h8l-4 10" />
      <path d="M12 12v8" />
      <path d="M8 22h8" />
      <circle cx="6" cy="4" r="1" className="opacity-50" />
      <path d="M10 4h6" className="opacity-60" />
    </svg>
  );
}

export function IconOther({ className, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('propera-icon', className)}
    >
      {/* Star/spark icon */}
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
    </svg>
  );
}

// Wave Divider SVG component for section separators
export function WaveDivider({ 
  className, 
  flip = false,
  variant = 'subtle'
}: { 
  className?: string; 
  flip?: boolean;
  variant?: 'subtle' | 'bold';
}) {
  return (
    <svg
      viewBox="0 0 1440 120"
      fill="none"
      preserveAspectRatio="none"
      className={cn(
        'w-full h-16 md:h-24',
        flip && 'rotate-180',
        className
      )}
    >
      {variant === 'subtle' ? (
        <>
          <path
            d="M0 60C240 20 480 100 720 60C960 20 1200 100 1440 60V120H0V60Z"
            fill="currentColor"
            className="text-card/50"
          />
          <path
            d="M0 80C240 40 480 100 720 80C960 40 1200 100 1440 80V120H0V80Z"
            fill="currentColor"
            className="text-card"
          />
        </>
      ) : (
        <path
          d="M0 40C360 100 720 0 1080 60C1260 90 1380 70 1440 40V120H0V40Z"
          fill="currentColor"
          className="text-card"
        />
      )}
    </svg>
  );
}
