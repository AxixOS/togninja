// Promo Pack Preview — Phase 5

import { Card, CardContent } from '@/components/ui/card';
import type { LandingPagePromoPackResponse } from '../../types/landingPagePromoPack.types';
import { PromoPackCard } from './PromoPackCard';

interface PromoPackPreviewProps {
  promoPack: LandingPagePromoPackResponse;
}

export function PromoPackPreview({ promoPack }: PromoPackPreviewProps) {
  const entries = [
    { title: 'Facebook Post', content: promoPack.facebookPost },
    { title: 'Instagram Caption', content: promoPack.instagramCaption },
    {
      title: 'Email',
      content: promoPack.emailSubject
        ? `Subject: ${promoPack.emailSubject}\n\n${promoPack.emailBody || ''}`
        : undefined,
    },
    { title: 'Google Business Post', content: promoPack.gmbPost },
    { title: 'WhatsApp Message', content: promoPack.whatsappPromo },
    { title: 'Hero Image Prompt', content: promoPack.heroImagePrompt },
    { title: 'Voucher Image Prompt', content: promoPack.voucherImagePrompt },
    { title: 'Social Creative Prompt', content: promoPack.socialCreativePrompt },
  ].filter((e) => !!e.content);

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No promo content generated.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((e, i) => (
        <PromoPackCard key={i} title={e.title} content={e.content!} />
      ))}
    </div>
  );
}
