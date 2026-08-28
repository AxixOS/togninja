// Reading a studio's existing website to answer the setup form for them.
//
// Business basics asks twenty-five questions, and a photographer answering them is copying out
// facts that are already written on their own homepage: the business name, the town, the phone
// number, the Instagram link, the line under the logo. Asking someone to retype their own
// website is the least defensible kind of form.
//
// DELIBERATELY NOT A MODEL. Every field here is a fact with a canonical place to live —
// schema.org markup, an og: tag, a tel: link — and a regex reads those exactly while a model
// would paraphrase them, cost money, and need a key that at this point in setup nobody has
// configured yet. This step runs BEFORE the AI keys are entered, and it has to work anyway.
//
// The full crawl still happens later, at the photographs step. This is one page, once, to make
// the form shorter.
//
// EVERY FIELD IS A SUGGESTION. Nothing here is written to the database — it is handed to the
// wizard, shown as something the studio can accept or ignore, and a wrong guess costs them one
// correction. So the bar for including a field is "usually right", not "certainly right", and
// the bar for a field the studio would not notice being wrong is much higher.

import { assertPublicHttpUrl } from './safePublicUrl';

export interface SiteSuggestions {
  businessName?: string;
  city?: string;
  phone?: string;
  tagline?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  /** Where these came from, so the wizard can say so. */
  sourceUrl: string;
}

// Attribute values are HTML-escaped at the source, so og:description arrives carrying
// '&amp;' and the studio would have had to correct a tagline we had just handed them.
const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
};
const decodeEntities = (s: string): string =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });

const clean = (s: unknown, max = 200): string =>
  decodeEntities(String(s ?? '')).replace(/\s+/g, ' ').trim().slice(0, max);

/** Every JSON-LD block on the page, flattened — @graph included, which is where most CMSs put it. */
function jsonLdNodes(html: string): any[] {
  const out: any[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const push = (n: any) => {
        if (!n || typeof n !== 'object') return;
        if (Array.isArray(n)) { n.forEach(push); return; }
        out.push(n);
        if (n['@graph']) push(n['@graph']);
      };
      push(parsed);
    } catch { /* one malformed block must not lose the others */ }
  }
  return out;
}

function metaTags(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<meta\s+([^>]+)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const key = (attrs.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1];
    const val = (attrs.match(/content\s*=\s*["']([^"']*)["']/i) || [])[1];
    if (key && val) out[key.toLowerCase()] = val;
  }
  return out;
}

/**
 * The business name.
 *
 * Order matters and is chosen by how often each source is WRONG, not by how often it is
 * present. A <title> is usually "Boudoir Photography NYC | Caroline King Photography" — the
 * name is in there but so is a page title, so it is the last resort and gets split on the
 * separator that CMSs use.
 */
function businessName(ld: any[], meta: Record<string, string>, html: string): string | undefined {
  const org = ld.find((n) => /Organization|LocalBusiness|ProfessionalService|Photograph/i.test(String(n['@type'] || '')));
  if (org?.name) return clean(org.name, 120);
  if (meta['og:site_name']) return clean(meta['og:site_name'], 120);
  const t = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
  if (t) {
    // Take the LAST segment: "Service | Studio Name" far outnumbers the reverse.
    const parts = clean(t, 200).split(/\s+[|–—-]\s+/).filter(Boolean);
    if (parts.length > 1) return clean(parts[parts.length - 1], 120);
    return clean(t, 120);
  }
  return undefined;
}

/** The town, from structured markup only — guessing a location from prose is how a studio ends up in the wrong country. */
function city(ld: any[]): string | undefined {
  for (const n of ld) {
    const addr = n?.address;
    const one = Array.isArray(addr) ? addr[0] : addr;
    if (one?.addressLocality) return clean(one.addressLocality, 80);
  }
  return undefined;
}

function phone(ld: any[], html: string): string | undefined {
  for (const n of ld) if (n?.telephone) return clean(n.telephone, 40);
  const tel = html.match(/href=["']tel:([^"']+)["']/i);
  if (tel) {
    const v = clean(decodeURIComponent(tel[1]), 40);
    // A tel: link with no digits is a template placeholder, not a number.
    if ((v.match(/\d/g) || []).length >= 6) return v;
  }
  return undefined;
}

/**
 * The one-line description.
 *
 * og:description is written for social cards and is the closest thing to a tagline most sites
 * have. The meta description is the fallback. Both are frequently a whole paragraph, so this
 * is capped hard — a tagline that runs to sixty words is worse than none.
 */
function tagline(ld: any[], meta: Record<string, string>): string | undefined {
  const raw = meta['og:description'] || meta['description'] || ld.find((n) => n?.description)?.description;
  if (!raw) return undefined;
  const v = clean(raw, 300);
  if (v.length < 10) return undefined;
  return v.length > 160 ? clean(v.slice(0, 157) + '…', 160) : v;
}

function socials(ld: any[], html: string): Pick<SiteSuggestions, 'instagramUrl' | 'facebookUrl' | 'twitterUrl'> {
  const urls = new Set<string>();
  for (const n of ld) {
    const same = n?.sameAs;
    if (Array.isArray(same)) same.forEach((s) => urls.add(String(s)));
    else if (typeof same === 'string') urls.add(same);
  }
  const re = /href=["'](https?:\/\/[^"']*(?:instagram\.com|facebook\.com|twitter\.com|x\.com)\/[^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) urls.add(m[1]);

  // Match the HOST, never a substring of the URL.
  //
  // This tested /(?:twitter|x)\.com/ against the whole address, and "x.com" is a substring of
  // "500px.com" — so a wildlife photographer's 500px portfolio was offered to them as their
  // Twitter account. Exactly the suffix-matching mistake the crawled-image host check carries
  // a warning about, made again one file along.
  const hostIs = (u: URL, domains: string[]): boolean =>
    domains.some((d) => u.hostname === d || u.hostname.endsWith('.' + d));

  const pick = (domains: string[]): string | undefined => {
    for (const u of urls) {
      try {
        const parsed = new URL(u);
        if (!hostIs(parsed, domains)) continue;
        // A bare profile has a path; a share/intent link does not point at the studio.
        if (/^\/?$/.test(parsed.pathname)) continue;
        if (/\/(sharer|share|intent|dialog)/i.test(parsed.pathname)) continue;
        return clean(parsed.toString(), 200);
      } catch { /* not a URL we can trust */ }
    }
    return undefined;
  };

  return {
    instagramUrl: pick(['instagram.com']),
    facebookUrl: pick(['facebook.com']),
    twitterUrl: pick(['twitter.com', 'x.com']),
  };
}

/**
 * The parsing half, with no network and no database in it.
 *
 * Separate from readSiteIdentity so it can be tested against real pages saved to disk.
 * site-crawler imports server/db, so anything that reaches the fetch needs a live database
 * connection to even load — which made the part worth testing untestable.
 */
export function extractSiteIdentity(html: string, sourceUrl: string): SiteSuggestions {
  const out: SiteSuggestions = { sourceUrl };
  if (!html) return out;

  const ld = jsonLdNodes(html);
  const meta = metaTags(html);

  const name = businessName(ld, meta, html);
  if (name) out.businessName = name;
  const town = city(ld);
  if (town) out.city = town;
  const tel = phone(ld, html);
  if (tel) out.phone = tel;
  const line = tagline(ld, meta);
  if (line) out.tagline = line;
  // Only the ones actually found. Object.assign copied the misses in as undefined keys,
  // which JSON drops on the way out but which the caller's "how many did we find" count
  // believed — so a site with no social links was reported as three fields found.
  for (const [k, v] of Object.entries(socials(ld, html))) {
    if (v) (out as any)[k] = v;
  }

  return out;
}

/**
 * Read one page and propose what it says about the studio.
 *
 * Throws UnsafeUrlError for an address we will not fetch — the caller turns that into a 400
 * with the message, because it is nearly always a typo rather than an attack.
 */
export async function readSiteIdentity(rawUrl: string): Promise<SiteSuggestions> {
  const url = await assertPublicHttpUrl(rawUrl);
  const { fetchPageHtml } = await import('./site-crawler');
  const { html } = await fetchPageHtml(url.toString(), 12000);
  return extractSiteIdentity(html, url.toString());
}
