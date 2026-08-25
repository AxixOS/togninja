// The header image on a client-facing document.
//
// THE IDEA, from the product owner: a delivered document should carry a photograph, and the
// best photograph available is one of the CLIENT'S OWN — the studio has every picture it has
// ever taken of them. Pixieset offers a fixed stock set; this is a better answer than theirs.
// When the client has no gallery yet, the studio's chosen default is used instead.
//
// THE THING TO KNOW BEFORE CHANGING ANY OF THIS: the fallback is the COMMON path, not the
// edge case. On the live tenant 1 of 64 clients has a gallery. A feature designed around the
// happy path would be invisible to 63 of 64 clients, so the studio default has to be good on
// its own, and the no-image case has to look deliberate rather than broken.
//
// TWO TRAPS THIS AVOIDS, both found by reading the live data rather than the schema:
//
//   galleries.cover_image is NOT a URL. It is a base64 data: URI stored inline — 68,863 and
//   293,211 characters on the two live rows, declared merely as text("cover_image"). It is
//   the obvious source and the wrong one: it cannot be fetched, and embedding a quarter of a
//   megabyte of base64 into a PDF for a header is absurd. gallery_images.url holds real
//   fetchable HTTPS URLs, and that is what this reads.
//
//   The contract renderer is structurally SYNCHRONOUS — renderExecutedContractPdf wraps a
//   synchronous body in new Promise() and resolves on doc.on('end'). An image fetch cannot
//   happen inside it. So this module hands back a BUFFER, fetched by the caller before
//   rendering starts, rather than a URL the renderer would have to resolve mid-draw.
import sharp from 'sharp';
import { pool } from '../db';

export type HeaderSource = 'document' | 'client-gallery' | 'studio-default' | 'none';

export interface DocumentHeader {
  url: string | null;
  source: HeaderSource;
  /** Why this one, in words a settings screen can show. */
  reason: string;
}

/**
 * The studio's document-design defaults.
 *
 * studio_configs.document_design JSONB — the "studio defaults in Branding" store. The same
 * shape is stored per-document for the override, so one merge covers both:
 *
 *     const design = { ...studioDefaults, ...(document.documentDesign || {}) }
 *
 * which is exactly the merge GalleryPage.tsx already performs against cover_template, and it
 * works there, so it is copied rather than reinvented.
 */
export interface DocumentDesign {
  /** The studio's fallback header, used when the client has no gallery of their own. */
  headerImageUrl?: string | null;
  /** Images the studio has picked out for this purpose — the cover-image library. */
  headerLibrary?: string[];
  /** Whether a document should try the client's own gallery first at all. */
  preferClientGallery?: boolean;
}

export async function studioDocumentDesign(): Promise<DocumentDesign> {
  const r = await pool.query('SELECT document_design FROM studio_configs LIMIT 1')
    .catch(() => ({ rows: [] as any[] }));
  const raw = r.rows?.[0]?.document_design;
  if (!raw || typeof raw !== 'object') return {};
  return {
    headerImageUrl: typeof raw.headerImageUrl === 'string' ? raw.headerImageUrl : null,
    headerLibrary: Array.isArray(raw.headerLibrary)
      ? raw.headerLibrary.filter((u: any) => typeof u === 'string' && u.trim())
      : [],
    // Defaults to true: the whole point of the feature is the client's own photograph.
    preferClientGallery: raw.preferClientGallery !== false,
  };
}

/**
 * One of this client's own photographs, if they have one.
 *
 * The ordering is deliberate: a favourite first (the studio has said that one is good), then
 * the newest gallery, then the studio's own sort order within it. `url LIKE 'http%'` excludes
 * the base64 rows discussed above — a data URI would satisfy "not null" and then fail every
 * fetch downstream.
 */
async function clientGalleryImage(clientId: string): Promise<string | null> {
  const r = await pool.query(
    `SELECT gi.url
       FROM gallery_images gi
       JOIN galleries g ON g.id = gi.gallery_id
      WHERE g.client_id = $1
        AND g.deleted_at IS NULL
        AND gi.url LIKE 'http%'
      ORDER BY gi.is_favorite DESC NULLS LAST, g.created_at DESC, gi.sort_order ASC
      LIMIT 1`,
    [clientId],
  ).catch(() => ({ rows: [] as any[] }));
  const url = r.rows?.[0]?.url;
  return typeof url === 'string' && url.trim() ? url.trim() : null;
}

/**
 * Which image should head this document?
 *
 * @param clientId the document's client, when it has one. An invoice always does; a blank
 *   template does not. Absent simply means "go straight to the studio default".
 * @param override a per-document choice, which beats everything — the studio picked it for
 *   this document specifically.
 */
export async function resolveDocumentHeader(
  clientId?: string | null,
  override?: string | null,
): Promise<DocumentHeader> {
  const chosen = typeof override === 'string' ? override.trim() : '';
  if (chosen) {
    // Its own source, not studio-default. A settings screen that says "your default cover"
    // about a picture somebody chose for THIS document is telling the studio the opposite
    // of what happened.
    return { url: chosen, source: 'document', reason: 'Chosen for this document.' };
  }

  const design = await studioDocumentDesign();

  if (clientId && design.preferClientGallery !== false) {
    const own = await clientGalleryImage(String(clientId));
    if (own) {
      return {
        url: own,
        source: 'client-gallery',
        reason: 'A photograph from this client\'s own gallery.',
      };
    }
  }

  const fallback = (design.headerImageUrl || '').trim();
  if (fallback) {
    return {
      url: fallback,
      source: 'studio-default',
      reason: clientId
        ? 'This client has no gallery yet, so your default cover is used.'
        : 'Your default cover.',
    };
  }

  return {
    url: null,
    source: 'none',
    reason: 'No cover image set. Documents will print without a header.',
  };
}

/**
 * Fetch a header image into a Buffer a PDF renderer can draw.
 *
 * PDFKit understands JPEG and PNG and nothing else, so WebP — which this product's own
 * uploader produces — is converted rather than thrown at it. Everything is best-effort: a
 * header image that cannot be fetched must never cost the studio the document. It returns
 * null and the caller draws no header.
 *
 * Bounded on purpose. A studio can point this at any URL, and a renderer blocking forever on
 * a slow host would hang the request that is generating an invoice.
 */
export async function fetchHeaderImage(url: string | null): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) {
      console.warn(`[documentHeader] header image fetch returned ${res.status} for ${url}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());

    // Re-encode anything that is not already PDF-safe, and cap the pixels: a 6000px original
    // straight off a camera makes a 20MB invoice for a strip 200 points tall.
    const type = String(res.headers.get('content-type') || '').toLowerCase();
    if (type.includes('webp') || type.includes('avif') || type.includes('tiff') || !type.startsWith('image/')) {
      return await sharp(buf).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    }
    return await sharp(buf).resize({ width: 1600, withoutEnlargement: true }).toBuffer();
  } catch (e: any) {
    console.warn('[documentHeader] header image unavailable:', e?.message || e);
    return null;
  }
}

/** Resolve and fetch in one step, for a caller that just wants the bytes. */
export async function documentHeaderBuffer(
  clientId?: string | null,
  override?: string | null,
): Promise<{ buffer: Buffer | null; header: DocumentHeader }> {
  const header = await resolveDocumentHeader(clientId, override);
  return { buffer: await fetchHeaderImage(header.url), header };
}
