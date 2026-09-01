// What can this studio actually do, and what is stopping the rest?
//
// WHY THIS EXISTS. The same refusal was written three times, in three shapes, in one week:
//
//   connectAccountRequired()  a 402 with a settingsPath      (Prodigi)
//   searchUnavailable()       a message with no path at all  (Price Wizard)
//   uploadBufferToB2()        a thrown Error                 (image storage)
//
// Three features, three inconsistent answers to the same question. A studio meets a padlock
// that looks different every time, and adding a fourth gated feature means inventing a fourth
// refusal. This is that question asked once.
//
// It is deliberately NOT the feature-flag concept in server/hub-integration.ts. That answers
// "has this customer paid for X" — a pricing tier. This answers "is X configured and would it
// work if somebody pressed the button", which is a completely different question with a
// completely different fix.
//
// THREE RULES, each learned from a bug shipped in this repo:
//
//   1. A LOCK MUST SAY WHAT STILL WORKS. "Configure Stripe" is a dead end. "You cannot take
//      card payments until Stripe is connected — invoices still send, clients just pay you
//      another way" is a limitation with a workaround. Most of these are not blockers, and
//      presenting them as blockers makes an incomplete product feel like a broken one.
//
//   2. HALF-CONFIGURED IS WORSE THAN UNCONFIGURED. resolveStorageConfig needs an access key
//      AND a secret; the live tenant had a bucket and an endpoint, so a naive "is it set up?"
//      said yes while the code fell through to a stale env endpoint and served 403 image
//      URLs. A capability check must mean "every part it needs is present", not "a field is
//      non-empty".
//
//   3. NEVER ASK A STUDIO FOR A KEY THAT IS NOT THEIRS. The competitor-search key and the
//      Prodigi catalogue key belong to the platform. A studio cannot fix those, and telling
//      them to set AXIXOS_INTERNAL_API_KEY was a real bug (v1.9.91). Ownership is recorded
//      here so the message can be addressed to whoever can actually act.
import { config } from '../config-reader';
import { pool } from '../db';

export type CredentialOwner = 'studio' | 'platform';

export interface Capability {
  key: string;
  /** What the studio loses, in their words — never the name of an integration. */
  label: string;
  /** Config keys that must ALL resolve. Rule 2: every part, not any part. */
  requires: string[];
  owner: CredentialOwner;
  /** Where the studio sets it. Null when the key is the platform's. */
  settingsPath: string | null;
  /** Rule 1: what still works without it. */
  worksWithout: string;
  /** What to say when it is missing. Addressed to whoever can fix it. */
  blockedMessage: string;
}

/**
 * Everything in this product that needs a credential to work.
 *
 * Adding a gated feature should be an entry here, not a new bespoke refusal.
 */
export const CAPABILITIES: Capability[] = [
  {
    key: 'online_payments',
    label: 'Taking card payments',
    requires: ['stripe_secret_key'],
    owner: 'studio',
    settingsPath: '/admin/settings/technical-setup',
    worksWithout: 'Invoices still send and can be marked paid by hand.',
    blockedMessage: 'Connect Stripe to let clients pay an invoice by card.',
  },
  {
    key: 'payment_confirmation',
    label: 'Automatic payment confirmation',
    requires: ['stripe_secret_key', 'stripe_webhook_secret'],
    owner: 'studio',
    settingsPath: '/admin/settings/technical-setup',
    // The honest version of a real hole: without the webhook an invoice is only marked paid
    // when the buyer's browser returns from Stripe, and the reconciler sweeps up the rest.
    worksWithout:
      'Payments are still recorded when the client returns from Stripe, and an hourly check '
      + 'catches any that were missed.',
    blockedMessage:
      'Add your Stripe webhook secret so payments are confirmed the moment they happen, '
      + 'rather than when the client comes back to the page.',
  },
  {
    key: 'sending_email',
    label: 'Sending email to clients',
    // Either transport is enough, so this is checked by hand below rather than by requires.
    requires: [],
    owner: 'studio',
    settingsPath: '/admin/settings/technical-setup',
    worksWithout: 'Everything else works; nothing leaves the building.',
    blockedMessage:
      'Connect an email account so invoices, contracts and booking confirmations can '
      + 'actually reach your clients.',
  },
  {
    key: 'file_storage',
    label: 'Uploading photographs',
    // Rule 2: all three. A bucket without a key is the half-configured state that served
    // 403s for a fortnight.
    requires: ['storage_access_key_id', 'storage_secret_key', 'storage_bucket'],
    owner: 'studio',
    settingsPath: '/admin/settings/technical-setup',
    worksWithout: 'The CRM, invoicing and calendar all work; only image upload is affected.',
    blockedMessage: 'Add your storage details before uploading photographs or logos.',
  },
  {
    key: 'ai_features',
    label: 'Writing help and image analysis',
    requires: ['openai_api_key'],
    owner: 'studio',
    settingsPath: '/admin/settings/technical-setup',
    worksWithout: 'Blog posts, galleries and everything else can still be written by hand.',
    blockedMessage: 'Add your OpenAI key to let the assistant draft and analyse for you.',
  },
  {
    key: 'selling_prints',
    label: 'Selling prints',
    requires: ['prodigi_api_key'],
    owner: 'studio',
    settingsPath: '/admin/settings/prodigi',
    worksWithout: 'You can browse and price the catalogue; only ordering needs an account.',
    blockedMessage:
      'Connect your own Prodigi account before selling prints. Orders are placed on your '
      + 'account, ship under your name, and Prodigi supports you directly.',
  },
  {
    // Missing from this registry entirely, so it could never be asked for — while the
    // onboarding wizard goes to real trouble to capture the place id from the studio's own
    // Maps link. Half the work was being done and none of it was being finished.
    key: 'google_reviews',
    label: 'Showing your Google reviews',
    requires: ['google_places_api_key', 'google_places_place_id'],
    owner: 'studio',
    settingsPath: '/admin/settings/google',
    worksWithout: 'Your site works; it just will not show the reviews you have already earned.',
    // Says WHY they are being asked for something they can already see working. During setup
    // the platform's own Places key pays, so a studio meets their real reviews on the first
    // preview without handing anything over — see server/lib/placesProvider.ts. That stops
    // when onboarding finishes, and their own key takes over their own traffic. Without this
    // sentence the request reads as being asked for a key for a feature already running.
    blockedMessage:
      'Add your Google Places key to keep showing your real reviews and rating on your live '
      + 'site. We showed them during setup on our own account; from here they run on yours. '
      + 'We already know which listing is yours from the map link you gave.',
  },
  {
    // Same omission. The columns and the whole export path have existed since ShootCleaner
    // shipped; the key was not even registered in config-reader, so nothing could read it.
    key: 'shootcleaner',
    label: 'Sending shoots to ShootCleaner',
    requires: ['shootcleaner_api_key'],
    owner: 'studio',
    settingsPath: '/admin/settings/technical-setup',
    worksWithout: 'Galleries, culling and delivery all work; only the hand-off is missing.',
    blockedMessage:
      'Add your ShootCleaner key to send a shoot straight from a gallery for culling and '
      + 'editing, instead of exporting and re-uploading it by hand.',
  },
  {
    key: 'calendar_sync',
    label: 'Two-way calendar sync',
    requires: ['google_client_id', 'google_client_secret'],
    owner: 'studio',
    settingsPath: '/admin/calendar-sync',
    worksWithout: 'The built-in calendar works; it just will not mirror to Google.',
    blockedMessage: 'Connect Google to keep this calendar and your own in step.',
  },
  {
    key: 'competitor_research',
    label: 'Automatic competitor research',
    // Rule 3: the studio MAY set their own, but the platform key covers everyone. Resolved
    // specially below, because "missing" here is not something a studio can fix.
    requires: [],
    owner: 'platform',
    settingsPath: null,
    worksWithout: 'You can add competitors and their prices by hand, then generate suggestions.',
    blockedMessage:
      'Automatic research is not available on this instance right now. Nothing you need to do.',
  },
];

/**
 * Where a capability actually stands.
 *
 * `available` is a boolean and some of these are not. Stripe is the clear case: a studio
 * finishes Connect onboarding, the keys are stored and readable, and they still cannot take
 * a payment because Stripe has not finished verifying them — which routinely takes hours
 * and sometimes days. Boolean-only, that reads as "ready", so the product would offer
 * card payment and the first customer to try it would fail.
 *
 * The states, and what each one means to the person reading it:
 *
 *   ready            it works now
 *   not_configured   nothing has been entered; the studio's move
 *   incomplete       some of it is entered and some is not — worse than nothing, because
 *                    half-configured looks configured (Rule 2 exists for this)
 *   pending          entered and accepted, waiting on somebody else — Stripe's
 *                    verification, a DNS record, a provider review. Nobody need do
 *                    anything except wait
 *   action_required  the provider has asked the studio for something specific
 *   unreadable       stored but undecryptable, i.e. the encryption key changed. Not the
 *                    studio's fault and not fixable by re-entering anything
 */
export type CapabilityStatus =
  | 'ready'
  | 'not_configured'
  | 'incomplete'
  | 'pending'
  | 'action_required'
  | 'unreadable';

export interface CapabilityState extends Capability {
  /**
   * True only for `ready`. Kept because every existing caller reads it, and a rename
   * across the gate, the banner, the endpoints and the tests would be a large diff whose
   * only purpose is to stop using a word — while any caller missed would silently invert.
   *
   * NOT simply status === 'ready'. The two answer different questions:
   *
   *   available  will this feature work if the studio uses it right now?
   *   status     what situation is it in?
   *
   * They usually agree and twice they deliberately do not. A Stripe account with charges
   * enabled but payouts not yet released CAN take a customer's money — blocking the sale
   * to warn about a bank transfer would cost the studio revenue to prevent nothing. And an
   * instance that cannot decrypt its own credentials leaves every door open, because
   * padlocking the product is the wrong answer to a rotated environment variable.
   *
   * Anything that needs to know "is it perfect" should read status. Anything deciding
   * whether to show a button should read this.
   */
  available: boolean;
  status: CapabilityStatus;
  /** Which required keys are missing. Empty when available. */
  missing: string[];
  /**
   * What the studio should understand right now. Distinct from blockedMessage, which is
   * fixed text about the capability; this reflects the state it is actually in.
   */
  statusDetail?: string;
}

/**
 * Which state a set of missing keys puts a capability in.
 *
 * Nothing entered and something entered are different situations and the studio should be
 * told different things: one is "your move", the other is "you started this and it is not
 * finished", which is the state that produces a feature that looks live and is not.
 */
/**
 * Whether Stripe will actually process a charge, as opposed to whether we hold a key.
 *
 * A studio finishes Connect onboarding, the secret key is stored and valid, and Stripe
 * still has not verified them — routinely for hours, sometimes days, and occasionally it
 * stops to ask for a document. Every one of those states holds a working key and refuses
 * every charge, so "we have the key" is not the same question as "can they be paid", and
 * only the second one matters to a photographer about to publish a booking page.
 *
 * CACHED, because the setup banner calls capabilityStates() on every admin page load and
 * a Stripe round trip per page is not acceptable. Sixty seconds matches the other
 * resolvers in this codebase, and verification does not complete inside a minute.
 *
 * Never throws. A Stripe outage must not padlock a CRM.
 */
/**
 * `chargesEnabled` is carried separately from `status` because it is the one fact that
 * decides whether a checkout button should exist, and no single status value expresses it:
 * a pending account may or may not be able to charge.
 */
type StripeReadiness = { status: CapabilityStatus; detail?: string; chargesEnabled?: boolean };
let _stripeCache: { value: StripeReadiness; at: number } | null = null;
const STRIPE_TTL_MS = 60_000;

export function invalidateStripeReadiness(): void { _stripeCache = null; }

async function stripeReadiness(secretKey: string): Promise<StripeReadiness> {
  if (_stripeCache && Date.now() - _stripeCache.at < STRIPE_TTL_MS) return _stripeCache.value;

  let value: StripeReadiness = { status: 'ready' };
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secretKey, { apiVersion: '2025-08-27.basil' as any });
    const account = await stripe.accounts.retrieve();

    const due = account.requirements?.currently_due || [];
    const disabledReason = account.requirements?.disabled_reason || null;

    if (account.charges_enabled && account.payouts_enabled) {
      value = { status: 'ready', chargesEnabled: true };
    } else if (due.length > 0 || disabledReason) {
      // Stripe is waiting on the STUDIO for something specific. That is a different
      // message from "still checking" and it is the one that needs acting on.
      value = {
        status: 'action_required',
        chargesEnabled: account.charges_enabled === true,
        detail: 'Stripe needs more information before you can take payments. '
          + 'Open your Stripe dashboard to see what is outstanding.',
      };
    } else if (account.charges_enabled && !account.payouts_enabled) {
      // Money can be taken and not yet paid out. The feature WORKS — the studio can sell
      // today — so this must not padlock anything; it is a thing to tell them, not a thing
      // to stop them doing. Handled at the call site, which keeps available true for this
      // one status.
      value = {
        status: 'pending',
        chargesEnabled: true,
        detail: 'You can take payments now. Stripe has not released payouts to your bank '
          + 'yet, so money will sit in Stripe until it does.',
      };
    } else {
      value = {
        status: 'pending',
        detail: 'Stripe is still verifying your account. Nothing to do — payments switch on '
          + 'by themselves when it finishes.',
      };
    }
  } catch {
    // Cannot ask. Do not invent a verdict, and do not padlock: leave it as configured and
    // let a real charge fail with a real Stripe error if something is genuinely wrong.
    value = { status: 'ready' };
  }

  _stripeCache = { value, at: Date.now() };
  return value;
}

function statusFromMissing(cap: Capability, missing: string[], anyPresent: boolean): CapabilityStatus {
  if (missing.length === 0) return 'ready';
  return anyPresent ? 'incomplete' : 'not_configured';
}

/**
 * Are the stored credentials READABLE at all?
 *
 * decrypt() returns null when it cannot authenticate the ciphertext, and config.get hands
 * that back as "no value" — indistinguishable from a field nobody has filled in. So if
 * ENCRYPTION_KEY or SESSION_SECRET ever changes, every encrypted credential reads as unset
 * at once.
 *
 * Without this check the capability gate would then padlock the ENTIRE product and invite
 * the studio to re-enter nine keys, when the actual fix is to restore one environment
 * variable. Telling somebody to re-key their whole business because a secret rotated is
 * about the worst advice this file could give.
 *
 * The test: count the encrypted columns that hold ciphertext, and count how many of those
 * resolve to a value. Ciphertext present and nothing readable is not an unconfigured
 * studio — it is a broken key.
 */
export async function encryptionHealthy(): Promise<{ healthy: boolean; stored: number; readable: number }> {
  const PAIRS: [string, string][] = [
    ['stripe_secret_key_encrypted', 'stripe_secret_key'],
    ['openai_api_key_encrypted', 'openai_api_key'],
    ['storage_secret_key_encrypted', 'storage_secret_key'],
    ['smtp_pass_encrypted', 'smtp_pass'],
    ['brevo_api_key_encrypted', 'brevo_api_key'],
    ['prodigi_api_key_encrypted', 'prodigi_api_key'],
  ];
  try {
    const r = await pool.query(`SELECT * FROM studio_integrations LIMIT 1`);
    const row: any = r.rows[0] || {};
    let stored = 0;
    let readable = 0;
    for (const [column, key] of PAIRS) {
      if (!row[column] || !String(row[column]).trim()) continue;
      stored++;
      if (await has(key)) readable++;
    }
    // Nothing stored is a brand-new studio, which is perfectly healthy.
    return { healthy: stored === 0 || readable > 0, stored, readable };
  } catch {
    // Cannot tell. Assume healthy: the alternative is padlocking on a database blip.
    return { healthy: true, stored: 0, readable: 0 };
  }
}

/** Is a single config value actually present? */
async function has(key: string): Promise<boolean> {
  try {
    const v = await config.get(key);
    return !!(v && String(v).trim());
  } catch {
    return false;
  }
}

/**
 * Evaluate every capability against what is actually configured.
 *
 * Read on demand rather than cached: a studio that has just pasted a key expects the padlock
 * to be gone when they go back, and a minute of staleness there reads as "it did not save".
 */
export async function capabilityStates(): Promise<CapabilityState[]> {
  const out: CapabilityState[] = [];

  // If the stored credentials cannot be read at all, report everything as AVAILABLE and
  // let each feature fail with its own error. A padlock is a claim about what the studio
  // has configured, and that claim would be false here — they configured it fine, the
  // instance lost the key to read it. Leaving the doors open surfaces the real problem
  // where it happens instead of hiding it behind nine misleading locks.
  const encryption = await encryptionHealthy();
  if (!encryption.healthy) {
    console.error(
      '[capabilities] ' + encryption.stored + ' encrypted credential(s) stored and none readable — '
      + 'ENCRYPTION_KEY or SESSION_SECRET has probably changed. Not padlocking: the studio '
      + 'configured these correctly and re-entering them will not fix it.',
    );
    // available:true with status:'unreadable' — the ONE place these two disagree, and it
    // is deliberate. `unreadable` is what is true; `available: true` is the policy, because
    // padlocking here would tell a studio to re-enter nine keys when the actual fix is to
    // restore one environment variable. The status carries the truth for anything that wants
    // to explain the situation, and the boolean keeps the doors open so each feature fails
    // where the real problem is.
    return CAPABILITIES.map((c) => ({
      ...c,
      available: true,
      status: 'unreadable' as const,
      missing: [],
      statusDetail:
        'Your saved credentials cannot be read. This is not something you can fix by '
        + 're-entering them — the instance encryption key has changed.',
    }));
  }

  for (const cap of CAPABILITIES) {
    let missing: string[] = [];

    if (cap.key === 'sending_email') {
      // Either an SMTP account or Brevo. Requiring both would lock a studio out of a feature
      // they have perfectly well configured.
      const smtp = (await has('smtp_host')) && (await has('smtp_user')) && (await has('smtp_pass'));
      const brevo = await has('brevo_api_key');
      if (!smtp && !brevo) missing = ['smtp_host', 'brevo_api_key'];
    } else if (cap.key === 'competitor_research') {
      // The studio's own key OR the platform's. Read through the same resolver the crawl
      // uses, so this cannot disagree with what actually happens when they press the button.
      const { searchConfigured } = await import('./searchProvider');
      if (!(await searchConfigured())) missing = ['search_api_key'];
    } else {
      for (const key of cap.requires) {
        if (!(await has(key))) missing.push(key);
      }
    }

    // Did they enter SOME of it? Half-configured is its own state, and the one most worth
    // naming — a bucket with no key looks configured from every angle except the one that
    // matters.
    let anyPresent = false;
    for (const key of cap.requires) {
      if (!missing.includes(key) && (await has(key))) { anyPresent = true; break; }
    }

    let status = statusFromMissing(cap, missing, anyPresent);
    let statusDetail: string | undefined =
      status === 'incomplete'
        ? 'Some of this is set up and some of it is not, so it will not work yet.'
        : undefined;

    // Holding a valid key is not the same as being able to charge a card. Only asked when
    // the key is actually there — there is nothing to ask about otherwise.
    let chargesWorkAnyway = false;
    if (cap.key === 'online_payments' && status === 'ready') {
      const secret = String((await config.get('stripe_secret_key')) || '');
      if (secret) {
        const readiness = await stripeReadiness(secret);
        status = readiness.status;
        statusDetail = readiness.detail;
        chargesWorkAnyway = readiness.chargesEnabled === true;
      }
    }

    out.push({
      ...cap,
      status,
      // action_required and a not-yet-charging pending are NOT available: a booking page
      // that takes a card Stripe will refuse is worse than one saying payments are not on.
      //
      // But charges-enabled-without-payouts IS available. That studio can sell today, and
      // the payout delay is Stripe holding their money for a few days, not a broken
      // checkout. See the note on `available` in the interface.
      available: status === 'ready' || chargesWorkAnyway,
      missing,
      statusDetail,
    });
  }

  return out;
}

/** One capability, for a server path that wants to refuse early. */
export async function capability(key: string): Promise<CapabilityState | null> {
  const all = await capabilityStates();
  return all.find((c) => c.key === key) || null;
}

/**
 * The standard refusal body.
 *
 * Every gated endpoint returns THIS rather than inventing its own shape, so the client gate
 * renders the same thing everywhere and a new gated feature needs no new client code.
 */
export function capabilityRequired(state: CapabilityState) {
  return {
    error: 'capability_required',
    capability: state.key,
    message: state.blockedMessage,
    worksWithout: state.worksWithout,
    // Null for a platform key: there is nothing for the studio to click, and offering a link
    // to a settings page they cannot fix is worse than offering none.
    settingsPath: state.owner === 'studio' ? state.settingsPath : null,
    owner: state.owner,
  };
}
