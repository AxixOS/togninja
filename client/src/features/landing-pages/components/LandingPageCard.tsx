import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Copy, ExternalLink, Globe, Lock, Link2 } from 'lucide-react';
import { LandingPageStatusBadge } from './LandingPageStatusBadge';
import { buildLandingPagePublishedUrl, getLandingPageDisplayTitle } from '../utils/landingPage.helpers';
import type { LandingPageRecord } from '../types/landingPage.types';
import { useState, useCallback } from 'react';

interface LandingPageCardProps {
  page: LandingPageRecord;
  onEdit: (page: LandingPageRecord) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onPublish?: (id: string) => void;
  onUnpublish?: (id: string) => void;
}

export function LandingPageCard({ page, onEdit, onDelete, onDuplicate, onPublish, onUnpublish }: LandingPageCardProps) {
  const publicUrl = buildLandingPagePublishedUrl(page.slug);
  const [copied, setCopied] = useState(false);
  const isPublished = page.status === 'published';

  const handleCopyUrl = useCallback(() => {
    const fullUrl = `${window.location.origin}${publicUrl}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [publicUrl]);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {getLandingPageDisplayTitle(page)}
              </h3>
              <LandingPageStatusBadge status={page.status} />
              {page.page_type && page.page_type !== 'custom' && (
                <Badge variant="outline" className="text-xs">{page.page_type}</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{publicUrl}</span>
              {page.primary_service && <span>{page.primary_service}</span>}
              {page.city && <span>{page.city}</span>}
              <span>Updated {new Date(page.updated_at).toLocaleDateString()}</span>
            </div>
            {page.hero_headline && (
              <p className="text-sm text-gray-600 mt-1 truncate">{page.hero_headline}</p>
            )}
          </div>

          <div className="flex items-center gap-1 ml-4">
            <Button variant="ghost" size="sm" onClick={() => onEdit(page)} title="Edit">
              <Edit className="h-4 w-4" />
            </Button>
            {isPublished && (
              <>
                <Button variant="ghost" size="sm" onClick={() => window.open(publicUrl, '_blank')} title="View Live">
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopyUrl} title={copied ? 'Copied!' : 'Copy URL'}>
                  <Link2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {/* Publish/Unpublish quick action */}
            {isPublished ? (
              <Button variant="ghost" size="sm" onClick={() => onUnpublish?.(page.id)} title="Unpublish"
                disabled={!onUnpublish} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                <Lock className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => onPublish?.(page.id)} title="Publish"
                disabled={!onPublish} className="text-green-600 hover:text-green-700 hover:bg-green-50">
                <Globe className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onDuplicate?.(page.id)} title="Duplicate"
              disabled={!onDuplicate}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(page.id)} title="Delete"
              className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
