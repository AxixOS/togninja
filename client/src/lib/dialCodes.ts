// International dialling codes for phone inputs on visitor-facing forms.
//
// Only the ISO 3166-1 alpha-2 code and the E.164 country calling code are stored
// here — the country NAME is resolved at render time with Intl.DisplayNames in the
// visitor's language, so the list needs no translation set of its own and reads
// correctly on a German page and an English one alike.

export interface DialCode {
  iso: string; // ISO 3166-1 alpha-2, unique — use this as the <option> value
  dial: string; // E.164 calling code, with the leading '+'
}

// Several countries share a calling code (US/CA/DO on +1, RU/KZ on +7), which is
// why `iso` and not `dial` identifies an entry.
export const DIAL_CODES: DialCode[] = [
  { iso: 'AT', dial: '+43' }, { iso: 'DE', dial: '+49' }, { iso: 'CH', dial: '+41' },
  { iso: 'LI', dial: '+423' }, { iso: 'GB', dial: '+44' }, { iso: 'IE', dial: '+353' },
  { iso: 'FR', dial: '+33' }, { iso: 'BE', dial: '+32' }, { iso: 'NL', dial: '+31' },
  { iso: 'LU', dial: '+352' }, { iso: 'IT', dial: '+39' }, { iso: 'ES', dial: '+34' },
  { iso: 'PT', dial: '+351' }, { iso: 'AD', dial: '+376' }, { iso: 'MC', dial: '+377' },
  { iso: 'SM', dial: '+378' }, { iso: 'MT', dial: '+356' }, { iso: 'GR', dial: '+30' },
  { iso: 'CY', dial: '+357' }, { iso: 'DK', dial: '+45' }, { iso: 'SE', dial: '+46' },
  { iso: 'NO', dial: '+47' }, { iso: 'FI', dial: '+358' }, { iso: 'IS', dial: '+354' },
  { iso: 'EE', dial: '+372' }, { iso: 'LV', dial: '+371' }, { iso: 'LT', dial: '+370' },
  { iso: 'PL', dial: '+48' }, { iso: 'CZ', dial: '+420' }, { iso: 'SK', dial: '+421' },
  { iso: 'HU', dial: '+36' }, { iso: 'SI', dial: '+386' }, { iso: 'HR', dial: '+385' },
  { iso: 'BA', dial: '+387' }, { iso: 'RS', dial: '+381' }, { iso: 'ME', dial: '+382' },
  { iso: 'MK', dial: '+389' }, { iso: 'AL', dial: '+355' }, { iso: 'BG', dial: '+359' },
  { iso: 'RO', dial: '+40' }, { iso: 'MD', dial: '+373' }, { iso: 'UA', dial: '+380' },
  { iso: 'BY', dial: '+375' }, { iso: 'RU', dial: '+7' }, { iso: 'TR', dial: '+90' },
  { iso: 'GE', dial: '+995' }, { iso: 'AM', dial: '+374' }, { iso: 'AZ', dial: '+994' },
  { iso: 'US', dial: '+1' }, { iso: 'CA', dial: '+1' }, { iso: 'MX', dial: '+52' },
  { iso: 'BR', dial: '+55' }, { iso: 'AR', dial: '+54' }, { iso: 'CL', dial: '+56' },
  { iso: 'CO', dial: '+57' }, { iso: 'PE', dial: '+51' }, { iso: 'EC', dial: '+593' },
  { iso: 'UY', dial: '+598' }, { iso: 'VE', dial: '+58' }, { iso: 'CR', dial: '+506' },
  { iso: 'PA', dial: '+507' }, { iso: 'DO', dial: '+1' },
  { iso: 'AU', dial: '+61' }, { iso: 'NZ', dial: '+64' }, { iso: 'JP', dial: '+81' },
  { iso: 'KR', dial: '+82' }, { iso: 'CN', dial: '+86' }, { iso: 'HK', dial: '+852' },
  { iso: 'TW', dial: '+886' }, { iso: 'SG', dial: '+65' }, { iso: 'MY', dial: '+60' },
  { iso: 'TH', dial: '+66' }, { iso: 'ID', dial: '+62' }, { iso: 'PH', dial: '+63' },
  { iso: 'VN', dial: '+84' }, { iso: 'IN', dial: '+91' }, { iso: 'PK', dial: '+92' },
  { iso: 'BD', dial: '+880' }, { iso: 'LK', dial: '+94' }, { iso: 'NP', dial: '+977' },
  { iso: 'KZ', dial: '+7' },
  { iso: 'AE', dial: '+971' }, { iso: 'SA', dial: '+966' }, { iso: 'QA', dial: '+974' },
  { iso: 'KW', dial: '+965' }, { iso: 'BH', dial: '+973' }, { iso: 'OM', dial: '+968' },
  { iso: 'IL', dial: '+972' }, { iso: 'JO', dial: '+962' }, { iso: 'LB', dial: '+961' },
  { iso: 'EG', dial: '+20' }, { iso: 'MA', dial: '+212' }, { iso: 'TN', dial: '+216' },
  { iso: 'DZ', dial: '+213' }, { iso: 'ZA', dial: '+27' }, { iso: 'NG', dial: '+234' },
  { iso: 'KE', dial: '+254' }, { iso: 'GH', dial: '+233' }, { iso: 'TZ', dial: '+255' },
  { iso: 'UG', dial: '+256' }, { iso: 'ET', dial: '+251' },
];

/** The calling code for an ISO country code, or '' when it isn't in the list. */
export const dialFor = (iso: string): string =>
  DIAL_CODES.find((c) => c.iso === iso)?.dial || '';

/** Country name in `language`, falling back to the ISO code where unsupported. */
export function countryName(iso: string, language: string): string {
  try {
    return new Intl.DisplayNames([language || 'en'], { type: 'region' }).of(iso) || iso;
  } catch {
    return iso;
  }
}

/** The list sorted by its localised name, ready to render as <option>s. */
export function dialCodeOptions(language: string): Array<DialCode & { name: string }> {
  return DIAL_CODES.map((c) => ({ ...c, name: countryName(c.iso, language) })).sort((a, b) =>
    a.name.localeCompare(b.name, language || 'en'),
  );
}

/**
 * Best guess at which country to preselect for this tenant, in order: the calling
 * code its own phone number starts with, the country on its address, then its
 * locale's region (e.g. "de_AT" -> AT). Falls back to '' so nothing is assumed —
 * this codebase runs many studios, and Austria is not a safe default for them all.
 */
export function defaultDialIso(site: {
  phone?: string;
  address?: { country?: string };
  locale?: string;
  lang?: string;
}): string {
  const phone = (site.phone || '').replace(/[^\d+]/g, '').replace(/^00/, '+');
  if (phone.startsWith('+')) {
    // Longest calling code first, so a country on +1 never shadows one on +1xxx.
    const match = [...DIAL_CODES]
      .sort((a, b) => b.dial.length - a.dial.length)
      .find((c) => phone.startsWith(c.dial));
    if (match) return match.iso;
  }

  const country = (site.address?.country || '').trim();
  if (country) {
    const upper = country.toUpperCase();
    if (DIAL_CODES.some((c) => c.iso === upper)) return upper;
    const byName = DIAL_CODES.find(
      (c) =>
        countryName(c.iso, 'en').toLowerCase() === country.toLowerCase() ||
        countryName(c.iso, 'de').toLowerCase() === country.toLowerCase(),
    );
    if (byName) return byName.iso;
  }

  const region = (site.locale || '').split(/[-_]/)[1];
  if (region && DIAL_CODES.some((c) => c.iso === region.toUpperCase())) return region.toUpperCase();

  return '';
}

/**
 * Join a selected country code and a locally-typed number into one international
 * string for storage and for tel: links. A number the visitor already typed in
 * international form is left alone; a national trunk '0' is dropped.
 */
export function combinePhone(iso: string, localNumber: string): string {
  const typed = (localNumber || '').trim();
  if (!typed) return '';
  if (typed.startsWith('+')) return typed;
  if (typed.startsWith('00')) return `+${typed.slice(2).trim()}`;
  const dial = dialFor(iso);
  if (!dial) return typed;
  return `${dial} ${typed.replace(/^0+/, '')}`.trim();
}
