// The first things a studio has to DO, as opposed to connect.
//
// server/lib/capabilities.ts answers "what needs a credential". It is the right answer to that
// question and the wrong answer to the one the dashboard is actually asking, which is "what is
// stopping this studio running their business". Two of the biggest items need no key at all:
//
//   Their PRICES. Onboarding seeds starter voucher products from the services the crawl found,
//   deliberately inactive and with no prices — because guessing what a photographer charges is
//   not something this product should do. Until they are priced, nothing is for sale. A studio
//   with a live website and an empty shop has the most expensive kind of unfinished setup, and
//   nothing anywhere mentioned it.
//
//   Their CLIENTS. A CRM opens on "No clients yet" and the importer that would fix that in one
//   file is three clicks into a menu they have no reason to open on their first day.
//
// Kept OUT of CAPABILITIES on purpose. That registry means "this feature is gated on a
// credential", and every refusal in the product reads it; adding things that are not gated on
// anything would make it lie to eight other callers to serve one screen.
import { pool } from '../db';

export interface FirstTask {
  key: string;
  label: string;
  /** Why it matters, in the studio's terms — not a description of the button. */
  blockedMessage: string;
  path: string;
  done: boolean;
}

/** Best-effort count. A missing table on a young instance reads as "none", never as an error. */
async function countOf(sql: string): Promise<number> {
  try {
    const r = await pool.query(sql);
    return Number(r.rows?.[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function firstTasks(): Promise<FirstTask[]> {
  // Priced means a price above zero. The starter products are created with a price of 0 and
  // is_active false precisely so that they cannot be sold until a human has said what they
  // cost — so counting rows would report "done" the moment onboarding seeded them.
  const priced = await countOf(
    `SELECT count(*)::int AS n FROM voucher_products WHERE price IS NOT NULL AND price > 0`,
  );
  const seeded = await countOf(`SELECT count(*)::int AS n FROM voucher_products`);
  const clients = await countOf(`SELECT count(*)::int AS n FROM crm_clients`);

  return [
    {
      key: 'set_prices',
      label: 'Setting your prices',
      blockedMessage: seeded > 0
        ? `Your ${seeded} starter package${seeded === 1 ? ' has' : 's have'} no price yet, so `
          + 'nothing can be bought. The Price Wizard finds what photographers near you charge '
          + 'and suggests a price for each.'
        : 'Nothing is for sale yet. The Price Wizard finds what photographers near you charge '
          + 'and builds your packages from it.',
      path: '/admin/price-wizard',
      done: priced > 0,
    },
    {
      key: 'import_clients',
      label: 'Bringing your clients across',
      blockedMessage:
        'Import your existing clients from a CSV so your history, invoices and galleries have '
        + 'someone to belong to. Every screen in here opens empty until they arrive.',
      path: '/admin/clients/import',
      done: clients > 0,
    },
  ];
}
