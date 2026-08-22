// Do a client's picks survive leaving their browser?
//
// Favourites lived entirely in localStorage, keyed by gallery slug. Choose on a laptop,
// open on a phone, and the shortlist was empty — and the photographer, whose entire reason
// for sending a proofing gallery is to learn which frames were chosen, never saw any of it,
// because it had never left the browser.
//
// ImageGrid has always read image.isFavorite in five places. There was no column, and the
// API never sent the field, so it was permanently undefined. client/src/lib/gallery-api.ts
// even shipped a toggleImageFavorite() that POSTed to /api/galleries/images/:id/favorite —
// a route that does not exist.
//
// Ratings (love / maybe / reject) are the same story one step further along: the column
// existed but was typed INTEGER while every caller wrote strings, so every click 500'd
// until v1.9.44 converted it.
//
// This runs against the real database because both defects were in the gap between what
// the code appears to store and what the table can actually hold.
//
// Run: npx tsx scripts/gal-verify-picks.ts
import 'dotenv/config';
import { db } from '../server/db';
import { galleries, galleryImages } from '../shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

async function main() {
  let galleryId: string | null = null;
  try {
    console.log('\n=== the columns exist and hold what the app writes ===');
    const g: any = await db.insert(galleries)
      .values({ title: 'Picks Probe', slug: 'picks-probe', isPublic: false })
      .returning();
    galleryId = g[0].id;

    const img: any = await db.insert(galleryImages)
      .values({ galleryId: galleryId!, filename: 'p.jpg', url: 'https://example.invalid/p.jpg' })
      .returning();
    const imageId = img[0].id;

    check('a new image is not favourited by default', img[0].isFavorite === false,
      'stored ' + img[0].isFavorite);

    await db.update(galleryImages).set({ isFavorite: true }).where(eq(galleryImages.id, imageId));
    const afterFav: any = await db.select().from(galleryImages).where(eq(galleryImages.id, imageId));
    check('is_favorite persists as a boolean', afterFav[0].isFavorite === true);

    // The exact strings the UI writes. This is what used to hit an INTEGER column.
    for (const rating of ['love', 'maybe', 'reject']) {
      await db.update(galleryImages).set({ rating }).where(eq(galleryImages.id, imageId));
      const r: any = await db.select().from(galleryImages).where(eq(galleryImages.id, imageId));
      check(`rating "${rating}" round-trips`, r[0].rating === rating, 'stored ' + r[0].rating);
    }

    console.log('\n=== the wiring exists end to end ===');
    const routes = fs.readFileSync('server/routes.ts', 'utf8');
    const page = fs.readFileSync('client/src/pages/GalleryPage.tsx', 'utf8');
    const grid = fs.readFileSync('client/src/components/galleries/ImageGrid.tsx', 'utf8');

    check('a favourite route exists',
      routes.includes('/images/:imageId/favorite'));
    check('it is gated by gallery access, like ratings',
      /\/images\/:imageId\/favorite[\s\S]{0,900}?requireGalleryAccess/.test(routes));
    check('the images payload sends isFavorite',
      /isFavorite: \(img as any\)\.isFavorite/.test(routes));
    check('the images payload sends rating',
      /rating: \(img as any\)\.rating/.test(routes));

    check('the client PATCHes the favourite route',
      page.includes('/favorite') && page.includes("method: 'PATCH'"));
    check('the client hydrates favourites from the server',
      page.includes('img.isFavorite'));
    check('a failed save rolls the heart back',
      /Roll the heart back/.test(page));
    check('ImageGrid still reads isFavorite', grid.includes('image.isFavorite'));

    console.log('\n=== the dead client helper is not left pointing at nothing ===');
    const api = fs.readFileSync('client/src/lib/gallery-api.ts', 'utf8');
    const badPath = api.includes('/api/galleries/images/${imageId}/favorite');
    check('no helper targets the route that never existed', !badPath,
      badPath ? 'toggleImageFavorite still POSTs to a 404' : '');
  } finally {
    if (galleryId) {
      await db.delete(galleryImages).where(eq(galleryImages.galleryId, galleryId)).catch(() => {});
      await db.delete(galleries).where(eq(galleries.id, galleryId)).catch(() => {});
    }
  }

  console.log(bad ? `\n  ${bad} CHECK(S) FAILED\n` : '\n  ALL CHECKS PASSED — picks outlive the browser they were made in\n');
  process.exit(bad ? 1 : 0);
}

main();
