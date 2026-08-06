/**
 * Studio Branding routes
 *
 * Powers the admin "Studio Customization" page. Persists studio branding
 * (logo, business info, brand colours, active template) to `studio_configs`
 * — a single-row table for a self-hosted studio, read everywhere via LIMIT 1.
 *
 * Propagation to the public site + invoices is done by having the READERS
 * consume studio_configs directly (a clean singleton), NOT by mirroring into
 * per-studioId CMS rows:
 *   - Public site header  -> GET /api/studio/public-branding (logo + name)
 *   - Invoice / PDF        -> /api/studio-config (extended to read studio_configs)
 * This avoids any studioId / foreign-key coupling, so a Save can never fail
 * on a mismatched CMS row.
 *
 * Note on colours: the public site is painted with ~2000 hardcoded Tailwind
 * `purple/violet` literals and defines no `:root` theme tokens, so brand
 * colours are persisted (for invoice/template surfaces + future theming) but
 * do NOT restyle the whole public site today. The UI says so honestly.
 */

import express from 'express';
import { db } from '../db';
import { studioConfigs } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../auth';

const router = express.Router();

/** Read the single studio_configs row (or null). */
async function getSingleton() {
  const [sc] = await db.select().from(studioConfigs).limit(1);
  return sc || null;
}

/**
 * GET /api/studio/branding  (admin)
 * Load current branding for the admin form.
 */
router.get('/branding', requireAuth, async (_req, res) => {
  try {
    const sc = await getSingleton();
    return res.json({
      studioName: sc?.studioName || '',
      ownerEmail: sc?.ownerEmail || '',
      businessName: sc?.businessName || sc?.studioName || '',
      address: sc?.address || '',
      city: sc?.city || '',
      phone: sc?.phone || '',
      email: sc?.email || sc?.ownerEmail || '',
      logoUrl: sc?.logoUrl || null,
      primaryColor: sc?.primaryColor || '#7C3AED',
      secondaryColor: sc?.secondaryColor || '#F59E0B',
      activeTemplate: sc?.activeTemplate || 'template-01-modern-minimal',
      // Tax settings (Settings tab)
      defaultTaxRate: sc?.defaultTaxRate != null ? String(sc.defaultTaxRate) : '0',
      taxLabel: sc?.taxLabel || 'VAT',
      vatNumber: sc?.vatNumber || '',
    });
  } catch (error: any) {
    console.error('[studio-branding] GET failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/studio/public-branding  (public, no auth)
 * Minimal branding the public site header consumes (logo + name).
 */
router.get('/public-branding', async (_req, res) => {
  try {
    const sc = await getSingleton();
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    return res.json({
      logoUrl: sc?.logoUrl || null,
      studioName: sc?.studioName || null,
    });
  } catch (error: any) {
    // Never break the public header — return empty on error.
    return res.json({ logoUrl: null, studioName: null });
  }
});

/**
 * PUT /api/studio/branding  (admin)
 * Persist branding to studio_configs. This is the single source of truth;
 * the invoice endpoint and public header read it back.
 */
router.put('/branding', requireAuth, async (req, res) => {
  try {
    const {
      studioName,
      businessName,
      address,
      city,
      phone,
      email,
      logoUrl,
      primaryColor,
      secondaryColor,
      activeTemplate,
      defaultTaxRate,
      taxLabel,
      vatNumber,
    } = req.body || {};

    const set: any = { updatedAt: new Date() };
    if (studioName !== undefined) set.studioName = studioName;
    if (businessName !== undefined) set.businessName = businessName;
    if (address !== undefined) set.address = address;
    if (city !== undefined) set.city = city;
    if (phone !== undefined) set.phone = phone;
    if (email !== undefined) set.email = email;
    if (logoUrl !== undefined) set.logoUrl = logoUrl;
    if (primaryColor !== undefined) set.primaryColor = primaryColor;
    if (secondaryColor !== undefined) set.secondaryColor = secondaryColor;
    if (activeTemplate !== undefined) set.activeTemplate = activeTemplate;
    // Tax settings — clamp the rate to a sane 0–100 and default the label.
    if (defaultTaxRate !== undefined) {
      const n = parseFloat(String(defaultTaxRate));
      set.defaultTaxRate = (Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0).toFixed(2);
    }
    if (taxLabel !== undefined) set.taxLabel = String(taxLabel || 'VAT').slice(0, 40) || 'VAT';
    if (vatNumber !== undefined) set.vatNumber = vatNumber;

    const existing = await getSingleton();
    if (existing) {
      await db.update(studioConfigs).set(set).where(eq(studioConfigs.id, existing.id));
    } else {
      await db.insert(studioConfigs).values({
        studioName: studioName || 'My Studio',
        ownerEmail: email || 'admin@localhost',
        ...set,
      });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('[studio-branding] PUT failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
