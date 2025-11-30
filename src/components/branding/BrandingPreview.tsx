import { cn } from '@/lib/utils';
import { Bell, Calendar, Home, User, UtensilsCrossed } from 'lucide-react';

interface BrandingPreviewProps {
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  theme: string;
  wordmark: string;
  resortName: string;
}

export function BrandingPreview({
  logoUrl,
  primaryColor,
  accentColor,
  theme,
  wordmark,
  resortName,
}: BrandingPreviewProps) {
  const isDark = theme === 'DARK';
  const effectivePrimary = primaryColor || '#0E7490';
  const effectiveAccent = accentColor || '#D8C7A6';

  // Generate contrasting text color based on primary
  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#111827' : '#FFFFFF';
  };

  const primaryTextColor = getContrastColor(effectivePrimary);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground">Live Preview</div>
      <p className="text-xs text-muted-foreground">
        See how your branding will appear in the guest portal.
      </p>

      {/* Preview Container */}
      <div
        className={cn(
          'rounded-xl border overflow-hidden shadow-lg transition-colors',
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-border'
        )}
        style={{ maxWidth: '320px' }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center gap-3"
          style={{ backgroundColor: effectivePrimary }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Resort logo"
              className="h-10 w-10 object-contain rounded"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div
              className="h-10 w-10 rounded flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: effectiveAccent,
                color: getContrastColor(effectiveAccent),
              }}
            >
              {resortName?.slice(0, 2).toUpperCase() || 'PR'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div
              className="font-semibold truncate text-sm"
              style={{ color: primaryTextColor }}
            >
              {resortName || 'Resort Name'}
            </div>
            {wordmark && (
              <div
                className="text-xs truncate opacity-80"
                style={{ color: primaryTextColor }}
              >
                {wordmark}
              </div>
            )}
          </div>
          <Bell
            className="h-5 w-5"
            style={{ color: primaryTextColor }}
          />
        </div>

        {/* Content */}
        <div
          className={cn('p-4 space-y-3', isDark ? 'bg-slate-800' : 'bg-muted/30')}
        >
          {/* Welcome Message */}
          <div
            className={cn(
              'rounded-lg p-3',
              isDark ? 'bg-slate-900' : 'bg-background'
            )}
          >
            <div
              className={cn(
                'text-sm font-medium',
                isDark ? 'text-white' : 'text-foreground'
              )}
            >
              Good afternoon, Guest
            </div>
            <div
              className={cn(
                'text-xs mt-1',
                isDark ? 'text-slate-400' : 'text-muted-foreground'
              )}
            >
              Here's what's happening today
            </div>
          </div>

          {/* Activity Card */}
          <div
            className={cn(
              'rounded-lg p-3 border',
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-background border-border'
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded flex items-center justify-center shrink-0"
                style={{ backgroundColor: effectiveAccent }}
              >
                <Calendar
                  className="h-5 w-5"
                  style={{ color: getContrastColor(effectiveAccent) }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-sm font-medium',
                    isDark ? 'text-white' : 'text-foreground'
                  )}
                >
                  Sunset Dolphin Cruise
                </div>
                <div
                  className={cn(
                    'text-xs',
                    isDark ? 'text-slate-400' : 'text-muted-foreground'
                  )}
                >
                  Today at 5:30 PM
                </div>
                <button
                  className="mt-2 text-xs px-3 py-1 rounded-full font-medium transition-colors"
                  style={{
                    backgroundColor: effectivePrimary,
                    color: primaryTextColor,
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          </div>

          {/* Restaurant Card */}
          <div
            className={cn(
              'rounded-lg p-3 border',
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-background border-border'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded flex items-center justify-center shrink-0"
                style={{ backgroundColor: effectivePrimary + '20' }}
              >
                <UtensilsCrossed
                  className="h-4 w-4"
                  style={{ color: effectivePrimary }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-sm font-medium',
                    isDark ? 'text-white' : 'text-foreground'
                  )}
                >
                  Dinner at The Reef
                </div>
                <div
                  className={cn(
                    'text-xs',
                    isDark ? 'text-slate-400' : 'text-muted-foreground'
                  )}
                >
                  7:30 PM · 2 guests
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Nav */}
        <div
          className={cn(
            'flex items-center justify-around py-3 border-t',
            isDark ? 'bg-slate-900 border-slate-700' : 'bg-background border-border'
          )}
        >
          {[
            { icon: Home, label: 'Home', active: true },
            { icon: Calendar, label: 'Bookings', active: false },
            { icon: UtensilsCrossed, label: 'Dining', active: false },
            { icon: User, label: 'Account', active: false },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1">
              <item.icon
                className="h-5 w-5"
                style={{
                  color: item.active
                    ? effectivePrimary
                    : isDark
                    ? '#94A3B8'
                    : '#9CA3AF',
                }}
              />
              <span
                className="text-[10px]"
                style={{
                  color: item.active
                    ? effectivePrimary
                    : isDark
                    ? '#94A3B8'
                    : '#9CA3AF',
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Theme indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div
          className="w-3 h-3 rounded-full border"
          style={{ backgroundColor: effectivePrimary }}
        />
        <span>Primary</span>
        <div
          className="w-3 h-3 rounded-full border ml-2"
          style={{ backgroundColor: effectiveAccent }}
        />
        <span>Accent</span>
        <span className="ml-2 px-2 py-0.5 rounded bg-muted text-[10px] uppercase">
          {theme || 'Light'}
        </span>
      </div>
    </div>
  );
}
