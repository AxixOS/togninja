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

export interface CapabilityState extends Capability {
  available: boolean;
  /** Which required keys are missing. Empty when available. */
  missing: string[];
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
    return CAPABILITIES.map((c) => ({ ...c, available: true, missing: [] }));
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

    out.push({ ...cap, available: missing.length === 0, missing });
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
