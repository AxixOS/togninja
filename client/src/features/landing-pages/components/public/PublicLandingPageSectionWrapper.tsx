// PublicLandingPageSectionWrapper — Phase 4
// Consistent spacing and container for each public section

import React from 'react';
import { useIsEditorial } from '@/components/public/SiteLayoutContext';

interface PublicLandingPageSectionWrapperProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  bg?: 'white' | 'gray' | 'purple' | 'gradient';
}

const bgClasses: Record<string, string> = {
  white: 'bg-white',
  gray: 'bg-gray-50',
  purple: 'bg-purple-50',
  gradient: 'relative bg-gradient-to-br from-purple-700 via-purple-600 to-pink-600 text-white',
};

/**
 * Editorial grounds.
 *
 * The classic wrapper alternates white and gray-50 bands, which is what gives a page its
 * striped, sectioned look — every block visibly a separate tray. An editorial page is one
 * continuous ground with the rhythm carried by space instead, so `gray` stops being a band
 * and becomes the same surface with more air around it.
 *
 * `purple` and `gradient` still fill, because those are deliberate emphasis rather than
 * alternation — a final call to action is supposed to interrupt. Both go through the theme's
 * own tokens, which as of v1.9.129 they finally do.
 */
const editorialBgClasses: Record<string, string> = {
  white: 'bg-white',
  gray: 'bg-white',
  purple: 'bg-purple-50',
  gradient: 'relative bg-gradient-to-br from-purple-700 via-purple-600 to-pink-600 text-white',
};

export function PublicLandingPageSectionWrapper({
  children,
  id,
  className = '',
  bg = 'white',
}: PublicLandingPageSectionWrapperProps) {
  const editorial = useIsEditorial();

  // Rhythm is the whole difference here. Classic runs py-16/py-20 with the bands doing the
  // separating; editorial has no bands to separate with, so the space has to do that work and
  // is roughly half again as much. Horizontal padding grows too — a wide measure with tight
  // gutters reads as cramped no matter how good the type is.
  const spacing = editorial ? 'py-24 md:py-32 px-6 sm:px-8' : 'py-16 md:py-20 px-6';
  const grounds = editorial ? editorialBgClasses : bgClasses;

  return (
    <section id={id} className={`${spacing} ${grounds[bg] || ''} ${className}`}>
      {children}
    </section>
  );
}
