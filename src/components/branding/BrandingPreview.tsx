import { cn } from '@/lib/utils';
import { Bell, Calendar, Home, User, UtensilsCrossed, LogIn } from 'lucide-react';
import { useState } from 'react';

interface BrandingPreviewProps {
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  theme: string;
  wordmark: string;
  resortName: string;
  heroImageUrl?: string;
  loginTitle?: string;
  loginSubtitle?: string;
}

type PreviewMode = 'portal' | 'login';

export function BrandingPreview({
  logoUrl,
  primaryColor,
  accentColor,
  theme,
  wordmark,
  resortName,
  heroImageUrl,
  loginTitle,
  loginSubtitle,
}: BrandingPreviewProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('portal');
  const isDark = theme === 'DARK';
  const effectivePrimary = primaryColor || '#0E7490';
  const effectiveAccent = accentColor || '#D8C7A6';

  // Generate contrasting text color based on background
  const getContrastColor = (hex: string) => {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5 ? '#111827' : '#FFFFFF';
    } catch {
      return '#FFFFFF';
    }
  };

  const primaryTextColor = getContrastColor(effectivePrimary);

  return (
    <div className="space-y-4">
      {/* Preview Mode Toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setPreviewMode('portal')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all',
            previewMode === 'portal' 
              ? 'bg-background shadow-sm text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Home className="h-3 w-3" />
          Portal
        </button>
        <button
          onClick={() => setPreviewMode('login')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all',
            previewMode === 'login' 
              ? 'bg-background shadow-sm text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <LogIn className="h-3 w-3" />
          Login
        </button>
      </div>

      {/* Preview Container */}
      {previewMode === 'portal' ? (
        <PortalPreview
          logoUrl={logoUrl}
          effectivePrimary={effectivePrimary}
          effectiveAccent={effectiveAccent}
          primaryTextColor={primaryTextColor}
          isDark={isDark}
          resortName={resortName}
          wordmark={wordmark}
          getContrastColor={getContrastColor}
        />
      ) : (
        <LoginPreview
          logoUrl={logoUrl}
          effectivePrimary={effectivePrimary}
          effectiveAccent={effectiveAccent}
          primaryTextColor={primaryTextColor}
          isDark={isDark}
          resortName={resortName}
          heroImageUrl={heroImageUrl}
          loginTitle={loginTitle}
          loginSubtitle={loginSubtitle}
          getContrastColor={getContrastColor}
        />
      )}

      {/* Color Legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full border shadow-sm"
            style={{ backgroundColor: effectivePrimary }}
          />
          <span>Primary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full border shadow-sm"
            style={{ backgroundColor: effectiveAccent }}
          />
          <span>Accent</span>
        </div>
        <span className="ml-auto px-2 py-0.5 rounded bg-muted text-[10px] uppercase font-medium">
          {theme || 'Light'}
        </span>
      </div>
    </div>
  );
}

// Portal Preview Component
function PortalPreview({
  logoUrl,
  effectivePrimary,
  effectiveAccent,
  primaryTextColor,
  isDark,
  resortName,
  wordmark,
  getContrastColor,
}: {
  logoUrl: string;
  effectivePrimary: string;
  effectiveAccent: string;
  primaryTextColor: string;
  isDark: boolean;
  resortName: string;
  wordmark: string;
  getContrastColor: (hex: string) => string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden shadow-lg transition-colors',
        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-border'
      )}
      style={{ maxWidth: '320px' }}
    >
      {/* Header */}
      <div
        className="p-3 flex items-center gap-2.5"
        style={{ backgroundColor: effectivePrimary }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Resort logo"
            className="h-8 w-8 object-contain rounded"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div
            className="h-8 w-8 rounded flex items-center justify-center text-xs font-bold"
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
              className="text-[10px] truncate opacity-80"
              style={{ color: primaryTextColor }}
            >
              {wordmark}
            </div>
          )}
        </div>
        <Bell
          className="h-4 w-4"
          style={{ color: primaryTextColor }}
        />
      </div>

      {/* Content */}
      <div
        className={cn('p-3 space-y-2.5', isDark ? 'bg-slate-800' : 'bg-muted/30')}
      >
        {/* Welcome Message */}
        <div
          className={cn(
            'rounded-lg p-2.5',
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
              'text-[10px] mt-0.5',
              isDark ? 'text-slate-400' : 'text-muted-foreground'
            )}
          >
            Here's what's happening today
          </div>
        </div>

        {/* Activity Card */}
        <div
          className={cn(
            'rounded-lg p-2.5 border',
            isDark ? 'bg-slate-900 border-slate-700' : 'bg-background border-border'
          )}
        >
          <div className="flex items-start gap-2.5">
            <div
              className="w-10 h-10 rounded flex items-center justify-center shrink-0"
              style={{ backgroundColor: effectiveAccent }}
            >
              <Calendar
                className="h-4 w-4"
                style={{ color: getContrastColor(effectiveAccent) }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'text-xs font-medium',
                  isDark ? 'text-white' : 'text-foreground'
                )}
              >
                Sunset Dolphin Cruise
              </div>
              <div
                className={cn(
                  'text-[10px]',
                  isDark ? 'text-slate-400' : 'text-muted-foreground'
                )}
              >
                Today at 5:30 PM
              </div>
              <button
                className="mt-1.5 text-[10px] px-2.5 py-1 rounded-full font-medium"
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
            'rounded-lg p-2.5 border',
            isDark ? 'bg-slate-900 border-slate-700' : 'bg-background border-border'
          )}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded flex items-center justify-center shrink-0"
              style={{ backgroundColor: effectivePrimary + '20' }}
            >
              <UtensilsCrossed
                className="h-3.5 w-3.5"
                style={{ color: effectivePrimary }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'text-xs font-medium',
                  isDark ? 'text-white' : 'text-foreground'
                )}
              >
                Dinner at The Reef
              </div>
              <div
                className={cn(
                  'text-[10px]',
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
          'flex items-center justify-around py-2 border-t',
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-background border-border'
        )}
      >
        {[
          { icon: Home, label: 'Home', active: true },
          { icon: Calendar, label: 'Book', active: false },
          { icon: UtensilsCrossed, label: 'Dine', active: false },
          { icon: User, label: 'Me', active: false },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-0.5">
            <item.icon
              className="h-4 w-4"
              style={{
                color: item.active
                  ? effectivePrimary
                  : isDark
                  ? '#94A3B8'
                  : '#9CA3AF',
              }}
            />
            <span
              className="text-[9px]"
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
  );
}

// Login Preview Component
function LoginPreview({
  logoUrl,
  effectivePrimary,
  effectiveAccent,
  primaryTextColor,
  isDark,
  resortName,
  heroImageUrl,
  loginTitle,
  loginSubtitle,
  getContrastColor,
}: {
  logoUrl: string;
  effectivePrimary: string;
  effectiveAccent: string;
  primaryTextColor: string;
  isDark: boolean;
  resortName: string;
  heroImageUrl?: string;
  loginTitle?: string;
  loginSubtitle?: string;
  getContrastColor: (hex: string) => string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden shadow-lg transition-colors relative',
        isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-border'
      )}
      style={{ maxWidth: '320px', minHeight: '400px' }}
    >
      {/* Hero Background */}
      {heroImageUrl ? (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImageUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        </div>
      ) : (
        <div 
          className="absolute inset-0"
          style={{ 
            background: `linear-gradient(135deg, ${effectivePrimary}20 0%, ${effectiveAccent}40 100%)` 
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 p-4 flex flex-col h-full min-h-[400px]">
        {/* Logo & Resort Name */}
        <div className="flex items-center gap-2 mb-auto">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Resort logo"
              className="h-10 w-10 object-contain rounded bg-white/90 p-1"
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
          <div className={heroImageUrl ? 'text-white' : isDark ? 'text-white' : 'text-foreground'}>
            <div className="font-semibold text-sm">{resortName || 'Resort Name'}</div>
          </div>
        </div>

        {/* Login Card */}
        <div
          className={cn(
            'rounded-xl p-4 backdrop-blur-sm',
            isDark ? 'bg-slate-800/90' : 'bg-white/95'
          )}
        >
          {/* Title */}
          <div className="text-center mb-4">
            <h2
              className={cn(
                'text-base font-semibold',
                isDark ? 'text-white' : 'text-foreground'
              )}
            >
              {loginTitle || `Welcome to ${resortName}`}
            </h2>
            {loginSubtitle && (
              <p
                className={cn(
                  'text-[10px] mt-1',
                  isDark ? 'text-slate-400' : 'text-muted-foreground'
                )}
              >
                {loginSubtitle}
              </p>
            )}
          </div>

          {/* Mock Form */}
          <div className="space-y-2.5">
            <div
              className={cn(
                'h-8 rounded-md border px-2 flex items-center text-[10px]',
                isDark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-muted border-input text-muted-foreground'
              )}
            >
              Room Number
            </div>
            <div
              className={cn(
                'h-8 rounded-md border px-2 flex items-center text-[10px]',
                isDark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-muted border-input text-muted-foreground'
              )}
            >
              Last Name
            </div>
            <div
              className={cn(
                'h-8 rounded-md border px-2 flex items-center text-[10px]',
                isDark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-muted border-input text-muted-foreground'
              )}
            >
              PIN ••••
            </div>
            <button
              className="w-full h-9 rounded-md text-xs font-medium transition-colors"
              style={{
                backgroundColor: effectivePrimary,
                color: primaryTextColor,
              }}
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Powered by */}
        <div className={cn(
          'text-center text-[9px] mt-3',
          heroImageUrl ? 'text-white/60' : isDark ? 'text-slate-500' : 'text-muted-foreground'
        )}>
          Powered by Propera
        </div>
      </div>
    </div>
  );
}
