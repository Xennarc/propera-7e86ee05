import { LegacyTokenRedirect } from '@/components/guest/LegacyTokenRedirect';

/**
 * Legacy QR token login page - now redirects to standard login.
 * This page previously handled instant QR token authentication.
 * Now uses PIN-based or signed URL authentication instead.
 */
export default function GuestQrLoginPage() {
  return (
    <LegacyTokenRedirect
      title="This QR code format is no longer valid"
      message="We've upgraded our QR code system. Please ask staff for a new QR code, or log in with your room number, last name, and PIN."
      helpText="Ask staff for a new QR code or use manual login."
    />
  );
}
