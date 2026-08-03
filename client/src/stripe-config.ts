export interface StripeProduct {
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
}

export const stripeProducts: Record<string, StripeProduct> = {
  'babybauch-bis-baby': {
    priceId: 'price_1RLpLHFphNBaSN5pVMKhc1la',
    name: 'Babybauch bis Baby Paket',
    description: 'Begleiten Sie Ihre Reisen von der Schwangerschaft bis zum Neugeborenen mit zwei professionellen Fotoshootings. Beinhaltet ein Schwangerschaftshooting (32-36. Woche) und ein Neugeborenen-Shooting z.B. innerhalb der ersten 14 Tage)',
    mode: 'payment'
  },
  'family-deluxe': {
    priceId: 'price_1RLo64FphNBaSN5pB8ZaTRzq',
    name: 'Deluxe - das komplette Familienerlebnis',
    description: '60 Minuten Shooting, 10 bearbeitete Fotos, Begrüßunsgetränk, Outfit - wechsel möglich, alle Kombinationen - bis zu 12 Erwachsene, 4 Kinder möglich und Haustiere pro Gutschein / Shooting wilkommen',
    mode: 'payment'
  },
  'family-premium': {
    priceId: 'price_1RLo4XFphNBaSN5p0hQbuHoJ',
    name: 'Premium - Ideal für größere Familien',
    description: '45 Minuten Shooting, 5 bearbeitete Fotos, Begrüßunsgetränk, Outfit - wechsel möglich - bis zu 12 Erwachsene, 4 Kinder möglich und Haustiere pro Gutschein / Shooting wilkommen',
    mode: 'payment'
  },
  'family-basic': {
    priceId: 'price_1RLnnTFphNBaSN5psOq7mFl3',
    name: 'Basic - Perfekt für kleine Familien.',
    description: '30 Minuten Shooting, 1 bearbeitete Foto, Begrüßungsgetränk, Outfit-Wechsel möglich - bis zu 12 Erwachsene und 4 Kinder möglich & Haustiere pro Gutschein / Shooting willkommen',
    mode: 'payment'
  }
};