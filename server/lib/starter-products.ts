// Starter voucher products built from the studio's OWN services.
//
// The image shipped with the origin studio's products in the table — German names, family
// and newborn sessions, euro prices — which a new studio then advertised as its own. The
// answer is not "ship none": a voucher shop with nothing in it is useless on day one. It
// is to build them from the services the onboarding crawl already discovered.
//
// PRICES ARE NEVER INVENTED. These are purchasable items in a live payment flow, and a
// number a model made up is a number a customer can actually pay. Every product is created
// INACTIVE with a price of 0, so it cannot be bought until the studio sets one. That is the
// whole safety design: generation supplies the words, the studio supplies the money.
import { pool } from '../db';

export interface StarterProductResult {
  created: number;
  skipped: number;
  names: string[];
}

const slugify = (s: string) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

/**
 * One voucher product per pillar in the studio's Authority Map.
 *
 * Idempotent: a slug that already exists is skipped, so a re-run after the studio has
 * priced and activated its products cannot overwrite them or add duplicates.
 */
export async function seedStarterProductsFromServices(): Promise<StarterProductResult> {
  const { getAuthorityMap } = await import('./authority-map');
  const map = await getAuthorityMap();
  const pillars = (map?.pillars || []).filter((p: any) => p?.label);

  const out: StarterProductResult = { created: 0, skipped: 0, names: [] };
  if (!pillars.length) return out;

  for (const [i, pillar] of pillars.slice(0, 8).entries()) {
    const name = `${pillar.label} Session`;
    const slug = slugify(name);
    try {
      const existing = await pool.query(`SELECT id FROM voucher_products WHERE slug = $1 LIMIT 1`, [slug]);
      if (existing.rowCount) { out.skipped++; continue; }

      await pool.query(
        `INSERT INTO voucher_products
           (name, description, price, category, slug, display_order, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          name,
          // Deliberately plain and factual. Anything more specific — durations, what is
          // included, how many images — would be invented, and a studio should not have to
          // discover that its shop is promising something it does not offer.
          `Gift voucher for a ${pillar.label.toLowerCase()} session.`,
          0,
          pillar.label,
          slug,
          i,
          false, // INACTIVE: not purchasable until the studio sets a price and enables it
        ],
      );
      out.created++;
      out.names.push(name);
    } catch (e: any) {
      // One product failing must not stop the rest, and must never fail onboarding.
      console.warn(`[starter-products] could not create "${name}":`, e?.message || e);
    }
  }
  return out;
}
