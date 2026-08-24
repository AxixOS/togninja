// The one place the studio-side contract screens talk to /api/contracts.
//
// Four screens read the same rows — the list, the composer, a draft, and the template
// editor — and every one of them needs the same three things right: the session cookie,
// the server's own wording when something is refused, and the merge-field metadata. Each
// screen doing its own fetch() is how three of them end up with slightly different ideas
// about what a 400 means.
//
// TWO THINGS THIS MODULE DELIBERATELY DOES NOT DO.
//
//  - It does not substitute merge fields. That is shared/contractMerge.ts, which is the
//    same module the server sends with, and the screens call it directly. A "helpful"
//    wrapper here would be a second implementation in all but name.
//
//  - It does not decide what is unresolved. mergeContract() reports that and canSend()
//    rules on it; this module only carries values to and from the server.
import { format, parseISO } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { MERGE_FIELDS, type MergeField } from '../../../../shared/contractMerge';

// ── What the endpoints return ───────────────────────────────────────────────
//
// snake_case throughout: server/routes/contracts.ts queries with pool.query, so these are
// raw pg rows and not Drizzle's camelCase. Renaming them here would only move the moment
// somebody reads `signedAt` off a row that has `signed_at`.

export interface ContractListRow {
  id: string;
  title: string;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  created_at: string | null;
  first_name: string | null;
  last_name: string | null;
  client_email: string | null;
  signer_count: number;
  signed_count: number;
}

export interface ContractSigner {
  id: string;
  name: string;
  email: string;
  role: string;
  signed_at: string | null;
  sort_order?: number;
}

export interface ContractDetail {
  id: string;
  title: string;
  /** The merged text AS SENT. A snapshot — editing the template never changes it. */
  body: string;
  status: string;
  template_id: string | null;
  client_id: string | null;
  merge_values: Record<string, string> | null;
  /** The capability in the client's link. Null until the contract has been sent. */
  access_token: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  signers: ContractSigner[];
}

export interface ContractTemplate {
  id: string;
  name: string;
  category: string | null;
  body: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
  /** Computed by the route with fieldsUsed(); includes tokens that are not real fields. */
  fieldsUsed: string[];
}

export interface SignerInput {
  name: string;
  email: string;
  role: string;
}

// ── Talking to the server ───────────────────────────────────────────────────

/**
 * A failed call, carrying the server's own words.
 *
 * `code` exists because the send endpoint answers with a MACHINE name in `error` and the
 * prose in `message` — {error:'unresolved_fields', message:'Fill in [Total Fee]…'} — while
 * every other failure puts the prose in `error` and sends no `message` at all. A screen
 * that reads `error` blindly shows the studio the string "unresolved_fields", and one that
 * reads `message` blindly shows nothing. Both shapes are normalised once, here.
 */
export class ContractApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ContractApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/contracts${path}`, {
      method: init.method || 'GET',
      // requireAuth reads req.session.userId (server/auth.ts): the cookie IS the
      // authorisation. Without this every admin call 401s while looking like a
      // permissions bug.
      credentials: 'include',
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ContractApiError(0, 'network', 'Could not reach the server. Check your connection and try again.');
  }

  // A 502 from a proxy is HTML, not JSON. Parsing defensively keeps the studio's error
  // readable instead of "Unexpected token < in JSON".
  const payload: any = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      throw new ContractApiError(401, 'unauthenticated', 'Your admin session has expired. Sign in again.');
    }
    const message =
      (payload && typeof payload.message === 'string' && payload.message) ||
      (payload && typeof payload.error === 'string' && payload.error) ||
      `The server refused that (HTTP ${res.status}).`;
    const code =
      payload && typeof payload.message === 'string' && typeof payload.error === 'string'
        ? payload.error
        : '';
    throw new ContractApiError(res.status, code, message);
  }

  return payload as T;
}

export const listContracts = () => request<ContractListRow[]>('/');

export const getContract = (id: string) => request<ContractDetail>(`/${encodeURIComponent(id)}`);

export const createContract = (input: {
  templateId: string;
  clientId?: string | null;
  title?: string;
  values?: Record<string, string>;
}) => request<{ ok: boolean; id: string; unresolved: string[] }>('/', { method: 'POST', body: input });

export const saveSigners = (id: string, signers: SignerInput[]) =>
  request<{ ok: boolean; count: number }>(`/${encodeURIComponent(id)}/signers`, {
    method: 'PUT',
    body: { signers },
  });

export const sendContract = (id: string) =>
  request<{ ok: boolean; token: string; signUrl: string }>(`/${encodeURIComponent(id)}/send`, {
    method: 'POST',
    body: {},
  });

export const listTemplates = () => request<ContractTemplate[]>('/templates');

export const createTemplate = (input: { name: string; body: string; category?: string }) =>
  request<{ ok: boolean; id: string }>('/templates', { method: 'POST', body: input });

export const updateTemplate = (
  id: string,
  input: { name?: string; body?: string; category?: string; isActive?: boolean },
) => request<{ ok: boolean }>(`/templates/${encodeURIComponent(id)}`, { method: 'PUT', body: input });

/**
 * The studio-sourced merge values the BROWSER is able to see, for a preview.
 *
 * The server fills these from studio_configs inside studioValues(). The admin endpoint
 * that exposes that same row is GET /api/studio/branding — and it does not carry
 * `country`, which the merge field [State/Country] needs. So this returns what it can and
 * NAMES what it cannot, in `unreadable`.
 *
 * No screen may present that difference as a data gap. A field the browser cannot read is
 * not a field the server is missing, and reporting it as "missing" would train a studio to
 * ignore the one warning that matters. Which is why a preview assembled here is advisory
 * and the DRAFT's own check — mergeContract() over the body the server actually stored —
 * is what gates sending.
 *
 * A failure is not fatal either: an unreadable studio profile leaves those placeholders
 * visible in the preview, which is exactly what mergeContract does with a value it has
 * not got.
 */
export async function fetchStudioMergeValues(): Promise<{
  values: Record<string, string>;
  unreadable: string[];
}> {
  // Today is on this list rather than computed here on purpose. The server formats it
  // inside studioValues(); a second date format in the browser would be a preview that
  // disagrees with the document about how the date is written.
  const unreadable = ['State/Country', 'Today'];
  try {
    const res = await fetch('/api/studio/branding', { credentials: 'include' });
    if (!res.ok) return { values: {}, unreadable };
    const b: any = await res.json();
    const values: Record<string, string> = {};
    // studio_name || business_name — the same precedence as studioValues().
    const name = String(b?.studioName || b?.businessName || '').trim();
    if (name) values['Studio Name'] = name;
    if (b?.email) values['Studio Email'] = String(b.email);
    if (b?.phone) values['Studio Phone'] = String(b.phone);
    if (b?.address) values['Studio Address'] = String(b.address);
    if (b?.city) values['City Name'] = String(b.city);
    return { values, unreadable };
  } catch {
    return { values: {}, unreadable };
  }
}

// ── The client's link ───────────────────────────────────────────────────────

/**
 * The URL a client opens.
 *
 * /contract/:token, matching what POST /:id/send hands back and what App.tsx registers for
 * ContractSignPage. Built in one place so no screen can invent a second spelling — a
 * "Share Booking Link" button once copied /schedule/<slug> while the only registered route
 * was /book/:slug, and every customer sent one landed on the catch-all.
 */
export const signUrlFor = (token: string): string => `${window.location.origin}/contract/${token}`;

/**
 * Put a link on the clipboard, and say honestly whether it worked.
 *
 * navigator.clipboard is undefined outside a secure context and rejects when the document
 * is not focused, so the caller is told `false` rather than shown a "Copied" tick over an
 * empty clipboard — the studio would then paste nothing into an email and not find out
 * until the client says no link ever arrived.
 */
export async function copyLink(url: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    /* fall through to the textarea route */
  }
  try {
    const el = document.createElement('textarea');
    el.value = url;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

// ── Status ──────────────────────────────────────────────────────────────────

/** The statuses contracts.status carries, and what each is worth on screen. */
export const STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  sent: { label: 'Sent', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  viewed: { label: 'Opened', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  signed: { label: 'Signed', className: 'bg-green-50 text-green-700 border-green-200' },
  declined: { label: 'Declined', className: 'bg-red-50 text-red-700 border-red-200' },
  expired: { label: 'Expired', className: 'bg-red-50 text-red-700 border-red-200' },
};

export const statusMeta = (status: string) =>
  STATUS_META[String(status || '').toLowerCase()] || {
    label: String(status || 'Unknown'),
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  };

// ── Merge-field metadata, derived from the shared list ──────────────────────
//
// Everything below reads MERGE_FIELDS. Nothing re-states it: that array is the contract
// between the editor and the sender, and a second copy here would be the first thing to go
// stale when a field is added.

export const MERGE_FIELD_BY_KEY: Record<string, MergeField> = Object.fromEntries(
  MERGE_FIELDS.map((f) => [f.key, f]),
);

/** How the palette groups fields, in the order a person fills them in. */
export const SOURCE_ORDER: MergeField['source'][] = [
  'studio',
  'client',
  'session',
  'money',
  'date',
  'manual',
];

export const SOURCE_LABEL: Record<MergeField['source'], string> = {
  studio: 'Your studio',
  client: 'The client',
  session: 'The shoot',
  money: 'Money',
  date: 'Dates',
  manual: 'You fill in',
};

/**
 * Is this field supplied by the server rather than by the person creating the contract?
 *
 * studioValues() in server/routes/contracts.ts fills exactly the studio-sourced keys, plus
 * Today, from studio_configs on every create. Asking a photographer to type their own
 * studio name into every contract would be absurd — and listing those keys as "missing" in
 * a preview the browser assembled would be a false alarm about a field the server is about
 * to fill.
 *
 * Derived from `source` rather than listed, so a studio field added to MERGE_FIELDS later
 * is covered without anybody remembering this function exists.
 */
export const isServerFilled = (key: string): boolean =>
  MERGE_FIELD_BY_KEY[key]?.source === 'studio' || key === 'Today';

/** Filled from crm_clients by the same route, but only when a client is chosen. */
export const isClientFilled = (key: string): boolean => MERGE_FIELD_BY_KEY[key]?.source === 'client';

// ── Small shared formatting ─────────────────────────────────────────────────

export const dateLocaleFor = (language: string) => (language === 'de' ? de : enUS);

/** A date for the studio's own screens. Empty string for anything unparseable. */
export function fmtDate(iso: string | null | undefined, language: string, pattern = 'PPP'): string {
  if (!iso) return '';
  try {
    return format(parseISO(String(iso)), pattern, { locale: dateLocaleFor(language) });
  } catch {
    return '';
  }
}

/** A client's display name from a contract row, or an empty string. */
export const clientNameOf = (row: { first_name?: string | null; last_name?: string | null }): string =>
  [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
