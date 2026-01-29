import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Upload, X, Link2, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  label: string;
  description?: string;
  value: string;
  onChange: (url: string) => void;
  resortId: string;
  imageType: 'logo' | 'hero' | 'favicon';
  aspectRatio?: 'square' | 'wide';
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

export function ImageUploader({
  label,
  description,
  value,
  onChange,
  resortId,
  imageType,
  aspectRatio = 'square',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload a PNG, JPG, WebP, or SVG.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);
    try {
      // Generate unique filename
      const ext = file.name.split('.').pop();
      const fileName = `${resortId}/${imageType}-${Date.now()}.${ext}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('resort-branding')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resort-branding')
        .getPublicUrl(data.path);

      onChange(urlData.publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      setShowUrlInput(false);
      toast.success('Image URL set');
    }
  };

  const handleRemove = async () => {
    // If it's a Supabase storage URL, try to delete
    if (value.includes('resort-branding')) {
      try {
        const path = value.split('resort-branding/')[1];
        if (path) {
          await supabase.storage.from('resort-branding').remove([path]);
        }
      } catch (error) {
        console.error('Failed to delete from storage:', error);
      }
    }
    onChange('');
    toast.success('Image removed');
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>

      {value ? (
        // Preview mode
        <div className="relative group">
          <div
            className={cn(
              'relative rounded-lg overflow-hidden border bg-muted/50',
              aspectRatio === 'wide' ? 'aspect-video' : 'aspect-square max-w-[200px]'
            )}
          >
            <img
              src={value}
              alt={label}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = '';
                e.currentTarget.parentElement!.innerHTML =
                  '<div class="flex items-center justify-center h-full text-destructive text-sm">Failed to load</div>';
              }}
            />
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Replace
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 truncate max-w-[300px]">
            {value.includes('resort-branding') ? 'Uploaded image' : value}
          </p>
        </div>
      ) : (
        // Upload mode
        <div className="space-y-3">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={cn(
              'relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer',
              'flex flex-col items-center justify-center gap-2 text-center',
              aspectRatio === 'wide' ? 'aspect-video' : 'aspect-square max-w-[200px]',
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
              uploading && 'pointer-events-none opacity-70'
            )}
          >
            {uploading ? (
              <>
                <LoadingSpinner className="h-8 w-8" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </>
            ) : (
              <>
                <div className="p-3 rounded-full bg-muted">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Drop image here</p>
                  <p className="text-xs text-muted-foreground">or click to browse</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WebP, SVG up to 5MB
                </p>
              </>
            )}
          </div>

          {/* URL input toggle */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-muted-foreground"
            >
              <Link2 className="h-4 w-4 mr-1" />
              {showUrlInput ? 'Hide URL input' : 'Use URL instead'}
            </Button>
          </div>

          {showUrlInput && (
            <div className="flex gap-2">
              <Input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.png"
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
              >
                Set
              </Button>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        className="hidden"
      />
    </div>
  );
}
