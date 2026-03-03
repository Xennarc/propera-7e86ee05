import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Award, Camera, Upload, CheckCircle2, Loader2, FileImage, X } from 'lucide-react';
import { useUpdateActivityBookingReadiness } from '@/hooks/useActivityBookingReadiness';
import { StickyActionBar } from '@/components/guest/StickyActionBar';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CertUploadStepProps {
  bookingId: string;
  resortId: string;
  guestId: string;
  onComplete: () => void;
  onBack: () => void;
}

const CERT_TYPES = [
  { value: 'PADI_OW', label: 'PADI Open Water' },
  { value: 'PADI_AOW', label: 'PADI Advanced OW' },
  { value: 'SSI_OW', label: 'SSI Open Water' },
  { value: 'OTHER', label: 'Other' },
];

export function CertUploadStep({ bookingId, resortId, guestId, onComplete, onBack }: CertUploadStepProps) {
  const [certType, setCertType] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateMutation = useUpdateActivityBookingReadiness();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }
    setFile(selected);
    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file || !certType) return;
    setUploading(true);

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      // Path: resort_id/guest_id/booking_id/cert.ext (matches storage RLS)
      const path = `${resortId}/${guestId}/${bookingId}/cert.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('activity-certs')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      updateMutation.mutate(
        {
          bookingId,
          updates: {
            cert_status: 'uploaded' as any,
            cert_media_path: path,
          },
        },
        {
          onSuccess: () => {
            toast.success('Certification uploaded ✅');
            onComplete();
          },
          onError: () => toast.error('Failed to save certification'),
        }
      );
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const isValid = certType && file;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h3 className="font-semibold text-foreground">Upload Certification</h3>
          <p className="text-xs text-muted-foreground">Required for this activity</p>
        </div>
      </div>

      {/* Cert type chips */}
      <Card className="guest-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground">Certification Type</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CERT_TYPES.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setCertType(ct.value)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm font-medium transition-all tap-target',
                  certType === ct.value
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                )}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload area */}
      <Card className="guest-card">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Photo of Certification Card</p>

          {file ? (
            <div className="relative">
              {preview ? (
                <img
                  src={preview}
                  alt="Cert preview"
                  className="w-full rounded-xl object-cover max-h-48"
                />
              ) : (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-muted">
                  <FileImage className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-foreground truncate">{file.name}</span>
                </div>
              )}
              <button
                onClick={clearFile}
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center tap-target"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/*';
                    fileInputRef.current.capture = 'environment';
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 tap-target hover:bg-muted/50 transition-colors"
              >
                <Camera className="h-6 w-6 text-primary" />
                <span className="text-xs font-medium text-foreground">Take Photo</span>
              </button>
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/*,.pdf';
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 tap-target hover:bg-muted/50 transition-colors"
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Upload File</span>
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>

      <StickyActionBar>
        <Button
          className="flex-1"
          size="lg"
          disabled={!isValid || uploading || updateMutation.isPending}
          onClick={handleUpload}
        >
          {uploading || updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Upload & Continue
        </Button>
      </StickyActionBar>
    </div>
  );
}
