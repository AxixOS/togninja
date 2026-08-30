// PublicLandingPageSectionWrapper — Phase 4
// Consistent spacing and container for each public section

import React from 'react';
import { useSiteLayout } from '@/components/public/SiteLayoutContext';
import { sectionGround, type SectionBg } from '../../../../../../shared/siteLayouts';

interface PublicLandingPageSectionWrapperProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  bg?: 'white' | 'gray' | 'purple' | 'gradient';
}

// How a ground is SPELLED in Tailwind. Which ground a band gets is sectionGround()'s job,
// in shared/siteLayouts, so the layout rule is not restated here.
const GROUND_CLASS: Record<string, string> = {
  raised: 'bg-white',
  surface: 'bg-gray-50',
  gradient: 'relative bg-gradient-to-br from-purple-700 via-purple-600 to-pink-600 text-white',
};

export function PublicLandingPageSectionWrapper({
  children,
  id,
  className = '',
  bg = 'white',
}: PublicLandingPageSectionWrapperProps) {
  const layoutId = useSiteLayout();

  // Rhythm is the whole difference here. Classic runs py-16/py-20 with the bands doing the
  // separating; editorial has no bands to separate with, so the space has to do that work and
  // is roughly half again as much. Horizontal padding grows too — a wide measure with tight
  // gutters reads as cramped no matter how good the type is.
  const editorial = layoutId === 'editorial';
  const spacing = editorial ? 'py-24 md:py-32 px-6 sm:px-8' : 'py-16 md:py-20 px-6';
  // WHICH ground, from shared/siteLayouts — the same call the setup thumbnail makes, so the
  // striped-classic / continuous-editorial difference is stated once instead of twice.
  const ground = sectionGround(layoutId, bg as SectionBg);

  return (
    <section id={id} className={`${spacing} ${GROUND_CLASS[ground] || ''} ${className}`}>
      {children}
    </section>
  );
}
