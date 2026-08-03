import { Badge } from '@/components/ui/badge';
import type { LandingPageStatus } from '../types/landingPage.types';
import { formatLandingPageStatus, getLandingPageStatusTone } from '../utils/landingPage.helpers';
import { Globe } from 'lucide-react';

interface LandingPageStatusBadgeProps {
  status: LandingPageStatus;
}

const toneClasses: Record<ReturnType<typeof getLandingPageStatusTone>, string> = {
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  muted: 'bg-gray-100 text-gray-500 border-gray-200',
  default: '',
};

export function LandingPageStatusBadge({ status }: LandingPageStatusBadgeProps) {
  const tone = getLandingPageStatusTone(status);
  return (
    <Badge variant="outline" className={toneClasses[tone]}>
      {status === 'published' && <Globe className="h-3 w-3 mr-1" />}
      {formatLandingPageStatus(status)}
    </Badge>
  );
}
