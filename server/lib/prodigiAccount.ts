// Whose Prodigi account is this, and what may it be used for?
//
// THE PRODUCT PROBLEM. A photographer will not create a Prodigi account, generate an API
// key, export a pricing sheet and import it before they can see a single print product.
// That is four steps of setup standing in front of a feature they have not been shown yet,
// and it is why print_products has been empty since the feature shipped. The catalogue has
// to be there on day one or it will never be there at all.
//
// THE COMMERCIAL TRAP. The obvious fix — put one platform key in the environment and let
// every studio use it — quietly makes the PLATFORM the merchant of record for physical
// goods. Not a marketplace connecting two parties: the seller. That carries reprints and
// refunds for damaged canvases, chargebacks, and B2B sales tax in every jurisdiction a
// buyer sits in. It is cheap to set up and expensive to unwind, and it happens by
// accident the moment an order falls through to an env-var key.
//
// So the two are split by what the key is being used FOR, not by which key exists:
//
//   READING the catalogue — product names, sizes, prices — may use the platform key.
//   Nothing is bought, nobody is billed, and the studio gets a populated shop immediately.
//
//   PLACING AN ORDER must use the STUDIO'S OWN key. Their account, their card, their
//   contract with Prodigi, their support line, their name on the packing slip.
//
// The prompt to connect an account therefore arrives at the moment it makes sense — when
// a studio has browsed a real catalogue and wants to sell from it — instead of standing
// in front of an empty page.
import { config } from '../config-reader';

export type ProdigiKeySource = 'studio' | 'platform' | null;

export interface ProdigiAccount {
  apiKey: string | null;
  baseUrl: string;
  source: ProdigiKeySource;
}

function baseUrlFor(env: string): string {
  return String(env || '').toLowerCase() === 'production'
    ? 'https://api.prodigi.com/v4.0'
    : 'https://api.sandbox.prodigi.com/v4.0';
}

/**
 * The studio's own Prodigi account, or nothing.
 *
 * Deliberately does NOT fall back to the platform key: every caller that bills someone
 * must go through here, so the fallback cannot be reached by accident.
 */
export async function studioProdigiAccount(): Promise<ProdigiAccount> {
  const apiKey = await config.get('prodigi_api_key');
  const env = (await config.get('prodigi_environment')) || 'sandbox';
  return {
    apiKey: apiKey || null,
    baseUrl: baseUrlFor(env),
    source: apiKey ? 'studio' : null,
  };
}

/**
 * An account that may be used to READ the catalogue: the studio's if they have connected
 * one, otherwise the platform's.
 *
 * PRODIGI_PLATFORM_API_KEY is deliberately a different variable from PRODIGI_API_KEY.
 * config-reader maps the latter as the env fallback for the studio's own key, so a value
 * there would silently become this instance's studio account — which is precisely the
 * accident this file exists to prevent.
 */
export async function catalogueProdigiAccount(): Promise<ProdigiAccount> {
  const own = await studioProdigiAccount();
  if (own.apiKey) return own;

  const platformKey = (process.env.PRODIGI_PLATFORM_API_KEY || '').trim();
  if (!platformKey) return { apiKey: null, baseUrl: baseUrlFor('sandbox'), source: null };

  return {
    apiKey: platformKey,
    // The platform catalogue is read from production, because sandbox prices are not real
    // prices and a studio quoting from them would undercharge.
    baseUrl: baseUrlFor(process.env.PRODIGI_PLATFORM_ENV || 'production'),
    source: 'platform',
  };
}

/** The response for a studio trying to sell before connecting their own account. */
export function connectAccountRequired() {
  return {
    error: 'prodigi_account_required',
    code: 'prodigi_account_required',
    message:
      'Connect your own Prodigi account before selling prints. Orders are placed on your '
      + 'account, ship under your name, and Prodigi supports you directly — so the account '
      + 'has to be yours.',
    // The UI turns this into a link. Named here so one string does not drift across screens.
    settingsPath: '/admin/settings/technical-setup',
  };
}
