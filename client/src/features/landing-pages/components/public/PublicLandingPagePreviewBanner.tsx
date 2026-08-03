// PublicLandingPagePreviewBanner — Phase 4
// Sticky banner shown when viewing an unpublished page via preview token

import { Eye } from 'lucide-react';

interface PublicLandingPagePreviewBannerProps {
  expiresAt?: string | null;
}

export function PublicLandingPagePreviewBanner({ expiresAt }: PublicLandingPagePreviewBannerProps) {
  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleString()
    : null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium shadow-md flex items-center justify-center gap-2">
      <Eye className="h-4 w-4" />
      <span>Preview mode — this page is not published</span>
      {formattedExpiry && (
        <span className="text-amber-100 ml-2">· Expires {formattedExpiry}</span>
      )}
    </div>
  );
}
