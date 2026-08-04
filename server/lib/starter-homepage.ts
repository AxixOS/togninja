// Build a studio's OWN homepage from onboarding data — no website crawl, no AI required —
// so every new studio gets a branded, data-driven homepage instead of the hard-coded New
// Age page. Composes a landing page (the tenant-agnostic engine), publishes it, and sets it
// as "/" (studio_configs.homepage_landing_slug). Optionally applies a theme preset.
import crypto from 'crypto';
import { pool } from '../db';
import { mapGeneratedToLandingPage, slugify } from './landing-mapping';
import { getAuthorityMap } from './authority-map';
import { saveSiteTheme } from './site-theme';

const neonDb = require('../../database.js');

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || 'home';
  let n = 1;
  // eslint-disable-next-line no-await-in-loop
  while (!(await neonDb.checkSlugAvailable(slug))) {
    n += 1;
    slug = `${base}-${n}`;
    if (n > 40) { slug = `${base}-${crypto.randomBytes(3).toString('hex')}`; break; }
  }
  return slug;
}

function buildStarterContent(cfg: any, services: string[]) {
  const name = (cfg?.business_name || 'Our Studio').trim();
  const city = (cfg?.city || '').trim();
  const inCity = city ? ` in ${city}` : '';
  const tagline = (cfg?.meta_description || '').trim();
  const type = (cfg?.business_type || '').trim();
  const svc = services.length ? services : ['Portrait Sessions', 'Family Photography', 'Newborn & Baby', 'Couples & Weddings'];
  const phone = (cfg?.phone || '').trim();

  return {
    hero: {
      headline: tagline || `${type || 'Professional Photography'}${inCity}`,
      subheadline: `${name} — warm, professional photography${inCity}. Capturing the moments that matter, made easy from first enquiry to final gallery.`,
      ctaText: 'Get in touch',
    },
    trustBar: { items: ['Professional & experienced', 'Personal service', city ? `Based${inCity}` : 'Local studio', 'Fast, friendly booking'] },
    benefits: svc.slice(0, 4).map((s) => ({ title: s, description: `Beautiful ${s.toLowerCase()} tailored to you — relaxed sessions and images you'll treasure.` })),
    whyChooseUs: {
      headline: `Why ${name}`,
      reasons: [
        { title: 'A relaxed experience', description: 'We keep sessions easy and fun, even if you feel unsure in front of the camera.' },
        { title: 'Images you\'ll love', description: 'Natural, warm portraits — not stiff or overly posed.' },
        { title: 'Simple from start to finish', description: 'Easy booking, clear pricing, and a gallery you can share and order from online.' },
      ],
    },
    offerSection: {
      headline: 'Our sessions',
      description: `Choose the session that fits you${inCity}. Every booking includes a personal pre-shoot chat so we get exactly what you\'re after.`,
      inclusions: svc.slice(0, 5),
    },
    faq: [
      { question: 'How do I book?', answer: `Tap “Get in touch”${phone ? ` or call ${phone}` : ''} and we\'ll find a date that works for you.` },
      { question: 'What\'s included?', answer: 'A relaxed session, expert guidance on the day, and an online gallery to view and order your images.' },
      { question: `Where are you based?`, answer: city ? `We\'re located${inCity} and cover the surrounding area.` : 'Get in touch and we\'ll share studio and location details.' },
    ],
    finalCta: {
      headline: 'Ready to book your session?',
      description: `Let\'s create something you\'ll love. Get in touch with ${name} today.`,
      ctaText: 'Get in touch',
    },
    seo: {
      title: name,
      metaDescription: (tagline || `Professional photography${inCity} — ${name}.`).slice(0, 160),
      slug: slugify(name) || 'home',
    },
    meta: {
      sectionOrder: ['hero', 'trustBar', 'benefits', 'whyChooseUs', 'offerSection', 'faq', 'finalCta'],
      sectionVisibility: {
        hero: true, trustBar: true, benefits: true, whyChooseUs: true,
        offerSection: true, faq: true, finalCta: true,
        problemSection: false, testimonials: false, inclusions: false,
      },
    },
  };
}

export async function generateStarterHomepage(opts: { themePreset?: string } = {}): Promise<{ slug: string; id: string; url: string; themePreset: string | null }> {
  // Load onboarding data (raw — some columns aren't in the Drizzle schema).
  let cfg: any = {};
  let hasCustomMap = false;
  try {
    const r = await pool.query('SELECT business_name, meta_description, city, phone, logo_url, business_type, authority_map FROM studio_configs LIMIT 1');
    cfg = r.rows[0] || {};
    hasCustomMap = !!cfg.authority_map;
  } catch { /* use defaults */ }

  // Services come from the studio's OWN authority map when they have one; otherwise a
  // sensible generic set (never New Age's default pillars).
  let services: string[] = [];
  if (hasCustomMap) {
    try { const map = await getAuthorityMap(); services = (map.pillars || []).map((p) => p.label); } catch { /* ignore */ }
  }

  const content = buildStarterContent(cfg, services);
  const context = { primaryService: services[0] || cfg?.business_type || 'Photography', city: cfg?.city || undefined, tone: 'warm', pageType: 'homepage' };
  const payload = mapGeneratedToLandingPage(content, context, { userId: null });
  payload.slug = await uniqueSlug(slugify(cfg?.business_name || 'home'));
  payload.status = 'published';
  payload.page_type = 'homepage';

  const page = await neonDb.createLandingPage(payload);
  try {
    await neonDb.updateLandingPage(page.id, {
      status: 'published',
      published_at: new Date().toISOString(),
      published_url: `/lp/${page.slug}`,
    });
  } catch { /* status already set on create */ }

  // Point "/" at it.
  await pool.query('UPDATE studio_configs SET homepage_landing_slug = $1 WHERE TRUE', [page.slug]);

  let themePreset: string | null = null;
  if (opts.themePreset) { try { themePreset = (await saveSiteTheme(opts.themePreset)).id; } catch { /* ignore */ } }

  return { slug: page.slug, id: page.id, url: '/', themePreset };
}
