// Email → order attribution.
//
// Campaign emails link to the site with a campaign id in the URL (utm_campaign,
// or ?nac= / ?campaign_id=). We remember that id for a 30-day window so a later
// voucher purchase can be attributed to the campaign that drove it. The id is
// threaded into the Stripe checkout metadata and persisted on voucher_sales.
const KEY = 'naf_attrib_campaign';
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Capture a campaign id from the current URL's query string, if present. */
export function captureCampaignFromUrl(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('utm_campaign') || params.get('nac') || params.get('campaign_id');
    if (cid) {
      localStorage.setItem(KEY, JSON.stringify({ id: cid, ts: Date.now() }));
    }
  } catch {
    /* localStorage unavailable / SSR — ignore */
  }
}

/** Return the remembered campaign id if still within the attribution window. */
export function getAttributedCampaignId(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { id, ts } = JSON.parse(raw);
    if (!id || !ts || Date.now() - ts > WINDOW_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return String(id);
  } catch {
    return null;
  }
}
