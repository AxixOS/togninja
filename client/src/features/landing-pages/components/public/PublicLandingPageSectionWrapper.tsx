// PublicLandingPageSectionWrapper — Phase 4
// Consistent spacing and container for each public section

import React from 'react';

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

export function PublicLandingPageSectionWrapper({
  children,
  id,
  className = '',
  bg = 'white',
}: PublicLandingPageSectionWrapperProps) {
  return (
    <section id={id} className={`py-16 md:py-20 px-6 ${bgClasses[bg] || ''} ${className}`}>
      {children}
    </section>
  );
}
