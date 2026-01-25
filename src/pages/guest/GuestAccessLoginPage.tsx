import { LegacyTokenRedirect } from '@/components/guest/LegacyTokenRedirect';

/**
 * Legacy guest access link page - now redirects to standard login.
 * This page previously consumed stay-based access link tokens.
 * Now uses PIN-based or signed URL authentication instead.
 */
export default function GuestAccessLoginPage() {
  return (
    <LegacyTokenRedirect
      title="This access link has been updated"
      message="We've upgraded our login system for better security. Please log in using your room number, last name, and PIN."
      helpText="Check your email for login credentials or contact the resort."
    />
  );
}
