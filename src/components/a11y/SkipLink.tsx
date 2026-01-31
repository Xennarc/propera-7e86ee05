import { cn } from '@/lib/utils';

interface SkipLinkProps {
  targetId?: string;
  className?: string;
}

/**
 * Accessible "Skip to main content" link.
 * Hidden until focused via keyboard navigation.
 */
export function SkipLink({ 
  targetId = 'main-content',
  className 
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        // Visually hidden until focused
        "sr-only focus:not-sr-only",
        // Positioning
        "fixed top-2 left-2 z-[100]",
        // Styling
        "bg-primary text-primary-foreground px-4 py-2 rounded-lg",
        "font-semibold text-sm shadow-lg",
        // Focus state
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        // Animation
        "transition-transform duration-200",
        "focus:translate-y-0",
        className
      )}
    >
      Skip to main content
    </a>
  );
}
