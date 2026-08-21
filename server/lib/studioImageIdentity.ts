// Who a photograph belongs to, resolved from the tenant rather than baked in.
//
// server/services/blogImageAnalysis.ts stamped every image it touched with
//   creator    'New Age Fotografie'
//   copyright  '© New Age Fotografie, Wien'
//   GPS        48.1939, 16.3577      (Wehrgasse, 1050 Wien-Margareten)
//   city       'Wien'
//   sublocation'Margareten'
// and described the picture with a German prompt that opened "Du bist ein
// Bildredakteur für ein Wiener Portraitfotostudio". A Brighton sports photographer's
// files came out credited to a Viennese portrait studio, geotagged to a street they
// have never been to, described in a language they do not publish in. Metadata is
// the one thing in a photograph that outlives the website, so a wrong stamp travels
// with the file for ever.
//
// EVERY FIELD IS OPTIONAL ON PURPOSE. The old code used `input.creator ?? STUDIO.creator`,
// so an absent value silently became the origin studio's. Here an absent value stays
// absent and the caller writes no tag at all. A studio with no address makes no
// location claim; that is strictly better than claiming someone else's.
import { pool } from '../db';

export interface ImageIdentity {
  /** Byline / dc:Creator. */
  creator?: string;
  /** dc:Rights / IPTC:CopyrightNotice. Never carries a city. */
  copyright?: string;
  /** photoshop:Credit. */
  credit?: string;
  /** IPTC:City — a LOCALITY, never a country. Absent when we cannot tell. */
  city?: string;
  /** Country name, from env only. See countryOf() for why not the column. */
  country?: string;
  /** The STUDIO's coordinates. Only valid for studio-premises images. */
  gps?: { lat: number; lng: number };
  /** The studio's own service vocabulary, to steer the vision model's word choice. */
  services?: string[];
}

const TTL = 60_000;
let cached: { value: ImageIdentity; at: number } | null = null;

const clean = (v: unknown): string => String(v ?? '').trim().slice(0, 120);

/**
 * A locality, not a country.
 *
 * `studio_configs.city` is free text and the live demo holds 'UK' in it — writing that
 * into IPTC:City produces "City: UK", which is worse than no city at all because it
 * looks deliberate. Prefer the town parsed out of the address, which for
 * '28 Nevill Avenue\nHove, BN3 7NA' is 'Hove'.
 */
export function localityOf(address: unknown, city: unknown, country: unknown): string | undefined {
  const lines = String(address ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1] || '';
  // 'Hove, BN3 7NA' -> 'Hove'. Also handles 'Hove BN3 7NA' and a bare 'Hove'.
  const beforePostcode = last
    .replace(/[,\s]+[A-Z]{1,2}\d[A-Z\d]?\s*\d?[A-Z]{0,2}\s*$/i, '')
    .replace(/,\s*$/, '')
    .trim();
  const fromAddress = beforePostcode.split(',').pop()?.trim();
  if (fromAddress && fromAddress.length > 1 && !/^\d+$/.test(fromAddress)) return fromAddress.slice(0, 80);

  // Fall back to the city column, but only when it is plausibly a town: not a country
  // name, not an ISO code, and not simply repeating the country field.
  const c = clean(city);
  const co = clean(country);
  if (!c) return undefined;
  if (c.length <= 3 && c === c.toUpperCase()) return undefined;       // 'UK', 'USA', 'DE'
  if (co && c.toLowerCase() === co.toLowerCase()) return undefined;
  return c;
}

/**
 * Country comes from the environment, never from studio_configs.country.
 * shared/schema.ts defaults that column to 'Austria', so an unanswered field reads as
 * a confident, wrong claim — the same trap siteIdentity.ts documents for the address.
 */
function countryOf(): string | undefined {
  const v = clean(process.env.BUSINESS_COUNTRY);
  return v || undefined;
}

async function load(): Promise<ImageIdentity> {
  const id: ImageIdentity = {};
  try {
    const { rows } = await pool.query(
      `SELECT owner_name, business_name, studio_name, address, city, country,
              latitude, longitude, authority_map
       FROM studio_configs ORDER BY created_at LIMIT 1`,
    );
    const r: any = rows[0] || {};

    const name = clean(r.owner_name) || clean(r.business_name) || clean(r.studio_name) || clean(process.env.BUSINESS_NAME);
    if (name) {
      id.creator = name;
      id.credit = name;
      // Same shape as imageMetadata.ts so the EXIF and XMP stamps agree rather than
      // disagreeing on the same file. No city — a copyright notice is not an address.
      id.copyright = `© ${new Date().getFullYear()} ${name}`;
    }

    const locality = localityOf(r.address, r.city, r.country);
    if (locality) id.city = locality;
    const country = countryOf();
    if (country) id.country = country;

    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
      id.gps = { lat, lng };
    }

    // The studio's own pillars are the best available vocabulary hint: it stops the
    // model reaching for portrait language on a cycling photograph.
    const pillars = Array.isArray(r.authority_map?.pillars) ? r.authority_map.pillars : [];
    const labels = pillars.map((p: any) => clean(p?.label)).filter(Boolean).slice(0, 12);
    if (labels.length) id.services = labels;
  } catch {
    // A fresh instance with no row, or a database blip. An empty identity writes no
    // tags, which is the correct failure: silence rather than someone else's name.
  }
  return id;
}

/** The tenant's image identity, cached for 60s. Never throws. */
export async function getImageIdentity(): Promise<ImageIdentity> {
  if (cached && Date.now() - cached.at < TTL) return cached.value;
  const value = await load();
  cached = { value, at: Date.now() };
  return value;
}

/** Drop the cache after the studio edits its own details. */
export function invalidateImageIdentity(): void {
  cached = null;
}
