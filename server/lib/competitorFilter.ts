// Which search results are actually competitors.
//
// This lived twice: once in AxixosSearchService and once, in an older and shorter form, in
// TavilySearchService. The copies drifted, and the drift was not cosmetic —
//
//   the Tavily list still had only the original directories and none of the English-language
//   ones, so a US or UK studio searching through Tavily got a results page of Thumbtack and
//   The Knot listings;
//
//   and the Tavily path had no own-domain exclusion at all, so the studio found its own
//   website, scraped its own price list, and the wizard reported the studio's current prices
//   back to it as "the market".
//
// One list, one own-domain check, both providers.
import { config } from '../config-reader';

const IRRELEVANT = [
  // Socials and marketplaces — never a photographer's own pricing page.
  'facebook.com', 'instagram.com', 'pinterest.com', 'youtube.com', 'linkedin.com',
  'twitter.com', 'tiktok.com', 'yelp.com', 'tripadvisor.com', 'wikipedia.org',
  'amazon.', 'ebay.', 'google.com', 'maps.google.', 'bing.com',
  'reddit.com', 'quora.com', 'medium.com',

  // German-speaking directories.
  'herold.at', 'gelbeseiten.', 'wko.at', 'firmenabc.at', 'kununu.com',
  'karriere.at', 'willhaben.at',

  // English-speaking equivalents. These were missing entirely, which is why a studio outside
  // the German-speaking market had its results filled with directory pages carrying no real
  // pricing.
  'thumbtack.com', 'theknot.com', 'weddingwire.com', 'bark.com', 'yell.com',
  'gigsalad.com', 'thebash.com', 'angi.com', 'houzz.com', 'checkatrade.com',

  // Review aggregators and "average cost" guides. These rank well for exactly the queries
  // this search runs, and their pages carry invented or national-average figures that were
  // being pooled with real studio prices and weighted identically to them.
  'trustanalytica.', 'latestcost.', 'costhelper.', 'fash.com', 'expertise.com',
  'threebestrated.', 'birdeye.com', 'nicelocal.', 'cylex', 'manta.com', 'bbb.org',
  'mapquest.com', 'alignable.com', 'zola.com', 'peerspace.com', 'wedding-spot.',
  'bridebook.', 'hitched.co.uk', 'yellowpages.', 'superpages.com',
  'chamberofcommerce.com', 'lawnstarter.com',
];

/**
 * The studio's own hostnames.
 *
 * Resolved per tenant. The exclusion used to be a hardcoded constant naming the ORIGIN
 * studio's domain, which hid one particular business from every tenant and hid no tenant
 * from itself.
 */
export async function ownDomains(): Promise<string[]> {
  const out: string[] = [];
  for (const key of ['public_site_base_url', 'domain', 'app_url']) {
    try {
      const v = await config.get(key);
      if (!v) continue;
      const host = String(v).replace(/^https?:\/\//i, '').split('/')[0].replace(/^www\./i, '');
      if (host) out.push(host.toLowerCase());
    } catch { /* a missing key is not a reason to abandon the search */ }
  }
  return out;
}

/** True when this domain should not be treated as a competitor. */
export function isIrrelevantSite(domain: string, own: string[] = []): boolean {
  const d = String(domain || '').toLowerCase();
  if (!d) return true;
  if (IRRELEVANT.some((x) => d.includes(x))) return true;
  return own.some((o) => o && d.includes(o));
}
