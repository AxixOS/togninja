// PublicLandingPageTrustBar — Phase 4

import { CheckCircle } from 'lucide-react';

interface PublicLandingPageTrustBarProps {
  data: {
    items: string[];
  };
}

export function PublicLandingPageTrustBar({ data }: PublicLandingPageTrustBarProps) {
  if (!data.items || data.items.length === 0) return null;

  return (
    <section className="bg-gray-50 border-b">
      <div className="max-w-5xl mx-auto px-6 py-5 flex flex-wrap justify-center gap-6 md:gap-10">
        {data.items.map((item, i) => (
          <span key={i} className="flex items-center gap-2 text-sm text-gray-700 font-medium">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
