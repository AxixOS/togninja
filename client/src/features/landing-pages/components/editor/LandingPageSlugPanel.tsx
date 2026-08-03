import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { validateSlugFormat } from '../../utils/landingPageEditor.schema';
import { checkSlugAvailability } from '../../services/landingPageEditor.client';

interface Props {
  slug: string;
  pageId: string;
  onChange: (slug: string) => void;
}

export default function LandingPageSlugPanel({ slug, pageId, onChange }: Props) {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);

  // Normalize input in real-time
  const handleChange = (raw: string) => {
    const normalised = raw
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    onChange(normalised);
  };

  // Validate format synchronously
  useEffect(() => {
    const result = validateSlugFormat(slug);
    setFormatError(result.error);
    if (!result.valid) {
      setAvailable(null);
    }
  }, [slug]);

  // Debounced availability check
  useEffect(() => {
    if (!slug || formatError) {
      setAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await checkSlugAvailability(slug, pageId);
        setAvailable(res.available);
      } catch {
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [slug, pageId, formatError]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">URL Slug</h3>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-600">Slug</Label>
        <div className="relative">
          <Input
            value={slug}
            onChange={e => handleChange(e.target.value)}
            placeholder="your-page-slug"
            className="text-sm pr-8 font-mono"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {checking && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
            {!checking && available === true && <CheckCircle className="h-4 w-4 text-green-500" />}
            {!checking && available === false && <XCircle className="h-4 w-4 text-red-500" />}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 font-mono">/lp/{slug || '...'}</p>

      {formatError && <p className="text-xs text-red-600">{formatError}</p>}
      {!formatError && available === false && (
        <p className="text-xs text-red-600">This slug is already in use. Try a different version.</p>
      )}
      {!formatError && available === true && (
        <p className="text-xs text-green-600">Slug is available</p>
      )}
    </div>
  );
}
