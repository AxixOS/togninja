// PublicLandingPageCtaButton — Phase 4
// Reusable CTA button with tracking integration

import React, { useCallback } from 'react';
import { buildLandingPageCtaTrackingPayload, fireLandingPageCtaEvent } from '../../utils/trackLandingPageCta';
import type { LandingPageCtaTrackingPayload } from '../../utils/trackLandingPageCta';

interface PublicLandingPageCtaButtonProps {
  href: string;
  label: string;
  pageId: string;
  pageSlug: string;
  placement: LandingPageCtaTrackingPayload['ctaPlacement'];
  isPreview: boolean;
  variant?: 'primary' | 'primaryInverted';
  className?: string;
}

export function PublicLandingPageCtaButton({
  href,
  label,
  pageId,
  pageSlug,
  placement,
  isPreview,
  variant = 'primary',
  className = '',
}: PublicLandingPageCtaButtonProps) {
  const handleClick = useCallback(() => {
    const payload = buildLandingPageCtaTrackingPayload(pageId, pageSlug, label, placement, isPreview);
    fireLandingPageCtaEvent(payload);
  }, [pageId, pageSlug, label, placement, isPreview]);

  const baseClasses = 'inline-block font-bold px-10 py-4 rounded-full text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200';
  const variantClasses = variant === 'primaryInverted'
    ? 'bg-white text-purple-700'
    : 'bg-purple-600 text-white hover:bg-purple-700';

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {label}
    </a>
  );
}
