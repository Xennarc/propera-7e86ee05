/**
 * CertVerificationBadge – Guest-facing badge showing cert verification state.
 */
import { Award, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CertVerificationStatus } from '@/types/ops';

interface Props {
  certStatus: string | undefined;
  certVerificationStatus: string | undefined;
}

export function CertVerificationBadge({ certStatus, certVerificationStatus }: Props) {
  // Not required or not uploaded
  if (!certStatus || certStatus === 'not_required') return null;
  if (certStatus === 'unknown' || certStatus === 'missing') return null;

  const vs = (certVerificationStatus ?? 'unverified') as CertVerificationStatus;

  if (vs === 'not_required') return null;

  if (vs === 'verified') {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        <span className="text-success font-medium">Certification Verified</span>
      </div>
    );
  }

  if (vs === 'rejected') {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
        <span className="text-destructive font-medium">Certification Rejected — please re-upload</span>
      </div>
    );
  }

  // unverified
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Clock className="h-3.5 w-3.5 text-warning" />
      <span className="text-warning font-medium">Certification Uploaded — Awaiting verification</span>
    </div>
  );
}
