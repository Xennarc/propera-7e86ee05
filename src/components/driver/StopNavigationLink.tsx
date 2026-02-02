import { ExternalLink, MapPin, Navigation2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StopLocation {
  lat?: number | null;
  lng?: number | null;
}

interface StopNavigationLinkProps {
  stopName: string;
  zone?: string | null;
  location?: StopLocation | null;
  className?: string;
  variant?: 'button' | 'link';
}

/**
 * Generates a maps URL for the given coordinates.
 * Prioritizes Google Maps on mobile, falls back to generic geo: URL.
 */
function getMapsUrl(lat: number, lng: number, label?: string): string {
  const encodedLabel = encodeURIComponent(label || 'Destination');
  
  // Check if we're on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    // Apple Maps
    return `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
  }
  
  // Google Maps (works on Android and desktop)
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodedLabel}`;
}

/**
 * Opens the device's native maps app for navigation.
 */
function openInMaps(lat: number, lng: number, label?: string) {
  const url = getMapsUrl(lat, lng, label);
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function StopNavigationLink({
  stopName,
  zone,
  location,
  className,
  variant = 'button',
}: StopNavigationLinkProps) {
  const hasCoordinates = location?.lat != null && location?.lng != null;

  if (variant === 'link') {
    if (hasCoordinates) {
      return (
        <button
          onClick={() => openInMaps(location!.lat!, location!.lng!, stopName)}
          className={cn(
            "inline-flex items-center gap-1 text-primary hover:underline text-sm",
            className
          )}
        >
          <Navigation2 className="h-3 w-3" />
          <span>Navigate</span>
        </button>
      );
    }
    
    // No coordinates - show zone/name only
    return (
      <span className={cn("text-sm text-muted-foreground flex items-center gap-1", className)}>
        <MapPin className="h-3 w-3" />
        {zone ? `${zone} - ${stopName}` : stopName}
      </span>
    );
  }

  // Button variant
  if (hasCoordinates) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => openInMaps(location!.lat!, location!.lng!, stopName)}
        className={cn("gap-2", className)}
      >
        <Navigation2 className="h-4 w-4" />
        Open in Maps
        <ExternalLink className="h-3 w-3 opacity-50" />
      </Button>
    );
  }

  // No coordinates - show info only
  return (
    <div className={cn(
      "flex items-center gap-2 text-sm text-muted-foreground py-1.5 px-3 rounded-md bg-muted",
      className
    )}>
      <MapPin className="h-4 w-4" />
      <span>{zone ? `Zone: ${zone}` : 'No coordinates'}</span>
    </div>
  );
}

export { openInMaps, getMapsUrl };
