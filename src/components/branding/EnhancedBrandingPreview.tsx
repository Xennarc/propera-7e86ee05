import { cn } from '@/lib/utils';
import { Bell, Calendar, Home, User, UtensilsCrossed, LogIn, Smartphone, Tablet, Monitor } from 'lucide-react';
import { useState } from 'react';

interface EnhancedBrandingPreviewProps {
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  theme: string;
  wordmark: string;
  resortName: string;
  heroImageUrl?: string;
  homeHeroImageUrl?: string;
  loginTitle?: string;
  loginSubtitle?: string;
  // New enhanced props
  buttonStyle?: 'rounded' | 'pill' | 'squared';
  cardStyle?: 'elevated' | 'outlined' | 'flat';
  cornerRadius?: number;
  fontFamily?: string;
  backgroundTint?: string;
}

type PreviewMode = 'portal' | 'home' | 'login';
type DeviceFrame = 'phone' | 'tablet' | 'desktop';

const DEVICE_FRAMES: { value: DeviceFrame; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { value: 'phone', icon: Smartphone, label: 'Phone' },
  { value: 'tablet', icon: Tablet, label: 'Tablet' },
  { value: 'desktop', icon: Monitor, label: 'Desktop' },
];

export function EnhancedBrandingPreview({
  logoUrl,
  primaryColor,
  accentColor,
  theme,
  wordmark,
  resortName,
  heroImageUrl,
  homeHeroImageUrl,
  loginTitle,
  loginSubtitle,
  buttonStyle = 'rounded',
  cardStyle = 'elevated',
  cornerRadius = 12,
  fontFamily = 'Plus Jakarta Sans',
  backgroundTint,
}: EnhancedBrandingPreviewProps) {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('portal');
  const [deviceFrame, setDeviceFrame] = useState<DeviceFrame>('phone');
  
  const isDark = theme === 'DARK';
  const effectivePrimary = primaryColor || '#0E7490';
  const effectiveAccent = accentColor || '#D8C7A6';

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

  const getButtonRadius = () => {
    switch (buttonStyle) {
      case 'pill': return '9999px';
      case 'squared': return '4px';
      default: return `${Math.min(cornerRadius, 12)}px`;
    }
  };

  const getCardClass = () => {
    switch (cardStyle) {
      case 'outlined': return 'border-2 shadow-none';
      case 'flat': return 'border-transparent bg-muted/50 shadow-none';
      default: return 'shadow-md border';
    }
  };

  const deviceWidth = deviceFrame === 'phone' ? 280 : deviceFrame === 'tablet' ? 400 : 520;
  const deviceHeight = deviceFrame === 'phone' ? 520 : deviceFrame === 'tablet' ? 600 : 380;

  return (
    <div className="space-y-4">
      {/* Controls Row */}
      <div className="flex flex-wrap gap-2">
        {/* Preview Mode Toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg flex-1 min-w-[200px]">
          <button
            onClick={() => setPreviewMode('portal')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all',
              previewMode === 'portal' 
                ? 'bg-background shadow-sm text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Portal
          </button>
          <button
            onClick={() => setPreviewMode('home')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all',
              previewMode === 'home' 
                ? 'bg-background shadow-sm text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Home className="h-3 w-3" />
            Home
          </button>
          <button
            onClick={() => setPreviewMode('login')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all',
              previewMode === 'login' 
                ? 'bg-background shadow-sm text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LogIn className="h-3 w-3" />
            Login
          </button>
        </div>

        {/* Device Frame Toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          {DEVICE_FRAMES.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setDeviceFrame(value)}
              title={label}
              className={cn(
                'flex items-center justify-center p-1.5 rounded-md transition-all',
                deviceFrame === value 
                  ? 'bg-background shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Device Frame Container */}
      <div className="flex justify-center">
        <div 
          className={cn(
            'relative transition-all duration-300 ease-out',
            deviceFrame === 'phone' && 'rounded-[32px] p-2 bg-slate-800 shadow-2xl',
            deviceFrame === 'tablet' && 'rounded-[24px] p-3 bg-slate-800 shadow-2xl',
            deviceFrame === 'desktop' && 'rounded-xl p-1 bg-slate-700 shadow-xl'
          )}
          style={{ 
            width: deviceWidth + (deviceFrame === 'desktop' ? 8 : deviceFrame === 'tablet' ? 24 : 16),
            fontFamily: `"${fontFamily}", sans-serif`
          }}
        >
          {/* Phone notch */}
          {deviceFrame === 'phone' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-slate-800 rounded-b-2xl z-20 flex items-center justify-center">
              <div className="w-10 h-1.5 bg-slate-700 rounded-full" />
            </div>
          )}

          {/* Preview Content */}
          <div
            className={cn(
              'overflow-hidden transition-all',
              deviceFrame === 'phone' && 'rounded-[24px]',
              deviceFrame === 'tablet' && 'rounded-[16px]',
              deviceFrame === 'desktop' && 'rounded-lg'
            )}
            style={{ 
              width: deviceWidth, 
              height: deviceHeight,
              backgroundColor: backgroundTint || (isDark ? '#0f172a' : '#ffffff')
            }}
          >
            {previewMode === 'portal' ? (
              <PortalPreviewContent
                logoUrl={logoUrl}
                effectivePrimary={effectivePrimary}
                effectiveAccent={effectiveAccent}
                primaryTextColor={primaryTextColor}
                isDark={isDark}
                resortName={resortName}
                wordmark={wordmark}
                getContrastColor={getContrastColor}
                buttonRadius={getButtonRadius()}
                cardClass={getCardClass()}
                cornerRadius={cornerRadius}
              />
            ) : previewMode === 'home' ? (
              <HomePreviewContent
                logoUrl={logoUrl}
                effectivePrimary={effectivePrimary}
                effectiveAccent={effectiveAccent}
                primaryTextColor={primaryTextColor}
                isDark={isDark}
                resortName={resortName}
                heroImageUrl={homeHeroImageUrl || heroImageUrl}
                getContrastColor={getContrastColor}
                buttonRadius={getButtonRadius()}
                cardClass={getCardClass()}
                cornerRadius={cornerRadius}
              />
            ) : (
              <LoginPreviewContent
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
                buttonRadius={getButtonRadius()}
                cornerRadius={cornerRadius}
              />
            )}
          </div>

          {/* Home indicator for phone */}
          {deviceFrame === 'phone' && (
            <div className="flex justify-center pt-1">
              <div className="w-24 h-1 bg-slate-600 rounded-full" />
            </div>
          )}
        </div>
      </div>

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

// Portal Preview Content
function PortalPreviewContent({
  logoUrl,
  effectivePrimary,
  effectiveAccent,
  primaryTextColor,
  isDark,
  resortName,
  wordmark,
  getContrastColor,
  buttonRadius,
  cardClass,
  cornerRadius,
}: {
  logoUrl: string;
  effectivePrimary: string;
  effectiveAccent: string;
  primaryTextColor: string;
  isDark: boolean;
  resortName: string;
  wordmark: string;
  getContrastColor: (hex: string) => string;
  buttonRadius: string;
  cardClass: string;
  cornerRadius: number;
}) {
  return (
    <div className={cn('h-full flex flex-col', isDark ? 'bg-slate-900' : 'bg-white')}>
      {/* Header */}
      <div
        className="p-3 flex items-center gap-2.5 shrink-0"
        style={{ backgroundColor: effectivePrimary }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Resort logo"
            className="h-8 w-8 object-contain"
            style={{ borderRadius: `${Math.max(cornerRadius - 4, 4)}px` }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div
            className="h-8 w-8 flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: effectiveAccent,
              color: getContrastColor(effectiveAccent),
              borderRadius: `${Math.max(cornerRadius - 4, 4)}px`,
            }}
          >
            {resortName?.slice(0, 2).toUpperCase() || 'PR'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate text-sm" style={{ color: primaryTextColor }}>
            {resortName || 'Resort Name'}
          </div>
          {wordmark && (
            <div className="text-[10px] truncate opacity-80" style={{ color: primaryTextColor }}>
              {wordmark}
            </div>
          )}
        </div>
        <Bell className="h-4 w-4" style={{ color: primaryTextColor }} />
      </div>

      {/* Content */}
      <div className={cn('flex-1 p-3 space-y-2.5 overflow-auto', isDark ? 'bg-slate-800' : 'bg-muted/30')}>
        {/* Welcome Card */}
        <div
          className={cn('p-2.5', cardClass, isDark ? 'bg-slate-900 border-slate-700' : 'bg-background border-border')}
          style={{ borderRadius: `${cornerRadius}px` }}
        >
          <div className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-foreground')}>
            Good afternoon, Guest
          </div>
          <div className={cn('text-[10px] mt-0.5', isDark ? 'text-slate-400' : 'text-muted-foreground')}>
            Here's what's happening today
          </div>
        </div>

        {/* Activity Card */}
        <div
          className={cn('p-2.5', cardClass, isDark ? 'bg-slate-900 border-slate-700' : 'bg-background border-border')}
          style={{ borderRadius: `${cornerRadius}px` }}
        >
          <div className="flex items-start gap-2.5">
            <div
              className="w-10 h-10 flex items-center justify-center shrink-0"
              style={{ backgroundColor: effectiveAccent, borderRadius: `${Math.max(cornerRadius - 4, 4)}px` }}
            >
              <Calendar className="h-4 w-4" style={{ color: getContrastColor(effectiveAccent) }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn('text-xs font-medium', isDark ? 'text-white' : 'text-foreground')}>
                Sunset Dolphin Cruise
              </div>
              <div className={cn('text-[10px]', isDark ? 'text-slate-400' : 'text-muted-foreground')}>
                Today at 5:30 PM
              </div>
              <button
                className="mt-1.5 text-[10px] px-2.5 py-1 font-medium"
                style={{
                  backgroundColor: effectivePrimary,
                  color: primaryTextColor,
                  borderRadius: buttonRadius,
                }}
              >
                View Details
              </button>
            </div>
          </div>
        </div>

        {/* Restaurant Card */}
        <div
          className={cn('p-2.5', cardClass, isDark ? 'bg-slate-900 border-slate-700' : 'bg-background border-border')}
          style={{ borderRadius: `${cornerRadius}px` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 flex items-center justify-center shrink-0"
              style={{ 
                backgroundColor: effectivePrimary + '20',
                borderRadius: `${Math.max(cornerRadius - 4, 4)}px` 
              }}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" style={{ color: effectivePrimary }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn('text-xs font-medium', isDark ? 'text-white' : 'text-foreground')}>
                Dinner at The Reef
              </div>
              <div className={cn('text-[10px]', isDark ? 'text-slate-400' : 'text-muted-foreground')}>
                7:30 PM · 2 guests
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className={cn(
        'flex items-center justify-around py-2 border-t shrink-0',
        isDark ? 'bg-slate-900 border-slate-700' : 'bg-background border-border'
      )}>
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
                color: item.active ? effectivePrimary : isDark ? '#94A3B8' : '#9CA3AF',
              }}
            />
            <span
              className="text-[9px]"
              style={{
                color: item.active ? effectivePrimary : isDark ? '#94A3B8' : '#9CA3AF',
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

// Home Preview Content (Guest Portal Home Page)
function HomePreviewContent({
  logoUrl,
  effectivePrimary,
  effectiveAccent,
  primaryTextColor,
  isDark,
  resortName,
  heroImageUrl,
  getContrastColor,
  buttonRadius,
  cardClass,
  cornerRadius,
}: {
  logoUrl: string;
  effectivePrimary: string;
  effectiveAccent: string;
  primaryTextColor: string;
  isDark: boolean;
  resortName: string;
  heroImageUrl?: string;
  getContrastColor: (hex: string) => string;
  buttonRadius: string;
  cardClass: string;
  cornerRadius: number;
}) {
  return (
    <div className={cn('h-full flex flex-col', isDark ? 'bg-slate-900' : 'bg-white')}>
      {/* Hero Section with Background Image */}
      <div className="relative shrink-0" style={{ height: '45%' }}>
        {heroImageUrl ? (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
          </div>
        ) : (
          <div 
            className="absolute inset-0"
            style={{ 
              background: `linear-gradient(135deg, ${effectivePrimary}40 0%, ${effectiveAccent}60 100%)` 
            }}
          />
        )}
        
        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-3">
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold text-white drop-shadow-sm">
              Good afternoon, Guest!
            </h1>
            <p className="text-white/75 text-[10px]">
              Welcome to {resortName}
            </p>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <span className="bg-white/20 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded-full">
              Jan 15 – Jan 22
            </span>
            <span className="bg-white/90 text-black text-[9px] px-2 py-0.5 rounded-full font-medium">
              Day 3 of 7
            </span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className={cn('flex-1 p-3 space-y-2 overflow-auto', isDark ? 'bg-slate-800' : 'bg-muted/30')}>
        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-1.5">
          {['Activities', 'Dining', 'Spa', 'Explore'].map((label, i) => (
            <div 
              key={label}
              className={cn(
                'flex flex-col items-center gap-1 p-1.5',
                cardClass,
                isDark ? 'bg-slate-900 border-slate-700' : 'bg-background border-border'
              )}
              style={{ borderRadius: `${cornerRadius - 4}px` }}
            >
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                style={{ backgroundColor: i === 0 ? effectivePrimary : effectiveAccent + '40' }}
              >
                {i === 0 ? '🏄' : i === 1 ? '🍽️' : i === 2 ? '💆' : '🗺️'}
              </div>
              <span className={cn('text-[8px]', isDark ? 'text-slate-300' : 'text-foreground')}>{label}</span>
            </div>
          ))}
        </div>

        {/* Today's Schedule Card */}
        <div
          className={cn('p-2', cardClass, isDark ? 'bg-slate-900 border-slate-700' : 'bg-background border-border')}
          style={{ borderRadius: `${cornerRadius}px` }}
        >
          <div className={cn('text-[10px] font-medium mb-1.5', isDark ? 'text-white' : 'text-foreground')}>
            Today's Schedule
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 flex items-center justify-center shrink-0"
              style={{ backgroundColor: effectiveAccent, borderRadius: `${Math.max(cornerRadius - 4, 4)}px` }}
            >
              <Calendar className="h-3.5 w-3.5" style={{ color: getContrastColor(effectiveAccent) }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn('text-[10px] font-medium', isDark ? 'text-white' : 'text-foreground')}>
                Snorkeling Trip
              </div>
              <div className={cn('text-[9px]', isDark ? 'text-slate-400' : 'text-muted-foreground')}>
                2:00 PM · Beach Dock
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className={cn(
        'flex items-center justify-around py-2 border-t shrink-0',
        isDark ? 'bg-slate-900 border-slate-700' : 'bg-background border-border'
      )}>
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
                color: item.active ? effectivePrimary : isDark ? '#94A3B8' : '#9CA3AF',
              }}
            />
            <span
              className="text-[9px]"
              style={{
                color: item.active ? effectivePrimary : isDark ? '#94A3B8' : '#9CA3AF',
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

// Login Preview Content
function LoginPreviewContent({
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
  buttonRadius,
  cornerRadius,
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
  buttonRadius: string;
  cornerRadius: number;
}) {
  return (
    <div className={cn('h-full relative', isDark ? 'bg-slate-900' : 'bg-white')}>
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
      <div className="relative z-10 p-4 flex flex-col h-full">
        {/* Logo & Resort Name */}
        <div className="flex items-center gap-2 mb-auto">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Resort logo"
              className="h-10 w-10 object-contain bg-white/90 p-1"
              style={{ borderRadius: `${Math.max(cornerRadius - 4, 4)}px` }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div
              className="h-10 w-10 flex items-center justify-center text-sm font-bold"
              style={{
                backgroundColor: effectiveAccent,
                color: getContrastColor(effectiveAccent),
                borderRadius: `${Math.max(cornerRadius - 4, 4)}px`,
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
          className={cn('p-4 backdrop-blur-sm', isDark ? 'bg-slate-800/90' : 'bg-white/95')}
          style={{ borderRadius: `${cornerRadius}px` }}
        >
          <div className="text-center mb-4">
            <h2 className={cn('text-base font-semibold', isDark ? 'text-white' : 'text-foreground')}>
              {loginTitle || `Welcome to ${resortName}`}
            </h2>
            {loginSubtitle && (
              <p className={cn('text-[10px] mt-1', isDark ? 'text-slate-400' : 'text-muted-foreground')}>
                {loginSubtitle}
              </p>
            )}
          </div>

          {/* Mock Form */}
          <div className="space-y-2.5">
            {['Room Number', 'Last Name', 'PIN ••••'].map((placeholder) => (
              <div
                key={placeholder}
                className={cn(
                  'h-8 border px-2 flex items-center text-[10px]',
                  isDark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-muted border-input text-muted-foreground'
                )}
                style={{ borderRadius: `${Math.max(cornerRadius - 4, 4)}px` }}
              >
                {placeholder}
              </div>
            ))}
            <button
              className="w-full h-9 text-xs font-medium transition-colors"
              style={{
                backgroundColor: effectivePrimary,
                color: primaryTextColor,
                borderRadius: buttonRadius,
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
