import { useState, useEffect } from 'react';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useIsPrearrivalGuest, usePrearrivalData } from '@/hooks/usePrearrivalData';
import { PreArrivalPromptScreen } from '@/components/guest/prearrival/PreArrivalPromptScreen';
import { PrearrivalWizard } from '@/components/guest/prearrival/PrearrivalWizard';

const SKIP_STORAGE_KEY = 'preArrivalSkippedUntil';
const SKIP_DURATION_HOURS = 24;

interface GuestPortalGateProps {
  children: React.ReactNode;
}

export function GuestPortalGate({ children }: GuestPortalGateProps) {
  const { guest } = useGuestAuth();
  const { isPrearrival, daysUntilArrival } = useIsPrearrivalGuest();
  const { data: prearrivalData, isLoading } = usePrearrivalData();
  
  const [showPrompt, setShowPrompt] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    // Skip if still loading
    if (isLoading) {
      return;
    }

    // Skip if not in pre-arrival phase
    if (!isPrearrival) {
      setShowPrompt(false);
      return;
    }

    // Skip if pre-arrival not enabled for this resort
    if (!prearrivalData?.settings?.is_enabled) {
      setShowPrompt(false);
      return;
    }

    // Skip if already completed
    if (prearrivalData?.profile?.prearrival_status === 'completed') {
      setShowPrompt(false);
      return;
    }

    // Check localStorage skip marker
    try {
      const skippedUntil = localStorage.getItem(SKIP_STORAGE_KEY);
      if (skippedUntil) {
        const skipExpiry = new Date(skippedUntil);
        if (skipExpiry > new Date()) {
          // Still within skip window
          setShowPrompt(false);
          return;
        }
        // Expired, clean up
        localStorage.removeItem(SKIP_STORAGE_KEY);
      }
    } catch {
      // localStorage not available, continue showing prompt
    }

    // All conditions met: show the prompt
    setShowPrompt(true);
  }, [isPrearrival, prearrivalData, isLoading]);

  const handleSkip = () => {
    try {
      // Skip for configured duration
      const skipUntil = new Date(Date.now() + SKIP_DURATION_HOURS * 60 * 60 * 1000);
      localStorage.setItem(SKIP_STORAGE_KEY, skipUntil.toISOString());
    } catch {
      // localStorage not available, just dismiss for this session
    }
    setShowPrompt(false);
  };

  const handleComplete = () => {
    setWizardOpen(true);
  };

  const handleWizardClose = (open: boolean) => {
    setWizardOpen(open);
    if (!open) {
      // After wizard closes, hide the prompt
      // The query will auto-refetch and update prearrivalData
      setShowPrompt(false);
    }
  };

  // Don't block during loading - show children
  if (isLoading) {
    return <>{children}</>;
  }

  // Show prompt if conditions are met
  if (showPrompt && guest) {
    const firstName = String(guest.fullName ?? 'Guest').split(' ')[0] || 'Guest';
    
    return (
      <>
        <PreArrivalPromptScreen
          onComplete={handleComplete}
          onSkip={handleSkip}
          guestFirstName={firstName}
          checkInDate={guest.checkInDate}
          settings={prearrivalData?.settings}
          resortName={guest.resortName}
          resortLogoUrl={guest.resortLogoUrl}
        />
        
        {/* Pre-arrival wizard dialog */}
        {prearrivalData?.settings && (
          <PrearrivalWizard
            open={wizardOpen}
            onOpenChange={handleWizardClose}
            profile={prearrivalData.profile || null}
            settings={prearrivalData.settings}
            checkInDate={guest.checkInDate}
          />
        )}
      </>
    );
  }

  // Normal portal content
  return <>{children}</>;
}
