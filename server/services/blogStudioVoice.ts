// Who is writing, and what may they honestly claim?
//
// The article writer's system prompt used to be a set of literals about ONE studio:
// "Du bist erfahrene:r Texter:in für New Age Fotografie, ein Tageslichtstudio in
// Wien-Margareten (1050), nahe Naschmarkt", thirteen years of experience, 300+ shoots,
// 4.8 stars, and a hardcoded list of Viennese pillar pages.
//
// As a prompt that was good. As a product it is the worst possible failure: pointed at a
// studio that opened last year it does not produce weak copy, it produces CONFIDENT copy
// claiming thirteen years and three hundred shoots they have never done, under their own
// name, on their own domain. Fabricated E-E-A-T is worse than none — it is the one thing
// a search engine and a client both punish.
//
// So every claim the writer is allowed to make now has to come from somewhere real:
//
//   experience     derived from studio_configs.founding_year, or omitted entirely
//   credentials    only those the studio actually entered
//   ratings        only from real review data — and there is none yet, so it says nothing
//   internal links only pages the Authority Map says exist
//   language       the studio's own site_language
//
// A studio with no track record gets copy that leans on the photographs and the craft.
// That is a real article. An invented decade is not.
// Imported lazily inside the loaders. The pure functions in this file — the ones a
// verification script needs — must be importable WITHOUT a database, or the guard can
// only run where a live connection string exists, which is to say almost nowhere.
const getPool = async () => (await import('../db')).pool;

export interface StudioVoice {
  name: string;
  ownerName: string;
  ownerRole: string;
  place: string;
  language: string;
  /** Whole years, from founding_year. Null when unknown — never guessed. */
  yearsActive: number | null;
  /** Only what the studio entered themselves. */
  credentials: string[];
  /** Real, verifiable review data. Null until a source exists. */
  rating: { average: number; count: number } | null;
  /** Internal link targets that demonstrably resolve. */
  links: string[];
  /** The studio's own positioning, if they have written one. */
  positioning: string;
}

const cache: { at: number; value: StudioVoice | null } = { at: 0, value: null };
const TTL_MS = 60_000;

function asArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x || '').trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p.map((x) => String(x || '').trim()).filter(Boolean);
    } catch { /* a plain string is one credential */ }
    return [v.trim()];
  }
  return [];
}

export async function loadStudioVoice(): Promise<StudioVoice> {
  if (cache.value && Date.now() - cache.at < TTL_MS) return cache.value;

  const cfg = (await (await getPool()).query(
    `SELECT studio_name, business_name, city, state, country, site_language,
            owner_name, owner_role, founding_year, credentials, meta_description
       FROM studio_configs LIMIT 1`,
  ).catch(() => ({ rows: [] as any[] }))).rows[0] || {};

  // Only pages the studio actually publishes. The old list was fifteen Viennese URLs,
  // so a writer for any other studio was instructed to link to pages that 404.
  const pillars = (await (await getPool()).query(
    `SELECT href FROM authority_map_pillars WHERE coalesce(has_page, true) = true`,
  ).catch(() => ({ rows: [] as any[] }))).rows.map((r: any) => String(r.href || '').trim()).filter(Boolean);

  const year = Number(cfg.founding_year);
  const yearsActive = Number.isFinite(year) && year > 1900 && year <= new Date().getFullYear()
    ? new Date().getFullYear() - year
    : null;

  const place = [cfg.city, cfg.state, cfg.country].map((x) => String(x || '').trim()).filter(Boolean).join(', ');

  const voice: StudioVoice = {
    name: String(cfg.studio_name || cfg.business_name || '').trim(),
    ownerName: String(cfg.owner_name || '').trim(),
    ownerRole: String(cfg.owner_role || '').trim(),
    place,
    language: String(cfg.site_language || 'en').trim().slice(0, 2).toLowerCase(),
    yearsActive,
    credentials: asArray(cfg.credentials),
    // No review source exists yet. Deliberately null rather than a placeholder: the moment
    // this returns a number, the writer is allowed to print it to the public.
    rating: null,
    links: pillars,
    positioning: String(cfg.meta_description || '').trim(),
  };

  cache.value = voice;
  cache.at = Date.now();
  return voice;
}

/** Drop the cache after the studio edits its own details. */
export function invalidateStudioVoice(): void {
  cache.value = null;
  cache.at = 0;
}

/**
 * The part of the system prompt that says who is speaking and what they may claim.
 *
 * Every line is conditional. A studio that has told us nothing gets a writer with no
 * credentials to lean on and an explicit instruction to lean on the photographs instead —
 * which produces an honest article rather than a decorated lie.
 */
export function voiceRules(v: StudioVoice, lang: 'de' | 'en'): string[] {
  const de = lang === 'de';
  const out: string[] = [];

  const who = v.name || (de ? 'dieses Fotostudio' : 'this photography studio');
  out.push(de
    ? `Du schreibst als Texter:in für ${who}${v.place ? `, ansässig in ${v.place}` : ''}.`
    : `You are writing as the copywriter for ${who}${v.place ? `, based in ${v.place}` : ''}.`);

  if (v.ownerName) {
    out.push(de
      ? `Inhaber:in: ${v.ownerName}${v.ownerRole ? ` (${v.ownerRole})` : ''}. Die Ich-Perspektive gehört dieser Person.`
      : `The studio is run by ${v.ownerName}${v.ownerRole ? ` (${v.ownerRole})` : ''}. The first-person voice belongs to them.`);
  }

  // THE CLAIMS BLOCK. This is the whole point of the file.
  const claims: string[] = [];
  if (v.yearsActive && v.yearsActive >= 2) {
    claims.push(de
      ? `${v.yearsActive} Jahre Erfahrung (seit ${new Date().getFullYear() - v.yearsActive})`
      : `${v.yearsActive} years in business (since ${new Date().getFullYear() - v.yearsActive})`);
  }
  for (const c of v.credentials) claims.push(c);
  if (v.rating && v.rating.count > 0) {
    claims.push(de
      ? `${v.rating.average.toFixed(1)} ★ aus ${v.rating.count} Bewertungen`
      : `${v.rating.average.toFixed(1)} ★ from ${v.rating.count} reviews`);
  }

  if (claims.length) {
    out.push(de
      ? `BELEGBARE FAKTEN — nur diese dürfen als Erfahrung/Nachweis genannt werden: ${claims.join('; ')}.`
      : `VERIFIABLE FACTS — these, and only these, may be stated as experience or proof: ${claims.join('; ')}.`);
  }

  // The hard rule, stated whether or not there are claims to make.
  out.push(de
    ? 'ERFINDE KEINE NACHWEISE. Keine Jahreszahlen, Shooting-Zahlen, Sternebewertungen, Auszeichnungen oder Kundenzitate, die oben nicht stehen. Erfundene Erfahrung ist schlimmer als gar keine — sie steht unter dem Namen des Studios.'
    : 'INVENT NO CREDENTIALS. No years, shoot counts, star ratings, awards, or client quotes beyond the list above. Fabricated experience is worse than none: it is published under the studio\'s own name.');

  if (!claims.length) {
    out.push(de
      ? 'Dieses Studio hat noch keine belegbaren Kennzahlen hinterlegt. Stütze den Artikel deshalb auf HANDWERK und die konkreten Fotos: was zu sehen ist, wie es entstanden ist, worauf es bei so einem Shooting ankommt. Das ist ein ehrlicher Artikel — eine erfundene Bilanz wäre es nicht.'
      : 'This studio has recorded no verifiable metrics yet. Ground the article in CRAFT and in the specific photographs instead: what is visible, how it was made, what actually matters in a shoot like this. That is an honest article. An invented track record would not be.');
  }

  if (v.positioning) {
    out.push(de
      ? `POSITIONIERUNG (eigene Worte des Studios): ${v.positioning}`
      : `POSITIONING (the studio's own words): ${v.positioning}`);
  }

  return out;
}
