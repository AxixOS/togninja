// Tag the repo's static photo assets (currently just the homepage collage) with
// IPTC/XMP + studio geo, in place. Run: npx tsx -r dotenv/config tag-static.ts
import { readFile, writeFile } from 'fs/promises';
import {
  analyzeVision, writeIptc, STUDIO_GPS, STUDIO_CITY, STUDIO_SUBLOCATION, endExifTool,
} from './server/services/blogImageAnalysis.js';

const FILES = [
  { path: 'client/src/assets/photo-grid.jpg', context: 'Foto-Collage New Age Fotografie – Familien-, Baby- und Portraitfotos aus dem Tageslichtstudio Wien', onLocation: false },
];

async function main() {
  for (const f of FILES) {
    try {
      const buf = await readFile(f.path);
      const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
      const vision = await analyzeVision(dataUrl, f.context);
      const keywords = Array.from(new Set([...(vision.sceneKeywords || []), 'wien', 'fotostudio', 'new age fotografie'])).slice(0, 12);
      const out = await writeIptc(buf, {
        caption: vision.altText || vision.description || f.context,
        keywords,
        location: STUDIO_CITY,
        sublocation: f.onLocation ? undefined : STUDIO_SUBLOCATION,
        country: 'Österreich',
        gps: f.onLocation ? null : STUDIO_GPS,
        aiGenerated: true,
      });
      await writeFile(f.path, out);
      console.log(`✅ ${f.path}: alt="${vision.altText}" kw=${keywords.length} geo=${f.onLocation ? 'city' : 'studio'}`);
    } catch (e: any) {
      console.log(`❌ ${f.path}: ${e?.message || e}`);
    }
  }
  await endExifTool();
  process.exit(0);
}
main().catch(async (e) => { console.error(e); try { await endExifTool(); } catch {} process.exit(1); });
