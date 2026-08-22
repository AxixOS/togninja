// Normalise a gallery request body into the property names Drizzle expects.
//
// WHY THIS EXISTS — this was a live security hole, not tidiness.
//
// The admin sends a MIXED payload (client/src/lib/gallery-api.ts): camelCase for
// title/coverImage/coverPosition, snake_case for client_id / is_public /
// is_password_protected. The create route passed that object straight to
// storage.createGallery -> db.insert(galleries).values(...).
//
// Drizzle resolves keys against the table object, whose properties are camelCase. It does
// not throw on an unknown key — it SILENTLY OMITS it and lets the column default apply.
// Proven against the live database; the generated SQL was:
//
//   insert into "galleries" (... "is_public", "is_password_protected", "client_id" ...)
//   values (... default, default, ..., default ...)
//
// So a gallery the studio created with "password protect" switched ON was stored as:
//   password                = the text they typed
//   is_password_protected   = false   (column default)
//   is_public               = true    (column default)
//   client_id               = null
//
// Which chains into a complete compromise of every delivered shoot:
//   1. is_public = true puts the gallery in GET /api/galleries, which is unauthenticated
//   2. that response carries the slug
//   3. POST /api/galleries/<slug>/auth succeeds with ANY email, because the code only
//      demands a password when is_password_protected is true
//   4. the signed token that comes back opens /images and /download legitimately
//
// The token layer hardened in v1.9.44/45 is bypassed entirely — not defeated, simply never
// engaged, because the gallery was never marked as needing protection.
//
// Note this is invisible in the admin: the wizard shows what the studio typed, and the
// gallery list reads its own is_password_protected, so the row shows unprotected only if
// anyone thinks to look.

/** Every writable gallery column, keyed by the Drizzle property name. */
const FIELDS: Record<string, string[]> = {
  // drizzle property        accepted aliases from any client
  title: ['title'],
  description: ['description'],
  slug: ['slug'],
  coverImage: ['coverImage', 'cover_image'],
  coverPosition: ['coverPosition', 'cover_position'],
  coverScale: ['coverScale', 'cover_scale'],
  coverTemplate: ['coverTemplate', 'cover_template'],
  isPublic: ['isPublic', 'is_public'],
  isPasswordProtected: ['isPasswordProtected', 'is_password_protected'],
  password: ['password'],
  downloadEnabled: ['downloadEnabled', 'download_enabled'],
  // The wizard calls these "watermarkEnabled"/"invisibleWatermarkEnabled"; the columns
  // are visible_watermark / invisible_watermark.
  visibleWatermark: ['visibleWatermark', 'visible_watermark', 'watermarkEnabled', 'watermark_enabled'],
  invisibleWatermark: ['invisibleWatermark', 'invisible_watermark', 'invisibleWatermarkEnabled', 'invisible_watermark_enabled'],
  expiresAt: ['expiresAt', 'expires_at'],
  status: ['status'],
  clientId: ['clientId', 'client_id'],
  sortOrder: ['sortOrder', 'sort_order'],
};

const BOOLEANS = new Set(['isPublic', 'isPasswordProtected', 'downloadEnabled', 'visibleWatermark', 'invisibleWatermark']);
const JSON_COLUMNS = new Set(['coverPosition', 'coverTemplate']);

const bool = (v: any): boolean =>
  typeof v === 'boolean' ? v : /^(1|true|yes|on)$/i.test(String(v));

export interface NormalisedGallery {
  [key: string]: any;
}

/**
 * Pick the gallery columns out of a request body, under either naming convention.
 *
 * Only keys the caller actually sent appear in the result, so this is safe for a PATCH
 * as well as a create — an absent key means "don't change", never "set to null".
 */
export function normaliseGalleryInput(body: any): NormalisedGallery {
  const out: NormalisedGallery = {};
  if (!body || typeof body !== 'object') return out;

  for (const [column, aliases] of Object.entries(FIELDS)) {
    const alias = aliases.find((a) => body[a] !== undefined);
    if (!alias) continue;
    let value = body[alias];

    if (BOOLEANS.has(column)) {
      value = value === null ? null : bool(value);
    } else if (column === 'expiresAt') {
      // An empty string is "no expiry", not Invalid Date — which Postgres rejects.
      value = value ? new Date(value) : null;
      if (value instanceof Date && Number.isNaN(value.getTime())) value = null;
    } else if (column === 'sortOrder' || column === 'coverScale') {
      const n = Number(value);
      value = Number.isFinite(n) ? n : undefined;
      if (value === undefined) continue;
    } else if (JSON_COLUMNS.has(column) && typeof value === 'string') {
      try { value = JSON.parse(value); } catch { /* leave the string; the column is jsonb-tolerant */ }
    } else if (column === 'clientId' && value === '') {
      value = null; // an empty select, not a foreign key of ''
    }

    out[column] = value;
  }

  return out;
}

/**
 * Is this gallery about to be saved as "protected" with nothing to check?
 *
 * Returns an error message, or null when the state is sound. `current` carries the row as
 * it stands so a partial update can be judged on the state it PRODUCES: switching
 * protection on without sending a password is fine when one is already stored, and sending
 * an empty password is not fine when protection stays on.
 */
export function passwordStateError(
  incoming: NormalisedGallery,
  current?: { isPasswordProtected?: boolean | null; password?: string | null },
): string | null {
  const willBeProtected = incoming.isPasswordProtected !== undefined
    ? Boolean(incoming.isPasswordProtected)
    : Boolean(current?.isPasswordProtected);

  if (!willBeProtected) return null;

  const willHavePassword = incoming.password !== undefined
    ? String(incoming.password ?? '').trim()
    : String(current?.password ?? '').trim();

  return willHavePassword ? null : 'Set a password, or switch password protection off.';
}
