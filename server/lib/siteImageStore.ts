// Storing one of the studio's site photographs: describe it, stamp it, upload it, record it.
//
// WHY THIS IS A MODULE AND NOT PART OF THE UPLOAD HANDLER.
//
// All of this lived inside storeSectionImage() in setup-routes, an Express handler, so the
// ONLY way to get a photograph stored properly was for a human to pick it in the wizard.
// Meanwhile homepage-pipeline auto-filled hero/content-1/content-2 from the crawl by
// INSERTing the crawled URL straight into homepage_images — no download, no analysis, no
// metadata. Two paths into one table, and the automatic one did none of the work:
//
//   • it hotlinked. Observed live on the demo: all three homepage photographs still served
//     from images.squarespace-cdn.com, on an instance whose entire purpose is to replace
//     that Squarespace site. They break the week the studio cancels the hosting.
//   • no alt text, so the pictures a studio never touches are the ones with no description.
//   • no IPTC, so the files that travel furthest carry no byline or copyright at all.
//
// The wizard path did all three correctly. So the fix is not to teach the pipeline the same
// tricks — that is how the two doors drift apart — but to give both the same door.
//
// EVERYTHING HERE IS BEST-EFFORT except the upload itself. A studio blocked from storing a
// picture because a vision call timed out would be a far worse bug than the one this fixes.

import path from 'path';
import crypto from 'crypto';
import { db } from '../db';
import { sql } from 'drizzle-orm';

export const FIXED_IMAGE_SECTIONS = new Set(['hero', 'content-1', 'content-2']);

export interface StoreSiteImageInput {
  /** 'hero' | 'content-1' | 'content-2' | 'services-<slug>' */
  section: string;
  buffer: Buffer;
  mime: string;
  /** Used for the extension and as a last-resort filename stem. */
  originalName: string;
  /** Caller's alt text. A vision description beats it when one is available. */
  alt?: string | null;
  /**
   * Where a 'hero' should be mirrored to, when the caller already knows.
   *
   * Otherwise it is looked up from studio_configs.homepage_gen_state.draftId — which is
   * correct for an upload arriving later, and WRONG for the pipeline, which creates the page
   * and assigns its images ~70 lines before it writes that draft id. The lookup found null and
   * the mirror silently did nothing, so a generated homepage came out with no hero at all
   * while its two content photographs were both in place.
   */
  heroPageId?: string | null;
}

export interface StoreSiteImageResult {
  url: string;
  section: string;
  /** Slug of the pillar page this also became the hero of, when it was a services- slot. */
  pillarPage: string | null;
  alt: string | null;
}

/** The pillar's own label, so filenames and keywords say "Boudoir Photography", not "services-boudoir-photography". */
async function serviceLabelFor(section: string): Promise<string> {
  if (FIXED_IMAGE_SECTIONS.has(section)) return '';
  try {
    const { rows } = await db.execute(sql`SELECT authority_map FROM studio_configs LIMIT 1`) as any;
    const pillars = ((rows ?? [])[0]?.authority_map?.pillars || []) as any[];
    const match = pillars.find(
      (pl) => 'services-' + String(pl?.href || '').replace(/^[/]+|[/]+$/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === section,
    );
    return String(match?.label || '');
  } catch {
    return '';
  }
}

export async function storeSiteImage(input: StoreSiteImageInput): Promise<StoreSiteImageResult> {
  const { section, mime, originalName } = input;
  const { getS3Client, getS3Config, buildPublicUrl } = await import('../services/s3-storage');
  const cfg = getS3Config();
  if (!cfg.isConfigured) {
    const err: any = new Error('File storage is not configured yet — add your storage keys first.');
    err.storageUnconfigured = true;
    throw err;
  }

  const ext = path.extname(originalName) ||
    (mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : mime === 'image/avif' ? '.avif' : '.jpg');

  // ── Describe and name the photograph ──────────────────────────────────────
  // These nine images (hero, two content blocks, one per pillar) are the studio's whole
  // public-facing photography, so they are the images where alt text and embedded metadata
  // are actually the product. Nine vision calls is roughly 5p.
  let body: Buffer = input.buffer;
  let alt = String(input.alt || '').trim().slice(0, 200) || null;
  let key = `Site Images/${section}-${crypto.randomUUID()}${ext}`;

  try {
    const { getImageIdentity } = await import('./studioImageIdentity');
    const { analyzeVision, writeIptc, extractExif } = await import('../services/blogImageAnalysis');
    const { buildImageFilename } = await import('./imageFilename');
    const identity = await getImageIdentity();
    const serviceLabel = await serviceLabelFor(section);

    // Pass the bytes as a data URI rather than a public URL. The blog path hands OpenAI an
    // unsigned B2 link, which costs a round trip AND requires the bucket to stay
    // world-readable; the buffer is already in hand here.
    let vision: any = null;
    if (process.env.OPENAI_API_KEY) {
      const dataUri = `data:${mime};base64,${body.toString('base64')}`;
      vision = await analyzeVision(dataUri, serviceLabel || undefined).catch((e: any) => {
        console.warn('[site-image] vision failed, continuing without it:', e?.message || e);
        return null;
      });
    }

    const exif = await extractExif(body).catch(() => null as any);
    const captured = exif?.dateTimeOriginal ? new Date(exif.dateTimeOriginal) : null;

    // The wizard sends the slot's own label as alt ("Homepage hero", "First content block",
    // or the service name repeated) — which describes the slot, not the picture, and is
    // useless to a screen reader. A real description wins.
    if (vision?.altText) alt = String(vision.altText).slice(0, 200);

    const stem = buildImageFilename({
      subject: vision?.altText || vision?.description || '',
      service: serviceLabel,
      place: identity.city,
      date: captured,
      originalName,
      ext: ext.replace(/^[.]/, '') || 'jpg',
    });
    key = `Site Images/${stem}`;

    if (vision?.description || identity.creator) {
      body = await writeIptc(body, {
        caption: vision?.description || '',
        keywords: [
          ...(vision?.sceneKeywords || []).slice(0, 10),
          ...(serviceLabel ? [serviceLabel] : []),
        ].map(String).filter(Boolean),
        creator: identity.creator,
        copyright: identity.copyright,
        credit: identity.credit,
        location: identity.city,
        country: identity.country,
        // Deliberately NO gps. identity.gps is the STUDIO's address, and these are location
        // photographs — stamping the office onto a shot taken at a marathon would be a
        // confident, wrong claim of where the picture was made.
        aiGenerated: !!vision,
      });
    }
  } catch (e: any) {
    console.warn('[site-image] metadata step failed, storing the original:', e?.message || e);
    body = input.buffer;
  }

  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  await getS3Client().send(new PutObjectCommand({
    Bucket: cfg.bucket, Key: key, Body: body, ContentType: mime,
  }));
  const url = buildPublicUrl(cfg.bucket, cfg.endpoint, key);

  await db.execute(sql`DELETE FROM homepage_images WHERE section = ${section}`);
  await db.execute(sql`
    INSERT INTO homepage_images (section, url, alt, title, sort_order, is_active)
    VALUES (${section}, ${url}, ${alt}, ${null}, ${0}, ${true})
  `);

  // THE HERO GOES TO THE HOMEPAGE DRAFT. The renderer reads landing_pages.hero_image_url
  // (PublicLandingPageRenderer), not homepage_images, so without this a studio could upload
  // their best photograph and watch the preview stay empty.
  //
  // Doing it here is also what makes the ORDER not matter: the photographs step runs while
  // the crawl and generation are still going, so the image can arrive before or after the
  // draft exists. This branch covers "after"; the pipeline covers "before".
  if (section === 'hero') {
    try {
      // The caller's own id first. The lookup below is only a fallback for callers who do not
      // have one — an upload arriving after generation has finished.
      let draftId: string | null = input.heroPageId || null;
      if (!draftId) {
        const { rows } = await db.execute(sql`SELECT homepage_gen_state AS s FROM studio_configs LIMIT 1`) as any;
        draftId = (rows ?? [])[0]?.s?.draftId || null;
      }
      if (draftId) {
        await db.execute(sql`UPDATE landing_pages SET hero_image_url = ${url} WHERE id = ${draftId}`);
        console.log(`[setup] hero image attached to homepage draft ${draftId}`);
      }
    } catch (e: any) {
      // Never fail the upload over this — the image is stored and the studio can set it
      // from Website Studio.
      console.warn('[setup] could not attach hero to the draft:', e?.message || e);
    }
  }

  // A pillar image belongs on the pillar PAGE as well as the homepage card.
  //
  // The landing-page slug is NOT the services- key: authority-scaffold derives it with
  // slugify() from landing-mapping, which additionally trims dashes and caps at 60
  // characters. Deriving it any other way silently matches no row on a long href, so it is
  // imported and reused rather than reimplemented.
  let pillarPage: string | null = null;
  if (!FIXED_IMAGE_SECTIONS.has(section)) {
    try {
      const { slugify: landingSlugify } = await import('./landing-mapping');
      const { rows } = await db.execute(sql`SELECT authority_map FROM studio_configs LIMIT 1`) as any;
      const pillars = ((rows ?? [])[0]?.authority_map?.pillars || []) as any[];
      const hit = pillars.find(
        (p) => 'services-' + String(p?.href || '').replace(/^[/]+|[/]+$/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === section,
      );
      if (hit) {
        const slug = landingSlugify(String(hit.href || '').replace(/^[/]+|[/]+$/g, '') || hit.label);
        const r: any = await db.execute(
          sql`UPDATE landing_pages SET hero_image_url = ${url}, updated_at = now() WHERE slug = ${slug}`,
        );
        if ((r?.rowCount ?? 0) > 0) pillarPage = slug;
      }
    } catch (e: any) {
      // The homepage image is already saved; failing to also reach the pillar page is not
      // worth losing that. Logged, not surfaced.
      console.warn('[setup] pillar hero update failed:', e?.message || e);
    }
  }

  return { url, section, pillarPage, alt };
}
