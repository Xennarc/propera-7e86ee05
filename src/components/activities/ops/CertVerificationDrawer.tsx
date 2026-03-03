/**
 * CertVerificationDrawer – Staff drawer to preview, verify, or reject a cert.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Loader2, Award, ExternalLink } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { CertVerificationStatus } from '@/types/ops';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  guestName: string;
  certMediaPath: string | null;
  currentStatus: CertVerificationStatus;
  certNotes: string | null;
  sessionId: string;
}

export function CertVerificationDrawer({
  open,
  onOpenChange,
  bookingId,
  guestName,
  certMediaPath,
  currentStatus,
  certNotes: existingNotes,
  sessionId,
}: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [notes, setNotes] = useState(existingNotes ?? '');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadPreview = async () => {
    if (!certMediaPath || previewUrl) return;
    setLoadingPreview(true);
    try {
      const { data, error } = await supabase.storage
        .from('activity-certs')
        .createSignedUrl(certMediaPath, 300); // 5 min
      if (error) throw error;
      setPreviewUrl(data.signedUrl);
    } catch {
      toast.error('Could not load cert preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Load preview when drawer opens
  if (open && !previewUrl && certMediaPath && !loadingPreview) {
    loadPreview();
  }

  const handleAction = async (status: CertVerificationStatus) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('activity_booking_readiness')
        .update({
          cert_verification_status: status,
          cert_verified_by: user?.id ?? null,
          cert_verified_at: new Date().toISOString(),
          cert_notes: notes.trim() || null,
          // If rejected, reset cert_status to 'missing' so guest re-uploads
          ...(status === 'rejected' ? { cert_status: 'missing' } : {}),
        } as any)
        .eq('booking_id', bookingId);
      if (error) throw error;

      toast.success(status === 'verified' ? 'Certification verified ✅' : 'Certification rejected');
      qc.invalidateQueries({ queryKey: ['activity-booking-readiness-session', sessionId] });
      qc.invalidateQueries({ queryKey: ['activity-booking-readiness', bookingId] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = () => {
    switch (currentStatus) {
      case 'verified':
        return <Badge className="bg-success/15 text-success border-success/30">Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'unverified':
        return <Badge className="bg-warning/15 text-warning border-warning/30">Awaiting Review</Badge>;
      default:
        return null;
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            Verify Certification
          </DrawerTitle>
          <DrawerDescription>{guestName}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-safe-bottom space-y-4 overflow-y-auto">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            {statusBadge()}
          </div>

          {/* Preview */}
          {certMediaPath ? (
            <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : previewUrl ? (
                <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt="Certification document"
                    className="w-full max-h-64 object-contain"
                    onError={(e) => {
                      // Fallback for non-image files (PDF)
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div className="px-3 pb-2">
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open full size
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  Could not load preview
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border p-4 text-center text-sm text-muted-foreground">
              No certification document uploaded
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. PADI card number verified, expires 2027"
              className="text-base min-h-[80px]"
              onFocus={(e) => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              className="flex-1 h-12 text-base bg-success hover:bg-success/90 text-white"
              onClick={() => handleAction('verified')}
              disabled={loading || !certMediaPath}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Verify
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-12 text-base"
              onClick={() => handleAction('rejected')}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Reject
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
