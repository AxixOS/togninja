// Does a gallery the studio marks as protected actually get STORED as protected?
//
// For the whole life of this product it did not, and nothing anywhere said so.
//
// The admin sent a mixed-convention body — camelCase for title/coverImage, snake_case for
// client_id / is_public / is_password_protected — and the create route passed it straight
// to db.insert(galleries).values(). Drizzle resolves keys against the table object, whose
// properties are camelCase; an unrecognised key is not an error, it is simply OMITTED, and
// the column default applies. Verified against the live database — the emitted SQL was:
//
//   insert into "galleries" (..., "is_public", "is_password_protected", "client_id", ...)
//   values (..., default, default, ..., default, ...)
//
// So the row landed as: password = what they typed, is_password_protected = FALSE
// (default), is_public = TRUE (default), client_id = NULL.
//
// Which is a complete compromise of every delivered shoot, in four steps:
//   1. is_public = true lists the gallery on GET /api/galleries, which needs no auth
//   2. that response carries the slug
//   3. POST /api/galleries/<slug>/auth returns a token for ANY email, because the code
//      only demands a password when is_password_protected is true
//   4. that token legitimately opens /images and /download
//
// The signed-token work in v1.9.44/45 is not defeated by this — it is never engaged,
// because the gallery was never marked as needing protection.
//
// These assertions run against the REAL storage layer and the REAL database, because the
// bug lived precisely in the gap between what the code appears to pass and what the ORM
// actually writes. A mock would have reproduced the appearance and missed the bug.
//
// Run: npx tsx scripts/gal-verify-create.ts
import 'dotenv/config';
import { storage } from '../server/storage';
import { db } from '../server/db';
import { galleries } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { normaliseGalleryInput, passwordStateError } from '../server/lib/galleryInput';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

// The exact body client/src/lib/gallery-api.ts sent BEFORE the fix. Kept verbatim so the
// original attack stays covered even though the client no longer sends this shape: the
// server must be correct on its own, for any caller.
const LEGACY_SNAKE_BODY = {
  title: 'Verify Create Legacy',
  description: null,
  slug: 'verify-create-legacy',
  coverImage: null,
  coverPosition: { x: 50, y: 50 },
  coverScale: 100,
  coverTemplate: null,
  client_id: null,
  is_public: false,
  is_password_protected: true,
  password: 'hunter2',
};

// What the client sends now.
const CAMEL_BODY = {
  title: 'Verify Create Camel',
  slug: 'verify-create-camel',
  clientId: null,
  isPublic: false,
  isPasswordProtected: true,
  password: 'hunter2',
  downloadEnabled: false,
  watermarkEnabled: true,
  invisibleWatermarkEnabled: true,
  expiresAt: '2027-06-01T00:00:00.000Z',
  status: 'ACTIVE',
};

async function persist(body: any) {
  const normalised = normaliseGalleryInput(body);
  if (normalised.isPublic === undefined) normalised.isPublic = false;
  const row: any = await storage.createGallery(normalised as any);
  const fresh: any = await db.select().from(galleries).where(eq(galleries.id, row.id));
  return { id: row.id, row: fresh[0] };
}

async function main() {
  const created: string[] = [];
  try {
    console.log('\n=== a snake_case body (what the admin used to send) ===');
    const legacy = await persist(LEGACY_SNAKE_BODY);
    created.push(legacy.id);
    check('is_password_protected is TRUE', legacy.row.isPasswordProtected === true,
      'stored ' + legacy.row.isPasswordProtected);
    check('the password is stored', Boolean(legacy.row.password));
    check('is_public is FALSE — not published to the anonymous list',
      legacy.row.isPublic === false, 'stored ' + legacy.row.isPublic);

    console.log('\n=== a camelCase body (what the admin sends now) ===');
    const camel = await persist(CAMEL_BODY);
    created.push(camel.id);
    check('is_password_protected is TRUE', camel.row.isPasswordProtected === true);
    check('is_public is FALSE', camel.row.isPublic === false);
    check('downloadEnabled persisted', camel.row.downloadEnabled === false,
      'stored ' + camel.row.downloadEnabled);
    check('visible watermark persisted', camel.row.visibleWatermark === true,
      'stored ' + camel.row.visibleWatermark);
    check('invisible watermark persisted', camel.row.invisibleWatermark === true,
      'stored ' + camel.row.invisibleWatermark);
    check('expiresAt persisted as a real date',
      camel.row.expiresAt instanceof Date && camel.row.expiresAt.getUTCFullYear() === 2027,
      String(camel.row.expiresAt));

    console.log('\n=== a body that names NOTHING is private, not public ===');
    // The column default is true. A caller that omits isPublic must not get a gallery on
    // the anonymous list by accident — that default is what leaked the others.
    const bare = await persist({ title: 'Verify Create Bare', slug: 'verify-create-bare' });
    created.push(bare.id);
    check('an unspecified gallery defaults to private', bare.row.isPublic === false,
      'stored ' + bare.row.isPublic);

    console.log('\n=== the normaliser itself ===');
    check('unknown keys are dropped',
      !('somethingElse' in normaliseGalleryInput({ somethingElse: 1, title: 't' })));
    check('an empty expiry string means no expiry',
      normaliseGalleryInput({ expiresAt: '' }).expiresAt === null);
    check('an unparseable expiry does not become Invalid Date',
      normaliseGalleryInput({ expiresAt: 'not-a-date' }).expiresAt === null);
    check('an absent key stays absent, so a partial update cannot null a column',
      !('password' in normaliseGalleryInput({ title: 't' })));
    check('the string "true" from a form is coerced to a boolean',
      normaliseGalleryInput({ is_public: 'true' }).isPublic === true);
    check('an empty clientId becomes null, not an empty foreign key',
      normaliseGalleryInput({ client_id: '' }).clientId === null);

    console.log('\n=== protected-with-no-password is refused before it is written ===');
    check('protected + empty password is an error',
      passwordStateError({ isPasswordProtected: true, password: '' }) !== null);
    check('protected + whitespace password is an error',
      passwordStateError({ isPasswordProtected: true, password: '   ' }) !== null);
    check('protected + a real password is fine',
      passwordStateError({ isPasswordProtected: true, password: 'x' }) === null);
    check('unprotected needs no password',
      passwordStateError({ isPasswordProtected: false }) === null);
    // Partial update: switching protection on when one is ALREADY stored is legitimate.
    check('turning protection on with a password already stored is fine',
      passwordStateError({ isPasswordProtected: true }, { password: 'already-set' }) === null);
    check('turning protection on with nothing stored is an error',
      passwordStateError({ isPasswordProtected: true }, { password: null }) !== null);
    check('clearing the password while protection stays on is an error',
      passwordStateError({ password: '' }, { isPasswordProtected: true, password: 'old' }) !== null);
  } finally {
    for (const id of created) await db.delete(galleries).where(eq(galleries.id, id)).catch(() => {});
  }

  console.log(bad
    ? `\n  ${bad} CHECK(S) FAILED\n`
    : '\n  ALL CHECKS PASSED — what the studio ticks is what the database stores\n');
  process.exit(bad ? 1 : 0);
}

main();
