import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { registerTestRoutes } from "./routes-test";
import { storage } from "./storage";
import { studioImageMetadata } from "./lib/imageMetadata";
import { db, pool } from "./db";
// Import Neon database functions
const neonDb = require("../database.js");
// Helper to run raw SQL with parameterized values using the pg pool
async function runSql(query: string, params?: any[]) {
  const result = await pool.query(query, params || []);
  return result.rows;
}

// Ensure the gallery delivery/protection columns exist. These were added to the
// schema after launch (the wizard's watermark/download/expiry/status toggles were
// previously not persisted). Runs once at startup so every gallery read/write —
// including Drizzle SELECT *- has the columns available without a manual migration.
let _galleryDeliveryColsReady = false;
async function ensureGalleryDeliveryColumns() {
  if (_galleryDeliveryColsReady) return;
  await pool.query(`
    ALTER TABLE galleries
      ADD COLUMN IF NOT EXISTS download_enabled boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS visible_watermark boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS invisible_watermark boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS expires_at timestamp,
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE'
  `);
  _galleryDeliveryColsReady = true;
}

// Fetch a gallery image's original bytes. Tries authenticated S3 GetObject first
// (so it keeps working once the bucket is made PRIVATE), and falls back to a plain
// public fetch (today's public bucket). Either way the client never touches the
// object URL directly — everything is streamed through our proxy.
async function fetchGalleryOriginal(url: string): Promise<Buffer> {
  try {
    const { bucket } = getS3Config();
    if (bucket) {
      const u = new URL(url);
      let key = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
      if (key.startsWith(bucket + '/')) key = key.slice(bucket.length + 1);
      if (key) {
        const resp: any = await getS3Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const chunks: Buffer[] = [];
        for await (const c of resp.Body as any) chunks.push(Buffer.from(c));
        return Buffer.concat(chunks);
      }
    }
  } catch {
    // fall through to public fetch (bucket still public, or key not derivable)
  }
  const up = await fetch(url);
  if (!up.ok) throw new Error(`upstream ${up.status}`);
  return Buffer.from(await up.arrayBuffer());
}
import { sql, or, desc, and } from 'drizzle-orm';
import { eq } from "drizzle-orm";
import { priceListItems, emailCampaigns, emailTemplates, emailSegments, emailEvents, emailLinks, emailSubscribers, insertLeadSourceSchema, crmLeads, studioConfigs, crmMessages, manualPageContent, emailAutomations, emailAutomationLogs, schedulerBookings, spamRules } from "../shared/schema";
import path from 'path';
import os from 'os';
// Removed duplicate fs import (already imported earlier)
import multer from 'multer';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { processGalleryImage, watermarkText, invisibleKey } from './lib/galleryWatermark';
import { fingerprint as galleryFingerprint, extractInvisible } from './lib/invisibleWatermark';
// Using require for 'imap' to satisfy commonjs typings within ESM context
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Imap = require('imap');
import { simpleParser } from 'mailparser';

// Lightweight helpers/stubs to keep routes type-safe where optional features are used
const tagTranslations: Record<string, string> = {
  'familienfotos': 'family photos',
  'wien': 'vienna',
  'studio': 'studio',
  'outdoor': 'outdoor',
  'vergleich': 'comparison',
  'fotoshooting': 'photoshoot',
  'photography': 'photography',
  'vienna': 'vienna',
  'baby': 'baby',
  'winter': 'winter',
  'family': 'family',
  'Businessportraits Wien': 'Business Portraits Vienna',
  'Businessfotos Wien': 'Business Photos Vienna',
  'Headshots Wien': 'Headshots Vienna',
  'Corporate Fotos Wien': 'Corporate Photos Vienna',
  'Business Fotograf Wien': 'Business Photographer Vienna',
  'Teamfotos Wien': 'Team Photos Vienna',
  'Firmenfotografie Wien': 'Corporate Photography Vienna',
  'Profilfoto Tipps': 'Profile Photo Tips',
  'Business Shooting Wien': 'Business Shooting Vienna',
  'Wien Fotograf Business': 'Vienna Photographer Business',
  'Familienfotos Wien': 'Family Photos Vienna',
  'Studio Familienfotos Wien': 'Studio Family Photos Vienna',
  'Outdoor Familienfotos Wien': 'Outdoor Family Photos Vienna',
  'Familienfotos Vergleich': 'Family Photos Comparison',
  'Fotoshooting Wien': 'Photoshoot Vienna',
  'Familienfotografie Tipps': 'Family Photography Tips',
  'neugeborene': 'newborn',
  'schwangerschaft': 'maternity',
  'hochzeit': 'wedding',
  'produkt': 'product',
  'immobilien': 'real estate',
  'event': 'event',
  'bewerbung': 'application',
  'portrait': 'portrait',
};

const translateTagToEnglish = (tag: string): string => {
  return tagTranslations[tag] || tag;
};
// Voucher name translations (exact DB names → English)
const voucherNameTranslations: Record<string, string> = {
  'Familie Fotoshootings': 'Family Photo Session',
  'Shooting Experience Gutschein': 'Shooting Experience Voucher',
  'Portraitfotografie Basic': 'Portrait Photography Basic',
  'Portrait Einzelperson': 'Individual Portrait',
  'Bewerbungsfotos & LinkedIn': 'Application Photos & LinkedIn',
  'Team & Mitarbeiterfotos': 'Team & Employee Photos',
  'Eventfotografie': 'Event Photography',
  'Hochzeitsfotografie Basic': 'Wedding Photography Basic',
  'Hochzeit Basic': 'Wedding Basic',
  'Hochzeit Premium': 'Wedding Premium',
  'Hochzeit Komplett': 'Wedding Complete',
  'Hochzeitsbegleitung': 'Wedding Coverage',
  'Immobilien Basic': 'Real Estate Basic',
  'Immobilien Standard': 'Real Estate Standard',
  'Immobilien Premium': 'Real Estate Premium',
  'Immobilienfotografie': 'Real Estate Photography',
  'Neugeborenen Shooting': 'Newborn Photoshoot',
  'Baby Fotoshooting': 'Baby Photoshoot',
  'Schwangerschaftsfotos': 'Maternity Photos',
  'Produktfotografie': 'Product Photography',
  'Produktfotografie Basic': 'Product Photography Basic',
  'Produktfotografie Premium': 'Product Photography Premium',
  'Studio-Fotografie Basic': 'Studio Photography Basic',
  'Studio Miete + Fotosession': 'Studio Rental + Photo Session',
};

// Exact description translations (normalized key → English)
// Keys are normalized: trimmed, newlines collapsed to spaces
const voucherDescriptionTranslations: Record<string, string> = {
  // Family Basic
  '60 Min Shooting; 1 retuschiertes Portrait digital + Leinwand 40×30 cm; Nutzungsrechte privat, bis zu 12 Personen und auch Haustiere möglich.':
    '60 min shoot; 1 retouched portrait digital + canvas 40×30 cm; private usage rights, up to 12 persons and pets welcome.',
  // Family Classic
  '60 Min Shooting; 2 retuschiertes Portrait digital + 2x Leinwand 30×40 cm; Nutzungsrechte privat, bis zu 12 Personen und auch Haustiere möglich.':
    '60 min shoot; 2 retouched portraits digital + 2x canvas 30×40 cm; private usage rights, up to 12 persons and pets welcome.',
  // Family Premium
  '60 Min Shooting; 5 retuschierte Fotos digital; Leinwand 40×30 cm; Nutzungsrechte privat, bis zu 12 Personen und auch Haustiere möglich.':
    '60 min shoot; 5 retouched photos digital; canvas 40×30 cm; private usage rights, up to 12 persons and pets welcome.',
  // Hochzeitsfotografie Basic
  'Hochzeitsbegleitung (Auszug) inkl. 30 bearbeiteter Fotos':
    'Wedding coverage (excerpt) incl. 30 edited photos',
  // Hochzeit Basic
  'Standesamt oder kleine Feier inkl. alle Portraits als Datei - Halber Tag, Stunden nach Wunsch':
    'Registry office or small celebration incl. all portraits as file - Half day, hours as desired',
  // Hochzeit Premium
  'Ganztägige Hochzeit - inkl. alle Bilder, Online-Galerie, Prints und Leinwand-Collage als Geschenk (Porträts nach Wahl)':
    'Full day wedding - incl. all images, online gallery, prints and canvas collage as gift (portraits of your choice)',
  // Immobilienfotografie
  'Immobilienfotos Paket für Wohnungen & Häuser — Innen und Exterieur. Alle Bilder in Vollauflösung dabei, 360°-Bilder, Google Maps-Update':
    'Real estate photo package for apartments & houses — Interior and exterior. All images in full resolution, 360° images, Google Maps update',
  // Immobilien Basic
  'Kleine Wohnungen & Studios inkl. alle Bilder als Datei':
    'Small apartments & studios incl. all images as file',
  // Immobilien Premium
  'Wohnungen & Häuser  alle Bilder als Datei, Interaktiver Video-Rundgang und professionell gezeichneter Grundriss':
    'Apartments & houses all images as file, interactive video tour and professionally drawn floor plan',
  // Portraitfotografie Basic
  'Portraitsession im Studio; 30-45 Minuten; 1 retuschiertes Foto':
    'Portrait session in studio; 30-45 minutes; 1 retouched photo',
  // Bewerbungsfotos & LinkedIn
  'Bewerbungsfotos Paket inkl. 2 retuschierte Bilder für Bewerbungen & LinkedIn':
    'Application photos package incl. 2 retouched images for applications & LinkedIn',
  // Team & Mitarbeiterfotos
  'Team- & Mitarbeiterfotos; Paketpreise by headcount; In-Studio or Onsite options z.B:. 50€ pro Kopf mit alle Portäts als Datei dazu.':
    'Team & employee photos; Package prices by headcount; In-studio or onsite options e.g.: €50 per person with all portraits as files',
  // Studio-Fotografie Basic
  'Studio-Miete inkl. Fotosession; perfekte Option für Produkt- oder Portraitaufnahmen':
    'Studio rental incl. photo session; perfect option for product or portrait shots',
  // Produktfotografie
  'Produktfotografie Basic — 5 retuschierte Bilder, ideal für Shops & Social':
    'Product Photography Basic — 5 retouched images, ideal for shops & social media',
  // Business Portrait Basic
  'Business-Headshot; 30 Minuten; 1 retuschiertes Foto suitable for LinkedIn':
    'Business headshot; 30 minutes; 1 retouched photo suitable for LinkedIn',
  // Portrait Einzelperson
  'Klassisches Porträt - 5x Portäts nach Wahl':
    'Classic portrait - 5x portraits of your choice',
  // Express Headshot
  'Schnell & effizient inkl. x2 Bilder nach Wahl als Datei':
    'Quick & efficient incl. 2 images of your choice as file',
  // Solo Pro
  'Für Professionals inkl. alle Bilder als Datei':
    'For professionals incl. all images as file',
  // Brand Upgrade
  'Maximale Wirkung für deine Produkte und deine Marke. Inklusive 10 hochauflösender High-Impact-Fotos deiner Wahl – mit kommerziellen Nutzungsrechten für unbegrenzte Drucke und uneingeschränkte Online-Nutzung.':
    'Maximum impact for your products and brand. Including 10 high-resolution high-impact photos of your choice – with commercial usage rights for unlimited prints and unrestricted online use.',
  // Eventfotografie
  'Eventfotografie Paket — Kurzauftrag inkl. 30 bearbeiteter Fotos':
    'Event photography package — Short assignment incl. 30 edited photos',
  // Event Premium
  'Ganztägige Event-Coverage - inkl. alle Bilder als Datei, in Vollauflösung geliefert':
    'Full day event coverage - incl. all images as file, delivered in full resolution',
  // Newborn Premium
  'ca. 60 Minuten im Studio; 5 retuschierte Lieblingsfotos digital; Leinwand 40×30 cm, bis zu 12 Personen und auch Haustiere möglich.':
    'Approx. 60 minutes in studio; 5 retouched favorite photos digital; canvas 40×30 cm, up to 12 persons and pets welcome.',
  // Maternity Premium
  '60 minute shoot - including all Portraits in Digital format (high quality jpg, delivered electronically), bis zu 12 Personen und auch Haustiere möglich.':
    '60 minute shoot - including all Portraits in Digital format (high quality jpg, delivered electronically), up to 12 persons and pets welcome.',
};

// German → English phrase replacements as fallback for any unmatched text
const germanPhraseReplacements: [RegExp, string][] = [
  [/bis zu 12 Personen und auch Haustiere möglich\.?/gi, 'up to 12 persons and pets welcome.'],
  [/bis zu (\d+) Personen/gi, 'up to $1 persons'],
  [/und auch Haustiere möglich\.?/gi, 'and pets welcome.'],
  [/Nutzungsrechte privat/gi, 'private usage rights'],
  [/retuschiertes Portrait digital/gi, 'retouched portrait digital'],
  [/retuschierte Fotos digital/gi, 'retouched photos digital'],
  [/retuschierte Lieblingsfotos digital/gi, 'retouched favorite photos digital'],
  [/retuschiertes Foto/gi, 'retouched photo'],
  [/retuschierte Bilder/gi, 'retouched images'],
  [/bearbeiteter Fotos/gi, 'edited photos'],
  [/Leinwand/gi, 'Canvas'],
  [/Auswahlgalerie online/gi, 'Online selection gallery'],
  [/Auswahlgalerie/gi, 'Selection gallery'],
  [/Standesamt oder kleine Feier/gi, 'Registry office or small celebration'],
  [/alle Portraits als Datei/gi, 'all portraits as file'],
  [/alle Bilder als Datei/gi, 'all images as file'],
  [/Halber Tag, Stunden nach Wunsch/gi, 'Half day, hours as desired'],
  [/Ganztägige Hochzeit/gi, 'Full day wedding'],
  [/Ganztägige Event-Coverage/gi, 'Full day event coverage'],
  [/Online-Galerie/gi, 'online gallery'],
  [/Prints und Leinwand-Collage als Geschenk/gi, 'prints and canvas collage as gift'],
  [/Porträts nach Wahl/gi, 'portraits of your choice'],
  [/Portäts nach Wahl/gi, 'portraits of your choice'],
  [/Immobilienfotos Paket für Wohnungen & Häuser/gi, 'Real estate photo package for apartments & houses'],
  [/Innen und Exterieur/gi, 'Interior and exterior'],
  [/Alle Bilder in Vollauflösung dabei/gi, 'All images in full resolution included'],
  [/in Vollauflösung geliefert/gi, 'delivered in full resolution'],
  [/Google Maps-Update/gi, 'Google Maps update'],
  [/Kleine Wohnungen & Studios/gi, 'Small apartments & studios'],
  [/Wohnungen & Häuser/gi, 'Apartments & houses'],
  [/Interaktiver Video-Rundgang/gi, 'Interactive video tour'],
  [/professionell gezeichneter Grundriss/gi, 'professionally drawn floor plan'],
  [/Portraitsession im Studio/gi, 'Portrait session in studio'],
  [/Minuten/gi, 'minutes'],
  [/Bewerbungsfotos Paket/gi, 'Application photos package'],
  [/für Bewerbungen & LinkedIn/gi, 'for applications & LinkedIn'],
  [/Paketpreise by headcount/gi, 'Package prices by headcount'],
  [/pro Kopf mit alle Portäts als Datei dazu/gi, 'per person with all portraits as files'],
  [/Studio-Miete inkl\. Fotosession/gi, 'Studio rental incl. photo session'],
  [/perfekte Option für Produkt- oder Portraitaufnahmen/gi, 'perfect option for product or portrait shots'],
  [/ideal für Shops & Social/gi, 'ideal for shops & social media'],
  [/Klassisches Porträt/gi, 'Classic portrait'],
  [/Schnell & effizient/gi, 'Quick & efficient'],
  [/Bilder nach Wahl als Datei/gi, 'images of your choice as file'],
  [/Für Professionals/gi, 'For professionals'],
  [/Maximale Wirkung für deine Produkte und deine Marke/gi, 'Maximum impact for your products and brand'],
  [/hochauflösender High-Impact-Fotos deiner Wahl/gi, 'high-resolution high-impact photos of your choice'],
  [/kommerziellen Nutzungsrechten/gi, 'commercial usage rights'],
  [/unbegrenzte Drucke/gi, 'unlimited prints'],
  [/uneingeschränkte Online-Nutzung/gi, 'unrestricted online use'],
  [/Inklusive/gi, 'Including'],
  [/Eventfotografie Paket/gi, 'Event photography package'],
  [/Kurzauftrag/gi, 'Short assignment'],
  [/Lieblingsfotos/gi, 'favorite photos'],
  [/im Studio/gi, 'in studio'],
  [/ca\./gi, 'approx.'],
  [/inkl\./gi, 'incl.'],
  [/Hochzeitsbegleitung \(Auszug\)/gi, 'Wedding coverage (excerpt)'],
  [/Hochzeitsbegleitung/gi, 'Wedding coverage'],
  [/Business-Headshot/gi, 'Business headshot'],
];

// Normalize a string for matching: trim and collapse whitespace/newlines
function normalizeForMatch(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const translateVoucherToEnglish = (s: string): string => {
  if (!s) return s;
  const normalized = normalizeForMatch(s);
  
  // 1) Try exact match on names
  if (voucherNameTranslations[normalized]) return voucherNameTranslations[normalized];
  if (voucherNameTranslations[s]) return voucherNameTranslations[s];
  
  // 2) Try exact match on descriptions (normalized)
  if (voucherDescriptionTranslations[normalized]) return voucherDescriptionTranslations[normalized];
  
  // 3) Try trimmed original
  const trimmed = s.trim();
  if (voucherDescriptionTranslations[trimmed]) return voucherDescriptionTranslations[trimmed];
  if (voucherNameTranslations[trimmed]) return voucherNameTranslations[trimmed];
  
  // 4) Fallback: apply German→English phrase replacements
  //    Only if the text contains German characters/words (avoid touching already-English text)
  const hasGerman = /[äöüßÄÖÜ]|inkl\.|bzw\.|Shooting|Leinwand|Bilder|Fotos|Datei|Wahl|Personen|Haustiere|Nutzungsrechte|Minuten|retuschiert|Standesamt|Hochzeit|Immobilien|Porträt|Portät|Bewerbung|Fotosession|Maximale|Inklusive|Eventfotografie|Professionals|Lieblingsfotos/i.test(normalized);
  if (hasGerman) {
    let result = s;
    for (const [pattern, replacement] of germanPhraseReplacements) {
      result = result.replace(pattern, replacement);
    }
    // Clean up leftover newlines
    result = result.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    return result;
  }
  
  return s;
};
// Zod schemas may be imported in other environments; provide permissive fallback parsers here
const insertUserSchema = { parse: (v: any) => v } as any;
const insertBlogPostSchema = { parse: (v: any) => v } as any;
const insertCrmClientSchema = { parse: (v: any) => v } as any;
const insertPhotographySessionSchema = { parse: (v: any) => v } as any;
const insertCrmInvoiceSchema = { parse: (v: any) => v } as any;
const insertGallerySchema = { parse: (v: any) => v } as any;
const insertVoucherProductSchema = { parse: (v: any) => v } as any;
const insertDiscountCouponSchema = { parse: (v: any) => v } as any;
const insertVoucherSaleSchema = { parse: (v: any) => v } as any;
const insertKnowledgeBaseSchema = { 
  parse: (v: any) => v,
  safeParse: (v: any) => ({ success: true, data: v })
} as any;
const insertOpenaiAssistantSchema = { parse: (v: any) => v, safeParse: (v: any) => ({ success: true, data: v }) } as any;
// Drizzle table placeholders for routes not yet wired in this environment
// These are typed as any to avoid compile errors when optional modules are absent
// crmMessages is now properly imported from schema
const knowledgeBase: any = { id: 'knowledge_base.id' };
const openaiAssistants: any = { id: 'openai_assistants.id' };
const z = { ZodError: class {} } as any;
 
  // (timezone and ICS helper functions are defined later in the file)
import fs from 'fs';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { jsPDF } from 'jspdf';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getS3Client, getS3Config, buildPublicUrl, storageHealth } from './services/s3-storage';
import OpenAI from 'openai';
import websiteWizardRoutes from './routes/website-wizard';
import onboardingRoutes from './routes/onboarding';
import priceWizardRoutes from './routes/price-wizard';
// Simple in-memory status for last calendar import
let lastCalendarImportStatus: {
  when?: string,
  url?: string,
  parsed?: number,
  filtered?: number,
  imported?: number,
  from?: string | null,
  to?: string | null,
  includePast?: boolean,
  stage?: string,
} = {};
import workflowWizardRoutes from './routes/workflow-wizard';
import setupRoutes from './setup-routes';
import technicalSetupRoutes from './technical-setup-routes';
import { generateLandingContent } from './lib/landing-generator';
import questionnairesRouter from './routes/questionnaires';
import galleryShopRouter from './routes/gallery-shop';
import authRoutes from './routes/auth';
import filesRouter from './routes/files';
import shootCleanerRoutes, { invalidateShootCleanerKey } from './routes/shootcleaner';
import bundleRoutes from './routes/bundle';
import prodigiRoutes from './routes/prodigi';
import storageRoutes from './storage-routes';
import fileRoutes from './file-routes';
import galleryTransferRoutes from './gallery-transfer-routes';
import storageStatsRoutes from './storage-stats-routes';
import accountingExportRouter from './accounting-export/routes';
import { storage as storageInstance } from './storage';
import { sessionConfig, requireAuth, requireAdmin } from './auth';
import { findCoupon, isCouponActive, allowsSku, forceRefreshCoupons } from './services/coupons';

// Helper to resolve contact email from DB settings or env
// Synchronous fallback (for non-async template helpers)
function getEnvContactEmailSync(): string {
  return process.env.SMTP_FROM || process.env.STUDIO_NOTIFY_EMAIL || process.env.SMTP_USER || '';
}

// Parse ICS date format (YYYYMMDDTHHMMSS or YYYYMMDD)
function parseICSDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  // Remove timezone info if present
  dateStr = dateStr.split('Z')[0].split('T')[0] + (dateStr.includes('T') ? 'T' + dateStr.split('T')[1].split('Z')[0] : '');
  
  // Format: YYYYMMDDTHHMMSS or YYYYMMDD
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-indexed
  const day = parseInt(dateStr.substring(6, 8));
  
  if (dateStr.length > 8) {
    const hour = parseInt(dateStr.substring(9, 11));
    const minute = parseInt(dateStr.substring(11, 13));
    const second = parseInt(dateStr.substring(13, 15) || '0');
    return new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString();
  } else {
    return new Date(Date.UTC(year, month, day)).toISOString();
  }
}

async function resolveContactEmail(): Promise<string> {
  try {
    const settings = await storage.getEmailSettings();
    return (
      settings?.from_email ||
      settings?.smtp_user ||
      getEnvContactEmailSync()
    );
  } catch {
    return getEnvContactEmailSync();
  }
}

/**
 * Centralised business identity helpers.
 * Reads from studioConfigs (DB) first, then env vars, then empty-string fallback.
 * These are synchronous but rely on env vars or values resolved earlier.
 */
function getBizName(): string {
  return process.env.BUSINESS_NAME || 'My Studio';
}
function getBizWebsite(): string {
  return process.env.WEBSITE_URL || process.env.FRONTEND_URL || '';
}
function getBizDomain(): string {
  if (process.env.WEBSITE_DOMAIN) return process.env.WEBSITE_DOMAIN;
  try { return new URL(getBizWebsite()).hostname; } catch { return 'localhost'; }
}
function getBaseUrl(): string {
  return process.env.FRONTEND_URL || process.env.APP_URL || '';
}

// ---------------------------------------------------------------------------
// Newsletter €50 voucher email — shared by the public signup handler AND the
// admin "resend" tool so every path sends the SAME real voucher (not the old
// generic "thanks" note). The €50 gift card is a print credit redeemed at the
// shoot, so it's rendered as a self-contained HTML card that displays even when
// an email client blocks images. A `newsletter_signup` automation row (seeded
// at boot, editable in Admin → Automations) holds the subject/body; if a studio
// customises it there, that wins. Every send is recorded in
// email_automation_logs so we can tell who has — and hasn't — received it.
// ---------------------------------------------------------------------------
const NEWSLETTER_TRIGGER = 'newsletter_signup';

function buildDefaultVoucherEmail(): { subject: string; html: string } {
  const site = getBizWebsite() || 'https://www.newagefotografie.com';
  let host = 'www.newagefotografie.com';
  try { host = new URL(site).hostname; } catch { /* keep default */ }
  const subject = '🎁 Ihr 50€ Foto-Gutschein von New Age Fotografie';
  const html = `
  <div style="background:#0a1834;padding:32px 12px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#0a1834;border:2px solid #d4af37;border-radius:16px;">
      <tr><td style="padding:32px 36px;">
        <p style="letter-spacing:4px;color:#d4af37;font-size:13px;margin:0 0 6px;">NEW AGE FOTOGRAFIE</p>
        <p style="color:#d4af37;font-size:54px;font-weight:bold;margin:0;line-height:1;">50€</p>
        <p style="color:#f5e7b8;font-size:28px;font-weight:bold;letter-spacing:3px;margin:2px 0 22px;">GIFT CARD</p>
        <p style="color:#ffffff;font-size:16px;margin:0 0 14px;">Hallo {{clientName}},</p>
        <p style="color:#cdd6e6;font-size:15px;line-height:1.6;margin:0 0 20px;">vielen Dank für Ihre Anmeldung! Hier ist Ihre <strong style="color:#d4af37;">50€ Geschenkkarte</strong> als Print-Guthaben für Ihr nächstes Fotoshooting.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
          <tr><td style="color:#f5e7b8;font-size:14px;line-height:1.7;padding:2px 0;">✉️&nbsp;&nbsp;50€ Print-Guthaben für Ihr nächstes Shooting</td></tr>
          <tr><td style="color:#f5e7b8;font-size:14px;line-height:1.7;padding:2px 0;">👪&nbsp;&nbsp;Gültig für Familien-, Newborn-, Babybauch- &amp; Portrait-Shootings</td></tr>
          <tr><td style="color:#f5e7b8;font-size:14px;line-height:1.7;padding:2px 0;">📅&nbsp;&nbsp;Studio-Termine auch am Wochenende verfügbar</td></tr>
        </table>
        <div style="background:#122048;border:1px dashed #d4af37;border-radius:10px;padding:16px;text-align:center;margin:0 0 24px;">
          <p style="color:#9fb0cc;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:2px;">Ihr Gutschein</p>
          <p style="color:#d4af37;font-size:18px;font-weight:bold;margin:0;">{{voucherCode}}</p>
        </div>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="${site}" style="background:#d4af37;color:#0a1834;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:30px;display:inline-block;">Jetzt Termin sichern</a>
        </div>
        <p style="color:#8090ad;font-size:12px;line-height:1.6;margin:0;text-align:center;">New Age Fotografie · Wehrgasse 11A/2+5, 1050 Wien<br/>${host}</p>
      </td></tr>
    </table>
  </div>`;
  return { subject, html };
}

// Create the editable newsletter voucher automation once (idempotent). Never
// overwrites an existing row, so a studio's manual edits are preserved.
export async function ensureNewsletterVoucherAutomation(): Promise<void> {
  try {
    const existing = await db
      .select({ id: emailAutomations.id })
      .from(emailAutomations)
      .where(eq(emailAutomations.triggerType, NEWSLETTER_TRIGGER))
      .limit(1);
    if (existing.length > 0) return;
    const { subject, html } = buildDefaultVoucherEmail();
    await db.insert(emailAutomations).values({
      name: 'Newsletter 50€ Voucher',
      description: 'Sent automatically when someone signs up via the €50 newsletter/voucher form. Edit the subject/body here to change the voucher email.',
      triggerType: NEWSLETTER_TRIGGER,
      offsetHours: 0,
      emailSubject: subject,
      emailBodyHtml: html,
      enabled: true,
    });
    console.log('✅ Seeded newsletter_signup voucher automation');
  } catch (err: any) {
    console.warn('⚠️ ensureNewsletterVoucherAutomation skipped:', err?.message || err);
  }
}

// Send the €50 voucher email to one address. Prefers the editable automation
// template, falls back to the built-in card. Records the send (sent/failed) in
// email_automation_logs. Returns { ok } — never throws.
async function sendNewsletterVoucherEmail(
  email: string,
  opts: { isResend?: boolean } = {}
): Promise<{ ok: boolean; error?: string }> {
  const name = email.split('@')[0] || 'Kunde';
  const code = process.env.NEWSLETTER_VOUCHER_CODE || '';
  let ruleId: number | null = null;
  try {
    const [rule] = await db
      .select()
      .from(emailAutomations)
      .where(and(eq(emailAutomations.triggerType, NEWSLETTER_TRIGGER), eq(emailAutomations.enabled, true)))
      .limit(1);
    const base = buildDefaultVoucherEmail();
    const fill = (s: string) => s
      .replace(/\{\{\s*clientName\s*\}\}/g, name)
      .replace(/\{\{\s*clientEmail\s*\}\}/g, email)
      .replace(/\{\{\s*voucherCode\s*\}\}/g, code || 'Zeigen Sie diese E-Mail bei Ihrem Termin vor');
    const subject = fill(rule?.emailSubject || base.subject);
    const html = fill(rule?.emailBodyHtml || base.html);
    ruleId = rule?.id ?? null;

    const transporter = nodemailer.createTransport({
      host: 'smtp.easyname.com', port: 465, secure: true,
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      auth: {
        user: process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || '',
        pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || '',
      },
    });
    await transporter.sendMail({
      from: `"${getBizName()}" <${getEnvContactEmailSync() || 'no-reply@localhost'}>`,
      to: email, subject, html,
    });

    if (ruleId != null) {
      try {
        await db.insert(emailAutomationLogs).values({
          automationId: ruleId,
          bookingId: `newsletter-${opts.isResend ? 'resend-' : ''}${Date.now()}`,
          clientEmail: email,
          clientName: name,
          status: 'sent',
        });
      } catch { /* logging is best-effort */ }
    }
    return { ok: true };
  } catch (error: any) {
    console.error('Error sending newsletter voucher email:', error?.message || error);
    if (ruleId != null) {
      try {
        await db.insert(emailAutomationLogs).values({
          automationId: ruleId,
          bookingId: `newsletter-fail-${Date.now()}`,
          clientEmail: email,
          clientName: name,
          status: 'failed',
          errorMessage: String(error?.message || error).slice(0, 500),
        });
      } catch { /* ignore */ }
    }
    return { ok: false, error: String(error?.message || error) };
  }
}

// Gather every newsletter signup from BOTH sources, deduped by lowercased email:
//   • email_subscribers tagged newsletter/voucher (signups since ~Mar 2026), and
//   • crm_leads with a newsletter source (ALL signups ever — this is where the
//     older homepage signups live, before the email_subscribers write existed).
// `legacy: true` marks addresses that are only in crm_leads (not yet on the list).
async function gatherNewsletterSignups(): Promise<Map<string, { email: string; firstName?: string; createdAt?: any; legacy: boolean }>> {
  const map = new Map<string, { email: string; firstName?: string; createdAt?: any; legacy: boolean }>();
  const subs = await db.select().from(emailSubscribers);
  for (const s of subs as any[]) {
    if (Array.isArray(s.tags) && s.tags.some((t: any) => ['newsletter', 'voucher'].includes(String(t).toLowerCase()))) {
      const key = String(s.email).toLowerCase();
      if (key) map.set(key, { email: s.email, firstName: s.firstName, createdAt: s.createdAt, legacy: false });
    }
  }
  const leads = await db.select().from(crmLeads);
  for (const l of leads as any[]) {
    const src = String(l.source || '').toLowerCase();
    const msg = String(l.message || '').toLowerCase();
    if (src.includes('newsletter') || msg.includes('50 eur voucher') || msg.includes('voucher offer')) {
      const key = String(l.email).toLowerCase();
      if (key && !map.has(key)) map.set(key, { email: l.email, firstName: l.name, createdAt: l.createdAt, legacy: true });
    }
  }
  return map;
}

// Decide a blog post's status/published/publishedAt from its scheduling fields.
// scheduledFor (or a future publishedAt) is the SOURCE OF TRUTH: any future date
// means SCHEDULED + hidden (published=false, publishedAt cleared) until the hourly
// cron publishes it — so a scheduled post can never go live early, regardless of
// the `published` flag the client sends. Mutates the given object in place.
function syncBlogPublishState(data: any): void {
  const now = new Date();
  const sched = data.scheduledFor ? new Date(data.scheduledFor) : null;
  const pub = data.publishedAt ? new Date(data.publishedAt) : null;
  const futureAt = sched && sched > now ? sched : pub && pub > now ? pub : null;
  if (futureAt) {
    data.status = 'SCHEDULED';
    data.published = false;
    data.scheduledFor = futureAt;
    data.publishedAt = null;
  } else if (data.published === true || data.status === 'PUBLISHED') {
    data.status = 'PUBLISHED';
    data.published = true;
    if (!data.publishedAt) data.publishedAt = now;
  } else if (data.published === false) {
    data.status = 'DRAFT';
  }
  // published === undefined on a partial update → leave status untouched.
}

// Professional single-page voucher PDF renderer. Draws into an existing PDFKit
// document from a normalized data object; both /voucher/pdf and its preview use
// it so the customer download and the customization preview stay identical. This
// is presentation only — it does NOT change how voucher data is resolved.
async function renderVoucherPdf(doc: any, data: any): Promise<void> {
  const pageWidth = 595.28, pageHeight = 841.89, pageMargin = 50;
  const contentWidth = pageWidth - pageMargin * 2;
  const reg = data.fontFamily || 'Helvetica';
  const bold = 'Helvetica-Bold';
  const bannerColor = data.bannerColor || '#b3202e';
  const bannerTextColor = data.bannerTextColor || '#ffffff';

  // Fetch an image URL into a PDFKit-safe buffer (JPEG/PNG; WebP→PNG via sharp).
  const fetchImg = async (url?: string): Promise<Buffer | null> => {
    if (!url) return null;
    try {
      const r = await fetch(url);
      if (!r || !r.ok) return null;
      let buf = Buffer.from(await r.arrayBuffer());
      const isWebp = url.toLowerCase().endsWith('.webp') || (r.headers.get('content-type') || '').includes('webp');
      if (isWebp) { try { buf = await sharp(buf).png().toBuffer(); } catch {} }
      return buf;
    } catch { return null; }
  };

  let y = pageMargin;

  // 1. HERO IMAGE — full width, fixed height, cover-cropped for a clean banner.
  const heroH = 290;
  const heroBuf = await fetchImg(data.heroImageUrl);
  if (heroBuf) {
    try {
      doc.save();
      doc.rect(pageMargin, y, contentWidth, heroH).clip();
      doc.image(heroBuf, pageMargin, y, { cover: [contentWidth, heroH], align: 'center', valign: 'center' });
      doc.restore();
      y += heroH;
    } catch { try { doc.restore(); } catch {} ; y += 8; }
  } else {
    y += 8;
  }

  // "Gutschein" ribbon overlapping the hero's bottom-left.
  const ribbonH = 34, ribbonW = 168;
  doc.save();
  doc.rect(pageMargin, y - ribbonH, ribbonW, ribbonH).fill(bannerColor);
  doc.fillColor(bannerTextColor).font(bold).fontSize(17).text('Gutschein', pageMargin + 16, y - ribbonH + 9, { lineBreak: false });
  doc.restore();
  y += 24;

  // ── MIDDLE BLOCK (title · für/von · message · inclusions) ────────────────────
  // Measure the whole block, then place it vertically balanced in the gap between
  // the ribbon and the pinned footer. Short vouchers used to leave a big empty band;
  // centring removes it. The inclusions sit in a soft framed card so they read as a
  // defined element rather than bullets floating in white space.
  const zoneTop = y;
  const zoneBottom = (pageHeight - 155) - 16; // leave a little air above the footer divider
  const zoneH = Math.max(0, zoneBottom - zoneTop);

  const vTitle = data.title || 'Gutschein';
  const bits: string[] = [];
  if (data.recipientName && data.recipientName !== 'Beschenkte/r') bits.push(`Für: ${data.recipientName}`);
  if (data.fromName && data.fromName !== '—') bits.push(`Von: ${data.fromName}`);
  const meta = bits.join('      ');
  const subtitle = (data.message && String(data.message).trim()) ? `„${String(data.message).trim()}“` : '';
  const inc = (data.inclusions || '').toString().trim();
  const items = inc ? inc.split(/\s*[;•\n]\s*/).map((s: string) => s.trim()).filter(Boolean) : [];

  const cardPad = 16, headerGap = 8, lineGap = 6, gapBeforeCard = 12;
  const cardInnerW = contentWidth - cardPad * 2;

  // Measure each part at the exact font/size it will be drawn with.
  doc.font(bold).fontSize(21);
  const hTitle = doc.heightOfString(vTitle, { width: contentWidth }) + 3;
  let hMeta = 0;
  if (meta) { doc.font(reg).fontSize(10.5); hMeta = doc.heightOfString(meta, { width: contentWidth }) + 4; }
  let hSub = 0;
  if (subtitle) { doc.font('Helvetica-Oblique').fontSize(13); hSub = doc.heightOfString(subtitle, { width: contentWidth }) + 10; }
  let cardH = 0;
  if (items.length) {
    doc.font(bold).fontSize(11);
    let inner = doc.heightOfString('Inkludierte Leistungen', { width: cardInnerW }) + headerGap;
    doc.font(reg).fontSize(10.5);
    for (const it of items) inner += doc.heightOfString('•   ' + it, { width: cardInnerW - 4 }) + lineGap;
    cardH = (inner - lineGap) + cardPad * 2;
  }
  const blockH = hTitle + hMeta + hSub + (cardH ? gapBeforeCard + cardH : 0);

  // Bias slightly above true centre (0.42) so the block reads anchored, not floating.
  let by = zoneTop + Math.max(6, (zoneH - blockH) * 0.42);

  // TITLE
  doc.fillColor('#1a1a1a').font(bold).fontSize(21).text(vTitle, pageMargin, by, { width: contentWidth });
  by = doc.y + 3;
  // FÜR / VON
  if (meta) { doc.font(reg).fontSize(10.5).fillColor('#888888').text(meta, pageMargin, by, { width: contentWidth }); by = doc.y + 4; }
  // PERSONAL MESSAGE
  if (subtitle) { doc.font('Helvetica-Oblique').fontSize(13).fillColor('#444444').text(subtitle, pageMargin, by, { width: contentWidth }); by = doc.y + 10; }

  // INCLUSIONS CARD
  if (items.length) {
    const cardTop = by + gapBeforeCard;
    doc.save();
    doc.roundedRect(pageMargin, cardTop, contentWidth, cardH, 8).fill('#f8f8f9');
    doc.roundedRect(pageMargin, cardTop, contentWidth, cardH, 8).lineWidth(0.8).strokeColor('#ececed').stroke();
    doc.restore();
    let cy = cardTop + cardPad;
    doc.font(bold).fontSize(11).fillColor(bannerColor).text('Inkludierte Leistungen', pageMargin + cardPad, cy, { width: cardInnerW });
    cy = doc.y + headerGap;
    doc.font(reg).fontSize(10.5).fillColor('#333333');
    for (const it of items) {
      doc.text('•   ' + it, pageMargin + cardPad, cy, { width: cardInnerW - 4 });
      cy = doc.y + lineGap;
    }
  }

  // 5. FOOTER pinned to the bottom of the page → guarantees a single page.
  //    Everything must stay above PDFKit's 50pt bottom margin (y ≈ 791) or it
  //    spills onto a second page.
  const footerTop = pageHeight - 155;
  doc.moveTo(pageMargin, footerTop).lineTo(pageWidth - pageMargin, footerTop).lineWidth(0.5).strokeColor('#e2e2e2').stroke();

  // QR points to the waitlist landing page (override per tenant via VOUCHER_QR_URL).
  // External render, best-effort.
  const qrSize = 70;
  const qrTarget = process.env.VOUCHER_QR_URL || 'https://www.newagefotografie.com/warteliste';
  const qrBuf = await fetchImg(`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(qrTarget)}`);
  if (qrBuf) { try { doc.image(qrBuf, pageMargin, footerTop + 12, { fit: [qrSize, qrSize] }); } catch {} }

  // Logo (bottom-right)
  const logoBuf = await fetchImg(data.logoUrl || process.env.VOUCHER_LOGO_URL || 'https://i.postimg.cc/j55DNmbh/frontend-logo.jpg');
  if (logoBuf) { try { doc.image(logoBuf, pageWidth - pageMargin - 118, footerTop + 12, { fit: [118, 42] }); } catch {} }

  // Fine print between the QR and the logo.
  const fpX = pageMargin + (qrBuf ? qrSize + 16 : 0);
  const fpW = (pageWidth - pageMargin - 128) - fpX;
  doc.font(bold).fontSize(8).fillColor('#333333').text(`Gutschein-ID: ${data.voucherId || ''}`, fpX, footerTop + 12, { width: fpW });
  const metaLine = [
    // Gift vouchers hide the price so the recipient never sees what was paid.
    (data.paidAmount && !data.hideValue) ? `Wert: ${data.paidAmount}` : '',
    data.purchaseDate ? `Datum: ${data.purchaseDate}` : '',
    data.expiry ? `Gültig bis: ${data.expiry}` : '',
  ].filter(Boolean).join('   ·   ');
  if (metaLine) doc.font(reg).fontSize(7.5).fillColor('#666666').text(metaLine, fpX, doc.y + 2, { width: fpW });
  const terms = data.termsText || 'Einlösbar für die oben genannte Leistung in unserem Studio. Nicht bar auszahlbar. Termin nach Verfügbarkeit. Bitte zur Einlösung Gutschein-ID angeben.';
  doc.font(reg).fontSize(7).fillColor('#888888').text(terms, fpX, doc.y + 3, { width: fpW, align: 'justify' });

  // Contact line at the very bottom, centered on one line.
  const contact = [data.footerText, data.footerEmail, data.footerPhone].filter(Boolean).join('    ·    ');
  if (contact) doc.font(reg).fontSize(8.5).fillColor('#444444').text(contact, pageMargin, pageHeight - 66, { width: contentWidth, align: 'center', lineBreak: false });
}

// Modern PDF invoice generator with actual logo and all required sections
async function generateModernInvoicePDF(invoice: any, client: any): Promise<Buffer> {
  // Load invoice items from database
  const invoiceItems = await storage.getCrmInvoiceItems(invoice.id);
  const contactEmail = await resolveContactEmail();
  
  // Default studio configuration
  let studioConfig = {
    logo: null as string | null,
    studioName: getBizName(),
    address: process.env.BUSINESS_ADDRESS || '',
    phone: process.env.BUSINESS_PHONE || '',
    email: contactEmail || getEnvContactEmailSync() || 'no-reply@localhost'
  };
  
  // Try to fetch dynamic studio configuration
  try {
    const studioId = (process.env.STUDIO_ID || '550e8400-e29b-41d4-a716-446655440000'); // Default demo studio ID
    const language = 'de';
    
    // Fetch site settings (logo) - with error handling
    const siteSettings = await db
      .select()
      .from(manualPageContent)
      .where(
        and(
          eq(manualPageContent.studioId, studioId),
          eq(manualPageContent.pageId, 'site-settings'),
          eq(manualPageContent.language, language)
        )
      )
      .limit(1)
      .catch(() => []);
    
    // Fetch contact details - with error handling
    const contactDetails = await db
      .select()
      .from(manualPageContent)
      .where(
        and(
          eq(manualPageContent.studioId, studioId),
          eq(manualPageContent.pageId, 'contact'),
          eq(manualPageContent.language, language)
        )
      )
      .limit(1)
      .catch(() => []);
    
    // Extract relevant fields from published content if available
    // Note: Content is stored using translation keys, not field IDs
    if (siteSettings[0]?.publishedContent) {
      const siteContent = siteSettings[0].publishedContent as any;
      if (siteContent['site.logo']) {
        studioConfig.logo = siteContent['site.logo'];
      }
    }
    
    if (contactDetails[0]?.publishedContent) {
      const contactContent = contactDetails[0].publishedContent as any;
      const isValidValue = (v: string) => v && !v.startsWith('contact.') && !v.startsWith('site.');
      if (contactContent['contact.studioName'] && isValidValue(contactContent['contact.studioName'])) studioConfig.studioName = contactContent['contact.studioName'];
      if (contactContent['contact.studioAddress'] && isValidValue(contactContent['contact.studioAddress'])) studioConfig.address = contactContent['contact.studioAddress'];
      if (contactContent['contact.phone'] && isValidValue(contactContent['contact.phone'])) studioConfig.phone = contactContent['contact.phone'];
      if (contactContent['contact.email'] && isValidValue(contactContent['contact.email'])) studioConfig.email = contactContent['contact.email'];
    }
  } catch (error) {
    console.warn('Failed to fetch studio config for PDF, using defaults:', (error as any)?.message);
    // Continue with default values
  }
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPosition = 20;

  // Modern header with logo (either custom or default)
  const logoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAApAAAADICAIAAADQlUa0AAAACXBIWXMAAC4jAAAuIwF4pT92AAAJ/mlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4xLWMwMDAgNzkuYjBmOGJlOSwgMjAyMS8xMi8wOC0xOToxMTo0NiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIzLjAgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNC0wOS0yM1QxNjoyMzozNiswMjowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjQtMDktMjNUMTY6MzM6NDgrMDI6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjQtMDktMjNUMTY6MzM6NDgrMDI6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiBwaG90b3Nob3A6SUNDUHJvZmlsZT0ic1JHQiBJRUM2MTk2Ni0yLjEiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NzlkOWRkODctYzFhNi02ZTRmLWJiNjctYjY1MzcwNzFmNDQyIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjc5ZDlkZDg3LWMxYTYtNmU0Zi1iYjY3LWI2NTM3MDcxZjQ0MiIgeG1wTU06T3JpZ2luYWxEb2N1bWVudElEPSJ4bXAuZGlkOjc5ZDlkZDg3LWMxYTYtNmU0Zi1iYjY3LWI2NTM3MDcxZjQ0MiI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249ImNyZWF0ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6NzlkOWRkODctYzFhNi02ZTRmLWJiNjctYjY1MzcwNzFmNDQyIiBzdEV2dDp3aGVuPSIyMDI0LTA5LTIzVDE2OjIzOjM2KzAyOjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgMjMuMCAoV2luZG93cykiLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+NU4RggAAE8FJREFUeJztnXuwVdV9x38/7gMQEIHwfggRkIeAiAaBqFFjjNGYNjOZxmnHTKa205k4k2Y6naad6XTSTNpMO52m02mnmWaSyUxrpmnS6Zs0xte0Y2qMr4hGjSgqr/AGlJf3vff3/XF/e3vP2Xvtffbe5+x9OXft93fmzsW19lprr7X3+f/OWuu3915bSikAAACAhajFVgAAACBFIDACAABiCAwAAICoQGAEAABEBQIjAAAgKhAYAQAAUYHACAAA1CjOuXGNp4Ix3QcCIwAAUKP83ve+f9VVVzU0NDAzM3/6059ubGx8/vnnR7xj+FKS1wIAAMRHQ0PDnDlzjhw5MnXq1N///vdz585VStU3HhtMpkj5AQAAQFw8/PDD9fX1l19++ZQpUxqPHfOoqakp94lAYAQAAApmypQpZ5xxxne/+93169d/8pOfbGpqam5ubmlpaXnzJ6+DgBEAAChM69atW5VSBw8e/MxnPvPggw82qyO3bt06ceLExhfc8KXQXAV8EYnS+EbG53LG7gXJJCOOyNZI23w7ztpEq/c7A4QJcIoKm5oHJOEVKKrD9Xek2LoTrOaVq4TBdxwRCqo1hYzj5zlz5nTo0KFjx47z5s2bP3/+1KlTZ82a9YlPfGLmzJkt6si7775bKfXJT36ypaWlpaVl2rRp119//Zw5c7q++OL+/fvPO++8bdu2TZ48OS7H/oO+CgBAgfT0Hdm7d+/AwEC4TyBaUxMOA+uLxvSDVGE8ceKEUqq7u/vkyZOzZs1asmTJwoUL586de//99z/22GNNTU0nT55saWk5cODAoUOHmpqali1bNnPmzEOHDh05cmTVqlULFiwYGBj4xS9+ceutt27ZsmX79u3bt28PLCJSfhAYAQAKZu/evdu3bx8YGLjooouWL1/et2+f/Vb2yHj+uS+eTB1ZPrw5hG+3VwCz6wqJ0lBK6U7Vt956a+nSpWeccYZSauHChR/+8IdXr1595syZtWvXtrS0LFu27Oabb165cuWjjz66YMGCRYsWvfDCC0899dT111+/Y8eOhQsXPv/88z/72c+k3OFOjy7z2weByA8CIwBAwa1YsWLJkiWHDh3673//t6uuuu6uu/6ts7Pz5KlTf/rKK8OuZo2M7PcW4VlYhJT7ySefXLVqVXNzs91gfDTz+7B8ggUAAFAjKKUaGxuXLl36zW9+89FHH121atWOHTu2b9++bdu2c845Z+3atffee+8PfvCDzZs3X3/99R/96EcnTpx48803f+9733v55Zf379//m9/8pru7+/Dhw1dccUVHR8eMGTMOHjyolOru7n7++ed37dq1fv36w4cP79y5s7e3l5nPOOOMN998UykV6B2LwAgAULAvfOELU6dOXbJkyYwZMzo6Oi6++OJJkybNnj17wYIF11133YIFC+bOnfvzn//8e9/73jXXXDN//vyOjo7Ozs4LL7xw9uzZy5cv37Zt2+TJk2+77bbOzs7Vq1fv3r17+/btDQ0Nn/vc5/bt27dixYrly5cvXrx4x44dr732WlNT02WXXXbhhRcuWLAg0J8JCgAABacaDxWmOeM//vGP7du3v/DCC729vQ899ND999+/YsWKrq6uDRs2vPrqq729vT09PZ2dnV1dXS+99NKGDRu2bdu2ZcuWJ5544o477njwwQeNPgqJVD4+jAAAQBxUPUqJHyMAACAOIDACAAASAQQGAABAVCAwAgAAogKBEQAAEBUIDAAAAFGBwAgAAIgKBEYAAEBUIDACAADiAAIjAAAgKhAYAQAAUYHACAAASAIQGAAAAFGBwAgAAIgKBEYAAEBUIDACAAAiwfcJH7kIEMAIy4/GNt4h+Dn/j9Z8FeQI4IdwIJlfEL8W/uWjNV8FOQI8H6n9eHcL/pJnW+CXbXxm9kQAABQM+jACAAAioWo+jLT8ZN69tHTVaefgTOOz9xgBGBAXWJYHAABEQhwBo25aNKsT7EO5U5Tq9R7DKmfQPPmRuqKvU+3Epc+2f3qKn3TnXOaGFhAw1SQwqnxOqfDYOWJCUKNEPKk89wS+/3zGwZeLamKaQ8LoYFYEDxlhpLN0+6cXV/gzVgL/uEWFJQu8rVu5VQfuVGEgwzCtAhgdjTKI7EwVRhRoFQJGWMyRjCMfNOOqQJUEwxQREBinTTdEjpxWG32O8oiQNMOOPSf4aBhvKD8HbvO1ZT6oitZIRGREi6p5LZ0LGwm6XOMNA5N63kkhj0M/xOJHqpg7ZOKJPfaYJO6GpGlQBU9VJ0e9mRTBmO1AYBQ8lKBFFQCGqsqQoMLwXAJaI98JVZAM3eZrL9KjSCAa2f/MoOSFtNdR6HLVEu/Oz2YoVJsqCIxVAQKjjhfS4eMQOeFO5OVqWF6FdvQtL9K9ysRLz9DjWIKC7lde5a2n9eKJwvNH7UcMpL2SzQJvk5i4QLTcOdG6U/l/BRhPowdVEBhBXKRdYKzyNMpCLF7Z2uNyZxMKVhAVcSqCqggQZp8j+FGTy/7Z0kGOV7UW5C2mhbQqCJyP+Qzuq1mLbUOFFjRj7kVsxF8x2Mk1Sfe9kPU3Qe7F/SbXEBOIWz9ALrwGzMdZJQO5+i7cFKlpYETCABANKZyJOiEfRm9lh6kz9KKGkYJlkZJhk8w6Q45E8gSNTRJ2AKpBqvVdKYXFkgAAgDgAYwQAAEQCGCMAACAqwBgBAABRAcYIAABICiAwAgAAogKBUaDL+XwLhGNkmN3Vz7NYZ0EW8DjkCPQJNwfOmf+sJiUUk99FJpA1V7N+qVDT9HXrIvGJ10RXBTE7pPvfyLdMNHlHmzO1Uyr+/Rrfon5LrOFWPOr8j6HQ38OXXOOFnJXl4wRgOKVIZUyZYiGH3wdQTU6F3fT3/vvvd3Z2Tp06tbGxcfLkyQsWLLjllltu/dCH/vHf/vXFl1/ev3//nj172tvbZ8yYMWnSpL89epR5ROm2bds2bdq0adOmm2+++cyzzya2HQs9PT1z5swZGBiQMunYHjp0aMOGDddee+3s2bMj2vGf//znhQsXNjc3z5gx4+WXX9b37Onp6enp+fOf/3zffffdf//9DzzwwC9/+csNGzY8/PDDt9xyy1VXXXX22WfPnDnztddeC10+9AgAAKgtPv3pT//rv/7r9u3b3377badUo1Kqr6/vBz/4wV133fWzrq6DygHzG2+8sWfPnj179uzdu/fdd9/dsmXLa6+99qqjVQfIpQtXSnV3d3d3d3/961+/8MILL7zwwpdeeumFF164//77v/Od73z5y1++4oorli9fXl9ff+DAgTfeeGP9+vU//vGPm5ub+/v7o9m9JzKAIAAAyZH6DGTF0dTU9P73v//uu+/+yEc+smbNGjBGAABSbvv27TfccMOsWbNuvPHGnTt3xqKn5sYlSfgwAq9SfpfT8OWCH6iqRY4k8WoM9G3r7+9/5pln2tvbn3vuucmTJ48dO/bdd99tamrq7e1VSjU0NPT19XV1db366qsZY/vqq6/++7//+/e///0///nPx48fP3bs2JEjRy6//PI77rjjxhtvXLRo0fnnn79ly5ZNmzY99thj69evf+edd37605+OHTu2vr6+ra1tw4YN//RP/zRmzJgtW7bcfPPNs2bNOuuss+bNm3f22Wcff//7v8//lJgNMDAw8Kc//Wn79u1PP/30FVdccdZZZ82fP3/lypUbN2586623nn322Q0bNvzyF7+4+OKLly9fPnbs2AkTJnR2dm7YsOGll156/fXXf/nLX55//vmLFi2aNm3ahAkTZs6c+clPfvLNN9985513nnnmmfXr1z/xxBNPPfXUo48++tRTT23evPmJJ5744x//+MILL2zatGnbtm179uy1/nIHDhzYsWPHww8/fN111y1ZsmT8+PETJkw477zz1q5d+9Zbb/X09Dz++OM///nPOzs7p06dOnbs2Pb29oceeqinp8fYUk9Pz7PPPvvAAw/87Gc/e/zxx3ft2nXkyJF33313165djz/++B/+8Idf/epXt912280333z99ddfc801V1111Q033PDhD3/4Ax/4wNVXX33HHXd8+9vf/t3vfrdhw4bdu3cfPHhw9+7dr7/++s9//vOvfOUrF1100fz58ydPnvxf//VffX19zjlZFgAAklOrftTy8jEr2LNnzxtvvPHGG288/fTTL774YldX14EDB5RSdXV10iA7Op999tl777137ty5KQk6d911V6WNGzc+99xzDz300P33399ypH8xn3322WeeeebDjz764x//+O233/YuZLxWaYl33nnnO9/5zrJly9rb2ydOnLh06dLPfOYzjc7BNOB1dgmn/LKQOVGZlllLYmPcnXfeuWzZssmTJ2+/7LJr/vVfZ3V1ndPTM7u3d+bevZM6OuYfPtzS2zv23XfP3rNnwte/PqGtbfKePTM6O6fu3j3HqLy1tfWmm26aNWvWuHHjxo0bt2nTpueff/7uu++eP3++lXGGDoyVNueY9wgOhJ4xzAFiPKunp+fJJ5+89957b7/99g996EMXXXTRihUrVq1adf7559c7tL7//e9fccUVV1555YoVK5Y7aqtjKwvtfSklAqOsH3Ry8b0rPxJKLXUjKYqVShE16MqaRMSJqOdlOjd+hPucqg0EgVE4euDAAac6e3s7nCXa9u3b98gjj3zzm9+86aabrrvuuiuvvPLiiy/+05/+tHv37pMnT87/n9tzOJZJNOIo++KLL379619fvHjx2LFjJ02adMkll3z+859/5plnXn/99b179+7bt+/48eOy0yVLlvzLv/zLb3/72927dx88ePDEiRP9/f2ZktOwqcH8aXjVBOI6l4Eff/zxO++887LLLpsyZcrkyZMvu+yy2267be3atdu2bevu7j569OiJEyfee++9d999d+fOnRs3brztH//xpJPfNTQ0XHDBBTfffPOdd975zW9+8/vf//4DDzzwi1/84sknn3zllVe2bt36xhtv7Nq1a//+/ceOHevr63POkFLqoYce+spXvvKBD3zgzDPPnDJlygUXXPCZz3zm29/+9qOPPtrd3X3kyJE33njjiSeeuOOOO6644gpHXunQunPnznvvvfdLX/rSypUr58+fP2nSpPHjxy9btux73/vek08+uX379l27dh04cODYsWMnT548depUd3f3m2++uXbt2q9+9atXXXXVOeecM2nSpPnz53/qU5+67777nn766b179x47duzdd9999dVXf/e7311zzTULFixwznqqlFq3bt1//Md/XHvttefn0iqHPMuCKe7P2iM7DmtR4a2PNp9sT//+9S9u3uzT0KvYqJdlqyb28VU7NDn5yFo3OGTKNJWcl7VTpB6yx6VvDGVr8Qp6LRsZx8jz/7Y/nAeRshCzB8xTFKqevHfOgGNfVfB5e+n7Xz9vw2unz9YMONtKZ6+lDNTbJz1PNbdOlQJHsWFqwqfrQ9Z8VNJVhawjE8Qc1awqe5D8FdCeN6UiCmQVGsKXs6amJn1c+o0fkxE6nqxcCgVlPdHU5GmxCGYPRHPZj0xb8qYq0JrKFhBZr4zOp4fOVGAoEyXdqVEO8n13zzIKKQODJI9s8yrUF86h/Rb5ZKXSQ9T4eUk7SzKh5lEKxrh48eKxY8e+8MEPHn366f3OOmJWxpA4duzYc88998c//vGuu+5atWqVqtOJUPm16lFf40JBVZKfUG+Pu7xfvz6u7rp1Pk35kkqp7du3P/DAA9dee+25556bfVlJUWdnZ6AzJCWksqBz8fxHPIrD16k0KWKfHdGm/+lS9XU8SLNRnXZN8vMCqUJjdDbVr0bsUUkr0s0wnFNxK0evpDH+4Q9/+NznPrdo0SK/k+d7LsJxu3ffRLzVedT6F3YKpIJVqNdZYdXpN6atGc6+Hg/GR0zNhX5K+nqo3ueH6V2VfZXHFxF3iHo8R7VVf3LyJOE6GLLH7MMD8Wz7m7rIK3HPQtdqxhnQTsn9MWjdIBgj8DQ9MQQlxlCJGaMOZ2gPfc8JnLrXQCDpJSFTMuirKXqG/8a+YQZ5NG3L39vLbE9wVXWb8zLzGT4QIpV6t2HaIdpK6DW6kzLwKJKd5BlPCUhv7kPdI8kpBgBAnGRrJjQVIAqNjAGqE1QTVhjpTqIKGFJpK0t8Bop2S52e2VZ0b1HKlAojktOFjJRJT72tO68prNDcSr1QEyKVBW7iK5Hu2PO3JsX/tGsOdaNGrbPwFqxklL6xaOKJ4TJgWCOLRw85lqc3s/qWZFyK8TKLQ8qY1E8EaqHKV56UtJdZV5LdCtK3YhK3SN2x0y0rHSm/NeFOXS7PsS3qP3qtaLNvJagr0pDVWZAq5rjGF8n0ZwKqxhgBACtaKkxOSU/fIGOgRLrTGNK9nOhKo6O82q6rkIhVZkAhfOV5fIUtUvVmhGb3SamfUXU8QvfOstQ6YQG7aJJCB8a/+du/nTt37pQpU9ra2lauXHnPPfe8/vrrx44d6+vr6+/vp+VfLyml+vv7Dx48+Oabb77yyiu33377ihUrpk6dOmnSpHHjxuUQjZlb2sBNfDIFnZ/gzwC4ViS+8vd+M7zJxAhw1X4L7nSepXIoJTyDRLpFfTqQ6NatWxctWnThhRdOnjz5rLPOuuGGGx599NGDBw+ePHny1KlTp06dOpY6Kw+iO/8O8p5hnq6HGP+WGh8Y161bt3jx4qeeekpKHjp06I477li8ePG0adOmTJly4YUX3n777evXr3/zzTePHj1q2yKDI41lB/r7TunOjz+yP1WkWGFfHy8L+H3r/8FtHMTCQDo0EZZCg8HqpMX6yXKmTaWnMEStm4nHU8qsW6Rb0VKhWyVaCtPdV79cZ+9g2GrIxK7dNfj9eo9hK4d9EjgkYVl9F8aVXb6ZJx/Kn+AJzpNKsqjH5BV6jJ7fHOLjV7LWdOrUqXXr1n3nO9+56qqr5s+f39bWNnbs2ClTprz//e9/7rnnzCMymTSWOLJlz7KmQ2Z6d/orhXdGcj5zEm9FGQCGUDVXctj1tNR6yVfKCqOJqGE8C+FNhD4e9beCo36U5cknn/zkJz957rnnTpgwYfz48VPPO+8j//M/G7ds2bt377Fjx06dOtXb2yuNLZM8liLN3m2qLkOOaFUzOmsrGPuq4KfNQp/D7FJOx/8r7CwEfhlhEhWLvPjii9/4xjeuuuqqJUuWjB07trGxce7cuZ/61Kfuu+++Z5555o033njnnXd6e3tPnz49MDAwMDDQ19d38uTJU6dOHT9+fO/eveeeey5Zjwt98XUP9HX4eEzd0oYILy8t6rOUmDNJZAOJxzN0VZGCCJe4zqP0j3S7TCtdZ40JME+QL1jKzj5vJ/u8nWzKyWUOOlKJM5VR9sGY8w7xjnSbbVV9pkhcK0/9eSZh+HGIR2kFT2CwOiP1fO6wNaXUiRMn1q5d+7GPfey9732v87IwVVdXt3r16l/96lfbt28/dOjQ0aNHpVk2MDAwMDBw4sSJY8eOvfPOO6+99prNFJ1z1hKHOJIqKQ8+Sx7g9dTfI1JXNDdEzDGP8W7w1Qxnn/xc2fKQh4Bb0a/lhAhAUFKOmQcJIe4CHfhG5WU5skhOJfJZwJayv9NeNj9EzJAJX1/PzJdRgLQNJKr7kE8P3feP9+sLFv/IxKzfNf2eUE5e9j+RKYfp1Rd2HFGOTFf/SBtMqf1Vxs/pZYU2uHMjyFuUwGZFMFXu7oNhMOvpC/awPF4QyPmVsD89v5YE/kOhqUlVY4c5OTc/8SyJNFjPyKMwSNWa11vhE6kSqYONLxO29JV8N8grb3JgMKN0ZgV0ZfPNcXGYnYV8eSYKCNkVA0Zz8xNApCDlAgAA0pKg1E5gDBhqtmrLN2VGAB5LrPJlZZz5tKr8DKSNtN9rWJcjxQu8q18J1W3Ey6qxU8HXSW7PoNpE7Qw6W/Q8ww2BzJJpWGwEZGkgQM0YjBp9dP6kH8UAAJAH1YyKxLe6B2s7m9Hre0qvyRaJzjjqLRLpGiHtjGSQvL8RpD3e9KRqJWPM3wqr8VQ9zJn/jxYE5EfVhJGQdNhkM0W5uQQ+Rv3O7jrpxaVx8pTfTe9ZkjAUdIUDy+t6lL8nPZp6QlJ3Q2z4RUOmfSbLHbJ5X/3YifCkzUQG72Ol5vW1iSxrO2IfBb1DazU1NCfwWJKC0MFZG6pOyM6pWfxJZm2RjXd9O8lCY6T8tJG6IgAgOTARNSw/AAAQBNyKAQAAUYHACAAASAoQGAEAAFGBwAgAAIgKBEYAAEBUICACAABEBRIZAQAAcQCBEQAAEBUIjAAAgKhAYAQAAEQFAiMAACApQGAEAABEBQJjGV5++eXOzs729vbm5ubm5uZx48bNnTt38eLFF1100bXXXvv5z3/+jjvuuOeee/7whz/88Y9/fO211zZt2vT666/v2bNn//79R48e7e3tPXXq1MDAQH9//8DAAH8pNf7MlnxK/uUv0ZfUfPJTn/pUFBUCANQuCIwGqVdfffWrX/3qihUr5s2b19raOmXKlIkTJ06cOLG1tbW1tXXMmDGNjY2NjY0tLS3Nzc3Ozjc3N7e0tDQ1NTU0NDQ0NDQ1NbW0tLS0tLS0tIwdO3b8+PETJkyYOHGitNHY2Njc3NzY2NjU1CTfamlpaWpqGjt27MSJE1tbW6dOnTp79uz58+eff/75F1100ZVXXvnxj3/8Ix/5yOc///mvfe1rd99996OPPrpx48Zt27bt3bv36NGjJ06c6Ovr6+vr6+/v7+/v7+/vN2+GlJEPZn5ey0kZKfl3f/d3WrGYFAAAUE4sgjEwwNznz59/2WWXrV69+p577rnvvvueeOKJF1988a233jpy5EhPT09vb+/p06f7+vr6+vr6+/tPnz598uTJkydPDgwMnDx58sMf/vDu3btfeumlu+++e+7cuVOmTJk6deq5557b3t4+f/78FStWrFq16vLLL7/ssss+8pGPfPzjH//kJz/5mc985stf/vJdd911//33P/bYYxs2bNi8efOOHTsOHDhw7NixEydOnDhx4vjx48eOHevu7t67d+/evXu7u7u7u7v37du3f//+/fv3Hzx48MiRI8ePHz958mRfX19vb29vb++JEydOnDhx6tSp06dPDwwMDAwMnDp16tSpU6dOnero6Dh8+PDhw4ePHDly4sSJvr6+3t7eY8eOHT9+/Pjx48ePHz927Njhw4cPHTp06NCho0ePHjt2rLe3t7e3t6en59ChQ4cPH5Z3S82TJk2aMmXK5MmTp0yZMnXq1GnTps2YMWP27NmLFi1asWLFqlWrrrjiissuu+zDH/7wxz72sVtvvfUb3/jGt7/97f/8z/985JFH1q9fv2nTpu3bt+/atWvfvn2HDx8+evTo8ePH5UOxO3fu7OjoOHz48NGjR48fP37ixImTJ0/29fWdPn26r6+vt7e3t7e3p6fn2LFjBw8ePHDgwP79+/ft29fd3X3o0KHDhw8fPXr02LFjJ06cOHnyZF9fX19f36lTp06dOnX69On+/v6zfvazfzfcMBQGAADbSURBVGrr6rr/gQfuvffeH/3oRw899NDf//3fX3XVVcuXL1+0aNG8efNmz549bdr/Awh8oROSGPvTAAAAAElFTkSuQmCC';
  
  // Add company logo to header
  try {
    doc.addImage(logoBase64, 'PNG', 15, 5, 45, 15);
  } catch (error) {
    // Fallback to text logo if image fails
    doc.setFillColor(147, 51, 234);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(studioConfig.studioName.toUpperCase(), 20, 17);
  }
  
  yPosition = 30;

  // Studio information section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(studioConfig.address, 20, yPosition);
  doc.text(`Tel: ${studioConfig.phone} | Email: ${studioConfig.email}`, 20, yPosition + 6);

  // Invoice header section with modern styling
  yPosition += 25;
  doc.setTextColor(0, 0, 0);
  
  // Invoice title with purple accent
  doc.setFillColor(147, 51, 234);
  doc.rect(pageWidth - 80, yPosition - 8, 70, 20, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RECHNUNG', pageWidth - 75, yPosition + 2);
  
  // Invoice details
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number || invoice.id;
  const issueDate = new Date(invoice.issueDate || invoice.issue_date || new Date()).toLocaleDateString('de-DE');
  const dueDate = new Date(invoice.dueDate || invoice.due_date || new Date()).toLocaleDateString('de-DE');
  
  yPosition += 25;
  doc.text(`Rechnung Nr.: ${invoiceNumber}`, pageWidth - 75, yPosition);
  doc.text(`Rechnungsdatum: ${issueDate}`, pageWidth - 75, yPosition + 6);
  doc.text(`Fälligkeitsdatum: ${dueDate}`, pageWidth - 75, yPosition + 12);

  // Client information with modern box
  yPosition += 25;
  doc.setFillColor(248, 250, 252); // Light gray background
  doc.rect(20, yPosition - 5, 100, 50, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(147, 51, 234);
  doc.text('RECHNUNGSEMPFÄNGER', 25, yPosition + 5);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  yPosition += 15;
  const clientName = `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.trim();
  if (clientName) {
    doc.text(clientName, 25, yPosition);
    yPosition += 6;
  }
  if (client.email) {
    doc.text(client.email, 25, yPosition);
    yPosition += 6;
  }
  if (client.phone) {
    doc.text(client.phone, 25, yPosition);
    yPosition += 6;
  }
  if (client.vatNumber || client.vat_number) {
    doc.text(`UID: ${client.vatNumber || client.vat_number}`, 25, yPosition);
    yPosition += 6;
  }

  // Items table header with proper spacing to avoid conflicts
  yPosition += 25;
  doc.setFillColor(147, 51, 234);
  doc.rect(20, yPosition - 5, pageWidth - 40, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BESCHREIBUNG', 25, yPosition + 2);
  doc.text('MENGE', 120, yPosition + 2, { align: 'center' });
  doc.text('EINZELPREIS', 140, yPosition + 2, { align: 'right' });
  doc.text('GESAMTPREIS', pageWidth - 25, yPosition + 2, { align: 'right' });
  
  // Table items
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  yPosition += 15;
  
  if (invoiceItems && Array.isArray(invoiceItems) && invoiceItems.length > 0) {
    invoiceItems.forEach((item: any, index: number) => {
      const description = item.description || 'Fotografie-Leistung';
      const quantity = parseFloat(item.quantity?.toString() || '1');
      const unitPrice = parseFloat(item.unitPrice?.toString() || item.unit_price?.toString() || '0');
      const amount = quantity * unitPrice;
      
      // Alternating row colors
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(20, yPosition - 3, pageWidth - 40, 10, 'F');
      }
      
      doc.text(description, 25, yPosition + 2);
      doc.text(quantity.toString(), 120, yPosition + 2, { align: 'center' });
      doc.text(`€${unitPrice.toFixed(2)}`, 140, yPosition + 2, { align: 'right' });
      doc.text(`€${amount.toFixed(2)}`, pageWidth - 25, yPosition + 2, { align: 'right' });
      yPosition += 12;
    });
  } else {
    // Fallback if no items found
    doc.setTextColor(100, 100, 100);
    doc.text('Alle Porträts Insgesamt', 25, yPosition + 2);
    doc.text('1', 120, yPosition + 2, { align: 'center' });
    const subtotal = parseFloat(invoice.subtotal?.toString() || '0');
    doc.text(`€${subtotal.toFixed(2)}`, 140, yPosition + 2, { align: 'right' });
    doc.text(`€${subtotal.toFixed(2)}`, pageWidth - 25, yPosition + 2, { align: 'right' });
    yPosition += 12;
    doc.setTextColor(0, 0, 0);
  }

  // Totals section with styling
  yPosition += 10;
  const total = parseFloat(invoice.total?.toString() || invoice.total_amount?.toString() || '0');
  
  doc.setFillColor(147, 51, 234);
  doc.rect(120, yPosition - 5, pageWidth - 140, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`GESAMTBETRAG: €${total.toFixed(2)}`, pageWidth - 25, yPosition + 5, { align: 'right' });

  // Check if we need a new page for payment info and model release
  if (yPosition > pageHeight - 100) {
    doc.addPage();
    yPosition = 20;
  }

  // Payment information - ALWAYS VISIBLE
  yPosition += 25;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ZAHLUNGSINFORMATIONEN', 20, yPosition);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  yPosition += 8;
  const status = invoice.status === 'paid' ? 'BEZAHLT ✓' : 'OFFEN - Bitte überweisen Sie den Betrag auf folgendes Konto:';
  doc.text(`Status: ${status}`, 20, yPosition);
  
  // ALWAYS show bank details regardless of status
  yPosition += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Bankverbindung:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  yPosition += 6;
  doc.text('Bank: N26', 20, yPosition);
  yPosition += 4;
  doc.text('IBAN: DE46 1001 1001 2620 9741 97', 20, yPosition);
  yPosition += 4;
  doc.text('BIC: NTSBDEB1XXX', 20, yPosition);
  yPosition += 4;
  doc.text(`Verwendungszweck: Rechnung ${invoiceNumber}`, 20, yPosition);

  // Model Release / Privacy section - ALWAYS VISIBLE
  yPosition += 20;
  if (yPosition > pageHeight - 80) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('📸 Model Release / Einverständniserklärung zur Bildverwendung', 20, yPosition);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  yPosition += 8;
  
  const modelReleaseText = [
    'Wir respektieren Ihre Privatsphäre. Ihre Bilder werden niemals verkauft oder an Dritte zu',
    'kommerziellen Zwecken weitergegeben.',
    '',
    'Einige ausgewählte Aufnahmen aus Ihrem Fotoshooting dürfen wir gegebenenfalls für unsere',
    'eigene Außendarstellung verwenden – etwa auf unserer Website, in sozialen Medien oder in',
    'Druckmaterialien, um unser Portfolio zu präsentieren.',
    '',
    'Sollten Sie nicht einverstanden sein, dass Ihre Bilder für diese Zwecke verwendet werden,',
    `bitten wir um eine kurze Mitteilung an ${contactEmail || 'unserer Kontaktadresse'} vor Ihrem Shooting.`
  ];
  
  modelReleaseText.forEach(line => {
    if (line === '') {
      yPosition += 3;
    } else {
      doc.text(line, 20, yPosition);
      yPosition += 4;
    }
  });

  // Modern footer
  const footerY = pageHeight - 25;
  doc.setFillColor(60, 60, 60);
  doc.rect(0, footerY - 5, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(getBizName(), 20, footerY + 2);
  doc.text('Vielen Dank für Ihr Vertrauen! 🙏', 20, footerY + 8);

  return Buffer.from(doc.output('arraybuffer'));
}

// Simple text invoice generator that works immediately
function generateTextInvoice(invoice: any, client: any): string {
  const today = new Date().toLocaleDateString('de-DE');
  const contactEmail = getEnvContactEmailSync();
  const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number || invoice.id;
  const clientName = `${client.firstName || client.first_name || ''} ${client.lastName || client.last_name || ''}`.trim();
  const total = parseFloat(invoice.total?.toString() || invoice.total_amount?.toString() || '0');
  
  return `
${getBizName().toUpperCase()}
=================================

RECHNUNG
--------
Rechnungsnummer: ${invoiceNumber}
Datum: ${today}

Rechnungsempfänger:
${clientName}
${client.email || ''}

Rechnungsdetails:
${invoice.items ? invoice.items.map((item: any, index: number) => 
  `${index + 1}. ${item.description || 'Fotografie-Leistung'} - €${parseFloat(item.unitPrice?.toString() || '0').toFixed(2)}`
).join('\n') : 'Fotografie-Leistungen'}

Gesamtbetrag: €${total.toFixed(2)}

Zahlungsinformationen:
Status: ${invoice.status === 'paid' ? 'BEZAHLT' : 'OFFEN'}

Kontakt:
--------
${getBizName()}
${process.env.BUSINESS_ADDRESS || ''}
Tel: ${process.env.BUSINESS_PHONE || ''}
Email: ${contactEmail}
Web: ${getBizWebsite()}

Vielen Dank für Ihr Vertrauen!
  `.trim();
}

// Guarded Stripe initialization - avoid crashing the app if env var missing
let stripe: Stripe | null = null;
let stripeConfigured = false;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.warn('⚠️ STRIPE_SECRET_KEY missing - Stripe disabled. Set STRIPE_SECRET_KEY to enable payments.');
} else if (stripeSecretKey.includes('dummy') || stripeSecretKey.includes('xxx') || stripeSecretKey.length < 20) {
  console.warn('⚠️ STRIPE_SECRET_KEY looks invalid. Stripe disabled.');
} else {
  try {
    stripe = new Stripe(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
    stripeConfigured = true;
    console.log('✅ Stripe initialized in routes');
  } catch (err) {
    console.warn('⚠️ Failed to initialize Stripe in routes:', err);
  }
}

// Authentication middleware with fallback to static admin token header for legacy admin pages
// Captured once at module load so /api/version can report uptime/boot time.
const SERVER_STARTED_AT = new Date().toISOString();

const authenticateUser = async (req: any, res: any, next: any) => {
  try {
    // If session exists, defer to original requireAuth for user resolution
    if (req.session && req.session.userId) {
      return requireAuth(req, res, next);
    }
    
    // Check for JWT token in Authorization header (Bearer token)
    const authHeader = req.headers['authorization'] as string;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwt = await import('jsonwebtoken' as any);
        const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'default-secret';
        const decoded = jwt.default.verify(token, secret) as any;
        if (decoded && decoded.userId) {
          req.user = { id: decoded.userId, role: decoded.role || 'admin' };
          return next();
        }
      } catch (jwtErr) {
        // JWT verification failed, continue to other auth methods
        console.warn('[auth] JWT verification failed:', (jwtErr as any)?.message);
      }
    }
    
    // Legacy / headless token header fallback
    const token = (req.headers['x-admin-token'] as string) || '';
    const expected = process.env.ADMIN_TOKEN || '';
    if (expected && token && token === expected) {
      return next();
    }
    return res.status(401).json({ success: false, error: 'Authentication required' });
  } catch (err) {
    console.error('[auth] authenticateUser fallback error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Accept EITHER normal admin auth (session / JWT / X-Admin-Token) OR a scoped
// integration API key (ia_live_...). Non-breaking: existing admin credentials work
// exactly as before; a valid scoped key is simply an additional accepted credential,
// gated to the required scope(s). Used for endpoints external apps (e.g. Infinite
// Authority) may call without the shared ADMIN_TOKEN.
const authOrApiKey = (...requiredScopes: string[]) => async (req: any, res: any, next: any) => {
  // Only treat a credential as an integration key when it carries our prefix, so JWT
  // Bearer tokens and the admin-token header fall through to authenticateUser untouched.
  const extractKey = (): string | null => {
    const xk = ((req.headers['x-api-key'] as string) || '').trim();
    if (xk.startsWith('ia_')) return xk;
    const auth = ((req.headers['authorization'] as string) || '').trim();
    if (auth.startsWith('Bearer ')) {
      const t = auth.slice(7).trim();
      if (t.startsWith('ia_')) return t;
    }
    return null;
  };
  const presented = extractKey();
  if (presented) {
    try {
      const { verifyIntegrationKey, keyHasScope } = await import('./lib/apiKeys.js');
      const key = await verifyIntegrationKey(presented);
      if (!key) return res.status(401).json({ success: false, error: 'Invalid API key', code: 'invalid_api_key' });
      const missing = requiredScopes.filter((s) => !keyHasScope(key.scopes, s));
      if (missing.length) {
        return res.status(403).json({ success: false, error: `Missing required scope(s): ${missing.join(', ')}`, code: 'insufficient_scope' });
      }
      req.apiKey = key;
      if (!req.user) req.user = { id: key.id, role: 'integration' };
      return next();
    } catch (e) {
      console.error('[auth] integration key check failed:', e);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
  return authenticateUser(req, res, next);
};

// Generate HTML template for invoice PDF
function generateInvoiceHTML(invoice: any, client: any): string {
  const today = new Date().toLocaleDateString('de-DE');
  const issueDate = new Date(invoice.issueDate || invoice.issue_date || new Date()).toLocaleDateString('de-DE');
  const dueDate = new Date(invoice.dueDate || invoice.due_date || new Date()).toLocaleDateString('de-DE');
  
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rechnung ${invoice.invoiceNumber}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          border-bottom: 2px solid #9333ea;
          padding-bottom: 20px;
        }
        .logo-section {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }
        .company-logo {
          width: 200px;
          height: auto;
          margin-right: 15px;
          margin-bottom: 10px;
          max-height: 80px;
          object-fit: contain;
        }
        .company-info h1 {
          color: #9333ea;
          margin: 0;
          font-size: 28px;
          font-weight: bold;
        }
        .company-details p {
          margin: 3px 0;
          font-size: 13px;
          color: #555;
        }
        .company-details strong {
          color: #333;
        }
        .invoice-info {
          text-align: right;
        }
        .invoice-info h2 {
          color: #333;
          margin: 0;
          font-size: 24px;
        }
        .client-section {
          margin: 30px 0;
        }
        .client-section h3 {
          color: #9333ea;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin: 30px 0;
        }
        .details-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          width: 45%;
        }
        .details-box h4 {
          margin: 0 0 10px 0;
          color: #333;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
        }
        .items-table th,
        .items-table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        .items-table th {
          background-color: #9333ea;
          color: white;
          font-weight: bold;
        }
        .items-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .totals {
          margin-top: 20px;
          text-align: right;
        }
        .totals table {
          margin-left: auto;
          border-collapse: collapse;
        }
        .totals td {
          padding: 8px 15px;
          border: none;
        }
        .totals .total-row {
          font-weight: bold;
          font-size: 18px;
          border-top: 2px solid #9333ea;
          color: #9333ea;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #9333ea;
          font-size: 11px;
          color: #666;
        }
        .footer-content {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        .footer-section {
          flex: 1;
          margin-right: 20px;
        }
        .footer-section:last-child {
          margin-right: 0;
        }
        .footer-section h4 {
          color: #9333ea;
          font-size: 12px;
          margin: 0 0 8px 0;
          font-weight: bold;
        }
        .footer-section p {
          margin: 2px 0;
          line-height: 1.3;
        }
        .footer-bottom {
          text-align: center;
          padding-top: 15px;
          border-top: 1px solid #eee;
          color: #9333ea;
          font-style: italic;
        }
        .payment-terms {
          background: #e7f3ff;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #9333ea;
        }
        .number {
          text-align: right;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <div class="logo-section">
            <!-- Logo removed for PDF generation -->
            <h1>${getBizName()}</h1>
          </div>
          <div class="company-details">
            <p><strong>Adresse:</strong> Wehrgasse 11A/2+5, 1050 Wien, Austria</p>
            <p><strong>Telefon:</strong> +43 677 633 99210</p>
            <p><strong>Email:</strong> ${getEnvContactEmailSync()}</p>
            <p><strong>Website:</strong> ${getBizWebsite()}</p>
            <p><strong>UID:</strong> ATU12345678 | <strong>FN:</strong> 123456a</p>
          </div>
        </div>
        <div class="invoice-info">
          <h2>RECHNUNG</h2>
          <p><strong>Nr.: ${invoice.invoiceNumber}</strong></p>
          <p>Datum: ${today}</p>
        </div>
      </div>

      <div class="client-section">
        <h3>Rechnungsempfänger</h3>
        <p><strong>${client.firstName || ''} ${client.lastName || ''}</strong></p>
        <p>${client.email || ''}</p>
        ${client.address ? `<p>${client.address}</p>` : ''}
        ${client.city ? `<p>${client.zip ? client.zip + ' ' : ''}${client.city}, ${client.country || ''}</p>` : ''}
      </div>

      <div class="invoice-details">
        <div class="details-box">
          <h4>Rechnungsdetails</h4>
          <p><strong>Rechnungsdatum:</strong> ${issueDate}</p>
          <p><strong>Fälligkeitsdatum:</strong> ${dueDate}</p>
          <p><strong>Zahlungsbedingungen:</strong> ${invoice.paymentTerms || 'Net 30'}</p>
        </div>
        <div class="details-box">
          <h4>Zahlungsinformationen</h4>
          <p><strong>Status:</strong> ${invoice.status === 'paid' ? 'Bezahlt' : 'Offen'}</p>
          <p><strong>Währung:</strong> ${invoice.currency || 'EUR'}</p>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Beschreibung</th>
            <th>Menge</th>
            <th>Einzelpreis</th>
            <th>MwSt. %</th>
            <th>Gesamtpreis</th>
          </tr>
        </thead>
        <tbody>
          ${(invoice.items || []).map((item: any) => `
            <tr>
              <td>${item.description || 'Leistung'}</td>
              <td class="number">${item.quantity || 1}</td>
              <td class="number">€${parseFloat(item.unitPrice?.toString() || item.unit_price?.toString() || '0').toFixed(2)}</td>
              <td class="number">${item.taxRate || item.tax_rate || 0}%</td>
              <td class="number">€${(parseFloat(item.unitPrice?.toString() || item.unit_price?.toString() || '0') * (item.quantity || 1)).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td>Zwischensumme:</td>
            <td class="number">€${parseFloat(invoice.subtotal?.toString() || '0').toFixed(2)}</td>
          </tr>
          <tr>
            <td>MwSt.:</td>
            <td class="number">€${parseFloat(invoice.taxAmount?.toString() || invoice.tax_amount?.toString() || '0').toFixed(2)}</td>
          </tr>
          ${invoice.discountAmount ? `
          <tr>
            <td>Rabatt:</td>
            <td class="number">-€${parseFloat(invoice.discountAmount?.toString() || '0').toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr class="total-row">
            <td><strong>Gesamtbetrag:</strong></td>
            <td class="number"><strong>€${parseFloat(invoice.total?.toString() || '0').toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>

      ${invoice.notes ? `
      <div class="payment-terms">
        <h4>Anmerkungen</h4>
        <p>${invoice.notes}</p>
      </div>
      ` : ''}

      <div class="payment-terms">
        <h4>Zahlungsbedingungen</h4>
        <p>Bitte überweisen Sie den Rechnungsbetrag bis zum Fälligkeitsdatum auf unser Konto. Bei Fragen wenden Sie sich gerne an uns.</p>
      </div>

      <div class="footer">
        <div class="footer-content">
          <div class="footer-section">
            <h4>Kontakt</h4>
            <p><strong>${getBizName()}</strong></p>
            <p>${process.env.BUSINESS_ADDRESS || ''}</p>
            <p>Tel: ${process.env.BUSINESS_PHONE || ''}</p>
            <p>Email: ${getEnvContactEmailSync()}</p>
          </div>
          <div class="footer-section">
            <h4>Geschäftsinformationen</h4>
            <p>UID-Nr.: ATU12345678</p>
            <p>Firmenbuchnummer: FN 123456a</p>
            <p>Gerichtsstand: Wien</p>
            <p>Website: ${getBizWebsite()}</p>
          </div>
          <div class="footer-section">
            <h4>Bankverbindung</h4>
            <p>Bank: Erste Bank Austria</p>
            <p>IBAN: AT12 2011 1000 0000 1234</p>
            <p>BIC: GIBAATWWXXX</p>
            <p>Verwendungszweck: Rechnung ${invoice.invoiceNumber}</p>
          </div>
        </div>
        <div class="footer-bottom">
          <p><em>Vielen Dank für Ihr Vertrauen! Professionelle Fotografie mit Leidenschaft seit 2020.</em></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Initialize S3 Client for Backblaze B2
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  forcePathStyle: process.env.AWS_S3_ENDPOINT ? true : false,
});

// Configure multer for image uploads - use memory storage for B2 upload
const upload = multer({
  storage: multer.memoryStorage(), // Changed to memory storage for direct B2 upload
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit to reduce Multer edge rejections
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Configure multer for audio uploads (voice transcription)
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/webm', 'audio/ogg'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.wav') || file.originalname.endsWith('.mp3')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type. Only WAV, MP3, MP4, WebM, and OGG audio files are allowed.'));
    }
  }
});

// Configure multer for document uploads (price guide PDF/JPG/Word)
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for documents
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx'];
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, PNG, WebP, DOC, and DOCX files are allowed.'));
    }
  }
});

// Convert plain text content to structured HTML with proper headings and paragraphs
function convertPlainTextToStructuredHTML(content: string): string {
  console.log('🔧 Converting text to structured HTML...');
  
  // Remove any existing HTML tags first
  let cleanContent = content.replace(/<[^>]*>/g, '').trim();
  
  // Split content into lines and process
  const lines = cleanContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  let htmlContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect headings by common patterns
    if (line.match(/^(##?\s+|H[12]:\s*)/i) || 
        line.match(/^(Einführung|Warum|Der persönliche|Tipps|Was Sie|Nach dem)/i) ||
        line.match(/^\d+\.\s+[A-ZÄÖÜ]/)) {
      // This is a heading
      const cleanHeading = line.replace(/^(##?\s+|H[12]:\s*|\d+\.\s*)/i, '').trim();
      htmlContent += `<h2>${cleanHeading}</h2>\n`;
    } else if (line.length > 50) {
      // This is likely a paragraph (longer content)
      htmlContent += `<p>${line}</p>\n`;
    } else if (line.length > 10) {
      // Short line, could be a list item or small paragraph
      if (line.match(/^[-•*]\s/)) {
        // Convert to list item
        const listItem = line.replace(/^[-•*]\s/, '').trim();
        htmlContent += `<li>${listItem}</li>\n`;
      } else {
        htmlContent += `<p>${line}</p>\n`;
      }
    }
  }
  
  // If we don't have enough structure, split long paragraphs
  if (!htmlContent.includes('<h2>')) {
    console.log('🔧 No headings detected, splitting into structured paragraphs...');
    
    // Split content by sentences and group into paragraphs
    const sentences = cleanContent.split(/[.!?]+\s+/).filter(s => s.trim().length > 10);
    htmlContent = '';
    
    // Create structured content with artificial headings
    const headings = [
      'Einführung in die Familienfotografie',
      'Die Bedeutung professioneller Familienfotos',
      'Unser Fotostudio in Wien',
      'Tipps für das perfekte Familienfoto',
      'Nachbearbeitung und Ergebnisse'
    ];
    
    const sentencesPerSection = Math.ceil(sentences.length / headings.length);
    
    for (let i = 0; i < headings.length; i++) {
      htmlContent += `<h2>${headings[i]}</h2>\n`;
      
      const sectionStart = i * sentencesPerSection;
      const sectionEnd = Math.min((i + 1) * sentencesPerSection, sentences.length);
      
      for (let j = sectionStart; j < sectionEnd; j++) {
        if (sentences[j] && sentences[j].trim().length > 0) {
          const sentence = sentences[j].trim();
          // Make sure each sentence ends with proper punctuation
          const punctuatedSentence = sentence.match(/[.!?]$/) ? sentence : sentence + '.';
          htmlContent += `<p>${punctuatedSentence}</p>\n`;
        }
      }
    }
  }
  
  console.log('✅ Text converted to structured HTML');
  console.log('📊 Structured content length:', htmlContent.length, 'characters');
  console.log('📊 H2 headings found:', (htmlContent.match(/<h2>/g) || []).length);
  console.log('📊 Paragraphs created:', (htmlContent.match(/<p>/g) || []).length);
  
  return htmlContent;
}

// Helper function to find client by email address
async function findClientIdByEmail(email: string): Promise<string | null> {
  if (!email) return null;
  
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const clients = await storage.getCrmClients();
    
    const matchingClient = clients.find(client => 
      client.email && client.email.toLowerCase().trim() === normalizedEmail
    );
    
    if (matchingClient) {
      console.log(`✅ Matched email ${email} to client ${matchingClient.firstName} ${matchingClient.lastName} (${matchingClient.id})`);
      return matchingClient.id;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding client by email:', error);
    return null;
  }
}

// IMAP Email Import Function
async function importEmailsFromIMAP(config: {
  host: string;
  port: number;
  username: string;
  password: string;
  useTLS: boolean;
}): Promise<Array<{
  from: string;
  fromName: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
}>> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: config.username,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.useTLS,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000, // 30 seconds
      authTimeout: 30000,
      keepalive: false
    });

    // Add timeout for the whole operation
    const timeout = setTimeout(() => {
      imap.end();
      reject(new Error('IMAP connection timeout after 60 seconds'));
    }, 60000);

    const emails: Array<{
      from: string;
      fromName: string;
      subject: string;
      body: string;
      date: string;
      isRead: boolean;
    }> = [];

    function openInbox(cb: (err: any, box: any) => void) {
      imap.openBox('INBOX', true, cb);
    }

    imap.once('ready', function() {
      openInbox(function(err: any, box: any) {
        if (err) {
          console.error('Error opening inbox:', err);
          return reject(err);
        }

        // Search for all emails in INBOX including recent ones
        imap.search(['ALL'], function(err: any, results: number[]) {
          if (err) {
            console.error('Error searching emails:', err);
            return reject(err);
          }

          if (!results || results.length === 0) {
            console.log('No emails found in inbox');
            imap.end();
            return resolve([]);
          }

          console.log(`Found ${results.length} emails in inbox`);
          
          // Fetch only the last 20 emails to keep memory usage low
          const recentResults = results.slice(-20);
          const f = imap.fetch(recentResults, { 
            bodies: '', 
            struct: true 
          });

          f.on('message', function(msg: any, seqno: number) {
            let emailData = {
              from: '',
              fromName: '',
              subject: '',
              body: '',
              date: new Date().toISOString(),
              isRead: false
            };

            msg.on('body', function(stream: any, info: any) {
              simpleParser(stream, (err: any, parsed: any) => {
                if (err) {
                  console.error('Error parsing email:', err);
                  return;
                }

                emailData.from = parsed.from?.value?.[0]?.address || '';
                emailData.fromName = parsed.from?.value?.[0]?.name || emailData.from;
                emailData.subject = parsed.subject || 'No Subject';
                emailData.body = parsed.text || parsed.html || '';
                emailData.date = parsed.date?.toISOString() || new Date().toISOString();
                
                emails.push(emailData);
              });
            });

            msg.once('attributes', function(attrs: any) {
              emailData.isRead = attrs.flags.includes('\\Seen');
            });
          });

          f.once('error', function(err: any) {
            console.error('Fetch error:', err);
            reject(err);
          });

          f.once('end', function() {
            console.log('Done fetching all messages!');
            clearTimeout(timeout);
            imap.end();
            resolve(emails);
          });
        });
      });
    });

    imap.once('error', function(err: any) {
      console.error('IMAP connection error:', err);
      clearTimeout(timeout);
      reject(new Error(`IMAP connection failed: ${err.message}`));
    });

    imap.once('end', function() {
      console.log('IMAP connection ended');
      clearTimeout(timeout);
    });

    imap.connect();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware and /api/auth routes are applied early in server/index.ts
  // to ensure auth works before lazy loading other routes. Avoid duplicating here.

  // Make sure the gallery delivery/protection columns exist before any gallery
  // route (Drizzle SELECT *) runs.
  await ensureGalleryDeliveryColumns().catch((e) => console.error('[galleries] ensure columns failed:', e?.message || e));

  // Digital files API - Using filesRouter (routes/files.ts) - file-routes.ts has schema mismatches
  console.log('🔧 Registering /api/files router...');
  app.use('/api/files', filesRouter);
  console.log('✅ /api/files router registered');

  // Questionnaire module (public + admin APIs)
  app.use(questionnairesRouter);

  // Ensure a default "pre-shoot" questionnaire exists so automation links
  // (/q/pre-shoot — the default slug in the Pre-Shoot Questionnaire automation)
  // actually resolve. Without a matching active row the /q/:slug handler falls
  // through to the SPA token lookup and shows "Questionnaire not found or expired".
  (async () => {
    try {
      await runSql(`CREATE TABLE IF NOT EXISTS questionnaires (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text UNIQUE,
        title text NOT NULL,
        description text,
        fields jsonb NOT NULL DEFAULT '[]'::jsonb,
        is_active boolean DEFAULT true,
        notify_email text,
        created_at timestamptz DEFAULT now()
      )`);
      const preShootFields = JSON.stringify([
        { key: 'sessionType', label: 'Art des Shootings', type: 'select', required: true, options: ['Familie', 'Schwangerschaft', 'Neugeborenes', 'Business', 'Sonstiges'] },
        { key: 'people', label: 'Wie viele Personen nehmen teil?', type: 'text', required: true },
        { key: 'children', label: 'Alter der Kinder (falls zutreffend)', type: 'text', required: false },
        { key: 'preferredTime', label: 'Bevorzugte Uhrzeit', type: 'text', required: false },
        { key: 'styleColors', label: 'Kleidungsstil / Wunschfarben', type: 'text', required: false },
        { key: 'notes', label: 'Besondere Wünsche oder Anmerkungen', type: 'textarea', required: false },
      ]);
      await runSql(
        `INSERT INTO questionnaires (slug, title, description, fields, is_active, notify_email)
         VALUES ('pre-shoot', $1, $2, $3::jsonb, true, $4)
         ON CONFLICT (slug) DO UPDATE SET is_active = true`,
        [
          'Vorbereitung auf Ihr Fotoshooting',
          'Damit wir Ihr Shooting optimal vorbereiten können, füllen Sie bitte diesen kurzen Fragebogen aus.',
          preShootFields,
          process.env.NOTIFY_EMAIL || process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || null,
        ],
      );
      console.log('✅ Default pre-shoot questionnaire ensured (/q/pre-shoot)');
    } catch (e: any) {
      console.warn('⚠️ ensure pre-shoot questionnaire failed:', e?.message || e);
    }
  })();

  // Scheduler module - Client self-booking system
  const schedulerRouter = require('./routes/scheduler').default;
  app.use('/api/schedulers', schedulerRouter);
  console.log('✅ /api/schedulers router registered');

  // Onboarding + Website Analyzer (dev parity with production full-server.js)
  app.use('/api/onboarding', onboardingRoutes);

  // Price Wizard - AI-powered competitive pricing research
  app.use('/api/price-wizard', priceWizardRoutes);

  // Workflow Wizard - Automated email sequences and workflow management
  app.use('/api/workflow-wizard', workflowWizardRoutes);

  // Setup Wizard - SmartTog Hub onboarding integration
  //
  // Security: the creative setup steps write to studio_configs (business name,
  // branding, logo, content). On a FINISHED instance an anonymous POST here could
  // overwrite a live studio's branding, so mutations are gated once setup is done.
  // The gate keys on `creative_setup_complete` — NOT "an admin exists" — because the
  // content steps (integrations/scan/fix/drafts) run AFTER the admin is created but
  // BEFORE setup completes; gating on admin-exists would lock first-run onboarding
  // out. Exempt: reads (the wizard polls them) and POST /complete (it flips the flag).
  app.use('/api/setup', async (req: any, res: any, next: any) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    if (process.env.DEMO_MODE === 'true') return next();
    if (req.method === 'POST' && req.path === '/complete') return next();
    try {
      const rows = await runSql(`SELECT creative_setup_complete AS done FROM studio_configs LIMIT 1`);
      const done = (rows?.[0] as any)?.done === true;
      if (!done) return next(); // onboarding still in progress — allow every step
    } catch {
      return next(); // fresh / empty DB — allow onboarding
    }
    return authenticateUser(req, res, next);
  }, setupRoutes);
  console.log('✅ /api/setup routes registered (mutations gated once setup completes)');

  // Technical Setup Wizard - Stage 1 onboarding (infrastructure & credentials)
  //
  // Security: every mutating endpoint here writes credentials/config or connects
  // to arbitrary user-supplied hosts (the /test/* SMTP+Stripe probes are an SSRF
  // / open-relay oracle; the save steps overwrite integration secrets and the
  // admin account). All of them are gated with a single rule:
  //   • Fresh install (no admin account yet) → OPEN, so first-run onboarding can
  //     run end-to-end (steps 1–6, the SMTP test, and Step 7 which creates the
  //     admin) without a login that doesn't exist yet.
  //   • Configured system (an admin exists) → require authentication.
  // Exempt: the read-only status endpoints (wizard UI reads them), and POST
  // /complete (fires immediately after Step 7 creates the admin, before any
  // session is established — gating it would lock first-run onboarding out).
  app.use('/api/setup/technical', async (req: any, res: any, next: any) => {
    if (req.method === 'GET' && (req.path === '/status' || req.path === '/current')) return next();
    if (req.method === 'POST' && req.path === '/complete') return next();
    // Demo instances (DEMO_MODE=true) walk the whole wizard without a login, so the
    // hosted demo/dev URL can be driven end-to-end for testing and screen-sharing.
    // Real customer instances leave DEMO_MODE unset, so an existing admin still gates.
    if (process.env.DEMO_MODE === 'true') return next();
    try {
      const rows = await runSql(`SELECT COUNT(*)::int AS n FROM admin_users`);
      const hasAdmins = (rows?.[0]?.n || 0) > 0;
      if (!hasAdmins) return next(); // fresh install — allow onboarding
    } catch {
      return next(); // table missing / fresh DB — allow onboarding
    }
    return authenticateUser(req, res, next);
  }, technicalSetupRoutes);
  console.log('✅ /api/setup/technical routes registered (mutations gated once an admin exists)');

  // Multi-language UI translations (en/de built-in; fr/es AI-generated + cached).
  // Dynamic import keeps this mount independent of the top-of-file import block.
  try {
    const i18nRoutes = (await import('./routes/i18n')).default;
    app.use('/api', i18nRoutes);
    console.log('✅ /api/i18n routes registered');
  } catch (e: any) {
    console.warn('⚠️ /api/i18n routes failed to register:', e?.message || e);
  }

  // Health check endpoint for deployment
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Instance licence status — non-sensitive, for the admin UI banner. Never
  // returns the key itself, only the state/plan/expiry.
  app.get("/api/license/status", async (_req: Request, res: Response) => {
    try {
      const { getLicenseStatus } = await import('./lib/license');
      const s = getLicenseStatus();
      res.json({
        state: s.state,
        enforced: s.enforced,
        plan: s.plan,
        studioId: s.studioId,
        expiresAt: s.expiresAt,
        message: s.message,
        mutationsAllowed: s.state === 'active' || s.state === 'grace' || !s.enforced,
      });
    } catch (e: any) {
      res.status(500).json({ error: 'license_status_failed' });
    }
  });

  // Storage health endpoint (Backblaze/S3)
  app.get("/api/storage/health", async (_req: Request, res: Response) => {
    try {
      const summary = await storageHealth();
      res.json(summary);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'health_failed' });
    }
  });
  // Checkout and payment routes
  app.post("/api/checkout/create-session", async (req: Request, res: Response) => {
    try {
      const { createCheckoutSession } = await import("./controllers/checkoutController");
      await createCheckoutSession(req, res);
    } catch (error) {
      console.error('Checkout controller not available:', error);
      res.status(500).json({ error: 'Checkout service unavailable' });
    }
  });

  app.get("/api/checkout/success", async (req: Request, res: Response) => {
    try {
      const { handleCheckoutSuccess } = await import("./controllers/checkoutController");
      await handleCheckoutSuccess(req, res);
    } catch (error) {
      console.error('Checkout success handler not available:', error);
      res.status(500).json({ error: 'Checkout success service unavailable' });
    }
  });

  // Provide a stable link for the thank-you page to download the voucher PDF
  app.get("/api/vouchers/signed-link", async (req: Request, res: Response) => {
    try {
      const sessionId = String(req.query.session_id || '').trim();
      if (!sessionId) return res.status(400).json({ success: false, error: 'session_id required' });
      const base = `${(req.headers['x-forwarded-proto'] as string) || req.protocol}://${req.get('host')}`.replace(/\/+$/, '');

      // Best-effort: include the real charged amount so the thank-you page can
      // fire an accurate Purchase conversion event. Never fail the download link
      // if Stripe lookup is unavailable.
      let amount: number | undefined;
      let currency: string | undefined;
      try {
        if (stripe && sessionId.startsWith('cs_')) {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (typeof session.amount_total === 'number') amount = session.amount_total / 100;
          if (session.currency) currency = session.currency.toUpperCase();
        }
      } catch (amtErr) {
        console.warn('[signed-link] amount lookup failed:', amtErr instanceof Error ? amtErr.message : amtErr);
      }

      return res.json({
        success: true,
        url: `${base}/voucher/pdf?session_id=${encodeURIComponent(sessionId)}`,
        amount,
        currency,
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message || 'Failed to create download link' });
    }
  });

  app.post("/api/vouchers/validate", async (req: Request, res: Response) => {
    try {
      const { validateVoucherCode } = await import("./controllers/checkoutController");
      await validateVoucherCode(req, res);
    } catch (error) {
      console.error('Voucher validation not available:', error);
      res.status(500).json({ error: 'Voucher validation service unavailable' });
    }
  });

  // Demo checkout success page route
  app.get("/checkout/mock-success", (req: Request, res: Response) => {
    const { session_id } = req.query;
    console.log('Demo checkout success accessed with session:', session_id);
    
    // Redirect to the frontend success page
    res.redirect(`/demo-success?session_id=${session_id}`);
  });

  // Stripe connection test routes
  app.get("/api/stripe/test", async (req: Request, res: Response) => {
    try {
      const { testStripeConnection } = await import("./controllers/stripeTestController");
      await testStripeConnection(req, res);
    } catch (error) {
      console.error('Stripe test not available:', error);
      res.status(500).json({ error: 'Stripe test service unavailable' });
    }
  });

  app.get("/api/stripe/config", async (req: Request, res: Response) => {
    try {
      const { getStripePublishableKey } = await import("./controllers/stripeTestController");
      await getStripePublishableKey(req, res);
    } catch (error) {
      console.error('Stripe config not available:', error);
      res.status(500).json({ error: 'Stripe config service unavailable' });
    }
  });

  // Calendar routes (Studio Appointments)
  
  // Fetch Google Calendar events via OAuth API (using calendarSyncSettings tokens)
  app.get("/api/calendar/google-events", async (req: Request, res: Response) => {
    try {
      // Use OAuth-based Google Calendar API instead of hardcoded ICS feed
      const { google } = await import('googleapis');
      const configs = await runSql(
        `SELECT id, access_token, refresh_token, calendar_id FROM calendar_sync_settings WHERE sync_enabled = true LIMIT 1`
      );
      
      if (!configs || configs.length === 0) {
        return res.status(200).json({ success: true, events: [], message: 'No Google Calendar sync configured' });
      }
      
      const syncConfig = configs[0];
      if (!syncConfig.access_token || !syncConfig.refresh_token) {
        return res.status(200).json({ success: true, events: [], message: 'Google Calendar OAuth tokens missing' });
      }

      const redirectUri = `${process.env.APP_URL || process.env.BASE_URL || 'http://localhost:3001'}/api/auth/google/callback`;
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      oauth2Client.setCredentials({
        access_token: syncConfig.access_token,
        refresh_token: syncConfig.refresh_token,
      });

      // Handle token refresh - persist new tokens to DB
      oauth2Client.on('tokens', async (tokens: any) => {
        try {
          const sets: string[] = [];
          const vals: any[] = [];
          let idx = 1;
          if (tokens.access_token) { sets.push(`access_token = $${idx++}`); vals.push(tokens.access_token); }
          if (tokens.refresh_token) { sets.push(`refresh_token = $${idx++}`); vals.push(tokens.refresh_token); }
          if (sets.length > 0) {
            sets.push('updated_at = NOW()');
            vals.push(syncConfig.id);
            await runSql(`UPDATE calendar_sync_settings SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
            console.log('[routes/google-events] Refreshed OAuth tokens saved');
          }
        } catch (err) {
          console.warn('[routes/google-events] Failed to save refreshed tokens:', err);
        }
      });

      // Force a token refresh if the access token might be stale
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
      } catch (refreshErr: any) {
        console.warn('[routes/google-events] Token refresh failed, trying with existing token:', refreshErr?.message);
      }
      
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      // Fetch events from 6 months ago to 6 months ahead
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const sixMonthsAhead = new Date();
      sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);
      
      const response = await calendar.events.list({
        calendarId: syncConfig.calendar_id || 'primary',
        timeMin: sixMonthsAgo.toISOString(),
        timeMax: sixMonthsAhead.toISOString(),
        maxResults: 2500,
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      const events = (response.data.items || []).map((event: any) => ({
        id: event.id,
        title: event.summary || 'Untitled',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        description: event.description || '',
        location: event.location || '',
      }));
      
      res.json({ success: true, events });
    } catch (error: any) {
      console.error('Google Calendar fetch error:', error?.message || error);
      // Graceful fallback - return empty events instead of error
      res.status(200).json({ success: true, events: [], message: 'Failed to fetch Google Calendar events' });
    }
  });
  
  app.post("/api/calendar/appointments", async (req: Request, res: Response) => {
    try {
      const { createAppointment } = await import("./controllers/calendarController");
      await createAppointment(req, res);
    } catch (error) {
      console.error('Create appointment not available:', error);
      res.status(500).json({ error: 'Calendar service unavailable' });
    }
  });

  app.get("/api/calendar/appointments", async (req: Request, res: Response) => {
    try {
      const { getAppointments } = await import("./controllers/calendarController");
      await getAppointments(req, res);
    } catch (error) {
      console.error('Get appointments not available:', error);
      res.status(500).json({ error: 'Calendar service unavailable' });
    }
  });

  app.put("/api/calendar/appointments/:appointmentId", async (req: Request, res: Response) => {
    try {
      const { updateAppointment } = await import("./controllers/calendarController");
      await updateAppointment(req, res);
    } catch (error) {
      console.error('Update appointment not available:', error);
      res.status(500).json({ error: 'Calendar service unavailable' });
    }
  });

  app.delete("/api/calendar/appointments/:appointmentId", async (req: Request, res: Response) => {
    try {
      const { deleteAppointment } = await import("./controllers/calendarController");
      await deleteAppointment(req, res);
    } catch (error) {
      console.error('Delete appointment not available:', error);
      res.status(500).json({ error: 'Calendar service unavailable' });
    }
  });

  app.get("/api/calendar/appointments/client/:clientId", async (req: Request, res: Response) => {
    try {
      const { getClientAppointments } = await import("./controllers/calendarController");
      await getClientAppointments(req, res);
    } catch (error) {
      console.error('Get client appointments not available:', error);
      res.status(500).json({ error: 'Calendar service unavailable' });
    }
  });

  app.get("/api/calendar/available-slots", async (req: Request, res: Response) => {
    try {
      const { getAvailableSlots } = await import("./controllers/calendarController");
      await getAvailableSlots(req, res);
    } catch (error) {
      console.error('Get available slots not available:', error);
      res.status(500).json({ error: 'Calendar service unavailable' });
    }
  });

  // Communication routes (Email & SMS)
  app.post("/api/communications/email/send", async (req: Request, res: Response) => {
    try {
      const { sendEmail } = await import("./controllers/communicationController");
      await sendEmail(req, res);
    } catch (error) {
      console.error('Send email not available:', error);
      res.status(500).json({ error: 'Email service unavailable' });
    }
  });

  app.post("/api/communications/sms/send", async (req: Request, res: Response) => {
    try {
      const { sendSMS } = await import("./controllers/communicationController");
      await sendSMS(req, res);
    } catch (error) {
      console.error('Send SMS not available:', error);
      res.status(500).json({ error: 'SMS service unavailable' });
    }
  });

  app.post("/api/communications/sms/bulk", async (req: Request, res: Response) => {
    try {
      const { sendBulkSMS } = await import("./controllers/communicationController");
      await sendBulkSMS(req, res);
    } catch (error) {
      console.error('Bulk SMS not available:', error);
      res.status(500).json({ error: 'Bulk SMS service unavailable' });
    }
  });

  app.get("/api/communications/client/:clientId", async (req: Request, res: Response) => {
    try {
      const { getClientCommunications } = await import("./controllers/communicationController");
      await getClientCommunications(req, res);
    } catch (error) {
      console.error('Get client communications not available:', error);
      res.status(500).json({ error: 'Communications service unavailable' });
    }
  });

  app.get("/api/communications/all", async (req: Request, res: Response) => {
    try {
      const { getAllCommunications } = await import("./controllers/communicationController");
      await getAllCommunications(req, res);
    } catch (error) {
      console.error('Get all communications not available:', error);
      res.status(500).json({ error: 'Communications service unavailable' });
    }
  });

  app.get("/api/communications/sms/config", async (req: Request, res: Response) => {
    try {
      const { getSMSConfig } = await import("./controllers/communicationController");
      await getSMSConfig(req, res);
    } catch (error) {
      console.error('Get SMS config not available:', error);
      res.status(500).json({ error: 'SMS config service unavailable' });
    }
  });

  app.post("/api/communications/sms/config", async (req: Request, res: Response) => {
    try {
      const { updateSMSConfig } = await import("./controllers/communicationController");
      await updateSMSConfig(req, res);
    } catch (error) {
      console.error('Update SMS config not available:', error);
      res.status(500).json({ error: 'SMS config service unavailable' });
    }
  });

  app.post("/api/communications/bulk/preview", async (req: Request, res: Response) => {
    try {
      const { getBulkTargetPreview } = await import("./controllers/communicationController");
      await getBulkTargetPreview(req, res);
    } catch (error) {
      console.error('Get bulk target preview not available:', error);
      res.status(500).json({ error: 'Bulk preview service unavailable' });
    }
  });

  app.patch("/api/communications/:messageId/read", async (req: Request, res: Response) => {
    try {
      const { markMessageAsRead } = await import("./controllers/communicationController");
      await markMessageAsRead(req, res);
    } catch (error) {
      console.error('Mark message as read not available:', error);
      res.status(500).json({ error: 'Message service unavailable' });
    }
  });

  app.post("/api/communications/email/test", async (req: Request, res: Response) => {
    try {
      const { testEmailConfig } = await import("./controllers/communicationController");
      await testEmailConfig(req, res);
    } catch (error) {
      console.error('Test email config not available:', error);
      res.status(500).json({ error: 'Email test service unavailable' });
    }
  });

  // Import and register CRM agent router (legacy V1) only when explicitly enabled
  if (process.env.ENABLE_CRM_AGENT_V1 === 'true') {
    try {
      const { crmAgentRouter } = await import("./routes/crm-agent");
      app.use(crmAgentRouter);
      console.log("✅ CRM agent router enabled (ENABLE_CRM_AGENT_V1=true)");
    } catch (error: any) {
      console.warn("⚠️ CRM agent router not available:", error?.message || error);
    }
  } else {
    console.log('ℹ️ Skipping CRM agent router (ENABLE_CRM_AGENT_V1!=true)');
  }


  // Audio transcription endpoint using OpenAI Whisper
  app.post("/api/transcribe", authenticateUser, audioUpload.single('audio'), async (req: Request, res: Response) => {
    try {
      const audioFile = req.file;
      
      if (!audioFile) {
        return res.status(400).json({ success: false, error: 'No audio file provided' });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ success: false, error: 'OpenAI API key not configured' });
      }

      console.log('Transcribing audio file:', audioFile.originalname, 'Size:', audioFile.size, 'bytes');

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });

      // Create a temporary file for OpenAI Whisper API
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `audio_${Date.now()}_${audioFile.originalname}`);
      
      // Write buffer to temporary file
      fs.writeFileSync(tempFilePath, audioFile.buffer);
      
      // Create a ReadStream for OpenAI
      const fileStream = fs.createReadStream(tempFilePath);
      
      // Transcribe using Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        language: "de", // German language for Austrian photography business
        response_format: "text"
      });

      // Clean up temporary file
      fs.unlinkSync(tempFilePath);

      const transcribedText = transcription.trim();
      console.log('Transcription successful:', transcribedText.substring(0, 100) + '...');

      res.json({ 
        success: true, 
        text: transcribedText,
        metadata: {
          duration: audioFile.size,
          model: 'whisper-1',
          language: 'de'
        }
      });

    } catch (error) {
      console.error('Transcription error:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Transcription failed' 
      });
    }
  });

  // CRM Agent routes with Phase B write capabilities
  app.get('/api/crm/agent/status', async (req, res) => {
    try {
      // Probe whether the agent subsystem can actually load. Several of its tool
      // modules are not present in this repo, so the dynamic import can fail at
      // runtime — report the real state instead of always claiming "operational".
      let available = false;
      try {
        await import('../agent/run-agent');
        available = true;
      } catch (loadErr: any) {
        console.warn('CRM Agent unavailable:', loadErr?.message || loadErr);
      }

      if (!available) {
        return res.json({
          status: 'unavailable',
          message: 'The AI assistant is temporarily unavailable. Chat requests will return a fallback response until it is restored.',
          capabilities: { read: [], write: [], mode: 'unavailable' },
          phase: 'B - Write Enabled',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        status: 'operational',
        capabilities: {
          read: ['list_clients', 'list_leads', 'list_invoices', 'list_messages'],
          write: ['create_lead', 'update_client', 'create_invoice'],
          mode: 'auto_safe'
        },
        phase: 'B - Write Enabled',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('CRM Agent Status Error:', error);
      res.status(500).json({ error: 'Failed to get agent status' });
    }
  });

  app.post('/api/crm/agent/chat', async (req, res) => {
    try {
      const { message, threadId } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Use the actual Phase B agent system
      const studioId = (process.env.STUDIO_ID || '550e8400-e29b-41d4-a716-446655440000'); // Valid UUID
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      
      // Import runAgent dynamically to avoid module loading issues
      const { runAgent } = await import('../agent/run-agent');
      
      // Run the AI agent with Phase B write capabilities
      const response = await runAgent(studioId, userId, message);
      
      res.json({
        response: response,
        threadId: threadId || null,
        capabilities: {
          writeEnabled: true,
          mode: 'auto_safe',
          authorities: ['CREATE_LEAD', 'UPDATE_CLIENT', 'SEND_INVOICE'],
          approvalThreshold: 500
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('CRM Agent Chat Error:', error);
      
      // Fallback to German response if agent fails
      const fallbackResponse = `Entschuldigung, das CRM-System ist momentan nicht verfügbar. Ich bin Ihr CRM-Operations-Assistent und kann Ihnen normalerweise bei folgenden Aufgaben helfen:

📧 **E-Mail-Verwaltung**: Antworten auf Kunden-E-Mails, Buchungsbestätigungen senden
📅 **Terminverwaltung**: Termine erstellen, ändern, stornieren
👥 **Kundenverwaltung**: Kundendaten hinzufügen, aktualisieren, suchen
💰 **Rechnungsverwaltung**: Rechnungen erstellen, senden, verfolgen
📊 **Geschäftsanalyse**: Berichte erstellen, Daten analysieren

Bitte versuchen Sie es später noch einmal.`;
      
      res.json({
        response: fallbackResponse,
        threadId: null,
        capabilities: {
          writeEnabled: false,
          mode: 'fallback',
          authorities: [],
          approvalThreshold: 500
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // ==================== AGENT DATA INTELLIGENCE ENDPOINTS ====================
  // Sales analytics for last 6 months (for agent intelligence)
  app.get("/api/agent/sales-last6", authenticateUser, async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const periods: Array<{ month: string; total: number }> = [];
      
      for (let i = 5; i >= 0; i--) {
        const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
        const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
        const rows = await runSql(
          `SELECT COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0)::double precision AS total
           FROM crm_invoices
           WHERE created_at >= $1 AND created_at < $2`,
          [start.toISOString(), end.toISOString()]
        );
        periods.push({
          month: `${start.getUTCFullYear()}-${String(start.getUTCMonth()+1).padStart(2,'0')}`,
          total: Number(rows[0]?.total || 0)
        });
      }
      
      const overall = periods.reduce((s, p) => s + p.total, 0);
      res.json({ success: true, periods, overall });
    } catch (e: any) {
      console.error('Error fetching sales last 6 months:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Upcoming photography sessions (for agent intelligence)
  app.get("/api/agent/upcoming-sessions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 10)));
      const rows = await runSql(
        `SELECT id, title, start_time, end_time, client_id
         FROM photography_sessions
         WHERE start_time > NOW()
         ORDER BY start_time ASC
         LIMIT $1`,
        [limit]
      );
      res.json({ success: true, count: rows.length, sessions: rows });
    } catch (e: any) {
      console.error('Error fetching upcoming sessions:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Annual sales total (for agent intelligence)
  app.get("/api/agent/sales-year", authenticateUser, async (req: Request, res: Response) => {
    try {
      const year = parseInt(String(req.query.year || new Date().getFullYear()), 10);
      const rows = await runSql(
        `SELECT COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0)::double precision AS total
         FROM crm_invoices
         WHERE EXTRACT(YEAR FROM created_at) = $1`,
        [year]
      );
      res.json({ success: true, year, total: Number(rows[0]?.total || 0) });
    } catch (e: any) {
      console.error('Error fetching sales for year:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Extended diagnostics with tool availability (for agent intelligence verification)
  app.get("/api/agent/diagnostics-extended", authenticateUser, async (_req: Request, res: Response) => {
    try {
      const [invRows, sessRows] = await Promise.all([
        runSql(`SELECT COUNT(*)::int AS c, MIN(created_at) AS first, MAX(created_at) AS last FROM crm_invoices`),
        runSql(`SELECT COUNT(*)::int AS c, MIN(start_time) AS first, MAX(start_time) AS last FROM photography_sessions`)
      ]);
      
      res.json({
        success: true,
        invoices: invRows[0],
        sessions: sessRows[0],
        tools: {
          salesYear: true,
          salesLast6: true,
          upcomingSessions: true
        },
        dbUrlSet: !!process.env.DATABASE_URL,
        openaiKeySet: !!process.env.OPENAI_API_KEY
      });
    } catch (e: any) {
      console.error('Error fetching extended diagnostics:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });
  
  // ==================== USER ROUTES ====================
  app.get("/api/users/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== BLOG ROUTES ====================
  app.get("/api/blog/posts", async (req: Request, res: Response) => {
    try {
      let published = req.query.published === 'true' ? true : req.query.published === 'false' ? false : undefined;
      // Security: only authenticated admins may see non-published posts (DRAFT,
      // IDEA, ARCHIVED, future SCHEDULED). Anonymous callers are forced to
      // published-only regardless of query, so unpublished content never leaks.
      const adminToken = process.env.ADMIN_TOKEN || '';
      const isAdmin = !!(req as any).session?.userId
        || (!!adminToken && req.headers['x-admin-token'] === adminToken);
      if (!isAdmin) published = true;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const tag = req.query.tag as string;
      const exclude = req.query.exclude as string;
      const language = req.query.language as string || 'de';
      
      let posts = await storage.getBlogPosts(published);
      
      // Translate list content on the fly for a non-German language. The cards
      // render title + excerpt, so those are what we translate here (the full
      // body is translated on the single-post endpoint). Cached per string;
      // falls back to the original German if AI translation is unavailable.
      if (language && language !== 'de') {
        const { translateText } = await import('./lib/translate.js');
        posts = await Promise.all(posts.map(async (post) => ({
          ...post,
          title: await translateText(post.title, language),
          excerpt: post.excerpt ? await translateText(post.excerpt, language) : post.excerpt,
          tags: post.tags ? post.tags.map((tag) => translateTagToEnglish(tag)) : post.tags,
        })));
      }
      
      // Filter by search
      if (search) {
        posts = posts.filter(post => 
          post.title.toLowerCase().includes(search.toLowerCase()) ||
          (post.excerpt && post.excerpt.toLowerCase().includes(search.toLowerCase())) ||
          (post.content && post.content.toLowerCase().includes(search.toLowerCase()))
        );
      }
      
      // Filter by tag. Case studies are authored in German with the "fallstudie"
      // tag but surfaced on the /case-studies page (which queries "case-study"),
      // so treat those as synonyms — a post tagged with EITHER appears. Match is
      // case-insensitive and tolerates the space/hyphen spelling ("case study").
      if (tag && tag !== 'all') {
        const wanted = tag.toLowerCase();
        const caseStudyAliases = ['case-study', 'case study', 'fallstudie'];
        const accepted = caseStudyAliases.includes(wanted) ? caseStudyAliases : [wanted];
        posts = posts.filter(post =>
          post.tags && post.tags.some((t) => accepted.includes(String(t).toLowerCase()))
        );
      }
      
      // Exclude specific post
      if (exclude) {
        posts = posts.filter(post => post.id !== exclude);
      }
      
      const totalPosts = posts.length;
      const totalPages = Math.ceil(totalPosts / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedPosts = posts.slice(startIndex, endIndex);
      
      res.json({ 
        posts: paginatedPosts,
        count: totalPosts,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      });
    } catch (error) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public: live Google rating + latest reviews (Places API New). Falls back to
  // {configured:false} when GOOGLE_PLACES_API_KEY is unset so the site keeps
  // rendering its curated reviews.
  // Public analytics config: the GA4 + Meta Pixel IDs a studio enters in the
  // setup wizard (studio_configs), falling back to host env vars. This is what
  // lets the wizard actually switch tracking on — the client reads it in
  // ConsentScripts and loads GA4/Meta after consent. Only public measurement
  // IDs are exposed here (never secrets).
  app.get("/api/site/analytics", async (_req: Request, res: Response) => {
    try {
      const { config } = await import('./config-reader');
      const ga4Id = (await config.get('ga4_measurement_id')) || '';
      const metaPixelId = (await config.get('meta_pixel_id')) || '';
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.json({ ga4Id, metaPixelId });
    } catch (e: any) {
      console.warn('[site/analytics] error:', e?.message || e);
      res.json({ ga4Id: '', metaPixelId: '' });
    }
  });

  app.get("/api/reviews/google", async (req: Request, res: Response) => {
    try {
      const { isGoogleReviewsConfigured, getGoogleReviews } = await import('./services/googleReviews.js');
      if (!(await isGoogleReviewsConfigured())) {
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.json({ configured: false });
      }
      const force = req.query.force === '1';
      const data = await getGoogleReviews(force);
      if (!data) {
        res.setHeader('Cache-Control', 'public, max-age=120');
        return res.json({ configured: true, available: false });
      }
      res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
      res.json({ configured: true, available: true, ...data });
    } catch (e: any) {
      console.error('[reviews/google] error:', e?.message || e);
      res.status(200).json({ configured: false, error: 'lookup failed' });
    }
  });

  app.get("/api/blog/posts/:identifier", async (req: Request, res: Response) => {
    try {
      const identifier = req.params.identifier;
      let post;
      
      // Check if identifier is a UUID (for ID lookup) or a slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
      
      if (isUUID) {
        // Fetch by ID
        const posts = await storage.getBlogPosts();
        post = posts.find(p => p.id === identifier);
      } else {
        // Fetch by slug
        post = await storage.getBlogPostBySlug(identifier);
      }
      
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Translate the full post on the fly for a non-German language. Includes
      // the rendered body (contentHtml) and SEO fields; cached per string so a
      // given post is only translated once per process.
      const language = (req.query.language as string) || 'de';
      if (language && language !== 'de') {
        const { translateFields } = await import('./lib/translate.js');
        post = await translateFields(
          post as any,
          ['title', 'excerpt', 'content', 'contentHtml', 'seoTitle', 'metaDescription'],
          language
        );
      }

      res.json(post);
    } catch (error) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // CORS-safe image proxy. B2/S3 public URLs don't send CORS headers, so the admin
  // image cropper can't re-fetch an already-uploaded image to re-crop it ("Free
  // transform"). This streams the image back same-origin. Locked to the storage
  // host(s) to avoid SSRF.
  app.get("/api/proxy-image", async (req: Request, res: Response) => {
    try {
      const url = String(req.query.url || '').trim();
      if (!url) return res.status(400).send('Missing url');
      let host = '';
      try { host = new URL(url).hostname.toLowerCase(); } catch { return res.status(400).send('Invalid url'); }
      let endpointHost = '';
      try { const { endpoint } = getS3Config(); if (endpoint) endpointHost = new URL(endpoint).hostname.toLowerCase(); } catch {}
      const allowed = host.endsWith('.backblazeb2.com')
        || host.endsWith('.amazonaws.com')
        || (!!endpointHost && (host === endpointHost || host.endsWith('.' + endpointHost)));
      if (!allowed) return res.status(403).send('Host not allowed');
      const upstream = await fetch(url);
      if (!upstream.ok) return res.status(upstream.status).send('Upstream error');
      const ct = upstream.headers.get('content-type') || 'image/jpeg';
      let buf = Buffer.from(await upstream.arrayBuffer());
      let outCt = ct;
      // Optional on-the-fly downscale (?w=NNN): serves lightweight gallery grid
      // thumbnails from the full-res original without a schema migration/backfill.
      // Cuts egress by ~10-30x for the many small grid images. Full-res views keep
      // hitting the CDN directly. Best-effort: fall back to the original on error.
      const w = Math.min(Math.max(parseInt(String(req.query.w || ''), 10) || 0, 0), 2000);
      if (w > 0 && ct.startsWith('image/') && !ct.includes('svg')) {
        try {
          buf = await sharp(buf)
            .rotate()
            .resize({ width: w, withoutEnlargement: true })
            .jpeg({ quality: 78 })
            .toBuffer();
          outCt = 'image/jpeg';
        } catch (rz: any) {
          console.warn('[proxy-image] resize failed, serving original:', rz?.message || rz);
        }
      }
      res.setHeader('Content-Type', outCt);
      // Resized variants are immutable per (url,w) → allow long shared caching.
      res.setHeader('Cache-Control', w > 0 ? 'public, max-age=86400' : 'private, max-age=300');
      res.send(buf);
    } catch (e: any) {
      console.error('[proxy-image] error:', e?.message || e);
      res.status(500).send('Proxy failed');
    }
  });

  // Fire an IndexNow ping only when a post is actually live (published AND its
  // publish time has passed). Scheduled/draft posts are pinged later by the
  // blogScheduler when they go live. Fire-and-forget; never blocks the response.
  const pingIndexNowIfLive = (post: any) => {
    try {
      const isLive =
        post?.slug &&
        (post.status === 'PUBLISHED' || post.published === true) &&
        (!post.publishedAt || new Date(post.publishedAt).getTime() <= Date.now());
      if (!isLive) return;
      import('./services/indexNow.js')
        .then(({ pingBlogPost }) => pingBlogPost(post.slug))
        .catch((err) => console.warn('[IndexNow] ping error:', err instanceof Error ? err.message : err));
    } catch (err) {
      console.warn('[IndexNow] ping guard error:', err instanceof Error ? err.message : err);
    }
  };

  app.post("/api/blog/posts", authOrApiKey('blog:write'), async (req: Request, res: Response) => {
    try {
      console.log('[BLOG CREATE] Creating new post');
      const postData = { 
        ...req.body,
        // Convert publishedAt string to Date if present
        publishedAt: req.body.publishedAt ? new Date(req.body.publishedAt) : null,
        // Convert scheduledFor string to Date if present
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : null
      };
      // Remove authorId from validation data
      delete postData.authorId;
      
      // Derive status/published/publishedAt from the scheduling fields so a
      // future scheduledFor stays SCHEDULED (hidden) instead of going live now.
      syncBlogPublishState(postData);
      
      // GDPR gate: same rule as updates — no publishing/scheduling photo-derived
      // posts without consent.
      if (postData.status === 'PUBLISHED' || postData.status === 'SCHEDULED') {
        const { ideaNeedsConsent, CONSENT_REQUIRED_MESSAGE } = await import('./services/blogConsent.js');
        if (ideaNeedsConsent(postData)) {
          return res.status(409).json({ error: 'consent_required', message: CONSENT_REQUIRED_MESSAGE });
        }
      }

      console.log("[BLOG CREATE] Received blog post data:", postData);
      const validatedData = insertBlogPostSchema.parse(postData);
      console.log("[BLOG CREATE] Validated blog post data:", validatedData);
      const post = await storage.createBlogPost(validatedData);
      console.log('[BLOG CREATE] Success:', post.id);
      pingIndexNowIfLive(post);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("[BLOG CREATE] Validation error:", error.errors);
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("[BLOG CREATE] Error details:", error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      console.error("[BLOG CREATE] Error message:", errorMessage);
      res.status(500).json({ error: "Internal server error", details: errorMessage });
    }
  });

  app.put("/api/blog/posts/:id", authOrApiKey('blog:write'), async (req: Request, res: Response) => {
    try {
      console.log('[BLOG UPDATE] Updating post:', req.params.id);
      console.log('[BLOG UPDATE] Update data:', JSON.stringify(req.body, null, 2));
      
      // Convert date strings to Date objects (same as POST route)
      const updates = {
        ...req.body,
        // Convert publishedAt string to Date if present
        publishedAt: req.body.publishedAt ? new Date(req.body.publishedAt) : undefined,
        // Convert scheduledFor string to Date if present
        scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : undefined,
        // Always update the updatedAt timestamp
        updatedAt: new Date()
      };
      
      // Same rule as create: a future scheduledFor (or publishedAt) keeps the
      // post SCHEDULED + hidden until the cron publishes it.
      syncBlogPublishState(updates);
      
      // Remove undefined values
      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined) {
          delete updates[key];
        }
      });

      // GDPR gate: an idea-derived post (built from uploaded photos) cannot go
      // PUBLISHED/SCHEDULED without recorded consent.
      if (updates.status === 'PUBLISHED' || updates.status === 'SCHEDULED' || updates.published === true) {
        const existing = await storage.getBlogPost(req.params.id);
        const merged = { ...existing, ideaData: updates.ideaData ?? (existing as any)?.ideaData };
        const { ideaNeedsConsent, CONSENT_REQUIRED_MESSAGE } = await import('./services/blogConsent.js');
        if (ideaNeedsConsent(merged)) {
          return res.status(409).json({ error: 'consent_required', message: CONSENT_REQUIRED_MESSAGE });
        }
      }

      console.log('[BLOG UPDATE] Processed updates:', updates);
      const post = await storage.updateBlogPost(req.params.id, updates);
      console.log('[BLOG UPDATE] Success:', post.id);
      pingIndexNowIfLive(post);
      res.json(post);
    } catch (error) {
      console.error("[BLOG UPDATE] Error details:", error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      console.error("[BLOG UPDATE] Error message:", errorMessage);
      res.status(500).json({ error: "Internal server error", details: errorMessage });
    }
  });

  // Reschedule all FUTURE, SCHEDULED posts into a fixed weekly cadence (default: 2/week on
  // Tue & Fri at 10:00 UTC), preserving their current chronological order. Compresses posts
  // that were scheduled months apart into an even, near-term drip. Published posts and drafts
  // are left untouched. Pass { dryRun: true } to preview the plan without writing anything.
  app.post("/api/blog/posts/reschedule-cadence", authenticateUser, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      // Weekday numbers: 0=Sun .. 6=Sat. Default Tuesday (2) & Friday (5).
      const daysRaw = Array.isArray(req.body?.days) && req.body.days.length ? req.body.days : [2, 5];
      const days = (Array.from(new Set(daysRaw.map((d: any) => Number(d)))) as number[])
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        .sort((a, b) => a - b);
      const hour = Number.isFinite(Number(req.body?.hour)) ? Math.min(23, Math.max(0, Number(req.body.hour))) : 10;
      const minute = Number.isFinite(Number(req.body?.minute)) ? Math.min(59, Math.max(0, Number(req.body.minute))) : 0;
      const dryRun = req.body?.dryRun === true;
      // Publish time is a wall-clock time in this zone; default the studio's local time (Vienna).
      const timeZone = (typeof req.body?.timeZone === 'string' && req.body.timeZone) ? req.body.timeZone : 'Europe/Vienna';
      if (!days.length) return res.status(400).json({ error: 'No valid weekday(s) provided' });

      // Convert a wall-clock time in `timeZone` to the correct absolute UTC instant, honouring
      // DST (Vienna is UTC+1 in winter, UTC+2 in summer) so 10:00 always means 10:00 in Vienna.
      const zonedToUtc = (y: number, mo: number, d: number, hh: number, mm: number): Date => {
        const naiveUtc = Date.UTC(y, mo, d, hh, mm, 0);
        const asZone = new Date(new Date(naiveUtc).toLocaleString('en-US', { timeZone }));
        const asUtc = new Date(new Date(naiveUtc).toLocaleString('en-US', { timeZone: 'UTC' }));
        const offset = asZone.getTime() - asUtc.getTime();
        return new Date(naiveUtc - offset);
      };

      // Future SCHEDULED posts, kept in their existing order (compress the spacing).
      // Optionally ALSO pull back posts that were just (wrongly) published — pass
      // includePublishedWithinHours (e.g. 24) to un-publish today's batch and
      // re-space it into the future along with the scheduled ones.
      const includeHours = Number(req.body?.includePublishedWithinHours) || 0;
      const cutoff = includeHours > 0 ? new Date(now.getTime() - includeHours * 3600 * 1000) : null;
      const all = await storage.getBlogPosts();
      const futureScheduled = (all as any[])
        .filter((p) => p.status === 'SCHEDULED' && p.scheduledFor && new Date(p.scheduledFor).getTime() > now.getTime());
      const recentlyPublished = cutoff
        ? (all as any[]).filter((p) => (p.status === 'PUBLISHED' || p.published === true) && p.publishedAt && new Date(p.publishedAt).getTime() >= cutoff.getTime())
        : [];
      const keyTime = (p: any) => new Date(p.scheduledFor || p.publishedAt || p.createdAt || 0).getTime();
      const scheduled = [...recentlyPublished, ...futureScheduled]
        .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i) // dedupe by id
        .sort((a, b) => keyTime(a) - keyTime(b));

      // Generate cadence slots (UTC) starting TOMORROW — never today, so a
      // rescheduled post can't fall on a slot that the hourly cron fires within
      // hours (the root cause of "scheduled posts published today").
      const slots: Date[] = [];
      const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      let guard = 0;
      while (slots.length < scheduled.length && guard++ < 4000) {
        if (days.includes(cursor.getUTCDay())) {
          const slot = zonedToUtc(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), hour, minute);
          if (slot.getTime() > now.getTime()) slots.push(slot);
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }

      const plan = scheduled.map((p, i) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        from: p.scheduledFor,
        to: slots[i] ? slots[i].toISOString() : null,
      }));

      if (!dryRun) {
        for (let i = 0; i < scheduled.length; i++) {
          await storage.updateBlogPost(scheduled[i].id, {
            scheduledFor: slots[i],
            status: 'SCHEDULED',
            published: false,
            publishedAt: null,
            updatedAt: now,
          } as any);
        }
        console.log(`[BLOG RESCHEDULE] Re-spaced ${scheduled.length} scheduled post(s) to ${days.length}/week`);
      }

      res.json({
        success: true,
        dryRun,
        count: scheduled.length,
        cadence: { days, hour, minute, timeZone, perWeek: days.length },
        firstSlot: slots[0]?.toISOString() || null,
        lastSlot: slots[scheduled.length - 1]?.toISOString() || null,
        plan,
      });
    } catch (error) {
      console.error('[BLOG RESCHEDULE] Error:', error);
      const msg = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ error: 'Internal server error', details: msg });
    }
  });

  app.delete("/api/blog/posts/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteBlogPost(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── Idea-mode pipeline (photo-first article workflow) ─────────────────────
  const ideaImageUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

  // Upload up to 5 images to an IDEA post: store on B2 + extract EXIF per image.
  app.post("/api/blog/idea/:id/images", authenticateUser, ideaImageUpload.array('images', 5), async (req: Request, res: Response) => {
    try {
      const post = await storage.getBlogPost(req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found' });
      const files = (req.files as Express.Multer.File[]) || [];
      if (!files.length) return res.status(400).json({ error: 'No images uploaded' });

      const { extractExif } = await import('./services/blogImageAnalysis.js');
      const { uploadBufferToB2 } = await import('./services/b2Upload.js');

      const idea: any = post.ideaData || { images: [], context: {}, consent: { given: false } };
      const images: any[] = Array.isArray(idea.images) ? idea.images : [];
      if (images.length + files.length > 5) return res.status(400).json({ error: 'Max 5 images per idea' });

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const safe = f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        const key = `blog/${post.slug}/${Date.now()}-${i}-${safe}`;
        const url = await uploadBufferToB2(key, f.buffer, f.mimetype || 'image/jpeg');
        const exif = await extractExif(f.buffer);
        images.push({ url, key, exif, vision: null, altText: '', iptcWritten: false });
      }
      idea.images = images;
      await storage.updateBlogPost(post.id, { ideaData: idea });
      res.json({ success: true, images });
    } catch (e: any) {
      console.error('[idea/images] error:', e);
      res.status(500).json({ error: e?.message || 'Upload failed' });
    }
  });

  // Remove one image from an IDEA post (by index) + best-effort delete from B2.
  app.delete("/api/blog/idea/:id/images/:index", authenticateUser, async (req: Request, res: Response) => {
    try {
      const post = await storage.getBlogPost(req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found' });
      const idea: any = post.ideaData || {};
      const images: any[] = Array.isArray(idea.images) ? idea.images : [];
      const idx = parseInt(req.params.index, 10);
      if (Number.isNaN(idx) || idx < 0 || idx >= images.length) {
        return res.status(400).json({ error: 'Invalid image index' });
      }
      const [removed] = images.splice(idx, 1);
      idea.images = images;
      if (removed?.key) {
        try { const { deleteFromB2 } = await import('./services/b2Upload.js'); await deleteFromB2(removed.key); }
        catch (delErr) { console.warn('[idea/images delete] B2 delete failed:', (delErr as any)?.message); }
      }
      const patch: any = { ideaData: idea };
      if (removed?.url && post.imageUrl === removed.url) patch.imageUrl = images[0]?.url || null;
      await storage.updateBlogPost(post.id, patch);
      res.json({ success: true, images });
    } catch (e: any) {
      console.error('[idea/images delete] error:', e);
      res.status(500).json({ error: e?.message || 'Delete failed' });
    }
  });

  // Save user-supplied context + GDPR consent for an IDEA post.
  app.put("/api/blog/idea/:id/context", authenticateUser, async (req: Request, res: Response) => {
    try {
      const post = await storage.getBlogPost(req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found' });
      const idea: any = post.ideaData || { images: [], context: {}, consent: { given: false } };
      const { context, consent } = req.body || {};
      if (context && typeof context === 'object') idea.context = { ...idea.context, ...context };
      if (consent && typeof consent === 'object') idea.consent = { ...idea.consent, ...consent };
      await storage.updateBlogPost(post.id, { ideaData: idea });
      res.json({ success: true, ideaData: idea });
    } catch (e: any) {
      console.error('[idea/context] error:', e);
      res.status(500).json({ error: e?.message || 'Save failed' });
    }
  });

  // Analyse each uploaded image (Vision), then re-embed IPTC and re-upload.
  app.post("/api/blog/idea/:id/analyze", authenticateUser, async (req: Request, res: Response) => {
    try {
      const post = await storage.getBlogPost(req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found' });
      const idea: any = post.ideaData || {};
      const images: any[] = Array.isArray(idea.images) ? idea.images : [];
      if (!images.length) return res.status(400).json({ error: 'No images to analyze' });

      const { analyzeVision, writeIptc, deriveAltText } = await import('./services/blogImageAnalysis.js');
      const { uploadBufferToB2, fetchImageBuffer } = await import('./services/b2Upload.js');
      const ctx = idea.context || {};
      const hint = post.seoTitle || post.title;

      for (const img of images) {
        if (!img.url) continue;
        const vision = await analyzeVision(img.url, hint);
        img.vision = vision;
        img.altText = deriveAltText(vision, ctx);
        try {
          const buf = await fetchImageBuffer(img.url);
          const keywords = Array.from(new Set([...(post.tags || []), ...vision.sceneKeywords])).slice(0, 12);
          const out = await writeIptc(buf, {
            caption: img.altText || vision.description,
            keywords,
            location: ctx.location,
            aiGenerated: true,
          });
          if (img.key) img.url = await uploadBufferToB2(img.key, out, 'image/jpeg');
          img.iptcWritten = true;
        } catch (iptcErr) {
          console.warn('[idea/analyze] IPTC step failed:', (iptcErr as any)?.message);
        }
      }
      idea.images = images;
      const cover = images[0]?.url;
      await storage.updateBlogPost(post.id, { ideaData: idea, ...(cover ? { imageUrl: cover } : {}) });
      res.json({ success: true, images });
    } catch (e: any) {
      console.error('[idea/analyze] error:', e);
      res.status(500).json({ error: e?.message || 'Analyze failed' });
    }
  });

  // Generate the article body from the context pack (IDEA -> DRAFT).
  app.post("/api/blog/idea/:id/generate", authenticateUser, async (req: Request, res: Response) => {
    try {
      const post = await storage.getBlogPost(req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found' });
      const idea: any = post.ideaData || { images: [], context: {} };
      const { generateArticle, injectImages } = await import('./services/blogIdeaWriter.js');
      const ideaImages = (idea.images || []).map((im: any) => ({ url: im.url, vision: im.vision, exif: im.exif, altText: im.altText }));
      const out = await generateArticle({
        title: post.title,
        primaryKeyword: (post.tags || [])[0],
        pillar: req.body?.pillar,
        tags: post.tags || [],
        images: ideaImages,
        context: idea.context || {},
      });
      // Insert the shoot's photos (with descriptive alt) into the article body.
      const htmlWithImages = injectImages(out.html, ideaImages);
      const { buildPreparedSocialPack } = await import('./services/socialSnippets.js');
      const socialPack = await buildPreparedSocialPack({
        title: post.title,
        excerpt: out.excerpt || post.excerpt || undefined,
        body: htmlWithImages,
        url: `${process.env.PUBLIC_SITE_URL || 'https://www.newagefotografie.com'}/blog/${post.slug}`,
        pillar: req.body?.pillar,
      });
      const ideaWithSocial = {
        ...idea,
        socialPack,
      };
      const updated = await storage.updateBlogPost(post.id, {
        content: htmlWithImages,
        contentHtml: htmlWithImages,
        excerpt: out.excerpt || post.excerpt,
        seoTitle: out.seoTitle || post.seoTitle,
        metaDescription: out.metaDescription || post.metaDescription,
        status: 'DRAFT',
        ideaData: ideaWithSocial,
      });
      res.json({ success: true, post: { id: updated.id, status: updated.status }, generated: out });
    } catch (e: any) {
      console.error('[idea/generate] error:', e);
      res.status(500).json({ error: e?.message || 'Generate failed' });
    }
  });

  // Admin trigger: build a post's social pack and send it to Zernio. Returns the
  // built row even if the Zernio endpoint isn't configured yet (so you can preview).
  app.get("/api/blog/posts/:id/social-pack", authenticateUser, async (req: Request, res: Response) => {
    try {
      const post = await storage.getBlogPost(req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found' });
      if (!post.contentHtml && !post.content) return res.status(400).json({ error: 'Post needs generated content before creating a social pack.' });

      const existingIdeaData: any = post.ideaData || {};
      if (existingIdeaData.socialPack) {
        return res.json({ success: true, socialPack: existingIdeaData.socialPack, generated: false });
      }

      const { buildPreparedSocialPack } = await import('./services/socialSnippets.js');
      const socialPack = await buildPreparedSocialPack({
        title: post.title,
        excerpt: post.excerpt || undefined,
        body: post.contentHtml || post.content || undefined,
        url: `${process.env.PUBLIC_SITE_URL || 'https://www.newagefotografie.com'}/blog/${post.slug}`,
        pillar: (post.tags || [])[0],
      });

      // If OpenAI was unavailable we still return a usable template pack, but do
      // NOT persist it — so a later retry can produce (and cache) the real AI
      // version once OpenAI recovers.
      if ((socialPack as any).fallback) {
        return res.json({ success: true, socialPack, generated: false, degraded: true });
      }

      const ideaData = {
        ...existingIdeaData,
        socialPack,
      };
      await storage.updateBlogPost(post.id, { ideaData });
      res.json({ success: true, socialPack, generated: true });
    } catch (e: any) {
      console.error('[blog/social-pack] error:', e);
      res.status(500).json({ error: e?.message || 'Social pack generation failed' });
    }
  });

  app.post("/api/blog/posts/:id/social", authenticateUser, async (req: Request, res: Response) => {
    try {
      const post = await storage.getBlogPost(req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found' });

      const effectivePost = {
        ...post,
        title: req.body?.title || post.title,
        slug: req.body?.slug || post.slug,
        excerpt: req.body?.excerpt ?? post.excerpt,
        content: req.body?.content ?? post.content,
        contentHtml: req.body?.contentHtml ?? post.contentHtml,
        imageUrl: req.body?.imageUrl || req.body?.cover_image || post.imageUrl,
        imageUrl2: req.body?.imageUrl2 || req.body?.image_url_2 || post.imageUrl2,
        imageUrl3: req.body?.imageUrl3 || req.body?.image_url_3 || post.imageUrl3,
      };

      if (!effectivePost.imageUrl) {
        return res.status(400).json({ error: 'Post needs a cover image before social distribution.' });
      }

      const { buildZernioRow, schedulePosts } = await import('./services/zernio.js');
      const row = await buildZernioRow(effectivePost as any);
      const result = await schedulePosts([row]);
      const configured = !result.error || !/(not configured|not set)/i.test(result.error);
      res.json({ success: result.ok, configured, row, result });
    } catch (e: any) {
      console.error('[blog/social] error:', e);
      res.status(500).json({ error: e?.message || 'Social send failed' });
    }
  });

  // Distribute a post's Social Pack to Pulse (AxixOS Social). Auto-generates the pack if
  // missing. Pass { dryRun: true } to preview the exact per-platform rows without sending,
  // or { mode: 'draft'|'schedule'|'now' } to override the default PULSE_MODE for this send.
  app.post("/api/blog/posts/:id/distribute-pulse", authenticateUser, async (req: Request, res: Response) => {
    try {
      const post = await storage.getBlogPost(req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found' });

      const { isPulseConfigured, buildPulseRows, distributeToPulse, getPulseProfiles, getPulseMode } = await import('./services/pulse.js');
      const { ensureSocialPack } = await import('./services/socialDistribution.js');

      const sp = await ensureSocialPack(post as any);
      if (!sp) return res.status(400).json({ error: 'Post needs generated content before creating a social pack.' });

      const mode = typeof req.body?.mode === 'string' ? req.body.mode : undefined;
      const platforms = Array.isArray(req.body?.platforms)
        ? req.body.platforms.filter((p: any) => typeof p === 'string')
        : undefined;
      // Per-tenant social settings (wizard → studio_integrations, env fallback).
      const profiles = await getPulseProfiles();
      const resolvedMode = mode || await getPulseMode();
      const configured = await isPulseConfigured();

      const rows = buildPulseRows(post as any, sp, {
        mode: resolvedMode,
        profiles,
        ...(platforms ? { platforms } : {}),
      });

      if (req.body?.dryRun === true) {
        return res.json({ success: true, dryRun: true, configured, profiles, rows });
      }
      if (!configured) {
        return res.status(400).json({ error: 'Pulse is not connected — add your Pulse API key in Settings to enable social distribution.', rows });
      }

      const result = await distributeToPulse(rows);
      res.json({ success: result.ok, result, rows });
    } catch (e: any) {
      console.error('[blog/distribute-pulse] error:', e);
      res.status(500).json({ error: e?.message || 'Pulse distribution failed' });
    }
  });

  // Fix existing blog posts with wall-of-text issue by converting to structured HTML
  app.post("/api/blog/posts/fix-formatting", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log('🔧 Starting blog post formatting fix...');
      
      // Get all published blog posts 
      const posts = await storage.getBlogPosts();
      let fixedCount = 0;
      
      for (const post of posts) {
        try {
          // Check if post needs fixing (contains wall of text without proper HTML structure)
          const hasStructure = post.content?.includes('<h2>') && post.content?.includes('<p>');
          
          if (!hasStructure && post.content && post.content.length > 500) {
            console.log(`🔧 Fixing post: ${post.title} (${post.content.length} chars)`);
            
            // Convert text to structured HTML using the same logic as AutoBlog
            const structuredContent = convertPlainTextToStructuredHTML(post.content);
            
            // Update the post with structured content
            await storage.updateBlogPost(post.id, {
              content: structuredContent
            });
            
            fixedCount++;
            console.log(`✅ Fixed post: ${post.title}`);
          }
        } catch (error) {
          console.error(`❌ Error fixing post ${post.title}:`, error);
        }
      }
      
      console.log(`🎉 Blog formatting fix complete: ${fixedCount} posts updated`);
      res.json({ 
        success: true, 
        fixed: fixedCount,
        message: `Successfully updated ${fixedCount} blog posts with structured formatting`
      });
    } catch (error) {
      console.error("Error fixing blog post formatting:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== CRM CLIENT ROUTES ====================
  // ==================== LEAD SOURCES ROUTES ====================
  // Get all lead sources
  app.get("/api/crm/lead-sources", authenticateUser, async (req: Request, res: Response) => {
    try {
      const sources = await storage.getLeadSources();
      res.json(sources);
    } catch (error) {
      console.error("Error fetching lead sources:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Lead-source performance analytics: leads, converted clients and revenue per
  // source, so the studio can see which channels actually produce business.
  app.get("/api/crm/lead-sources/analytics", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Optional date range. When `from` is set, `to` defaults to now; when it's
      // absent the whole query is all-time ($1 IS NULL short-circuits the filter).
      const from = req.query.from ? new Date(String(req.query.from)) : null;
      const to = from ? (req.query.to ? new Date(String(req.query.to)) : new Date()) : null;

      // Clients (created in range) + paid revenue (invoiced in range) per source.
      const clientRows = await runSql(`
        SELECT COALESCE(NULLIF(TRIM(c.lead_source), ''), 'Unspecified') AS source,
               COUNT(DISTINCT c.id) FILTER (WHERE $1::timestamp IS NULL OR c.created_at BETWEEN $1 AND $2)::int AS clients,
               COALESCE(SUM(CASE WHEN i.status = 'paid'
                     AND ($1::timestamp IS NULL OR COALESCE(i.issue_date::timestamp, i.created_at) BETWEEN $1 AND $2)
                   THEN i.total ELSE 0 END), 0)::double precision AS revenue
          FROM crm_clients c
          LEFT JOIN crm_invoices i ON i.client_id = c.id
         GROUP BY 1
      `, [from, to]);
      // Leads created in range, grouped by the lead's source.
      const leadRows = await runSql(`
        SELECT COALESCE(NULLIF(TRIM(source), ''), 'Unspecified') AS source, COUNT(*)::int AS leads
          FROM crm_leads
         WHERE $1::timestamp IS NULL OR created_at BETWEEN $1 AND $2
         GROUP BY 1
      `, [from, to]);

      // Merge case-insensitively, preferring a non-'Unspecified' display label.
      const map = new Map<string, { source: string; leads: number; clients: number; revenue: number }>();
      const keyOf = (s: string) => s.toLowerCase();
      const upsert = (source: string) => {
        const k = keyOf(source);
        if (!map.has(k)) map.set(k, { source, leads: 0, clients: 0, revenue: 0 });
        return map.get(k)!;
      };
      for (const r of clientRows) { const e = upsert(r.source); e.clients += r.clients || 0; e.revenue += Number(r.revenue) || 0; }
      for (const r of leadRows) { const e = upsert(r.source); e.leads += r.leads || 0; }

      const analytics = [...map.values()]
        .map((e) => ({
          ...e,
          revenue: Math.round(e.revenue),
          conversion: e.leads > 0 ? Math.round((e.clients / e.leads) * 100) : null,
          revenuePerLead: e.leads > 0 ? Math.round(e.revenue / e.leads) : null,
        }))
        .sort((a, b) => b.revenue - a.revenue || b.clients - a.clients);

      const totals = analytics.reduce((t, e) => ({ leads: t.leads + e.leads, clients: t.clients + e.clients, revenue: t.revenue + e.revenue }), { leads: 0, clients: 0, revenue: 0 });
      res.json({ analytics, totals });
    } catch (error) {
      console.error("Error computing lead-source analytics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create lead source
  app.post("/api/crm/lead-sources", authenticateUser, async (req: Request, res: Response) => {
    try {
      const sourceData = insertLeadSourceSchema.parse(req.body);
      const source = await storage.createLeadSource(sourceData);
      res.status(201).json(source);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating lead source:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update lead source
  app.put("/api/crm/lead-sources/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const source = await storage.updateLeadSource(req.params.id, req.body);
      res.json(source);
    } catch (error) {
      console.error("Error updating lead source:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete lead source
  app.delete("/api/crm/lead-sources/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteLeadSource(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting lead source:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Test route for debugging
  app.get("/api/test", (req: Request, res: Response) => {
    console.log("Test route hit!");
    res.json({ message: "API is working!", timestamp: new Date().toISOString() });
  });

  app.get("/api/crm/clients", authenticateUser, async (req: Request, res: Response) => {
    console.log(`/api/crm/clients GET received - query:`, req.query);
    const MAX_RETRIES = 2;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const clients = await storage.getCrmClients();
        return res.json(clients);
      } catch (error: any) {
        console.error(`Error fetching CRM clients (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error?.message || error);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return res.status(500).json({ error: "Failed to load clients. The database may be temporarily unavailable." });
      }
    }
  });

  // ==================== INTELLIGENT CLIENT MERGE HELPER ====================
  /**
   * Merge a single duplicate client into the primary.
   * 1. Re-links ALL foreign-key references across every table
   * 2. Enriches primary with best available data from duplicate
   * 3. Concatenates unique notes rather than discarding
   * 4. Prefers longer/more-complete names
   * 5. Deletes the duplicate record
   */
  // Every place a client id is referenced. A merge MUST re-point all of these
  // before deleting the duplicate — otherwise rows are orphaned, or (for the
  // cascade FK on storage_subscriptions) silently destroyed.
  const RELINK_TARGETS: { table: string; column: string }[] = [
    { table: 'crm_invoices', column: 'client_id' },
    { table: 'crm_messages', column: 'client_id' },
    { table: 'voucher_sales', column: 'redeemed_by' },
    { table: 'galleries', column: 'client_id' },
    { table: 'studio_appointments', column: 'client_id' },
    { table: 'scheduler_bookings', column: 'client_id' },
    { table: 'online_bookings', column: 'client_id' },
    { table: 'photography_sessions', column: 'client_id' },
    { table: 'digital_files', column: 'client_id' },
    { table: 'storage_subscriptions', column: 'client_id' },
  ];

  // Which (table.column) pairs actually exist in this deployment — so an absent
  // optional table is skipped instead of aborting the whole transaction.
  async function loadClientRefColumns(client: any): Promise<Set<string>> {
    const r = await client.query(
      `SELECT table_name || '.' || column_name AS tc
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [[...RELINK_TARGETS.map(t => t.table), 'message_campaigns']]
    );
    return new Set(r.rows.map((x: any) => x.tc));
  }

  // Merge `dupId` into `survivorId` INSIDE an existing transaction `client`.
  // Re-points every child row (capturing exactly which ids moved), enriches the
  // survivor, writes an audit row, then deletes the duplicate. Returns false if
  // either record is missing. Throws on any SQL error so the caller can roll back.
  async function mergeClientsTx(
    client: any,
    survivorId: string,
    dupId: string,
    colSet: Set<string>,
    meta: { confidence?: number | null; matchReason?: string | null; actor?: string | null } = {},
  ): Promise<boolean> {
    if (dupId === survivorId) return false;
    const dupRes = await client.query(`SELECT * FROM crm_clients WHERE id = $1`, [dupId]);
    if (dupRes.rows.length === 0) return false;
    const dup = dupRes.rows[0];
    const survRes = await client.query(`SELECT * FROM crm_clients WHERE id = $1`, [survivorId]);
    if (survRes.rows.length === 0) return false;
    const survivorBefore = survRes.rows[0];

    const relinked: { table: string; column: string; ids: any[]; array?: boolean }[] = [];

    // 1. Re-point plain client-id columns, recording the exact rows moved.
    for (const t of RELINK_TARGETS) {
      if (!colSet.has(`${t.table}.${t.column}`)) continue;
      const r = await client.query(
        `UPDATE ${t.table} SET ${t.column} = $1 WHERE ${t.column}::text = $2::text RETURNING id`,
        [survivorId, dupId],
      );
      if (r.rows.length) relinked.push({ table: t.table, column: t.column, ids: r.rows.map((x: any) => x.id) });
    }

    // 2. Re-point the text[] targeting array on campaigns (dedup on replace).
    if (colSet.has('message_campaigns.target_client_ids')) {
      const r = await client.query(
        `UPDATE message_campaigns
            SET target_client_ids = (
              SELECT array_agg(DISTINCT CASE WHEN x = $1 THEN $2 ELSE x END)
                FROM unnest(target_client_ids) x)
          WHERE $1 = ANY(target_client_ids)
        RETURNING id`,
        [dupId, survivorId],
      );
      if (r.rows.length) relinked.push({ table: 'message_campaigns', column: 'target_client_ids', ids: r.rows.map((x: any) => x.id), array: true });
    }

    // 3. Enrich survivor — prefer longer names, fill empties, concatenate notes.
    await client.query(
      `UPDATE crm_clients AS c SET
         first_name = CASE WHEN LENGTH(COALESCE(NULLIF(c.first_name,''),'')) < LENGTH(COALESCE(NULLIF($2,''),''))
                      THEN COALESCE(NULLIF($2,''), c.first_name) ELSE c.first_name END,
         last_name = CASE WHEN LENGTH(COALESCE(NULLIF(c.last_name,''),'')) < LENGTH(COALESCE(NULLIF($3,''),''))
                     THEN COALESCE(NULLIF($3,''), c.last_name) ELSE c.last_name END,
         email = COALESCE(NULLIF(c.email,''), NULLIF($14,'')),
         phone = COALESCE(NULLIF(c.phone,''), NULLIF($4,'')),
         address = COALESCE(NULLIF(c.address,''), NULLIF($5,'')),
         city = COALESCE(NULLIF(c.city,''), NULLIF($6,'')),
         state = COALESCE(NULLIF(c.state,''), NULLIF($7,'')),
         zip = COALESCE(NULLIF(c.zip,''), NULLIF($8,'')),
         country = COALESCE(NULLIF(c.country,''), NULLIF($9,'')),
         company = COALESCE(NULLIF(c.company,''), NULLIF($10,'')),
         vat_number = COALESCE(NULLIF(c.vat_number,''), NULLIF($11,'')),
         lead_source = COALESCE(NULLIF(c.lead_source,''), NULLIF($12,'')),
         notes = CASE
           WHEN NULLIF(c.notes,'') IS NULL THEN NULLIF($13,'')
           WHEN NULLIF($13,'') IS NULL THEN c.notes
           WHEN c.notes = $13 THEN c.notes
           ELSE c.notes || E'\n---\n' || $13
         END,
         updated_at = NOW()
       WHERE c.id = $1`,
      [survivorId, dup.first_name, dup.last_name, dup.phone, dup.address, dup.city, dup.state, dup.zip, dup.country, dup.company, dup.vat_number, dup.lead_source, dup.notes, dup.email],
    );

    // 4. Audit (snapshot the deleted record + survivor's pre-merge state).
    await client.query(
      `INSERT INTO client_merge_audit
         (survivor_id, merged_client_id, merged_snapshot, survivor_before, relinked, confidence, match_reason, actor)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [survivorId, dupId, JSON.stringify(dup), JSON.stringify(survivorBefore), JSON.stringify(relinked),
       meta.confidence ?? null, meta.matchReason ?? null, meta.actor ?? null],
    );

    // 5. Delete the duplicate.
    await client.query(`DELETE FROM crm_clients WHERE id = $1`, [dupId]);
    return true;
  }

  // The audit table is documented in shared/schema.ts (for fresh installs via
  // db:push), but we also create-if-missing at first use so the Merge Wizard
  // works on any existing database without a separate migration step.
  let _mergeAuditReady = false;
  async function ensureMergeAuditTable(): Promise<void> {
    if (_mergeAuditReady) return;
    await pool.query(`CREATE TABLE IF NOT EXISTS client_merge_audit (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      survivor_id uuid NOT NULL,
      merged_client_id uuid NOT NULL,
      merged_snapshot jsonb NOT NULL,
      survivor_before jsonb,
      relinked jsonb NOT NULL,
      confidence integer,
      match_reason text,
      actor text,
      undone boolean DEFAULT false,
      undone_at timestamp,
      created_at timestamp DEFAULT now()
    )`);
    _mergeAuditReady = true;
  }

  // Public helper: one atomic, audited merge. Each call is its own transaction,
  // so a batch that merges A and B keeps A even if B later fails.
  async function mergeOneDuplicate(
    survivorId: string,
    dupId: string,
    meta: { confidence?: number | null; matchReason?: string | null; actor?: string | null } = {},
  ): Promise<boolean> {
    await ensureMergeAuditTable();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const colSet = await loadClientRefColumns(client);
      const ok = await mergeClientsTx(client, survivorId, dupId, colSet, meta);
      await client.query('COMMIT');
      return ok;
    } catch (e: any) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[client-merge] failed, rolled back:', e?.message || e);
      throw e;
    } finally {
      client.release();
    }
  }

  // Find duplicate clients (by email or phone)
  app.get("/api/crm/clients/duplicates", authenticateUser, async (req: Request, res: Response) => {
    try {
      const by = (String(req.query.by || 'email').toLowerCase() === 'phone') ? 'phone' : 'email';
      const limit = Math.max(1, Math.min(500, Number(req.query.limit ?? 100)));
      const keyExpr = by === 'phone' ? `NULLIF(TRIM(phone),'')` : `LOWER(NULLIF(TRIM(email),'') )`;
      const rows = await runSql(
        `SELECT ${keyExpr} AS dup_key, ARRAY_AGG(id) AS ids, COUNT(*)::int AS count
         FROM crm_clients
         WHERE ${keyExpr} IS NOT NULL
         GROUP BY 1
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC
         LIMIT $1`,
        [limit]
      );
      res.json({ by, groups: rows });
    } catch (error) {
      console.error('Error listing duplicate clients:', error);
      res.status(500).json({ error: 'Failed to list duplicates' });
    }
  });

  // Merge duplicate clients into a single record per duplicate key
  app.post("/api/crm/clients/merge-duplicates", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { by = 'email', dryRun = true, limit = 200, strategy = 'keep-oldest' } = req.body || {};
      const mode = String(by).toLowerCase() === 'phone' ? 'phone' : 'email';
      const keepOldest = String(strategy).toLowerCase() !== 'keep-newest';
      const lim = Math.max(1, Math.min(1000, Number(limit)));

      const keyExpr = mode === 'phone' ? `NULLIF(TRIM(phone),'')` : `LOWER(NULLIF(TRIM(email),'') )`;
      const groups = await runSql(
        `SELECT ${keyExpr} AS dup_key, ARRAY_AGG(id) AS ids, COUNT(*)::int AS count
         FROM crm_clients
         WHERE ${keyExpr} IS NOT NULL
         GROUP BY 1
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC
         LIMIT $1`,
        [lim]
      );

      let totalMerged = 0;
      const previews: any[] = [];

      for (const g of groups) {
        const ids: string[] = g.ids || [];
        if (!ids || ids.length < 2) continue;
        // Load candidate rows to pick a primary
        const rows = await runSql(
          `SELECT id, created_at, updated_at, first_name, last_name, email, phone, address, city, state, zip, country, company, notes
           FROM crm_clients WHERE id = ANY($1)`,
          [ids]
        );
        if (!rows || rows.length < 2) continue;

        rows.sort((a: any, b: any) => {
          const ta = new Date(a.created_at || a.updated_at || 0).getTime();
          const tb = new Date(b.created_at || b.updated_at || 0).getTime();
          return keepOldest ? (ta - tb) : (tb - ta);
        });
        const primary = rows[0];
        const duplicates = rows.slice(1);
        const dupIds = duplicates.map((r: any) => r.id);

        previews.push({ key: g.dup_key, keep: primary.id, remove: dupIds });
        totalMerged += dupIds.length;

        if (dryRun) continue;

        // For each duplicate, re-link references then delete dup
        for (const d of duplicates) {
          await mergeOneDuplicate(primary.id, d.id);
        }
      }

      return res.json({ success: true, dryRun, by: mode, groups: groups.length, totalMerged, preview: previews.slice(0, 20) });
    } catch (error) {
      console.error('Error merging duplicate clients:', error);
      res.status(500).json({ error: 'Failed to merge duplicates' });
    }
  });

  // Generate detailed merge suggestions (no mutations)
  app.get("/api/crm/clients/merge-suggestions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const mode = String(req.query.by || 'email').toLowerCase() === 'phone' ? 'phone' : 'email';
      const strategy = String(req.query.strategy || 'keep-oldest').toLowerCase();
      const keepOldest = strategy !== 'keep-newest';
      const limit = Math.max(1, Math.min(500, Number(req.query.limit ?? 100)));
      const keyExpr = mode === 'phone' ? `NULLIF(TRIM(phone),'')` : `LOWER(NULLIF(TRIM(email),'') )`;
      const groups = await runSql(
        `SELECT ${keyExpr} AS dup_key, ARRAY_AGG(id) AS ids, COUNT(*)::int AS count
         FROM crm_clients
         WHERE ${keyExpr} IS NOT NULL
         GROUP BY 1
         HAVING COUNT(*) > 1
         ORDER BY COUNT(*) DESC
         LIMIT $1`,
        [limit]
      );

      const suggestions: any[] = [];
      for (const g of groups) {
        const ids: string[] = g.ids || [];
        if (!ids || ids.length < 2) continue;
        const rows = await runSql(
          `SELECT id, created_at, updated_at, first_name, last_name, email, phone, address, city, state, zip, country, company, notes
           FROM crm_clients WHERE id = ANY($1)`,
          [ids]
        );
        if (!rows || rows.length < 2) continue;
        rows.sort((a: any, b: any) => {
          const ta = new Date(a.created_at || a.updated_at || 0).getTime();
          const tb = new Date(b.created_at || b.updated_at || 0).getTime();
          return keepOldest ? (ta - tb) : (tb - ta);
        });
        const primary = rows[0];
        const duplicates = rows.slice(1);
        suggestions.push({ key: g.dup_key, primary, duplicates });
      }

      res.json({ success: true, by: mode, strategy, count: suggestions.length, suggestions });
    } catch (error) {
      console.error('Error creating merge suggestions:', error);
      res.status(500).json({ error: 'Failed to build merge suggestions' });
    }
  });

  // Execute a specific merge decision from wizard
  app.post("/api/crm/clients/merge-execute", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { primaryId, duplicateIds, confidence, matchReason } = req.body || {};
      if (!primaryId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
        return res.status(400).json({ error: 'primaryId and duplicateIds[] required' });
      }
      // Basic validation to ensure primary exists
      const primaryRows = await runSql(`SELECT id FROM crm_clients WHERE id = $1`, [primaryId]);
      if (!primaryRows || primaryRows.length === 0) {
        return res.status(404).json({ error: 'Primary client not found' });
      }
      const actor = (req as any).user?.email || (req as any).user?.id || null;

      let merged = 0;
      for (const dupId of duplicateIds) {
        const ok = await mergeOneDuplicate(primaryId, dupId, { confidence: confidence ?? null, matchReason: matchReason ?? null, actor });
        if (ok) merged++;
      }
      const updatedPrimary = await runSql(`SELECT * FROM crm_clients WHERE id = $1`, [primaryId]);
      res.json({ success: true, merged, primaryId, primary: updatedPrimary?.[0] });
    } catch (error) {
      console.error('Error executing targeted merge:', error);
      res.status(500).json({ error: 'Failed to execute merge' });
    }
  });

  // Batch execute multiple merge decisions in a single request
  app.post("/api/crm/clients/merge-execute-batch", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { merges } = req.body || {};
      if (!Array.isArray(merges) || merges.length === 0) {
        return res.status(400).json({ error: 'merges[] required: [{primaryId, duplicateIds[]}]' });
      }
      const actor = (req as any).user?.email || (req as any).user?.id || null;
      const results: any[] = [];
      for (const m of merges) {
        const primaryId = m.primaryId;
        const duplicateIds: string[] = Array.isArray(m.duplicateIds) ? m.duplicateIds : [];
        if (!primaryId || duplicateIds.length === 0) {
          results.push({ primaryId, skipped: true, reason: 'missing primaryId or duplicateIds' });
          continue;
        }
        try {
          let merged = 0;
            for (const dupId of duplicateIds) {
              const ok = await mergeOneDuplicate(primaryId, dupId, { confidence: m.confidence ?? null, matchReason: m.matchReason ?? null, actor });
              if (ok) merged++;
            }
          results.push({ primaryId, merged });
        } catch (innerErr: any) {
          results.push({ primaryId: m.primaryId, error: innerErr?.message || 'merge failed' });
        }
      }
      res.json({ success: true, count: results.length, results });
    } catch (error) {
      console.error('Error executing batch merge:', error);
      res.status(500).json({ error: 'Failed batch merge' });
    }
  });

  // ── Smart duplicate detection ──────────────────────────────────────
  // Beyond exact email/phone: normalizes contact fields and applies fuzzy
  // name+location rules, returning confidence-scored groups for human review.
  // No mutations.
  app.get("/api/crm/clients/merge-candidates", authenticateUser, async (_req: Request, res: Response) => {
    try {
      const clean = (v: any) => (v == null ? '' : String(v).trim());
      const normEmail = (e: any) => {
        let s = clean(e).toLowerCase();
        if (!s || !s.includes('@')) return '';
        let [local, domain] = s.split('@');
        if (domain === 'gmail.com' || domain === 'googlemail.com') {
          local = local.split('+')[0].replace(/\./g, '');
          domain = 'gmail.com';
        } else {
          local = local.split('+')[0];
        }
        return `${local}@${domain}`;
      };
      const normPhone = (p: any) => {
        const digits = clean(p).replace(/\D/g, '');
        if (digits.length < 7) return '';
        return digits.slice(-9); // drop country/trunk prefixes so +43/0043/0 all match
      };
      const normText = (v: any) => clean(v).toLowerCase().replace(/\s+/g, ' ');
      const NICK: Record<string, string> = {
        bob: 'robert', rob: 'robert', robbie: 'robert', bill: 'william', will: 'william',
        jim: 'james', jimmy: 'james', tom: 'thomas', mike: 'michael', mick: 'michael',
        dave: 'david', dan: 'daniel', danny: 'daniel', chris: 'christopher', matt: 'matthew',
        nick: 'nicholas', tony: 'anthony', steve: 'stephen', joe: 'joseph', andy: 'andrew',
        katie: 'katherine', kate: 'katherine', kathy: 'katherine', liz: 'elizabeth', beth: 'elizabeth',
        sue: 'susan', peggy: 'margaret', maggie: 'margaret', sandy: 'sandra',
      };
      const canonFirst = (f: string) => { const n = normText(f); return NICK[n] || n; };
      const lev = (a: string, b: string) => {
        if (a === b) return 0;
        const m = a.length, n = b.length;
        if (!m || !n) return Math.max(m, n);
        const d = Array.from({ length: n + 1 }, (_, i) => i);
        for (let i = 1; i <= m; i++) {
          let prev = d[0]; d[0] = i;
          for (let j = 1; j <= n; j++) {
            const t = d[j];
            d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = t;
          }
        }
        return d[n];
      };

      let rows: any[];
      try {
        rows = await runSql(
          `SELECT c.id, c.first_name, c.last_name, c.email, c.phone, c.address, c.city, c.zip, c.company, c.notes, c.created_at,
             COALESCE(i.cnt,0)::int AS invoice_count,
             COALESCE(s.cnt,0)::int AS session_count,
             COALESCE(g.cnt,0)::int AS gallery_count
           FROM crm_clients c
           LEFT JOIN (SELECT client_id, COUNT(*) cnt FROM crm_invoices GROUP BY client_id) i ON i.client_id = c.id
           LEFT JOIN (SELECT client_id, COUNT(*) cnt FROM photography_sessions GROUP BY client_id) s ON s.client_id = c.id::text
           LEFT JOIN (SELECT client_id, COUNT(*) cnt FROM galleries GROUP BY client_id) g ON g.client_id = c.id`);
      } catch {
        rows = await runSql(
          `SELECT id, first_name, last_name, email, phone, address, city, zip, company, notes, created_at,
             0 AS invoice_count, 0 AS session_count, 0 AS gallery_count FROM crm_clients`);
      }

      const clients = rows.map((r: any) => ({
        ...r,
        _email: normEmail(r.email),
        _phone: normPhone(r.phone),
        _first: canonFirst(r.first_name),
        _last: normText(r.last_name),
        _city: normText(r.city),
        _zip: clean(r.zip).toLowerCase(),
        _addr: normText(r.address),
        _activity: (r.invoice_count || 0) + (r.session_count || 0) + (r.gallery_count || 0),
        _complete: ['email', 'phone', 'address', 'city', 'zip', 'company', 'notes']
          .reduce((n, k) => n + (clean(r[k]) ? 1 : 0), 0),
      }));

      // Union-find over client ids.
      const parent = new Map<string, string>();
      const find = (x: string): string => { let r = x; while (parent.get(r) !== r) r = parent.get(r)!; while (parent.get(x) !== r) { const nx = parent.get(x)!; parent.set(x, r); x = nx; } return r; };
      for (const c of clients) parent.set(c.id, c.id);
      const union = (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };

      const pairs: { a: string; b: string; score: number; reason: string }[] = [];
      const bucket = (keyFn: (c: any) => string) => {
        const m = new Map<string, any[]>();
        for (const c of clients) { const k = keyFn(c); if (!k) continue; (m.get(k) || m.set(k, []).get(k)!).push(c); }
        return m;
      };
      const addPairsWithin = (list: any[], score: number, reason: string, ok?: (a: any, b: any) => boolean) => {
        for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
          if (ok && !ok(list[i], list[j])) continue;
          pairs.push({ a: list[i].id, b: list[j].id, score, reason });
        }
      };

      // Rule 1 — identical (normalized) email → strongest signal.
      for (const list of bucket((c) => c._email).values()) if (list.length > 1) addPairsWithin(list, 96, 'Identical email');
      // Rule 2 — identical (normalized) phone.
      for (const list of bucket((c) => c._phone).values()) if (list.length > 1) addPairsWithin(list, 88, 'Identical phone');
      // Rule 3 — same full name + same city.
      for (const list of bucket((c) => (c._first && c._last && c._city) ? `${c._first}|${c._last}|${c._city}` : '').values())
        if (list.length > 1) addPairsWithin(list, 80, 'Same name & city');
      // Rule 4 — same surname + same non-empty address.
      for (const list of bucket((c) => (c._last && c._addr) ? `${c._last}|${c._addr}` : '').values())
        if (list.length > 1) addPairsWithin(list, 74, 'Same surname & address');
      // Rule 5 — same surname + same city + similar first name (nickname / 1 edit).
      for (const list of bucket((c) => (c._last && c._city) ? `${c._last}|${c._city}` : '').values())
        if (list.length > 1) addPairsWithin(list, 64, 'Similar name, same area',
          (a, b) => a._first !== b._first && lev(a._first, b._first) <= 1);

      // Aggregate pairs onto their final group root.
      for (const p of pairs) union(p.a, p.b);
      const agg = new Map<string, { score: number; reasons: Set<string> }>();
      for (const p of pairs) {
        const r = find(p.a);
        const cur = agg.get(r) || { score: 0, reasons: new Set<string>() };
        cur.score = Math.max(cur.score, p.score); cur.reasons.add(p.reason);
        agg.set(r, cur);
      }

      const byId = new Map(clients.map((c: any) => [c.id, c]));
      const members = new Map<string, any[]>();
      for (const c of clients) { const r = find(c.id); if (!agg.has(r)) continue; (members.get(r) || members.set(r, []).get(r)!).push(c); }

      const groups = [...members.entries()]
        .map(([root, mem]) => {
          const meta = agg.get(root)!;
          const sorted = [...mem].sort((a, b) =>
            b._activity - a._activity || b._complete - a._complete ||
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
          return {
            confidence: meta.score,
            reasons: [...meta.reasons],
            suggestedSurvivorId: sorted[0].id,
            members: sorted.map((c: any) => ({
              id: c.id, firstName: c.first_name, lastName: c.last_name, email: c.email, phone: c.phone,
              city: c.city, company: c.company, createdAt: c.created_at,
              invoiceCount: c.invoice_count, sessionCount: c.session_count, galleryCount: c.gallery_count,
              completeness: c._complete,
            })),
          };
        })
        .filter((g) => g.members.length > 1)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 300);

      res.json({ totalClients: clients.length, groupCount: groups.length, groups });
    } catch (error) {
      console.error('Error computing merge candidates:', error);
      res.status(500).json({ error: 'Failed to compute merge candidates' });
    }
  });

  // Recent merges (for the undo/history panel).
  app.get("/api/crm/clients/merge-audit", authenticateUser, async (req: Request, res: Response) => {
    try {
      await ensureMergeAuditTable();
      const limit = Math.max(1, Math.min(200, Number(req.query.limit ?? 50)));
      const rows = await runSql(
        `SELECT id, survivor_id, merged_client_id, merged_snapshot, confidence, match_reason, actor, undone, undone_at, created_at
           FROM client_merge_audit ORDER BY created_at DESC LIMIT $1`, [limit]);
      const items = rows.map((r: any) => {
        const snap = r.merged_snapshot || {};
        return {
          id: r.id, survivorId: r.survivor_id, mergedClientId: r.merged_client_id,
          mergedName: `${snap.first_name || ''} ${snap.last_name || ''}`.trim(),
          mergedEmail: snap.email || null,
          confidence: r.confidence, matchReason: r.match_reason, actor: r.actor,
          undone: r.undone, undoneAt: r.undone_at, createdAt: r.created_at,
        };
      });
      res.json({ items });
    } catch (error) {
      console.error('Error listing merge audit:', error);
      res.status(500).json({ error: 'Failed to list merge history' });
    }
  });

  // Undo a merge: restore the deleted record, move its child rows back, and
  // revert the survivor's enriched fields. Best-effort for the campaigns array.
  app.post("/api/crm/clients/merge-undo/:id", authenticateUser, async (req: Request, res: Response) => {
    const auditId = req.params.id;
    await ensureMergeAuditTable();
    const client = await pool.connect();
    try {
      const aRes = await client.query(`SELECT * FROM client_merge_audit WHERE id = $1`, [auditId]);
      if (aRes.rows.length === 0) return res.status(404).json({ error: 'Merge record not found' });
      const audit = aRes.rows[0];
      if (audit.undone) return res.status(400).json({ error: 'This merge was already undone' });

      const snap = audit.merged_snapshot || {};
      const before = audit.survivor_before || {};
      const relinked: any[] = audit.relinked || [];
      const survivorId = audit.survivor_id;
      const mergedId = audit.merged_client_id;

      await client.query('BEGIN');

      // 1. Restore the deleted client (keep its original id). If the human-facing
      //    client_id number now collides, restore without it rather than fail.
      const cols = ['id','first_name','last_name','client_id','email','phone','address','city','state','zip','country','company','vat_number','lead_source','notes','status','created_at','updated_at'];
      const vals = cols.map((k) => snap[k] ?? null);
      try {
        await client.query(
          `INSERT INTO crm_clients (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT (id) DO NOTHING`,
          vals);
      } catch (e: any) {
        const noNum = { ...snap, client_id: null };
        await client.query(
          `INSERT INTO crm_clients (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT (id) DO NOTHING`,
          cols.map((k) => noNum[k] ?? null));
      }

      // 2. Move child rows back — only those still pointing at the survivor.
      for (const r of relinked) {
        if (!r || !Array.isArray(r.ids) || r.ids.length === 0) continue;
        if (r.array) {
          await client.query(
            `UPDATE ${r.table}
                SET ${r.column} = (SELECT array_agg(DISTINCT CASE WHEN x = $1 THEN $2 ELSE x END) FROM unnest(${r.column}) x)
              WHERE id = ANY($3)`,
            [survivorId, mergedId, r.ids]).catch(() => {});
        } else {
          await client.query(
            `UPDATE ${r.table} SET ${r.column} = $1 WHERE id = ANY($2) AND ${r.column}::text = $3::text`,
            [mergedId, r.ids, survivorId]).catch(() => {});
        }
      }

      // 3. Revert the survivor's enriched fields to their pre-merge values.
      await client.query(
        `UPDATE crm_clients SET
           first_name=$2, last_name=$3, email=$4, phone=$5, address=$6, city=$7, state=$8,
           zip=$9, country=$10, company=$11, vat_number=$12, lead_source=$13, notes=$14, updated_at=NOW()
         WHERE id=$1`,
        [survivorId, before.first_name ?? null, before.last_name ?? null, before.email ?? null,
         before.phone ?? null, before.address ?? null, before.city ?? null, before.state ?? null,
         before.zip ?? null, before.country ?? null, before.company ?? null, before.vat_number ?? null,
         before.lead_source ?? null, before.notes ?? null]);

      await client.query(`UPDATE client_merge_audit SET undone = true, undone_at = NOW() WHERE id = $1`, [auditId]);
      await client.query('COMMIT');
      res.json({ success: true, restoredClientId: mergedId, survivorId });
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Error undoing merge:', error?.message || error);
      res.status(500).json({ error: 'Failed to undo merge' });
    } finally {
      client.release();
    }
  });

  // ==================== CRM LEADS ====================
  app.get("/api/crm/leads", authenticateUser, async (req: Request, res: Response) => {
    try {
      const status = (req.query.status as string) || undefined;
      const leads = await storage.getCrmLeads(status);
      res.json(leads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(404).json({ error: 'Leads not found' });
    }
  });

  app.get("/api/crm/leads/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const lead = await storage.getCrmLead(req.params.id);
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      res.json(lead);
    } catch (error) {
      console.error('Error fetching lead:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post("/api/crm/leads", authenticateUser, async (req: Request, res: Response) => {
    try {
      const created = await storage.createCrmLead(req.body);
      res.status(201).json(created);
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to create lead' });
    }
  });

  app.put("/api/crm/leads/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const updated = await storage.updateCrmLead(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error('Error updating lead:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to update lead' });
    }
  });

  app.delete("/api/crm/leads/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteCrmLead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting lead:', error);
      res.status(500).json({ error: 'Failed to delete lead' });
    }
  });

  // High-value clients endpoint for reports dashboard
  app.get("/api/reports/high-value-clients", authenticateUser, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      // Query to get clients with their total booking revenue and count
      const query = `
        SELECT 
          c.id,
          c.name,
          COALESCE(SUM(CAST(i.total AS DECIMAL(10,2))), 0) as total_revenue,
          COUNT(DISTINCT b.id) as booking_count
        FROM crm_clients c
        LEFT JOIN bookings b ON b.client_id = c.id
        LEFT JOIN invoices i ON i.client_id = c.id AND i.status = 'paid'
        GROUP BY c.id, c.name
        HAVING COALESCE(SUM(CAST(i.total AS DECIMAL(10,2))), 0) > 0
        ORDER BY total_revenue DESC
        LIMIT $1
      `;
      
      const result = await db.execute(sql.raw(query), [limit]);
      const clients = result.rows || [];
      
      res.json(clients.map((row: any) => ({
        name: row.name || 'Unknown Client',
        revenue: parseFloat(row.total_revenue || 0),
        bookings: parseInt(row.booking_count || 0)
      })));
    } catch (error) {
      console.error('Error fetching high-value clients:', error);
      res.status(500).json({ error: 'Failed to fetch high-value clients', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Alias route for frontend compatibility (/api/leads/list)
  app.get("/api/leads/list", authenticateUser, async (req: Request, res: Response) => {
    try {
      const status = (req.query.status as string) || undefined;
      const q = (req.query.q as string) || undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
      
      const leads = await storage.getCrmLeads(status);
      
      // Filter by search query if provided
      let filtered = leads;
      if (q) {
        const searchLower = q.toLowerCase();
        filtered = leads.filter(lead => 
          (lead.name?.toLowerCase().includes(searchLower)) ||
          (lead.email?.toLowerCase().includes(searchLower)) ||
          (lead.phone?.includes(q)) ||
          (lead.message?.toLowerCase().includes(searchLower))
        );
      }
      
      // Apply pagination
      const total = filtered.length;
      const paginatedLeads = filtered.slice(offset || 0, (offset || 0) + (limit || filtered.length));
      
      // Transform to match frontend expectations
      const rows = paginatedLeads.map(lead => ({
        id: lead.id,
        full_name: lead.name || `${(lead as any).firstName || ''} ${(lead as any).lastName || ''}`.trim(),
        email: lead.email,
        phone: lead.phone,
        message: lead.message,
        form_type: lead.source || 'MANUAL',
        status: lead.status || 'new',
        created_at: lead.createdAt
      }));
      
      res.json({ rows, total, limit, offset });
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: 'Failed to fetch leads', rows: [], total: 0 });
    }
  });

  // Bulk mark new leads as contacted
  app.post("/api/leads/bulk/mark-new-contacted", authenticateUser, async (req: Request, res: Response) => {
    try {
      const result = await runSql(`
        UPDATE crm_leads 
        SET status = 'contacted', updated_at = NOW()
        WHERE status = 'new'
        RETURNING id
      `, []);
      
      res.json({ 
        success: true, 
        message: `${result.length} leads marked as contacted`,
        count: result.length 
      });
    } catch (error) {
      console.error('Error bulk updating leads:', error);
      res.status(500).json({ error: 'Failed to bulk update leads' });
    }
  });

  // Create new lead endpoint
  app.post("/api/leads/create", async (req: Request, res: Response) => {
    try {
      const { name, email, phone, message, source, formType } = req.body;
      
      // Validate required fields
      if (!email && !phone) {
        return res.status(400).json({ error: 'Either email or phone is required' });
      }

      const newLead = await storage.createCrmLead({
        name: name || '',
        email: email || null,
        phone: phone || null,
        message: message || null,
        source: source || formType || 'WEBSITE',
        status: 'new',
        assignedTo: null
      } as any);

      res.status(201).json({ success: true, lead: newLead });
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  });

  // ── Convert Lead to Client ──────────────────────────────────
  app.post("/api/leads/:id/convert-to-client", authenticateUser, async (req: Request, res: Response) => {
    try {
      const leadId = req.params.id;

      // 1. Fetch the lead
      const leadRows = await runSql('SELECT * FROM crm_leads WHERE id = $1 LIMIT 1', [leadId]);
      if (!leadRows || leadRows.length === 0) {
        return res.status(404).json({ error: 'Lead not found' });
      }
      const lead = leadRows[0];

      // Split "full_name / name" into first + last
      const fullName = (lead.name || '').trim();
      const nameParts = fullName.split(/\s+/);
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || '';

      // 2. Check for existing client with the same email
      if (lead.email) {
        const existing = await runSql(
          'SELECT id, first_name, last_name FROM crm_clients WHERE LOWER(email) = LOWER($1) LIMIT 1',
          [lead.email]
        );
        if (existing && existing.length > 0) {
          // Mark lead converted even if client already exists
          await runSql("UPDATE crm_leads SET status = 'converted', updated_at = NOW() WHERE id = $1", [leadId]);
          return res.json({
            success: true,
            alreadyExisted: true,
            clientId: existing[0].id,
            message: `Client already exists: ${existing[0].first_name} ${existing[0].last_name}`,
          });
        }
      }

      // 3. Create the client
      const insertResult = await runSql(
        `INSERT INTO crm_clients (first_name, last_name, email, phone, lead_source, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING id, first_name, last_name, email`,
        [
          firstName,
          lastName,
          lead.email || '',
          lead.phone || null,
          lead.source || 'Lead Conversion',
          lead.message || null,
        ]
      );

      const newClient = insertResult[0];

      // 4. Mark lead as converted
      await runSql("UPDATE crm_leads SET status = 'converted', updated_at = NOW() WHERE id = $1", [leadId]);

      console.log(`[lead-convert] Lead ${leadId} → Client ${newClient.id}`);
      res.json({
        success: true,
        alreadyExisted: false,
        clientId: newClient.id,
        client: newClient,
        message: `${newClient.first_name} ${newClient.last_name} added to clients`,
      });
    } catch (error) {
      console.error('Error converting lead to client:', error);
      res.status(500).json({ error: 'Failed to convert lead to client' });
    }
  });
  app.get("/api/crm/clients/:id", authenticateUser, async (req: Request, res: Response) => {
    console.log(`/api/crm/clients/${req.params.id} GET received`);
    try {
      const client = await storage.getCrmClient(req.params.id);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Calculate lifetime value from paid invoices
      const lifetimeValueQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END)::double precision, 0)::double precision AS lifetime_value,
          COALESCE(COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END), 0)::int AS invoice_count
        FROM crm_invoices i
        WHERE i.client_id = $1
      `;
      
      const lifetimeResult = await runSql(lifetimeValueQuery, [req.params.id]);
      const lifetimeValue = lifetimeResult[0]?.lifetime_value || 0;
      const invoiceCount = lifetimeResult[0]?.invoice_count || 0;
      
      // Add calculated fields to client object
      const enrichedClient = {
        ...client,
        lifetimeValue: lifetimeValue.toString(),
        invoiceCount,
        totalRevenue: lifetimeValue
      };
      
      res.json(enrichedClient);
    } catch (error) {
      console.error("Error fetching CRM client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create a new CRM client
  app.post("/api/crm/clients", authenticateUser, async (req: Request, res: Response) => {
    console.log(`/api/crm/clients POST received - body:`, req.body);
    try {
      // Convert ISO date strings to Date objects before validation
      const processedBody = { ...req.body };
      if (processedBody.clientSince && typeof processedBody.clientSince === 'string') {
        processedBody.clientSince = new Date(processedBody.clientSince);
      }
      if (processedBody.lastSessionDate && typeof processedBody.lastSessionDate === 'string') {
        processedBody.lastSessionDate = new Date(processedBody.lastSessionDate);
      }
      
      // Validate input against the shared insert schema
      const clientData = insertCrmClientSchema.parse(processedBody);
      const client = await storage.createCrmClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Validation error creating CRM client:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating CRM client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/crm/clients/:id", authenticateUser, async (req: Request, res: Response) => {
    console.log(`/api/crm/clients/${req.params.id} PUT received - body:`, req.body);
    try {
      // Only pass known fields to prevent Drizzle errors from unknown properties
      const { firstName, lastName, email, phone, address, city, state, zip, country, company, vatNumber, leadSource, notes, status } = req.body;
      const sanitized: Record<string, any> = {};
      if (firstName !== undefined) sanitized.firstName = firstName;
      if (lastName !== undefined) sanitized.lastName = lastName;
      if (email !== undefined) sanitized.email = email;
      if (phone !== undefined) sanitized.phone = phone;
      if (address !== undefined) sanitized.address = address;
      if (city !== undefined) sanitized.city = city;
      if (state !== undefined) sanitized.state = state;
      if (zip !== undefined) sanitized.zip = zip;
      if (country !== undefined) sanitized.country = country;
      if (company !== undefined) sanitized.company = company;
      if (vatNumber !== undefined) sanitized.vatNumber = vatNumber;
      if (leadSource !== undefined) sanitized.leadSource = leadSource;
      if (notes !== undefined) sanitized.notes = notes;
      if (status !== undefined) sanitized.status = status;
      sanitized.updatedAt = new Date();

      const client = await storage.updateCrmClient(req.params.id, sanitized);
      console.log(`/api/crm/clients/${req.params.id} updated:`, client);
      res.json(client);
    } catch (error) {
      console.error("Error updating CRM client:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get gallery cover image for a client (for avatar display)
  app.get("/api/crm/clients/:id/gallery-cover", authenticateUser, async (req: Request, res: Response) => {
    try {
      const clientId = req.params.id;
      
      // Find galleries for this client with a cover image
      const gallery = await storage.getClientGalleryWithCover(clientId);
      
      if (!gallery || !gallery.coverImage) {
        return res.json({ coverImage: null });
      }
      
      res.json({ coverImage: gallery.coverImage });
    } catch (error) {
      console.error("Error fetching client gallery cover:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all email messages for a specific client
  app.get("/api/crm/clients/:id/messages", authenticateUser, async (req: Request, res: Response) => {
    try {
      const clientId = req.params.id;
      
      // Get the client to access their email address
      const client = await storage.getCrmClient(clientId);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      // Get all messages
      const allMessages = await storage.getCrmMessages();
      
      // Filter messages that belong to this client by:
      // 1. clientId matches (new emails)
      // 2. senderEmail matches client email (legacy inbound emails without clientId)
      // 3. recipientEmail matches client email (outbound emails sent to this client)
      const clientEmail = client.email?.toLowerCase().trim();
      
      const clientMessages = allMessages.filter(msg => {
        // Match by clientId
        if (msg.clientId === clientId) {
          return true;
        }
        
        // Match by sender email address (for inbound emails before clientId linking)
        if (clientEmail && msg.senderEmail) {
          const senderEmail = msg.senderEmail.toLowerCase().trim();
          if (senderEmail === clientEmail) {
            // Auto-link this message to the client for future queries
            storage.updateCrmMessage(msg.id, { clientId }).catch(err => 
              console.error('Failed to auto-link message:', err)
            );
            return true;
          }
        }
        
        // Match by recipient email (for outbound emails sent to this client)
        if (clientEmail && msg.recipientEmail) {
          const recipientEmail = msg.recipientEmail.toLowerCase().trim();
          if (recipientEmail === clientEmail) {
            // Auto-link this message to the client for future queries
            storage.updateCrmMessage(msg.id, { clientId }).catch(err => 
              console.error('Failed to auto-link outbound message:', err)
            );
            return true;
          }
        }
        
        return false;
      });
      
      // Transform to expected format for ViewEmailsModal
      const formattedMessages = clientMessages.map(msg => ({
        id: msg.id,
        subject: msg.subject,
        from: msg.senderEmail,
        to: msg.recipientEmail || getEnvContactEmailSync() || 'no-reply@localhost',
        content: msg.content,
        timestamp: msg.createdAt || msg.sentAt || new Date().toISOString(),
        type: msg.direction === 'outbound' ? 'sent' : 'received'
      }));
      
      console.log(`Found ${formattedMessages.length} messages for client ${clientId} (${client.email})`);
      res.json(formattedMessages);
    } catch (error) {
      console.error("Error fetching client messages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // ==================== PHOTOGRAPHY SESSION ROUTES ====================
  app.get("/api/photography/sessions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const photographerId = req.query.photographerId as string;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      let sessions = await storage.getPhotographySessions(photographerId);

      // Filter by date range to avoid sending 24k+ historical sessions to the client
      if (from || to) {
        const fromDate = from ? new Date(from) : null;
        const toDate = to ? new Date(to) : null;
        sessions = sessions.filter(s => {
          const d = s.startTime ? new Date(String(s.startTime)) : (s.endTime ? new Date(String(s.endTime)) : null);
          if (!d || isNaN(d.getTime())) return false;
          if (fromDate && d < fromDate) return false;
          if (toDate && d > toDate) return false;
          return true;
        });
      }

      res.json(sessions);
    } catch (error) {
      console.error("Error fetching photography sessions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Alias route for frontend compatibility
  app.get("/api/photography-sessions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const photographerId = req.query.photographerId as string;
      const sessions = await storage.getPhotographySessions(photographerId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching photography sessions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Single, stable debug public endpoint (no auth) to return up to 50 sessions for frontend testing
  // Keep this endpoint lightweight and predictable; remove or secure before production.
  app.get("/api/debug/photography-sessions", async (req: Request, res: Response) => {
    try {
      const photographerId = req.query.photographerId as string | undefined;
      const q = (req.query.q as string | undefined)?.toLowerCase();
      const date = req.query.date as string | undefined; // YYYY-MM-DD
      const month = req.query.month as string | undefined; // MM
      const year = req.query.year as string | undefined; // YYYY
      const limit = Math.max(1, Math.min(1000, Number(req.query.limit ?? 50)));
      console.error(`DEBUG_ENDPOINT_HIT | pid=${photographerId || '<none>'} | q=${q || ''} | date=${date || ''} | month=${month || ''} | year=${year || ''} | limit=${limit}`);
      let sessions = await storage.getPhotographySessions(photographerId);
      if (!Array.isArray(sessions)) {
        console.error('DEBUG_ENDPOINT_RESULT | sessions not array');
        return res.status(200).json([]);
      }

      // Apply query filters in-memory to keep endpoint simple
      if (q) {
        const needle = q;
        sessions = sessions.filter(s =>
          (s.title || '').toLowerCase().includes(needle) ||
          (s.clientName || '').toLowerCase().includes(needle) ||
          (s.description || '').toLowerCase().includes(needle)
        );
      }

      if (date || month || year) {
        sessions = sessions.filter(s => {
          const d = s.startTime ? new Date(s.startTime) : (s.endTime ? new Date(s.endTime) : null);
          if (!d || isNaN(d.getTime())) return false;
          if (date) {
            // match exact day
            const y = d.getFullYear();
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const day = d.getDate().toString().padStart(2, '0');
            if (`${y}-${m}-${day}` !== date) return false;
          }
          if (month) {
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            if (m !== month.padStart(2, '0')) return false;
          }
          if (year) {
            if (d.getFullYear().toString() !== year) return false;
          }
          return true;
        });
      }

      // Sort by startTime ascending
      sessions.sort((a: any, b: any) => new Date(a.startTime as any).getTime() - new Date(b.startTime as any).getTime());

      console.error(`DEBUG_ENDPOINT_RESULT | found=${sessions.length} | returning=${Math.min(limit, sessions.length)}`);
      return res.status(200).json(sessions.slice(0, limit));
    } catch (error) {
      console.error('Error fetching debug photography sessions:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get("/api/photography/sessions/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const session = await storage.getPhotographySession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Error fetching photography session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/photography/sessions", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log("Received session data:", JSON.stringify(req.body, null, 2));
      const sessionData = { 
        ...req.body,
        id: req.body.id || crypto.randomUUID(),
        createdBy: req.user!.id, 
        photographerId: req.user!.id,
        title: req.body.title || 'Untitled Session',
        // Convert string dates to Date objects if they're strings
        startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
        // Clean up empty strings to null for optional fields
        clientId: req.body.clientId || null,
        clientEmail: req.body.clientEmail || null,
        locationName: req.body.locationName || null,
        locationAddress: req.body.locationAddress || null,
        locationCoordinates: req.body.locationCoordinates || null,
      };
      console.log("Session data with user info:", JSON.stringify(sessionData, null, 2));
      const validatedData = insertPhotographySessionSchema.parse(sessionData);
      const session = await storage.createPhotographySession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Validation error details:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating photography session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/photography/sessions/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const body = req.body;
      // Build a clean updates object with only recognized photography_sessions columns
      const updates: Record<string, any> = {};
      if (body.title !== undefined) updates.title = body.title;
      if (body.description !== undefined) updates.description = body.description || null;
      if (body.sessionType !== undefined) updates.sessionType = body.sessionType;
      if (body.status !== undefined) updates.status = body.status;
      if (body.startTime !== undefined) updates.startTime = body.startTime ? new Date(body.startTime) : null;
      if (body.endTime !== undefined) updates.endTime = body.endTime ? new Date(body.endTime) : null;
      if (body.clientId !== undefined) updates.clientId = body.clientId || null;
      if (body.clientName !== undefined) updates.clientName = body.clientName || null;
      if (body.clientEmail !== undefined) updates.clientEmail = body.clientEmail || null;
      if (body.clientPhone !== undefined) updates.clientPhone = body.clientPhone || null;
      if (body.locationName !== undefined) updates.locationName = body.locationName || null;
      if (body.locationAddress !== undefined) updates.locationAddress = body.locationAddress || null;
      if (body.locationCoordinates !== undefined) updates.locationCoordinates = body.locationCoordinates || null;
      if (body.basePrice !== undefined) updates.basePrice = body.basePrice ? String(body.basePrice) : null;
      if (body.depositAmount !== undefined) updates.depositAmount = body.depositAmount ? String(body.depositAmount) : null;
      if (body.depositPaid !== undefined) updates.depositPaid = body.depositPaid;
      if (body.equipmentList !== undefined) updates.equipmentList = Array.isArray(body.equipmentList) ? body.equipmentList : [];
      if (body.weatherDependent !== undefined) updates.weatherDependent = body.weatherDependent;
      if (body.goldenHourOptimized !== undefined) updates.goldenHourOptimized = body.goldenHourOptimized;
      if (body.portfolioWorthy !== undefined) updates.portfolioWorthy = body.portfolioWorthy;
      if (body.notes !== undefined) updates.notes = body.notes || null;
      if (body.backupPlan !== undefined) updates.backupPlan = body.backupPlan || null;
      if (body.editingStatus !== undefined) updates.editingStatus = body.editingStatus;
      if (body.deliveryStatus !== undefined) updates.deliveryStatus = body.deliveryStatus;
      updates.updatedAt = new Date();

      console.log("PUT /api/photography/sessions/:id - updating with:", JSON.stringify(updates, null, 2));
      const session = await storage.updatePhotographySession(req.params.id, updates);
      res.json(session);
    } catch (error) {
      console.error("Error updating photography session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/photography/sessions/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deletePhotographySession(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting photography session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== CALENDAR ROUTES ====================
  
  // GET /api/calendar/sessions - Retrieve calendar sessions with filters
  app.get("/api/calendar/sessions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { 
        start_date, 
        end_date, 
        client_id, 
        session_type, 
        status,
        limit = '5000'
      } = req.query;

      let query = `
        SELECT 
          ps.id,
          ps.client_id,
          ps.title,
          ps.session_type,
          ps.start_time as "startTime",
          ps.end_time as "endTime",
          ps.location_name as "locationName",
          ps.location_address as "locationAddress",
          ps.notes,
          ps.base_price as "basePrice",
          ps.deposit_amount as "depositAmount",
          ps.deposit_paid as "depositPaid",
          ps.equipment_list as "equipmentList",
          ps.status,
          ps.client_name as "clientName",
          ps.client_email as "clientEmail",
          ps.client_phone as "clientPhone",
          ps.google_calendar_event_id as "googleCalendarEventId",
          ps.created_at as "createdAt",
          ps.updated_at as "updatedAt",
          c.first_name || ' ' || c.last_name as "joinedClientName",
          c.email as "joinedClientEmail",
          c.phone as "joinedClientPhone"
        FROM photography_sessions ps
        LEFT JOIN crm_clients c ON ps.client_id = c.id::text
      `;

      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (start_date) {
        conditions.push(`ps.start_time >= $${paramIndex}`);
        values.push(start_date);
        paramIndex++;
      }
      
      if (end_date) {
        conditions.push(`ps.start_time <= $${paramIndex}`);
        values.push(end_date);
        paramIndex++;
      }
      
      if (client_id) {
        conditions.push(`ps.client_id = $${paramIndex}`);
        values.push(client_id);
        paramIndex++;
      }
      
      if (session_type) {
        conditions.push(`ps.session_type = $${paramIndex}`);
        values.push(session_type);
        paramIndex++;
      }
      
      if (status) {
        conditions.push(`ps.status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      // Always exclude cancelled sessions unless explicitly requested
      if (!status) {
        conditions.push(`LOWER(ps.status) != 'cancelled'`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ` ORDER BY ps.start_time ASC LIMIT $${paramIndex}`;
      values.push(parseInt(limit as string));

      const sessions = await runSql(query, values);
      res.json(sessions);
    } catch (error) {
      console.error('Failed to fetch calendar sessions:', error);
      res.status(500).json({ error: 'Failed to fetch calendar sessions' });
    }
  });

  // POST /api/calendar/sessions - Create new photography session
  app.post("/api/calendar/sessions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const {
        client_id,
        session_type,
        title,
        start_time,
        end_time,
        session_date,
        duration_minutes = 120,
        location_name,
        location_address,
        location,
        notes = '',
        base_price = 0,
        price = 0,
        deposit_amount = 0,
        deposit_required = 0,
        equipment_list = [],
        equipment_needed = []
      } = req.body;

      // Support both old and new field names
      const actualStartTime = start_time || session_date;
      const actualEndTime = end_time || (actualStartTime ? new Date(new Date(actualStartTime).getTime() + (duration_minutes * 60 * 1000)).toISOString() : null);
      const actualLocation = location_name || location || '';
      const actualPrice = base_price || price || 0;
      const actualDeposit = deposit_amount || deposit_required || 0;
      const actualEquipment = equipment_list.length > 0 ? equipment_list : equipment_needed;

      // Validate required fields
      if (!client_id || !session_type || !actualStartTime) {
        return res.status(400).json({ 
          error: 'Missing required fields: client_id, session_type, start_time (or session_date)' 
        });
      }

      const sessionId = crypto.randomUUID();
      
      await runSql(
        `INSERT INTO photography_sessions (
          id, client_id, session_type, title, start_time, end_time,
          location_name, location_address, notes, base_price, deposit_amount, equipment_list,
          status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'scheduled', NOW(), NOW())`,
        [sessionId, client_id, session_type, title || session_type, actualStartTime, actualEndTime, actualLocation, location_address || '', notes, actualPrice, actualDeposit, JSON.stringify(actualEquipment)]
      );

      const [newSession] = (await runSql(`SELECT * FROM photography_sessions WHERE id = $1`, [sessionId]));

      res.status(201).json(newSession);
    } catch (error) {
      console.error('Failed to create photography session:', error);
      res.status(500).json({ error: 'Failed to create photography session' });
    }
  });

  // PUT /api/calendar/sessions/:id - Update photography session
  app.put("/api/calendar/sessions/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      
      // Remove ID from update data
      delete updateData.id;
      
      const updates = [];
      const values = [];
      let paramIndex = 1;

      Object.keys(updateData).forEach(key => {
        if (key !== 'id') {
          updates.push(`${key} = $${paramIndex}`);
          values.push(updateData[key]);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No update data provided' });
      }

      updates.push('updated_at = NOW()');
      values.push(id);

      const query = `
        UPDATE photography_sessions 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

  const result = await runSql(query, values);

      if (result.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json(result[0]);
    } catch (error) {
      console.error('Failed to update photography session:', error);
      res.status(500).json({ error: 'Failed to update photography session' });
    }
  });

  // DELETE /api/calendar/sessions/:id - Cancel photography session
  app.delete("/api/calendar/sessions/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { cancellation_reason, refund_amount = 0 } = req.body;

      const result = await runSql(
        `UPDATE photography_sessions
        SET status = 'CANCELLED', 
            cancellation_reason = $1, 
            refund_amount = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *`,
        [cancellation_reason, refund_amount, id]
      );

      if (result.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({ 
        message: 'Session cancelled successfully', 
        session: result[0] 
      });
    } catch (error) {
      console.error('Failed to cancel photography session:', error);
      res.status(500).json({ error: 'Failed to cancel photography session' });
    }
  });

  // GET /api/calendar/availability - Check calendar availability
  app.get("/api/calendar/availability", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { date, duration_minutes = '120' } = req.query;

      if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
      }

      // Get existing sessions for the date
      const existingSessions = await runSql(
        `SELECT start_time, end_time
        FROM photography_sessions
        WHERE DATE(start_time) = $1
        AND status IN ('scheduled', 'confirmed', 'CONFIRMED', 'PENDING')
        ORDER BY start_time`,
        [date]
      );

      // Define working hours (9 AM to 6 PM)
      const workingHours = { start: 9, end: 18 };
      const requestedDuration = parseInt(duration_minutes as string);

      const availableSlots = [];
      const bookedSlots = existingSessions.map((session: any) => {
        const sessionStart = new Date(session.start_time);
        const sessionEnd = new Date(session.end_time);
        return {
          start: sessionStart.getHours() + (sessionStart.getMinutes() / 60),
          end: sessionEnd.getHours() + (sessionEnd.getMinutes() / 60)
        };
      });

      // Check each hour slot
      for (let hour = workingHours.start; hour < workingHours.end; hour++) {
        const slotEnd = hour + (requestedDuration / 60);
        
        if (slotEnd <= workingHours.end) {
          const isAvailable = !bookedSlots.some(booked => 
            (hour < booked.end && slotEnd > booked.start)
          );

          if (isAvailable) {
            availableSlots.push({
              time: `${hour.toString().padStart(2, '0')}:00`,
              duration: `${requestedDuration} minutes`
            });
          }
        }
      }

      res.json({
        date,
        total_available_slots: availableSlots.length,
        available_slots: availableSlots,
        booked_sessions: existingSessions.length
      });
    } catch (error) {
      console.error('Failed to check calendar availability:', error);
      res.status(500).json({ error: 'Failed to check calendar availability' });
    }
  });

  // ------------------ Embed / Public Booking endpoints ------------------

  // Admin: set available slots (protected) - persisted in DB
  app.post('/api/admin/embed/slots', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { slots, studioId } = req.body;
      if (!Array.isArray(slots)) return res.status(400).json({ error: 'slots must be an array of ISO datetimes' });
      if (!studioId) return res.status(400).json({ error: 'studioId is required' });

      // Mark existing slots for studio inactive and insert new ones
      await runSql(`UPDATE studio_available_slots SET is_active = false WHERE studio_id = $1`, [studioId]);

      const inserted: any[] = [];
      for (const s of slots) {
        if (typeof s !== 'string') continue;
        const start = new Date(s);
        if (isNaN(start.getTime())) continue;
        const r = await runSql(`INSERT INTO studio_available_slots (studio_id, start_time, duration_minutes, is_active, created_at, updated_at) VALUES ($1,$2,$3,true,NOW(),NOW()) RETURNING *`, [studioId, start.toISOString(), 120]);
        if (r && r[0]) inserted.push(r[0]);
      }

      res.json({ success: true, slots: inserted });
    } catch (error) {
      console.error('Failed to save available slots:', error);
      res.status(500).json({ error: 'Failed to save available slots' });
    }
  });

  // Public: get embed availability between start and end (ISO)
  app.get('/api/embed/availability', async (req: Request, res: Response) => {
    try {
      const { start, end, calendarId } = req.query as any;
      if (!start || !end) return res.status(400).json({ error: 'start and end query parameters are required (ISO date strings)' });

      const startDate = new Date(start);
      const endDate = new Date(end);

      // Load admin slots from DB
      const studioId = req.query.studioId as string | undefined;
      let adminRows: any[] = [];
      if (studioId) {
        adminRows = await runSql(`SELECT start_time FROM studio_available_slots WHERE studio_id = $1 AND is_active = true AND start_time >= $2 AND start_time <= $3`, [studioId, startDate.toISOString(), endDate.toISOString()]);
      } else {
        adminRows = await runSql(`SELECT start_time FROM studio_available_slots WHERE is_active = true AND start_time >= $1 AND start_time <= $2`, [startDate.toISOString(), endDate.toISOString()]);
      }
      const adminSlots = adminRows.map(r => new Date(r.start_time));

      // Filter to requested window
      let candidateSlots = adminSlots.filter(d => d >= startDate && d <= endDate);

      // Remove slots that conflict with existing confirmed/pending sessions
      const existing = await runSql(
        `SELECT session_date, duration_minutes FROM photography_sessions WHERE session_date >= $1 AND session_date <= $2 AND status IN ('CONFIRMED','PENDING')`,
        [startDate.toISOString(), endDate.toISOString()]
      );

      const busyRanges = existing.map((s: any) => {
        const sd = new Date(s.session_date);
        return { start: sd.getTime(), end: sd.getTime() + (s.duration_minutes || 120) * 60000 };
      });

      const isBusy = (t: Date) => busyRanges.some(b => t.getTime() < b.end && (t.getTime() + 1) > b.start);

      candidateSlots = candidateSlots.filter(d => !isBusy(d));

  // If Google API key + calendarId provided (either query or env), try to fetch events and remove busy times
      const googleKey = process.env.GOOGLE_API_KEY;
      const googleCal = calendarId || process.env.GOOGLE_CALENDAR_ID;
      if (googleKey && googleCal) {
        try {
          const timeMin = startDate.toISOString();
          const timeMax = endDate.toISOString();
          const eventsUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCal)}/events?singleEvents=true&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&key=${encodeURIComponent(googleKey)}`;
          const resp = await fetch(eventsUrl);
          if (resp.ok) {
            const data = await resp.json();
            const gBusy = (data.items || []).map((it: any) => ({
              start: new Date(it.start?.dateTime || it.start?.date).getTime(),
              end: new Date(it.end?.dateTime || it.end?.date).getTime()
            }));
            candidateSlots = candidateSlots.filter(d => !gBusy.some((b: any) => d.getTime() < b.end && (d.getTime() + 1) > b.start));
          }
        } catch (err) {
          console.warn('Google Calendar fetch failed:', err);
        }
      }

  res.json({ start, end, available: candidateSlots.map(d => d.toISOString()), total: candidateSlots.length });
    } catch (error) {
      console.error('Failed to return embed availability:', error);
      res.status(500).json({ error: 'Failed to return availability' });
    }
  });

  // Public: create a booking from embed widget
  app.post('/api/embed/book', async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, phone, startTime, duration_minutes = 120, session_type = 'session' } = req.body;
      if (!firstName || !email || !startTime) return res.status(400).json({ error: 'firstName, email and startTime are required' });

      const start = new Date(startTime);
      if (isNaN(start.getTime())) return res.status(400).json({ error: 'Invalid startTime' });

      // Check conflict with existing sessions
      const conflict = await runSql(
        `SELECT session_date, duration_minutes FROM photography_sessions WHERE session_date >= $1 - INTERVAL '1 hour' AND session_date <= $2 + INTERVAL '1 hour' AND status IN ('CONFIRMED','PENDING')`,
        [new Date(start.getTime() - 60 * 60 * 1000).toISOString(), new Date(start.getTime() + (duration_minutes + 60) * 60000).toISOString()]
      );
      if (conflict && conflict.length > 0) return res.status(409).json({ error: 'Requested time conflicts with an existing session' });

      // Find or create client by email
      let client = null;
      const found = await runSql(`SELECT * FROM crm_clients WHERE email = $1 LIMIT 1`, [email]);
      if (found && found.length > 0) {
        client = found[0];
      } else {
        const clientData = { firstName, lastName, email, phone };
        client = await storage.createCrmClient(clientData as any);
      }

      // Create photography session in DB
      const insertResult = await runSql(
        `INSERT INTO photography_sessions (client_id, session_type, session_date, duration_minutes, status, created_by, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) RETURNING *`,
        [String(client.id), session_type, start.toISOString(), Number(duration_minutes), 'CONFIRMED', 'embed']
      );

      const created = insertResult[0];

      // Try to create Google Calendar event and save the google event id if available
      try {
        const studioCalendarService = await import('./services/calendarService').then(m => m.default);
        const googleEvent = await studioCalendarService.createGoogleEventPublic({
          summary: `${session_type} - ${client.first_name || client.firstName || ''} ${client.last_name || client.lastName || ''}`.trim(),
          description: `Booked via embed widget by ${client.email || ''}`,
          start: { dateTime: start.toISOString(), timeZone: 'Europe/Vienna' },
          end: { dateTime: new Date(start.getTime() + Number(duration_minutes) * 60000).toISOString(), timeZone: 'Europe/Vienna' },
          attendees: client.email ? [{ email: client.email }] : undefined,
        });

        if (googleEvent && googleEvent.id) {
          await runSql(`UPDATE photography_sessions SET google_calendar_event_id = $1 WHERE id = $2`, [googleEvent.id, created.id]);
        }
      } catch (googleErr) {
        console.warn('Google event creation failed, continuing:', googleErr);
      }

      res.status(201).json({ success: true, booking: created });
    } catch (error) {
      console.error('Failed to create embed booking:', error);
      res.status(500).json({ error: 'Failed to create booking' });
    }
  });

  // ==================== GALLERY ROUTES ====================
  app.get("/api/galleries", async (req: Request, res: Response) => {
    try {
      // Fetch public galleries with client information
      const result = await pool.query(`
        SELECT 
          g.id,
          g.title,
          g.slug,
          g.description,
          g.cover_image as "coverImage",
          g.cover_position as "coverPosition",
          g.cover_scale as "coverScale",
          g.cover_template as "coverTemplate",
          g.is_public as "isPublic",
          g.is_password_protected as "isPasswordProtected",
          g.client_id as "clientId",
          g.created_by as "createdBy",
          g.sort_order as "sortOrder",
          g.created_at as "createdAt",
          g.updated_at as "updatedAt",
          c.first_name || ' ' || c.last_name as "clientName",
          c.email as "clientEmail",
          (SELECT COUNT(*) FROM gallery_images gi WHERE gi.gallery_id = g.id) as "imageCount"
        FROM galleries g
        LEFT JOIN crm_clients c ON g.client_id = c.id
        WHERE g.is_public = true
        ORDER BY g.created_at DESC
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching galleries:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/galleries/:slug", async (req: Request, res: Response) => {
    try {
      const idOrSlug = req.params.slug;
      
      // First try to find by slug
      let gallery = await storage.getGalleryBySlug(idOrSlug);
      
      // If not found by slug, try finding by ID
      if (!gallery) {
        try {
          gallery = await storage.getGallery(idOrSlug);
        } catch (e) {
          // ID lookup might fail if not a valid UUID, ignore
        }
      }
      
      if (!gallery) {
        return res.status(404).json({ error: "Gallery not found" });
      }

      // Fetch featured image if it exists
      if ((gallery as any).featuredImageId) {
        const featuredImageResult = await pool.query(
          `SELECT id, filename, url, title, description
           FROM gallery_images 
           WHERE id = $1`,
          [(gallery as any).featuredImageId]
        );
        if (featuredImageResult.rows.length > 0) {
          const img = featuredImageResult.rows[0];
          (gallery as any).featuredImage = {
            id: img.id,
            filename: img.filename,
            originalUrl: img.url,
            displayUrl: img.url,
            thumbUrl: img.url,
            title: img.title,
            description: img.description
          };
        }
      }

      // Reliable expiry / archival: once the expiry date passes (or the gallery
      // is archived), it is no longer available to clients.
      const expiresAt = (gallery as any).expiresAt;
      const isExpired = (expiresAt && new Date(expiresAt).getTime() < Date.now())
        || (gallery as any).status === 'ARCHIVED';
      if (isExpired) {
        return res.status(410).json({ error: 'gallery_expired', message: 'This gallery is no longer available.' });
      }

      // SECURITY: Never expose the actual password to the client
      // Only send the isPasswordProtected boolean flag
      const { password, ...safeGallery } = gallery;
      res.json(safeGallery);
    } catch (error) {
      console.error("Error fetching gallery:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/galleries", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log('[GALLERY CREATE] User:', req.user);
      console.log('[GALLERY CREATE] Body:', req.body);
      // Don't set createdBy since it has a foreign key constraint to users table
      // Admin users are in admin_users table, not users table
      const galleryData = { ...req.body };
      delete galleryData.createdBy; // Remove if it was sent from client
      
      // Generate slug from title if not provided
      if (galleryData.title && !galleryData.slug) {
        galleryData.slug = galleryData.title
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
          .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
          .substring(0, 100); // Limit length
      }
      
      // Persist the delivery/protection toggles the wizard sends (previously
      // silently dropped). Map the UI field names to the schema columns and
      // coerce the expiry date so a future date actually takes effect.
      if (galleryData.watermarkEnabled !== undefined) { galleryData.visibleWatermark = !!galleryData.watermarkEnabled; delete galleryData.watermarkEnabled; }
      if (galleryData.invisibleWatermarkEnabled !== undefined) { galleryData.invisibleWatermark = !!galleryData.invisibleWatermarkEnabled; delete galleryData.invisibleWatermarkEnabled; }
      if (galleryData.expiresAt !== undefined) galleryData.expiresAt = galleryData.expiresAt ? new Date(galleryData.expiresAt) : null;

      const validatedData = insertGallerySchema.parse(galleryData);
      const gallery = await storage.createGallery(validatedData);
      res.status(201).json(gallery);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[GALLERY CREATE] Validation error:', error.errors);
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("[GALLERY CREATE] Error creating gallery:", error);
      res.status(500).json({ error: "Internal server error", message: error.message });
    }
  });

  // NOTE: Gallery PUT endpoint moved to line ~4000 with better field mapping

  app.delete("/api/galleries/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteGallery(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting gallery:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Gallery authentication endpoint (public)
  app.post("/api/galleries/:slug/auth", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const { email, firstName, lastName, password } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Get the gallery
      const gallery = await storage.getGalleryBySlug(slug);
      if (!gallery) {
        return res.status(404).json({ error: "Gallery not found" });
      }

      // Expired / archived galleries can't be opened.
      const expAt = (gallery as any).expiresAt;
      if ((expAt && new Date(expAt).getTime() < Date.now()) || (gallery as any).status === 'ARCHIVED') {
        return res.status(410).json({ error: 'gallery_expired', message: 'This gallery is no longer available.' });
      }

      // Check password if gallery is password protected
      if (gallery.isPasswordProtected && gallery.password) {
        if (!password) {
          return res.status(401).json({ error: "Password is required" });
        }

        // Simple password comparison (in production, use hashed passwords)
        if (password !== gallery.password) {
          return res.status(401).json({ error: "Invalid password" });
        }
      }

      // For now, return a simple token (in production, use JWT)
      const token = Buffer.from(`${gallery.id}:${email}:${Date.now()}`).toString('base64');
      
      res.json({ token });
    } catch (error) {
      console.error("Error authenticating gallery access:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: Get gallery images by ID (no token required, uses session auth)
  app.get("/api/admin/galleries/:id/images", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      console.log(`[ADMIN GALLERY IMAGES] Fetching images for gallery ${id}`);
      
      // Get gallery images from database
      const galleryImages = await storage.getGalleryImages(id);
      
      console.log(`[ADMIN GALLERY IMAGES] Gallery ${id}: Found ${galleryImages?.length || 0} images in database`);
      if (galleryImages && galleryImages.length > 0) {
        console.log(`[ADMIN GALLERY IMAGES] First image raw data:`, JSON.stringify(galleryImages[0], null, 2));
        console.log(`[ADMIN GALLERY IMAGES] All image IDs:`, galleryImages.map(img => img.id));
      } else {
        console.log(`[ADMIN GALLERY IMAGES] No images found in database for gallery ${id}`);
      }
      
      // Transform to match frontend expectations
      const transformedImages = (galleryImages || []).map(img => ({
        id: img.id,
        galleryId: img.galleryId || img.gallery_id,
        filename: img.filename,
        originalUrl: img.url || img.originalUrl,
        displayUrl: img.url || img.displayUrl,
        thumbUrl: img.url || img.thumbUrl,
        url: img.url, // Also include raw url
        title: img.title,
        description: img.description,
        orderIndex: img.sortOrder || img.sort_order || 0,
        createdAt: img.createdAt || img.created_at,
        sizeBytes: 0,
        contentType: 'image/jpeg',
        capturedAt: null
      }));
      
      console.log(`[ADMIN GALLERY IMAGES] Returning ${transformedImages.length} transformed images to frontend`);
      if (transformedImages.length > 0) {
        console.log(`[ADMIN GALLERY IMAGES] First transformed image:`, JSON.stringify(transformedImages[0], null, 2));
      }
      
      res.json(transformedImages);
    } catch (error) {
      console.error("[ADMIN GALLERY IMAGES] Error fetching gallery images:", error);
      res.status(500).json({ error: "Failed to fetch gallery images" });
    }
  });

  // Upload images to a gallery (admin only)
  app.post("/api/galleries/:galleryId/upload", authenticateUser, upload.array('images', 50), async (req: Request, res: Response) => {
    try {
      const { galleryId } = req.params;
      const files = req.files as Express.Multer.File[];

      console.log(`[GALLERY UPLOAD] ======= UPLOAD REQUEST RECEIVED =======`);
      console.log(`[GALLERY UPLOAD] Gallery ID: ${galleryId}`);
      console.log(`[GALLERY UPLOAD] Files array exists:`, !!files);
      console.log(`[GALLERY UPLOAD] Files length:`, files?.length || 0);
      if (files && files.length > 0) {
        console.log(`[GALLERY UPLOAD] First file:`, {
          fieldname: files[0].fieldname,
          originalname: files[0].originalname,
          mimetype: files[0].mimetype,
          size: files[0].size,
          bufferExists: !!files[0].buffer,
          bufferLength: files[0].buffer?.length || 0
        });
      }
      console.log(`[GALLERY UPLOAD] Content-Type:`, req.headers['content-type']);

      if (!files || files.length === 0) {
        console.log('[GALLERY UPLOAD] ERROR: No files in request');
        console.log('[GALLERY UPLOAD] Returning 400 - No images provided');
        return res.status(400).json({ error: "No images provided" });
      }

      // Verify gallery exists
      const gallery = await storage.getGallery(galleryId);
      if (!gallery) {
        console.log('[GALLERY UPLOAD] Gallery not found:', galleryId);
        return res.status(404).json({ error: "Gallery not found" });
      }

      console.log(`[GALLERY UPLOAD] Starting upload of ${files.length} images to gallery ${galleryId}`);

      const uploadedImages: any[] = [];
      const errors: string[] = [];
      const s3Client = getS3Client();
      const s3Config = getS3Config();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const timestamp = Date.now();
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const key = `galleries/${galleryId}/${timestamp}-${sanitizedFilename}`;

        try {
          // Upload to B2/S3
          console.log(`[GALLERY UPLOAD] Attempting S3 upload for ${file.originalname}...`);
          await getS3Client().send(new PutObjectCommand({
            Bucket: s3Config.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          }));

          const imageUrl = buildPublicUrl(s3Config.bucket, s3Config.endpoint, key);
          console.log(`[GALLERY UPLOAD] S3 upload successful for image ${i + 1}/${files.length}: ${imageUrl}`);

          // Insert into gallery_images table
          console.log(`[GALLERY UPLOAD] Inserting image ${i + 1} into DB:`, {
            galleryId,
            filename: sanitizedFilename,
            url: imageUrl,
            title: file.originalname,
            sortOrder: i
          });
          
          const insertResult = await pool.query(`
            INSERT INTO gallery_images (gallery_id, filename, url, title, sort_order, size_bytes, content_type, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING id, gallery_id as "galleryId", filename, url, title, sort_order as "sortOrder", size_bytes as "sizeBytes", content_type as "contentType", created_at as "createdAt"
          `, [galleryId, sanitizedFilename, imageUrl, file.originalname, i, file.size, file.mimetype]);

          const insertedImage = insertResult.rows[0];
          console.log(`[GALLERY UPLOAD] DB insert successful. Inserted image ID:`, insertedImage.id);
          
          uploadedImages.push({
            id: insertedImage.id,
            galleryId: insertedImage.galleryId,
            filename: insertedImage.filename,
            originalUrl: insertedImage.url,
            displayUrl: insertedImage.url,
            thumbUrl: insertedImage.url,
            title: insertedImage.title,
            orderIndex: insertedImage.sortOrder || 0,
            createdAt: insertedImage.createdAt,
            sizeBytes: file.size,
            contentType: file.mimetype,
          });
          
          console.log(`[GALLERY UPLOAD] Added to uploadedImages array. Total uploaded so far: ${uploadedImages.length}`);
        } catch (uploadError) {
          const errorMsg = `Failed to upload ${file.originalname}: ${(uploadError as Error).message}`;
          console.error(`[GALLERY UPLOAD] ${errorMsg}`);
          console.error(`[GALLERY UPLOAD] Full error:`, uploadError);
          errors.push(errorMsg);
          // Continue with other images even if one fails
        }
      }

      console.log(`[GALLERY UPLOAD] Successfully uploaded ${uploadedImages.length} out of ${files.length} images to gallery ${galleryId}`);
      
      if (uploadedImages.length === 0 && errors.length > 0) {
        console.error(`[GALLERY UPLOAD] All uploads failed. Errors:`, errors);
        return res.status(500).json({ 
          error: "All uploads failed", 
          details: errors.join('; '),
          uploadedCount: 0,
          totalCount: files.length
        });
      }
      
      if (errors.length > 0) {
        console.warn(`[GALLERY UPLOAD] Some uploads failed:`, errors);
      }
      
      res.json(uploadedImages);
    } catch (error) {
      console.error("Error uploading gallery images:", error);
      res.status(500).json({ error: "Failed to upload images" });
    }
  });

  // Watermarking image proxy: streams a gallery image with the visible watermark
  // baked in (when the gallery has it enabled), so the clean original is never
  // exposed by URL. Best-effort: falls back to the clean resized image on error.
  app.get("/api/galleries/image/:imageId", async (req: Request, res: Response) => {
    try {
      const imageId = req.params.imageId;
      const w = Math.min(Math.max(parseInt(String(req.query.w || ''), 10) || 0, 0), 3000);
      const rows = await runSql(
        `SELECT gi.url, gi.filename, g.id AS gallery_id, g.visible_watermark, g.invisible_watermark, g.status, g.expires_at
           FROM gallery_images gi JOIN galleries g ON g.id = gi.gallery_id
          WHERE gi.id = $1`, [imageId]);
      if (!rows.length) return res.status(404).send('Image not found');
      const row = rows[0];
      if ((row.expires_at && new Date(row.expires_at).getTime() < Date.now()) || row.status === 'ARCHIVED') {
        return res.status(410).send('Gallery no longer available');
      }
      const url = row.url;
      if (!url || !/^https?:\/\//i.test(url)) return res.status(404).send('No image');
      let buf: Buffer;
      try { buf = await fetchGalleryOriginal(url); } catch { return res.status(502).send('Upstream error'); }
      const out = await processGalleryImage(buf, {
        text: watermarkText(),
        width: w > 0 ? w : undefined,
        watermark: row.visible_watermark === true,
        invisiblePayload: row.invisible_watermark === true ? galleryFingerprint(String(row.gallery_id)) : undefined,
        invisibleKey: invisibleKey(),
      });
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(out);
    } catch (e: any) {
      console.error('[gallery-image] error:', e?.message || e);
      res.status(500).send('Image error');
    }
  });

  // Download the whole gallery as a ZIP. Respects downloadEnabled + expiry, and
  // bakes the visible watermark into each image when the gallery uses it.
  app.get("/api/galleries/:slug/download", async (req: Request, res: Response) => {
    try {
      const gallery = await storage.getGalleryBySlug(req.params.slug);
      if (!gallery) return res.status(404).json({ error: 'Gallery not found' });
      const expAt = (gallery as any).expiresAt;
      if ((expAt && new Date(expAt).getTime() < Date.now()) || (gallery as any).status === 'ARCHIVED') {
        return res.status(410).json({ error: 'gallery_expired', message: 'This gallery is no longer available.' });
      }
      if ((gallery as any).downloadEnabled === false) {
        return res.status(403).json({ error: 'downloads_disabled', message: 'Downloads are disabled for this gallery.' });
      }
      const images = await storage.getGalleryImages(gallery.id);
      if (!images || images.length === 0) return res.status(404).json({ error: 'No images to download' });

      const wm = (gallery as any).visibleWatermark === true;
      const invis = (gallery as any).invisibleWatermark === true;
      const invisPayload = invis ? galleryFingerprint(String(gallery.id)) : undefined;
      const archiver = (await import('archiver')).default;
      const archive = archiver('zip', { zlib: { level: 6 } });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${(gallery.slug || 'gallery')}.zip"`);
      archive.on('error', (err: any) => { console.error('[gallery-zip] error:', err); try { res.status(500).end(); } catch {} });
      archive.pipe(res);

      for (let i = 0; i < images.length; i++) {
        const img: any = images[i];
        const url = img.url;
        if (!url || !/^https?:\/\//i.test(url)) continue;
        try {
          let buf = await fetchGalleryOriginal(url);
          if (wm || invis) buf = await processGalleryImage(buf, { text: watermarkText(), watermark: wm, invisiblePayload: invisPayload, invisibleKey: invisibleKey() });
          const name = img.filename || `image-${String(i + 1).padStart(3, '0')}.jpg`;
          archive.append(buf, { name });
        } catch (e) {
          console.warn('[gallery-zip] skipped an image:', (e as any)?.message || e);
        }
      }
      await archive.finalize();
    } catch (e: any) {
      console.error('[gallery-download] error:', e?.message || e);
      if (!res.headersSent) res.status(500).json({ error: 'download_failed' });
    }
  });

  // Forensic trace: upload a suspect/leaked image and recover the invisible
  // watermark to identify which gallery it came from.
  app.post("/api/galleries/trace", authenticateUser, upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file?.buffer) return res.status(400).json({ error: 'Upload an image file (field "image").' });
      const { data, info } = await sharp(req.file.buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
      const payload = extractInvisible(Buffer.from(data), info.width, info.height, info.channels, invisibleKey());
      if (payload == null) {
        return res.json({ found: false, message: 'No forensic watermark detected in this image.' });
      }
      const gals = await runSql(`SELECT id, title, slug, created_at FROM galleries`);
      const match = gals.find((g: any) => galleryFingerprint(String(g.id)) === payload);
      res.json({
        found: true,
        payload,
        gallery: match ? { id: match.id, title: match.title, slug: match.slug } : null,
        message: match
          ? `Traced to gallery "${match.title}" (/${match.slug}).`
          : 'Forensic watermark found, but no current gallery matches this id.',
      });
    } catch (e: any) {
      console.error('[gallery-trace] error:', e?.message || e);
      res.status(500).json({ error: 'trace_failed' });
    }
  });

  // Get gallery images (public, requires authentication token)
  app.get("/api/galleries/:slug/images", async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return res.status(401).json({ error: "Authentication token required" });
      }

      // Get the gallery first
      const gallery = await storage.getGalleryBySlug(slug);
      if (!gallery) {
        return res.status(404).json({ error: "Gallery not found" });
      }

      // Query Neon database for gallery images
      const galleryImages = await storage.getGalleryImages(gallery.id);

      // Transform database images to match frontend expectations
      if (galleryImages && galleryImages.length > 0) {
        // Route through the watermarking proxy when a mark is on (so the clean
        // original is never handed to the client) or when private delivery is
        // forced (GALLERY_PRIVATE_DELIVERY=true — used once the bucket is private).
        const useProxy = (gallery as any).visibleWatermark === true
          || (gallery as any).invisibleWatermark === true
          || process.env.GALLERY_PRIVATE_DELIVERY === 'true';
        const thumbFor = (u?: string) =>
          u && /^https?:\/\//i.test(u) ? `/api/proxy-image?w=600&url=${encodeURIComponent(u)}` : u;
        const transformedImages = galleryImages.map(img => {
          const raw = img.url || (img as any).originalUrl;
          const display = useProxy ? `/api/galleries/image/${img.id}?w=1600` : (raw || (img as any).displayUrl);
          const thumb = useProxy ? `/api/galleries/image/${img.id}?w=600` : thumbFor(raw || (img as any).thumbUrl);
          const original = useProxy ? `/api/galleries/image/${img.id}` : (raw || (img as any).originalUrl);
          return {
            id: img.id,
            galleryId: img.galleryId || img.gallery_id,
            filename: img.filename,
            originalUrl: original,
            displayUrl: display,
            thumbUrl: thumb,
            title: img.title,
            description: img.description,
            orderIndex: img.sortOrder || img.sort_order || 0,
            createdAt: img.createdAt || img.created_at,
            sizeBytes: 0,
            contentType: 'image/jpeg',
            capturedAt: null
          };
        });

        return res.json(transformedImages);
      }

      // If no database records found, check local file storage
      if (!galleryImages || galleryImages.length === 0) {
        console.log('No database records found, checking local file storage...');
        
        // Check for gallery files in public/uploads/galleries
        const fs = await import('fs/promises');
        const path = await import('path');
        
        try {
          const galleryPath = path.join(process.cwd(), 'public', 'uploads', 'galleries', gallery.id.toString());
          const files = await fs.readdir(galleryPath).catch(() => []);
          
          if (files.length > 0) {
            console.log(`Found ${files.length} local gallery files`);
            
            const localGalleryImages = await Promise.all(
              files
                .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                .map(async (file, index) => {
                  const filePath = path.join(galleryPath, file);
                  const stats = await fs.stat(filePath).catch(() => null);
                  
                  return {
                    id: `local-${file}`,
                    galleryId: gallery.id,
                    filename: file,
                    originalUrl: `/uploads/galleries/${gallery.id}/${file}`,
                    displayUrl: `/uploads/galleries/${gallery.id}/${file}`,
                    thumbUrl: `/uploads/galleries/${gallery.id}/${file}`,
                    title: `Image ${index + 1}`,
                    description: `Local image: ${file}`,
                    orderIndex: index,
                    createdAt: stats?.birthtime?.toISOString() || new Date().toISOString(),
                    sizeBytes: stats?.size || 0,
                    contentType: `image/${path.extname(file).slice(1)}`,
                    capturedAt: null
                  };
                })
            );
            
            res.json(localGalleryImages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            return;
          }
        } catch (error) {
          console.log('Error checking local gallery files:', error);
        }
        
      }
      
      // If no images found, return empty array (no sample/placeholder images)
      if (!galleryImages || galleryImages.length === 0) {
        res.json([]);
        return;
      }
      
      // Return gallery images from Neon database
      res.json(galleryImages);
    } catch (error) {
      console.error("Error fetching gallery images:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get products for print ordering
  app.get("/api/products", async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT id, name, description, category, price, size, is_active, sort_order 
         FROM products 
         WHERE is_active = true 
         ORDER BY category, sort_order`
      );

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Update image rating
  app.patch("/api/galleries/:galleryId/images/:imageId/rating", async (req: Request, res: Response) => {
    try {
      const { galleryId, imageId } = req.params;
      const { rating } = req.body;

      console.log('Rating update request:', { galleryId, imageId, rating });

      // Check if this is a sample/local file image (not in database)
      if (imageId.startsWith('sample-') || !imageId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        console.log('Sample image detected, rating not saved to database:', imageId);
        // Return success but don't save to database (sample images aren't in DB)
        return res.json({ success: true, rating, isSample: true });
      }

      // Validate rating value
      if (rating && !['love', 'maybe', 'reject'].includes(rating)) {
        console.error('Invalid rating value:', rating);
        return res.status(400).json({ error: "Invalid rating value" });
      }

      const result = await pool.query(
        `UPDATE gallery_images 
         SET rating = $1 
         WHERE id = $2 AND gallery_id = $3
         RETURNING id, rating`,
        [rating, imageId, galleryId]
      );

      console.log('Rating update result:', result.rows);

      if (result.rows.length === 0) {
        console.error('No image found with id:', imageId, 'in gallery:', galleryId);
        return res.status(404).json({ error: "Image not found" });
      }

      res.json({ success: true, rating });
    } catch (error) {
      console.error("Error updating image rating:", error);
      res.status(500).json({ error: "Failed to update rating", details: error.message });
    }
  });

  // Set gallery featured image
  app.put("/api/galleries/:galleryId/featured-image", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { galleryId } = req.params;
      const { imageId } = req.body;

      await pool.query(
        `UPDATE galleries 
         SET featured_image_id = $1 
         WHERE id = $2`,
        [imageId, galleryId]
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Error setting featured image:", error);
      res.status(500).json({ error: "Failed to set featured image" });
    }
  });

  // Admin dashboard stats route handled below with a safer implementation.

  // ==================== DASHBOARD METRICS ROUTE ====================
  // In development, allow unauthenticated access to avoid local session flakiness causing reload loops
  const devBypassAuth = (process.env.NODE_ENV || 'development') !== 'production';
  const disableAuthFlag = String(process.env.DISABLE_METRICS_AUTH || '').toLowerCase() === 'true';
  const metricsAuth: any = (devBypassAuth || disableAuthFlag) ? ((_: any, __: any, next: any) => next()) : authenticateUser;

  app.get("/api/crm/dashboard/metrics", metricsAuth, async (_req: Request, res: Response) => {
    try {
      // Use SQL aggregation queries instead of loading all records into memory
      const [revenueResult, invoiceCountResult, leadResult, sessionResult, clientResult, trendResult] = await Promise.all([
        // Total paid revenue + avg order value
        runSql(`SELECT COALESCE(SUM(total::numeric), 0) as total_revenue, COUNT(*) as paid_count FROM crm_invoices WHERE status = 'paid'`),
        // Total invoice count
        runSql(`SELECT COUNT(*) as total_count FROM crm_invoices`),
        // Active leads (new or contacted)
        runSql(`SELECT COUNT(*) as active_leads FROM crm_leads WHERE LOWER(status) IN ('new', 'contacted')`),
        // Upcoming sessions (future start_time)
        runSql(`SELECT COUNT(*) as upcoming FROM photography_sessions WHERE start_time > NOW()`),
        // Total clients
        runSql(`SELECT COUNT(*) as total_clients FROM crm_clients`),
        // Revenue trend last 7 days
        runSql(`
          SELECT d::date as date, COALESCE(SUM(i.total::numeric), 0) as value
          FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day') AS d
          LEFT JOIN crm_invoices i ON i.created_at::date = d::date AND i.status = 'paid'
          GROUP BY d::date
          ORDER BY d::date ASC
        `)
      ]);

      const totalRevenue = parseFloat(revenueResult[0]?.total_revenue || '0');
      const paidCount = parseInt(revenueResult[0]?.paid_count || '0', 10);
      const avgOrderValue = paidCount > 0 ? totalRevenue / paidCount : 0;
      const totalInvoices = parseInt(invoiceCountResult[0]?.total_count || '0', 10);
      const activeLeads = parseInt(leadResult[0]?.active_leads || '0', 10);
      const upcomingSessions = parseInt(sessionResult[0]?.upcoming || '0', 10);
      const totalClients = parseInt(clientResult[0]?.total_clients || '0', 10);

      const trendData = (trendResult || []).map((row: any) => ({
        date: new Date(row.date).toISOString().split('T')[0],
        value: parseFloat(row.value || '0')
      }));

      res.json({
        totalRevenue: Number(totalRevenue.toFixed(2)),
        paidRevenue: Number(totalRevenue.toFixed(2)),
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        totalInvoices,
        paidInvoices: paidCount,
        activeLeads,
        totalClients,
        upcomingSessions,
        trendData,
      });
    } catch (error: any) {
      console.error("[dashboard-metrics] Unexpected error:", error?.message || error);
      // Never take the dashboard down - return safe defaults
      res.json({
        totalRevenue: 0,
        paidRevenue: 0,
        avgOrderValue: 0,
        totalInvoices: 0,
        paidInvoices: 0,
        activeLeads: 0,
        totalClients: 0,
        upcomingSessions: 0,
        trendData: [],
      });
    }
  });

  // ==================== CALENDAR CLEANUP TOOLS (ADMIN) ====================
  // Detect suspicious "stacked" sessions sharing an identical start_time with high counts
  app.get("/api/admin/calendar/stacked-clusters", authenticateUser, async (req: Request, res: Response) => {
    try {
      const threshold = parseInt((req.query.threshold as string) || '20', 10);
      const limit = parseInt((req.query.limit as string) || '20', 10);

      const clusters = await runSql(
        `
        SELECT 
          to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as start_time_iso,
          COUNT(*)::int as count,
          SUM(CASE WHEN ical_uid IS NULL OR ical_uid = '' THEN 1 ELSE 0 END)::int as without_ical_uid,
          SUM(CASE WHEN ical_uid IS NOT NULL AND ical_uid <> '' THEN 1 ELSE 0 END)::int as with_ical_uid
        FROM photography_sessions
        GROUP BY start_time
        HAVING COUNT(*) >= $1
        ORDER BY count DESC
        LIMIT $2
        `,
        [threshold, limit]
      );

      // For the top cluster, provide a tiny sample for visibility
      let sample: any[] = [];
      if (clusters.length > 0) {
        const targetIso = clusters[0].start_time_iso;
        sample = await runSql(
          `
          SELECT id, title, ical_uid, created_at 
          FROM photography_sessions 
          WHERE to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') = $1
          ORDER BY created_at DESC
          LIMIT 5
          `,
          [targetIso]
        );
      }

      res.json({ success: true, threshold, clusters, sample });
    } catch (error) {
      console.error('Error detecting stacked clusters:', error);
      res.status(500).json({ success: false, error: 'Failed to detect clusters' });
    }
  });

  // Cleanup stacked sessions for a specific exact start_time ISO (UTC) stamp
  app.post("/api/admin/calendar/cleanup-stacked", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { targetStartTimeIso, onlyNullIcalUid = true, dryRun = true } = req.body || {};
      if (!targetStartTimeIso || typeof targetStartTimeIso !== 'string') {
        return res.status(400).json({ success: false, error: 'targetStartTimeIso (UTC ISO, e.g. 2025-09-08T16:36:48Z) is required' });
      }

      // Count matches first
      const counts = await runSql(
        `
        SELECT 
          COUNT(*)::int as total,
          SUM(CASE WHEN ical_uid IS NULL OR ical_uid = '' THEN 1 ELSE 0 END)::int as without_ical_uid,
          SUM(CASE WHEN ical_uid IS NOT NULL AND ical_uid <> '' THEN 1 ELSE 0 END)::int as with_ical_uid
        FROM photography_sessions
        WHERE to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') = $1
        `,
        [targetStartTimeIso]
      );

      const summary = counts?.[0] || { total: 0, without_ical_uid: 0, with_ical_uid: 0 };

      if (dryRun) {
        return res.json({ success: true, dryRun: true, targetStartTimeIso, summary });
      }

      // Perform deletion
      let deleteQuery = `
        DELETE FROM photography_sessions
        WHERE to_char(start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') = $1
      `;
      const params: any[] = [targetStartTimeIso];

      if (onlyNullIcalUid) {
        deleteQuery += ` AND (ical_uid IS NULL OR ical_uid = '')`;
      }

      const before = summary;
      await runSql(deleteQuery, params);

      res.json({ success: true, targetStartTimeIso, deleted: before, onlyNullIcalUid });
    } catch (error) {
      console.error('Error cleaning up stacked sessions:', error);
      res.status(500).json({ success: false, error: 'Failed to cleanup stacked sessions' });
    }
  });

  // Prune historical calendar sessions (admin)
  // Deletes sessions before a cutoff (default: start of today in Europe/Vienna)
  // Options:
  // - body.before: YYYY-MM-DD (Vienna local) optional
  // - body.includeNonImported: boolean (default false) if true, also delete rows without ical_uid
  // - body.dryRun: boolean (default true) to preview counts only
  app.post("/api/admin/calendar/prune-history", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { before, includeNonImported = false, dryRun = true } = req.body || {};
      const tz = process.env.DEFAULT_CAL_TZ || 'Europe/Vienna';

      let localIso: string;
      if (before && /\d{4}-\d{2}-\d{2}/.test(String(before))) {
        localIso = `${before}T00:00:00`;
      } else {
        // Default to start of today in Vienna
        const now = new Date();
        const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = dtf.format(now); // YYYY-MM-DD in Vienna
        localIso = `${parts}T00:00:00`;
      }
      const cutoffUtcIso = convertLocalToUtcIso(localIso, tz);

      const whereImported = includeNonImported ? 'TRUE' : `(ical_uid IS NOT NULL AND ical_uid <> '')`;

      const counts = await runSql(
        `SELECT 
           COUNT(*)::int AS total, 
           SUM(CASE WHEN ical_uid IS NOT NULL AND ical_uid <> '' THEN 1 ELSE 0 END)::int AS with_ical_uid,
           SUM(CASE WHEN ical_uid IS NULL OR ical_uid = '' THEN 1 ELSE 0 END)::int AS without_ical_uid
         FROM photography_sessions
         WHERE start_time < $1 AND ${whereImported}`,
        [cutoffUtcIso]
      );

      const summary = counts?.[0] || { total: 0, with_ical_uid: 0, without_ical_uid: 0 };
      if (dryRun) {
        return res.json({ success: true, dryRun: true, cutoffUtc: cutoffUtcIso, includeNonImported, summary });
      }

      const del = await runSql(
        `DELETE FROM photography_sessions WHERE start_time < $1 AND ${whereImported}`,
        [cutoffUtcIso]
      );

      res.json({ success: true, cutoffUtc: cutoffUtcIso, includeNonImported, deleted: summary });
    } catch (error) {
      console.error('Error pruning historical sessions:', error);
      res.status(500).json({ success: false, error: 'Failed to prune historical sessions' });
    }
  });

  // ==================== TOP CLIENTS ROUTES ====================
  app.get("/api/crm/top-clients", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { limit = 10, orderBy = 'lifetime_value', minRevenue, yearFilter } = req.query;
      
      // Aggregate invoices and sessions in SEPARATE subqueries (one row per client
      // each) BEFORE joining. Joining both to the client in one query multiplied
      // the invoice SUM by the session count (a cartesian fan-out), which is why a
      // €595 client with 2 sessions showed €1,190. Definitions:
      //   lifetime_value = collected (paid invoices) — matches the client detail page
      //   total_revenue  = billed (all invoices, any status) — so the two sort
      //                    options are genuinely different, not identical.
      const invYearFilter = yearFilter ? ` WHERE EXTRACT(YEAR FROM created_at) = ${Number(yearFilter)}` : '';
      // Top-clients list = clients who have actually paid something. With an
      // explicit minRevenue, use that as the floor; otherwise just > 0.
      const revClause = minRevenue
        ? `COALESCE(inv.paid_revenue, 0) >= ${Number(minRevenue)}`
        : `COALESCE(inv.paid_revenue, 0) > 0`;
      let query = `
        SELECT
          c.id,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.city,
          COALESCE(inv.all_revenue, 0)::double precision AS total_revenue,
          COALESCE(inv.paid_count, 0)::int AS invoice_count,
          COALESCE(sess.session_count, 0)::int AS session_count,
          inv.last_invoice_date AS last_invoice_date,
          sess.last_session_date AS last_session_date,
          COALESCE(inv.paid_revenue, 0)::double precision AS lifetime_value,
          COALESCE(inv.paid_revenue / NULLIF(inv.paid_count, 0), 0)::double precision AS average_invoice
        FROM crm_clients c
        LEFT JOIN (
          SELECT client_id,
                 SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END)::double precision AS paid_revenue,
                 SUM(total)::double precision AS all_revenue,
                 COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
                 MAX(created_at) FILTER (WHERE status = 'paid') AS last_invoice_date
          FROM crm_invoices${invYearFilter}
          GROUP BY client_id
        ) inv ON inv.client_id = c.id
        LEFT JOIN (
          SELECT client_id, COUNT(*) AS session_count, MAX(start_time) AS last_session_date
          FROM photography_sessions
          GROUP BY client_id
        ) sess ON sess.client_id = c.id::text
        WHERE ${revClause}
      `;

      // Add ordering - ensure clients with highest lifetime value appear first
      switch (orderBy) {
        case "total_revenue":
          query += ` ORDER BY total_revenue DESC, lifetime_value DESC`;
          break;
        case "lifetime_value":
          query += ` ORDER BY lifetime_value DESC, total_revenue DESC`;
          break;
        case "session_count":
          query += ` ORDER BY session_count DESC, lifetime_value DESC`;
          break;
        case "recent_activity":
          query += ` ORDER BY GREATEST(COALESCE(inv.last_invoice_date, CAST('1900-01-01' AS timestamp)), COALESCE(sess.last_session_date, CAST('1900-01-01' AS timestamp))) DESC, lifetime_value DESC`;
          break;
        default:
          query += ` ORDER BY lifetime_value DESC, total_revenue DESC`;
          break;
      }

      query += ` LIMIT ${Number(limit) || 10}`;
      
      const topClients = await runSql(query);
      res.json(topClients);
    } catch (error) {
      console.error('Error fetching top clients:', error);
      res.status(500).json({ error: "Failed to fetch top clients" });
    }
  });

  app.get("/api/crm/client-segments", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { segmentBy = 'revenue', includeStats = true } = req.query;
      
      let segmentQuery = "";
      
      switch (segmentBy) {
        case "revenue":
          segmentQuery = `
            SELECT 
              CASE 
                WHEN total_revenue >= 1000 THEN 'VIP (€1000+)'
                WHEN total_revenue >= 500 THEN 'Premium (€500-999)'
                WHEN total_revenue >= 200 THEN 'Standard (€200-499)'
                WHEN total_revenue > 0 THEN 'Basic (€1-199)'
                ELSE 'No Revenue'
              END as segment,
              COUNT(*) as client_count,
              SUM(total_revenue)::double precision as segment_revenue,
              AVG(total_revenue)::double precision as avg_revenue_per_client
            FROM (
              SELECT 
                c.id,
                COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END)::double precision, 0)::double precision as total_revenue
              FROM crm_clients c
              LEFT JOIN crm_invoices i ON c.id = i.client_id
              GROUP BY c.id
            ) client_revenues
            GROUP BY segment
            ORDER BY segment_revenue DESC
          `;
          break;
          
        case "frequency":
          segmentQuery = `
            SELECT 
              CASE 
                WHEN session_count >= 5 THEN 'Frequent (5+ sessions)'
                WHEN session_count >= 3 THEN 'Regular (3-4 sessions)'
                WHEN session_count >= 1 THEN 'Occasional (1-2 sessions)'
                ELSE 'No Sessions'
              END as segment,
              COUNT(*) as client_count,
              SUM(session_count)::int as total_sessions,
              AVG(session_count)::double precision as avg_sessions_per_client
            FROM (
              SELECT 
                c.id,
                COUNT(s.id) as session_count
              FROM crm_clients c
              LEFT JOIN photography_sessions s ON c.id::text = s.client_id
              GROUP BY c.id
            ) client_sessions
            GROUP BY segment
            ORDER BY total_sessions DESC
          `;
          break;
          
        case "geography":
          segmentQuery = `
            SELECT 
              COALESCE(city, 'Unknown') as segment,
              COUNT(*) as client_count,
              COALESCE(SUM(total_revenue)::double precision, 0)::double precision as segment_revenue
            FROM (
              SELECT 
                c.city,
                COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total ELSE 0 END)::double precision, 0)::double precision as total_revenue
              FROM crm_clients c
              LEFT JOIN crm_invoices i ON c.id = i.client_id
              GROUP BY c.id, c.city
            ) client_geo
            GROUP BY city
            ORDER BY client_count DESC
            LIMIT 10
          `;
          break;
      }
      
  const segments = await runSql(segmentQuery);
      res.json({ 
        segments,
        segmentBy,
        totalSegments: segments.length,
        message: `Client segmentation by ${segmentBy} completed`
      });
    } catch (error) {
      console.error('Error fetching client segments:', error);
      res.status(500).json({ error: "Failed to fetch client segments" });
    }
  });

  // ==================== ADMIN GALLERY ROUTES ====================
  // Get gallery analytics/stats (admin only)
  app.get("/api/admin/galleries/analytics", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Get total galleries count
      const totalGalleriesResult = await runSql(`SELECT COUNT(*) as count FROM galleries`);
      const totalGalleries = parseInt(totalGalleriesResult[0]?.count || '0');
      
      // Get total images count across all galleries
      const totalImagesResult = await runSql(`SELECT COUNT(*) as count FROM gallery_images`);
      const totalImages = parseInt(totalImagesResult[0]?.count || '0');
      
      // Get public galleries count
      const publicGalleriesResult = await runSql(`SELECT COUNT(*) as count FROM galleries WHERE is_public = true`);
      const publicGalleries = parseInt(publicGalleriesResult[0]?.count || '0');
      
      // Get password-protected galleries count
      const protectedGalleriesResult = await runSql(`SELECT COUNT(*) as count FROM galleries WHERE is_password_protected = true`);
      const protectedGalleries = parseInt(protectedGalleriesResult[0]?.count || '0');
      
      // Get total storage used by gallery images (size_bytes column)
      const storageResult = await runSql(`
        SELECT COALESCE(SUM(size_bytes), 0) as total_bytes 
        FROM gallery_images
      `);
      const totalStorageBytes = parseInt(storageResult[0]?.total_bytes || '0');
      
      res.json({
        totalGalleries,
        totalImages,
        publicGalleries,
        protectedGalleries,
        totalStorageBytes
      });
    } catch (error) {
      console.error('Error fetching gallery analytics:', error);
      res.status(500).json({ error: "Failed to fetch gallery analytics" });
    }
  });

  app.get("/api/admin/galleries", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { clientId, isPublic, limit = 100 } = req.query;
      
      let query = `
        SELECT 
          g.id,
          g.title,
          g.slug,
          g.description,
          g.cover_image,
          g.is_public,
          g.is_password_protected,
          g.client_id,
          g.created_at,
          g.updated_at,
          COALESCE(c.first_name || ' ' || c.last_name, 'Unknown Client') as client_name,
          c.email as client_email,
          COUNT(gi.id) as image_count
        FROM galleries g
        LEFT JOIN crm_clients c ON g.client_id = c.id
        LEFT JOIN gallery_images gi ON g.id = gi.gallery_id
      `;
      
      const conditions = [];
      const values = [];
      let paramIndex = 1;
      
      if (clientId) {
        conditions.push(`g.client_id = $${paramIndex}`);
        values.push(clientId);
        paramIndex++;
      }
      
      if (isPublic !== undefined) {
        conditions.push(`g.is_public = $${paramIndex}`);
        values.push(isPublic === 'true');
        paramIndex++;
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` GROUP BY g.id, c.first_name, c.last_name, c.email`;
      query += ` ORDER BY g.created_at DESC LIMIT $${paramIndex}`;
      values.push(parseInt(limit as string));
      
  const galleries = await runSql(query, values);
      res.json(galleries);
    } catch (error) {
      console.error('Error fetching galleries:', error);
      res.status(500).json({ error: "Failed to fetch galleries" });
    }
  });

  app.post("/api/galleries", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { title, description, clientId, isPublic = true, isPasswordProtected = false, password, slug, coverImage, coverPosition, coverScale, coverTemplate } = req.body;
      
      // Generate slug from title if not provided
      const gallerySlug = slug || title
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens  
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        .substring(0, 100); // Limit length
      
      const query = `
        INSERT INTO galleries (title, description, client_id, is_public, is_password_protected, password, slug, cover_image, cover_position, cover_scale, cover_template, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, title, slug, description, cover_image, cover_position, cover_scale, cover_template, is_public, created_at
      `;
      
  const result = await runSql(query, [
        title,
        description || null,
        clientId,
        isPublic,
        isPasswordProtected,
        password || null,
        gallerySlug,
        coverImage || null,
        coverPosition ? JSON.stringify(coverPosition) : JSON.stringify({ x: 50, y: 50 }),
        coverScale || 100,
        coverTemplate ? JSON.stringify(coverTemplate) : null,
        req.user?.id || null
      ]);
      
      // Transform response for frontend
      const gallery = result[0];
      res.status(201).json({
        ...gallery,
        coverImage: gallery.cover_image,
        coverPosition: gallery.cover_position || { x: 50, y: 50 },
        coverScale: gallery.cover_scale || 100,
        coverTemplate: gallery.cover_template || null,
        isPublic: gallery.is_public,
        createdAt: gallery.created_at
      });
    } catch (error) {
      console.error('Error creating gallery:', error);
      res.status(500).json({ error: "Failed to create gallery" });
    }
  });

  app.put("/api/galleries/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const galleryId = req.params.id;
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      // Map from both camelCase and snake_case to database column names
      const fieldMapping: Record<string, string> = {
        'title': 'title',
        'description': 'description',
        'isPublic': 'is_public',
        'is_public': 'is_public',
        'isPasswordProtected': 'is_password_protected',
        'is_password_protected': 'is_password_protected',
        'password': 'password',
        'coverImage': 'cover_image',
        'cover_image': 'cover_image',
        'coverPosition': 'cover_position',
        'cover_position': 'cover_position',
        'coverScale': 'cover_scale',
        'cover_scale': 'cover_scale',
        'coverTemplate': 'cover_template',
        'cover_template': 'cover_template',
        'clientId': 'client_id',
        'client_id': 'client_id',
        // Delivery / protection settings
        'downloadEnabled': 'download_enabled',
        'download_enabled': 'download_enabled',
        'watermarkEnabled': 'visible_watermark',
        'visibleWatermark': 'visible_watermark',
        'visible_watermark': 'visible_watermark',
        'invisibleWatermarkEnabled': 'invisible_watermark',
        'invisibleWatermark': 'invisible_watermark',
        'invisible_watermark': 'invisible_watermark',
        'expiresAt': 'expires_at',
        'expires_at': 'expires_at',
        'status': 'status',
      };
      
      const processedFields = new Set<string>(); // Avoid duplicate updates
      
      // If title is being updated, also update the slug
      const newTitle = req.body.title;
      if (newTitle) {
        const newSlug = newTitle
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
          .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
          .substring(0, 100); // Limit length
        updates.push(`slug = $${paramIndex}`);
        values.push(newSlug);
        paramIndex++;
        processedFields.add('slug');
      }
      
      for (const [key, value] of Object.entries(req.body)) {
        const dbField = fieldMapping[key];
        if (dbField && value !== undefined && !processedFields.has(dbField)) {
          processedFields.add(dbField);
          // For JSONB columns, use explicit cast
          if (dbField === 'cover_position' || dbField === 'cover_template') {
            updates.push(`${dbField} = $${paramIndex}::jsonb`);
            values.push(typeof value === 'string' ? value : JSON.stringify(value));
          } else if (dbField === 'expires_at') {
            // Empty/cleared date → NULL (no expiry); otherwise a real timestamp.
            updates.push(`${dbField} = $${paramIndex}`);
            values.push(value ? new Date(value as any) : null);
          } else {
            updates.push(`${dbField} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        }
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ error: "No valid updates provided" });
      }
      
      updates.push(`updated_at = NOW()`);
      
      const query = `
        UPDATE galleries 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}::uuid
        RETURNING id, title, slug, description, cover_image, cover_position, cover_scale, cover_template, is_public, updated_at
      `;
      values.push(galleryId);
      
      console.log('[GALLERY-UPDATE] Query:', query);
      console.log('[GALLERY-UPDATE] Values:', values.map((v, i) => `$${i+1}: ${typeof v === 'string' && v.length > 100 ? v.substring(0, 100) + '...' : v}`));
      
      const result = await runSql(query, values);
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Gallery not found" });
      }
      
      // Transform response for frontend
      const gallery = result[0];
      res.json({
        ...gallery,
        coverImage: gallery.cover_image,
        coverPosition: gallery.cover_position || { x: 50, y: 50 },
        coverScale: gallery.cover_scale || 100,
        coverTemplate: gallery.cover_template || null,
        isPublic: gallery.is_public,
        updatedAt: gallery.updated_at
      });
    } catch (error: any) {
      console.error('Error updating gallery:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      res.status(500).json({ error: error?.message || "Failed to update gallery" });
    }
  });

  app.delete("/api/galleries/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const galleryId = req.params.id;
      
      // Check if gallery exists
  const galleryCheck = await runSql(`SELECT title FROM galleries WHERE id = $1`, [galleryId]);
      
      if (galleryCheck.length === 0) {
        return res.status(404).json({ error: "Gallery not found" });
      }
      
      // Delete images first (cascade should handle this, but being explicit)
  await runSql(`DELETE FROM gallery_images WHERE gallery_id = $1`, [galleryId]);
      
      // Delete gallery
  await runSql(`DELETE FROM galleries WHERE id = $1`, [galleryId]);
      
      res.json({ 
        success: true, 
        message: `Gallery "${galleryCheck[0].title}" deleted successfully` 
      });
    } catch (error) {
      console.error('Error deleting gallery:', error);
      res.status(500).json({ error: "Failed to delete gallery" });
    }
  });

  app.get("/api/galleries/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const galleryId = req.params.id;
      
      const query = `
        SELECT 
          g.*,
          COALESCE(c.first_name || ' ' || c.last_name, 'Unknown Client') as client_name,
          c.email as client_email,
          COUNT(gi.id) as image_count
        FROM galleries g
        LEFT JOIN crm_clients c ON g.client_id = c.id
        LEFT JOIN gallery_images gi ON g.id = gi.gallery_id
        WHERE g.id = $1
        GROUP BY g.id, c.first_name, c.last_name, c.email
      `;
      
  const result = await runSql(query, [galleryId]);
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Gallery not found" });
      }
      
      // Transform snake_case to camelCase for frontend
      const gallery = result[0];
      const transformedGallery = {
        ...gallery,
        coverImage: gallery.cover_image,
        coverPosition: gallery.cover_position || { x: 50, y: 50 },
        coverScale: gallery.cover_scale || 100,
        coverTemplate: gallery.cover_template || null,
        isPublic: gallery.is_public,
        isPasswordProtected: gallery.is_password_protected,
        clientId: gallery.client_id,
        createdBy: gallery.created_by,
        sortOrder: gallery.sort_order,
        createdAt: gallery.created_at,
        updatedAt: gallery.updated_at,
        clientName: gallery.client_name,
        clientEmail: gallery.client_email,
        imageCount: gallery.image_count,
        downloadEnabled: gallery.download_enabled ?? true
      };
      
      res.json(transformedGallery);
    } catch (error) {
      console.error('Error fetching gallery:', error);
      res.status(500).json({ error: "Failed to fetch gallery" });
    }
  });

  // ==================== GALLERY ANALYTICS TRACKING ROUTES ====================
  
  // POST /api/galleries/:id/track-view - Track gallery view
  app.post("/api/galleries/:id/track-view", async (req: Request, res: Response) => {
    try {
      const galleryId = req.params.id;
      const { visitorEmail, visitorName, metadata } = req.body;
      
      // Update or create analytics record
      await runSql(`
        INSERT INTO gallery_analytics (gallery_id, view_count, last_viewed_at, updated_at)
        VALUES ($1, 1, NOW(), NOW())
        ON CONFLICT (gallery_id) DO UPDATE SET
          view_count = gallery_analytics.view_count + 1,
          last_viewed_at = NOW(),
          updated_at = NOW()
      `, [galleryId]);
      
      // Log activity
      await runSql(`
        INSERT INTO gallery_activity_log (gallery_id, activity_type, visitor_email, visitor_name, metadata)
        VALUES ($1, 'view', $2, $3, $4)
      `, [galleryId, visitorEmail || null, visitorName || null, JSON.stringify(metadata || {})]);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking gallery view:', error);
      res.status(500).json({ error: "Failed to track view" });
    }
  });
  
  // POST /api/galleries/:id/track-download - Track gallery download
  app.post("/api/galleries/:id/track-download", async (req: Request, res: Response) => {
    try {
      const galleryId = req.params.id;
      const { visitorEmail, visitorName, imageId, metadata } = req.body;
      
      // Update analytics record
      await runSql(`
        INSERT INTO gallery_analytics (gallery_id, download_count, last_downloaded_at, updated_at)
        VALUES ($1, 1, NOW(), NOW())
        ON CONFLICT (gallery_id) DO UPDATE SET
          download_count = gallery_analytics.download_count + 1,
          last_downloaded_at = NOW(),
          updated_at = NOW()
      `, [galleryId]);
      
      // Log activity
      await runSql(`
        INSERT INTO gallery_activity_log (gallery_id, activity_type, visitor_email, visitor_name, image_id, metadata)
        VALUES ($1, 'download', $2, $3, $4, $5)
      `, [galleryId, visitorEmail || null, visitorName || null, imageId || null, JSON.stringify(metadata || {})]);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking gallery download:', error);
      res.status(500).json({ error: "Failed to track download" });
    }
  });
  
  // POST /api/galleries/:id/capture-email - Capture visitor email
  app.post("/api/galleries/:id/capture-email", async (req: Request, res: Response) => {
    try {
      const galleryId = req.params.id;
      const { email, name, phone, source, metadata } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      // Check if email already captured for this gallery (to prevent duplicates)
      const existing = await runSql(`
        SELECT id FROM gallery_email_captures
        WHERE gallery_id = $1 AND email = $2
        LIMIT 1
      `, [galleryId, email]);
      
      if (existing.length === 0) {
        // Insert email capture
        await runSql(`
          INSERT INTO gallery_email_captures (gallery_id, email, name, phone, source, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [galleryId, email, name || null, phone || null, source || 'gallery_view', JSON.stringify(metadata || {})]);
        
        // Update analytics
        await runSql(`
          INSERT INTO gallery_analytics (gallery_id, email_capture_count, last_email_captured_at, updated_at)
          VALUES ($1, 1, NOW(), NOW())
          ON CONFLICT (gallery_id) DO UPDATE SET
            email_capture_count = gallery_analytics.email_capture_count + 1,
            last_email_captured_at = NOW(),
            updated_at = NOW()
        `, [galleryId]);
        
        // Log activity
        await runSql(`
          INSERT INTO gallery_activity_log (gallery_id, activity_type, visitor_email, visitor_name, metadata)
          VALUES ($1, 'email_capture', $2, $3, $4)
        `, [galleryId, email, name || null, JSON.stringify({ source, ...metadata })]);
      }
      
      res.json({ success: true, alreadyCaptured: existing.length > 0 });
    } catch (error) {
      console.error('Error capturing email:', error);
      res.status(500).json({ error: "Failed to capture email" });
    }
  });
  
  // GET /api/galleries/:id/analytics - Get gallery analytics (admin only)
  app.get("/api/galleries/:id/analytics", authenticateUser, async (req: Request, res: Response) => {
    try {
      const galleryId = req.params.id;
      
      // Get analytics summary
      const analytics = await runSql(`
        SELECT * FROM gallery_analytics WHERE gallery_id = $1
      `, [galleryId]);
      
      // Get recent activity (last 50)
      const recentActivity = await runSql(`
        SELECT * FROM gallery_activity_log
        WHERE gallery_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `, [galleryId]);
      
      // Get email captures
      const emailCaptures = await runSql(`
        SELECT * FROM gallery_email_captures
        WHERE gallery_id = $1
        ORDER BY captured_at DESC
      `, [galleryId]);
      
      res.json({
        analytics: analytics[0] || { viewCount: 0, downloadCount: 0, emailCaptureCount: 0 },
        recentActivity,
        emailCaptures
      });
    } catch (error) {
      console.error('Error fetching gallery analytics:', error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // ==================== GALLERY SHARING ROUTES ====================
  
  // POST /api/galleries/send-email - Send gallery link via email
  app.post("/api/galleries/send-email", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { gallery_id, slug, to, message, gallery_url } = req.body;
      
      if (!to || (!gallery_id && !slug)) {
        return res.status(400).json({ error: 'to and gallery_id or slug required' });
      }
      
      // Find gallery
      let gallery;
      if (slug) {
        const result = await runSql(`SELECT id, title, slug, is_password_protected, password FROM galleries WHERE slug = $1 LIMIT 1`, [slug]);
        gallery = result[0];
      } else {
        const result = await runSql(`SELECT id, title, slug, is_password_protected, password FROM galleries WHERE id = $1 LIMIT 1`, [gallery_id]);
        gallery = result[0];
      }
      
      if (!gallery) {
        return res.status(404).json({ error: 'Gallery not found' });
      }
      
      // Use frontend-provided gallery_url, or build from environment/host
      const link = gallery_url || `${getBaseUrl()}/gallery/${gallery.slug}`;
      const pwdNote = (gallery.is_password_protected && gallery.password) 
        ? `<p>Password: <strong>${gallery.password}</strong></p>` 
        : '';
      
      const html = `
        <div style="font-family:system-ui;line-height:1.6">
          <p>Hello,</p>
          <p>We've shared the photo gallery "<strong>${gallery.title}</strong>" with you.</p>
          <p><a href="${link}">Open the gallery</a></p>
          ${pwdNote}
          ${message ? `<p>${String(message)}</p>` : ''}
          <p>— ${getBizName()}</p>
        </div>`;
      
      const textContent = `Gallery link: ${link}${gallery.is_password_protected && gallery.password ? `\nPassword: ${gallery.password}` : ''}${message ? `\n\n${message}` : ''}`;
      
      // Send email using the enhanced email service
      const { EnhancedEmailService } = await import('./services/enhancedEmailService');
      await EnhancedEmailService.sendEmail({
        to,
        subject: `Gallery: ${gallery.title}`,
        content: textContent,
        html: html
      });
      
      res.json({ ok: true, link });
    } catch (error) {
      console.error('Error sending gallery email:', error);
      res.status(500).json({ error: (error as Error)?.message || 'Failed to send email' });
    }
  });
  
  // POST /api/galleries/send-whatsapp - Send gallery link via WhatsApp
  app.post("/api/galleries/send-whatsapp", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { gallery_id, slug, to_phone, gallery_url } = req.body;
      
      // Find gallery
      let gallery;
      if (slug) {
        const result = await runSql(`SELECT id, title, slug, is_password_protected, password FROM galleries WHERE slug = $1 LIMIT 1`, [slug]);
        gallery = result[0];
      } else if (gallery_id) {
        const result = await runSql(`SELECT id, title, slug, is_password_protected, password FROM galleries WHERE id = $1 LIMIT 1`, [gallery_id]);
        gallery = result[0];
      }
      
      if (!gallery) {
        return res.status(404).json({ error: 'Gallery not found' });
      }
      
      // Use frontend-provided gallery_url, or build with production domain
      const link = gallery_url || `${getBaseUrl()}/gallery/${gallery.slug}`;
      
      // Generate WhatsApp share link
      const text = `Here's your photo gallery "${gallery.title}": ${link}${gallery.is_password_protected && gallery.password ? `\nPassword: ${gallery.password}` : ''}`;
      const shareUrl = `https://wa.me/${to_phone ? to_phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(text)}`;
      
      res.json({ ok: true, sent: false, link, share: shareUrl });
    } catch (error) {
      console.error('Error with gallery WhatsApp share:', error);
      res.status(500).json({ error: (error as Error)?.message || 'Failed to generate WhatsApp link' });
    }
  });
  
  // POST /api/galleries/send-sms - Send gallery link via SMS
  app.post("/api/galleries/send-sms", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { gallery_id, slug, to_phone, gallery_url } = req.body;
      
      if (!to_phone) {
        return res.status(400).json({ error: 'to_phone is required' });
      }
      
      // Find gallery
      let gallery;
      if (slug) {
        const result = await runSql(`SELECT id, title, slug, is_password_protected, password FROM galleries WHERE slug = $1 LIMIT 1`, [slug]);
        gallery = result[0];
      } else if (gallery_id) {
        const result = await runSql(`SELECT id, title, slug, is_password_protected, password FROM galleries WHERE id = $1 LIMIT 1`, [gallery_id]);
        gallery = result[0];
      }
      
      if (!gallery) {
        return res.status(404).json({ error: 'Gallery not found' });
      }
      
      // Use frontend-provided gallery_url, or build with production domain
      const link = gallery_url || `${getBaseUrl()}/gallery/${gallery.slug}`;
      
      // Build SMS message
      const smsText = `Here's your photo gallery "${gallery.title}": ${link}${gallery.is_password_protected && gallery.password ? ` (Password: ${gallery.password})` : ''}`;
      
      // Try to send via SMS service if configured
      try {
        const { SMSService } = await import('./services/smsService');
        await SMSService.initialize();
        await SMSService.sendSMS({ to: to_phone, content: smsText });
        res.json({ ok: true, sent: true, link, info: 'SMS sent successfully' });
      } catch (smsError) {
        // SMS service not configured or failed
        console.log('SMS service not available:', (smsError as Error)?.message);
        res.json({ ok: true, sent: false, link, info: 'SMS service not configured. Please copy the link manually.' });
      }
    } catch (error) {
      console.error('Error with gallery SMS:', error);
      res.status(500).json({ error: (error as Error)?.message || 'Failed to send SMS' });
    }
  });

  // ==================== STUDIO CONFIG FOR INVOICES ====================
  // Authority Map — the studio's topical-cluster + internal-link structure. Public GET
  // (SEO components read it) + authed PUT (Website Studio edits it). Falls back to the
  // New Age seed when the studio hasn't customised it.
  app.get("/api/authority-map", async (_req: Request, res: Response) => {
    try {
      const { getAuthorityMap } = await import('./lib/authority-map');
      res.json(await getAuthorityMap());
    } catch (e: any) {
      const { DEFAULT_AUTHORITY_MAP } = await import('../shared/authorityMap.js');
      res.json(DEFAULT_AUTHORITY_MAP);
    }
  });

  app.put("/api/authority-map", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { normalizeAuthorityMap } = await import('../shared/authorityMap.js');
      const map = normalizeAuthorityMap(req.body);
      if (!map) return res.status(400).json({ error: 'Invalid authority map: expected { pillars[], defaultPillar }' });
      const { saveAuthorityMap } = await import('./lib/authority-map');
      await saveAuthorityMap(map);
      res.json({ ok: true, map });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Failed to save authority map' });
    }
  });

  // Generate a draft Authority Map from the studio's niche (AI). Returns it for review;
  // the studio saves via PUT. Does not persist.
  app.post("/api/authority-map/generate", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { generateAuthorityMap } = await import('./lib/authority-map-generator');
      const b = req.body || {};
      const map = await generateAuthorityMap({
        businessName: b.businessName, niche: b.niche, services: b.services, city: b.city, language: b.language,
      });
      res.json({ ok: true, map });
    } catch (e: any) {
      const code = e?.name === 'NoOpenAIError' ? 400 : 500;
      res.status(code).json({ error: e?.name === 'NoOpenAIError' ? 'OpenAI is not configured (set OPENAI_API_KEY) to generate an authority map.' : (e?.message || 'Failed to generate authority map') });
    }
  });

  // Build the studio's own homepage from onboarding data (no crawl) + optional theme,
  // and set it as "/". This is what gives a new studio a branded homepage instead of NAF's.
  app.post("/api/admin/homepage/starter", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { generateStarterHomepage } = await import('./lib/starter-homepage');
      const out = await generateStarterHomepage({ themePreset: req.body?.preset });
      res.json({ ok: true, ...out });
    } catch (e: any) {
      console.error('[starter-homepage]', e?.message || e);
      res.status(500).json({ error: e?.message || 'Failed to build homepage' });
    }
  });

  // Public-site theme preset — set the studio's chosen token theme.
  app.put("/api/admin/site-theme", authenticateUser, async (req: Request, res: Response) => {
    try {
      const id = String(req.body?.preset || req.body?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'preset id is required' });
      const { saveSiteTheme } = await import('./lib/site-theme');
      const preset = await saveSiteTheme(id);
      res.json({ ok: true, preset });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Failed to save theme' });
    }
  });

  // Phase 2: scaffold a draft landing page for each pillar in the Authority Map.
  app.post("/api/authority-map/scaffold", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { scaffoldPillarPages } = await import('./lib/authority-scaffold');
      const out = await scaffoldPillarPages({ city: req.body?.city, limit: req.body?.limit });
      res.json({ ok: true, ...out });
    } catch (e: any) {
      const noai = e?.name === 'NoOpenAIError';
      res.status(noai ? 400 : 500).json({ error: noai ? 'OpenAI is not configured (set OPENAI_API_KEY) to build pillar pages.' : (e?.message || 'Failed to scaffold pillar pages') });
    }
  });

  app.get("/api/studio-config", async (req: Request, res: Response) => {
    // Return defaults - this endpoint will be enhanced when CMS is ready
    const studioConfig: any = {
      logo: null,
      studioName: getBizName(),
      address: process.env.BUSINESS_ADDRESS || '',
      addressNote: '',
      phone: process.env.BUSINESS_PHONE || '',
      email: getEnvContactEmailSync() || 'no-reply@localhost',
      openingHours: process.env.BUSINESS_HOURS || '',
      dateFormat: 'auto'
    };
    
    try {
      const studioId = req.query.studioId as string || (process.env.STUDIO_ID || '550e8400-e29b-41d4-a716-446655440000');
      const language = (req.query.language as string) || 'de';
      
      // Try to fetch site settings (logo) if table exists
      const [siteSettings] = await db
        .select()
        .from(manualPageContent)
        .where(
          and(
            eq(manualPageContent.studioId, studioId),
            eq(manualPageContent.pageId, 'site-settings'),
            eq(manualPageContent.language, language)
          )
        )
        .limit(1)
        .catch(() => [null]);
      
      // Try to fetch contact details if table exists
      const [contactDetails] = await db
        .select()
        .from(manualPageContent)
        .where(
          and(
            eq(manualPageContent.studioId, studioId),
            eq(manualPageContent.pageId, 'contact'),
            eq(manualPageContent.language, language)
          )
        )
        .limit(1)
        .catch(() => [null]);
      
      // Extract relevant fields from published content if available
      // Note: Content is stored using translation keys, not field IDs
      if (siteSettings?.publishedContent) {
        const siteContent = siteSettings.publishedContent as any;
        if (siteContent['site.logo']) studioConfig.logo = siteContent['site.logo'];
      }
      
      if (contactDetails?.publishedContent) {
        const contactContent = contactDetails.publishedContent as any;
        // Only use values that are actual content, not translation keys (e.g., 'contact.studioName')
        const isValidValue = (v: string) => v && !v.startsWith('contact.') && !v.startsWith('site.');
        if (contactContent['contact.studioName'] && isValidValue(contactContent['contact.studioName'])) studioConfig.studioName = contactContent['contact.studioName'];
        if (contactContent['contact.studioAddress'] && isValidValue(contactContent['contact.studioAddress'])) studioConfig.address = contactContent['contact.studioAddress'];
        if (contactContent['contact.addressNote'] && isValidValue(contactContent['contact.addressNote'])) studioConfig.addressNote = contactContent['contact.addressNote'];
        if (contactContent['contact.phone'] && isValidValue(contactContent['contact.phone'])) studioConfig.phone = contactContent['contact.phone'];
        if (contactContent['contact.email'] && isValidValue(contactContent['contact.email'])) studioConfig.email = contactContent['contact.email'];
        if (contactContent['contact.openingHours'] && isValidValue(contactContent['contact.openingHours'])) studioConfig.openingHours = contactContent['contact.openingHours'];
      }
      
      // Fetch branding + dateFormat from studio_configs (the Studio
      // Customization page's authoritative store). These take priority so a
      // studio's saved logo / business info appears on invoices.
      const [dbConfig] = await db
        .select()
        .from(studioConfigs)
        .limit(1)
        .catch(() => [null as any]);
      if (dbConfig?.dateFormat) studioConfig.dateFormat = dbConfig.dateFormat;
      if (dbConfig?.logoUrl) studioConfig.logo = dbConfig.logoUrl;
      if (dbConfig?.businessName || dbConfig?.studioName) {
        studioConfig.studioName = dbConfig.businessName || dbConfig.studioName;
      }
      if (dbConfig?.phone) studioConfig.phone = dbConfig.phone;
      if (dbConfig?.email) studioConfig.email = dbConfig.email;
      if (dbConfig?.address) {
        studioConfig.address = dbConfig.city ? `${dbConfig.address}, ${dbConfig.city}` : dbConfig.address;
      }
      // Studio tax settings — so invoices/orders can apply the studio's own rate + label.
      studioConfig.defaultTaxRate = dbConfig?.defaultTaxRate != null ? Number(dbConfig.defaultTaxRate) : 0;
      studioConfig.taxLabel = dbConfig?.taxLabel || 'VAT';
      studioConfig.vatNumber = dbConfig?.vatNumber || '';
      // The AI-generated homepage: when set, "/" renders this landing page slug.
      studioConfig.homepageLandingSlug = dbConfig?.homepageLandingSlug || null;
      // The studio's own PricingEmbed calculator (homepage price calculator).
      studioConfig.pricingEmbedUrl = dbConfig?.pricingEmbedUrl || null;
      // Public-site theme preset (tokens) — the client applies it to landing pages.
      try { const { getSiteTheme } = await import('./lib/site-theme'); studioConfig.siteTheme = await getSiteTheme(); } catch { /* default */ }
    } catch (error) {
      console.warn('Could not fetch studio config from database, using defaults:', (error as any)?.message);
      // Continue with defaults
    }

    // Normalize a Supabase S3-endpoint URL (auth-only, …/storage/v1/s3/<bucket>/<key>) to the
    // public object URL (…/storage/v1/object/public/<bucket>/<key>) a browser can actually
    // load. Older uploads stored the S3 form, which rendered as a broken logo on the invoice/
    // header. Fixing on read repairs every consumer without needing a re-upload.
    if (studioConfig.logo && typeof studioConfig.logo === 'string') {
      studioConfig.logo = studioConfig.logo.replace('/storage/v1/s3/', '/storage/v1/object/public/');
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json(studioConfig);
  });

  // ==================== INVOICE ROUTES ====================
  app.get("/api/crm/invoices", authenticateUser, async (req: Request, res: Response) => {
    try {
      const clientId = req.query.clientId as string;
      const limitParam = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      let invoices = await storage.getCrmInvoices();
      
      // Filter by clientId if provided
      if (clientId) {
        invoices = invoices.filter(inv => inv.client_id === clientId);
      }
      
      // Apply limit if provided (results are already ordered by created_at DESC)
      if (limitParam && limitParam > 0) {
        invoices = invoices.slice(0, limitParam);
      }
      
      // Transform the data to match frontend expectations
      const transformedInvoices = invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        invoice_number: invoice.invoice_number,
        clientId: invoice.client_id,
        client_id: invoice.client_id,
        issueDate: invoice.issue_date,
        issue_date: invoice.issue_date,
        dueDate: invoice.due_date,
        due_date: invoice.due_date,
        subtotal: parseFloat(invoice.subtotal || '0'),
        subtotal_amount: parseFloat(invoice.subtotal || '0'),
        taxAmount: parseFloat(invoice.tax_amount || '0'),
        tax_amount: parseFloat(invoice.tax_amount || '0'),
        total: parseFloat(invoice.total || '0'),
        totalAmount: parseFloat(invoice.total || '0'),
        total_amount: parseFloat(invoice.total || '0'),
        status: invoice.status,
        notes: invoice.notes,
        createdAt: invoice.created_at,
        created_at: invoice.created_at,
        documentType: invoice.document_type || 'invoice',
        document_type: invoice.document_type || 'invoice',
        client: {
          name: invoice.client_name,
          email: invoice.client_email
        }
      }));
      
      // Support both response formats for backwards compatibility
      if (clientId) {
        res.json({ invoices: transformedInvoices });
      } else {
        res.json(transformedInvoices);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Alias for invoices list (used by some frontend pages)
  app.get("/api/invoices/list", authenticateUser, async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      const invoices = await storage.getCrmInvoices();
      const filtered = status ? invoices.filter(inv => inv.status === status) : invoices;
      
      res.json({
        rows: filtered,
        total: filtered.length
      });
    } catch (error) {
      console.error("Error fetching invoices list:", error);
      res.status(500).json({ error: "Internal server error", rows: [], total: 0 });
    }
  });

  // Get invoice status by IDs
  app.get("/api/invoices/status", authenticateUser, async (req: Request, res: Response) => {
    try {
      const ids = req.query.ids as string;
      if (!ids) {
        return res.json({ statuses: {} });
      }
      const idList = ids.split(',').filter(Boolean);
      const statuses: Record<string, string> = {};
      
      for (const id of idList) {
        try {
          const result = await runSql('SELECT status FROM crm_invoices WHERE id = $1::uuid', [id]);
          if (result && result.length > 0) {
            statuses[id] = result[0].status || 'draft';
          }
        } catch (e) {
          // Skip invalid IDs
        }
      }
      
      res.json({ statuses });
    } catch (error) {
      console.error("Error fetching invoice statuses:", error);
      res.status(500).json({ error: "Internal server error", statuses: {} });
    }
  });

  // Update invoice status
  app.post("/api/invoices/update-status", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { invoice_id, status } = req.body;
      if (!invoice_id || !status) {
        return res.status(400).json({ ok: false, error: 'Missing invoice_id or status' });
      }
      
      await runSql("UPDATE crm_invoices SET status = $1, updated_at = NOW(), paid_at = CASE WHEN $1='paid' AND paid_at IS NULL THEN NOW() ELSE paid_at END WHERE id = $2::uuid", [status, invoice_id]);
      
      res.json({ ok: true, success: true });
    } catch (error) {
      console.error("Error updating invoice status:", error);
      res.status(500).json({ ok: false, error: "Internal server error" });
    }
  });

  app.get("/api/crm/invoices/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const invoice = await storage.getCrmInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      // Fetch invoice items
      const items = await storage.getCrmInvoiceItems(req.params.id);
      
      // Fetch client information
      let client = null;
      if (invoice.clientId) {
        client = await storage.getCrmClient(invoice.clientId);
      }
      
      // Return complete invoice with items and client
      // Include both camelCase and snake_case for client_id for frontend compatibility
      res.json({
        ...invoice,
        client_id: invoice.clientId, // Add snake_case version for frontend
        items,
        client
      });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Invoice edit endpoint - handles full invoice updates including items
  app.post("/api/invoice-edit", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { invoiceId, clientId, invoiceNumber, status, issueDate, dueDate, notes, footerText, documentType, items, discountType, discountValue, discountAmount, disableOnlinePayment } = req.body;
      console.log('[INVOICE-EDIT] Received update request for invoice:', invoiceId);
      console.log('[INVOICE-EDIT] Request body:', JSON.stringify(req.body, null, 2));
      
      if (!invoiceId) {
        return res.status(400).json({ ok: false, error: 'Missing invoiceId' });
      }

      // Update main invoice record
      // For notes and footer_text, use direct assignment (not COALESCE) so empty strings can clear the field
      const notesProvided = notes !== undefined && notes !== null;
      const footerProvided = footerText !== undefined && footerText !== null;
      
      const updateQuery = `
        UPDATE crm_invoices 
        SET 
          client_id = COALESCE($1::uuid, client_id),
          invoice_number = COALESCE($2, invoice_number),
          status = COALESCE($3, status),
          due_date = COALESCE($4::timestamp, due_date),
          notes = ${notesProvided ? '$5' : 'notes'},
          footer_text = ${footerProvided ? '$6' : 'footer_text'},
          document_type = COALESCE($7, document_type),
          issue_date = COALESCE($8::timestamp, issue_date),
          discount_type = COALESCE($10, discount_type),
          discount_value = COALESCE($11::numeric, discount_value),
          discount_amount = COALESCE($12::numeric, discount_amount),
          disable_online_payment = COALESCE($13::boolean, disable_online_payment),
          updated_at = NOW()
        WHERE id = $9::uuid
        RETURNING *
      `;
      
      const updateResult = await runSql(updateQuery, [
        clientId || null,
        invoiceNumber || null,
        status || null,
        dueDate || null,
        notesProvided ? notes : null,
        footerProvided ? footerText : null,
        documentType || null,
        issueDate || null,
        invoiceId,
        discountType || null,
        discountValue != null ? parseFloat(discountValue) : null,
        discountAmount != null ? parseFloat(discountAmount) : null,
        disableOnlinePayment != null ? disableOnlinePayment : null
      ]);
      
      if (!updateResult || updateResult.length === 0) {
        console.log('[INVOICE-EDIT] Invoice not found:', invoiceId);
        return res.status(404).json({ ok: false, error: 'Invoice not found' });
      }
      
      console.log('[INVOICE-EDIT] Updated invoice record:', updateResult[0]);

      // Update invoice items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        console.log('[INVOICE-EDIT] Updating', items.length, 'items');
        
        // Delete existing items
        await runSql('DELETE FROM crm_invoice_items WHERE invoice_id = $1::uuid', [invoiceId]);
        
        // Calculate totals
        let subtotal = 0;
        let totalTax = 0;
        
        // Insert new items (table has: id, invoice_id, description, quantity, unit_price, tax_rate, sort_order, created_at)
        let sortOrder = 0;
        for (const item of items) {
          const quantity = parseFloat(item.quantity) || 1;
          const unitPrice = parseFloat(item.unitPrice) || 0;
          const taxRate = parseFloat(item.taxRate) || 0;
          const amount = quantity * unitPrice;
          const taxAmount = amount * (taxRate / 100);
          
          subtotal += amount;
          totalTax += taxAmount;
          sortOrder++;
          
          await runSql(`
            INSERT INTO crm_invoice_items (invoice_id, description, quantity, unit_price, tax_rate, sort_order)
            VALUES ($1::uuid, $2, $3, $4, $5, $6)
          `, [invoiceId, item.description || '', quantity, unitPrice, taxRate, sortOrder]);
        }
        
        // Update invoice totals (subtract discount from total)
        const parsedDiscount = discountAmount != null ? parseFloat(discountAmount) : 0;
        const total = subtotal + totalTax - parsedDiscount;
        
        // Auto-mark zero-amount invoices (e.g. prepaid vouchers) as paid
        const autoStatus = total <= 0 ? 'paid' : null;
        await runSql(`
          UPDATE crm_invoices 
          SET subtotal = $1, tax_amount = $2, total = $3,
              status = COALESCE($5, status),
              updated_at = NOW()
          WHERE id = $4::uuid
        `, [subtotal, totalTax, total, invoiceId, autoStatus]);
        
        console.log('[INVOICE-EDIT] Updated totals - subtotal:', subtotal, 'tax:', totalTax, 'discount:', parsedDiscount, 'total:', total, autoStatus ? '(auto-marked paid)' : '');
      }

      res.json({ ok: true, success: true, invoice_id: invoiceId });
    } catch (error: any) {
      console.error('[INVOICE-EDIT] Error updating invoice:', error);
      res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
    }
  });

  app.post("/api/crm/invoices", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log("Received invoice data:", JSON.stringify(req.body, null, 2));
      
      // Transform snake_case from frontend to camelCase for database
      const invoiceData = {
        clientId: req.body.clientId || req.body.client_id,
        invoiceNumber: req.body.invoiceNumber || req.body.invoice_number,
        issueDate: req.body.issueDate || req.body.issue_date,
        dueDate: req.body.dueDate || req.body.due_date,
        subtotal: req.body.subtotal?.toString() || '0',
        taxAmount: req.body.taxAmount?.toString() || req.body.tax_amount?.toString() || '0',
        discountAmount: req.body.discountAmount?.toString() || req.body.discount_amount?.toString() || '0',
        total: req.body.total?.toString() || '0',
        currency: req.body.currency || 'EUR',
        status: (req.body.status || 'draft').toLowerCase(),
        documentType: req.body.documentType || req.body.document_type || 'invoice',
        paymentTerms: req.body.paymentTerms || req.body.payment_terms || 'Net 30',
        notes: req.body.notes || '',
        termsAndConditions: req.body.termsAndConditions || req.body.terms_and_conditions,
        footerText: req.body.footerText || req.body.footer_text,
        stripePaymentIntentId: req.body.stripePaymentIntentId || req.body.stripe_payment_intent_id,
        stripePaymentUrl: req.body.stripePaymentUrl || req.body.stripe_payment_url,
        paidAmount: req.body.paidAmount?.toString() || req.body.paid_amount?.toString() || '0',
        disableOnlinePayment: req.body.disableOnlinePayment || req.body.disable_online_payment || false,
        createdBy: req.body.createdBy || req.body.created_by || null
      };
      
      console.log("Transformed invoice data:", JSON.stringify(invoiceData, null, 2));
      
      // Add auto-generated invoice number if not provided
      if (!invoiceData.invoiceNumber) {
        const timestamp = Date.now();
        const prefix = invoiceData.documentType === 'quote' ? 'QUO' : invoiceData.documentType === 'estimate' ? 'EST' : 'INV';
        invoiceData.invoiceNumber = `${prefix}-${timestamp}`;
      }
      
      console.log('Invoice data being sent to storage:', JSON.stringify(invoiceData, null, 2));
    
      // Zero-amount invoices (pre-paid products) are automatically marked as paid
      if (parseFloat(invoiceData.total) === 0 && invoiceData.status === 'draft') {
        invoiceData.status = 'paid';
        invoiceData.paidAmount = '0';
        console.log('[INVOICE] Zero-amount invoice auto-marked as paid');
      }

      // Create the invoice
      const invoice = await storage.createCrmInvoice(invoiceData as any);
      
      // Create invoice items if provided
      if (req.body.items && req.body.items.length > 0) {
        const itemsData = req.body.items.map((item: any, index: number) => ({
          invoiceId: invoice.id,
          description: item.description,
          quantity: item.quantity?.toString() || '1',
          unitPrice: (item.unitPrice || item.unit_price || 0).toString(),
          taxRate: (item.taxRate || item.tax_rate || 0).toString(),
          sortOrder: index
        }));
        
        console.log('Creating invoice items:', JSON.stringify(itemsData, null, 2));
        await storage.createCrmInvoiceItems(itemsData);
      }
      
      res.status(201).json({ ok: true, invoice_id: invoice.id, ...invoice });
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ ok: false, error: error.message || "Internal server error" });
    }
  });

  app.put("/api/crm/invoices/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const invoice = await storage.updateCrmInvoice(req.params.id, req.body);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/crm/invoices/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const invoice = await storage.updateCrmInvoice(req.params.id, req.body);
      res.json(invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Convert quote/estimate to invoice
  app.post("/api/crm/invoices/:id/convert-to-invoice", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const invoice = await storage.getCrmInvoice(id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Generate new INV- prefixed number
      const newNumber = `INV-${Date.now()}`;

      // Update document_type, invoice_number, and set status to pending for new invoice
      await runSql(
        `UPDATE crm_invoices SET document_type = 'invoice', invoice_number = $1, status = CASE WHEN status = 'draft' THEN 'pending' ELSE status END, updated_at = NOW() WHERE id = $2`,
        [newNumber, id]
      );

      res.json({ success: true, invoice_number: newNumber, document_type: 'invoice' });
    } catch (error) {
      console.error("Error converting to invoice:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/crm/invoices/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteCrmInvoice(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== INVOICE SHARING ROUTES ====================
  
  // POST /api/invoices/send-email - Send invoice link via email
  app.post("/api/invoices/send-email", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { invoice_id, to } = req.body;
      
      if (!invoice_id || !to) {
        return res.status(400).json({ error: 'invoice_id and to (email) are required' });
      }
      
      // Find invoice
      const invoiceResult = await runSql(`
        SELECT i.*, c.first_name, c.last_name, c.email as client_email
        FROM crm_invoices i
        LEFT JOIN crm_clients c ON i.client_id = c.id
        WHERE i.id = $1::uuid
      `, [invoice_id]);
      
      if (!invoiceResult || invoiceResult.length === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      const invoice = invoiceResult[0];
      
      // Build invoice URL
      const baseUrl = process.env.APP_URL || `https://${req.headers.host}`;
      const link = `${baseUrl}/inv/${invoice_id}`;
      
      const clientName = invoice.first_name && invoice.last_name 
        ? `${invoice.first_name} ${invoice.last_name}`
        : 'Client';
      
      const html = `
        <div style="font-family:system-ui;line-height:1.6">
          <p>Hello ${clientName},</p>
          <p>Please find your invoice <strong>${invoice.invoice_number}</strong> attached.</p>
          <p><strong>Amount Due:</strong> €${(invoice.total || 0).toFixed(2)}</p>
          <p><strong>Due Date:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</p>
          <p><a href="${link}" style="display:inline-block;padding:12px 24px;background-color:#7C3AED;color:white;text-decoration:none;border-radius:6px;">View Invoice</a></p>
          <p>Thank you for your business.</p>
          <p>— ${getBizName()}</p>
        </div>`;
      
      const textContent = `Invoice ${invoice.invoice_number}\nAmount Due: €${(invoice.total || 0).toFixed(2)}\nView Invoice: ${link}`;
      
      // Send email using the enhanced email service
      const { EnhancedEmailService } = await import('./services/enhancedEmailService');
      await EnhancedEmailService.sendEmail({
        to,
        subject: `Invoice ${invoice.invoice_number} from ${getBizName()}`,
        content: textContent,
        html: html
      });
      
      // Update invoice status: zero-amount invoices go straight to 'paid', others to 'sent'
      if (invoice.status === 'draft') {
        const invoiceTotal = parseFloat(invoice.total || '0');
        const newStatus = invoiceTotal === 0 ? 'paid' : 'sent';
        await runSql("UPDATE crm_invoices SET status = $1, updated_at = NOW(), paid_at = CASE WHEN $1='paid' AND paid_at IS NULL THEN NOW() ELSE paid_at END WHERE id = $2::uuid", [newStatus, invoice_id]);
      }
      
      res.json({ ok: true, link });
    } catch (error) {
      console.error('Error sending invoice email:', error);
      res.status(500).json({ error: (error as Error)?.message || 'Failed to send email' });
    }
  });
  
  // POST /api/invoices/send-whatsapp - Send invoice link via WhatsApp
  app.post("/api/invoices/send-whatsapp", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { invoice_id, to_phone } = req.body;
      
      if (!invoice_id) {
        return res.status(400).json({ error: 'invoice_id is required' });
      }
      
      // Find invoice
      const invoiceResult = await runSql(`
        SELECT i.*, c.first_name, c.last_name
        FROM crm_invoices i
        LEFT JOIN crm_clients c ON i.client_id = c.id
        WHERE i.id = $1::uuid
      `, [invoice_id]);
      
      if (!invoiceResult || invoiceResult.length === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      const invoice = invoiceResult[0];
      
      // Build invoice URL
      const baseUrl = process.env.APP_URL || `https://${req.headers.host}`;
      const link = `${baseUrl}/inv/${invoice_id}`;
      
      // Generate WhatsApp share link using the correct API format
      const text = `Hello! Here is your invoice ${invoice.invoice_number} for €${(invoice.total || 0).toFixed(2)}.\n\nView and pay online: ${link}\n\nThank you! - ${getBizName()}`;
      
      // Clean phone number - remove all non-digits
      const cleanPhone = to_phone ? to_phone.replace(/[^0-9]/g, '') : '';
      
      // Use the correct WhatsApp API URL format
      const shareUrl = cleanPhone 
        ? `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
        : `https://api.whatsapp.com/send/?text=${encodeURIComponent(text)}`;
      
      res.json({ ok: true, sent: false, link, share: shareUrl });
    } catch (error) {
      console.error('Error with invoice WhatsApp share:', error);
      res.status(500).json({ error: (error as Error)?.message || 'Failed to generate WhatsApp link' });
    }
  });
  
  // POST /api/invoices/send-sms - Send invoice link via SMS
  app.post("/api/invoices/send-sms", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { invoice_id, to_phone } = req.body;
      
      if (!invoice_id || !to_phone) {
        return res.status(400).json({ error: 'invoice_id and to_phone are required' });
      }
      
      // Find invoice
      const invoiceResult = await runSql(`
        SELECT i.*, c.first_name, c.last_name
        FROM crm_invoices i
        LEFT JOIN crm_clients c ON i.client_id = c.id
        WHERE i.id = $1::uuid
      `, [invoice_id]);
      
      if (!invoiceResult || invoiceResult.length === 0) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      const invoice = invoiceResult[0];
      
      // Build invoice URL
      const baseUrl = process.env.APP_URL || `https://${req.headers.host}`;
      const link = `${baseUrl}/inv/${invoice_id}`;
      
      // Build SMS message
      const smsText = `Invoice ${invoice.invoice_number}: €${(invoice.total || 0).toFixed(2)}. View: ${link} - ${getBizName()}`;
      
      // Try to send via SMS service if configured
      try {
        const { SMSService } = await import('./services/smsService');
        await SMSService.initialize();
        await SMSService.sendSMS({ to: to_phone, content: smsText });
        res.json({ ok: true, sent: true, link, info: 'SMS sent successfully' });
      } catch (smsError) {
        // SMS service not configured or failed
        console.log('SMS service not available:', (smsError as Error)?.message);
        res.json({ ok: true, sent: false, link, info: 'SMS service not configured. Please copy the link manually.' });
      }
    } catch (error) {
      console.error('Error with invoice SMS:', error);
      res.status(500).json({ error: (error as Error)?.message || 'Failed to send SMS' });
    }
  });

  // ==================== INVOICE PAYMENT ROUTES ====================
  app.get("/api/crm/invoices/:invoiceId/payments", authenticateUser, async (req: Request, res: Response) => {
    try {
      const payments = await storage.getCrmInvoicePayments(req.params.invoiceId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Helper: recalculate invoice paidAmount and status from payments
  async function recalcInvoicePaid(invoiceId: string) {
    try {
      const payments = await storage.getCrmInvoicePayments(invoiceId);
      const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount?.toString() || '0')), 0);
      const invoice = await storage.getCrmInvoice(invoiceId);
      if (!invoice) return;
      const invoiceTotal = parseFloat(invoice.total?.toString() || '0');
      let status = invoice.status || 'draft';
      if (invoiceTotal === 0) {
        status = 'paid'; // Zero-amount invoices are always considered paid
      } else if (totalPaid >= invoiceTotal) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partially_paid';
      } else if (status === 'paid' || status === 'partially_paid') {
        status = 'sent'; // Revert to sent if all payments removed
      }
      await storage.updateCrmInvoice(invoiceId, {
        paidAmount: totalPaid.toFixed(2),
        status
      } as any);
      console.log(`[PAYMENT] Invoice ${invoiceId} updated: paidAmount=${totalPaid.toFixed(2)}, status=${status}`);
    } catch (err) {
      console.error('[PAYMENT] Error recalculating invoice paid amount:', err);
    }
  }

  app.post("/api/crm/invoices/:invoiceId/payments", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Transform snake_case from frontend to camelCase for Drizzle ORM
      const paymentData = {
        invoiceId: req.params.invoiceId,
        amount: req.body.amount?.toString() || '0',
        paymentMethod: req.body.payment_method || req.body.paymentMethod || 'bank_transfer',
        paymentReference: req.body.payment_reference || req.body.paymentReference || '',
        paymentDate: req.body.payment_date || req.body.paymentDate || new Date().toISOString().split('T')[0],
        notes: req.body.notes || ''
      };
      console.log('[PAYMENT] Creating payment:', JSON.stringify(paymentData));
      const payment = await storage.createCrmInvoicePayment(paymentData as any);
      // Update invoice paidAmount and status
      await recalcInvoicePaid(req.params.invoiceId);
      res.json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/crm/invoices/:invoiceId/payments/:paymentId", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteCrmInvoicePayment(req.params.paymentId);
      // Recalculate invoice paidAmount and status
      await recalcInvoicePaid(req.params.invoiceId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== INVOICE PDF & EMAIL ROUTES ====================
  // Public invoice view (no authentication required)
  app.get("/api/invoices/public/:id", async (req: Request, res: Response) => {
    try {
      const invoice = await storage.getCrmInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }
      
      // Fetch invoice items
      const items = await storage.getCrmInvoiceItems(req.params.id);
      
      // Fetch client information
      let client = null;
      if (invoice.clientId) {
        client = await storage.getCrmClient(invoice.clientId);
      }
      
      // Return complete invoice with items and client (public view)
      res.json({
        ...invoice,
        items,
        client
      });
    } catch (error) {
      console.error("Error fetching public invoice:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Generate PDF for invoice (accessible both authenticated and public)
  app.get("/api/crm/invoices/:id/pdf", async (req: Request, res: Response) => {
    try {
      const invoice = await storage.getCrmInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Get client details using correct field name
  const clientId = invoice.clientId;
      const client = await storage.getCrmClient(clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      // Generate modern PDF using centralized function
      const pdfBuffer = await generateModernInvoicePDF(invoice, client);
      
      // Set proper PDF headers
  const invoiceNumber = invoice.invoiceNumber || invoice.id;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Rechnung-${invoiceNumber}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Email invoice to client
  app.post("/api/crm/invoices/:id/email", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { subject, message, includeAttachment = true } = req.body;
      
      const invoice = await storage.getCrmInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const client = await storage.getCrmClient(invoice.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      if (!client.email) {
        return res.status(400).json({ error: "Client has no email address" });
      }

      // Generate modern PDF attachment if requested using centralized function
      let attachments = [];
      if (includeAttachment) {
        const pdfBuffer = await generateModernInvoicePDF(invoice, client);
  const invoiceNumber = invoice.invoiceNumber || invoice.id;

        attachments.push({
          filename: `Rechnung-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });
      }

      // Create email transporter via shared smtp-helper
      const { getSmtpTransporter } = await import('./utils/smtp-helper');
      const transporter = await getSmtpTransporter();

      // Send email
      const emailOptions = {
        from: getEnvContactEmailSync() || 'no-reply@localhost',
        to: client.email,
        subject: subject || `Rechnung ${invoice.invoiceNumber} - ${getBizName()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Rechnung ${invoice.invoiceNumber}</h2>
            <p>Liebe/r ${client.firstName} ${client.lastName},</p>
            <p>${message || 'anbei senden wir Ihnen Ihre Rechnung zu.'}</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 10px 0;">Rechnungsdetails:</h3>
              <p><strong>Rechnungsnummer:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Datum:</strong> ${new Date(invoice.issueDate).toLocaleDateString('de-DE')}</p>
              <p><strong>Fälligkeitsdatum:</strong> ${new Date(invoice.dueDate).toLocaleDateString('de-DE')}</p>
              <p><strong>Gesamtbetrag:</strong> €${parseFloat(invoice.total?.toString() || '0').toFixed(2)}</p>
            </div>
            <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
              <p><strong>${getBizName()}</strong><br>
              ${process.env.BUSINESS_ADDRESS || ''}<br>
              Tel: ${process.env.BUSINESS_PHONE || ''}<br>
              Email: ${getEnvContactEmailSync()}</p>
            </div>
          </div>
        `,
        attachments
      };

      await transporter.sendMail(emailOptions);

      res.json({ 
        success: true, 
        message: `Invoice successfully sent to ${client.email}` 
      });

    } catch (error) {
      console.error("Error sending invoice email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Send payment receipt email (uses same SMTP as invoice email)
  app.post("/api/crm/invoices/:invoiceId/receipt", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { to, subject, body } = req.body;
      if (!to) {
        return res.status(400).json({ error: 'Recipient email required' });
      }
      const { getSmtpTransporter, getFromAddress } = await import('./utils/smtp-helper');
      const transporter = await getSmtpTransporter();
      const fromAddress = await getFromAddress();
      const htmlBody = typeof body === 'string' ? body.replace(/\n/g, '<br>') : body;
      await transporter.sendMail({
        from: fromAddress,
        to,
        subject: subject || 'Payment Receipt',
        html: htmlBody,
        text: typeof body === 'string' ? body.replace(/<[^>]+>/g, '') : undefined
      });
      // Save copy to CRM messages
      try {
        await storage.createCrmMessage({
          senderName: `${getBizName()} (Sent)`,
          senderEmail: getEnvContactEmailSync(),
          subject: `[SENT] ${subject}`,
          content: `SENT TO: ${to}\n\n${typeof body === 'string' ? body : ''}`,
          status: 'sent',
          messageType: 'sent'
        });
      } catch (_) {}
      res.json({ success: true, message: `Receipt sent to ${to}` });
    } catch (error) {
      console.error('Error sending payment receipt:', error);
      res.status(500).json({ error: 'Failed to send receipt: ' + ((error as Error).message || error) });
    }
  });

  // SMS invoice to client
  app.post("/api/crm/invoices/:id/sms", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { phoneNumber, customMessage } = req.body;
      
      const invoice = await storage.getCrmInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const client = await storage.getCrmClient(invoice.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const clientPhone = phoneNumber || client.phone;
      if (!clientPhone) {
        return res.status(400).json({ error: "No phone number provided or available for client" });
      }

      // Create invoice link
      const baseUrl = getBaseUrl();
      const invoiceUrl = `${baseUrl}/invoice/${invoice.id}`;
      
      // Create SMS message
      const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Kunde';
      const defaultMessage = `Hallo ${clientName},

hier ist Ihre Rechnung von ${getBizName()}:

📄 Rechnungsnummer: ${invoice.invoiceNumber}
💰 Betrag: €${parseFloat(invoice.total?.toString() || '0').toFixed(2)}
📅 Fälligkeitsdatum: ${new Date(invoice.dueDate || Date.now()).toLocaleDateString('de-DE')}

🔗 Rechnung ansehen: ${invoiceUrl}

Bei Fragen: +43 677 633 99210

${getBizName()} Team`;

      const finalMessage = customMessage || defaultMessage;

      // Import SMS service dynamically
      const { SMSService } = await import("./services/smsService");
      
      // Send SMS
      const result = await SMSService.sendSMS({
        to: clientPhone,
        content: finalMessage,
        clientId: client.id,
        messageType: 'sms'
      });

      // Log SMS activity as a CRM message
      try {
        await storage.createCrmMessage({
          senderName: process.env.BUSINESS_NAME || 'New Age Fotografie',
          senderEmail: process.env.SMTP_FROM || process.env.SMTP_USER || getEnvContactEmailSync(),
          subject: `Invoice ${invoice.invoiceNumber} sent via SMS`,
          content: `${finalMessage}\n\nLink: ${invoiceUrl}`,
          messageType: 'sms',
          status: result.success ? 'sent' : 'failed',
          clientId: client.id,
          phoneNumber: clientPhone,
          smsMessageId: result.messageId,
        } as any);
      } catch (e) {
        console.warn('Failed to log SMS as CRM message:', e);
      }

      res.json({
        success: true,
        message: "Invoice sent successfully via SMS",
        phoneNumber: clientPhone,
        smsId: result.messageId,
        invoiceUrl: invoiceUrl
      });

    } catch (error) {
      console.error("Error sending invoice SMS:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  // WhatsApp invoice to client
  app.post("/api/crm/invoices/:id/whatsapp", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { phoneNumber, customMessage } = req.body;
      
      const invoice = await storage.getCrmInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      const client = await storage.getCrmClient(invoice.clientId);
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }

      const clientPhone = phoneNumber || client.phone;
      if (!clientPhone) {
        return res.status(400).json({ error: "No phone number provided or available for client" });
      }

      // Create invoice link
      const baseUrl = getBaseUrl();
      const invoiceUrl = `${baseUrl}/invoice/${invoice.id}`;
      
      // Create WhatsApp message
      const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Kunde';
      const defaultMessage = `Hallo ${clientName},

hier ist Ihre Rechnung von ${getBizName()}:

📄 Rechnungsnummer: ${invoice.invoiceNumber}
💰 Betrag: €${parseFloat(invoice.total?.toString() || '0').toFixed(2)}
📅 Fälligkeitsdatum: ${new Date(invoice.dueDate || Date.now()).toLocaleDateString('de-DE')}

🔗 Rechnung ansehen: ${invoiceUrl}

Bei Fragen stehe ich Ihnen gerne zur Verfügung!

Mit freundlichen Grüßen,
${getBizName()} Team`;

      const finalMessage = customMessage || defaultMessage;
      
      // Create WhatsApp URL
      const cleanPhone = clientPhone.replace(/[^\d+]/g, '');
      const encodedMessage = encodeURIComponent(finalMessage);
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

      // Log WhatsApp share as a CRM message entry
      try {
        await storage.createCrmMessage({
          senderName: process.env.BUSINESS_NAME || 'New Age Fotografie',
          senderEmail: process.env.SMTP_FROM || process.env.SMTP_USER || getEnvContactEmailSync(),
          subject: `Invoice ${invoice.invoiceNumber} shared via WhatsApp`,
          content: `${finalMessage}\n\nWhatsApp: ${whatsappUrl}\nInvoice: ${invoiceUrl}`,
          messageType: 'whatsapp',
          status: 'sent',
          clientId: client.id,
          phoneNumber: clientPhone,
        } as any);
      } catch (e) {
        console.warn('Failed to log WhatsApp share as CRM message:', e);
      }

      res.json({
        success: true,
        whatsappUrl: whatsappUrl,
        invoiceUrl: invoiceUrl,
        message: "WhatsApp share link created successfully"
      });

    } catch (error) {
      console.error("Error creating WhatsApp share link:", error);
      res.status(500).json({ error: "Failed to create WhatsApp share link" });
    }
  });

  // Legacy WhatsApp share endpoint for backward compatibility
  app.post("/api/invoices/share-whatsapp", async (req: Request, res: Response) => {
    try {
      const { invoice_id, phone_number } = req.body;
      
      if (!invoice_id || !phone_number) {
        return res.status(400).json({ 
          success: false, 
          error: "invoice_id and phone_number are required" 
        });
      }

      const invoice = await storage.getCrmInvoice(invoice_id);
      if (!invoice) {
        return res.status(404).json({ 
          success: false, 
          error: "Invoice not found" 
        });
      }

      const client = await storage.getCrmClient(invoice.clientId);
      if (!client) {
        return res.status(404).json({ 
          success: false, 
          error: "Client not found" 
        });
      }

      // Create invoice link
      const baseUrl = getBaseUrl() || req.get('origin') || '';
      const invoiceUrl = `${baseUrl}/invoice/${invoice.id}`;
      
      // Create WhatsApp message
      const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Kunde';
      const message = `Hallo ${clientName} 👋

Hier ist Ihre Rechnung von ${getBizName()}:

📄 Rechnungsnummer: ${invoice.invoiceNumber}
💰 Betrag: €${parseFloat(invoice.total?.toString() || '0').toFixed(2)}
📅 Fälligkeitsdatum: ${new Date(invoice.dueDate || Date.now()).toLocaleDateString('de-DE')}

🔗 Rechnung ansehen: ${invoiceUrl}

Bei Fragen stehe ich Ihnen gerne zur Verfügung! 📸

Vielen Dank für Ihr Vertrauen!
${getBizName()} Team`;

      // Create WhatsApp URL
      const cleanPhone = phone_number.replace(/[^\d+]/g, '');
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

      res.json({
        success: true,
        whatsapp_url: whatsappUrl,
        invoice_url: invoiceUrl
      });

    } catch (error) {
      console.error("Error creating WhatsApp share link:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to create WhatsApp share link" 
      });
    }
  });

  // ==================== INVOICE STRIPE PAYMENT ROUTES ====================
  
  // Create Stripe Checkout Session for invoice payment
  app.post("/api/invoices/:id/create-payment-session", async (req: Request, res: Response) => {
    try {
      if (!stripe || !stripeConfigured) {
        return res.status(503).json({ 
          success: false, 
          error: "Payment service not configured" 
        });
      }

      const invoiceId = req.params.id;
      const invoice = await storage.getCrmInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ 
          success: false, 
          error: "Invoice not found" 
        });
      }

      // Check if already paid
      if (invoice.status === 'paid') {
        return res.status(400).json({ 
          success: false, 
          error: "Invoice already paid" 
        });
      }

      // Get client details
      const client = await storage.getCrmClient(invoice.clientId);
      const clientEmail = client?.email || 'customer@example.com';
      const clientName = client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() : 'Customer';

      // Calculate amount (convert to cents for Stripe)
      const paidAmount = parseFloat(invoice.paidAmount?.toString() || '0');
      const totalAmount = parseFloat(invoice.total?.toString() || '0');
      const balanceDue = totalAmount - paidAmount;
      
      if (balanceDue <= 0) {
        return res.status(400).json({ 
          success: false, 
          error: "No balance due on this invoice" 
        });
      }

      const amountInCents = Math.round(balanceDue * 100);

      // Determine base URL for redirect
      const baseUrl = process.env.BASE_URL || process.env.FRONTEND_URL || req.get('origin') || 'https://workingnewage-2eecd723a444.herokuapp.com';

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: clientEmail,
        line_items: [
          {
            price_data: {
              currency: (invoice.currency || 'EUR').toLowerCase(),
              product_data: {
                name: `Invoice ${invoice.invoiceNumber}`,
                description: `Payment for invoice ${invoice.invoiceNumber} - ${clientName}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/invoice/${invoiceId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/invoice/${invoiceId}?payment=cancelled`,
        metadata: {
          invoiceId: invoiceId,
          invoiceNumber: invoice.invoiceNumber || '',
          clientId: invoice.clientId || '',
        },
      });

      // Store the payment intent/session ID
      await storage.updateCrmInvoice(invoiceId, {
        stripePaymentIntentId: session.id,
        stripePaymentUrl: session.url,
      });

      res.json({
        success: true,
        sessionId: session.id,
        url: session.url,
      });

    } catch (error) {
      console.error("Error creating payment session:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to create payment session" 
      });
    }
  });

  // Verify payment status and update invoice
  app.get("/api/invoices/:id/payment-status", async (req: Request, res: Response) => {
    try {
      const invoiceId = req.params.id;
      const sessionId = req.query.session_id as string;

      if (!stripe || !stripeConfigured) {
        return res.status(503).json({ 
          success: false, 
          error: "Payment service not configured" 
        });
      }

      const invoice = await storage.getCrmInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ 
          success: false, 
          error: "Invoice not found" 
        });
      }

      // If session_id provided, check with Stripe
      if (sessionId) {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session.payment_status === 'paid') {
          // Update invoice status to paid
          const totalAmount = parseFloat(invoice.total?.toString() || '0');
          await storage.updateCrmInvoice(invoiceId, {
            status: 'paid',
            paidAmount: totalAmount.toString(),
          });

          // Record payment
          await storage.createCrmInvoicePayment({
            invoiceId: invoiceId,
            amount: totalAmount.toString(),
            paymentMethod: 'stripe',
            paymentReference: session.payment_intent as string,
            paymentDate: new Date().toISOString(),
            notes: `Stripe payment - Session: ${sessionId}`,
          });

          return res.json({
            success: true,
            status: 'paid',
            message: 'Payment confirmed',
          });
        }
      }

      res.json({
        success: true,
        status: invoice.status,
        paidAmount: invoice.paidAmount,
      });

    } catch (error) {
      console.error("Error checking payment status:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to check payment status" 
      });
    }
  });

  // ==================== PRIMARY STRIPE WEBHOOK ====================
  // Signal that the full webhook handler is now active (disables the early boot handler)
  (global as any).__fullWebhookRegistered = true;
  console.log('✅ Full Stripe webhook handler registered — early boot handler disabled');

  // Webhook health check - test if endpoint is reachable
  app.get("/api/stripe/webhook/health", (_req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      stripeConfigured: stripeConfigured,
      webhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.startsWith('http'))
    });
  });

  // Fast-responding webhook endpoint for all Stripe events
  // This endpoint responds immediately to prevent timeouts, then processes asynchronously
  app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const startTime = Date.now();
    console.log(`🔵 Webhook request received at ${new Date().toISOString()}`);
    
    if (!stripe || !stripeConfigured) {
      console.error('❌ Stripe not configured for webhook');
      return res.status(503).json({ error: "Payment service not configured" });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig) {
      console.error('❌ Missing Stripe signature header');
      return res.status(400).json({ error: 'Missing Stripe signature' });
    }

    if (!webhookSecret || webhookSecret.startsWith('http')) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured correctly. Must be whsec_* secret from Stripe Dashboard, not a URL!');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature - req.body should be a Buffer from express.raw()
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      console.log(`✅ Webhook signature verified: ${event.type} (${Date.now() - startTime}ms)`);
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // RESPOND IMMEDIATELY - Don't make Stripe wait for processing
    res.status(200).json({ received: true, type: event.type, id: event.id });
    console.log(`⚡ Webhook response sent (${Date.now() - startTime}ms) - Processing ${event.type} async`);

    // Process webhook event ASYNCHRONOUSLY after response
    setImmediate(async () => {
      try {
        const processStart = Date.now();
        
        switch (event.type) {
          case 'checkout.session.completed':
          case 'checkout.session.async_payment_succeeded':
            await handleCheckoutCompleted(event);
            console.log(`✅ Processed ${event.type} in ${Date.now() - processStart}ms`);
            break;

          case 'checkout.session.expired':
            await handleCheckoutExpired(event);
            console.log(`✅ Processed ${event.type} in ${Date.now() - processStart}ms`);
            break;

          default:
            console.log(`ℹ️ Unhandled webhook event type: ${event.type}`);
        }
      } catch (err) {
        console.error(`❌ Error processing webhook ${event.type}:`, err);
        // Don't throw - webhook already acknowledged
      }
    });
  });

  // Helper function to process completed checkout sessions
  async function handleCheckoutCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Handle CRM invoice payments
    const invoiceId = session.metadata?.invoiceId || session.metadata?.invoice_id;
    if (invoiceId && session.payment_status === 'paid') {
      try {
        const invoice = await storage.getCrmInvoice(invoiceId);
        if (invoice) {
          const totalAmount = parseFloat(invoice.total?.toString() || '0');
          
          await storage.updateCrmInvoice(invoiceId, {
            status: 'paid',
            paidAmount: totalAmount.toString(),
          });

          await storage.createCrmInvoicePayment({
            invoiceId: invoiceId,
            amount: totalAmount.toString(),
            paymentMethod: 'stripe',
            paymentReference: session.payment_intent as string,
            paymentDate: new Date().toISOString(),
            notes: `Stripe checkout completed - Session: ${session.id}`,
          });

          console.log(`✅ CRM Invoice ${invoiceId} marked as paid`);
        }
      } catch (err) {
        console.error('❌ Error updating CRM invoice:', err);
      }
    }

    // Handle voucher sales
    const voucherSaleId = session.metadata?.voucherSaleId;
    if (voucherSaleId && session.payment_status === 'paid') {
      try {
        // Update voucher sale status
        await db.execute(
          sql`UPDATE voucher_sales SET payment_status = 'paid' WHERE id = ${voucherSaleId}`
        );
        console.log(`✅ Voucher sale ${voucherSaleId} marked as paid`);
      } catch (err) {
        console.error('❌ Error updating voucher sale:', err);
      }
    }
  }

  // Helper function to process expired checkout sessions
  async function handleCheckoutExpired(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId || session.metadata?.invoice_id;
    
    if (invoiceId) {
      try {
        const invoice = await storage.getCrmInvoice(invoiceId);
        if (invoice && invoice.status !== 'paid') {
          await storage.updateCrmInvoice(invoiceId, {
            status: 'expired',
          });
          console.log(`✅ Invoice ${invoiceId} marked as expired`);
        }
      } catch (err) {
        console.error('❌ Error marking invoice as expired:', err);
      }
    }
  }

  // Stripe webhook for invoice payments
  app.post("/api/invoices/webhook", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    if (!stripe || !stripeConfigured) {
      return res.status(503).json({ error: "Payment service not configured" });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_INVOICE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      console.warn('Missing Stripe signature or webhook secret for invoice payment');
      return res.status(400).send('Missing signature');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('Invoice webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // RESPOND IMMEDIATELY to prevent Stripe timeouts
    res.status(200).json({ received: true });

    // Process asynchronously after response
    setImmediate(async () => {
      try {
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as Stripe.Checkout.Session;
          const invoiceId = session.metadata?.invoiceId;

          if (invoiceId && session.payment_status === 'paid') {
            try {
              const invoice = await storage.getCrmInvoice(invoiceId);
              if (invoice) {
                const totalAmount = parseFloat(invoice.total?.toString() || '0');
            
                await storage.updateCrmInvoice(invoiceId, {
                  status: 'paid',
                  paidAmount: totalAmount.toString(),
                });

                await storage.createCrmInvoicePayment({
                  invoiceId: invoiceId,
                  amount: totalAmount.toString(),
                  paymentMethod: 'stripe',
                  paymentReference: session.payment_intent as string,
                  paymentDate: new Date().toISOString(),
                  notes: `Stripe checkout completed - Session: ${session.id}`,
                });

                console.log(`✅ Invoice ${invoiceId} marked as paid via Stripe webhook`);
              }
            } catch (err) {
              console.error('Error processing invoice payment webhook:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error in invoice webhook async processing:', err);
      }
    });
  });

  // ==================== EMAIL ROUTES ====================
  app.post("/api/email/import", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { provider, smtpHost, smtpPort, username, password, useTLS, imapHost: providedImapHost } = req.body;

      // Basic validation
      if (!smtpHost || !smtpPort || !username || !password) {
        return res.status(400).json({
          success: false,
          message: "Missing required connection parameters"
        });
      }

      console.log(`Attempting to import emails from ${username} via ${smtpHost}:${smtpPort}`);

      // Special handling for EasyName/business email
      // Check for EasyName SMTP host or known business mailbox usernames
      const isEasyNameHost = smtpHost.includes('easyname');
      const isBusinessMailbox = username === (process.env.BUSINESS_MAILBOX_USER || '') || 
                                username === (process.env.STUDIO_NOTIFY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER) || 
                                username === process.env.BUSINESS_MAILBOX_USER;
      
      if (isEasyNameHost || isBusinessMailbox) {
        console.log('Using EasyName IMAP settings for business email');
        const mailboxUser = username;
        const mailboxPass = password;

        const importedEmails = await importEmailsFromIMAP({
          host: 'imap.easyname.com',
          port: 993,
          username: mailboxUser,
          password: mailboxPass,
          useTLS: true
        });

        console.log(`Successfully fetched ${importedEmails.length} emails from business account`);

        // Store emails in database, avoid duplicates
        let newEmailCount = 0;
        
        for (const email of importedEmails) {
          // Check if email already exists using DB query instead of loading all messages into memory
          const isDuplicate = await checkEmailExists(email);
          
          if (!isDuplicate) {
            try {
              // Try to match email to a client
              const clientId = await findClientIdByEmail(email.from);
              
              await storage.createCrmMessage({
                senderName: email.fromName,
                senderEmail: email.from,
                subject: email.subject,
                content: email.body,
                status: email.isRead ? 'read' : 'unread',
                clientId: clientId || undefined
              });
              newEmailCount++;
              console.log(`Imported new email: ${email.subject} from ${email.from}${clientId ? ` (linked to client ${clientId})` : ''}`);
            } catch (error) {
              console.error('Failed to save email:', error);
            }
          }
        }
        
        console.log(`Imported ${newEmailCount} new emails out of ${importedEmails.length} fetched`);

        return res.json({
          success: true,
          message: `Successfully imported ${importedEmails.length} emails from ${username}`,
          count: importedEmails.length
        });
      }

      // Convert SMTP server to IMAP server for major providers
      let imapHost = smtpHost;
      if (provider === 'gmail') {
        imapHost = 'imap.gmail.com';
      } else if (provider === 'outlook') {
        imapHost = 'outlook.office365.com';
      } else if (smtpHost.includes('smtp.')) {
        imapHost = smtpHost.replace('smtp.', 'imap.');
      }

      // Import actual emails using IMAP
      const importedEmails = await importEmailsFromIMAP({
        host: imapHost,
        port: provider === 'gmail' ? 993 : (provider === 'outlook' ? 993 : 993),
        username,
        password,
        useTLS: useTLS !== false
      });

      console.log(`Successfully fetched ${importedEmails.length} emails from ${username}`);

      // Store emails in database with client matching
      for (const email of importedEmails) {
        // Try to match email to a client
        const clientId = await findClientIdByEmail(email.from);
        
        await storage.createCrmMessage({
          senderName: email.fromName,
          senderEmail: email.from,
          subject: email.subject,
          content: email.body,
          status: email.isRead ? 'read' : 'unread',
          clientId: clientId || undefined
        });
        
        if (clientId) {
          console.log(`Linked email from ${email.from} to client ${clientId}`);
        }
      }

      return res.json({
        success: true,
        message: `Successfully imported ${importedEmails.length} emails from ${username}`,
        count: importedEmails.length
      });
    } catch (error) {
      console.error("Error importing emails:", error);
      res.status(500).json({
        success: false,
        message: "Failed to import emails: " + (error as Error).message
      });
    }
  });

  app.get("/api/crm/messages", authenticateUser, async (req: Request, res: Response) => {
    try {
      const messages = await storage.getCrmMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/crm/messages/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const message = await storage.updateCrmMessage(id, updates);
      res.json(message);
    } catch (error) {
      console.error("Error updating message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/crm/messages/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteCrmMessage(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== INBOX EMAIL ROUTES ====================
  app.get("/api/inbox/emails", authenticateUser, async (req: Request, res: Response) => {
    try {
      const unreadOnly = req.query.unread === 'true';
      const messages = await storage.getCrmMessages();
      
      // Build a client lookup map for enriching messages with client names
      let clientMap: Record<string, { name: string; email: string }> = {};
      try {
        const clients = await storage.getCrmClients();
        for (const c of clients) {
          clientMap[c.id] = { name: `${c.firstName} ${c.lastName}`, email: c.email };
          // Also map by email for auto-matching
          if (c.email) {
            clientMap[`email:${c.email.toLowerCase().trim()}`] = { name: `${c.firstName} ${c.lastName}`, email: c.email };
          }
        }
      } catch (e) {
        console.warn('Could not load clients for email enrichment:', e);
      }
      
      // Filter to only show INBOUND messages (received emails)
      // Sent emails (outbound) should only appear in the Sent folder
      const inboundMessages = messages.filter(message => {
        // Exclude outbound/sent messages from inbox
        if (message.direction === 'outbound') return false;
        if (message.status === 'sent' || message.status === 'demo_sent') return false;
        return true;
      });
      
      // Enrich messages with client info
      const enrichedMessages = inboundMessages.map(msg => {
        let clientName: string | null = null;
        let resolvedClientId: string | null = msg.clientId || null;
        
        if (msg.clientId && clientMap[msg.clientId]) {
          clientName = clientMap[msg.clientId].name;
        } else if (msg.senderEmail) {
          // Try to find client by sender email
          const lookup = clientMap[`email:${msg.senderEmail.toLowerCase().trim()}`];
          if (lookup) {
            clientName = lookup.name;
          }
        }
        
        return { ...msg, clientName, clientId: resolvedClientId };
      });
      
      // Sort messages by creation date (newest first)
      const sortedMessages = enrichedMessages.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      if (unreadOnly) {
        const unreadMessages = sortedMessages.filter(message => message.status === 'unread');
        res.json(unreadMessages);
      } else {
        res.json(sortedMessages);
      }
    } catch (error) {
      console.error("Error fetching inbox emails:", error);
      // Fail-open to avoid blocking dashboard if storage fails
      res.json([]);
    }
  });

  // ==================== INBOX FOLDERS ROUTES ====================
  
  // Ensure email_folders table exists
  const ensureEmailFoldersTable = async () => {
    try {
      await runSql(`
        CREATE TABLE IF NOT EXISTS email_folders (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          color TEXT DEFAULT '#6366f1',
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )`);
      // Add folder_id column to crm_messages if not exists
      await runSql(`ALTER TABLE crm_messages ADD COLUMN IF NOT EXISTS folder_id UUID`);
    } catch (e) {
      console.warn('⚠️ Email folders table ensure failed:', (e as Error).message);
    }
  };

  // GET /api/inbox/folders - List all folders
  app.get("/api/inbox/folders", authenticateUser, async (req: Request, res: Response) => {
    try {
      await ensureEmailFoldersTable();
      const folders = await runSql(`
        SELECT id, name, color, sort_order, created_at, updated_at
        FROM email_folders
        ORDER BY sort_order ASC, created_at ASC
      `);
      res.json(folders || []);
    } catch (error) {
      console.error('Error fetching inbox folders:', error);
      res.json([]);
    }
  });

  // POST /api/inbox/folders - Create a new folder
  app.post("/api/inbox/folders", authenticateUser, async (req: Request, res: Response) => {
    try {
      await ensureEmailFoldersTable();
      const { name, color } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Folder name is required' });
      }
      const result = await runSql(`
        INSERT INTO email_folders (name, color, sort_order)
        VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) + 1 FROM email_folders), 0))
        RETURNING id, name, color, sort_order, created_at, updated_at
      `, [name, color || '#6366f1']);
      res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error creating inbox folder:', error);
      res.status(500).json({ error: 'Failed to create folder' });
    }
  });

  // PUT /api/inbox/folders/:id - Update a folder
  app.put("/api/inbox/folders/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await ensureEmailFoldersTable();
      const { id } = req.params;
      const { name, color } = req.body;
      const result = await runSql(`
        UPDATE email_folders
        SET name = COALESCE($1, name),
            color = COALESCE($2, color),
            updated_at = NOW()
        WHERE id = $3::uuid
        RETURNING id, name, color, sort_order, created_at, updated_at
      `, [name, color, id]);
      if (!result || result.length === 0) {
        return res.status(404).json({ error: 'Folder not found' });
      }
      res.json(result[0]);
    } catch (error) {
      console.error('Error updating inbox folder:', error);
      res.status(500).json({ error: 'Failed to update folder' });
    }
  });

  // DELETE /api/inbox/folders/:id - Delete a folder
  app.delete("/api/inbox/folders/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await ensureEmailFoldersTable();
      const { id } = req.params;
      // Move emails from this folder back to inbox (null folder_id)
      await runSql(`UPDATE crm_messages SET folder_id = NULL WHERE folder_id = $1::uuid`, [id]);
      // Delete the folder
      await runSql(`DELETE FROM email_folders WHERE id = $1::uuid`, [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting inbox folder:', error);
      res.status(500).json({ error: 'Failed to delete folder' });
    }
  });

  // POST /api/inbox/emails/move - Move emails to a folder
  app.post("/api/inbox/emails/move", authenticateUser, async (req: Request, res: Response) => {
    try {
      await ensureEmailFoldersTable();
      const { messageIds, folderId } = req.body;
      if (!messageIds || !Array.isArray(messageIds)) {
        return res.status(400).json({ error: 'messageIds array is required' });
      }
      // folderId can be null to move back to inbox
      for (const msgId of messageIds) {
        await runSql(`UPDATE crm_messages SET folder_id = $1, updated_at = NOW() WHERE id = $2::uuid`, [folderId || null, msgId]);
      }
      res.json({ success: true, moved: messageIds.length });
    } catch (error) {
      console.error('Error moving emails:', error);
      res.status(500).json({ error: 'Failed to move emails' });
    }
  });

  // PUT /api/inbox/emails/mark-read - Mark emails as read or unread
  app.put("/api/inbox/emails/mark-read", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { messageIds, isRead } = req.body;
      if (!messageIds || !Array.isArray(messageIds)) {
        return res.status(400).json({ error: 'messageIds array is required' });
      }
      const newStatus = isRead ? 'read' : 'unread';
      for (const msgId of messageIds) {
        await runSql(
          `UPDATE crm_messages SET status = $1, updated_at = NOW() WHERE id = $2::uuid`,
          [newStatus, msgId]
        );
      }
      res.json({ success: true, updated: messageIds.length });
    } catch (error) {
      console.error('Error marking emails as read:', error);
      res.status(500).json({ error: 'Failed to update email status' });
    }
  });

  // PUT /api/inbox/emails/:id/link-client - Manually link an email to a client
  app.put("/api/inbox/emails/:id/link-client", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { clientId } = req.body;
      
      if (!clientId) {
        // Unlink the email from any client
        await storage.updateCrmMessage(id, { clientId: null as any });
        return res.json({ success: true, message: 'Email unlinked from client' });
      }
      
      // Verify the client exists
      const client = await storage.getCrmClient(clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      
      await storage.updateCrmMessage(id, { clientId });
      console.log(`🔗 Manually linked email ${id} to client ${client.firstName} ${client.lastName} (${clientId})`);
      
      res.json({ 
        success: true, 
        message: `Email linked to ${client.firstName} ${client.lastName}`,
        client: { id: client.id, name: `${client.firstName} ${client.lastName}`, email: client.email }
      });
    } catch (error) {
      console.error('Error linking email to client:', error);
      res.status(500).json({ error: 'Failed to link email to client' });
    }
  });

  // POST /api/inbox/emails/auto-link - Bulk auto-link all unlinked emails to clients by email match
  app.post("/api/inbox/emails/auto-link", authenticateUser, async (req: Request, res: Response) => {
    try {
      const allMessages = await storage.getCrmMessages();
      const clients = await storage.getCrmClients();
      let linkedCount = 0;
      const linkedEmails: Array<{ messageId: string; clientName: string; senderEmail: string }> = [];
      
      for (const msg of allMessages) {
        if (!msg.clientId && msg.senderEmail) {
          const normalizedSender = msg.senderEmail.toLowerCase().trim();
          const matchingClient = clients.find(c => 
            c.email && c.email.toLowerCase().trim() === normalizedSender
          );
          if (matchingClient) {
            await storage.updateCrmMessage(msg.id, { clientId: matchingClient.id });
            linkedCount++;
            linkedEmails.push({
              messageId: msg.id,
              clientName: `${matchingClient.firstName} ${matchingClient.lastName}`,
              senderEmail: msg.senderEmail
            });
          }
        }
      }
      
      console.log(`🔗 Auto-linked ${linkedCount} emails to clients`);
      res.json({ 
        success: true, 
        linkedCount, 
        linkedEmails,
        message: `Auto-linked ${linkedCount} emails to matching clients`
      });
    } catch (error) {
      console.error('Error auto-linking emails:', error);
      res.status(500).json({ error: 'Failed to auto-link emails' });
    }
  });

  // GET /api/inbox/emails/clients-list - Get all clients for the link-to-client picker
  app.get("/api/inbox/emails/clients-list", authenticateUser, async (_req: Request, res: Response) => {
    try {
      const clients = await storage.getCrmClients();
      const clientList = clients.map(c => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        phone: c.phone
      }));
      // Sort alphabetically by name
      clientList.sort((a, b) => a.name.localeCompare(b.name));
      res.json(clientList);
    } catch (error) {
      console.error('Error fetching clients list:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  });

  // ==================== BULK DELETE UNREAD EMAILS ====================
  app.post("/api/inbox/emails/bulk-delete-unread", authenticateUser, async (_req: Request, res: Response) => {
    try {
      // Delete all inbound emails with status 'unread'
      const result = await runSql(
        `DELETE FROM crm_messages WHERE status = 'unread' AND (direction = 'inbound' OR direction IS NULL) RETURNING id`
      );
      const deletedCount = result.length;
      console.log(`🗑️ Bulk deleted ${deletedCount} unread emails`);
      res.json({ success: true, deletedCount, message: `Deleted ${deletedCount} unread emails` });
    } catch (error) {
      console.error('Error bulk deleting unread emails:', error);
      res.status(500).json({ error: 'Failed to bulk delete unread emails' });
    }
  });

  // ==================== SPAM RULES CRUD ====================
  // GET all spam rules
  app.get("/api/inbox/spam-rules", authenticateUser, async (_req: Request, res: Response) => {
    try {
      const rules = await db.select().from(spamRules).orderBy(desc(spamRules.createdAt));
      res.json(rules);
    } catch (error) {
      console.error('Error fetching spam rules:', error);
      res.status(500).json({ error: 'Failed to fetch spam rules' });
    }
  });

  // POST create spam rule
  app.post("/api/inbox/spam-rules", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { ruleType, value, reason } = req.body;
      if (!ruleType || !value) {
        return res.status(400).json({ error: 'ruleType and value are required' });
      }
      if (!['sender', 'domain', 'keyword'].includes(ruleType)) {
        return res.status(400).json({ error: 'ruleType must be sender, domain, or keyword' });
      }
      const [rule] = await db.insert(spamRules).values({
        ruleType,
        value: value.trim().toLowerCase(),
        reason: reason || null,
        isActive: true,
      }).returning();
      res.json(rule);
    } catch (error) {
      console.error('Error creating spam rule:', error);
      res.status(500).json({ error: 'Failed to create spam rule' });
    }
  });

  // DELETE spam rule
  app.delete("/api/inbox/spam-rules/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await db.delete(spamRules).where(eq(spamRules.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting spam rule:', error);
      res.status(500).json({ error: 'Failed to delete spam rule' });
    }
  });

  // PATCH toggle spam rule active/inactive
  app.patch("/api/inbox/spam-rules/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { isActive } = req.body;
      const [rule] = await db.update(spamRules).set({ isActive }).where(eq(spamRules.id, req.params.id)).returning();
      res.json(rule);
    } catch (error) {
      console.error('Error updating spam rule:', error);
      res.status(500).json({ error: 'Failed to update spam rule' });
    }
  });

  // ==================== SPAM FILTER ====================
  app.post("/api/inbox/emails/spam-filter", authenticateUser, async (_req: Request, res: Response) => {
    try {
      const allMessages = await storage.getCrmMessages();
      const clients = await storage.getCrmClients();
      
      // Load user-defined spam rules
      const customRules = await db.select().from(spamRules).where(eq(spamRules.isActive, true));
      const blockedSenders = new Set(customRules.filter(r => r.ruleType === 'sender').map(r => r.value.toLowerCase()));
      const blockedDomains = customRules.filter(r => r.ruleType === 'domain').map(r => r.value.toLowerCase());
      const blockedKeywords = customRules.filter(r => r.ruleType === 'keyword').map(r => r.value.toLowerCase());

      // Build set of known client emails for whitelisting
      const clientEmails = new Set<string>();
      for (const c of clients) {
        if (c.email) clientEmails.add(c.email.toLowerCase().trim());
      }

      // Spam detection patterns
      const spamSubjectPatterns = [
        /\bfree\s+(gift|offer|trial|money|sample|shipping)\b/i,
        /\b(viagra|cialis|pharmacy|pills|medication)\b/i,
        /\b(casino|lottery|jackpot|prize|winner|won)\b/i,
        /\b(unsubscribe|click\s+here|act\s+now|limited\s+time)\b/i,
        /\b(earn\s+money|make\s+money|extra\s+income|work\s+from\s+home)\b/i,
        /\b(bitcoin|crypto|investment\s+opportunity)\b/i,
        /\b(weight\s+loss|lose\s+weight|diet\s+pill)\b/i,
        /\b(nigerian|prince|inheritance|beneficiary|million\s+dollars)\b/i,
        /\b(upgrade\s+now|account\s+suspended|verify\s+your\s+account)\b/i,
        /\b(congratulations|you\s+have\s+been\s+selected)\b/i,
        /\b(cheap|discount|sale|deal|offer|promo|coupon)\b/i,
        /\b(replica|knockoff|luxury\s+watches)\b/i,
        /\b(dating|singles|hookup|adult)\b/i,
        /\b(newsletter|abmelden|abbestellen)\b/i,
      ];
      
      const spamSenderPatterns = [
        /noreply@/i,
        /no-reply@/i,
        /newsletter@/i,
        /marketing@/i,
        /promo(tions?)?@/i,
        /info@(?!newagefotografie)/i,
        /support@(?!newagefotografie)/i,
        /sales@/i,
        /deals@/i,
        /offers@/i,
        /notification@/i,
        /update@/i,
        /mailer-daemon@/i,
        /bounce@/i,
      ];

      const spamContentPatterns = [
        /\bunsubscribe\b/i,
        /\bclick\s+here\s+to\s+(remove|opt[\s-]?out|unsubscribe)\b/i,
        /\bthis\s+(is\s+a\s+)?marketing\s+(email|message)\b/i,
        /\byou\s+are\s+receiving\s+this\s+(because|email)\b/i,
        /\bview\s+(this\s+)?in\s+browser\b/i,
        /\bemail\s+preferences\b/i,
        /\bpowered\s+by\s+(mailchimp|sendgrid|hubspot|constant\s+contact|brevo|sendinblue)\b/i,
      ];

      const spamIds: string[] = [];
      const spamDetails: Array<{ id: string; subject: string; sender: string; reason: string }> = [];

      for (const msg of allMessages) {
        // Skip outbound messages
        if (msg.direction === 'outbound' || msg.status === 'sent' || msg.status === 'demo_sent') continue;
        
        // Skip messages from known clients (whitelist)
        if (msg.senderEmail && clientEmails.has(msg.senderEmail.toLowerCase().trim())) continue;
        
        let spamScore = 0;
        let reasons: string[] = [];

        // Check user-defined blocked senders (exact match)
        if (msg.senderEmail && blockedSenders.has(msg.senderEmail.toLowerCase().trim())) {
          spamScore += 10;
          reasons.push(`Blocked sender: ${msg.senderEmail}`);
        }

        // Check user-defined blocked domains
        if (msg.senderEmail) {
          const emailDomain = msg.senderEmail.toLowerCase().split('@')[1];
          if (emailDomain) {
            for (const domain of blockedDomains) {
              if (emailDomain === domain || emailDomain.endsWith('.' + domain)) {
                spamScore += 10;
                reasons.push(`Blocked domain: ${emailDomain}`);
                break;
              }
            }
          }
        }

        // Check user-defined blocked keywords in subject and content
        for (const keyword of blockedKeywords) {
          const subjectMatch = msg.subject && msg.subject.toLowerCase().includes(keyword);
          const contentMatch = msg.content && msg.content.toLowerCase().includes(keyword);
          if (subjectMatch || contentMatch) {
            spamScore += 10;
            reasons.push(`Blocked keyword: "${keyword}"`);
            break;
          }
        }

        // Check sender patterns
        if (msg.senderEmail) {
          for (const pattern of spamSenderPatterns) {
            if (pattern.test(msg.senderEmail)) {
              spamScore += 2;
              reasons.push(`Sender pattern: ${msg.senderEmail}`);
              break;
            }
          }
        }

        // Check subject patterns
        if (msg.subject) {
          let subjectHits = 0;
          for (const pattern of spamSubjectPatterns) {
            if (pattern.test(msg.subject)) {
              subjectHits++;
            }
          }
          if (subjectHits > 0) {
            spamScore += subjectHits * 2;
            reasons.push(`Subject spam keywords (${subjectHits} hits)`);
          }
        }

        // Check content patterns
        if (msg.content) {
          let contentHits = 0;
          for (const pattern of spamContentPatterns) {
            if (pattern.test(msg.content)) {
              contentHits++;
            }
          }
          if (contentHits >= 2) {
            spamScore += contentHits;
            reasons.push(`Content spam markers (${contentHits} hits)`);
          }
        }

        // ALL CAPS subject check
        if (msg.subject && msg.subject.length > 10 && msg.subject === msg.subject.toUpperCase()) {
          spamScore += 2;
          reasons.push('ALL CAPS subject');
        }

        // Excessive exclamation/question marks
        if (msg.subject && (msg.subject.match(/[!?]{2,}/g) || []).length > 0) {
          spamScore += 1;
          reasons.push('Excessive punctuation');
        }

        // If spam score is 3 or higher, mark as spam
        if (spamScore >= 3) {
          spamIds.push(msg.id);
          spamDetails.push({
            id: msg.id,
            subject: msg.subject || '(No Subject)',
            sender: msg.senderEmail || 'unknown',
            reason: reasons.join('; ')
          });
        }
      }

      // Delete identified spam
      let deletedCount = 0;
      if (spamIds.length > 0) {
        // Delete in batches
        for (let i = 0; i < spamIds.length; i += 50) {
          const batch = spamIds.slice(i, i + 50);
          const placeholders = batch.map((_, j) => `$${j + 1}::uuid`).join(', ');
          await runSql(`DELETE FROM crm_messages WHERE id IN (${placeholders})`, batch);
          deletedCount += batch.length;
        }
      }

      console.log(`🛡️ Spam filter: scanned ${allMessages.length} messages, detected ${spamIds.length} spam, deleted ${deletedCount}`);
      res.json({
        success: true,
        scannedCount: allMessages.length,
        spamCount: spamIds.length,
        deletedCount,
        spamDetails: spamDetails.slice(0, 50), // Return first 50 for preview
        message: `Detected and removed ${deletedCount} spam emails out of ${allMessages.length} scanned`
      });
    } catch (error) {
      console.error('Error running spam filter:', error);
      res.status(500).json({ error: 'Failed to run spam filter' });
    }
  });

  // ==================== ADMIN DASHBOARD ====================
  app.get("/api/admin/dashboard-stats", authenticateUser, async (_req: Request, res: Response) => {
    try {
      const [totalRows, upcomingRows, completedRows, revenueRows, depositsRows, leadsRows] = await Promise.all([
        runSql(`SELECT COUNT(*) as cnt FROM photography_sessions`),
        runSql(`SELECT COUNT(*) as cnt FROM photography_sessions WHERE start_time >= NOW() AND start_time <= NOW() + interval '30 days' AND status != 'cancelled'`),
        runSql(`SELECT COUNT(*) as cnt FROM photography_sessions WHERE status = 'completed' AND start_time >= date_trunc('month', NOW()) AND start_time < date_trunc('month', NOW()) + interval '1 month'`),
        runSql(`SELECT COALESCE(SUM(base_price::numeric), 0) as total FROM photography_sessions WHERE status = 'completed' AND start_time >= date_trunc('month', NOW()) AND start_time < date_trunc('month', NOW()) + interval '1 month'`),
        runSql(`SELECT COUNT(*) as cnt FROM photography_sessions WHERE deposit_paid = false AND deposit_amount IS NOT NULL AND deposit_amount::numeric > 0 AND start_time >= NOW()`),
        runSql(`SELECT COUNT(*) as cnt FROM crm_leads WHERE status = 'new'`),
      ]);

      res.json({
        totalSessions: parseInt(totalRows?.[0]?.cnt) || 0,
        upcomingSessions: parseInt(upcomingRows?.[0]?.cnt) || 0,
        completedSessions: parseInt(completedRows?.[0]?.cnt) || 0,
        totalRevenue: parseFloat(revenueRows?.[0]?.total) || 0,
        pendingDeposits: parseInt(depositsRows?.[0]?.cnt) || 0,
        equipmentConflicts: 0,
        newLeads: parseInt(leadsRows?.[0]?.cnt) || 0,
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.json({ totalSessions: 0, upcomingSessions: 0, completedSessions: 0, totalRevenue: 0, pendingDeposits: 0, equipmentConflicts: 0, newLeads: 0 });
    }
  });

  // Admin notifications endpoint
  // Admin notification feed. Notifications are DERIVED from live data with
  // stable ids (lead:<id>, sale:<id>, email:<id>, questionnaire:<id>,
  // system:<slug>) — read/dismiss state lives in admin_notification_state.
  // Every source is independently guarded so one failure can't empty the feed.
  app.get("/api/admin/notifications", authenticateUser, async (req: Request, res: Response) => {
    const items: Array<{ id: string; type: string; title: string; message: string; timestamp: string; link?: string; read?: boolean }> = [];
    const now = Date.now();
    const RECENT_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
    const ts = (d: any): number => { const t = d ? new Date(d).getTime() : 0; return Number.isFinite(t) ? t : 0; };
    const isRecent = (d: any) => { const t = ts(d); return t > 0 && now - t < RECENT_MS; };
    const iso = (d: any) => new Date(ts(d) || now).toISOString();

    // 1) New (unworked) leads
    try {
      const leads = await db.select().from(crmLeads).orderBy(desc(crmLeads.createdAt)).limit(20);
      for (const l of leads as any[]) {
        if (!isRecent(l.createdAt) || String(l.status || 'new') !== 'new') continue;
        items.push({
          id: `lead:${l.id}`,
          type: 'lead',
          title: 'New lead',
          message: [l.name, l.email, l.source ? `via ${l.source}` : ''].filter(Boolean).join(' · '),
          timestamp: iso(l.createdAt),
          link: '/admin/leads',
        });
      }
    } catch (e: any) { console.warn('[notifications] leads:', e?.message); }

    // 2) Unread inbound emails
    try {
      const msgs = await db.select().from(crmMessages).orderBy(desc(crmMessages.createdAt)).limit(20);
      for (const m of msgs as any[]) {
        if (!isRecent(m.createdAt)) continue;
        if (String(m.direction || 'inbound') !== 'inbound' || String(m.status || '') !== 'unread') continue;
        items.push({
          id: `email:${m.id}`,
          type: 'email',
          title: 'New email',
          message: `${m.senderName || m.senderEmail || 'Unknown'}: ${m.subject || '(no subject)'}`,
          timestamp: iso(m.createdAt),
          link: '/admin/inbox',
        });
      }
    } catch (e: any) { console.warn('[notifications] emails:', e?.message); }

    // 3) Recent voucher sales
    try {
      const sales = (await storage.getVoucherSales()) as any[];
      for (const s of (sales || []).slice(0, 20)) {
        const when = s.createdAt || s.created_at || s.purchaseDate || s.purchase_date;
        if (!isRecent(when)) continue;
        const amount = s.finalAmount ?? s.final_amount ?? s.amount ?? s.totalAmount ?? s.total_amount;
        items.push({
          id: `sale:${s.id}`,
          type: 'sale',
          title: 'Voucher sold',
          message: [s.product_name || s.productName || 'Voucher', amount != null ? `€${amount}` : '', s.purchaserName || s.purchaser_name || s.customerName || ''].filter(Boolean).join(' · '),
          timestamp: iso(when),
          link: '/admin/voucher-sales',
        });
      }
    } catch (e: any) { console.warn('[notifications] sales:', e?.message); }

    // 4) Questionnaire responses
    try {
      const q: any = await db.execute(sql`SELECT id, client_name, created_at FROM questionnaire_responses ORDER BY created_at DESC LIMIT 10`);
      for (const r of (q?.rows || q || []) as any[]) {
        if (!isRecent(r.created_at)) continue;
        items.push({
          id: `questionnaire:${r.id}`,
          type: 'questionnaire',
          title: 'Questionnaire response',
          message: r.client_name ? `From ${r.client_name}` : 'A client completed a questionnaire',
          timestamp: iso(r.created_at),
          link: '/admin/questionnaires',
        });
      }
    } catch (e: any) { console.warn('[notifications] questionnaires:', e?.message); }

    // 5) Configuration warnings — surface silent misconfigurations
    try {
      const warn = (slug: string, title: string, message: string, link = '/admin/settings') =>
        items.push({ id: `system:${slug}`, type: 'system', title, message, timestamp: new Date(now).toISOString(), link });

      const secret = process.env.SESSION_SECRET || '';
      const weakSecret = [/change[-_ ]?in[-_ ]?production/i, /\bdev[-_ ]?secret\b/i, /change[-_ ]?me/i, /placeholder/i].some(p => p.test(secret));
      if (weakSecret) warn('weak-session-secret', 'Security: weak SESSION_SECRET', 'Your session secret looks like a placeholder — admin sessions could be forged. Rotate it now.');
      if (!process.env.STRIPE_SECRET_KEY) warn('no-stripe', 'Payments not configured', 'STRIPE_SECRET_KEY is missing — checkout will not take real payments.');
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER) warn('no-smtp', 'Email sending not configured', 'SMTP is incomplete — invoices, leads and campaigns will not send.');
      if (!process.env.OPENAI_API_KEY) warn('no-openai', 'AI features disabled', 'OPENAI_API_KEY is missing — AI generation and translation will not run.');
      if (!process.env.GOOGLE_PLACES_API_KEY) warn('no-places', 'Live Google reviews off', 'GOOGLE_PLACES_API_KEY is not set — the site shows curated reviews instead of live ones.');
      if (process.env.PULSE_API_KEY && !process.env.PULSE_PROFILE_INSTAGRAM) {
        warn('pulse-no-ig-profile', 'Pulse: Instagram account not pinned', 'PULSE_PROFILE_INSTAGRAM is unset, so Pulse posts to the workspace default Instagram account.');
      }
    } catch (e: any) { console.warn('[notifications] system:', e?.message); }

    // Apply read/dismissed state, newest first
    try {
      const state: any = await db.execute(sql`SELECT id, read_at, dismissed_at FROM admin_notification_state`);
      const rows = (state?.rows || state || []) as any[];
      const dismissed = new Set(rows.filter(r => r.dismissed_at).map(r => String(r.id)));
      const read = new Set(rows.filter(r => r.read_at).map(r => String(r.id)));
      const visible = items
        .filter(n => !dismissed.has(n.id))
        .map(n => ({ ...n, read: read.has(n.id) }))
        .sort((a, b) => ts(b.timestamp) - ts(a.timestamp))
        .slice(0, 30);
      res.setHeader('Cache-Control', 'no-store');
      return res.json(visible);
    } catch (e: any) {
      // State table missing → still return the feed (all unread).
      console.warn('[notifications] state:', e?.message);
      res.setHeader('Cache-Control', 'no-store');
      return res.json(items.sort((a, b) => ts(b.timestamp) - ts(a.timestamp)).slice(0, 30).map(n => ({ ...n, read: false })));
    }
  });

  // Mark a notification read / dismissed (ids are stable, so state persists).
  app.post("/api/admin/notifications/:id/read", authenticateUser, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      await db.execute(sql`INSERT INTO admin_notification_state (id, read_at) VALUES (${id}, NOW())
        ON CONFLICT (id) DO UPDATE SET read_at = NOW()`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[notifications] mark read failed:', error?.message);
      res.status(500).json({ error: 'Failed to mark as read' });
    }
  });

  app.post("/api/admin/notifications/:id/dismiss", authenticateUser, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      await db.execute(sql`INSERT INTO admin_notification_state (id, read_at, dismissed_at) VALUES (${id}, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET dismissed_at = NOW()`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[notifications] dismiss failed:', error?.message);
      res.status(500).json({ error: 'Failed to dismiss' });
    }
  });

  // Build stamp — tells you which commit an instance is actually running.
  // Added after a demo instance silently drifted behind production and the only
  // symptom was a missing dropdown option. Public and non-sensitive.
  app.get("/api/version", (_req: Request, res: Response) => {
    // Runtime env vars are unreliable (Heroku hides the SHA unless dyno
    // metadata is enabled), so prefer the stamp written at BUILD time.
    let stamped: { commit?: string | null; branch?: string | null; builtAt?: string } = {};
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      stamped = require('fs').existsSync('dist/build-info.json')
        ? JSON.parse(require('fs').readFileSync('dist/build-info.json', 'utf8'))
        : {};
    } catch { /* stamp is optional — never break the endpoint */ }

    const commit =
      stamped.commit ||
      process.env.RENDER_GIT_COMMIT ||
      process.env.HEROKU_SLUG_COMMIT ||
      process.env.SOURCE_VERSION ||
      process.env.GIT_COMMIT ||
      null;
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      commit,
      commitShort: commit ? String(commit).slice(0, 7) : null,
      branch: stamped.branch || process.env.RENDER_GIT_BRANCH || process.env.HEROKU_BRANCH || null,
      builtAt: stamped.builtAt || null,
      service: process.env.RENDER_SERVICE_NAME || process.env.HEROKU_APP_NAME || null,
      startedAt: SERVER_STARTED_AT,
      nodeEnv: process.env.NODE_ENV || 'development',
      demoMode: /^(1|true|yes|on)$/i.test(process.env.DEMO_MODE || ''),
    });
  });

  // Resolve a Google Maps link → { latitude, longitude }.
  // Studio owners paste the SHORT link they copied from the Maps app
  // (maps.app.goo.gl/…), which carries no coordinates, so we follow the
  // redirect server-side and read them from the expanded URL.
  // SSRF-safe: only Google Maps hosts are ever fetched.
  app.post("/api/geo/resolve-map-link", async (req: Request, res: Response) => {
    try {
      const raw = String(req.body?.url || '').trim();
      if (!raw) return res.status(400).json({ error: 'url is required' });

      let parsed: URL;
      try { parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); }
      catch { return res.status(400).json({ error: 'That does not look like a link.' }); }

      const host = parsed.hostname.toLowerCase();
      const allowed = host === 'maps.app.goo.gl'
        || host === 'goo.gl'
        || host === 'maps.google.com'
        || host.endsWith('.google.com')
        || /^(www\.)?google\.[a-z.]+$/.test(host)
        || /^maps\.google\.[a-z.]+$/.test(host);
      if (!allowed) return res.status(400).json({ error: 'Please paste a Google Maps link.' });

      // Pull coordinates out of any of the shapes Maps uses.
      const extract = (u: string): { lat: string; lng: string } | null => {
        const patterns = [
          /@(-?\d+\.\d+),(-?\d+\.\d+)/,          // /@48.2082,16.3738,17z
          /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,      // !3d48.2082!4d16.3738
          /[?&](?:ll|q|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, // ?ll= / ?q= / ?center=
        ];
        for (const p of patterns) {
          const m = u.match(p);
          if (m) return { lat: m[1], lng: m[2] };
        }
        return null;
      };

      let found = extract(parsed.toString());
      let finalUrl = parsed.toString();

      // Short link → follow the redirect chain to the full URL.
      if (!found) {
        try {
          const r = await fetch(finalUrl, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
          finalUrl = r.url || finalUrl;
          found = extract(finalUrl);
          if (!found) {
            const body = await r.text();
            found = extract(body.slice(0, 200000));
          }
        } catch { /* fall through to the not-found response */ }
      }

      if (!found) {
        return res.status(404).json({ error: "We couldn't read a location from that link. Try the full Google Maps link, or enter the coordinates manually." });
      }
      res.json({ latitude: found.lat, longitude: found.lng, resolvedUrl: finalUrl });
    } catch (error: any) {
      console.error('[geo] resolve-map-link failed:', error?.message || error);
      res.status(500).json({ error: 'Could not read that link. Please try again.' });
    }
  });

  // Admin email settings endpoint
  app.get("/api/admin/email-settings", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Return current email configuration (sanitized, no sensitive data)
      res.json({
        configured: !!process.env.SMTP_HOST,
        host: process.env.SMTP_HOST ? '***configured***' : null,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        from: process.env.SMTP_FROM || 'noreply@example.com'
      });
    } catch (error) {
      console.error('Error fetching email settings:', error);
      res.status(500).json({ error: 'Failed to fetch email settings' });
    }
  });

  // ==================== STUDIO LOCATION SETTINGS ====================
  // Get studio location settings (for Golden Hour, Weather features)
  app.get("/api/admin/studio-location", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Get the first studio config (single-tenant for now)
      const studios = await db.select().from(studioConfigs).limit(1);
      
      if (studios.length === 0) {
        // Return Vienna defaults if no studio configured
        return res.json({
          latitude: 48.2082,
          longitude: 16.3738,
          timezone: 'Europe/Vienna',
          city: 'Vienna',
          country: 'Austria',
          address: null
        });
      }
      
      const studio = studios[0];
      res.json({
        latitude: studio.latitude ? parseFloat(studio.latitude) : 48.2082,
        longitude: studio.longitude ? parseFloat(studio.longitude) : 16.3738,
        timezone: studio.timezone || 'Europe/Vienna',
        city: studio.city || 'Vienna',
        country: studio.country || 'Austria',
        address: studio.address || null
      });
    } catch (error) {
      console.error('Error fetching studio location:', error);
      // Return defaults on error
      res.json({
        latitude: 48.2082,
        longitude: 16.3738,
        timezone: 'Europe/Vienna',
        city: 'Vienna',
        country: 'Austria',
        address: null
      });
    }
  });

  // Update studio location settings
  app.put("/api/admin/studio-location", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { latitude, longitude, timezone, city, country, address } = req.body;
      
      // Get existing studio or create new one
      const studios = await db.select().from(studioConfigs).limit(1);
      
      if (studios.length === 0) {
        return res.status(400).json({ error: 'No studio configuration found. Please create one first.' });
      }
      
      const studioId = studios[0].id;
      
      // Update studio location fields
      await db.update(studioConfigs)
        .set({
          latitude: latitude?.toString() || null,
          longitude: longitude?.toString() || null,
          timezone: timezone || 'Europe/Vienna',
          city: city || studios[0].city,
          country: country || studios[0].country,
          address: address || studios[0].address,
          updatedAt: new Date()
        })
        .where(eq(studioConfigs.id, studioId));
      
      res.json({ 
        success: true, 
        message: 'Studio location updated successfully',
        location: { latitude, longitude, timezone, city, country, address }
      });
    } catch (error) {
      console.error('Error updating studio location:', error);
      res.status(500).json({ error: 'Failed to update studio location' });
    }
  });

  // Admin questionnaire responses endpoint
  // Ensure questionnaire_responses has all needed columns
  try {
    await runSql(`ALTER TABLE questionnaire_responses ADD COLUMN IF NOT EXISTS client_name text`);
    await runSql(`ALTER TABLE questionnaire_responses ADD COLUMN IF NOT EXISTS client_email text`);
    await runSql(`ALTER TABLE questionnaire_responses ADD COLUMN IF NOT EXISTS template_slug text`);
    console.log('✅ Ensured questionnaire_responses columns exist');
  } catch (e: any) {
    console.log('questionnaire_responses column check:', e?.message);
  }

  app.get("/api/admin/questionnaire-responses", authenticateUser, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const clientFilter = req.query.client_id as string | undefined;
      const questionnaireFilter = req.query.questionnaire_id as string | undefined;

      let where = 'WHERE 1=1';
      const params: any[] = [];
      let idx = 1;

      if (clientFilter) {
        where += ` AND qr.client_id = $${idx++}`;
        params.push(clientFilter);
      }
      if (questionnaireFilter) {
        where += ` AND qr.template_slug = $${idx++}`;
        params.push(questionnaireFilter);
      }

      const countResult = await runSql(
        `SELECT COUNT(*) as cnt FROM questionnaire_responses qr ${where}`,
        params
      );
      const total = parseInt(countResult[0]?.cnt || '0');

      const rows = await runSql(
        `SELECT qr.id, qr.client_id, qr.token, qr.template_slug, qr.answers, qr.submitted_at,
                qr.client_name as stored_client_name, qr.client_email as stored_client_email,
                c.first_name, c.last_name, c.email as crm_email,
                s.title as questionnaire_title, s.pages as survey_pages
         FROM questionnaire_responses qr
         LEFT JOIN crm_clients c ON qr.client_id = c.id::text
         LEFT JOIN surveys s ON qr.template_slug::text = s.id::text
         ${where}
         ORDER BY qr.submitted_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      );

      // Build question label map from survey pages
      const buildLabelMap = (surveyPages: any): Record<string, string> => {
        const map: Record<string, string> = {};
        try {
          const pages = typeof surveyPages === 'string' ? JSON.parse(surveyPages) : surveyPages;
          if (Array.isArray(pages)) {
            for (const page of pages) {
              for (const q of (page.questions || [])) {
                if (q.id && (q.title || q.text)) map[q.id] = q.title || q.text;
              }
            }
          }
        } catch {}
        return map;
      };

      const responses = rows.map((r: any) => {
        const labelMap = buildLabelMap(r.survey_pages);
        const rawAnswers = typeof r.answers === 'string' ? JSON.parse(r.answers) : (r.answers || {});
        
        // Build resolved answers with proper question labels
        const resolvedAnswers: Record<string, string> = {};
        for (const [key, val] of Object.entries(rawAnswers)) {
          const label = labelMap[key] || key;
          resolvedAnswers[label] = String(val);
        }
        
        return {
          ...r,
          client_name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.stored_client_name || 'Unknown',
          client_email: r.crm_email || r.stored_client_email || '-',
          answers: rawAnswers,
          resolved_answers: resolvedAnswers,
          survey_pages: typeof r.survey_pages === 'string' ? JSON.parse(r.survey_pages) : r.survey_pages
        };
      });

      res.json({ responses, total, limit, offset });
    } catch (error) {
      console.error('Error fetching questionnaire responses:', error);
      res.status(500).json({ error: 'Failed to fetch responses', responses: [], total: 0 });
    }
  });

  // Questionnaire responses for a specific client (used by the client-detail
  // "View Questionnaires" modal). Matches by client_id OR the response's stored
  // email/name — because link-submitted responses arrive with client_id=null —
  // and AUTO-LINKS any match back to the client so it's filed in the DB for next
  // time. This is why a response could show in the global list but not on the
  // client file before: nothing had linked it.
  app.get("/api/admin/client-questionnaires/:clientId", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;
      const client = await storage.getCrmClient(clientId);
      if (!client) return res.status(404).json({ error: 'Client not found' });

      const email = (client.email || '').toLowerCase().trim();
      const fullName = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();

      const rows = await runSql(
        `SELECT qr.id, qr.client_id, qr.template_slug, qr.answers, qr.submitted_at,
                qr.client_name, qr.client_email,
                s.title AS questionnaire_title, s.pages AS survey_pages
         FROM questionnaire_responses qr
         LEFT JOIN surveys s ON qr.template_slug::text = s.id::text
         WHERE qr.client_id = $1
            OR ($2 <> '' AND LOWER(qr.client_email) = $2)
            OR ($3 <> '' AND LOWER(qr.client_name) = LOWER($3))
         ORDER BY qr.submitted_at DESC`,
        [clientId, email, fullName]
      );

      // Auto-link matches that weren't linked yet, so they're filed under the client.
      for (const r of rows) {
        if (String(r.client_id || '') !== String(clientId)) {
          runSql('UPDATE questionnaire_responses SET client_id = $1 WHERE id = $2', [clientId, r.id]).catch(() => {});
        }
      }

      const buildLabelMap = (surveyPages: any): Record<string, string> => {
        const map: Record<string, string> = {};
        try {
          const pages = typeof surveyPages === 'string' ? JSON.parse(surveyPages) : surveyPages;
          if (Array.isArray(pages)) {
            for (const page of pages) {
              for (const q of (page.questions || [])) {
                if (q.id && (q.title || q.text)) map[q.id] = q.title || q.text;
              }
            }
          }
        } catch { /* ignore malformed pages */ }
        return map;
      };

      const data = rows.map((r: any) => {
        const labelMap = buildLabelMap(r.survey_pages);
        const rawAnswers = typeof r.answers === 'string' ? JSON.parse(r.answers || '{}') : (r.answers || {});
        const responses: Record<string, string> = {};
        for (const [k, v] of Object.entries(rawAnswers)) responses[labelMap[k] || k] = String(v);
        return {
          id: r.id,
          status: 'responded',
          questionnaireName: r.questionnaire_title || r.template_slug || 'Questionnaire',
          sentDate: r.submitted_at,
          responseDate: r.submitted_at,
          responses,
        };
      });

      res.json(data);
    } catch (error) {
      console.error('Error fetching client questionnaires:', error);
      res.status(500).json({ error: 'Failed to fetch client questionnaires' });
    }
  });

  // Search clients by name/email for typeahead
  app.get("/api/admin/clients/search", authenticateUser, async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string || '').trim();
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

      let clients;
      if (q.length < 2) {
        // Return recent clients when no search query
        clients = await runSql(
          `SELECT id, first_name, last_name, email
           FROM crm_clients
           ORDER BY created_at DESC NULLS LAST, first_name, last_name
           LIMIT $1`,
          [limit]
        );
      } else {
        const pattern = `%${q}%`;
        clients = await runSql(
          `SELECT id, first_name, last_name, email
           FROM crm_clients
           WHERE LOWER(first_name || ' ' || last_name) LIKE LOWER($1)
              OR LOWER(email) LIKE LOWER($1)
              OR id::text LIKE $1
           ORDER BY first_name, last_name
           LIMIT $2`,
          [pattern, limit]
        );
      }
      res.json({ clients });
    } catch (error) {
      console.error('Error searching clients:', error);
      res.status(500).json({ error: 'Search failed', clients: [] });
    }
  });

  // Attach a questionnaire response to a client
  app.post("/api/admin/attach-response-to-client", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { response_id, client_id } = req.body;
      if (!response_id || !client_id) {
        return res.status(400).json({ error: 'response_id and client_id are required' });
      }
      // Verify client exists
      const clientRows = await runSql('SELECT id FROM crm_clients WHERE id = $1', [client_id]);
      if (clientRows.length === 0) {
        return res.status(404).json({ error: 'Client not found' });
      }
      await runSql('UPDATE questionnaire_responses SET client_id = $1 WHERE id = $2', [client_id, response_id]);
      // Also update the corresponding questionnaire_links row if present
      const resp = await runSql('SELECT token FROM questionnaire_responses WHERE id = $1', [response_id]);
      if (resp.length > 0 && resp[0].token) {
        await runSql('UPDATE questionnaire_links SET client_id = $1 WHERE token = $2', [client_id, resp[0].token]);
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error attaching response to client:', error);
      res.status(500).json({ error: 'Failed to attach response' });
    }
  });

  // Delete a questionnaire response
  app.delete("/api/admin/questionnaire-responses/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Response ID is required' });
      await runSql('DELETE FROM questionnaire_responses WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting questionnaire response:', error);
      res.status(500).json({ error: 'Failed to delete response' });
    }
  });

  // Get/save questionnaire confirmation email template
  app.get("/api/admin/questionnaire-email-template", authenticateUser, async (req: Request, res: Response) => {
    try {
      const rows = await runSql(
        `SELECT value FROM app_settings WHERE key = 'questionnaire_confirmation_email' LIMIT 1`
      );
      if (rows.length > 0) {
        const tpl = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value;
        return res.json(tpl);
      }
      // Return defaults
      res.json({
        subject: 'Vielen Dank für Ihren Fragebogen',
        body: `Liebe/r {{clientName}},

vielen Dank, dass Sie unseren Fragebogen ausgefüllt haben!

Wir haben Ihre Antworten erhalten und werden uns in Kürze bei Ihnen melden, um weitere Details für Ihr Fotoshooting zu besprechen.

Bei Fragen können Sie uns jederzeit kontaktieren.

Mit freundlichen Grüßen,
Ihr Team von {{studioName}}`,
        footer: '{{studioName}} • {{siteUrl}}'
      });
    } catch (error) {
      console.error('Error fetching email template:', error);
      // Return defaults even on error (table may not exist)
      res.json({
        subject: 'Vielen Dank für Ihren Fragebogen',
        body: `Liebe/r {{clientName}},\n\nvielen Dank, dass Sie unseren Fragebogen ausgefüllt haben!\n\nMit freundlichen Grüßen,\nIhr Team von {{studioName}}`,
        footer: '{{studioName}} • {{siteUrl}}'
      });
    }
  });

  app.put("/api/admin/questionnaire-email-template", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { subject, body, footer } = req.body;
      const value = JSON.stringify({ subject, body, footer });

      // Ensure app_settings table exists
      await runSql(`CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`);

      await runSql(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('questionnaire_confirmation_email', $1::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = NOW()`,
        [value]
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving email template:', error);
      res.status(500).json({ error: 'Failed to save template' });
    }
  });

  // Admin calendar analytics endpoint
  app.get("/api/admin/calendar-analytics", authenticateUser, async (req: Request, res: Response) => {
    try {
      const period = req.query.period as string || 'month';
      
      // TODO: Implement calendar analytics
      res.json({
        period,
        bookings: 0,
        revenue: 0,
        sessions: []
      });
    } catch (error) {
      console.error('Error fetching calendar analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // Photography calendar pages endpoint
  app.get("/api/photography/calendar-pages", authenticateUser, async (req: Request, res: Response) => {
    try {
      const simple = req.query.simple === 'true';
      
      // TODO: Implement calendar pages
      res.json([]);
    } catch (error) {
      console.error('Error fetching calendar pages:', error);
      res.status(500).json({ error: 'Failed to fetch calendar pages' });
    }
  });

  // ==================== GOOGLE CALENDAR INTEGRATION ROUTES ====================
  app.get("/api/calendar/google/status", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Check if user has Google Calendar tokens stored
      // For now, return a mock status that shows disconnected state
      res.json({
        connected: false,
        calendars: [],
        settings: {
          autoSync: false,
          syncInterval: '15m',
          syncDirection: 'both',
          defaultCalendar: ''
        },
        lastSync: null
      });
    } catch (error) {
      console.error("Error checking Google Calendar status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/calendar/google/auth-url", authenticateUser, async (req: Request, res: Response) => {
    try {
      // In a real implementation, you would:
      // 1. Generate OAuth state parameter
      // 2. Create Google OAuth URL with proper scopes
      // 3. Store state for verification
      
      // Google Calendar OAuth scopes needed:
      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ];
      
      // For demo purposes, provide instructions to user
      res.json({
        authUrl: `https://accounts.google.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=${scopes.join(' ')}&response_type=code&access_type=offline`,
        message: "To complete Google Calendar integration, you'll need to set up Google OAuth credentials in your Google Cloud Console and configure the CLIENT_ID and CLIENT_SECRET environment variables."
      });
    } catch (error) {
      console.error("Error generating Google auth URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/calendar/google/disconnect", authenticateUser, async (req: Request, res: Response) => {
    try {
      // In a real implementation, you would:
      // 1. Revoke Google OAuth tokens
      // 2. Remove stored credentials from database
      // 3. Clean up any sync settings
      
      res.json({ success: true, message: "Google Calendar disconnected successfully" });
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/calendar/google/sync", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Get user ID from session or auth
      const userId = (req as any).user?.id || (req as any).session?.userId || 'default';
      
      const { createSyncServiceForUser } = await import('./services/googleCalendarSyncService');
      const syncService = await createSyncServiceForUser(userId);
      
      if (!syncService) {
        // Fallback: try to find any enabled sync config
        const configs = await runSql(
          `SELECT user_id FROM calendar_sync_settings WHERE sync_enabled = true LIMIT 1`
        );
        if (configs && configs.length > 0) {
          const fallbackService = await createSyncServiceForUser(configs[0].user_id);
          if (fallbackService) {
            const results = await fallbackService.performSync();
            return res.json({
              success: results.success,
              message: `Calendar sync completed: ${results.imported} imported, ${results.updated} updated, ${results.deleted} deleted`,
              imported: results.imported,
              updated: results.updated,
              deleted: results.deleted,
              errors: results.errors
            });
          }
        }
        return res.status(400).json({ error: 'No Google Calendar sync configured' });
      }
      
      const results = await syncService.performSync();
      res.json({
        success: results.success,
        message: `Calendar sync completed: ${results.imported} imported, ${results.updated} updated, ${results.deleted} deleted`,
        imported: results.imported,
        updated: results.updated,
        deleted: results.deleted,
        errors: results.errors
      });
    } catch (error) {
      console.error("Error syncing Google Calendar:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // (placeholder handler for /api/calendar/import/google removed to avoid conflicting routes)

  app.put("/api/calendar/google/settings", authenticateUser, async (req: Request, res: Response) => {
    try {
      const settings = req.body;
      
      // In a real implementation, you would:
      // 1. Validate settings
      // 2. Store in database
      // 3. Update sync job schedules if needed
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error updating Google Calendar settings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Helper: determine import cutoff (defaults to start of today in Europe/Vienna, UTC)
  function getImportCutoffUtc(req: Request): Date {
    try {
      const includePast = String((req.query.includePast || req.query.includepast) ?? '').toLowerCase() === 'true';
      if (includePast) return new Date(0); // no cutoff

      const from = (req.query.from as string | undefined) || (req.query.cutoff as string | undefined);
      const tz = process.env.DEFAULT_CAL_TZ || 'Europe/Vienna';

      let localIso: string;
      if (from && /\d{4}-\d{2}-\d{2}/.test(from)) {
        localIso = `${from}T00:00:00`;
      } else {
        // start of today in Vienna
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = now.getUTCMonth();
        const d = now.getUTCDate();
        const todayUtc = new Date(Date.UTC(y, m, d, 0, 0, 0));
        // Convert UTC midnight to Vienna date parts
        // Safer approach: format today in Vienna and rebuild local midnight
        const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
        const parts = dtf.format(todayUtc); // YYYY-MM-DD in Vienna TZ
        localIso = `${parts}T00:00:00`;
      }

      const utcIso = convertLocalToUtcIso(localIso, tz);
      const d = new Date(utcIso);
      return isNaN(d.getTime()) ? new Date() : d;
    } catch {
      return new Date();
    }
  }

  // Helper: determine optional upper-bound cutoff (to=YYYY-MM-DD in Europe/Vienna)
  function getImportUpperBoundUtc(req: Request): Date | undefined {
    try {
      const to = (req.query.to as string | undefined) || (req.query.until as string | undefined);
      if (!to || !/\d{4}-\d{2}-\d{2}/.test(to)) return undefined;
      const tz = process.env.DEFAULT_CAL_TZ || 'Europe/Vienna';
      // Interpret as end-of-day local time then convert to UTC
      const localIso = `${to}T23:59:59`;
      const utcIso = convertLocalToUtcIso(localIso, tz);
      const d = new Date(utcIso);
      return isNaN(d.getTime()) ? undefined : d;
    } catch {
      return undefined;
    }
  }

  // ==================== CALENDAR IMPORT ====================
  // Fallback Google import route used by client UI. If an icsUrl is provided,
  // it proxies to the /api/calendar/import/ics-url logic; otherwise it returns
  // a friendly success with 0 imports and guidance for using the ICS options.
  app.post("/api/calendar/import/google", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { icsUrl } = req.body || {};
      const dryRun = String(req.query.dryRun || req.query.dryrun || '').toLowerCase() === 'true';

      if (icsUrl && typeof icsUrl === 'string' && icsUrl.trim().length > 0) {
        try {
          const fetch = (await import('node-fetch')).default;
          const response = await fetch(icsUrl);
          if (!response.ok) {
            return res.status(502).json({ error: `Failed to fetch calendar: ${response.status}` });
          }
          const icsContent = await response.text();

          // Log snapshot to temp for diagnostics
          try {
            const tmpDir = os.tmpdir();
            const rawPath = path.join(tmpDir, 'clean-crm-debug_ics_content.log');
            const header = `==== ICS SNAPSHOT ${new Date().toISOString()} GOOGLE: ${icsUrl} LENGTH: ${icsContent.length} ====`;
            fs.appendFileSync(rawPath, header + '\n' + icsContent.substring(0, 2000) + '\n\n', { encoding: 'utf8' });
            console.error(`WROTE_ICS_SNAPSHOT | path=${rawPath} | len=${icsContent.length}`);
          } catch {}

          const importedEvents = parseICalContent(icsContent);
          // Default to upcoming-only unless includePast=true or a from=YYYY-MM-DD cutoff is provided
          const cutoff = getImportCutoffUtc(req);
          const upper = getImportUpperBoundUtc(req);
          const eventsToImport = importedEvents.filter(ev => {
            const ds = ev?.dtstart ? new Date(ev.dtstart) : null;
            return !!(ds && !isNaN(ds.getTime()) && ds >= cutoff && (!upper || ds <= upper));
          });
          if (dryRun) {
            return res.json({ success: true, dryRun: true, parsed: importedEvents.length, filtered: eventsToImport.length, cutoff: cutoff.toISOString(), upper: upper ? upper.toISOString() : null });
          }

          let importedCount = 0;
          for (const event of eventsToImport) {
            try {
              // Helper function to safely create date
              const safeCreateDate = (dateString: string | undefined): Date | null => {
                if (!dateString) return null;
                const date = new Date(dateString);
                return isNaN(date.getTime()) ? null : date;
              };

              const session = {
                id: `imported-${(event.uid || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).replace(/[^a-zA-Z0-9_-]/g,'')}`,
                icalUid: event.uid || undefined,
                title: event.summary || 'Imported Event',
                description: event.description || '',
                sessionType: 'imported',
                status: 'confirmed',
                // Skip when dates invalid to avoid clustering
                startTime: safeCreateDate(event.dtstart)!,
                endTime: safeCreateDate(event.dtend)!,
                locationName: event.location || '',
                locationAddress: event.location || '',
                clientName: extractClientFromDescription(event.description || event.summary || ''),
                clientEmail: '',
                clientPhone: '',
                paymentStatus: 'pending',
                conflictDetected: false,
                weatherDependent: false,
                goldenHourOptimized: false,
                portfolioWorthy: false,
                editingStatus: 'pending',
                deliveryStatus: 'pending',
                isRecurring: false,
                reminderSent: false,
                confirmationSent: false,
                followUpSent: false,
                isOnlineBookable: false,
                availabilityStatus: 'booked',
                priority: 'medium',
                isPublic: false,
                photographerId: 'imported',
                createdAt: new Date(),
                updatedAt: new Date()
              };

              // Validate parsed dates
              if (!(session.startTime instanceof Date) || isNaN(session.startTime.getTime()) ||
                  !(session.endTime instanceof Date) || isNaN(session.endTime.getTime())) {
                console.error('GOOGLE_IMPORT skip invalid dates:', { summary: event.summary, dtstart: event.dtstart, dtend: event.dtend });
                continue;
              }
              await storage.createPhotographySession(session);
              importedCount++;
            } catch (e) {
              console.error('GOOGLE_IMPORT insert failed:', e);
            }
          }

          return res.json({ success: true, imported: importedCount, via: 'icsUrl', cutoff: cutoff.toISOString(), upper: upper ? upper.toISOString() : null });
        } catch (err) {
          return res.status(500).json({ error: 'Failed to import via icsUrl', details: (err as Error)?.message });
        }
      }

      // No icsUrl provided: respond with a benign success to keep the UI happy,
      // and guide the user toward the ICS URL or file upload flows.
      return res.json({
        success: true,
        imported: 0,
        message: 'Google OAuth import not configured. Use the .ics URL import or upload a .ics file.'
      });
    } catch (error) {
      console.error('Error in /api/calendar/import/google:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post("/api/calendar/import/ics", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { icsContent, fileName } = req.body;
      
      if (!icsContent) {
        return res.status(400).json({ error: 'No iCal content provided' });
      }

      // Persist raw iCal content snapshot synchronously for debugging (write to OS temp dir)
      try {
        const tmpDir = os.tmpdir();
        const rawPath = path.join(tmpDir, 'clean-crm-debug_ics_content.log');
        const header = `==== ICS SNAPSHOT ${new Date().toISOString()} DIRECT: ${fileName || 'no-name'} LENGTH: ${icsContent.length} ====`;
        fs.appendFileSync(rawPath, header + '\n' + icsContent.substring(0, 2000) + '\n\n', { encoding: 'utf8' });
        console.error(`WROTE_ICS_SNAPSHOT | path=${rawPath} | len=${icsContent.length}`);
      } catch (e) {
        console.error('Failed to write ICS content snapshot:', e);
      }

      // Parse iCal content and convert to photography sessions
      const importedEvents = parseICalContent(icsContent);
      const cutoff = getImportCutoffUtc(req);
      const upper = getImportUpperBoundUtc(req);
      const eventsToImport = importedEvents.filter(ev => {
        const ds = ev?.dtstart ? new Date(ev.dtstart) : null;
        return !!(ds && !isNaN(ds.getTime()) && ds >= cutoff && (!upper || ds <= upper));
      });
      const dryRun = String(req.query.dryRun || req.query.dryrun || '').toLowerCase() === 'true';
      if (dryRun) {
        console.error(`ICS_DRY_RUN | events=${importedEvents.length} | filtered=${eventsToImport.length} | cutoff=${cutoff.toISOString()} | upper=${upper ? upper.toISOString() : 'none'} | fileName=${fileName || ''}`);
        return res.json({ success: true, dryRun: true, parsed: importedEvents.length, filtered: eventsToImport.length, cutoff: cutoff.toISOString(), upper: upper ? upper.toISOString() : null });
      }
      console.log('Imported events parsed from content:', importedEvents.length, 'filtered:', eventsToImport.length, 'cutoff:', cutoff.toISOString(), 'sample:', eventsToImport[0] ? { summary: eventsToImport[0].summary, dtstart: eventsToImport[0].dtstart, dtend: eventsToImport[0].dtend } : null);
      let importedCount = 0;

      for (const event of eventsToImport) {
        try {
          // Helper: coerce to Date or return null
          const safeCreateDate = (dateString: string | undefined): Date | null => {
            if (!dateString) return null;
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? null : date;
          };

          const start = safeCreateDate(event.dtstart);
          const end = safeCreateDate(event.dtend);
          if (!start || !end) {
            console.error('SKIP_IMPORT_INVALID_DATES', { summary: event.summary, dtstart: event.dtstart, dtend: event.dtend });
            continue; // skip invalid entries instead of assigning "now"
          }

          // Create photography session from calendar event
          const session = {
            id: `imported-${(event.uid || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`).replace(/[^a-zA-Z0-9_-]/g,'')}`,
            icalUid: event.uid || undefined,
            title: event.summary || 'Imported Event',
            description: event.description || '',
            sessionType: 'imported',
            status: 'confirmed',
            // Ensure timestamps are valid Date objects for Drizzle/pg driver
            startTime: start,
            endTime: end,
            locationName: event.location || '',
            locationAddress: event.location || '',
            clientName: extractClientFromDescription(event.description || event.summary || ''),
            clientEmail: '',
            clientPhone: '',
            // omit optional pricing fields to avoid decimal coercion issues
            paymentStatus: 'pending',
            conflictDetected: false,
            weatherDependent: false,
            goldenHourOptimized: false,
            portfolioWorthy: false,
            editingStatus: 'pending',
            deliveryStatus: 'pending',
            isRecurring: false,
            reminderSent: false,
            confirmationSent: false,
            followUpSent: false,
            isOnlineBookable: false,
            availabilityStatus: 'booked',
            priority: 'medium',
            isPublic: false,
            photographerId: 'imported',
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Debug: log runtime types for timestamp-like fields before insert
          try {
            const timestampFields = ['startTime', 'endTime', 'createdAt', 'updatedAt'];
            const types: any = {};
            for (const f of timestampFields) {
              const v = (session as any)[f];
              types[f] = v === undefined ? 'undefined' : (v && v.constructor ? v.constructor.name : typeof v);
            }
            console.log('DEBUG import session types:', { summary: event.summary, uid: event.uid, types });
          } catch (logErr) {
            console.error('Failed to log session types for import event:', logErr);
          }

          // Diagnostic: print types and small snapshot to stderr so we can capture offending values in server.err
            try {
            // Single-line marker for log search
            const diagFields = ['startTime', 'endTime', 'createdAt', 'updatedAt', 'deliveryDate'];
            const diagParts: string[] = [];
            for (const f of diagFields) {
              const v = (session as any)[f];
              const t = v === undefined ? 'undefined' : (v && v.constructor ? v.constructor.name : typeof v);
              const val = v instanceof Date ? v.toISOString() : (v === undefined ? 'null' : String(v));
              diagParts.push(`${f}=${t}:${val}`);
            }
            console.error(`IMPORT_DIAG_SINGLELINE | summary=${event.summary || ''} | uid=${event.uid || ''} | ${diagParts.join(' | ')}`);
          } catch (diagErr) {
            console.error('IMPORT DIAG failed:', diagErr);
          }

          // Log a compact session preview before attempting insert
          try {
            const previewParts: string[] = [];
            ['startTime','endTime','createdAt','updatedAt','deliveryDate'].forEach((k) => {
              const v = (session as any)[k];
              const t = v === undefined ? 'undefined' : (v && v.constructor ? v.constructor.name : typeof v);
              previewParts.push(`${k}=${t}`);
            });
            console.error(`IMPORT_BEFORE_INSERT | summary=${event.summary || ''} | uid=${event.uid || ''} | ${previewParts.join(' | ')}`);
          } catch (e) { console.error('Failed logging pre-insert session preview', e); }

          // Synchronous debug snapshot to capture payload exactly before DB insert (write to OS temp dir)
          try {
            const tmpDir = os.tmpdir();
            const debugPath = path.join(tmpDir, 'clean-crm-debug_import_snapshot.log');
            const snapshot = {
              timestamp: new Date().toISOString(),
              eventSummary: event.summary,
              sessionPreview: {
                startTimeType: typeof session.startTime,
                startTimeConstructor: (session.startTime as any)?.constructor ? (session.startTime as any).constructor.name : null,
                startTimeValue: session.startTime && (session.startTime as any).toString ? (session.startTime as any).toString() : String(session.startTime),
                endTimeType: typeof session.endTime,
                endTimeConstructor: (session.endTime as any)?.constructor ? (session.endTime as any).constructor.name : null,
                endTimeValue: session.endTime && (session.endTime as any).toString ? (session.endTime as any).toString() : String(session.endTime),
                createdAtType: typeof session.createdAt,
                createdAtConstructor: (session.createdAt as any)?.constructor ? (session.createdAt as any).constructor.name : null,
                createdAtValue: session.createdAt && (session.createdAt as any).toString ? (session.createdAt as any).toString() : String(session.createdAt),
                updatedAtType: typeof session.updatedAt,
                updatedAtConstructor: (session.updatedAt as any)?.constructor ? (session.updatedAt as any).constructor.name : null,
                updatedAtValue: session.updatedAt && (session.updatedAt as any).toString ? (session.updatedAt as any).toString() : String(session.updatedAt),
              }
            };
            fs.appendFileSync(debugPath, JSON.stringify(snapshot) + '\n', { encoding: 'utf8' });
            console.error(`WROTE_IMPORT_SNAPSHOT | path=${debugPath} | summary=${String(event.summary).slice(0,80)}`);
          } catch (dbgErr) {
            // Ensure debug failure doesn't stop import
            console.error('Failed to write debug snapshot:', dbgErr);
          }
          await storage.createPhotographySession(session);
          importedCount++;
        } catch (error) {
          console.error('Error importing event:', event.summary, error);
        }
      }

      res.json({ 
        success: true, 
        imported: importedCount,
  cutoff: cutoff.toISOString(),
  upper: upper ? upper.toISOString() : null,
        message: `Successfully imported ${importedCount} events from ${fileName}`
      });

    } catch (error) {
  console.error("Error importing iCal file:", error);
  res.status(500).json({ error: "Failed to parse iCal file", details: (error as Error)?.message });
    }
  });

  app.post("/api/calendar/import/ics-url", async (req: Request, res: Response) => {
    let debugStage: string = 'init';
    try {
      const { icsUrl } = req.body;
      debugStage = 'init';
      const debugMode = String(req.query.debug || req.query.verbose || '').toLowerCase() === 'true' || String(req.query.debug) === '1';
      
      if (!icsUrl) {
        return res.status(400).json({ error: 'No iCal URL provided' });
      }

      // Fetch iCal content from URL with robust headers and retries
      const fetch = (await import('node-fetch')).default;
      const maxAttempts = 3;
      let attempt = 0;
      let icsContent = '';
      let lastStatus = 0;
      let lastError: any = null;
      while (attempt < maxAttempts && !icsContent) {
        attempt++;
        try {
          const resp = await fetch(icsUrl, {
            method: 'GET',
            redirect: 'follow',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
              'Accept': 'text/calendar, text/plain;q=0.9, */*;q=0.8',
            },
          } as any);
          lastStatus = resp.status;
          if (!resp.ok) {
            throw new Error(`Fetch failed with status ${resp.status}`);
          }
          const text = await resp.text();
          // Detect HTML (e.g., Google login page) which indicates the URL is not directly accessible
          if (/<!DOCTYPE html>|<html[\s>]/i.test(text)) {
            throw new Error('Received HTML instead of ICS (URL likely not accessible without authentication)');
          }
          icsContent = text;
        } catch (e) {
          lastError = e;
          await new Promise(r => setTimeout(r, 300 * attempt));
        }
      }

      if (!icsContent) {
        const msg = lastError?.message || `Failed to fetch calendar: HTTP ${lastStatus}`;
        return res.status(502).json({
          error: 'Failed to fetch iCal content',
          details: msg,
          hint: 'If using Google, copy the Secret address in iCal format (private-.../basic.ics). Ensure the link is correct and try again.'
        });
      }

      // Persist raw iCal content snapshot synchronously for debugging (write to OS temp dir)
      try {
        const tmpDir = os.tmpdir();
        const rawPath = path.join(tmpDir, 'clean-crm-debug_ics_content.log');
        const header = `==== ICS SNAPSHOT ${new Date().toISOString()} URL: ${icsUrl} LENGTH: ${icsContent.length} ====`;
        fs.appendFileSync(rawPath, header + '\n' + icsContent.substring(0, 2000) + '\n\n', { encoding: 'utf8' });
        console.error(`WROTE_ICS_SNAPSHOT | path=${rawPath} | len=${icsContent.length}`);
      } catch (e) {
        console.error('Failed to write ICS content snapshot:', e);
      }

      // Parse iCal content and convert to photography sessions
      debugStage = 'parseICalContent';
      let importedEvents: any[] = [];
      try {
        importedEvents = parseICalContent(icsContent);
      } catch (parseErr: any) {
        console.error('ICS_URL_PARSE_ERROR', parseErr);
        return res.status(500).json({ error: 'Failed to parse iCal content', details: parseErr?.message || String(parseErr), stage: debugStage });
      }
      const cutoff = getImportCutoffUtc(req);
      const upper = getImportUpperBoundUtc(req);
      // Also keep original query strings to enable day-level fallback comparisons
      const parsedQ = require('url').parse(req.url || '', true).query || {};
      const qFrom: string | undefined = (parsedQ.from as string) || (parsedQ.since as string) || undefined;
      const qTo: string | undefined = (parsedQ.to as string) || (parsedQ.until as string) || undefined;
      const includePast = String((req.query.includePast || req.query.includepast) ?? '').toLowerCase() === 'true' || String(req.query.includePast) === '1';
      debugStage = 'filterEvents';

      const safeCutoff = cutoff instanceof Date && !isNaN(cutoff.getTime()) ? cutoff.toISOString() : 'INVALID';
      const safeUpper = upper instanceof Date && !isNaN(upper.getTime()) ? upper.toISOString() : 'none';
      console.error(`ICS_URL_IMPORT | total_parsed=${importedEvents.length} | cutoff=${safeCutoff} | upper=${safeUpper}`);
      
      // Log first few parsed events for debugging (avoid throwing on invalid dates)
      importedEvents.slice(0, 3).forEach((ev, idx) => {
        let parsed = 'INVALID';
        try {
          if (ev?.dtstart) {
            const d = new Date(ev.dtstart);
            parsed = isNaN(d.getTime()) ? 'INVALID' : d.toISOString();
          }
        } catch { /* ignore */ }
        console.error(`  Event ${idx + 1}: ${ev.summary} | dtstart=${ev.dtstart} | parsed_date=${parsed}`);
      });
      
      let eventsToImport: any[] = [];
      const debugSamples: any[] = [];
      const reasonCounts: Record<string, number> = { no_date: 0, invalid_date: 0, outside_time_range: 0, outside_day_range: 0 };
      // Helper: extract local day string (Europe/Vienna) from a UTC ISO string safely
      const toLocalDay = (iso: string, tz = 'Europe/Vienna'): string | null => {
        try {
          const d = new Date(iso);
          if (isNaN(d.getTime())) return null;
          const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
          const parts = dtf.formatToParts(d).reduce((m: any, p: any) => { if (p.type !== 'literal') m[p.type] = p.value; return m; }, {} as any);
          return `${parts.year}-${parts.month}-${parts.day}`; // YYYY-MM-DD
        } catch { return null; }
      };
      try {
        eventsToImport = importedEvents.filter(ev => {
          // Build a robust Date instance from event.dtstart
          let ds: Date | null = null;
          let parseMode: 'iso' | 'ics' | 'raw-iso' | 'raw-ics' | 'failed' = 'failed';
          if (ev?.dtstart) {
            let d = new Date(ev.dtstart);
            if (isNaN(d.getTime())) {
              let s = String(ev.dtstart).trim();
              s = s.replace(/[^0-9TZ]/g, '');
              // Allow canonical ICS (with or without Z) and optional milliseconds
              const m = s.match(/^(\d{8})T(\d{6})(?:\d{0,3})?Z?$/);
              if (m) {
                const datePart = m[1];
                const timePart = m[2];
                const y = datePart.substring(0, 4);
                const mo = datePart.substring(4, 6);
                const da = datePart.substring(6, 8);
                const hh = timePart.substring(0, 2);
                const mm = timePart.substring(2, 4);
                const ss = timePart.substring(4, 6);
                const iso = `${y}-${mo}-${da}T${hh}:${mm}:${ss}.000Z`;
                const d2 = new Date(iso);
                if (!isNaN(d2.getTime())) { d = d2; parseMode = 'ics'; }
              } else if (ev._raw_dtstart) {
                // Try from raw value if present
                const raw = String(ev._raw_dtstart).trim();
                const dIso = new Date(raw);
                if (!isNaN(dIso.getTime())) { d = dIso; parseMode = 'raw-iso'; }
                else {
                  const s2 = raw.replace(/[^0-9TZ]/g, '');
                  const m2 = s2.match(/^(\d{8})T(\d{6})(?:\d{0,3})?Z?$/);
                  if (m2) {
                    const y = m2[1].substring(0, 4);
                    const mo = m2[1].substring(4, 6);
                    const da = m2[1].substring(6, 8);
                    const hh = m2[2].substring(0, 2);
                    const mm = m2[2].substring(2, 4);
                    const ss = m2[2].substring(4, 6);
                    const iso = `${y}-${mo}-${da}T${hh}:${mm}:${ss}.000Z`;
                    const d3 = new Date(iso);
                    if (!isNaN(d3.getTime())) { d = d3; parseMode = 'raw-ics'; }
                  }
                }
              }
            }
            ds = isNaN(d.getTime()) ? null : d;
            if (parseMode === 'failed' && ds) parseMode = 'iso';
          } else if (ev?._raw_dtstart) {
            const raw = String(ev._raw_dtstart).trim();
            const dIso = new Date(raw);
            if (!isNaN(dIso.getTime())) { ds = dIso; parseMode = 'raw-iso'; }
            else {
              const s2 = raw.replace(/[^0-9TZ]/g, '');
              const m2 = s2.match(/^(\d{8})T(\d{6})(?:\d{0,3})?Z?$/);
              if (m2) {
                const y = m2[1].substring(0, 4);
                const mo = m2[1].substring(4, 6);
                const da = m2[1].substring(6, 8);
                const hh = m2[2].substring(0, 2);
                const mm = m2[2].substring(2, 4);
                const ss = m2[2].substring(4, 6);
                const iso = `${y}-${mo}-${da}T${hh}:${mm}:${ss}.000Z`;
                const d3 = new Date(iso);
                if (!isNaN(d3.getTime())) { ds = d3; parseMode = 'raw-ics'; }
              }
            }
          }
          const valid = !!(ds && !isNaN(ds.getTime()));
          const passTime = !!(valid && ds! >= cutoff && (!upper || ds! <= upper));

          // Day-level fallback in Europe/Vienna, only when from/to provided
          let passDay = false;
          if (!passTime && valid && (qFrom || qTo)) {
            const localDay = toLocalDay((ds as Date).toISOString(), 'Europe/Vienna');
            const fromDay = typeof qFrom === 'string' && /\d{4}-\d{2}-\d{2}/.test(qFrom) ? qFrom : null;
            const toDay = typeof qTo === 'string' && /\d{4}-\d{2}-\d{2}/.test(qTo) ? qTo : null;
            if (localDay) {
              const geFrom = !fromDay || localDay >= fromDay;
              const leTo = !toDay || localDay <= toDay;
              passDay = geFrom && leTo;
            }
          }

          const passes = passTime || passDay;
          if (!passes) {
            const reason = !ds ? 'no_date' : !valid ? 'invalid_date' : (!passTime ? 'outside_time_range' : 'outside_day_range');
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
          }

          // Prefer sampling December 2025 entries to aid current debugging
          const preferDec2025 = (() => {
            const raw = String(ev._raw_dtstart || ev.dtstart || '');
            return /(^|[^0-9])202512/.test(raw);
          })();

          if (debugMode && (debugSamples.length < 40 || (preferDec2025 && debugSamples.length < 60))) {
            let safeIso = 'INVALID';
            let localDayDbg: string | null = null;
            try {
              if (valid) {
                safeIso = (ds as Date).toISOString();
                localDayDbg = toLocalDay(safeIso, 'Europe/Vienna');
              } else if (ev?.dtstart) {
                let s = String(ev.dtstart).trim();
                s = s.replace(/[^0-9TZ]/g, '');
                const m = s.match(/^(\d{8})T(\d{6})(?:\d{0,3})?Z?$/);
                if (m) {
                  const datePart = m[1];
                  const timePart = m[2];
                  const y = datePart.substring(0, 4);
                  const mo = datePart.substring(4, 6);
                  const da = datePart.substring(6, 8);
                  const hh = timePart.substring(0, 2);
                  const mm = timePart.substring(2, 4);
                  const ss = timePart.substring(4, 6);
                  const iso = `${y}-${mo}-${da}T${hh}:${mm}:${ss}.000Z`;
                  safeIso = iso;
                  localDayDbg = toLocalDay(iso, 'Europe/Vienna');
                }
                if (safeIso === 'INVALID' && ev._raw_dtstart) {
                  const raw = String(ev._raw_dtstart).trim().replace(/[^0-9TZ]/g, '');
                  const m2 = raw.match(/^(\d{8})T(\d{6})(?:\d{0,3})?Z?$/);
                  if (m2) {
                    const y = m2[1].substring(0, 4);
                    const mo = m2[1].substring(4, 6);
                    const da = m2[1].substring(6, 8);
                    const hh = m2[2].substring(0, 2);
                    const mm = m2[2].substring(2, 4);
                    const ss = m2[2].substring(4, 6);
                    const iso = `${y}-${mo}-${da}T${hh}:${mm}:${ss}.000Z`;
                    safeIso = iso;
                    localDayDbg = toLocalDay(iso, 'Europe/Vienna');
                  }
                }
              }
            } catch {}
            debugSamples.push({
              summary: ev.summary,
              raw: { dtstart: ev.dtstart, raw_dtstart: ev._raw_dtstart, dtend: ev.dtend, raw_dtend: ev._raw_dtend },
              parsed: {
                utc: safeIso,
                viennaDay: localDayDbg,
                passTime,
                passDay,
                mode: parseMode,
              },
              keys: Object.keys(ev || {}).slice(0, 20)
            });
          }

          if (!passes && ev.dtstart) {
            let safeIso2 = 'INVALID';
            try { if (valid) safeIso2 = (ds as Date).toISOString(); } catch {}
            const localDay = valid ? toLocalDay((ds as Date).toISOString(), 'Europe/Vienna') : 'null';
            console.error(`  FILTERED OUT: ${ev.summary} | dtstart=${ev.dtstart} | date=${safeIso2} | localDay=${localDay} | reason=${!ds ? 'no_date' : !valid ? 'invalid_date' : (!passTime ? 'outside_time_range' : 'outside_day_range')}`);
          }
          return passes;
        });
      } catch (filterErr: any) {
        console.error('ICS_URL_FILTER_ERROR', filterErr);
        return res.status(500).json({ error: 'Failed during event filtering', details: filterErr?.message || String(filterErr), stage: debugStage });
      }
      
      console.error(`ICS_URL_IMPORT | events_to_import=${eventsToImport.length}`);
      
      const dryRun = String(req.query.dryRun || req.query.dryrun || '').toLowerCase() === 'true';
      if (dryRun) {
        console.error(`ICS_URL_DRY_RUN | events=${importedEvents.length} | filtered=${eventsToImport.length} | cutoff=${safeCutoff} | upper=${safeUpper} | url=${icsUrl}`);
        let safeCutoffIso: string | null = null;
        let safeUpperIso: string | null = null;
        try { if (cutoff instanceof Date && !isNaN(cutoff.getTime())) safeCutoffIso = cutoff.toISOString(); } catch (e) { console.error('CUT_OFF_TO_ISO_ERROR', e); }
        try { if (upper instanceof Date && !isNaN(upper.getTime())) safeUpperIso = upper.toISOString(); } catch (e) { console.error('UPPER_TO_ISO_ERROR', e); }
        const base = { success: true, dryRun: true, parsed: importedEvents.length, filtered: eventsToImport.length, cutoff: safeCutoffIso, upper: safeUpperIso, stage: debugStage } as any;
        // Update last status for monitoring
        lastCalendarImportStatus = {
          when: new Date().toISOString(),
          url: icsUrl,
          parsed: importedEvents.length,
          filtered: eventsToImport.length,
          imported: 0,
          from: qFrom || null,
          to: qTo || null,
          includePast,
          stage: debugStage,
        };
        if (debugMode) {
          base.debug = {
            qFrom,
            qTo,
            reasonCounts,
            sample: debugSamples,
          };
        }
        return res.json(base);
      }
      let importedCount = 0;

      for (const event of eventsToImport) {
        try {
          // Helper: coerce to Date or return null
          const safeCreateDate = (dateString: string | undefined): Date | null => {
            if (!dateString) return null;
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? null : date;
          };

          const start = safeCreateDate(event.dtstart);
          const end = safeCreateDate(event.dtend);
          if (!start || !end) {
            console.error('SKIP_IMPORT_INVALID_DATES', { summary: event.summary, dtstart: event.dtstart, dtend: event.dtend });
            continue; // skip invalid entries instead of assigning "now"
          }

          // Create minimal photography session (only required fields to avoid array serialization issues)
          // Use explicit null for array fields to prevent Drizzle from serializing them as "[]" string
          const session:  any = {
            id: `cal-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: event.summary || 'Imported Event',
            sessionType: 'imported',
            startTime: start,
            endTime: end,
            equipmentList: null,
            crewMembers: null,
            tags: null,
          };

          // Synchronous debug snapshot to capture payload exactly before DB insert (write to OS temp dir)
          try {
            const tmpDir = os.tmpdir();
            const debugPath = path.join(tmpDir, 'clean-crm-debug_import_snapshot.log');
            const snapshot = {
              timestamp: new Date().toISOString(),
              eventSummary: event.summary,
              sessionPreview: {
                startTimeType: typeof session.startTime,
                startTimeConstructor: session.startTime && session.startTime.constructor ? session.startTime.constructor.name : null,
                startTimeValue: session.startTime && session.startTime.toString ? session.startTime.toString() : String(session.startTime),
                endTimeType: typeof session.endTime,
                endTimeConstructor: session.endTime && session.endTime.constructor ? session.endTime.constructor.name : null,
                endTimeValue: session.endTime && session.endTime.toString ? session.endTime.toString() : String(session.endTime),
                createdAtType: typeof session.createdAt,
                createdAtConstructor: session.createdAt && session.createdAt.constructor ? session.createdAt.constructor.name : null,
                createdAtValue: session.createdAt && session.createdAt.toString ? session.createdAt.toString() : String(session.createdAt),
                updatedAtType: typeof session.updatedAt,
                updatedAtConstructor: session.updatedAt && session.updatedAt.constructor ? session.updatedAt.constructor.name : null,
                updatedAtValue: session.updatedAt && session.updatedAt.toString ? session.updatedAt.toString() : String(session.updatedAt),
              }
            };
            fs.appendFileSync(debugPath, JSON.stringify(snapshot) + '\n', { encoding: 'utf8' });
            console.error(`WROTE_IMPORT_SNAPSHOT | path=${debugPath} | summary=${String(event.summary).slice(0,80)}`);
          } catch (dbgErr) {
            // Ensure debug failure doesn't stop import
            console.error('Failed to write debug snapshot:', dbgErr);
          }

          // Attach icalUid if present for duplicate prevention
          if (event.uid) {
            (session as any).icalUid = String(event.uid);
          }
          await storage.createPhotographySession(session);
          importedCount++;
        } catch (error) {
          console.error('Error importing event:', event.summary, error);
        }
      }

      res.json({ 
        success: true, 
        imported: importedCount,
  cutoff: cutoff.toISOString(),
  upper: upper ? upper.toISOString() : null,
        message: `Successfully imported ${importedCount} events from calendar URL`
      });
      // Update last status for monitoring
      try {
        lastCalendarImportStatus = {
          when: new Date().toISOString(),
          url: icsUrl,
          parsed: importedEvents.length,
          filtered: eventsToImport.length,
          imported: importedCount,
          from: qFrom || null,
          to: qTo || null,
          includePast,
          stage: 'completed',
        };
      } catch {}

    } catch (error) {
  console.error("Error importing from iCal URL:", error);
  // Expose debugStage if available for diagnostics
  const stage = (error as any)?.stage || (typeof debugStage !== 'undefined' ? debugStage : 'unknown');
  res.status(500).json({ error: "Failed to fetch or parse iCal URL", details: (error as Error)?.message, stage });
    }
  });

  // Helper function to parse iCal content
  function parseICalContent(icsContent: string) {
    const events: any[] = [];
    const lines = icsContent.split('\n');
    let currentEvent: any = null;
    let multiLineValue = '';
    let multiLineProperty = '';

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Handle line continuation (lines starting with space or tab)
      if (line.startsWith(' ') || line.startsWith('\t')) {
        // Ignore folded continuation for import logic; not needed for dtstart/dtend
        // multiLineValue += line.substring(1);
        continue;
      }
      
      // Process the previous multi-line property if any
      // Commit previously accumulated property is intentionally disabled
      // to avoid overwriting canonical dtstart/dtend values.
      multiLineProperty = '';
      multiLineValue = '';

      if (line === 'BEGIN:VEVENT') {
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        events.push(currentEvent);
        currentEvent = null;
      } else if (currentEvent && line.includes(':')) {
        const colonIndex = line.indexOf(':');
        const property = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);

        // Skip multi-line accumulation for simplicity in import context
        multiLineProperty = '';
        multiLineValue = '';

        // Extract base property and any parameters (e.g., TZID)
        const [baseProp, ...paramParts] = property.split(';');
        const propName = baseProp.toLowerCase();
        const params: Record<string, string> = {};
        for (const p of paramParts) {
          const eqIdx = p.indexOf('=');
          if (eqIdx > -1) {
            const k = p.substring(0, eqIdx).trim().toLowerCase();
            const v = p.substring(eqIdx + 1).trim();
            params[k] = v;
          }
        }

    if (propName === 'dtstart' || propName === 'dtend') {
          try {
      const defaultTz = process.env.DEFAULT_CAL_TZ || 'Europe/Vienna';
      const parsed = parseICalDate(value, params['tzid'] || defaultTz);
      // Preserve raw value for diagnostics
      const rawKey = propName === 'dtstart' ? '_raw_dtstart' : '_raw_dtend';
      (currentEvent as any)[rawKey] = value;
      currentEvent[propName] = parsed; // may be undefined on failure
          } catch (error) {
            console.error(`Error parsing ${propName}: ${value}`, error);
            const rawKey = propName === 'dtstart' ? '_raw_dtstart' : '_raw_dtend';
            (currentEvent as any)[rawKey] = value;
            currentEvent[propName] = undefined; // don't default to now
          }
        } else {
          currentEvent[propName] = decodeICalValue(value);
        }
      }
    }

    return events;
  }

  // Helper function to parse iCal dates (supports TZID and all-day values)
  function parseICalDate(dateString: string, tzid?: string): string | undefined {
    try {
      // Quiet parser; callers decide how to handle undefined
      
      // Handle various iCal date formats
      let cleanDate = (dateString || '').trim();
      // Normalize: remove stray characters and normalize Z
      cleanDate = cleanDate.replace(/\s+/g, '').replace(/[\u0000-\u001f\u007f]/g, '');
      // Some providers fold lines; remove hard breaks within value
      cleanDate = cleanDate.replace(/\\n/gi, '');
      // Uppercase trailing z
      if (cleanDate.endsWith('z')) cleanDate = cleanDate.slice(0, -1) + 'Z';

      // Strict Zulu with or without final Z
      const zMatch = cleanDate.match(/^(\d{8})T(\d{6})(Z)?$/);
      if (zMatch) {
        const datePart = zMatch[1];
        const timePart = zMatch[2];
        const year = datePart.substring(0, 4);
        const month = datePart.substring(4, 6);
        const day = datePart.substring(6, 8);
        const hour = timePart.substring(0, 2);
        const minute = timePart.substring(2, 4);
        const second = timePart.substring(4, 6);
        const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
        const dateObj = new Date(isoString);
        if (!isNaN(dateObj.getTime())) return dateObj.toISOString();
      }
      
      // Google Calendar format: treat like Zulu if present above; otherwise continue
      
      // Handle YYYYMMDD format (all-day events)
      if (cleanDate.length === 8 && !cleanDate.includes('T')) {
        const year = cleanDate.substring(0, 4);
        const month = cleanDate.substring(4, 6);
        const day = cleanDate.substring(6, 8);
        
        // Treat all-day as midnight in specified TZ (or UTC) then convert to UTC
        const localIso = `${year}-${month}-${day}T00:00:00`;
        const isoString = tzid ? convertLocalToUtcIso(localIso, tzid) : `${year}-${month}-${day}T00:00:00.000Z`;
        const dateObj = new Date(isoString);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }
      }

      // Handle local time like YYYYMMDDTHHMMSS (possibly with TZID)
      if (cleanDate.length === 15 && cleanDate.includes('T')) {
        const datePart = cleanDate.substring(0, 8);
        const timePart = cleanDate.substring(9, 15);
        const year = parseInt(datePart.substring(0, 4), 10);
        const month = parseInt(datePart.substring(4, 6), 10);
        const day = parseInt(datePart.substring(6, 8), 10);
        const hour = parseInt(timePart.substring(0, 2), 10);
        const minute = parseInt(timePart.substring(2, 4), 10);
        const second = parseInt(timePart.substring(4, 6), 10);

        const localIso = `${year.toString().padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}`;
        const utcIso = tzid ? convertLocalToUtcIso(localIso, tzid) : new Date(localIso).toISOString();
        const dateObj = new Date(utcIso);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }
      }
      
      // Fallback: try parsing as-is
      const fallbackDate = new Date(dateString);
      if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate.toISOString();
      }
      
  // If all else fails, let caller skip
  return undefined;
      
    } catch (error) {
  console.error(`Error parsing date: ${dateString}`, error);
  return undefined;
    }
  }

  // Convert a local ISO (no timezone) in a given IANA TZ to a UTC ISO string
  function convertLocalToUtcIso(localIso: string, tzid: string): string {
    try {
      // Load date-fns-tz synchronously in ESM using createRequire
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { createRequire } = require('module');
      const requireFn = createRequire(import.meta.url);
      const tzLib = requireFn('date-fns-tz');
      if (tzLib && typeof tzLib.zonedTimeToUtc === 'function') {
        const d = tzLib.zonedTimeToUtc(localIso, tzid);
        // Guard against invalid Date objects producing "Invalid time value"
        let converted: Date;
        try {
          converted = (d instanceof Date) ? d : new Date(d);
        } catch {
          converted = new Date(NaN);
        }
        if (!converted || isNaN(converted.getTime())) {
          // Fallback: append Z if missing and try again; else return a safe epoch
          const fallbackIso = /Z$/.test(localIso) ? localIso : `${localIso}.000Z`;
          const fb = new Date(fallbackIso);
          return isNaN(fb.getTime()) ? new Date(0).toISOString() : fb.toISOString();
        }
        return converted.toISOString();
      }
    } catch (e) {
      console.error('convertLocalToUtcIso failed to load date-fns-tz:', e);
    }
    // Fallback: compute UTC using Intl time zone math
    try {
      const m = localIso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
      if (m) {
        const y = +m[1];
        const mo = +m[2];
        const d = +m[3];
        const hh = +m[4];
        const mm = +m[5];
        const ss = +m[6];
        const epoch = toUtcFromTz(y, mo, d, hh, mm, ss, tzid);
        const dt = new Date(epoch);
        return isNaN(dt.getTime()) ? new Date(0).toISOString() : dt.toISOString();
      }
    } catch {}
    // Last resort
    const d2 = new Date(localIso);
    return isNaN(d2.getTime()) ? new Date(0).toISOString() : d2.toISOString();
  }

  // Compute UTC epoch from local date/time in a given IANA time zone
  function toUtcFromTz(y: number, m: number, d: number, hh: number, mm: number, ss: number, timeZone: string): number {
    const approx = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
    const offsetMin = tzOffset(approx, timeZone);
    return approx.getTime() - offsetMin * 60000;
  }

  function tzOffset(dateUTC: Date, timeZone: string): number {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = dtf.formatToParts(dateUTC);
    const map: any = {};
    for (const { type, value } of parts) {
      if (type !== 'literal') map[type] = value;
    }
    const asUTC = Date.UTC(+map.year, +map.month - 1, +map.day, +map.hour, +map.minute, +map.second);
    return (asUTC - dateUTC.getTime()) / 60000;
  }

  // Helper function to decode iCal values
  function decodeICalValue(value: string): string {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  // Helper function to extract client name from description or title
  function extractClientFromDescription(text: string): string {
    // Try to extract client name from common patterns
    const patterns = [
      /client[:\s]+([^,\n]+)/i,
      /with[:\s]+([^,\n]+)/i,
      /für[:\s]+([^,\n]+)/i, // German "for"
      /([A-Z][a-z]+\s+[A-Z][a-z]+)/, // Name pattern
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return 'Imported Client';
  }

  // ==================== ICAL CALENDAR FEED ====================
  // Admin: ensure ical_uid column + unique index for duplicate prevention
  app.post("/api/admin/calendar/install-dedupe", async (req: Request, res: Response) => {
    try {
      await runSql(`ALTER TABLE photography_sessions ADD COLUMN IF NOT EXISTS ical_uid text`);
      await runSql(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_photography_sessions_ical_uid
        ON photography_sessions(ical_uid)
        WHERE ical_uid IS NOT NULL AND ical_uid <> ''
      `);
      res.json({ success: true, message: 'ical_uid column ensured and unique index installed' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || String(e) });
    }
  });

  // Diagnostics: quick aggregates to verify agent data connectivity
  app.get("/api/agent/diagnostics", async (_req: Request, res: Response) => {
    try {
      const invoices = await runSql(`
        SELECT 
          COALESCE(SUM(CASE WHEN status='paid' THEN total ELSE 0 END),0)::double precision AS paid_revenue,
          MIN(created_at) AS first_invoice,
          MAX(created_at) AS last_invoice,
          COUNT(*)::int AS invoice_count
        FROM crm_invoices
      `);
      const sessions = await runSql(`
        SELECT 
          MIN(start_time) AS first_session,
          MAX(start_time) AS last_session,
          COUNT(*)::int AS session_count
        FROM photography_sessions
      `);
      res.json({
        success: true,
        invoices: invoices?.[0] || {},
        sessions: sessions?.[0] || {},
        dbUrlSet: !!process.env.DATABASE_URL,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || String(e) });
    }
  });

  // Simple status endpoint to inspect the last ICS import operation
  app.get("/api/calendar/import/status", async (req: Request, res: Response) => {
    try {
      res.json({ success: true, status: lastCalendarImportStatus });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e?.message || String(e) });
    }
  });

  app.get("/api/calendar/photography-sessions.ics", async (req: Request, res: Response) => {
    try {
      // Fetch all photography sessions
      const sessions = await storage.getPhotographySessions();
      
      // Generate iCal content
      const icalLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        `PRODID:-//${getBizName()}//Photography CRM//EN`,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Photography Sessions',
        `X-WR-CALDESC:Photography sessions from ${getBizName()} CRM`
      ];

      // Add each session as an event
      for (const session of sessions) {
        if (session.startTime && session.endTime) {
          const startDate = new Date(session.startTime);
          const endDate = new Date(session.endTime);
          
          // Format dates for iCal (YYYYMMDDTHHMMSSZ)
          const formatICalDate = (date: Date) => {
            return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
          };
          
          const uid = `session-${session.id}@${getBizDomain()}`;
          const now = new Date();
          const dtstamp = formatICalDate(now);
          
          icalLines.push(
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART:${formatICalDate(startDate)}`,
            `DTEND:${formatICalDate(endDate)}`,
            `SUMMARY:${session.title.replace(/[,;\\]/g, '\\$&')}`,
            `DESCRIPTION:${(session.description || '').replace(/[,;\\]/g, '\\$&')}${session.clientName ? '\\nClient: ' + session.clientName : ''}${session.sessionType ? '\\nType: ' + session.sessionType : ''}`,
            `LOCATION:${(session.locationName || session.locationAddress || '').replace(/[,;\\]/g, '\\$&')}`,
            `STATUS:${session.status === 'completed' ? 'CONFIRMED' : session.status === 'cancelled' ? 'CANCELLED' : 'TENTATIVE'}`,
            session.priority === 'high' ? 'PRIORITY:1' : session.priority === 'low' ? 'PRIORITY:9' : 'PRIORITY:5',
            'END:VEVENT'
          );
        }
      }

      icalLines.push('END:VCALENDAR');
      
      const icalContent = icalLines.join('\r\n');
      
      // Set appropriate headers for iCal
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="photography-sessions.ics"');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.send(icalContent);
      
    } catch (error) {
      console.error("Error generating iCal feed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/email/test-connection", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { provider, smtpHost, smtpPort, username, password, useTLS } = req.body;

      // Basic validation
      if (!smtpHost || !smtpPort || !username || !password) {
        return res.status(400).json({
          success: false,
          message: "Missing required connection parameters"
        });
      }

      // Check for EasyName/business email - actually test the IMAP connection
      const isEasyNameHost = smtpHost.includes('easyname');
      const isBusinessMailbox = username === (process.env.BUSINESS_MAILBOX_USER || '') || 
                                username === (process.env.STUDIO_NOTIFY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER) || 
                                username === process.env.BUSINESS_MAILBOX_USER;
      
      if (isEasyNameHost || isBusinessMailbox) {
        try {
          // Actually test IMAP connection
          const testResult = await new Promise<boolean>((resolve) => {
            const imap = new Imap({
              user: username,
              password: password,
              host: 'imap.easyname.com',
              port: 993,
              tls: true,
              tlsOptions: { rejectUnauthorized: false },
              connTimeout: 10000,
              authTimeout: 10000
            });
            
            const timeout = setTimeout(() => {
              imap.end();
              resolve(false);
            }, 15000);
            
            imap.once('ready', () => {
              clearTimeout(timeout);
              imap.end();
              resolve(true);
            });
            
            imap.once('error', (err: any) => {
              clearTimeout(timeout);
              console.error('IMAP test error:', err.message);
              resolve(false);
            });
            
            imap.connect();
          });
          
          if (testResult) {
            return res.json({
              success: true,
              message: "Connection successful! IMAP credentials verified for EasyName mailbox."
            });
          } else {
            return res.json({
              success: false,
              message: "Connection failed. Please check your username and password."
            });
          }
        } catch (testError) {
          console.error('IMAP test exception:', testError);
          return res.json({
            success: false,
            message: "Connection test failed: " + (testError as Error).message
          });
        }
      }

      // For other emails, provide standard configuration guidance
      const providerSettings = {
        gmail: {
          smtp: "smtp.gmail.com",
          port: 587,
          security: "TLS",
          note: "Use App Password instead of regular password for Gmail"
        },
        outlook: {
          smtp: "smtp-mail.outlook.com", 
          port: 587,
          security: "TLS",
          note: "Use your Microsoft account credentials"
        }
      };

      const settings = providerSettings[provider as keyof typeof providerSettings];
      
      if (settings && smtpHost === settings.smtp && smtpPort.toString() === settings.port.toString()) {
        return res.json({
          success: true,
          message: `Connection settings verified for ${provider}. ${settings.note}`
        });
      }

      return res.json({
        success: false,
        message: "Please verify your email provider settings and credentials"
      });
    } catch (error) {
      console.error("Error testing email connection:", error);
      res.status(500).json({
        success: false,
        message: "Failed to test email connection"
      });
    }
  });

  // ==================== EMAIL SETTINGS ====================
  app.post("/api/email/settings/save", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { 
        smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, fromName,
        emailSignature, signatureEnabled,
        outOfOfficeEnabled, outOfOfficeMessage, outOfOfficeStartDate, outOfOfficeEndDate
      } = req.body;
      
      console.log('Saving email settings:', { smtpHost, smtpPort, smtpUser, fromEmail, fromName, signatureEnabled, outOfOfficeEnabled });
      
      // Save email settings to database
      const settingsData = {
        smtp_host: smtpHost,
        smtp_port: parseInt(smtpPort) || 587,
        smtp_user: smtpUser,
        smtp_pass: smtpPass, // In production, this should be encrypted
        from_email: fromEmail,
        from_name: fromName,
        // Email Signature
        email_signature: emailSignature || null,
        signature_enabled: signatureEnabled || false,
        // Out of Office
        out_of_office_enabled: outOfOfficeEnabled || false,
        out_of_office_message: outOfOfficeMessage || null,
        out_of_office_start_date: outOfOfficeStartDate || null,
        out_of_office_end_date: outOfOfficeEndDate || null,
        updated_at: new Date().toISOString()
      };
      
      await storage.saveEmailSettings(settingsData);

      // ALSO write the authoritative integration store (studio_integrations) — the table
      // above only holds signature/OOO extras; send + IMAP sync read studio_integrations via
      // config-reader. Without this, changing the account here had no effect on sending or sync.
      try {
        const { encrypt } = await import('./utils/encryption');
        const port = parseInt(smtpPort) || 587;
        const secure = port === 465;
        const imapHost = smtpHost ? String(smtpHost).replace(/^smtp\./i, 'imap.') : null;
        const exists = await runSql('SELECT 1 FROM studio_integrations LIMIT 1');
        if (!exists.length) await runSql('INSERT INTO studio_integrations DEFAULT VALUES');
        await runSql(
          `UPDATE studio_integrations SET smtp_host=$1, smtp_port=$2, smtp_user=$3, smtp_secure=$4,
             default_from_email=$5, email_from_name=$6, imap_host=$7, imap_user=$8, imap_port=$9, imap_tls=$10`,
          [smtpHost || null, port, smtpUser || null, secure, fromEmail || smtpUser || null, fromName || null, imapHost, smtpUser || null, 993, true],
        );
        if (smtpPass) {
          await runSql('UPDATE studio_integrations SET smtp_pass_encrypted=$1, imap_pass_encrypted=$1', [encrypt(smtpPass)]);
        }
        const { config } = await import('./config-reader'); config.invalidate();
        const { invalidateTransporter } = await import('./utils/smtp-helper'); invalidateTransporter();
      } catch (e: any) {
        console.warn('[email settings] studio_integrations sync failed:', e?.message || e);
      }

      res.json({
        success: true,
        message: 'Email settings saved successfully'
      });
    } catch (error) {
      console.error('Error saving email settings:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to save email settings: ' + (error as Error).message 
      });
    }
  });

  // Remove / disconnect the configured email account — clears both stores so send + sync
  // stop, and the wizard/settings show no account.
  app.post("/api/email/disconnect", authenticateUser, async (_req: Request, res: Response) => {
    try {
      await runSql(
        `UPDATE studio_integrations SET smtp_host=NULL, smtp_user=NULL, smtp_pass_encrypted=NULL, smtp_secure=NULL,
           default_from_email=NULL, email_from_name=NULL, imap_host=NULL, imap_user=NULL, imap_pass_encrypted=NULL WHERE TRUE`,
      ).catch(() => {});
      try { await storage.saveEmailSettings({ smtp_host: null, smtp_port: null, smtp_user: null, smtp_pass: null, from_email: null, from_name: null, updated_at: new Date().toISOString() } as any); } catch { /* ignore */ }
      try { const { config } = await import('./config-reader'); config.invalidate(); } catch { /* ignore */ }
      try { const { invalidateTransporter } = await import('./utils/smtp-helper'); invalidateTransporter(); } catch { /* ignore */ }
      res.json({ success: true, message: 'Email account removed.' });
    } catch (error: any) {
      console.error('Error disconnecting email:', error?.message || error);
      res.status(500).json({ success: false, error: 'Failed to remove email account' });
    }
  });

  app.get("/api/email/settings", authenticateUser, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getEmailSettings();
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error getting email settings:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get email settings: ' + (error as Error).message 
      });
    }
  });

  // ==================== SENT EMAILS ENDPOINT ====================
  // Fetch all sent emails from crm_messages
  app.get("/api/emails/sent", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Get sent emails from crm_messages table
      // These are emails that were sent OUT (direction='outbound' OR status='sent'/'demo_sent')
      const sentEmails = await db
        .select()
        .from(crmMessages)
        .where(
          or(
            eq(crmMessages.direction, 'outbound'),
            eq(crmMessages.status, 'sent'),
            eq(crmMessages.status, 'demo_sent'),
            eq(crmMessages.messageType, 'sent')
          )
        )
        .orderBy(desc(crmMessages.createdAt))
        .limit(100);

      console.log(`Fetched ${sentEmails.length} sent emails from database`);
      res.json(sentEmails);
    } catch (error) {
      console.error('Error fetching sent emails:', error);
      res.status(500).json({ 
        error: 'Failed to fetch sent emails',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ==================== EMAIL SENDING ====================
  app.post("/api/email/send", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { to, subject, body, attachments } = req.body;
      
      console.log('Email send request:', { to, subject, body: body?.substring(0, 100) + '...' });
      
  // Use nodemailer (imported at top of file)
      
      // Get email settings - try to load from database first, fallback to EasyName
      let emailSettings;
      try {
        emailSettings = await storage.getEmailSettings();
      } catch (settingsError) {
        console.log('Using fallback email settings');
        emailSettings = {
          smtp_host: process.env.SMTP_HOST || 'smtp.easyname.com',
          smtp_port: parseInt(process.env.SMTP_PORT || '587'),
          smtp_user: process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || '',
          smtp_pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || '',
          from_email: getEnvContactEmailSync(),
          from_name: process.env.EMAIL_FROM_NAME || 'Studio'
        };
      }

      const emailConfig = {
        host: emailSettings.smtp_host,
        port: emailSettings.smtp_port === 587 ? 465 : emailSettings.smtp_port,
        secure: true,
        auth: {
          user: emailSettings.smtp_user,
          pass: emailSettings.smtp_pass
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
      };

      // Create transporter and send the email
      const transporter = nodemailer.createTransport(emailConfig as any);
      const attachmentsArray = Array.isArray(attachments)
        ? attachments.map((a: any) => ({
            filename: a?.filename || a?.name,
            content: a?.content,
            path: a?.path,
            contentType: a?.contentType || a?.mimetype
          }))
        : undefined;

      const mailOptions = {
        from: `${emailSettings.from_name} <${emailSettings.from_email}>`,
        to,
        subject,
        html: body,
        text: typeof body === 'string' ? body.replace(/<[^>]+>/g, '') : undefined,
        attachments: attachmentsArray
      } as any;

      const info = await transporter.sendMail(mailOptions);

      // Save a copy to CRM messages (best-effort)
      try {
        await storage.createCrmMessage({
          senderName: `${getBizName()} (Sent)`,
          senderEmail: getEnvContactEmailSync(),
          subject: `[SENT] ${subject}`,
          content: `SENT TO: ${to}\n\n${typeof body === 'string' ? body : ''}`,
          status: 'sent', // Changed from 'archived' to 'sent' for proper categorization
          messageType: 'sent'
        });
        console.log('Sent email saved to database successfully');
      } catch (dbError) {
        console.error('Failed to save sent email to database:', dbError);
      }
      
      // Trigger automatic email refresh after sending
      try {
        console.log('Triggering email refresh after send...');
        // Import fresh emails to capture any replies or the sent email
        setTimeout(async () => {
          try {
            const { importEmailsFromIMAP } = await import('./email-import');
            await importEmailsFromIMAP({
              host: process.env.IMAP_HOST || 'imap.easyname.com',
              port: parseInt(process.env.IMAP_PORT || '993'),
              username: process.env.IMAP_USER || process.env.BUSINESS_MAILBOX_USER || '',
              password: process.env.IMAP_PASS || process.env.EMAIL_PASSWORD || '',
              useTLS: true
            });
            console.log('Automatic email refresh completed after send');
          } catch (refreshError) {
            console.error('Auto refresh failed:', refreshError);
          }
        }, 5000); // Wait 5 seconds for email to be processed by server
      } catch (error) {
        console.log('Auto refresh setup failed, continuing...');
      }

      res.json({ 
        success: true, 
        message: 'Email sent successfully',
        messageId: info.messageId,
        response: info.response,
        envelope: info.envelope
      });
    } catch (error) {
      console.error('Email send error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send email: ' + (error as Error).message 
      });
    }
  });

  // ==================== EMAIL MARKETING CAMPAIGNS ====================

  // ==================== SMS & WHATSAPP (Brevo) ====================
  
  // Send SMS via Brevo
  app.post("/api/sms/send", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { to, content, senderName, clientId } = req.body;
      
      if (!to || !content) {
        return res.status(400).json({ 
          success: false, 
          error: 'Phone number (to) and content are required' 
        });
      }

      console.log('📱 SMS send request:', { to, content: content.substring(0, 50) + '...' });
      
      const { BrevoService } = await import('./services/brevoService');
      const result = await BrevoService.sendSms({
        to,
        content,
        senderName: senderName || 'NewAge',
        clientId,
        autoLinkClient: true,
      });

      if (result.success) {
        res.json({ 
          success: true, 
          message: 'SMS sent successfully',
          messageId: result.messageId,
          clientId: result.clientId
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: result.error || 'Failed to send SMS' 
        });
      }
    } catch (error) {
      console.error('SMS send error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send SMS: ' + (error as Error).message 
      });
    }
  });

  // Send WhatsApp via Brevo
  app.post("/api/whatsapp/send", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { to, templateId, templateParams, clientId } = req.body;
      
      if (!to || !templateId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Phone number (to) and templateId are required' 
        });
      }

      console.log('💬 WhatsApp send request:', { to, templateId });
      
      const { BrevoService } = await import('./services/brevoService');
      const result = await BrevoService.sendWhatsApp({
        to,
        templateId,
        templateParams: templateParams || [],
        clientId,
        autoLinkClient: true,
      });

      if (result.success) {
        res.json({ 
          success: true, 
          message: 'WhatsApp message sent successfully',
          messageId: result.messageId,
          clientId: result.clientId
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: result.error || 'Failed to send WhatsApp message' 
        });
      }
    } catch (error) {
      console.error('WhatsApp send error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send WhatsApp: ' + (error as Error).message 
      });
    }
  });

  // Get Brevo account info (credits, etc.)
  app.get("/api/brevo/account", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { BrevoService } = await import('./services/brevoService');
      BrevoService.initialize();
      const result = await BrevoService.getAccountInfo();

      if (result.success) {
        res.json({ 
          success: true, 
          account: {
            email: result.email,
            credits: result.credits,
            plan: result.plan
          }
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: result.error || 'Failed to get account info' 
        });
      }
    } catch (error) {
      console.error('Brevo account error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get Brevo account info: ' + (error as Error).message 
      });
    }
  });

  // Test email via Brevo
  app.post("/api/brevo/test-email", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { to, subject, content } = req.body;
      
      if (!to) {
        return res.status(400).json({ 
          success: false, 
          error: 'Recipient email (to) is required' 
        });
      }

      console.log('📧 Testing Brevo email to:', to);
      
      const { BrevoService } = await import('./services/brevoService');
      BrevoService.initialize();
      
      const result = await BrevoService.sendEmail({
        to,
        subject: subject || `Test Email from ${getBizName()} CRM`,
        textContent: content || 'This is a test email sent via Brevo to verify the email configuration is working correctly.',
        htmlContent: content ? content.replace(/\n/g, '<br>') : '<p>This is a test email sent via Brevo to verify the email configuration is working correctly.</p>',
        autoLinkClient: false,
      });

      if (result.success) {
        res.json({ 
          success: true, 
          message: 'Test email sent successfully via Brevo!',
          messageId: result.messageId
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: result.error || 'Failed to send test email' 
        });
      }
    } catch (error) {
      console.error('Brevo test email error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to send test email: ' + (error as Error).message 
      });
    }
  });

  
  // Email campaigns endpoints
  app.get("/api/admin/email/campaigns", authenticateUser, async (req: Request, res: Response) => {
    try {
      const campaigns = await db.select().from(emailCampaigns).orderBy(emailCampaigns.createdAt);
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  });

  app.post("/api/admin/email/campaigns", authenticateUser, async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      // user_id is a FK to users.id, but admins live in admin_users — a session id
      // may not be a valid users row (fresh instance) and would violate the FK. Only
      // set it when it actually exists; otherwise leave null.
      let userId: string | null = null;
      const sid = (req.session as any)?.userId;
      if (sid) {
        try {
          const r = await pool.query('SELECT 1 FROM users WHERE id = $1 LIMIT 1', [sid]);
          if (r.rows.length) userId = sid;
        } catch { /* ignore */ }
      }
      // Whitelist known columns + satisfy NOT NULL (name/subject/content) so a
      // half-filled "Send Test" doesn't 500, and stray form fields don't break insert.
      const values: Record<string, any> = {
        userId,
        name: String(b.name || 'Untitled campaign').slice(0, 255),
        type: b.type || 'broadcast',
        status: b.status || 'draft',
        subject: String(b.subject || b.name || 'No subject'),
        content: (b.content && String(b.content).trim()) ? b.content : '<p></p>',
      };
      if (b.previewText ?? b.preview_text) values.previewText = b.previewText ?? b.preview_text;
      if (b.senderName ?? b.sender_name) values.senderName = b.senderName ?? b.sender_name;
      if (b.senderEmail ?? b.sender_email) values.senderEmail = b.senderEmail ?? b.sender_email;
      if (b.replyTo ?? b.reply_to) values.replyTo = b.replyTo ?? b.reply_to;
      if (Array.isArray(b.segments)) values.segments = b.segments;
      const extraSettings = (b.sendTimeOptimization !== undefined || b.frequencyCapping !== undefined)
        ? { sendTimeOptimization: b.sendTimeOptimization, frequencyCapping: b.frequencyCapping }
        : undefined;
      if (b.settings || extraSettings) values.settings = { ...(b.settings || {}), ...(extraSettings || {}) };

      const [campaign] = await db.insert(emailCampaigns).values(values as any).returning();
      res.status(201).json(campaign);
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ error: 'Failed to create campaign', detail: (error as Error).message });
    }
  });

  app.get("/api/admin/email/campaigns/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const [campaign] = await db.select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, req.params.id))
        .limit(1);
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  });

  // Email templates endpoints
  app.get("/api/email/templates", async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string;
      
      let templates;
      if (category) {
        templates = await db.select().from(emailTemplates).where(eq(emailTemplates.category, category));
      } else {
        templates = await db.select().from(emailTemplates);
      }
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // Email segments endpoints
  app.get("/api/email/segments", async (req: Request, res: Response) => {
    try {
      const segments = await db.select().from(emailSegments);
      res.json(segments);
    } catch (error) {
      console.error('Error fetching segments:', error);
      res.status(500).json({ error: 'Failed to fetch segments' });
    }
  });

  // AI-powered subject line suggestions
  app.post("/api/email/ai/subject-lines", async (req: Request, res: Response) => {
    try {
      const { context, tone } = req.body;
      // Simple AI-like subject line generation based on context and tone
      const suggestions = [];
      
      if (tone === 'professional') {
        suggestions.push(`${context}: Professional Solutions`,
          `Important: ${context}`,
          `${context} - Key Updates`);
      } else if (tone === 'friendly') {
        suggestions.push(`Hey! Check out ${context}`,
          `You'll love this: ${context}`,
          `${context} - Just for you!`);
      } else {
        suggestions.push(`Don't miss: ${context}`,
          `${context} - Limited Time`,
          `Exclusive: ${context}`);
      }
      
      res.json({ suggestions });
    } catch (error) {
      console.error('Error generating subject lines:', error);
      res.status(500).json({ error: 'Failed to generate subject lines' });
    }
  });

  // Update campaign
  app.put("/api/admin/email/campaigns/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const [updated] = await db.update(emailCampaigns)
        .set({...req.body, updatedAt: new Date()})
        .where(eq(emailCampaigns.id, req.params.id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating campaign:', error);
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  // Delete campaign
  app.delete("/api/admin/email/campaigns/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const [deleted] = await db.delete(emailCampaigns)
        .where(eq(emailCampaigns.id, req.params.id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      res.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({ error: 'Failed to delete campaign' });
    }
  });

  // Send campaign
  // ============ Email campaign bulk send (in-process queue) ============
  const campaignEmailBaseUrl = () =>
    (process.env.PUBLIC_SITE_BASE_URL || process.env.APP_URL || process.env.FRONTEND_URL || 'https://www.newagefotografie.com').replace(/\/+$/, '');

  // Tag campaign links so a click carries the campaign id — the first link in the
  // email→order attribution chain (click → utm_campaign → checkout metadata →
  // voucher_sales.campaign_id → /api/reports/email-campaign-revenue).
  const tagCampaignLinks = (html: string, cid: string) => {
    if (!html || !cid) return html || '';
    return html.replace(/href=("|')(https?:\/\/[^"']+)("|')/gi, (_m, q1, url, q2) => {
      if (/[?&]utm_campaign=/.test(url)) return `href=${q1}${url}${q2}`;
      const sep = url.includes('?') ? '&' : '?';
      return `href=${q1}${url}${sep}utm_campaign=${encodeURIComponent(cid)}&utm_source=email${q2}`;
    });
  };

  // Stateless unsubscribe token (HMAC of the email) — no per-recipient DB row needed.
  const unsubscribeToken = (email: string) => {
    const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'default-secret';
    return require('crypto').createHmac('sha256', secret).update(String(email).toLowerCase()).digest('hex').slice(0, 32);
  };

  const personalizeText = (text: string, r: any) => (text || '')
    .replace(/\{\{\s*firstName\s*\}\}/gi, r.firstName || '')
    .replace(/\{\{\s*lastName\s*\}\}/gi, r.lastName || '')
    .replace(/\{\{\s*email\s*\}\}/gi, r.email || '')
    .replace(/\{\{\s*name\s*\}\}/gi, `${r.firstName || ''} ${r.lastName || ''}`.trim());

  // Audience = opted-in subscribers (email_subscribers.status='active'), honoring
  // the campaign's include/exclude tags. Deliberately NOT all CRM clients — bulk
  // marketing requires opt-in.
  const resolveCampaignRecipients = async (campaign: any): Promise<Array<{ email: string; firstName?: string; lastName?: string }>> => {
    const rows = await runSql(
      `SELECT email, first_name, last_name, tags FROM email_subscribers
       WHERE status = 'active' AND email IS NOT NULL AND email <> ''`
    );
    const include: string[] = Array.isArray(campaign.tagsInclude) ? campaign.tagsInclude.filter(Boolean) : [];
    const exclude: string[] = Array.isArray(campaign.tagsExclude) ? campaign.tagsExclude.filter(Boolean) : [];
    const seen = new Set<string>();
    const out: Array<{ email: string; firstName?: string; lastName?: string }> = [];
    for (const r of (rows || [])) {
      const email = String(r.email).toLowerCase().trim();
      if (!email || seen.has(email)) continue;
      const tags: string[] = Array.isArray(r.tags) ? r.tags : [];
      if (include.length && !include.some((t) => tags.includes(t))) continue;
      if (exclude.length && exclude.some((t) => tags.includes(t))) continue;
      seen.add(email);
      out.push({ email, firstName: r.first_name || '', lastName: r.last_name || '' });
    }
    return out;
  };

  // Background sender: batched + paced, idempotent/resumable (skips recipients that
  // already have a send event for this campaign), logs per-recipient email_events,
  // appends an unsubscribe footer, tags links for attribution.
  const runCampaignSend = async (campaign: any, recipients: Array<{ email: string; firstName?: string; lastName?: string }>) => {
    const campaignId = campaign.id;
    const { EnhancedEmailService } = await import('./services/enhancedEmailService');
    const base = campaignEmailBaseUrl();

    let attempted = new Set<string>();
    try {
      const done = await runSql(
        `SELECT DISTINCT LOWER(subscriber_email) AS e FROM email_events
         WHERE campaign_id = $1 AND event_type IN ('delivered','sent','bounced')`,
        [campaignId]
      );
      attempted = new Set((done || []).map((r: any) => r.e));
    } catch { /* no prior events */ }

    const unsubFooter = (email: string) => {
      const url = `${base}/api/email/unsubscribe?e=${encodeURIComponent(email)}&c=${encodeURIComponent(campaignId)}&t=${unsubscribeToken(email)}`;
      return `<div style="margin-top:28px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#8a8a8a;text-align:center;line-height:1.5;">`
        + `Sie erhalten diese E-Mail von ${campaign.senderName || 'New Age Fotografie'}.<br>`
        + `<a href="${url}" style="color:#8a8a8a;">Abmelden / Unsubscribe</a></div>`;
    };

    let sent = 0, delivered = 0, failed = 0, demo = 0;
    const BATCH = 15;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH).filter((r) => !attempted.has(r.email));
      await Promise.all(batch.map(async (r) => {
        const subject = personalizeText(campaign.subject, r);
        let html = personalizeText(campaign.content || '', r);
        html = tagCampaignLinks(html, String(campaignId)) + unsubFooter(r.email);
        const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        let outcome: 'delivered' | 'sent' | 'bounced' = 'bounced';
        try {
          const rr: any = await EnhancedEmailService.sendEmail({ to: r.email, subject, html, content: text, autoLinkClient: true });
          if (rr?.demo) { demo++; outcome = 'sent'; }
          else if (rr?.success) { delivered++; outcome = 'delivered'; }
          else { failed++; outcome = 'bounced'; }
        } catch { failed++; outcome = 'bounced'; }
        sent++;
        await runSql(
          `INSERT INTO email_events (campaign_id, subscriber_email, event_type, created_at) VALUES ($1, $2, $3, NOW())`,
          [campaignId, r.email, outcome]
        ).catch(() => {});
        await runSql(
          `UPDATE email_subscribers SET emails_sent_count = COALESCE(emails_sent_count,0) + 1 WHERE LOWER(email) = $1`,
          [r.email]
        ).catch(() => {});
      }));
      await db.update(emailCampaigns)
        .set({ sentCount: attempted.size + sent, deliveredCount: delivered, bouncedCount: failed })
        .where(eq(emailCampaigns.id, campaignId)).catch(() => {});
      await new Promise((res) => setTimeout(res, 400)); // gentle pacing
    }

    // Authoritative final counters from the event log (accurate even on resume).
    try {
      const stats = await runSql(`SELECT event_type, COUNT(*)::int AS n FROM email_events WHERE campaign_id = $1 GROUP BY event_type`, [campaignId]);
      const byType: Record<string, number> = {};
      for (const s of (stats || [])) byType[s.event_type] = Number(s.n) || 0;
      const deliv = byType['delivered'] || 0, bounced = byType['bounced'] || 0, sentEv = byType['sent'] || 0;
      await db.update(emailCampaigns).set({
        status: 'sent', sentAt: new Date(), recipientCount: recipients.length,
        sentCount: deliv + bounced + sentEv, deliveredCount: deliv, bouncedCount: bounced,
        openedCount: byType['opened'] || 0, clickedCount: byType['clicked'] || 0, unsubscribedCount: byType['unsubscribed'] || 0,
      }).where(eq(emailCampaigns.id, campaignId));
    } catch {
      await db.update(emailCampaigns).set({ status: 'sent', sentAt: new Date() }).where(eq(emailCampaigns.id, campaignId)).catch(() => {});
    }
    console.log(`[campaign-send] "${campaign.name}" complete — delivered=${delivered} demo=${demo} failed=${failed} (of ${recipients.length})`);
  };

  app.post("/api/email/campaigns/send", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { campaign_id, test_send, test_emails } = req.body;

      const [campaign] = await db.select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, campaign_id))
        .limit(1);

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const campaignTaggedContent = tagCampaignLinks(campaign.content || '', String(campaign_id || (campaign as any).id || ''));

      if (test_send && test_emails) {
        // Send test emails — report the TRUE outcome (a misconfigured SMTP falls
        // into demo mode and does NOT actually deliver; don't claim success then).
        const { EnhancedEmailService } = await import('./services/enhancedEmailService');

        const results: any[] = [];
        for (const email of test_emails) {
          const r: any = await EnhancedEmailService.sendEmail({
            to: email,
            subject: `[TEST] ${campaign.subject}`,
            html: campaignTaggedContent,
            content: campaignTaggedContent,
          });
          results.push({ email, delivered: !!r?.success && !r?.demo, demo: !!r?.demo, error: r?.error || null });
        }

        const delivered = results.filter((r) => r.delivered);
        if (delivered.length === 0) {
          return res.status(200).json({
            success: false,
            sent: 0,
            message: 'Email was NOT sent. SMTP is not configured (or was rejected), so it ran in demo mode.',
            error: results.find((r) => r.error)?.error || 'SMTP not configured',
            results,
          });
        }
        return res.json({
          success: true,
          sent: delivered.length,
          message: `Test email sent to ${delivered.map((r) => r.email).join(', ')}`,
          results,
        });
      } else {
        // Real bulk send via the in-process queue (idempotent + resumable).
        if (campaign.status === 'sending') {
          return res.json({ success: true, queued: true, message: 'Campaign is already sending.' });
        }
        const recipients = await resolveCampaignRecipients(campaign);
        if (recipients.length === 0) {
          return res.status(200).json({
            success: false,
            recipientCount: 0,
            message: 'No active subscribers match this campaign. Add newsletter subscribers (or adjust the include/exclude tags), then send again.',
          });
        }
        await db.update(emailCampaigns)
          .set({ status: 'sending', sentAt: new Date(), recipientCount: recipients.length, sentCount: 0, deliveredCount: 0, bouncedCount: 0 })
          .where(eq(emailCampaigns.id, campaign_id));

        // Fire-and-forget; the request returns immediately while sending continues.
        void runCampaignSend(campaign, recipients).catch((err) => {
          console.error('[campaign-send] fatal error:', err);
          db.update(emailCampaigns).set({ status: 'draft' }).where(eq(emailCampaigns.id, campaign_id)).catch(() => {});
        });

        return res.json({
          success: true,
          queued: true,
          recipientCount: recipients.length,
          message: `Campaign is sending to ${recipients.length} subscriber${recipients.length === 1 ? '' : 's'}.`,
        });
      }
    } catch (error) {
      console.error('Error sending campaign:', error);
      res.status(500).json({ error: 'Failed to send campaign' });
    }
  });

  // Public one-click unsubscribe (link in every bulk campaign footer). Stateless
  // HMAC token — no login, no per-recipient row needed.
  app.get('/api/email/unsubscribe', async (req: Request, res: Response) => {
    const page = (title: string, body: string) =>
      `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>`
      + `<body style="font-family:ui-sans-serif,system-ui,Arial;max-width:520px;margin:12vh auto;padding:0 24px;text-align:center;color:#111">`
      + `<h2 style="color:#7C2BD9">${title}</h2>${body}</body></html>`;
    try {
      const email = String(req.query.e || '').toLowerCase().trim();
      const campaignId = String(req.query.c || '');
      const token = String(req.query.t || '');
      if (!email || !token || token !== unsubscribeToken(email)) {
        return res.status(400).send(page('Ungültiger Link', '<p>Dieser Abmelde-Link ist ungültig oder abgelaufen.</p>'));
      }
      await runSql(`UPDATE email_subscribers SET status='unsubscribed', unsubscribed_at=NOW() WHERE LOWER(email)=$1`, [email]).catch(() => {});
      if (campaignId) {
        await runSql(`INSERT INTO email_events (campaign_id, subscriber_email, event_type, created_at) VALUES ($1,$2,'unsubscribed',NOW())`, [campaignId, email]).catch(() => {});
        await runSql(`UPDATE email_campaigns SET unsubscribed_count = COALESCE(unsubscribed_count,0) + 1 WHERE id = $1`, [campaignId]).catch(() => {});
      }
      return res.send(page('Erfolgreich abgemeldet', '<p>Sie wurden abgemeldet und erhalten keine weiteren Kampagnen-E-Mails.</p>'));
    } catch (error) {
      console.error('Unsubscribe error:', error);
      return res.status(500).send(page('Fehler', '<p>Es ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.</p>'));
    }
  });

  // Analytics endpoints
  app.get("/api/email/analytics/campaign/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const campaignId = req.params.id;
      
      // Get campaign details
      const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, campaignId));
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      // Get all events for this campaign
      const events = await db.select().from(emailEvents).where(eq(emailEvents.campaignId, campaignId));
      
      // Calculate metrics
      const sent = events.filter(e => e.eventType === 'sent').length;
      const delivered = events.filter(e => e.eventType === 'delivered').length;
      const opened = events.filter(e => e.eventType === 'opened').length;
      const clicked = events.filter(e => e.eventType === 'clicked').length;
      const bounced = events.filter(e => e.eventType === 'bounced').length;
      const unsubscribed = events.filter(e => e.eventType === 'unsubscribed').length;
      const complained = events.filter(e => e.eventType === 'complained').length;
      
      // Get unique opens/clicks
      const uniqueOpens = new Set(events.filter(e => e.eventType === 'opened').map(e => e.subscriberEmail)).size;
      const uniqueClicks = new Set(events.filter(e => e.eventType === 'clicked').map(e => e.subscriberEmail)).size;
      
      // Calculate rates
      const openRate = sent > 0 ? (uniqueOpens / sent) * 100 : 0;
      const clickRate = sent > 0 ? (uniqueClicks / sent) * 100 : 0;
      const clickToOpenRate = uniqueOpens > 0 ? (uniqueClicks / uniqueOpens) * 100 : 0;
      const bounceRate = sent > 0 ? (bounced / sent) * 100 : 0;
      const unsubscribeRate = sent > 0 ? (unsubscribed / sent) * 100 : 0;
      const complaintRate = sent > 0 ? (complained / sent) * 100 : 0;
      
      // Get device breakdown
      const deviceBreakdown = {
        desktop: events.filter(e => e.deviceType === 'desktop' && e.eventType === 'opened').length,
        mobile: events.filter(e => e.deviceType === 'mobile' && e.eventType === 'opened').length,
        tablet: events.filter(e => e.deviceType === 'tablet' && e.eventType === 'opened').length,
        unknown: events.filter(e => !e.deviceType || e.deviceType === 'unknown').length,
      };
      
      // Get top locations
      const locationCounts: Record<string, number> = {};
      events.filter(e => e.country && e.eventType === 'opened').forEach(e => {
        const key = e.country || 'Unknown';
        locationCounts[key] = (locationCounts[key] || 0) + 1;
      });
      const topLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([country, count]) => ({ country, opens: count }));
      
      // Get link performance
      const linkClicks = await db.select().from(emailLinks).where(eq(emailLinks.campaignId, campaignId));
      
      // Get emails that opened but didn't click
      const openedEmails = new Set(events.filter(e => e.eventType === 'opened').map(e => e.subscriberEmail));
      const clickedEmails = new Set(events.filter(e => e.eventType === 'clicked').map(e => e.subscriberEmail));
      const openedNotClicked = [...openedEmails].filter(email => !clickedEmails.has(email));
      
      res.json({
        campaign_id: campaignId,
        campaign_name: campaign.name,
        campaign_subject: campaign.subject,
        sent_at: campaign.sentAt,
        metrics: {
          sent,
          delivered,
          opened,
          unique_opens: uniqueOpens,
          clicked,
          unique_clicks: uniqueClicks,
          bounced,
          unsubscribed,
          complained,
        },
        rates: {
          open_rate: openRate.toFixed(2),
          click_rate: clickRate.toFixed(2),
          click_to_open_rate: clickToOpenRate.toFixed(2),
          bounce_rate: bounceRate.toFixed(2),
          unsubscribe_rate: unsubscribeRate.toFixed(2),
          complaint_rate: complaintRate.toFixed(2),
        },
        engagement: {
          device_breakdown: deviceBreakdown,
          top_locations: topLocations,
          link_performance: linkClicks.map(link => ({
            url: link.url,
            label: link.label,
            clicks: link.clickCount,
            unique_clicks: link.uniqueClicks,
          })),
        },
        segments: {
          opened_count: uniqueOpens,
          clicked_count: uniqueClicks,
          opened_not_clicked_count: openedNotClicked.length,
          bounced_count: bounced,
          unsubscribed_count: unsubscribed,
        },
      });
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // Get subscribers by engagement type for a campaign
  app.get("/api/email/analytics/campaign/:id/subscribers", authenticateUser, async (req: Request, res: Response) => {
    try {
      const campaignId = req.params.id;
      const { engagement_type } = req.query; // 'opened', 'clicked', 'bounced', 'unsubscribed', 'opened_not_clicked'
      
      const events = await db.select().from(emailEvents).where(eq(emailEvents.campaignId, campaignId));
      
      let subscribers: string[] = [];
      
      if (engagement_type === 'opened') {
        subscribers = Array.from(new Set<string>(events.filter(e => e.eventType === 'opened').map(e => String(e.subscriberEmail))));
      } else if (engagement_type === 'clicked') {
        subscribers = Array.from(new Set<string>(events.filter(e => e.eventType === 'clicked').map(e => String(e.subscriberEmail))));
      } else if (engagement_type === 'bounced') {
        subscribers = Array.from(new Set<string>(events.filter(e => e.eventType === 'bounced').map(e => String(e.subscriberEmail))));
      } else if (engagement_type === 'unsubscribed') {
        subscribers = Array.from(new Set<string>(events.filter(e => e.eventType === 'unsubscribed').map(e => String(e.subscriberEmail))));
      } else if (engagement_type === 'opened_not_clicked') {
        const openedEmails = new Set<string>(events.filter(e => e.eventType === 'opened').map(e => String(e.subscriberEmail)));
        const clickedEmails = new Set<string>(events.filter(e => e.eventType === 'clicked').map(e => String(e.subscriberEmail)));
        subscribers = Array.from(openedEmails).filter(email => !clickedEmails.has(email));
      } else if (engagement_type === 'sent') {
        subscribers = Array.from(new Set<string>(events.filter(e => e.eventType === 'sent').map(e => String(e.subscriberEmail))));
      }
      
      res.json({
        campaign_id: campaignId,
        engagement_type,
        count: subscribers.length,
        subscribers: subscribers.map(email => ({ email }))
      });
    } catch (error) {
      console.error('Error fetching campaign subscribers:', error);
      res.status(500).json({ error: 'Failed to fetch subscribers' });
    }
  });

  // Create a new campaign targeting subscribers from a previous campaign's engagement
  app.post("/api/email/analytics/campaign/:id/create-segment-campaign", authenticateUser, async (req: Request, res: Response) => {
    try {
      const sourceCampaignId = req.params.id;
      const { engagement_type, campaign_name } = req.body;
      
      // Get the source campaign
      const [sourceCampaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, sourceCampaignId));
      
      if (!sourceCampaign) {
        return res.status(404).json({ error: 'Source campaign not found' });
      }
      
      // Get subscribers based on engagement
      const events = await db.select().from(emailEvents).where(eq(emailEvents.campaignId, sourceCampaignId));
      
      let targetEmails: string[] = [];
      
      if (engagement_type === 'opened') {
        targetEmails = Array.from(new Set<string>(events.filter(e => e.eventType === 'opened').map(e => String(e.subscriberEmail))));
      } else if (engagement_type === 'clicked') {
        targetEmails = Array.from(new Set<string>(events.filter(e => e.eventType === 'clicked').map(e => String(e.subscriberEmail))));
      } else if (engagement_type === 'opened_not_clicked') {
        const openedEmails = new Set<string>(events.filter(e => e.eventType === 'opened').map(e => String(e.subscriberEmail)));
        const clickedEmails = new Set<string>(events.filter(e => e.eventType === 'clicked').map(e => String(e.subscriberEmail)));
        targetEmails = Array.from(openedEmails).filter(email => !clickedEmails.has(email));
      }
      
      // Create a new segment
      const segmentName = campaign_name || `${sourceCampaign.name} - ${engagement_type}`;
      const [segment] = await db.insert(emailSegments).values({
        name: segmentName,
        description: `Subscribers who ${engagement_type.replace('_', ' ')} "${sourceCampaign.name}"`,
        conditions: { source_campaign: sourceCampaignId, engagement: engagement_type },
        subscriberCount: targetEmails.length,
        isActive: true,
      }).returning();
      
      res.json({
        success: true,
        segment,
        subscriber_count: targetEmails.length,
        message: `Segment created with ${targetEmails.length} subscribers`
      });
    } catch (error) {
      console.error('Error creating segment campaign:', error);
      res.status(500).json({ error: 'Failed to create segment campaign' });
    }
  });

  app.get("/api/email/analytics/sequence/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      // TODO: Implement sequence analytics
      res.json({
        sequence_id: req.params.id,
        enrolled: 0,
        completed: 0,
        active: 0,
        dropped: 0,
        completion_rate: 0
      });
    } catch (error) {
      console.error('Error fetching sequence analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  app.get("/api/email/analytics/overall", authenticateUser, async (_req: Request, res: Response) => {
    try {
      const campaigns = await db.select().from(emailCampaigns);
      const subs = await db.select({ status: emailSubscribers.status }).from(emailSubscribers);
      const num = (v: any) => Number(v) || 0;

      const sumSent = campaigns.reduce((n, c: any) => n + num(c.sentCount), 0);
      const sumDelivered = campaigns.reduce((n, c: any) => n + num(c.deliveredCount), 0);
      const sumOpened = campaigns.reduce((n, c: any) => n + num(c.openedCount), 0);
      const sumClicked = campaigns.reduce((n, c: any) => n + num(c.clickedCount), 0);
      // Rates are relative to delivered where we track it, else to sent.
      const denom = sumDelivered || sumSent || 0;
      const round1 = (x: number) => Math.round(x * 10) / 10;
      const activeSubscribers = subs.filter((s: any) => String(s.status || 'active').toLowerCase() === 'active').length;

      res.json({
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter((c: any) => ['sending', 'scheduled'].includes(String(c.status))).length,
        sentCampaigns: campaigns.filter((c: any) => String(c.status) === 'sent').length,
        activeSubscribers,
        totalSubscribers: subs.length,
        totalSent: sumSent,
        totalOpened: sumOpened,
        totalClicked: sumClicked,
        averageOpenRate: denom ? round1((sumOpened / denom) * 100) : 0,
        averageClickRate: denom ? round1((sumClicked / denom) * 100) : 0,
      });
    } catch (error) {
      console.error('Error fetching overall analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // AI-powered features
  app.get("/api/email/ai/insights", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      // TODO: Implement AI insights
      res.json([
        {
          type: type || 'engagement',
          title: 'Best Send Time',
          description: 'Your subscribers are most active on Tuesdays at 10 AM',
          confidence: 0.85,
          action: 'Schedule your next campaign for Tuesday morning'
        }
      ]);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      res.status(500).json({ error: 'Failed to fetch insights' });
    }
  });

  // Track email events (opens, clicks, etc.)
  app.post("/api/email/track/event", async (req: Request, res: Response) => {
    try {
      const { campaign_id, email, event_type, link_url, user_agent, ip_address } = req.body;
      
      // Parse user agent for device/browser info
      const deviceType = user_agent && user_agent.toLowerCase().includes('mobile') ? 'mobile' : 
                        user_agent && user_agent.toLowerCase().includes('tablet') ? 'tablet' : 'desktop';
      
      await db.insert(emailEvents).values({
        campaignId: campaign_id,
        subscriberEmail: email,
        eventType: event_type,
        linkUrl: link_url,
        userAgent: user_agent,
        ipAddress: ip_address,
        deviceType,
      });
      
      // Update campaign stats
      if (event_type === 'opened') {
        await db.update(emailCampaigns)
          .set({ openedCount: sql`${emailCampaigns.openedCount} + 1` })
          .where(eq(emailCampaigns.id, campaign_id));
      } else if (event_type === 'clicked') {
        await db.update(emailCampaigns)
          .set({ clickedCount: sql`${emailCampaigns.clickedCount} + 1` })
          .where(eq(emailCampaigns.id, campaign_id));
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error tracking event:', error);
      res.status(500).json({ error: 'Failed to track event' });
    }
  });

  // Generate test analytics data for a campaign
  app.post("/api/email/test/generate-analytics/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const campaignId = req.params.id;
      
      // Check if campaign exists
      const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, campaignId));
      
      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }
      
      // Generate realistic test data
      const totalSent = 2847;
      const openRate = 0.29; // 29%
      const clickRate = 0.058; // 5.8%
      const bounceRate = 0.012; // 1.2%
      
      const opens = Math.floor(totalSent * openRate);
      const clicks = Math.floor(totalSent * clickRate);
      const bounces = Math.floor(totalSent * bounceRate);
      const unsubscribes = Math.floor(totalSent * 0.002);
      
      // Generate test emails
      const testEmails: string[] = [];
      for (let i = 0; i < totalSent; i++) {
        testEmails.push(`testuser${i}@example.com`);
      }
      
      // Devices
      const devices = ['desktop', 'mobile', 'tablet'];
      const countries = ['Austria', 'Germany', 'Switzerland', 'Italy', 'France'];
      const cities = ['Vienna', 'Berlin', 'Zurich', 'Rome', 'Paris'];
      
      // Insert sent events
      const events = [];
      for (let i = 0; i < totalSent; i++) {
        events.push({
          campaignId,
          subscriberEmail: testEmails[i],
          eventType: 'sent',
          deviceType: devices[Math.floor(Math.random() * devices.length)],
          country: countries[Math.floor(Math.random() * countries.length)],
          city: cities[Math.floor(Math.random() * cities.length)],
        });
      }
      
      // Insert opened events
      for (let i = 0; i < opens; i++) {
        const email = testEmails[Math.floor(Math.random() * totalSent)];
        events.push({
          campaignId,
          subscriberEmail: email,
          eventType: 'opened',
          deviceType: devices[Math.floor(Math.random() * devices.length)],
          country: countries[Math.floor(Math.random() * countries.length)],
          city: cities[Math.floor(Math.random() * cities.length)],
        });
      }
      
      // Insert clicked events
      for (let i = 0; i < clicks; i++) {
        const email = testEmails[Math.floor(Math.random() * opens)]; // Only from those who opened
        events.push({
          campaignId,
          subscriberEmail: email,
          eventType: 'clicked',
          linkUrl: 'https://example.com/special-offer',
          deviceType: devices[Math.floor(Math.random() * devices.length)],
          country: countries[Math.floor(Math.random() * countries.length)],
          city: cities[Math.floor(Math.random() * cities.length)],
        });
      }
      
      // Insert bounced events
      for (let i = 0; i < bounces; i++) {
        events.push({
          campaignId,
          subscriberEmail: testEmails[Math.floor(Math.random() * totalSent)],
          eventType: 'bounced',
          deviceType: 'unknown',
        });
      }
      
      // Insert unsubscribe events
      for (let i = 0; i < unsubscribes; i++) {
        events.push({
          campaignId,
          subscriberEmail: testEmails[Math.floor(Math.random() * totalSent)],
          eventType: 'unsubscribed',
          deviceType: devices[Math.floor(Math.random() * devices.length)],
        });
      }
      
      // Insert all events
      await db.insert(emailEvents).values(events);
      
      // Update campaign stats
      await db.update(emailCampaigns)
        .set({
          sentCount: totalSent,
          deliveredCount: totalSent - bounces,
          openedCount: opens,
          clickedCount: clicks,
          bouncedCount: bounces,
          unsubscribedCount: unsubscribes,
        })
        .where(eq(emailCampaigns.id, campaignId));
      
      res.json({
        success: true,
        message: 'Test analytics data generated',
        stats: {
          sent: totalSent,
          opens,
          clicks,
          bounces,
          unsubscribes,
        },
      });
    } catch (error) {
      console.error('Error generating test data:', error);
      res.status(500).json({ error: 'Failed to generate test data' });
    }
  });

  app.get("/api/email/ai/recommendations", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { campaign_id } = req.query;
      // TODO: Implement AI recommendations
      res.json([
        {
          type: 'subject_line',
          priority: 'high',
          title: 'Improve Your Subject Line',
          description: 'Add personalization to increase open rates by 26%',
          example: 'Try: "{{first_name}}, your exclusive offer awaits"'
        }
      ]);
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  });

  app.get("/api/email/ai/send-time/:subscriberId", authenticateUser, async (req: Request, res: Response) => {
    try {
      // TODO: Implement optimal send time prediction
      res.json({
        subscriber_id: req.params.subscriberId,
        optimal_time: '2025-10-11T10:00:00Z',
        timezone: 'UTC',
        confidence: 0.78
      });
    } catch (error) {
      console.error('Error predicting send time:', error);
      res.status(500).json({ error: 'Failed to predict send time' });
    }
  });

  app.get("/api/email/ai/predict-engagement/:campaignId", authenticateUser, async (req: Request, res: Response) => {
    try {
      // TODO: Implement engagement prediction
      res.json({
        campaign_id: req.params.campaignId,
        predicted_open_rate: 0.24,
        predicted_click_rate: 0.035,
        confidence: 0.82,
        factors: ['subject_line_quality', 'send_time', 'audience_engagement']
      });
    } catch (error) {
      console.error('Error predicting engagement:', error);
      res.status(500).json({ error: 'Failed to predict engagement' });
    }
  });

  // A/B Testing
  app.post("/api/email/ab-test", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { campaign_id, config } = req.body;
      // TODO: Implement A/B test creation
      res.json({ 
        success: true, 
        test_id: `test_${Date.now()}`,
        message: 'A/B test created successfully' 
      });
    } catch (error) {
      console.error('Error creating A/B test:', error);
      res.status(500).json({ error: 'Failed to create A/B test' });
    }
  });

  // Deliverability
  app.get("/api/email/deliverability", authenticateUser, async (req: Request, res: Response) => {
    try {
      // TODO: Implement deliverability report
      res.json({
        reputation_score: 95,
        bounce_rate: 0.02,
        complaint_rate: 0.001,
        spam_score: 0.5,
        domain_health: {
          spf: 'pass',
          dkim: 'pass',
          dmarc: 'pass'
        },
        recommendations: [
          'Maintain current sender reputation',
          'Consider removing bounced emails from your list'
        ]
      });
    } catch (error) {
      console.error('Error fetching deliverability report:', error);
      res.status(500).json({ error: 'Failed to fetch deliverability report' });
    }
  });

  // Email validation
  app.post("/api/email/validate", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { emails } = req.body;
      // TODO: Implement email validation
      const valid = emails.filter((e: string) => e.includes('@') && e.includes('.'));
      const invalid = emails.filter((e: string) => !e.includes('@') || !e.includes('.'));
      
      res.json({
        valid,
        invalid,
        risky: [],
        unknown: []
      });
    } catch (error) {
      console.error('Error validating emails:', error);
      res.status(500).json({ error: 'Failed to validate emails' });
    }
  });

  // Transactional emails
  app.post("/api/email/transactional", async (req: Request, res: Response) => {
    try {
      const { to, template_id, variables, priority } = req.body;
      // TODO: Implement transactional email sending
      console.log(`Transactional email queued: ${template_id} to ${to}`);
      res.json({ 
        success: true, 
        message_id: `msg_${Date.now()}`,
        status: 'queued' 
      });
    } catch (error) {
      console.error('Error sending transactional email:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // Bulk subscriber operations
  app.post("/api/email/subscribers/bulk-import", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { subscribers } = req.body;
      // TODO: Implement bulk import
      res.json({
        imported: subscribers.length,
        skipped: 0,
        errors: []
      });
    } catch (error) {
      console.error('Error importing subscribers:', error);
      res.status(500).json({ error: 'Failed to import subscribers' });
    }
  });

  app.post("/api/email/subscribers/bulk-update", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { subscriber_ids, changes } = req.body;
      // TODO: Implement bulk update
      res.json({ 
        success: true, 
        updated: subscriber_ids.length 
      });
    } catch (error) {
      console.error('Error updating subscribers:', error);
      res.status(500).json({ error: 'Failed to update subscribers' });
    }
  });

  // Health check endpoint for deployment monitoring
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0"
    });
  });

  // ==================== TEST CHAT ROUTES ====================
  
  // DEDICATED TOGNINJA BLOG WRITER ASSISTANT ENDPOINT
  app.post("/api/togninja/chat", async (req: Request, res: Response) => {
    console.log("🎯 TOGNINJA BLOG WRITER ASSISTANT ENDPOINT HIT");
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    try {
      const { message, threadId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const assistantId = "asst_nlyO3yRav2oWtyTvkq0cHZaU"; // TOGNINJA BLOG WRITER
      let currentThreadId = threadId;

      // Create new thread if needed
      if (!currentThreadId) {
        const threadResponse = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({})
        });

        if (!threadResponse.ok) {
          throw new Error(`Failed to create thread: ${threadResponse.status}`);
        }

        const threadData = await threadResponse.json();
        currentThreadId = threadData.id;
      }

      // Add user message to thread
      await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: message
        })
      });

      // Create run with TOGNINJA assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: assistantId
        })
      });

      if (!runResponse.ok) {
        throw new Error(`Failed to create run: ${runResponse.status}`);
      }

      const runData = await runResponse.json();
      const runId = runData.id;

      // Wait for completion
      let runStatus = 'queued';
      let attempts = 0;
      const maxAttempts = 60;

      while (runStatus !== 'completed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });

        if (!statusResponse.ok) {
          throw new Error(`Failed to check run status: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();
        runStatus = statusData.status;
        attempts++;
      }

      if (runStatus !== 'completed') {
        throw new Error(`TOGNINJA assistant run failed with status: ${runStatus}`);
      }

      // Get response
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!messagesResponse.ok) {
        throw new Error(`Failed to get messages: ${messagesResponse.status}`);
      }

      const messagesData = await messagesResponse.json();
      const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');
      
      const response = assistantMessage?.content?.[0]?.text?.value || "I apologize, but I couldn't generate a response.";

      console.log("🎯 TOGNINJA RESPONSE:", response.slice(0, 100));
      res.json({ 
        response,
        threadId: currentThreadId,
        assistantId: assistantId,
        source: "TOGNINJA_BLOG_WRITER_ASSISTANT"
      });
      
    } catch (error) {
      console.error("TOGNINJA Assistant error:", error);
      res.status(500).json({ 
        error: "TOGNINJA Assistant failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // REDIRECT OLD TEST CHAT TO TOGNINJA ENDPOINT
  app.post("/api/test/chat", async (req: Request, res: Response) => {
    console.log("🔄 REDIRECTING OLD /api/test/chat TO TOGNINJA ENDPOINT");
    console.log("Request body:", req.body);
    
    try {
      const { message, threadId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const assistantId = "asst_nlyO3yRav2oWtyTvkq0cHZaU"; // TOGNINJA BLOG WRITER
      let currentThreadId = threadId;

      // Create new thread if needed
      if (!currentThreadId) {
        const threadResponse = await fetch('https://api.openai.com/v1/threads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'assistants=v2'
          },
          body: JSON.stringify({})
        });

        if (!threadResponse.ok) {
          throw new Error(`Failed to create thread: ${threadResponse.status}`);
        }

        const threadData = await threadResponse.json();
        currentThreadId = threadData.id;
      }

      // Add user message to thread
      await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: message
        })
      });

      // Create run with TOGNINJA assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: assistantId
        })
      });

      if (!runResponse.ok) {
        throw new Error(`Failed to create run: ${runResponse.status}`);
      }

      const runData = await runResponse.json();
      const runId = runData.id;

      // Wait for completion
      let runStatus = 'queued';
      let attempts = 0;
      const maxAttempts = 60;

      while (runStatus !== 'completed' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });

        if (!statusResponse.ok) {
          throw new Error(`Failed to check run status: ${statusResponse.status}`);
        }

        const statusData = await statusResponse.json();
        runStatus = statusData.status;
        attempts++;
      }

      if (runStatus !== 'completed') {
        throw new Error(`TOGNINJA assistant run failed with status: ${runStatus}`);
      }

      // Get response
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!messagesResponse.ok) {
        throw new Error(`Failed to get messages: ${messagesResponse.status}`);
      }

      const messagesData = await messagesResponse.json();
      const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');
      
      const response = assistantMessage?.content?.[0]?.text?.value || "I apologize, but I couldn't generate a response.";

      console.log("🎯 TOGNINJA RESPONSE VIA REDIRECT:", response.slice(0, 100));
      res.json({ 
        response,
        threadId: currentThreadId,
        assistantId: assistantId,
        source: "TOGNINJA_BLOG_WRITER_ASSISTANT_REDIRECT"
      });
      
    } catch (error) {
      console.error("TOGNINJA Assistant redirect error:", error);
      res.status(500).json({ 
        error: "TOGNINJA Assistant redirect failed",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ==================== AUTOMATIC EMAIL REFRESH ====================
  app.post("/api/email/refresh", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log('Starting email refresh...');

      // Gmail via OAuth (one-click) takes priority — read through the Gmail API, no IMAP.
      let importedEmails: any[];
      const { getGmailConnection, listRecentGmail } = await import('./services/gmailService');
      const gmailConn = await getGmailConnection();
      if (gmailConn) {
        importedEmails = await listRecentGmail(50);
      } else {
        // Resolve IMAP from the wizard config (DB) first, env fallback — and fall back to the
        // SMTP login when no IMAP-specific creds are set (was env-only, so studios that set up
        // email in the wizard got a 500).
        const { getImapConfig } = await import('./utils/smtp-helper');
        const imap = await getImapConfig();

        if (!imap.user || !imap.password) {
          console.error('IMAP credentials missing (no wizard config or env).');
          return res.status(400).json({
            success: false,
            error: 'Email inbox is not configured yet. Add your email account in Inbox → Settings (or connect Gmail).'
          });
        }

        importedEmails = await importEmailsFromIMAP({
          host: imap.host,
          port: imap.port,
          username: imap.user,
          password: imap.password,
          useTLS: imap.tls,
        });
      }

      console.log(`Successfully fetched ${importedEmails.length} emails from business account`);

      // Store emails in database, avoid duplicates
      let newEmailCount = 0;
      const existingMessages = await storage.getCrmMessages();
      
      for (const email of importedEmails) {
        // Check if email already exists (improved duplicate check)
        const isDuplicate = existingMessages.some(msg => 
          msg.subject === email.subject && 
          msg.senderEmail === email.from &&
          Math.abs(new Date(msg.createdAt).getTime() - new Date(email.date).getTime()) < 300000 // Within 5 minutes
        );
        
        if (!isDuplicate) {
          try {
            // Try to match email to a client
            const clientId = await findClientIdByEmail(email.from);
            
            await storage.createCrmMessage({
              senderName: email.fromName,
              senderEmail: email.from,
              subject: email.subject,
              content: email.body,
              status: email.isRead ? 'read' : 'unread',
              clientId: clientId || undefined
            });
            newEmailCount++;
            console.log(`Imported new email: ${email.subject} from ${email.from}${clientId ? ` (linked to client ${clientId})` : ''}`);
          } catch (error) {
            console.error('Failed to save email:', error);
          }
        }
      }
      
      console.log(`Imported ${newEmailCount} new emails out of ${importedEmails.length} fetched`);
      
      // Auto-link any previously unlinked emails to clients
      try {
        const allMessages = await storage.getCrmMessages();
        const clients = await storage.getCrmClients();
        let linkedCount = 0;
        
        for (const msg of allMessages) {
          if (!msg.clientId && msg.senderEmail) {
            const normalizedSender = msg.senderEmail.toLowerCase().trim();
            const matchingClient = clients.find(c => 
              c.email && c.email.toLowerCase().trim() === normalizedSender
            );
            if (matchingClient) {
              await storage.updateCrmMessage(msg.id, { clientId: matchingClient.id });
              linkedCount++;
            }
          }
        }
        if (linkedCount > 0) {
          console.log(`🔗 Auto-linked ${linkedCount} previously unlinked emails to clients`);
        }
      } catch (linkErr) {
        console.error('Auto-link pass failed:', linkErr);
      }
      
      res.json({ 
        success: true, 
        message: `Email refresh completed: ${newEmailCount} new emails imported`,
        newEmails: newEmailCount,
        totalEmails: importedEmails.length,
        processedEmails: newEmailCount
      });
    } catch (error) {
      console.error('Email refresh error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to refresh emails: ' + (error as Error).message 
      });
    }
  });

  // ==================== AUTOMATIC EMAIL IMPORT SERVICE ====================
  // Background email import service with rate limiting and crash protection
  let emailImportInterval: NodeJS.Timeout | null = null;
  let lastEmailImportTime = 0;
  let isEmailImportRunning = false; // Mutex to prevent concurrent imports
  
  const EMAIL_IMPORT_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours (safe interval)
  const EMAIL_IMPORT_TIMEOUT_MS = 90 * 1000; // 90 second timeout per import
  
  const startBackgroundEmailImport = () => {
    // DON'T START if in demo mode
    if (process.env.DEMO_MODE === 'true') {
      console.log('📧 Email import disabled in demo mode');
      return;
    }
    
    // Check for either EMAIL_PASSWORD or SMTP_PASS
    const emailPassword = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
    if (!emailPassword) {
      console.log('📧 Email import disabled - no email credentials configured');
      return;
    }
    
    // Clear any existing interval
    if (emailImportInterval) {
      clearInterval(emailImportInterval);
    }
    
    // Initial import after 5 minutes (give server time to stabilise and serve requests)
    setTimeout(() => {
      if (!isEmailImportRunning) {
        runSafeEmailImport();
      }
    }, 5 * 60 * 1000);
    
    // Set up recurring import every 2 hours
    emailImportInterval = setInterval(async () => {
      await runSafeEmailImport();
    }, EMAIL_IMPORT_INTERVAL_MS);
    
    console.log('✅ Background email import service started (every 2 hours)');
  };
  
  // Safe email import with mutex, timeout, and error handling
  const runSafeEmailImport = async () => {
    // Mutex check - skip if already running
    if (isEmailImportRunning) {
      console.log('📧 Email import already in progress, skipping...');
      return;
    }
    
    isEmailImportRunning = true;
    const importStartTime = Date.now();
    
    try {
      console.log('📧 Starting scheduled email import...');
      
      // Set a timeout for the entire import operation
      const importPromise = importEmailsFromIMAP({
        host: process.env.IMAP_HOST || 'imap.easyname.com',
        port: parseInt(process.env.IMAP_PORT || '993'),
        username: process.env.IMAP_USER || process.env.BUSINESS_MAILBOX_USER || '',
        password: process.env.IMAP_PASS || process.env.EMAIL_PASSWORD || '',
        useTLS: true
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Email import timeout')), EMAIL_IMPORT_TIMEOUT_MS);
      });
      
      const importedEmails = await Promise.race([importPromise, timeoutPromise]);
      
      // Store only genuinely new emails with duplicate prevention
      let newEmailCount = 0;
      
      for (const email of importedEmails) {
        const isDuplicate = await checkEmailExists(email);
        
        if (!isDuplicate) {
          try {
            await storage.createCrmMessage({
              senderName: email.fromName,
              senderEmail: email.from,
              subject: email.subject,
              content: email.body,
              status: email.isRead ? 'read' : 'unread'
            });
            newEmailCount++;
          } catch (error: any) {
            // Skip silently on duplicate constraint violations
            if (!error.message?.includes('unique') && !error.message?.includes('duplicate')) {
              console.error('📧 Failed to save email:', error.message);
            }
          }
        }
      }
      
      const duration = ((Date.now() - importStartTime) / 1000).toFixed(1);
      
      if (newEmailCount > 0) {
        lastEmailImportTime = Date.now();
        console.log(`📧 Email import complete: ${newEmailCount} new emails imported in ${duration}s`);
      } else {
        console.log(`📧 Email import complete: no new emails (checked ${importedEmails.length} emails in ${duration}s)`);
      }
      
    } catch (error: any) {
      const duration = ((Date.now() - importStartTime) / 1000).toFixed(1);
      console.error(`📧 Email import failed after ${duration}s:`, error.message);
      // Don't throw - let the server continue running
    } finally {
      isEmailImportRunning = false;
    }
  };

  // Helper functions for smart email import
  async function getLastEmailImportTime(): Promise<Date | undefined> {
    try {
      const result = await db
        .select({ createdAt: crmMessages.createdAt })
        .from(crmMessages)
        .orderBy(crmMessages.createdAt)
        .limit(1);
      
      // Return date 1 hour ago to catch any recent emails we might have missed
      const lastTime = result[0]?.createdAt;
      if (lastTime) {
        const oneHourAgo = new Date(lastTime.getTime() - 60 * 60 * 1000);
        return oneHourAgo;
      }
      
      // If no emails exist, return 24 hours ago
      return new Date(Date.now() - 24 * 60 * 60 * 1000);
    } catch (error) {
      console.error('Error getting last import time:', error);
      return new Date(Date.now() - 24 * 60 * 60 * 1000);
    }
  }

  async function updateLastEmailImportTime(timestamp: number): Promise<void> {
    // Store timestamp in environment or database for persistence
    lastEmailImportTime = timestamp;
  }

  async function checkEmailExists(email: any): Promise<boolean> {
    try {
      const { and } = await import('drizzle-orm');
      const existing = await db
        .select({ id: crmMessages.id })
        .from(crmMessages)
        .where(and(
          eq(crmMessages.senderEmail, email.from),
          eq(crmMessages.subject, email.subject)
        ))
        .limit(1);
      
      return existing.length > 0;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }

  // Enable background email import with safe rate limiting
  startBackgroundEmailImport();

  // Endpoint to get email import status
  app.get("/api/email/import-status", authenticateUser, async (req: Request, res: Response) => {
    const now = Date.now();
    const nextImportIn = lastEmailImportTime 
      ? Math.max(0, EMAIL_IMPORT_INTERVAL_MS - (now - lastEmailImportTime))
      : EMAIL_IMPORT_INTERVAL_MS;
      
    res.json({ 
      isRunning: emailImportInterval !== null,
      isCurrentlyImporting: isEmailImportRunning,
      lastImportTime: lastEmailImportTime ? new Date(lastEmailImportTime).toISOString() : null,
      nextImportIn: nextImportIn,
      nextImportInMinutes: Math.round(nextImportIn / 60000),
      intervalHours: EMAIL_IMPORT_INTERVAL_MS / (60 * 60 * 1000)
    });
  });

  // ==================== HEALTH CHECK ====================
  app.get("/api/health", (req: Request, res: Response) => {
    try {
      res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        demoMode: process.env.DEMO_MODE,
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({ 
        status: "error", 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ==================== CLIENT ERROR LOGGING ====================
  app.post("/api/client-error", (req: Request, res: Response) => {
    try {
      const { error, timestamp, url, userAgent } = req.body;
      console.error(`Client Error [${timestamp}]:`, error);
      console.error(`URL: ${url || req.headers.referer}`);
      console.error(`User Agent: ${userAgent || req.headers['user-agent']}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to log client error:', error);
      res.status(500).json({ success: false });
    }
  });

  // Website scraping and customization routes
  app.post("/api/scrape-website", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "Website URL is required" });
      }

      const { WebsiteScraper } = await import('./scraping-agent');
      const scrapedData = await WebsiteScraper.scrapeWebsite(url);
      
      res.json(scrapedData);
    } catch (error) {
      console.error('Error scraping website:', error);
      res.status(500).json({ error: "Failed to scrape website" });
    }
  });

  app.post("/api/generate-seo-recommendations", async (req: Request, res: Response) => {
    try {
      const { scrapedData, location } = req.body;
      
      if (!scrapedData) {
        return res.status(400).json({ error: "Scraped data is required" });
      }

      const { SEOAgent } = await import('./scraping-agent');
      const recommendations = SEOAgent.generateSEORecommendations(scrapedData, location);
      
      res.json(recommendations);
    } catch (error) {
      console.error('Error generating SEO recommendations:', error);
      res.status(500).json({ error: "Failed to generate SEO recommendations" });
    }
  });

  // Email notification function for new leads
  async function sendNewLeadNotification(lead: any) {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.easyname.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: parseInt(process.env.SMTP_PORT || '587') === 465, // implicit TLS on 465
      auth: {
        user: process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || '',
        pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || ''
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const leadSource = lead.source || 'Website';
    const leadMessage = lead.message || 'No message provided';
    
    const emailSubject = `🔔 New Lead: ${lead.name} from ${leadSource}`;
    const emailBody = `
New Lead Notification - ${getBizName()}

📋 Lead Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone || 'Not provided'}
Company: ${lead.company || 'Not provided'}
Source: ${leadSource}
Status: ${lead.status || 'New'}

📝 Message:
${leadMessage}

🕐 Received: ${new Date().toLocaleString('de-DE', { 
  timeZone: 'Europe/Vienna',
  year: 'numeric',
  month: '2-digit', 
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})} (Vienna time)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💼 Action Required:
• Review the lead in your CRM dashboard
• Contact the prospect within 24 hours
• Update lead status after initial contact

🔗 CRM Dashboard: ${getBaseUrl()}/admin/leads

Best regards,
${getBizName()} CRM System
    `;

    const studioEmail = getEnvContactEmailSync();
    const mailOptions = {
      from: studioEmail || 'no-reply@localhost',
      to: studioEmail || 'no-reply@localhost',
      subject: emailSubject,
      text: emailBody,
      html: emailBody.replace(/\n/g, '<br>').replace(/━/g, '─')
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('New lead notification sent:', info.messageId);
    
    // Save the notification email to the database for tracking
    try {
      await storage.createCrmMessage({
        senderName: `${getBizName()} System`,
        senderEmail: `system@${getBizDomain()}`,
        subject: `[LEAD NOTIFICATION] ${emailSubject}`,
        content: `Lead notification sent to ${studioEmail || '<unset>'}\n\n${emailBody}`,
        status: 'archived'
      });
    } catch (dbError) {
      console.error('Failed to save lead notification to database:', dbError);
    }
  }

  // ==================== VOUCHER MANAGEMENT ROUTES ====================
  
  // Voucher Products Routes
  // ==================== IMAGE UPLOAD ROUTES ====================
  app.post("/api/upload/image", authOrApiKey('media:write'), upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Resolve storage from onboarding config (studio_integrations) then env.
      const s3cfg = getS3Config();
      if (!s3cfg.bucket) {
        return res.status(500).json({ error: 'Cloud storage is not configured. Set it in Setup → Storage (or the AWS_S3_* env vars).' });
      }
      if (!s3cfg.endpoint) {
        console.warn('[VOUCHER IMAGE] storage endpoint missing; falling back to standard S3 URL format');
      }

      console.log("[VOUCHER IMAGE] Uploading to B2:", {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // Prepare buffers
      const originalBuffer = req.file.buffer;
      if (!originalBuffer) {
        console.error("[VOUCHER IMAGE] No buffer available");
        return res.status(500).json({ error: "File buffer not available" });
      }

      let processedBuffer = originalBuffer;
      let processedMime = req.file.mimetype;
      let thumbnailBuffer: Buffer | null = null;
      let thumbnailMime = 'image/webp';
      let didTransform = false;

      try {
        // Resize & convert to webp for efficiency (max width 1600)
        const main = sharp(originalBuffer)
          .rotate()
          .resize({ width: 1400, withoutEnlargement: true })
          .webp({ quality: 72 });
        processedBuffer = await main.toBuffer();
        processedMime = 'image/webp';
        didTransform = true;
        // Create thumbnail (square crop)
        thumbnailBuffer = await sharp(originalBuffer)
          .rotate()
          .resize({ width: 360, height: 360, fit: 'cover' })
          .webp({ quality: 70 })
          .toBuffer();
      } catch (imgErr) {
        console.warn("[VOUCHER IMAGE] Sharp processing failed, falling back to original:", imgErr);
        thumbnailBuffer = null; // Will skip thumbnail upload
      }

      const baseName = `voucher-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const mainFileName = `${baseName}${processedMime === 'image/webp' ? '.webp' : path.extname(req.file.originalname)}`;
      const thumbFileName = `thumb-${baseName}.webp`;
      const mainKey = `vouchers/${mainFileName}`;
      const thumbKey = `vouchers/${thumbFileName}`;

      console.log("[VOUCHER IMAGE] Uploading to B2 with keys:", { mainKey, thumbKey, transformed: didTransform });

      // Upload main image
      await getS3Client().send(new PutObjectCommand({
        Bucket: getS3Config().bucket,
        Key: mainKey,
        Body: processedBuffer,
        ContentType: processedMime,
        // Backblaze B2 S3 API: omit ACL; bucket policy controls public access
        Metadata: {
          originalName: req.file.originalname,
          uploadedBy: 'voucher-system',
          transformed: didTransform ? 'true' : 'false',
        },
      }));

      // Helper to build public URL (supports Backblaze B2 S3 & download endpoints)
      // Properly URL encodes spaces and special characters in the path
      const buildPublicUrl = (key: string): string => {
        const bucket = s3cfg.bucket;
        const endpoint = s3cfg.endpoint;
        // URL encode each path segment, preserving slashes
        const encodedKey = key.split('/').map(part => encodeURIComponent(part)).join('/');
        // Supabase Storage: the S3 endpoint (…/storage/v1/s3) is auth-only — a browser
        // <img> can't load from it. Public objects are served from a different path:
        // …/storage/v1/object/public/<bucket>/<key> (bucket must be marked Public).
        if (endpoint.includes('supabase')) {
          const host = endpoint.replace(/\/storage\/v1\/s3$/, '');
          return `${host}/storage/v1/object/public/${bucket}/${encodedKey}`;
        }
        if (endpoint.includes('backblazeb2.com')) {
          return `https://${bucket}.${endpoint.replace('https://', '').replace(/\/$/, '')}/${encodedKey}`;
        }
        if (endpoint) {
          if (endpoint.includes('/file/')) {
            return `${endpoint.replace(/\/$/, '')}/${encodedKey}`;
          }
          return `${endpoint.replace(/\/$/, '')}/${bucket}/${encodedKey}`;
        }
        return `https://${bucket}.s3.${process.env.AWS_REGION || 'eu-central-1'}.amazonaws.com/${encodedKey}`;
      };

      // Upload thumbnail if created
      let thumbUrl: string | null = null;
      if (thumbnailBuffer) {
        try {
          await getS3Client().send(new PutObjectCommand({
            Bucket: getS3Config().bucket,
            Key: thumbKey,
            Body: thumbnailBuffer,
            ContentType: thumbnailMime,
            Metadata: {
              originalName: req.file.originalname,
              uploadedBy: 'voucher-system',
              type: 'thumbnail'
            }
          }));
          thumbUrl = buildPublicUrl(thumbKey);
        } catch (thumbErr) {
          console.warn("[VOUCHER IMAGE] Thumbnail upload failed:", thumbErr);
        }
      }

      

      const mainUrl = buildPublicUrl(mainKey);

      console.log("[VOUCHER IMAGE] Upload successful:", {
        mainKey,
        thumbKey: thumbnailBuffer ? thumbKey : null,
        url: mainUrl,
        thumbUrl,
        originalSize: req.file.size,
        processedSize: processedBuffer.length,
        bucket: s3cfg.bucket
      });

      res.json({ url: mainUrl, thumbnailUrl: thumbUrl, originalSize: req.file.size, processedSize: processedBuffer.length });
    } catch (error) {
      const e: any = error;
      console.error("[VOUCHER IMAGE] Upload error:", {
        name: e?.name,
        message: e?.message,
        code: e?.code,
        $metadata: e?.$metadata,
        stack: e?.stack,
      });
      res.status(500).json({ error: "Failed to upload image to cloud storage", details: e?.message || String(e) });
    }
  });

  // Central error handler for Multer (file too large, invalid type)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Multer errors surface here when using upload.single()
    if (err && err.name === 'MulterError') {
      console.error('[UPLOAD] MulterError:', { code: err.code, message: err.message });
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large', limit: '20MB' });
      }
      return res.status(400).json({ error: 'Upload error', code: err.code, message: err.message });
    }
    return next(err);
  });

  // Diagnostics endpoint for upload environment
  app.get('/api/upload/debug/env', (req: Request, res: Response) => {
    res.json({
      bucketSet: !!getS3Config().bucket,
      endpointSet: !!process.env.AWS_S3_ENDPOINT,
      region: process.env.AWS_REGION || 'eu-central-1',
      forcePathStyle: !!process.env.AWS_S3_ENDPOINT,
      maxFileSizeMB: 20,
      sharpVersion: require('sharp').version,
    });
  });

  // ==================== VOUCHER ROUTES ====================
  app.get("/api/vouchers/products", async (req: Request, res: Response) => {
    try {
          // Ensure no caching to always get fresh product data
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          
          const language = (req.query.language as string) || 'de';
          // Helper to properly encode URLs with spaces in path segments
          const encodeImageUrl = (url: string | null | undefined): string | null => {
            if (!url) return null;
            try {
              const urlObj = new URL(url);
              // Encode each path segment individually to handle spaces
              urlObj.pathname = urlObj.pathname.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
              return urlObj.toString();
            } catch {
              return url;
            }
          };
          const toCamel = (p: any) => ({
            id: p.id,
            name: language === 'en' ? translateVoucherToEnglish(p.name) : p.name,
            description: p.description ? (language === 'en' ? translateVoucherToEnglish(p.description) : p.description) : null,
            detailedDescription: (p.detailedDescription ?? p.detailed_description) ? (language === 'en' ? translateVoucherToEnglish(p.detailedDescription ?? p.detailed_description) : (p.detailedDescription ?? p.detailed_description)) : null,
            price: p.price,
            originalPrice: p.originalPrice ?? p.original_price,
            category: p.category,
            sessionDuration: p.sessionDuration ?? p.session_duration,
            sessionType: p.sessionType ?? p.session_type,
            validityPeriod: p.validityPeriod ?? p.validity_period,
            redemptionInstructions: p.redemptionInstructions ?? p.redemption_instructions,
            termsAndConditions: (p.termsAndConditions ?? p.terms_and_conditions) ? (language === 'en' ? translateVoucherToEnglish(p.termsAndConditions ?? p.terms_and_conditions) : (p.termsAndConditions ?? p.terms_and_conditions)) : null,
            imageUrl: encodeImageUrl(p.imageUrl ?? p.image_url),
            thumbnailUrl: encodeImageUrl(p.thumbnailUrl ?? p.thumbnail_url),
            promoImageUrl: encodeImageUrl(p.promoImageUrl ?? p.promo_image_url),
            displayOrder: p.displayOrder ?? p.display_order,
            featured: p.featured,
            badge: p.badge,
            isActive: p.isActive ?? p.is_active,
            stockLimit: p.stockLimit ?? p.stock_limit,
            maxPerCustomer: p.maxPerCustomer ?? p.max_per_customer,
            slug: p.slug,
            metaTitle: p.metaTitle ?? p.meta_title,
            metaDescription: p.metaDescription ?? p.meta_description,
            createdAt: p.createdAt ?? p.created_at,
            updatedAt: p.updatedAt ?? p.updated_at,
          });
          const raw = await neonDb.getVoucherProducts();
          const products = raw.map(toCamel);
          res.json(products);
    } catch (error) {
      console.error("Error fetching voucher products:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get single voucher product by ID or slug (public endpoint)
  app.get("/api/vouchers/products/:id", async (req: Request, res: Response) => {
    try {
      const idOrSlug = req.params.id;
      console.log('[VOUCHER] Fetching product by id/slug:', idOrSlug);
      
      // UUID regex pattern to validate before querying by ID
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      let product = null;
      
      // Only try ID lookup if it looks like a valid UUID
      if (uuidPattern.test(idOrSlug)) {
        try {
          product = await neonDb.getVoucherProduct(idOrSlug);
          console.log('[VOUCHER] Direct ID lookup result:', product ? 'found' : 'not found');
        } catch (idError) {
          console.log('[VOUCHER] ID lookup failed, will try slug:', idError);
        }
      } else {
        console.log('[VOUCHER] Input is not a UUID, skipping ID lookup');
      }
      
      if (!product) {
        // Fallback: attempt slug lookup
        try {
          console.log('[VOUCHER] Attempting slug fallback for:', idOrSlug);
          const all = await neonDb.getVoucherProducts();
          console.log('[VOUCHER] Got', all.length, 'products for slug search');
          product = all.find((p: any) => p.slug === idOrSlug);
          console.log('[VOUCHER] Slug lookup result:', product ? 'found' : 'not found');
        } catch (e) {
          console.warn('[VOUCHER] Slug fallback failed:', e);
        }
      }
      if (!product) {
        console.log('[VOUCHER] Product not found for:', idOrSlug);
        return res.status(404).json({ error: "Voucher product not found" });
      }
      // Helper to properly encode URLs with spaces in path segments
      const encodeImageUrl = (url: string | null | undefined): string | null => {
        if (!url) return null;
        try {
          const urlObj = new URL(url);
          // Encode each path segment individually to handle spaces
          urlObj.pathname = urlObj.pathname.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
          return urlObj.toString();
        } catch {
          return url;
        }
      };
      const p = product as any;
      const singleLanguage = (req.query.language as string) || 'de';
      const transformedProduct = {
        id: p.id,
        name: singleLanguage === 'en' ? translateVoucherToEnglish(p.name) : p.name,
        description: p.description ? (singleLanguage === 'en' ? translateVoucherToEnglish(p.description) : p.description) : null,
        detailedDescription: (p.detailedDescription ?? p.detailed_description) ? (singleLanguage === 'en' ? translateVoucherToEnglish(p.detailedDescription ?? p.detailed_description) : (p.detailedDescription ?? p.detailed_description)) : null,
        price: p.price,
        originalPrice: p.originalPrice ?? p.original_price,
        category: p.category,
        sessionDuration: p.sessionDuration ?? p.session_duration,
        sessionType: p.sessionType ?? p.session_type,
        validityPeriod: p.validityPeriod ?? p.validity_period,
        redemptionInstructions: p.redemptionInstructions ?? p.redemption_instructions,
        termsAndConditions: (p.termsAndConditions ?? p.terms_and_conditions) ? (singleLanguage === 'en' ? translateVoucherToEnglish(p.termsAndConditions ?? p.terms_and_conditions) : (p.termsAndConditions ?? p.terms_and_conditions)) : null,
        imageUrl: encodeImageUrl(p.imageUrl ?? p.image_url),
        thumbnailUrl: encodeImageUrl(p.thumbnailUrl ?? p.thumbnail_url),
        promoImageUrl: encodeImageUrl(p.promoImageUrl ?? p.promo_image_url),
        displayOrder: p.displayOrder ?? p.display_order,
        featured: p.featured,
        badge: p.badge,
        isActive: p.isActive ?? p.is_active,
        stockLimit: p.stockLimit ?? p.stock_limit,
        maxPerCustomer: p.maxPerCustomer ?? p.max_per_customer,
        slug: p.slug,
        metaTitle: p.metaTitle ?? p.meta_title,
        metaDescription: p.metaDescription ?? p.meta_description,
        createdAt: p.createdAt ?? p.created_at,
        updatedAt: p.updatedAt ?? p.updated_at,
      };
      res.json(transformedProduct);
    } catch (error) {
      console.error("Error fetching voucher product:", error);
      console.error("[VOUCHER] Full error stack:", (error as Error).stack);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================================================
  // HOMEPAGE IMAGES API
  // ============================================================================

  // Get all homepage images
  app.get("/api/homepage/images", async (req: Request, res: Response) => {
    try {
      const section = req.query.section as string | undefined;
      
      let query = `
        SELECT id, section, url, alt, title, sort_order, is_active, created_at, updated_at
        FROM homepage_images
        WHERE is_active = true
      `;
      const params: any[] = [];
      
      if (section) {
        query += ` AND section = $1`;
        params.push(section);
      }
      
      query += ` ORDER BY sort_order ASC, created_at DESC`;
      
      const images = await runSql(query, params);
      // Short cache so the slow DB round-trip isn't repeated on every page load
      // (image URLs rarely change; admin edits appear within ~5 min). Stale copies
      // are served instantly while revalidating in the background.
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
      res.json(images);
    } catch (error) {
      // Never 500 the homepage over its image list — degrade to defaults (empty list).
      // On a fresh instance the table may not exist yet (created at boot); either way the
      // front-end falls back to its built-in default images.
      console.error("Error fetching homepage images:", error);
      res.set('Cache-Control', 'no-store');
      res.json([]);
    }
  });

  // Get single homepage image
  app.get("/api/homepage/images/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await runSql(`
        SELECT id, section, url, alt, title, sort_order, is_active, created_at, updated_at
        FROM homepage_images
        WHERE id = $1
      `, [id]);
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error fetching homepage image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create homepage image
  app.post("/api/homepage/images", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { section, url, alt, title, sortOrder, isActive } = req.body;
      
      if (!section || !url) {
        return res.status(400).json({ error: "Section and URL are required" });
      }
      
      const result = await runSql(`
        INSERT INTO homepage_images (section, url, alt, title, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, section, url, alt, title, sort_order, is_active, created_at, updated_at
      `, [section, url, alt || null, title || null, sortOrder || 0, isActive !== false]);
      
      console.log(`✅ Created homepage image: ${result[0].id}`);
      res.json(result[0]);
    } catch (error) {
      console.error("Error creating homepage image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update homepage image
  app.put("/api/homepage/images/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { section, url, alt, title, sortOrder, isActive } = req.body;
      
      const result = await runSql(`
        UPDATE homepage_images
        SET 
          section = COALESCE($2, section),
          url = COALESCE($3, url),
          alt = COALESCE($4, alt),
          title = COALESCE($5, title),
          sort_order = COALESCE($6, sort_order),
          is_active = COALESCE($7, is_active),
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, section, url, alt, title, sort_order, is_active, created_at, updated_at
      `, [id, section, url, alt, title, sortOrder, isActive]);
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      console.log(`✅ Updated homepage image: ${id}`);
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating homepage image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete homepage image
  app.delete("/api/homepage/images/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await runSql(`
        DELETE FROM homepage_images
        WHERE id = $1
        RETURNING id
      `, [id]);
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      console.log(`✅ Deleted homepage image: ${id}`);
      res.json({ success: true, message: "Image deleted successfully" });
    } catch (error) {
      console.error("Error deleting homepage image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Upload homepage image to Backblaze B2
  app.post("/api/homepage/images/upload", authenticateUser, upload.single('image'), async (req: Request, res: Response) => {
    try {
      console.log('[HOMEPAGE IMAGE UPLOAD] Request received');
      console.log('[HOMEPAGE IMAGE UPLOAD] File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'NO FILE');
      console.log('[HOMEPAGE IMAGE UPLOAD] Section:', req.body.section);
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded", message: "No file was provided in the upload request" });
      }

      const { section } = req.body;
      if (!section) {
        return res.status(400).json({ error: "Section is required", message: "Please specify a section for this image" });
      }

      // Use shared S3 helper (Backblaze-compatible) and standard AWS_* envs
      const { bucket, endpoint, isConfigured } = getS3Config();
      if (!isConfigured) {
        console.error('❌ S3/B2 credentials or bucket not configured');
        return res.status(503).json({ 
          error: "Storage service not configured", 
          message: "Storage service not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET." 
        });
      }

      console.log('[HOMEPAGE IMAGE UPLOAD] Optimizing image...');
      // Optimize image with sharp
      const optimizedBuffer = await sharp(req.file.buffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .withMetadata(studioImageMetadata()) // preserve input metadata + stamp studio copyright
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const filename = `homepage/${section}-${timestamp}-${randomString}.jpg`;

      console.log('[HOMEPAGE IMAGE UPLOAD] Uploading to B2:', filename);
      // Upload to B2
      const uploadCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: optimizedBuffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000',
      });

      await getS3Client().send(uploadCommand);

      // Generate public URL
      const publicUrl = buildPublicUrl(bucket, endpoint, filename);
      console.log('[HOMEPAGE IMAGE UPLOAD] Public URL:', publicUrl);

      console.log('[HOMEPAGE IMAGE UPLOAD] Saving to database...');
      // Save to database
      const result = await runSql(`
        INSERT INTO homepage_images (section, url, alt, title, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, section, url, alt, title, sort_order, is_active, created_at, updated_at
      `, [
        section,
        publicUrl,
        req.body.alt || `Homepage image for ${section}`,
        req.body.title || section,
        req.body.sortOrder || 0,
        true
      ]);

      console.log(`✅ Uploaded and saved homepage image: ${result[0].id}`);
      console.log(`📸 Image URL: ${publicUrl}`);
      
      res.json({
        success: true,
        image: result[0],
        message: "Image uploaded successfully"
      });
    } catch (error: any) {
      console.error("[HOMEPAGE IMAGE UPLOAD] ❌ Error:", error);
      console.error("[HOMEPAGE IMAGE UPLOAD] Error stack:", error.stack);
      res.status(500).json({ 
        error: "Failed to upload image",
        message: error.message || "An unknown error occurred during upload"
      });
    }
  });

  // ===========================
  // Portfolio Images API Routes
  // ===========================

  // Get all portfolio images (public, filterable by category)
  app.get("/api/portfolio/images", async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      
      let query = `
        SELECT id, category, url, alt, title, description, sort_order, is_active, created_at, updated_at
        FROM portfolio_images
        WHERE is_active = true
      `;
      const params: any[] = [];
      
      if (category) {
        query += ` AND category = $1`;
        params.push(category);
      }
      
      query += ` ORDER BY category, sort_order ASC, created_at DESC`;
      
      const images = await runSql(query, params);
      res.set('Cache-Control', 'no-store');
      res.json(images);
    } catch (error) {
      // Degrade gracefully (empty list) rather than 500 — table may be absent on a fresh DB.
      console.error("Error fetching portfolio images:", error);
      res.set('Cache-Control', 'no-store');
      res.json([]);
    }
  });

  // Get single portfolio image
  app.get("/api/portfolio/images/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await runSql(`
        SELECT id, category, url, alt, title, description, sort_order, is_active, created_at, updated_at
        FROM portfolio_images
        WHERE id = $1
      `, [id]);
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error fetching portfolio image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create portfolio image (admin only)
  app.post("/api/portfolio/images", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { category, url, alt, title, description, sortOrder, isActive } = req.body;
      
      if (!category || !url) {
        return res.status(400).json({ error: "Category and URL are required" });
      }
      
      const result = await runSql(`
        INSERT INTO portfolio_images (category, url, alt, title, description, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, category, url, alt, title, description, sort_order, is_active, created_at, updated_at
      `, [category, url, alt || null, title || null, description || null, sortOrder || 0, isActive !== false]);
      
      console.log(`✅ Created portfolio image: ${result[0].id}`);
      res.json(result[0]);
    } catch (error) {
      console.error("Error creating portfolio image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update portfolio image (admin only)
  app.put("/api/portfolio/images/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { category, url, alt, title, description, sortOrder, isActive } = req.body;
      
      const result = await runSql(`
        UPDATE portfolio_images
        SET 
          category = COALESCE($2, category),
          url = COALESCE($3, url),
          alt = COALESCE($4, alt),
          title = COALESCE($5, title),
          description = COALESCE($6, description),
          sort_order = COALESCE($7, sort_order),
          is_active = COALESCE($8, is_active),
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, category, url, alt, title, description, sort_order, is_active, created_at, updated_at
      `, [id, category, url, alt, title, description, sortOrder, isActive]);
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      console.log(`✅ Updated portfolio image: ${id}`);
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating portfolio image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete portfolio image (admin only)
  app.delete("/api/portfolio/images/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const result = await runSql(`
        DELETE FROM portfolio_images
        WHERE id = $1
        RETURNING id
      `, [id]);
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Image not found" });
      }
      
      console.log(`✅ Deleted portfolio image: ${id}`);
      res.json({ success: true, message: "Image deleted successfully" });
    } catch (error) {
      console.error("Error deleting portfolio image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Upload portfolio image to Backblaze B2 (admin only)
  app.post("/api/portfolio/images/upload", authenticateUser, upload.single('image'), async (req: Request, res: Response) => {
    try {
      console.log('[PORTFOLIO IMAGE UPLOAD] Request received');
      console.log('[PORTFOLIO IMAGE UPLOAD] File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'NO FILE');
      console.log('[PORTFOLIO IMAGE UPLOAD] Category:', req.body.category);
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded", message: "No file was provided in the upload request" });
      }

      const { category } = req.body;
      if (!category) {
        return res.status(400).json({ error: "Category is required", message: "Please specify a category for this image" });
      }

      const { bucket, endpoint, isConfigured } = getS3Config();
      if (!isConfigured) {
        console.error('❌ S3/B2 credentials or bucket not configured');
        return res.status(503).json({ 
          error: "Storage service not configured", 
          message: "Storage service not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET." 
        });
      }

      console.log('[PORTFOLIO IMAGE UPLOAD] Optimizing image...');
      const optimizedBuffer = await sharp(req.file.buffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .withMetadata(studioImageMetadata()) // preserve input metadata + stamp studio copyright
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(7);
      const filename = `portfolio/${category}-${timestamp}-${randomString}.jpg`;

      console.log('[PORTFOLIO IMAGE UPLOAD] Uploading to B2:', filename);
      const uploadCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: filename,
        Body: optimizedBuffer,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000',
      });

      await getS3Client().send(uploadCommand);

      const publicUrl = buildPublicUrl(bucket, endpoint, filename);
      console.log('[PORTFOLIO IMAGE UPLOAD] Public URL:', publicUrl);

      console.log('[PORTFOLIO IMAGE UPLOAD] Saving to database...');
      const result = await runSql(`
        INSERT INTO portfolio_images (category, url, alt, title, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, category, url, alt, title, description, sort_order, is_active, created_at, updated_at
      `, [
        category,
        publicUrl,
        req.body.alt || `Portfolio image for ${category}`,
        req.body.title || category,
        req.body.sortOrder || 0,
        true
      ]);

      console.log(`✅ Uploaded and saved portfolio image: ${result[0].id}`);
      console.log(`📸 Image URL: ${publicUrl}`);
      
      res.json({
        success: true,
        image: result[0],
        message: "Image uploaded successfully"
      });
    } catch (error: any) {
      console.error("[PORTFOLIO IMAGE UPLOAD] ❌ Error:", error);
      console.error("[PORTFOLIO IMAGE UPLOAD] Error stack:", error.stack);
      res.status(500).json({ 
        error: "Failed to upload image",
        message: error.message || "An unknown error occurred during upload"
      });
    }
  });

  // Public upload endpoint for voucher custom photos (returns URL only; no DB write)
  app.post("/api/vouchers/upload-photo", upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { bucket, endpoint, isConfigured } = getS3Config();
      if (!isConfigured) {
        console.error('❌ S3/B2 credentials or bucket not configured');
        return res.status(503).json({ error: "Storage service not configured. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET." });
      }

      // Optimize uploaded image for voucher use
      const optimizedBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer();

      const key = `vouchers/custom/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
      await getS3Client().send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: optimizedBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000',
      }));

      const url = buildPublicUrl(bucket, endpoint, key);

      res.json({ success: true, url, key });
    } catch (error: any) {
      console.error("Error uploading voucher custom photo:", error);
      res.status(500).json({ 
        error: "Failed to upload custom photo",
        message: error.message 
      });
    }
  });

  // Create Stripe payment intent for voucher purchase
  app.post("/api/vouchers/create-payment-intent", async (req: Request, res: Response) => {
    try {
      const { voucherId, quantity = 1, customerDetails, amount } = req.body;

      if (!voucherId || !customerDetails || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get voucher details
      const voucher = await neonDb.getVoucherProduct(voucherId);
      if (!voucher) {
        return res.status(404).json({ error: "Voucher not found" });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Amount in cents
        currency: 'eur',
        metadata: {
          voucherId,
          quantity: quantity.toString(),
          customerName: `${customerDetails.firstName} ${customerDetails.lastName}`,
          customerEmail: customerDetails.email,
          voucherName: voucher.name
        },
        description: `${quantity}x ${voucher.name} - ${getBizName()}`,
        receipt_email: customerDetails.email,
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        error: "Payment processing error", 
        message: error.message 
      });
    }
  });

  // Stripe webhook for voucher payment confirmations. Signature-VERIFIED so a
  // forged POST cannot create paid voucher records. (Primary fulfillment also
  // runs through the verified /api/stripe/webhook; this endpoint is retained for
  // compatibility.) Uses STRIPE_VOUCHER_WEBHOOK_SECRET if this is a separate
  // Stripe endpoint, else the main STRIPE_WEBHOOK_SECRET.
  app.post("/api/vouchers/stripe-webhook", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string | undefined;
    const webhookSecret = process.env.STRIPE_VOUCHER_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
    let event: any;
    if (!webhookSecret || !webhookSecret.startsWith('whsec_') || !sig) {
      console.error('[VOUCHER WEBHOOK] rejected: missing signature or STRIPE_WEBHOOK_SECRET (whsec_)');
      return res.status(400).json({ error: 'Signature verification unavailable' });
    }
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('[VOUCHER WEBHOOK] signature verification failed:', err?.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Acknowledge immediately, then process the VERIFIED event asynchronously.
    res.status(200).json({ received: true });

    setImmediate(async () => {
      try {
        if (event?.type === 'checkout.session.completed') {
          const session = event.data?.object;
          console.log('[WEBHOOK] checkout.session.completed', session?.id);

          // Extract metadata from the Stripe session
          const metadata = session?.metadata || {};
          const isPaid = session?.payment_status === 'paid';

          if (isPaid) {
            // Abandoned-cart: this session converted, so never send it a reminder.
            try {
              const { markCheckoutConverted } = await import('./services/abandonedCheckout.js');
              void markCheckoutConverted(session.id);
            } catch { /* guarded */ }

            // Extract coupon code from metadata (key is voucher_used)
            const appliedCouponCode = metadata.voucher_used && metadata.voucher_used !== 'none' ? metadata.voucher_used : null;

            // Extract billing address from customer_details
            const customerAddress = session.customer_details?.address || {};
            const billingAddress = customerAddress.line1 || '';
            const billingCity = customerAddress.city || '';
            const billingZip = customerAddress.postal_code || '';
            const billingCountry = customerAddress.country || '';

            // Fetch product validity period from DB for accurate valid_until
            let webhookValidityDays = 1460; // Default to ~4 years (schema default)
            const webhookProductRef = metadata.product_id || metadata.sku || null;
            // Resolve the product reference (which is usually a slug like "family-classic",
            // NOT a uuid) to the actual product UUID so it can be stored in product_id.
            // Previously the raw slug was cast to ::uuid, which threw and left product_id NULL.
            let resolvedProductId: string | null = null;
            if (webhookProductRef && neonDb) {
              try {
                let webhookProduct: any = null;
                if (typeof neonDb.getVoucherProducts === 'function') {
                  const all = await neonDb.getVoucherProducts();
                  const ref = String(webhookProductRef).toLowerCase();
                  webhookProduct = all.find((p: any) => String(p.id).toLowerCase() === ref)
                                || all.find((p: any) => (p.slug || '').toLowerCase() === ref)
                                || all.find((p: any) => (p.name || '').toLowerCase().replace(/\s+/g, '-') === ref);
                }
                if (webhookProduct) {
                  resolvedProductId = webhookProduct.id || null;
                  webhookValidityDays = webhookProduct.validityPeriod ?? webhookProduct.validity_period ?? webhookValidityDays;
                }
              } catch (e) {
                console.warn('[WEBHOOK] Could not resolve product:', e);
              }
            }

            // Create voucher sale record from Stripe session
            // Use camelCase for Drizzle ORM schema, then raw SQL UPDATE for extra columns
            const wVoucherCode = metadata.voucher_code || `VOUCHER-${session.id.substring(0, 12).toUpperCase()}`;
            const voucherSale = {
              purchaserName: metadata.purchaser_name || session.customer_details?.name || 'Unknown',
              purchaserEmail: metadata.purchaser_email || session.customer_email || session.customer_details?.email || '',
              purchaserPhone: session.customer_details?.phone || '',
              recipientName: metadata.recipient_name || '',
              recipientEmail: metadata.recipient_email || '',
              giftMessage: metadata.gift_message || metadata.message || '',
              customImage: metadata.custom_image || null,
              designImage: metadata.design_image || null,
              personalizationData: metadata.voucher_data ? (() => { try { return JSON.parse(metadata.voucher_data); } catch { return {}; } })() : {},
              voucherCode: wVoucherCode,
              originalAmount: session.amount_total ? (session.amount_total / 100).toString() : '0',
              discountAmount: metadata.discount_cents ? (parseFloat(metadata.discount_cents) / 100).toString() : metadata.discount_amount || '0',
              finalAmount: session.amount_total ? (session.amount_total / 100).toString() : '0',
              currency: session.currency?.toUpperCase() || 'EUR',
              couponCode: appliedCouponCode,
              paymentIntentId: session.payment_intent,
              paymentStatus: 'paid',
              paymentMethod: metadata.payment_method || 'stripe_card',
              isRedeemed: false,
              validFrom: new Date(),
              validUntil: metadata.valid_until ? new Date(metadata.valid_until) : new Date(Date.now() + webhookValidityDays * 24 * 60 * 60 * 1000)
            };

            try {
              const createdSale = await storage.createVoucherSale(voucherSale as any);
              console.log('[WEBHOOK] ✅ Voucher sale created:', createdSale.id, 'Code:', wVoucherCode,
                'customImage:', metadata.custom_image || '(none)',
                'designImage:', metadata.design_image || '(none)');

              // Populate extra DB columns not in Drizzle schema (added via raw SQL migrations)
              try {
                await runSql(
                  `UPDATE voucher_sales SET stripe_session_id = $1, stripe_payment_intent_id = $2, product_id = $3::uuid,
                   billing_address = $4, billing_city = $5, billing_zip = $6, billing_country = $7,
                   campaign_id = NULLIF($8, '')
                   WHERE id = $9`,
                  [session.id, session.payment_intent, resolvedProductId,
                   billingAddress, billingCity, billingZip, billingCountry,
                   String(metadata.campaign_id || ''), createdSale.id]
                );
              } catch (extraErr) {
                console.warn('[WEBHOOK] Could not update extra columns:', (extraErr as any)?.message);
              }

              // Try to get card details from payment intent
              if (session.payment_intent) {
                try {
                  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
                  if (stripeSecretKey) {
                    const StripeLib = (await import('stripe')).default;
                    const stripe = new StripeLib(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
                    const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent, {
                      expand: ['payment_method']
                    });
                    const pm = paymentIntent.payment_method;
                    if (pm && typeof pm === 'object' && 'card' in pm) {
                      const card = (pm as any).card;
                      if (card) {
                        await runSql(`UPDATE voucher_sales SET card_brand = $1, card_last4 = $2 WHERE id = $3`,
                          [card.brand || '', card.last4 || '', createdSale.id]);
                        console.log('[WEBHOOK] ✅ Card details saved:', card.brand, '****' + card.last4);
                      }
                    }
                  }
                } catch (cardErr: any) {
                  console.log('[WEBHOOK] Could not fetch card details:', cardErr.message);
                }
              }

              // After creating the sale and saving card details, attempt to generate and persist
              // the personalized voucher PDF so admins can download the exact voucher later.
              try {
                const internalBase = process.env.SITE_URL || process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 3001}`;
                const pdfUrlPath = `/voucher/pdf?session_id=${encodeURIComponent(session.id)}`;
                const pdfResp = await fetch(`${internalBase}${pdfUrlPath}`);
                if (pdfResp && pdfResp.ok) {
                  const pdfBuf = Buffer.from(await pdfResp.arrayBuffer());
                  try {
                    // Persist to durable S3/B2 storage (NOT ephemeral dyno disk). The previous
                    // savePublicAsset() path wrote to local disk and returned localhost URLs, so
                    // on Heroku the file vanished on every restart and the URL was unreachable.
                    const { bucket, endpoint, isConfigured } = getS3Config();
                    if (!isConfigured) {
                      console.warn('[WEBHOOK] S3 not configured; skipping voucher PDF persistence');
                    } else {
                      const pdfKey = `vouchers/pdf/${createdSale.id}.pdf`;
                      await getS3Client().send(new PutObjectCommand({
                        Bucket: bucket,
                        Key: pdfKey,
                        Body: pdfBuf,
                        ContentType: 'application/pdf',
                        CacheControl: 'public, max-age=31536000',
                      }));
                      const publicUrl = buildPublicUrl(bucket, endpoint, pdfKey);
                      // Persist via guarded raw SQL (not Drizzle) so this never depends on a
                      // schema column that may not be migrated yet — keeps voucher reads working.
                      try {
                        await runSql(`UPDATE voucher_sales SET pdf_url = $1 WHERE id = $2`, [publicUrl, createdSale.id]);
                        console.log('[WEBHOOK] ✅ Saved voucher PDF to S3 and updated sale.pdf_url:', publicUrl);
                      } catch (upErr) {
                        console.warn('[WEBHOOK] Saved PDF to S3 but could not set pdf_url (column may not exist yet):', upErr);
                      }
                    }
                  } catch (saveErr) {
                    console.warn('[WEBHOOK] Could not save voucher PDF to S3:', saveErr);
                  }
                } else {
                  console.warn('[WEBHOOK] Failed to fetch generated PDF for saving; status=', pdfResp?.status);
                }
              } catch (pdfErr) {
                console.warn('[WEBHOOK] Error generating/saving voucher PDF:', pdfErr);
              }

            } catch (saleError: any) {
              console.error('[WEBHOOK] ⚠️ Failed to create voucher sale:', saleError.message);
            }
          }
        } else {
          console.log('[WEBHOOK] Unhandled event type:', event?.type);
        }
      } catch (error: any) {
        console.error('[WEBHOOK] Error processing webhook async:', error);
      }
    });
  });

  // DEMO ENDPOINT: Create a voucher purchase directly (for testing without Stripe)
  app.post("/api/test/create-demo-voucher-purchase", async (req: Request, res: Response) => {
    try {
      console.log('\n🧪 DEMO: Creating voucher purchase directly in database...');
      
      const { purchaserEmail, purchaserName, recipientEmail, recipientName, giftMessage, amount, productId, customImage, designImage } = req.body;
      
      // Generate unique voucher code
      const voucherCode = `DEMO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      // Calculate validity (1 year from now)
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);
      
      // Create voucher sale record
      const voucherSale = {
        product_id: productId || null,
        purchaser_name: purchaserName,
        purchaser_email: purchaserEmail,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        gift_message: giftMessage,
        custom_image: customImage || null,
        design_image: designImage || null,
        voucher_code: voucherCode,
        original_amount: amount.toString(),
        discount_amount: '0',
        final_amount: amount.toString(),
        currency: 'EUR',
        payment_intent_id: `demo_intent_${Date.now()}`,
        payment_status: 'paid',
        payment_method: 'demo',
        is_redeemed: false,
        valid_from: new Date(),
        valid_until: validUntil
      };
      
      console.log('💾 Saving demo voucher to database...');
      const savedSale = await neonDb.createVoucherSale(voucherSale);
      console.log('✅ Demo voucher saved with code:', voucherCode);
      
      // Return the voucher details
      res.json({
        success: true,
        message: 'Demo voucher purchase created successfully',
        voucherCode: voucherCode,
        saleId: savedSale.id,
        recipientName: recipientName,
        amount: amount,
        customImage: customImage,
        designImage: designImage,
        giftMessage: giftMessage,
        downloadUrl: `/voucher/pdf/preview?sku=demo&name=${encodeURIComponent(recipientName)}&from=${encodeURIComponent(purchaserName)}&message=${encodeURIComponent(giftMessage)}&amount=${amount}`,
        adminUrl: '/admin/voucher-sales'
      });
      
    } catch (error: any) {
      console.error('❌ Demo voucher creation failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // TEST ENDPOINT: Simulate a successful voucher purchase (for testing without Stripe)
  app.post("/api/test/voucher-purchase", async (req: Request, res: Response) => {
    try {
      console.log('\n🧪 TEST: Simulating voucher purchase...');
      
      const testData = req.body || {};
      
      // Create a mock checkout session
      const mockSession = {
        id: `test_session_${Date.now()}`,
        customer_email: testData.email || 'test@example.com',
        customer_details: {
          name: testData.purchaserName || 'Test Customer'
        },
        amount_total: (testData.amount || 19900), // cents
        payment_intent: `test_pi_${Date.now()}`,
        payment_method_types: ['card'],
        metadata: {
          product_id: testData.productId || null,
          voucher_data: JSON.stringify({
            recipientName: testData.recipientName || 'Test Recipient',
            recipientEmail: testData.recipientEmail || 'recipient@example.com',
            message: testData.message || 'Happy Birthday! This is a test voucher.',
            senderName: testData.purchaserName || 'Test Customer',
            selectedDesign: { occasion: 'birthday' },
            deliveryOption: { id: 'pdf', name: 'PDF Download', price: 0 }
          })
        }
      };

      // Simulate webhook event
      const webhookEvent = {
        type: 'checkout.session.completed',
        data: {
          object: mockSession
        }
      };

      // Extract voucher data
      const voucherData = JSON.parse(mockSession.metadata.voucher_data);
      const voucherCode = generateVoucherCode();
      
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);

      // Create voucher sale
      const voucherSale = {
        product_id: mockSession.metadata.product_id,
        purchaser_name: mockSession.customer_details.name,
        purchaser_email: mockSession.customer_email,
        purchaser_phone: null,
        recipient_name: voucherData.recipientName,
        recipient_email: voucherData.recipientEmail,
        gift_message: voucherData.message,
        voucher_code: voucherCode,
        original_amount: (mockSession.amount_total / 100).toString(),
        discount_amount: '0',
        final_amount: (mockSession.amount_total / 100).toString(),
        currency: 'EUR',
        payment_intent_id: mockSession.payment_intent,
        payment_status: 'paid',
        payment_method: 'test_card',
        is_redeemed: false,
        redeemed_at: null,
        redeemed_by: null,
        session_id: null,
        valid_from: new Date(),
        valid_until: validUntil
      };

      console.log('💾 Creating test voucher sale:', voucherCode);
      const savedSale = await neonDb.createVoucherSale(voucherSale);
      
      console.log('✅ Test voucher sale created!');
      console.log('   ID:', savedSale.id);
      console.log('   Code:', voucherCode);
      console.log('   Amount:', savedSale.final_amount, 'EUR');
      console.log('   Purchaser:', savedSale.purchaser_email);
      console.log('   Recipient:', savedSale.recipient_email);

      res.json({
        success: true,
        message: 'Test voucher purchase created successfully',
        voucher: {
          id: savedSale.id,
          code: voucherCode,
          amount: savedSale.final_amount,
          purchaser: savedSale.purchaser_email,
          recipient: savedSale.recipient_email,
          validUntil: validUntil.toISOString(),
          sessionId: mockSession.id
        },
        adminUrl: `/admin/voucher-sales`,
        downloadUrl: `/voucher/pdf/preview?sku=Family-Basic&name=${encodeURIComponent(voucherData.recipientName)}&from=${encodeURIComponent(voucherData.senderName)}&message=${encodeURIComponent(voucherData.message)}&amount=${mockSession.amount_total / 100}`
      });
    } catch (error: any) {
      console.error('❌ Test purchase error:', error);
      res.status(500).json({ 
        error: 'Test purchase failed', 
        message: error.message,
        stack: error.stack
      });
    }
  });

  // Admin endpoint for voucher products
  app.get("/api/admin/vouchers/products/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const product = await neonDb.getVoucherProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Voucher product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching voucher product:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST AI-draft a high-converting voucher product from a short brief.
  // Returns ONLY field suggestions — nothing is saved until the admin reviews
  // the draft and submits the create form.
  app.post("/api/vouchers/products/ai-generate", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { brief = '', targetPrice = '', language = 'de' } = req.body || {};
      if (!String(brief).trim()) return res.status(400).json({ error: 'brief is required' });

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });

      const lang = language === 'en' ? 'English' : 'German';
      const city = process.env.BUSINESS_CITY || 'Wien';
      const studio = process.env.BUSINESS_NAME || 'New Age Fotografie';

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_LANDING_MODEL || process.env.OPENAI_PRICE_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a conversion copywriter for ${studio}, a photography studio in ${city}. Draft a HIGH-CONVERTING photography gift-voucher product. Write in ${lang}. Be specific and benefit-led (what the customer FEELS and receives), never generic filler. Prices are in EUR.
Return ONLY a valid JSON object with EXACTLY these keys:
{
  "name": "short punchy product name (max 60 chars)",
  "description": "1-2 sentence hook shown on the product card",
  "detailedDescription": "3-5 short benefit-led sentences for the product page",
  "price": "selling price as a plain number string, e.g. \\"225\\"",
  "originalPrice": "a credible higher anchor price as a plain number string, or \\"\\" if not sensible",
  "category": "one of: family, newborn, maternity, wedding, business, portrait, event",
  "sessionType": "e.g. Familienshooting",
  "sessionDuration": "minutes as a plain number string, e.g. \\"60\\"",
  "validityPeriod": "days valid as a plain number string, e.g. \\"365\\"",
  "badge": "very short urgency/value badge, e.g. \\"Bestseller\\" or \\"\\"",
  "redemptionInstructions": "2-3 short sentences on how to redeem",
  "termsAndConditions": "3-4 short, fair terms as one string separated by newlines",
  "metaTitle": "SEO title max 60 chars incl. the city",
  "metaDescription": "SEO description max 155 chars"
}`,
          },
          {
            role: 'user',
            content: `Brief: ${brief}\n${targetPrice ? `Target selling price (EUR): ${targetPrice}` : 'Choose a sensible price for this market.'}\nStudio: ${studio}, ${city}.`,
          },
        ],
        temperature: 0.85,
        max_tokens: 1100,
        response_format: { type: 'json_object' },
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      let draft: any;
      try { draft = JSON.parse(raw); } catch { return res.status(500).json({ error: 'AI returned invalid JSON' }); }

      // Coerce every field to a string so the form (which is string-based) can
      // consume it directly without type surprises.
      const s = (v: unknown) => (v == null ? '' : String(v)).trim();
      res.json({
        draft: {
          name: s(draft.name),
          description: s(draft.description),
          detailedDescription: s(draft.detailedDescription),
          price: s(draft.price).replace(/[^\d.]/g, ''),
          originalPrice: s(draft.originalPrice).replace(/[^\d.]/g, ''),
          category: s(draft.category),
          sessionType: s(draft.sessionType),
          sessionDuration: s(draft.sessionDuration).replace(/[^\d]/g, ''),
          validityPeriod: s(draft.validityPeriod).replace(/[^\d]/g, '') || '365',
          badge: s(draft.badge),
          redemptionInstructions: s(draft.redemptionInstructions),
          termsAndConditions: s(draft.termsAndConditions),
          metaTitle: s(draft.metaTitle),
          metaDescription: s(draft.metaDescription),
        },
      });
    } catch (error: any) {
      console.error('[VOUCHER] AI generate failed:', error?.message || error);
      res.status(500).json({ error: 'Failed to generate a voucher draft. Check the OpenAI key is set.' });
    }
  });

  app.post("/api/vouchers/products", async (req: Request, res: Response) => {
    try {
      console.log('[VOUCHER] Creating product with raw body:', req.body);
      // Accept both camelCase and snake_case incoming fields
      const normalized: any = { ...req.body };
      if (normalized.detailedDescription && !normalized.detailed_description) normalized.detailed_description = normalized.detailedDescription;
      if (normalized.originalPrice && !normalized.original_price) normalized.original_price = normalized.originalPrice;
      if (normalized.sessionDuration && !normalized.session_duration) normalized.session_duration = normalized.sessionDuration;
      if (normalized.sessionType && !normalized.session_type) normalized.session_type = normalized.sessionType;
      if (normalized.validityPeriod && !normalized.validity_period) normalized.validity_period = normalized.validityPeriod;
      if (normalized.redemptionInstructions && !normalized.redemption_instructions) normalized.redemption_instructions = normalized.redemptionInstructions;
      if (normalized.termsAndConditions && !normalized.terms_and_conditions) normalized.terms_and_conditions = normalized.termsAndConditions;
      if (normalized.imageUrl && !normalized.image_url) normalized.image_url = normalized.imageUrl;
      if (normalized.thumbnailUrl && !normalized.thumbnail_url) normalized.thumbnail_url = normalized.thumbnailUrl;
      if (normalized.promoImageUrl && !normalized.promo_image_url) normalized.promo_image_url = normalized.promoImageUrl;
      if (normalized.displayOrder && !normalized.display_order) normalized.display_order = normalized.displayOrder;
      if (normalized.isActive !== undefined && !normalized.is_active) normalized.is_active = normalized.isActive;
      if (normalized.maxPerCustomer && !normalized.max_per_customer) normalized.max_per_customer = normalized.maxPerCustomer;
      if (normalized.metaTitle && !normalized.meta_title) normalized.meta_title = normalized.metaTitle;
      if (normalized.metaDescription && !normalized.meta_description) normalized.meta_description = normalized.metaDescription;

      // Generate slug if missing
      const slugify = (text: string) => {
        return text
          .toString()
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '') // remove diacritics
          .toLowerCase()
          .replace(/ß/g, 'ss')
          .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .replace(/--+/g, '-');
      };
      if (!normalized.slug && normalized.name) {
        const base = slugify(normalized.name);
        let candidate = base;
        try {
          const existingProducts = await neonDb.getVoucherProducts();
          let i = 1;
          while (existingProducts.find((p: any) => p.slug === candidate)) {
            candidate = `${base}-${i++}`;
          }
        } catch (e) {
          console.warn('[VOUCHER] Could not check existing slugs:', e);
        }
        normalized.slug = candidate;
      }

      console.log('[VOUCHER] Normalized for validation (with slug):', normalized);
      const validatedData = insertVoucherProductSchema.parse(normalized);
      console.log('[VOUCHER] Validated data:', validatedData);
      const product = await neonDb.createVoucherProduct(validatedData);
      console.log('[VOUCHER] Product created:', product);
      // Respond in camelCase for frontend (Drizzle already returns camelCase properties)
      res.status(201).json({
        id: product.id,
        name: product.name,
        description: product.description,
        detailedDescription: product.detailedDescription,
        price: product.price,
        originalPrice: product.originalPrice,
        category: product.category,
        sessionDuration: product.sessionDuration,
        sessionType: product.sessionType,
        validityPeriod: product.validityPeriod,
        redemptionInstructions: product.redemptionInstructions,
        termsAndConditions: product.termsAndConditions,
        imageUrl: product.imageUrl,
        thumbnailUrl: product.thumbnailUrl,
        promoImageUrl: product.promoImageUrl,
        displayOrder: product.displayOrder,
        featured: product.featured,
        badge: product.badge,
        isActive: product.isActive,
        stockLimit: product.stockLimit,
        maxPerCustomer: product.maxPerCustomer,
        slug: product.slug,
        metaTitle: product.metaTitle,
        metaDescription: product.metaDescription,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[VOUCHER] Validation error:', error.errors);
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error('[VOUCHER] Error creating voucher product:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as any).message });
    }
  });

  // Public single voucher product fetch by id or slug
  app.get('/api/vouchers/products/:idOrSlug', async (req: Request, res: Response) => {
    try {
      const idOrSlug = req.params.idOrSlug;
      let product: any = null;
      // Try direct ID lookup first
      try { product = await neonDb.getVoucherProduct(idOrSlug); } catch (_) { /* ignore */ }
      if (!product) {
        // Fallback: iterate over all and match slug
        const all = await neonDb.getVoucherProducts();
        product = all.find((p: any) => p.slug === idOrSlug);
      }
      if (!product) {
        return res.status(404).json({ error: 'Voucher product not found' });
      }
      // Helper to properly encode URLs with spaces in path segments
      const encodeImageUrl = (url: string | null | undefined): string | null => {
        if (!url) return null;
        try {
          const urlObj = new URL(url);
          // Encode each path segment individually to handle spaces
          urlObj.pathname = urlObj.pathname.split('/').map(seg => encodeURIComponent(decodeURIComponent(seg))).join('/');
          return urlObj.toString();
        } catch {
          return url;
        }
      };
      const p = product as any;
      return res.json({
        id: p.id,
        name: p.name,
        description: p.description,
        detailedDescription: p.detailedDescription ?? p.detailed_description,
        price: p.price,
        originalPrice: p.originalPrice ?? p.original_price,
        category: p.category,
        sessionDuration: p.sessionDuration ?? p.session_duration,
        sessionType: p.sessionType ?? p.session_type,
        validityPeriod: p.validityPeriod ?? p.validity_period,
        redemptionInstructions: p.redemptionInstructions ?? p.redemption_instructions,
        termsAndConditions: p.termsAndConditions ?? p.terms_and_conditions,
        imageUrl: encodeImageUrl(p.imageUrl ?? p.image_url),
        thumbnailUrl: encodeImageUrl(p.thumbnailUrl ?? p.thumbnail_url),
        promoImageUrl: encodeImageUrl(p.promoImageUrl ?? p.promo_image_url),
        displayOrder: p.displayOrder ?? p.display_order,
        featured: p.featured,
        badge: p.badge,
        isActive: p.isActive ?? p.is_active,
        stockLimit: p.stockLimit ?? p.stock_limit,
        maxPerCustomer: p.maxPerCustomer ?? p.max_per_customer,
        slug: p.slug,
        metaTitle: p.metaTitle ?? p.meta_title,
        metaDescription: p.metaDescription ?? p.meta_description,
        createdAt: p.createdAt ?? p.created_at,
        updatedAt: p.updatedAt ?? p.updated_at,
      });
    } catch (err) {
      console.error('[VOUCHER] Error fetching single product:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.put("/api/vouchers/products/:id", async (req: Request, res: Response) => {
    try {
      console.log('[VOUCHER UPDATE] Updating product:', req.params.id, 'with data:', req.body);
      let existing: any = null;
      try { existing = await neonDb.getVoucherProduct(req.params.id); } catch (e) { console.warn('[VOUCHER UPDATE] Fetch existing failed:', e); }
      const updates: any = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.description !== undefined) updates.description = req.body.description;
      if (req.body.detailedDescription !== undefined) updates.detailedDescription = req.body.detailedDescription;
      if (req.body.price !== undefined) updates.price = req.body.price;
      if (req.body.originalPrice !== undefined) updates.originalPrice = req.body.originalPrice;
      if (req.body.category !== undefined) updates.category = req.body.category;
      if (req.body.sessionDuration !== undefined) updates.sessionDuration = req.body.sessionDuration;
      if (req.body.sessionType !== undefined) updates.sessionType = req.body.sessionType;
      if (req.body.validityPeriod !== undefined) updates.validityPeriod = req.body.validityPeriod;
      if (req.body.redemptionInstructions !== undefined) updates.redemptionInstructions = req.body.redemptionInstructions;
      if (req.body.termsAndConditions !== undefined) updates.termsAndConditions = req.body.termsAndConditions;
      if (req.body.imageUrl !== undefined) updates.imageUrl = req.body.imageUrl;
      if (req.body.thumbnailUrl !== undefined) updates.thumbnailUrl = req.body.thumbnailUrl;
      if (req.body.promoImageUrl !== undefined) updates.promoImageUrl = req.body.promoImageUrl;
      if (req.body.displayOrder !== undefined) updates.displayOrder = req.body.displayOrder;
      if (req.body.featured !== undefined) updates.featured = req.body.featured;
      if (req.body.badge !== undefined) updates.badge = req.body.badge;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
      if (req.body.stockLimit !== undefined) updates.stockLimit = req.body.stockLimit;
      if (req.body.maxPerCustomer !== undefined) updates.maxPerCustomer = req.body.maxPerCustomer;
      const slugify = (text: string) => text.toString().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ß/g,'ss').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/--+/g,'-');
      if (req.body.slug !== undefined && req.body.slug !== '') {
        updates.slug = req.body.slug;
      } else if (req.body.name && existing && req.body.name !== existing.name) {
        const base = slugify(req.body.name); let candidate = base; let i = 1;
        try { const all = await neonDb.getVoucherProducts(); while (all.find((p:any)=>p.slug===candidate && p.id!==existing.id)) candidate = `${base}-${i++}`; } catch (e) { console.warn('[VOUCHER UPDATE] Slug uniqueness check failed:', e); }
        updates.slug = candidate;
      }
      if (req.body.metaTitle !== undefined) updates.metaTitle = req.body.metaTitle;
      if (req.body.metaDescription !== undefined) updates.metaDescription = req.body.metaDescription;
      console.log('[VOUCHER UPDATE] Updates object:', updates);
      const product = await neonDb.updateVoucherProduct(req.params.id, updates);
      const bucketName = getS3Config().bucket;
      const parseKey = (urlStr: string): string | null => { if (!urlStr) return null; try { const u = new URL(urlStr); let p = u.pathname.replace(/^\//,''); const b = getS3Config().bucket; if (p.startsWith(b + '/')) p = p.slice(b.length+1); return p||null; } catch { return null; } };
      if (existing && bucketName) {
        const newImageUrl = req.body.imageUrl; const newThumbUrl = req.body.thumbnailUrl;
        if (existing.imageUrl && newImageUrl && existing.imageUrl !== newImageUrl) {
          const oldKey = parseKey(existing.imageUrl); if (oldKey) { try { await getS3Client().send(new DeleteObjectCommand({ Bucket: bucketName, Key: oldKey })); console.log('[VOUCHER UPDATE] Deleted old image object:', oldKey); } catch (e) { console.warn('[VOUCHER UPDATE] Failed to delete old image object:', oldKey, e); } }
        }
        if (existing.thumbnailUrl && newThumbUrl && existing.thumbnailUrl !== newThumbUrl) {
          const oldThumbKey = parseKey(existing.thumbnailUrl); if (oldThumbKey) { try { await getS3Client().send(new DeleteObjectCommand({ Bucket: bucketName, Key: oldThumbKey })); console.log('[VOUCHER UPDATE] Deleted old thumbnail object:', oldThumbKey); } catch (e) { console.warn('[VOUCHER UPDATE] Failed to delete old thumbnail object:', oldThumbKey, e); } }
        }
      }
      const response = {
        id: product.id,
        name: product.name,
        description: product.description,
        detailedDescription: product.detailedDescription,
        price: product.price,
        originalPrice: product.originalPrice,
        category: product.category,
        sessionDuration: product.sessionDuration,
        sessionType: product.sessionType,
        validityPeriod: product.validityPeriod,
        redemptionInstructions: product.redemptionInstructions,
        termsAndConditions: product.termsAndConditions,
        imageUrl: product.imageUrl,
        thumbnailUrl: product.thumbnailUrl,
        promoImageUrl: product.promoImageUrl,
        displayOrder: product.displayOrder,
        featured: product.featured,
        badge: product.badge,
        isActive: product.isActive,
        stockLimit: product.stockLimit,
        maxPerCustomer: product.maxPerCustomer,
        slug: product.slug,
        metaTitle: product.metaTitle,
        metaDescription: product.metaDescription,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
      console.log('[VOUCHER UPDATE] Success:', response);
      res.json(response);
    } catch (error) {
      console.error('[VOUCHER UPDATE] Error updating voucher product:', error);
      res.status(500).json({ error: 'Internal server error', message: (error as any).message });
    }
  });

  app.delete("/api/vouchers/products/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      console.log('[VOUCHER DELETE] Request to delete product:', id);
      // Check references to avoid FK constraint failures
      try {
        const ref = await runSql('SELECT COUNT(1)::int AS c FROM voucher_sales WHERE product_id = $1', [id]);
        if (ref?.[0]?.c > 0) {
          return res.status(409).json({ success: false, error: 'Product has sales and cannot be deleted', references: ref[0].c });
        }
      } catch (e) {
        console.warn('[VOUCHER DELETE] Reference check failed (continuing):', e);
      }

      const existing = await neonDb.getVoucherProduct(id);
      const bucketName = getS3Config().bucket;
      const parseKey = (urlStr: string): string | null => { if (!urlStr) return null; try { const u = new URL(urlStr); let p = u.pathname.replace(/^\//,''); const b = getS3Config().bucket; if (p.startsWith(b + '/')) p = p.slice(b.length+1); return p||null; } catch { return null; } };
      if (existing && bucketName) {
        const imgUrl = (existing.imageUrl ?? existing.image_url) as string | undefined;
        const thumbUrl = (existing.thumbnailUrl ?? existing.thumbnail_url) as string | undefined;
        for (const url of [imgUrl, thumbUrl]) {
          const key = url ? parseKey(url) : null;
          if (key) {
            try { await getS3Client().send(new DeleteObjectCommand({ Bucket: bucketName, Key: key })); console.log('[VOUCHER DELETE] Deleted object:', key); } catch (e) { console.warn('[VOUCHER DELETE] Failed to delete object:', key, e); }
          }
        }
      }
      await neonDb.deleteVoucherProduct(id);
      console.log('[VOUCHER DELETE] Deleted product row:', id);
      res.json({ success: true, id });
    } catch (error: any) {
      const code = error?.code || error?.detail || '';
      console.error('Error deleting voucher product:', error);
      if (String(code).includes('foreign key') || error?.code === '23503') {
        return res.status(409).json({ success: false, error: 'Product cannot be deleted due to existing references' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ==================== VOUCHER TEMPLATES ====================

  // Public: get active templates (ordered by display_order)
  app.get("/api/vouchers/templates", async (req: Request, res: Response) => {
    try {
      const templates = await neonDb.getVoucherTemplates(true); // active only
      const mapped = templates.map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        image: t.image_url || t.imageUrl,
        occasion: t.occasion,
        isActive: t.is_active ?? t.isActive,
        displayOrder: t.display_order ?? t.displayOrder,
        bannerColor: t.banner_color || t.bannerColor || '#b3202e',
        bannerTextColor: t.banner_text_color || t.bannerTextColor || '#ffffff',
        fontFamily: t.font_family || t.fontFamily || 'Helvetica',
        messageFontSize: t.message_font_size ?? t.messageFontSize ?? 22,
      }));
      res.json(mapped);
    } catch (error) {
      console.error("Error fetching voucher templates:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: get all templates (including inactive)
  app.get("/api/admin/vouchers/templates", authenticateUser, async (req: Request, res: Response) => {
    try {
      const templates = await neonDb.getVoucherTemplates(false); // all
      const mapped = templates.map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        imageUrl: t.image_url || t.imageUrl,
        occasion: t.occasion,
        isActive: t.is_active ?? t.isActive,
        displayOrder: t.display_order ?? t.displayOrder,
        bannerColor: t.banner_color || t.bannerColor || '#b3202e',
        bannerTextColor: t.banner_text_color || t.bannerTextColor || '#ffffff',
        fontFamily: t.font_family || t.fontFamily || 'Helvetica',
        messageFontSize: t.message_font_size ?? t.messageFontSize ?? 22,
        logoUrl: t.logo_url || t.logoUrl || null,
        footerText: t.footer_text || t.footerText || null,
        footerEmail: t.footer_email || t.footerEmail || null,
        footerPhone: t.footer_phone || t.footerPhone || null,
        termsText: t.terms_text || t.termsText || null,
        layoutStyle: t.layout_style || t.layoutStyle || 'classic',
        createdAt: t.created_at || t.createdAt,
        updatedAt: t.updated_at || t.updatedAt,
      }));
      res.json(mapped);
    } catch (error) {
      console.error("Error fetching admin voucher templates:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: create template
  app.post("/api/admin/vouchers/templates", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { name, category, imageUrl, occasion, isActive, displayOrder,
              bannerColor, bannerTextColor, fontFamily, messageFontSize,
              logoUrl, footerText, footerEmail, footerPhone, termsText, layoutStyle } = req.body;
      if (!name || !category || !imageUrl || !occasion) {
        return res.status(400).json({ error: "name, category, imageUrl, and occasion are required" });
      }
      const template = await neonDb.createVoucherTemplate({
        name, category, imageUrl, occasion,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder !== undefined ? displayOrder : 0,
        bannerColor, bannerTextColor, fontFamily, messageFontSize,
        logoUrl, footerText, footerEmail, footerPhone, termsText, layoutStyle,
      });
      res.json({
        id: template.id,
        name: template.name,
        category: template.category,
        imageUrl: template.image_url || template.imageUrl,
        occasion: template.occasion,
        isActive: template.is_active ?? template.isActive,
        displayOrder: template.display_order ?? template.displayOrder,
        bannerColor: template.banner_color || '#b3202e',
        bannerTextColor: template.banner_text_color || '#ffffff',
        fontFamily: template.font_family || 'Helvetica',
        messageFontSize: template.message_font_size ?? 22,
        logoUrl: template.logo_url || null,
        footerText: template.footer_text || null,
        footerEmail: template.footer_email || null,
        footerPhone: template.footer_phone || null,
        termsText: template.terms_text || null,
        layoutStyle: template.layout_style || 'classic',
        createdAt: template.created_at || template.createdAt,
        updatedAt: template.updated_at || template.updatedAt,
      });
    } catch (error) {
      console.error("Error creating voucher template:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: update template
  app.put("/api/admin/vouchers/templates/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await neonDb.getVoucherTemplate(id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }
      const updates: any = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.category !== undefined) updates.category = req.body.category;
      if (req.body.imageUrl !== undefined) updates.imageUrl = req.body.imageUrl;
      if (req.body.occasion !== undefined) updates.occasion = req.body.occasion;
      if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
      if (req.body.displayOrder !== undefined) updates.displayOrder = req.body.displayOrder;
      if (req.body.bannerColor !== undefined) updates.bannerColor = req.body.bannerColor;
      if (req.body.bannerTextColor !== undefined) updates.bannerTextColor = req.body.bannerTextColor;
      if (req.body.fontFamily !== undefined) updates.fontFamily = req.body.fontFamily;
      if (req.body.messageFontSize !== undefined) updates.messageFontSize = req.body.messageFontSize;
      if (req.body.logoUrl !== undefined) updates.logoUrl = req.body.logoUrl;
      if (req.body.footerText !== undefined) updates.footerText = req.body.footerText;
      if (req.body.footerEmail !== undefined) updates.footerEmail = req.body.footerEmail;
      if (req.body.footerPhone !== undefined) updates.footerPhone = req.body.footerPhone;
      if (req.body.termsText !== undefined) updates.termsText = req.body.termsText;
      if (req.body.layoutStyle !== undefined) updates.layoutStyle = req.body.layoutStyle;

      const template = await neonDb.updateVoucherTemplate(id, updates);
      res.json({
        id: template.id,
        name: template.name,
        category: template.category,
        imageUrl: template.image_url || template.imageUrl,
        occasion: template.occasion,
        isActive: template.is_active ?? template.isActive,
        displayOrder: template.display_order ?? template.displayOrder,
        bannerColor: template.banner_color || '#b3202e',
        bannerTextColor: template.banner_text_color || '#ffffff',
        fontFamily: template.font_family || 'Helvetica',
        messageFontSize: template.message_font_size ?? 22,
        logoUrl: template.logo_url || null,
        footerText: template.footer_text || null,
        footerEmail: template.footer_email || null,
        footerPhone: template.footer_phone || null,
        termsText: template.terms_text || null,
        layoutStyle: template.layout_style || 'classic',
        createdAt: template.created_at || template.createdAt,
        updatedAt: template.updated_at || template.updatedAt,
      });
    } catch (error) {
      console.error("Error updating voucher template:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: delete template
  app.delete("/api/admin/vouchers/templates/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = await neonDb.getVoucherTemplate(id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }
      await neonDb.deleteVoucherTemplate(id);
      res.json({ success: true, id });
    } catch (error) {
      console.error("Error deleting voucher template:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin: upload template image to B2
  app.post("/api/admin/vouchers/templates/upload-image", authenticateUser, upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const { bucket, endpoint, isConfigured } = getS3Config();
      if (!isConfigured) {
        return res.status(503).json({ error: "Storage service not configured" });
      }
      const optimizedBuffer = await sharp(req.file.buffer)
        .rotate()
        .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer();

      const key = `vouchers/templates/${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
      await getS3Client().send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: optimizedBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000',
      }));

      const url = buildPublicUrl(bucket, endpoint, key);
      res.json({ success: true, url, key });
    } catch (error: any) {
      console.error("Error uploading template image:", error);
      res.status(500).json({ error: "Failed to upload template image", message: error.message });
    }
  });

  // ====== FIX VOUCHER PRODUCT IMAGE URLS (encode spaces) ======
  app.post("/api/admin/vouchers/fix-image-urls", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log('[FIX URLS] Starting URL fix for voucher products...');
      const products = await neonDb.getVoucherProducts();
      let fixed = 0;
      let skipped = 0;
      const details: any[] = [];
      
      for (const product of products) {
        const oldImageUrl = product.imageUrl as string | null;
        const oldThumbnailUrl = product.thumbnailUrl as string | null;
        
        // Helper to fix URL encoding - replace all spaces with %20
        const fixUrl = (url: string | null): string | null => {
          if (!url) return null;
          // Simple and reliable: just replace spaces with %20
          if (url.includes(' ')) {
            const fixed = url.replace(/ /g, '%20');
            console.log('[FIX URLS] Encoding space in URL:', url, '->', fixed);
            return fixed;
          }
          return url;
        };
        
        const newImageUrl = fixUrl(oldImageUrl);
        const newThumbnailUrl = fixUrl(oldThumbnailUrl);
        
        if (newImageUrl !== oldImageUrl || newThumbnailUrl !== oldThumbnailUrl) {
          // Use direct SQL to ensure %20 is preserved (Drizzle might decode it)
          const setClauses: string[] = [];
          const params: any[] = [];
          let paramIdx = 1;
          
          if (newImageUrl !== oldImageUrl && newImageUrl) {
            setClauses.push(`image_url = $${paramIdx++}`);
            params.push(newImageUrl);
          }
          if (newThumbnailUrl !== oldThumbnailUrl && newThumbnailUrl) {
            setClauses.push(`thumbnail_url = $${paramIdx++}`);
            params.push(newThumbnailUrl);
          }
          setClauses.push(`updated_at = NOW()`);
          params.push(product.id);
          
          const sql = `UPDATE voucher_products SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`;
          console.log('[FIX URLS] Executing SQL:', sql, 'with params:', params);
          await runSql(sql, params);
          
          fixed++;
          details.push({
            id: product.id,
            name: product.name,
            oldImageUrl,
            newImageUrl,
            oldThumbnailUrl,
            newThumbnailUrl,
          });
          console.log(`[FIX URLS] Fixed: ${product.name}`);
        } else {
          skipped++;
        }
      }
      
      console.log(`[FIX URLS] Done. Fixed: ${fixed}, Skipped: ${skipped}`);
      res.json({ success: true, fixed, skipped, details });
    } catch (error) {
      console.error('[FIX URLS] Error:', error);
      res.status(500).json({ error: 'Failed to fix URLs', message: (error as any).message });
    }
  });

  // ====== COUPON ADMIN ROUTES (continuation) ======

  app.put("/api/admin/coupons/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { applicableProductId, applicableProducts, ...rest } = req.body as any;
      const updates: any = { ...rest };
      if (Array.isArray(applicableProducts)) {
        updates.applicableProducts = applicableProducts;
      } else if (applicableProductId) {
        updates.applicableProducts = [applicableProductId];
      }
      const coupon = await storage.updateDiscountCoupon(req.params.id, updates);
      res.json(coupon);
    } catch (error) {
      console.error("Error updating discount coupon:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/coupons/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteDiscountCoupon(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting discount coupon:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ====== VOUCHER COUPONS MANAGEMENT (CRUD) ======
  
  // Get all discount coupons
  app.get("/api/vouchers/coupons", authenticateUser, async (req: Request, res: Response) => {
    try {
      const coupons = await storage.getDiscountCoupons();
      res.json(coupons);
    } catch (error) {
      console.error("Error fetching discount coupons:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create new discount coupon
  app.post("/api/vouchers/coupons", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log('[COUPON CREATE] Request body:', JSON.stringify(req.body, null, 2));
      const { applicableProductId, applicableProducts, applicableProductSlug, ...rest } = req.body as any;
      const couponData: any = { ...rest };
      
      // Handle applicableProducts field conversion
      if (Array.isArray(applicableProducts) && applicableProducts.length > 0) {
        couponData.applicableProducts = applicableProducts;
      } else if (applicableProductId) {
        couponData.applicableProducts = [applicableProductId];
      } else if (applicableProductSlug && applicableProductSlug.trim() !== '') {
        // Convert product slug to array for applicableProducts
        couponData.applicableProducts = [applicableProductSlug.trim()];
      } else {
        // If no specific product selected, set to null (all products)
        couponData.applicableProducts = null;
      }
      
      // Convert date strings to Date objects if present
      if (couponData.startDate && typeof couponData.startDate === 'string') {
        couponData.startDate = new Date(couponData.startDate);
      }
      if (couponData.endDate && typeof couponData.endDate === 'string') {
        couponData.endDate = new Date(couponData.endDate);
      }
      
      // Convert numeric string fields to proper types
      if (couponData.discountValue && typeof couponData.discountValue === 'string') {
        couponData.discountValue = couponData.discountValue.toString();
      }
      if (couponData.minOrderAmount && typeof couponData.minOrderAmount === 'string') {
        couponData.minOrderAmount = couponData.minOrderAmount.toString();
      }
      if (couponData.maxDiscountAmount && typeof couponData.maxDiscountAmount === 'string') {
        couponData.maxDiscountAmount = couponData.maxDiscountAmount.toString();
      }
      
      console.log('[COUPON CREATE] Processing data:', JSON.stringify(couponData, null, 2));
      const coupon = await storage.createDiscountCoupon(couponData);
      console.log('[COUPON CREATE] Success:', coupon.id);
      res.json(coupon);
    } catch (error) {
      console.error("[COUPON CREATE] Error details:", error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      console.error("[COUPON CREATE] Error message:", errorMessage);
      console.error("[COUPON CREATE] Error stack:", error instanceof Error ? error.stack : '');
      
      // Check for duplicate code constraint violation
      if (errorMessage.includes('discount_coupons_code_unique') || errorMessage.includes('duplicate key')) {
        return res.status(400).json({ 
          error: "Coupon code already exists", 
          details: `A coupon with code "${(req.body as any)?.code}" already exists. Please use a different code.` 
        });
      }
      
      res.status(500).json({ error: "Internal server error", details: errorMessage });
    }
  });

  // Update discount coupon
  app.put("/api/vouchers/coupons/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log('[COUPON UPDATE] Request body:', JSON.stringify(req.body, null, 2));
      const { applicableProductId, applicableProducts, applicableProductSlug, ...rest } = req.body as any;
      const updates: any = { ...rest };
      
      if (Array.isArray(applicableProducts) && applicableProducts.length > 0) {
        updates.applicableProducts = applicableProducts;
      } else if (applicableProductId) {
        updates.applicableProducts = [applicableProductId];
      } else if (applicableProductSlug && applicableProductSlug.trim() !== '') {
        // Convert product slug to array for applicableProducts
        updates.applicableProducts = [applicableProductSlug.trim()];
      } else {
        // If no specific product selected, set to null (all products)
        updates.applicableProducts = null;
      }
      
      // Convert date strings to Date objects if present
      if (updates.startDate && typeof updates.startDate === 'string') {
        updates.startDate = new Date(updates.startDate);
      }
      if (updates.endDate && typeof updates.endDate === 'string') {
        updates.endDate = new Date(updates.endDate);
      }
      
      // Convert numeric string fields to proper types
      if (updates.discountValue && typeof updates.discountValue === 'string') {
        updates.discountValue = updates.discountValue.toString();
      }
      if (updates.minOrderAmount && typeof updates.minOrderAmount === 'string') {
        updates.minOrderAmount = updates.minOrderAmount.toString();
      }
      if (updates.maxDiscountAmount && typeof updates.maxDiscountAmount === 'string') {
        updates.maxDiscountAmount = updates.maxDiscountAmount.toString();
      }
      
      console.log('[COUPON UPDATE] Processing updates:', JSON.stringify(updates, null, 2));
      const coupon = await storage.updateDiscountCoupon(req.params.id, updates);
      console.log('[COUPON UPDATE] Success:', coupon.id);
      res.json(coupon);
    } catch (error) {
      console.error("[COUPON UPDATE] Error details:", error);
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      console.error("[COUPON UPDATE] Error message:", errorMessage);
      console.error("[COUPON UPDATE] Error stack:", error instanceof Error ? error.stack : '');
      
      // Check for duplicate code constraint violation
      if (errorMessage.includes('discount_coupons_code_unique') || errorMessage.includes('duplicate key')) {
        return res.status(400).json({ 
          error: "Coupon code already exists", 
          details: `A coupon with code "${(req.body as any)?.code}" already exists. Please use a different code.` 
        });
      }
      
      res.status(500).json({ error: "Internal server error", details: errorMessage });
    }
  });

  // Delete discount coupon
  app.delete("/api/vouchers/coupons/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await storage.deleteDiscountCoupon(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting discount coupon:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Validate coupon code (public endpoint for frontend)
  app.post("/api/vouchers/coupons/validate", async (req: Request, res: Response) => {
    try {
      const { code, orderAmount, items } = req.body as {
        code: string;
        orderAmount?: number | string; // in euros
        items?: Array<{ productId?: string; productSlug?: string; sku?: string; name?: string; price: number; quantity: number }>;
      };
      
      if (!code) {
        return res.status(400).json({ error: "Coupon code is required" });
      }

      const codeTrimmed = String(code).trim();
      const codeUpper = codeTrimmed.toUpperCase();

      // IMPORTANT: Database coupons take priority over ENV coupons
      // This allows admin to dynamically edit coupons without code changes
      let coupon = await storage.getDiscountCouponByCode(codeTrimmed);
      
      // Only fall back to ENV coupon if no DB coupon exists
      const envCoupon = coupon ? null : findCoupon(codeUpper);
      
      if (!coupon && !envCoupon) {
        return res.status(404).json({ error: "Invalid coupon code" });
      }
      
      console.log('[COUPON VALIDATE] Using source:', coupon ? 'DATABASE' : 'ENV');
      console.log('[COUPON VALIDATE] Coupon code:', codeUpper);

      // Validate coupon
      const now = new Date();
      const errors = [];

      if (!envCoupon && coupon) {
        if (!coupon.isActive) {
          errors.push("Coupon is not active");
        }
        if (coupon.startDate && new Date(coupon.startDate) > now) {
          errors.push("Coupon is not yet valid");
        }
        if (coupon.endDate && new Date(coupon.endDate) < now) {
          errors.push("Coupon has expired");
        }
        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
          errors.push("Coupon usage limit reached");
        }
        if (coupon.minOrderAmount && orderAmount && parseFloat(String(orderAmount)) < parseFloat(String(coupon.minOrderAmount))) {
          errors.push(`Minimum order amount is €${coupon.minOrderAmount}`);
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(", "), valid: false });
      }

      // Determine applicable subtotal and discount
      if (envCoupon) {
        if (!isCouponActive(envCoupon)) {
          return res.status(400).json({ error: 'Coupon is not active', valid: false });
        }
        // Calculate in cents; item.price expected in euros
        let applicableSubtotalCents = 0;
        if (Array.isArray(items) && items.length > 0) {
          for (const it of items) {
            const sku = (it.sku || it.productSlug || '').toString();
            const matches = allowsSku(envCoupon, sku);
            if (matches) {
              const lineTotalCents = Math.round((Number(it.price) || 0) * 100) * (Number(it.quantity) || 1);
              applicableSubtotalCents += Math.max(0, lineTotalCents);
            }
          }
        } else {
          applicableSubtotalCents = Math.max(0, Math.round((Number(orderAmount) || 0) * 100));
        }

        // Calculate discount based on SKU validation only - no arbitrary price restrictions
        let discountCents = 0;
        if (envCoupon.type === 'percent') {
          const pct = Math.max(0, Math.min(100, envCoupon.value));
          discountCents = Math.round((applicableSubtotalCents * pct) / 100);
        } else {
          discountCents = Math.min(applicableSubtotalCents, Math.max(0, Math.round(envCoupon.value)));
        }

        return res.json({
          valid: true,
          coupon: {
            id: envCoupon.code,
            code: envCoupon.code,
            name: envCoupon.code,
            discountType: envCoupon.type === 'percent' ? 'percentage' : 'fixed',
            discountValue: envCoupon.value,
            discountAmount: (discountCents / 100).toFixed(2),
            applicableProducts: envCoupon.skus || ['all']
          }
        });
      }

      // Fallback: DB coupons flow (legacy)
      // Determine applicable subtotal: restrict to applicableProducts if provided
      let applicableSubtotal = 0;
      const allProducts = !coupon.applicableProducts || coupon.applicableProducts.length === 0 || coupon.applicableProducts.includes('all');
      
      console.log('[COUPON VALIDATE] Coupon:', coupon.code);
      console.log('[COUPON VALIDATE] applicableProducts from DB:', coupon.applicableProducts);
      console.log('[COUPON VALIDATE] allProducts allowed:', allProducts);

      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          const lineTotal = (Number(it.price) || 0) * (Number(it.quantity) || 1);
          console.log('[COUPON VALIDATE] Checking item:', { 
            productId: it.productId, 
            productSlug: it.productSlug, 
            sku: it.sku,
            name: it.name, 
            price: it.price,
            lineTotal 
          });
          
          if (allProducts) {
            applicableSubtotal += lineTotal;
            console.log('[COUPON VALIDATE] -> Added (all products allowed)');
          } else {
            // More robust matching: check productId, productSlug, sku, and name variations
            const applicableProds = coupon.applicableProducts || [];
            const itemProductId = (it.productId || '').toLowerCase();
            const itemProductSlug = (it.productSlug || '').toLowerCase();
            const itemSku = (it.sku || '').toLowerCase();
            const itemName = (it.name || '').toLowerCase();
            
            const matches = applicableProds.some(p => {
              const prodLower = (p || '').toLowerCase();
              return (
                // Exact matches
                (itemProductId && itemProductId === prodLower) ||
                (itemProductSlug && itemProductSlug === prodLower) ||
                (itemSku && itemSku === prodLower) ||
                (itemName && itemName === prodLower) ||
                // Partial matches (slug contains or is contained)
                (itemProductSlug && prodLower && (itemProductSlug.includes(prodLower) || prodLower.includes(itemProductSlug))) ||
                (itemSku && prodLower && (itemSku.includes(prodLower) || prodLower.includes(itemSku)))
              );
            });
            
            if (matches) {
              applicableSubtotal += lineTotal;
              console.log('[COUPON VALIDATE] -> Added (product matches restriction)');
            } else {
              console.log('[COUPON VALIDATE] -> Skipped (product does not match restriction)');
            }
          }
        }
      } else {
        applicableSubtotal = parseFloat((orderAmount as any) || '0');
      }

      // Product-restricted coupon (e.g. a "Family Classic only" code) that matched
      // NONE of the cart's items → the code is genuinely not valid for what's being
      // bought. Reject with a clear message instead of returning a valid-but-€0
      // discount (which made the code look "applied" while the total never dropped).
      // The landing-page offer flow now carries the bound product slug through the
      // signed token, so a legitimate matching purchase reaches this point with
      // applicableSubtotal > 0 and is unaffected.
      if (applicableSubtotal === 0 && !allProducts && Array.isArray(items) && items.length > 0) {
        const forProducts = (coupon.applicableProducts || []).filter(Boolean).join(', ');
        return res.status(400).json({
          valid: false,
          error: forProducts
            ? `This code is only valid for: ${forProducts}`
            : 'This code is not valid for the selected product',
        });
      }

      console.log('[COUPON VALIDATE] Final applicableSubtotal:', applicableSubtotal);

      let discountAmount = 0;
      if (coupon.discountType === 'percentage') {
        discountAmount = (applicableSubtotal * parseFloat(coupon.discountValue)) / 100;
        if (coupon.maxDiscountAmount) {
          discountAmount = Math.min(discountAmount, parseFloat(coupon.maxDiscountAmount));
        }
      } else {
        discountAmount = parseFloat(coupon.discountValue);
        discountAmount = Math.min(discountAmount, applicableSubtotal);
      }

      return res.json({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: Number(discountAmount || 0).toFixed(2),
          applicableProducts: coupon.applicableProducts || ['all']
        }
      });
    } catch (error) {
      console.error("Error validating coupon:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Coupon analytics (admin)
  app.get('/api/vouchers/coupons/analytics', authenticateUser, async (req: Request, res: Response) => {
    try {
      const coupons = await storage.getDiscountCoupons();
      const sales = await storage.getVoucherSales();
      const analytics = coupons.map(c => {
        const related = sales.filter(s => (s.couponId && s.couponId === c.id) || (s.couponCode && s.couponCode.toUpperCase() === c.code.toUpperCase()));
        const usageCount = related.length;
        const totalDiscount = related.reduce((sum, s) => sum + Number(s.discountAmount || 0), 0);
        const totalRevenue = related.reduce((sum, s) => sum + Number(s.finalAmount || 0), 0);
        const lastUsedAt = related.reduce((latest: Date | null, s) => {
          const d = s.createdAt as any;
          const dt = d instanceof Date ? d : (d ? new Date(d) : null);
          if (!dt) return latest;
            return !latest || dt > latest ? dt : latest;
        }, null);
        return {
          id: c.id,
          code: c.code,
          name: c.name,
          discountType: c.discountType,
          discountValue: c.discountValue,
          isActive: c.isActive,
          usageCount,
          totalDiscountAmount: Number(totalDiscount.toFixed(2)),
          totalRevenueInfluenced: Number(totalRevenue.toFixed(2)),
          lastUsedAt,
        };
      });
      res.json(analytics);
    } catch (error) {
      console.error('Error generating coupon analytics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Voucher settings (ephemeral in-memory for now)
  let voucherSettings: any = {
    defaultValidityDays: 365,
    defaultAspectRatio: '4:3',
    imageQuality: 0.9,
    updatedAt: new Date(),
  };
  app.get('/api/vouchers/settings', authenticateUser, async (req: Request, res: Response) => {
    res.json(voucherSettings);
  });
  app.put('/api/vouchers/settings', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { defaultValidityDays, defaultAspectRatio, imageQuality } = req.body || {};
      if (defaultValidityDays !== undefined) voucherSettings.defaultValidityDays = parseInt(defaultValidityDays);
      if (defaultAspectRatio !== undefined) voucherSettings.defaultAspectRatio = String(defaultAspectRatio);
      if (imageQuality !== undefined) voucherSettings.imageQuality = Math.min(1, Math.max(0.4, Number(imageQuality)));
      voucherSettings.updatedAt = new Date();
      res.json(voucherSettings);
    } catch (e) {
      res.status(400).json({ error: 'Invalid settings payload' });
    }
  });

  // CSV export endpoints
  app.get('/api/vouchers/products.csv', authenticateUser, async (req: Request, res: Response) => {
    try {
      const products = await neonDb.getVoucherProducts();
      const header = 'id,name,price,originalPrice,slug,isActive\n';
      const rows = products.map((p: any) => [
        p.id,
        '"' + String(p.name || '').replace(/"/g, '""') + '"',
        p.price,
        p.original_price || '',
        p.slug || '',
        p.is_active,
      ].join(','));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="voucher-products.csv"');
      res.send(header + rows.join('\n'));
    } catch (error) {
      console.error('Error exporting products CSV:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  // Real per-gallery analytics for the Reports dashboard (views + email captures
  // as an "inquiries" proxy). Distinct path so it doesn't collide with
  // /api/galleries/:id. Best-effort: missing analytics rows count as 0.
  app.get('/api/reports/gallery-analytics', authenticateUser, async (_req: Request, res: Response) => {
    try {
      const rows = await runSql(`
        SELECT g.id, g.title,
               COALESCE(ga.view_count, 0)          AS view_count,
               COALESCE(ga.email_capture_count, 0) AS email_capture_count,
               COALESCE(ga.download_count, 0)      AS download_count,
               (SELECT COUNT(*) FROM gallery_images gi WHERE gi.gallery_id = g.id) AS image_count
        FROM galleries g
        LEFT JOIN gallery_analytics ga ON ga.gallery_id = g.id
        ORDER BY COALESCE(ga.view_count, 0) DESC
        LIMIT 20
      `);
      res.json((rows || []).map((r: any) => ({
        id: r.id,
        title: r.title || 'Untitled gallery',
        viewCount: Number(r.view_count) || 0,
        emailCaptures: Number(r.email_capture_count) || 0,
        downloadCount: Number(r.download_count) || 0,
        imageCount: Number(r.image_count) || 0,
      })));
    } catch (error) {
      console.error('Error building gallery analytics summary:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Revenue grouped by service, from actual invoice LINE ITEMS (crm_invoice_items.
  // description) on PAID invoices — the real breakdown for the Reports dashboard
  // (invoices themselves have no service field).
  app.get('/api/reports/revenue-by-service', authenticateUser, async (req: Request, res: Response) => {
    try {
      const params: any[] = [];
      let dateClause = '';
      const from = req.query.from ? new Date(String(req.query.from)) : null;
      if (from && !isNaN(from.getTime())) {
        params.push(from.toISOString().slice(0, 10));
        dateClause = `AND i.issue_date >= $${params.length}`;
      }
      const rows = await runSql(`
        SELECT COALESCE(NULLIF(TRIM(ii.description), ''), 'Other') AS service,
               SUM(COALESCE(ii.quantity, '1')::numeric * COALESCE(ii.unit_price, '0')::numeric) AS revenue,
               COUNT(DISTINCT i.id) AS invoices
        FROM crm_invoice_items ii
        JOIN crm_invoices i ON i.id = ii.invoice_id
        WHERE i.status = 'paid' ${dateClause}
        GROUP BY service
        ORDER BY revenue DESC
        LIMIT 20
      `, params);
      const total = (rows || []).reduce((s: number, r: any) => s + (Number(r.revenue) || 0), 0);
      res.json((rows || []).map((r: any) => ({
        service: r.service,
        revenue: Number(r.revenue) || 0,
        invoices: Number(r.invoices) || 0,
        percentage: total > 0 ? (Number(r.revenue) / total) * 100 : 0,
      })));
    } catch (error) {
      console.error('Error building revenue-by-service:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Email→order attribution rollup: paid voucher revenue grouped by the campaign
  // that drove it (voucher_sales.campaign_id, set from Stripe metadata at purchase).
  app.get('/api/reports/email-campaign-revenue', authenticateUser, async (_req: Request, res: Response) => {
    try {
      const rows = await runSql(`
        SELECT vs.campaign_id AS campaign_id,
               COALESCE(ec.name, 'Unknown campaign') AS campaign_name,
               COUNT(*) AS orders,
               COALESCE(SUM(vs.final_amount::numeric), 0) AS revenue
        FROM voucher_sales vs
        LEFT JOIN email_campaigns ec ON ec.id::text = vs.campaign_id
        WHERE vs.payment_status = 'paid'
          AND vs.campaign_id IS NOT NULL AND vs.campaign_id <> ''
        GROUP BY vs.campaign_id, ec.name
        ORDER BY revenue DESC
      `);
      res.json((rows || []).map((r: any) => ({
        campaignId: r.campaign_id,
        campaignName: r.campaign_name,
        orders: Number(r.orders) || 0,
        revenue: Number(r.revenue) || 0,
      })));
    } catch (error) {
      // Column may not exist yet on a fresh DB before the boot migration runs.
      console.warn('email-campaign-revenue rollup failed (campaign_id column may be pending):', (error as any)?.message);
      res.json([]);
    }
  });

  app.get('/api/vouchers/sales.csv', authenticateUser, async (req: Request, res: Response) => {
    try {
      const sales = await storage.getVoucherSales();
      const header = 'id,productId,voucherCode,purchaserEmail,finalAmount,discountAmount,couponCode,createdAt\n';
      const rows = sales.map((s: any) => [
        s.id,
        s.productId,
        s.voucherCode,
        s.purchaserEmail,
        s.finalAmount,
        s.discountAmount,
        s.couponCode || '',
        s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
      ].join(','));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="voucher-sales.csv"');
      res.send(header + rows.join('\n'));
    } catch (error) {
      console.error('Error exporting sales CSV:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Export email subscribers as CSV (admin). Opened via window.open, so it relies
  // on the admin session cookie for auth. Optional ?tag=newsletter filters to a
  // single tag (case-insensitive); omit to export everyone. Used by the
  // Campaigns → Subscribers "Export CSV" button to pull the €50 newsletter list.
  app.get('/api/email/subscribers.csv', authenticateUser, async (req: Request, res: Response) => {
    try {
      const tagFilter = String(req.query.tag || '').trim().toLowerCase();
      const subs = await db.select().from(emailSubscribers).orderBy(desc(emailSubscribers.createdAt));
      const filtered = tagFilter
        ? subs.filter((s: any) => Array.isArray(s.tags) && s.tags.some((t: any) => String(t).toLowerCase() === tagFilter))
        : subs;

      // RFC-4180 escaping: wrap in quotes and double any embedded quotes so
      // commas/quotes/newlines in names or tags never break the columns.
      const esc = (v: any): string => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const cols = ['email', 'firstName', 'lastName', 'phone', 'status', 'source', 'tags', 'subscribedAt', 'createdAt'];
      const header = cols.join(',');
      const rows = filtered.map((s: any) => cols.map((c) => {
        if (c === 'tags') return esc(Array.isArray(s.tags) ? s.tags.join('; ') : '');
        const val = s[c];
        return esc(val instanceof Date ? val.toISOString() : val);
      }).join(','));

      const filename = tagFilter ? `subscribers-${tagFilter}.csv` : 'subscribers.csv';
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      // UTF-8 BOM so Excel renders umlauts (ä/ö/ü) correctly.
      res.send('﻿' + header + '\n' + rows.join('\n'));
    } catch (error) {
      console.error('Error exporting subscribers CSV:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Optional: secure admin endpoint to force refresh coupons after Heroku config change
  app.post("/__admin/refresh-coupons", async (req: Request, res: Response) => {
    try {
      const token = (req.headers["x-admin-token"] as string) || '';
      if (token !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ ok: false });
      }
      const count = forceRefreshCoupons();
      return res.json({ ok: true, reloaded: count });
    } catch (e) {
      return res.status(500).json({ ok: false });
    }
  });

  // Voucher print queue endpoint
  app.get("/api/admin/vouchers/print-queue", authenticateUser, async (req: Request, res: Response) => {
    try {
      // TODO: Implement print queue functionality
      // For now, return empty array
      res.json([]);
    } catch (error) {
      console.error("Error fetching print queue:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Voucher Sales Routes
  app.get("/api/vouchers/sales", authenticateUser, async (req: Request, res: Response) => {
    try {
      const sales = await storage.getVoucherSales();
      // (a) Enrich each sale with its product's name/slug/description (the
      //     "what's included" text from the public voucher pages). ORM-safe.
      try {
        const products = (typeof neonDb?.getVoucherProducts === 'function')
          ? await neonDb.getVoucherProducts()
          : [];
        const byId = new Map<string, any>((products || []).map((p: any) => [String(p.id), p]));
        for (const s of (sales as any[])) {
          const p = s.productId ? byId.get(String(s.productId)) : null;
          if (p) {
            s.product_name = p.name;
            s.product_slug = p.slug || null;
            s.product_sku = p.slug || null;
            s.product_description = p.description || p.detailedDescription || p.detailed_description || null;
          }
        }

        // Fallback: match by PRICE for sales that never carried a productId
        // (Stripe payment-link / in-person sales). Only when exactly ONE product
        // has that exact price, so it's never a wrong guess. Read-only — this
        // resolves the display without changing stored data.
        const priceIndex = new Map<string, any[]>();
        const addPrice = (val: any, prod: any) => {
          const n = Number(val);
          if (!Number.isFinite(n) || n <= 0) return;
          const key = n.toFixed(2);
          if (!priceIndex.has(key)) priceIndex.set(key, []);
          priceIndex.get(key)!.push(prod);
        };
        for (const prod of (products || [])) { addPrice(prod.price, prod); addPrice(prod.originalPrice ?? prod.original_price, prod); }
        for (const s of (sales as any[])) {
          if (s.product_name && s.product_name !== 'Unknown Product') continue;
          for (const amt of [s.originalAmount, s.original_amount, s.finalAmount, s.final_amount, s.amount]) {
            const n = Number(amt);
            if (!Number.isFinite(n) || n <= 0) continue;
            const group = priceIndex.get(n.toFixed(2));
            if (group && group.length === 1) {
              s.product_name = group[0].name;
              s.product_slug = group[0].slug || null;
              s.product_matched_by = 'price';
              break;
            }
          }
        }
      } catch (enrichErr) {
        console.warn('Could not enrich voucher sales with product info:', enrichErr);
      }
      // (b) Expose stripe_session_id (raw column, not in Drizzle schema) so the admin
      //     can download the EXACT customer voucher via /voucher/pdf?session_id — which
      //     resolves the product (and its inclusions) from the live Stripe metadata.
      //     Best-effort: if the column is absent this is skipped without affecting (a).
      try {
        const ids = (sales as any[]).map(s => s.id).filter(Boolean);
        if (ids.length) {
          const extra = await runSql(
            `SELECT id, stripe_session_id FROM voucher_sales WHERE id = ANY($1)`,
            [ids]
          );
          const byId = new Map<string, any>((extra || []).map((r: any) => [String(r.id), r]));
          for (const s of (sales as any[])) {
            const r = byId.get(String(s.id));
            if (r) s.stripe_session_id = r.stripe_session_id || null;
          }
        }
      } catch (sessErr: any) {
        console.warn('Could not enrich voucher sales with stripe_session_id:', sessErr?.message || sessErr);
      }
      // (c) Expose pdf_url (raw column, not in Drizzle schema) so the admin can download the
      //     EXACT PDF that was generated at purchase time and durably stored in S3 — the same
      //     voucher the customer downloaded from the frontend. Kept as its own guarded block so a
      //     missing column never affects (a) or (b).
      try {
        const ids = (sales as any[]).map(s => s.id).filter(Boolean);
        if (ids.length) {
          const extra = await runSql(
            `SELECT id, pdf_url FROM voucher_sales WHERE id = ANY($1)`,
            [ids]
          );
          const byId = new Map<string, any>((extra || []).map((r: any) => [String(r.id), r]));
          for (const s of (sales as any[])) {
            const r = byId.get(String(s.id));
            if (r) s.pdf_url = r.pdf_url || null;
          }
        }
      } catch (pdfErr: any) {
        console.warn('Could not enrich voucher sales with pdf_url (column may not exist yet):', pdfErr?.message || pdfErr);
      }
      // (d) Apply a Stripe-resolved product name (from the "Resolve products"
      //     backfill) for sales that still show no product. Raw column, fetched
      //     separately; only fills a name that's still missing/Unknown.
      try {
        const ids = (sales as any[]).map(s => s.id).filter(Boolean);
        if (ids.length) {
          const extra = await runSql(`SELECT id, resolved_product_name FROM voucher_sales WHERE id = ANY($1)`, [ids]);
          const byId = new Map<string, any>((extra || []).map((r: any) => [String(r.id), r]));
          for (const s of (sales as any[])) {
            const r = byId.get(String(s.id));
            const resolved = r?.resolved_product_name;
            if (resolved && (!s.product_name || s.product_name === 'Unknown Product')) {
              s.product_name = resolved;
              s.product_matched_by = s.product_matched_by || 'stripe';
            }
          }
        }
      } catch (resErr: any) {
        console.warn('Could not enrich voucher sales with resolved_product_name:', resErr?.message || resErr);
      }
      res.json(sales);
    } catch (error) {
      console.error("Error fetching voucher sales:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Backfill product names for sales that show "Unknown Product". Re-reads each
  // sale's Stripe checkout session (with the product expanded), then either
  // LINKS a matching CRM product (permanent) or stores the resolved name. Safe
  // to run repeatedly — only touches sales that are still unresolved.
  app.post("/api/vouchers/sales/resolve-products", authenticateUser, async (req: Request, res: Response) => {
    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) return res.status(400).json({ error: 'Stripe is not configured — cannot resolve from Stripe.' });

      const StripeLib = (await import('stripe')).default;
      const stripe = new StripeLib(stripeSecretKey, { apiVersion: '2025-08-27.basil' as any });

      // Candidates: have a Stripe session, no linked product, not yet resolved.
      const candidates = await runSql(
        `SELECT id, stripe_session_id FROM voucher_sales
          WHERE product_id IS NULL
            AND stripe_session_id IS NOT NULL AND stripe_session_id <> ''
            AND (resolved_product_name IS NULL OR resolved_product_name = '')
          LIMIT 300`
      );

      const products = (typeof neonDb?.getVoucherProducts === 'function') ? await neonDb.getVoucherProducts() : [];
      const productByName = new Map<string, any>((products || []).map((p: any) => [String(p.name).trim().toLowerCase(), p]));

      let checked = 0, linked = 0, named = 0, failed = 0;
      for (const c of (candidates || [])) {
        checked++;
        try {
          const items = await stripe.checkout.sessions.listLineItems(c.stripe_session_id, { expand: ['data.price.product'], limit: 1 });
          const li: any = items.data?.[0];
          const stripeProduct = li?.price?.product;
          const name = (stripeProduct && typeof stripeProduct === 'object' ? stripeProduct.name : null) || li?.description || null;
          if (!name) { failed++; continue; }

          const match = productByName.get(String(name).trim().toLowerCase());
          if (match) {
            await runSql(`UPDATE voucher_sales SET product_id = $1 WHERE id = $2`, [match.id, c.id]);
            linked++;
          } else {
            await runSql(`UPDATE voucher_sales SET resolved_product_name = $1 WHERE id = $2`, [String(name).slice(0, 200), c.id]);
            named++;
          }
        } catch (rowErr: any) {
          failed++;
          console.warn('[resolve-products] session', c.stripe_session_id, 'failed:', rowErr?.message || rowErr);
        }
      }

      res.json({ success: true, checked, linked, named, failed, resolved: linked + named });
    } catch (error: any) {
      console.error('Error resolving voucher products:', error?.message || error);
      res.status(500).json({ error: 'Failed to resolve products from Stripe' });
    }
  });

  app.post("/api/vouchers/sales", authenticateUser, async (req: Request, res: Response) => {
    try {
      const validatedData = insertVoucherSaleSchema.parse(req.body);
      const sale = await storage.createVoucherSale(validatedData);
      res.status(201).json(sale);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating voucher sale:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/vouchers/sales/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const sale = await storage.updateVoucherSale(req.params.id, req.body);
      res.json(sale);
    } catch (error) {
      console.error("Error updating voucher sale:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ========= Create Client from Voucher Sale =========
  // Convert a voucher purchaser into a CRM client
  app.post("/api/vouchers/sales/:id/create-client", authenticateUser, async (req: Request, res: Response) => {
    try {
      const saleId = req.params.id;
      
      // Get the voucher sale with all data
      const saleResult = await runSql(`
        SELECT vs.*, vp.name as product_name
        FROM voucher_sales vs
        LEFT JOIN voucher_products vp ON vs.product_id = vp.id
        WHERE vs.id = $1
      `, [saleId]);
      
      if (saleResult.length === 0) {
        return res.status(404).json({ error: "Voucher sale not found" });
      }
      
      const sale = saleResult[0];
      
      // Check if already linked to a client
      if (sale.client_id) {
        return res.status(400).json({ 
          error: "Already linked to a client",
          clientId: sale.client_id 
        });
      }
      
      // Check if client already exists with this email
      const existingClientResult = await runSql(
        'SELECT id, first_name, last_name, email FROM crm_clients WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [sale.purchaser_email]
      );
      
      if (existingClientResult.length > 0) {
        // Link existing client to this sale
        const existingClient = existingClientResult[0];
        await runSql('UPDATE voucher_sales SET client_id = $1 WHERE id = $2', [existingClient.id, saleId]);
        
        // Update client's lifetime_value
        const currentLifetimeValue = await runSql(
          'SELECT COALESCE(lifetime_value, 0) as lv FROM crm_clients WHERE id = $1',
          [existingClient.id]
        );
        const newLifetimeValue = parseFloat(currentLifetimeValue[0]?.lv || 0) + parseFloat(sale.final_amount || 0);
        await runSql('UPDATE crm_clients SET lifetime_value = $1 WHERE id = $2', [newLifetimeValue.toFixed(2), existingClient.id]);
        
        return res.json({
          success: true,
          message: "Linked to existing client",
          client: existingClient,
          isNew: false
        });
      }
      
      // Parse purchaser name into first/last name
      const fullName = sale.purchaser_name || 'Unknown';
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      // Build notes with purchase info
      const paymentInfo = [];
      if (sale.card_brand && sale.card_last4) {
        paymentInfo.push(`Payment: ${sale.card_brand} ****${sale.card_last4}`);
      }
      if (sale.coupon_code) {
        paymentInfo.push(`Coupon used: ${sale.coupon_code}`);
      }
      
      const notes = [
        `Added from voucher purchase`,
        `Voucher Code: ${sale.voucher_code}`,
        `Product: ${sale.product_name || 'Unknown'}`,
        `Amount: €${parseFloat(sale.final_amount || 0).toFixed(2)}`,
        ...paymentInfo,
        `Purchase Date: ${new Date(sale.created_at).toLocaleDateString('de-DE')}`
      ].join('\n');
      
      // Create the new client
      const newClientData = {
        firstName,
        lastName,
        email: sale.purchaser_email,
        phone: sale.purchaser_phone || '',
        address: sale.billing_address || '',
        city: sale.billing_city || '',
        zip: sale.billing_zip || '',
        country: sale.billing_country || '',
        notes,
        status: 'active',
        source: 'voucher_purchase',
        clientSince: new Date(sale.created_at),
        lifetimeValue: sale.final_amount || '0'
      };
      
      const createdClient = await storage.createCrmClient(newClientData as any);
      
      // Link client to the voucher sale
      await runSql('UPDATE voucher_sales SET client_id = $1 WHERE id = $2', [createdClient.id, saleId]);
      
      console.log(`[Client] Created client from voucher sale: ${createdClient.id} - ${firstName} ${lastName}`);
      
      res.json({
        success: true,
        message: "Client created successfully",
        client: createdClient,
        isNew: true
      });
      
    } catch (error: any) {
      console.error("Error creating client from voucher sale:", error);
      res.status(500).json({ error: error.message || "Failed to create client" });
    }
  });

  // ========= Stripe Sales Sync Endpoint =========
  // Manually sync voucher sales from Stripe checkout sessions
  app.post("/api/vouchers/sync-stripe", authenticateUser, async (req: Request, res: Response) => {
    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        return res.status(500).json({ error: "Stripe not configured" });
      }

      const StripeLib = (await import('stripe')).default;
      const stripe = new StripeLib(stripeSecretKey, { apiVersion: '2025-08-27.basil' });

      // Fetch all checkout sessions from the last 90 days
      const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
        created: { gte: ninetyDaysAgo },
        expand: ['data.line_items']
      });

      let synced = 0;
      let skipped = 0;
      let errors: string[] = [];

      for (const session of sessions.data) {
        // Only process paid sessions
        if (session.payment_status !== 'paid') {
          skipped++;
          continue;
        }

        // Check if already exists in database
        const existingCheck = await runSql(
          'SELECT id FROM voucher_sales WHERE stripe_session_id = $1 LIMIT 1',
          [session.id]
        );

        if (existingCheck.length > 0) {
          skipped++;
          continue;
        }

        try {
          // Extract voucher info from metadata or line items
          const metadata = session.metadata || {};
          const lineItems = (session as any).line_items?.data || [];
          
          // Generate voucher code if not in metadata
          const voucherCode = metadata.voucher_code || 
            metadata.voucher_id || 
            `SYNC-${session.id.slice(-8).toUpperCase()}`;
          
          // Get product info
          const productName = lineItems[0]?.description || metadata.product_name || 'Unknown Product';
          const productId = metadata.product_id || null;
          
          // Get customer info
          const customerEmail = session.customer_email || session.customer_details?.email || '';
          const customerName = session.customer_details?.name || metadata.purchaser_name || '';
          
          // Get recipient info from metadata
          const recipientName = metadata.recipient_name || metadata.to_name || '';
          const recipientEmail = metadata.recipient_email || '';
          const giftMessage = metadata.message || metadata.gift_message || '';
          
          // Extract coupon code from metadata (voucher_used is the key from checkout)
          const couponCode = metadata.voucher_used && metadata.voucher_used !== 'none' 
            ? metadata.voucher_used 
            : metadata.coupon_code || metadata.discount_code || null;
          
          // Extract billing address from customer_details
          const customerAddress = (session.customer_details?.address || {}) as any;
          const billingAddress = customerAddress.line1 || '';
          const billingCity = customerAddress.city || '';
          const billingZip = customerAddress.postal_code || '';
          const billingCountry = customerAddress.country || '';
          const customerPhone = session.customer_details?.phone || '';
          
          // Calculate amounts - use amount_total, fallback to amount_subtotal
          const amountInCents = session.amount_total || session.amount_subtotal || 0;
          const finalAmount = amountInCents / 100;
          // Try to get original amount from metadata, otherwise use final amount
          const origAmountFromMeta = metadata.original_amount ? parseFloat(metadata.original_amount) : null;
          const originalAmount = origAmountFromMeta || finalAmount;
          const discountAmount = originalAmount - finalAmount;
          const currency = (session.currency || 'EUR').toUpperCase();

          // Stripe truncates metadata values at 500 chars, which can leave voucher_data
          // as a broken JSON fragment. Validate before casting to jsonb, otherwise the
          // whole insert throws "invalid input syntax for type json" and nothing syncs.
          let personalizationData = '{}';
          const rawVoucherData = metadata.voucher_data;
          if (rawVoucherData && typeof rawVoucherData === 'string' && rawVoucherData.trim()) {
            try {
              JSON.parse(rawVoucherData);
              personalizationData = rawVoucherData;
            } catch {
              personalizationData = '{}';
            }
          }

          // Insert the voucher sale with billing data + images
          const insertResult = await runSql(`
            INSERT INTO voucher_sales (
              voucher_code, product_id, purchaser_email, purchaser_name, purchaser_phone,
              recipient_name, recipient_email, gift_message, original_amount, discount_amount, final_amount,
              currency, payment_status, stripe_session_id, stripe_payment_intent_id,
              coupon_code, billing_address, billing_city, billing_zip, billing_country,
              custom_image, design_image, personalization_data, campaign_id, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::jsonb, NULLIF($24, ''), $25)
            RETURNING id
          `, [
            voucherCode,
            productId,
            customerEmail,
            customerName,
            customerPhone,
            recipientName,
            recipientEmail,
            giftMessage,
            originalAmount.toFixed(2),
            discountAmount > 0 ? discountAmount.toFixed(2) : '0',
            finalAmount.toFixed(2),
            currency,
            'paid',
            session.id,
            typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
            couponCode,
            billingAddress,
            billingCity,
            billingZip,
            billingCountry,
            metadata.custom_image || null,
            metadata.design_image || null,
            personalizationData,
            String(metadata.campaign_id || ''),
            new Date(session.created * 1000).toISOString()
          ]);
          
          // Try to get card details from payment intent
          const saleId = insertResult[0]?.id;
          const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
          if (saleId && paymentIntentId) {
            try {
              const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                expand: ['payment_method']
              });
              const pm = paymentIntent.payment_method;
              if (pm && typeof pm === 'object' && 'card' in pm) {
                const card = (pm as any).card;
                if (card) {
                  await runSql(`UPDATE voucher_sales SET card_brand = $1, card_last4 = $2 WHERE id = $3`,
                    [card.brand || '', card.last4 || '', saleId]);
                }
              }
            } catch (cardErr: any) {
              // Card details are optional, don't fail sync
            }
          }

          synced++;
        } catch (insertError: any) {
          console.error(`[Stripe Sync] Error inserting session ${session.id}:`, insertError);
          errors.push(`${session.id}: ${insertError.message}`);
        }
      }

      res.json({
        success: true,
        synced,
        skipped,
        total: sessions.data.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("[Stripe Sync] Error:", error);
      res.status(500).json({ error: error.message || "Sync failed" });
    }
  });

  // ========= Voucher PDF Generation (no webhook required) =========
  app.get('/voucher/pdf', async (req: Request, res: Response) => {
    try {
      const sessionId = String(req.query.session_id || '').trim();
      if (!sessionId) return res.status(400).send('Missing session_id');

      const { StripeVoucherService } = await import('./services/stripeVoucherService');
      const stripeSession = await StripeVoucherService.retrieveSession(sessionId);

      // We need the payment_status; if not present, re-fetch with expand
      let isPaid = (stripeSession as any).payment_status === 'paid';
      let session = stripeSession as any;
      if (!isPaid) {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) return res.status(500).send('Stripe not configured');
        const StripeLib = (await import('stripe')).default;
        const stripe = new StripeLib(stripeSecretKey, { apiVersion: '2025-08-27.basil' });
        session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
        isPaid = session?.payment_status === 'paid';
      }

      if (!isPaid) return res.status(402).send('Payment not completed yet');

      const m = session.metadata || {};
      const sku = m.sku || 'Voucher';
      const name = m.recipient_name || 'Beschenkte/r';
      const from = m.from_name || '—';
      const note = m.message || '';
      const vId = m.voucher_id || session.id;

      // Fetch the actual product from DB to get dynamic name & validity
      let pdfProduct: any = null;
      const pdfIdOrSlug = String(m.sku || m.product_id || '').trim();
      if (pdfIdOrSlug && neonDb) {
        try {
          // Try slug-based lookup first (most common path), then fall back to UUID lookup
          if (!pdfProduct && typeof neonDb.getVoucherProducts === 'function') {
            const all = await neonDb.getVoucherProducts();
            const slug = pdfIdOrSlug.toLowerCase();
            pdfProduct = all.find((p: any) => (p.slug || '').toLowerCase() === slug)
                      || all.find((p: any) => (p.name || '').toLowerCase().replace(/\s+/g, '-') === slug)
                      || all.find((p: any) => (p.name || '').toLowerCase().includes(slug.replace(/-/g, ' ')));
          }
          if (!pdfProduct && typeof neonDb.getVoucherProduct === 'function') {
            pdfProduct = await neonDb.getVoucherProduct(pdfIdOrSlug);
          }
        } catch (dbErr) {
          console.warn('Could not fetch voucher product for PDF:', dbErr);
        }
      }

      // Fetch design template from DB for reliable image URL + custom styling
      let pdfTemplate: any = null;
      const templateId = String(m.design_template_id || '').trim();
      if (templateId && neonDb && typeof neonDb.getVoucherTemplate === 'function') {
        try {
          pdfTemplate = await neonDb.getVoucherTemplate(templateId);
        } catch (tplErr) {
          console.warn('Could not fetch voucher template for PDF:', tplErr);
        }
      }

      // Resolve template styling variables (with sensible defaults)
      const tplBannerColor = pdfTemplate?.bannerColor || pdfTemplate?.banner_color || '#b3202e';
      const tplBannerTextColor = pdfTemplate?.bannerTextColor || pdfTemplate?.banner_text_color || '#ffffff';
      const tplFontFamily = pdfTemplate?.fontFamily || pdfTemplate?.font_family || 'Helvetica';
      const tplMsgFontSize = parseInt(pdfTemplate?.messageFontSize || pdfTemplate?.message_font_size || '22', 10) || 22;
      const tplLogoUrl = pdfTemplate?.logoUrl || pdfTemplate?.logo_url || process.env.VOUCHER_LOGO_URL || 'https://i.postimg.cc/j55DNmbh/frontend-logo.jpg';
      const tplFooterText = pdfTemplate?.footerText || pdfTemplate?.footer_text || '';
      const tplFooterEmail = pdfTemplate?.footerEmail || pdfTemplate?.footer_email || '';
      const tplFooterPhone = pdfTemplate?.footerPhone || pdfTemplate?.footer_phone || 'WhatsApp: 0043 677 633 99210';
      const tplTermsText = pdfTemplate?.termsText || pdfTemplate?.terms_text || 'Einlösbar für die oben genannte Leistung in unserem Studio. Nicht bar auszahlbar. Termin nach Verfügbarkeit. Bitte zur Einlösung Gutschein-ID angeben.';

      // Title: prefer DB product name, then metadata product_name, then fallback map
      const titleMap: Record<string, string> = {
        'Maternity-Basic': 'Schwangerschafts Fotoshooting - Basic',
        'Family-Basic': 'Family Fotoshooting - Basic',
        'Newborn-Basic': 'Newborn Fotoshooting - Basic',
        'Maternity-Premium': 'Schwangerschafts Fotoshooting - Premium',
        'Family-Premium': 'Family Fotoshooting - Premium',
        'Newborn-Premium': 'Newborn Fotoshooting - Premium',
        'Maternity-Deluxe': 'Schwangerschafts Fotoshooting - Deluxe',
        'Family-Deluxe': 'Family Fotoshooting - Deluxe',
        'Newborn-Deluxe': 'Newborn Fotoshooting - Deluxe',
      };
      const title = pdfProduct?.name || m.product_name || titleMap[String(sku)] || 'Gutschein';

      // Expiry: compute from product's validityPeriod + purchase date, then metadata, then fallback
      let exp = '';
      if (m.expiry_date && m.expiry_date.trim()) {
        exp = m.expiry_date;
      } else {
        const validityDays = pdfProduct?.validityPeriod ?? pdfProduct?.validity_period ?? null;
        const purchaseTimestamp = session.created ? session.created * 1000 : Date.now();
        if (validityDays && validityDays > 0) {
          const expiryDate = new Date(purchaseTimestamp + validityDays * 24 * 60 * 60 * 1000);
          exp = expiryDate.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } else {
          // Generic fallback using schema default (4 years)
          const expiryDate = new Date(purchaseTimestamp + 1460 * 24 * 60 * 60 * 1000);
          exp = expiryDate.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${vId}.pdf"`);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      doc.pipe(res);

      // Render the professional single-page voucher via the shared renderer.
      // (Design only — all data above is resolved exactly as before.)
      const heroReal = String(m.custom_image || m.design_image || (pdfTemplate?.image_url || pdfTemplate?.imageUrl || '') || m.product_hero_image || (pdfProduct?.image_url || pdfProduct?.imageUrl || '') || '').trim();
      const paidReal = ((session.amount_total || 0) / 100).toFixed(2) + ' ' + String(session.currency || 'EUR').toUpperCase();
      const dReal = new Date((session.created || Date.now() / 1000) * 1000);
      const dateReal = `${String(dReal.getDate()).padStart(2, '0')}.${String(dReal.getMonth() + 1).padStart(2, '0')}.${dReal.getFullYear()}`;
      await renderVoucherPdf(doc, {
        title,
        recipientName: name,
        fromName: from,
        message: note,
        voucherId: String(vId),
        sku: String(sku),
        expiry: exp,
        inclusions: (pdfProduct?.description || pdfProduct?.detailedDescription || pdfProduct?.detailed_description || m.product_description || '').toString(),
        heroImageUrl: heroReal,
        logoUrl: tplLogoUrl,
        bannerColor: tplBannerColor,
        bannerTextColor: tplBannerTextColor,
        fontFamily: tplFontFamily,
        termsText: tplTermsText,
        footerText: tplFooterText || getBizWebsite(),
        footerEmail: tplFooterEmail || getEnvContactEmailSync() || '',
        footerPhone: tplFooterPhone,
        paidAmount: paidReal,
        purchaseDate: dateReal,
        // Gift: buyer chose to hide the price on the voucher (set at checkout).
        hideValue: String(m.hide_value || '').toLowerCase() === 'true',
      });

      doc.end();
    } catch (e) {
      console.error('Voucher PDF generation failed', e);
      res.status(500).send('Failed to generate PDF');
    }
  });

  // Voucher PDF Preview: generate a sample personalized voucher PDF without requiring payment
  app.get('/voucher/pdf/preview', async (req: Request, res: Response) => {
    try {
      const qp = req.query || {};
      const sku = String(qp.sku || 'Family-Basic');
      const name = String(qp.name || qp.recipient_name || 'Anna Muster');
      const from = String(qp.from || qp.from_name || 'Max Beispiel');
      const note = String(qp.message || 'Alles Gute zum besonderen Anlass!');
      const vId = String(qp.voucher_id || 'VCHR-PREVIEW-1234');
      const amount = parseFloat(String(qp.amount || '95.00'));
      const currency = String(qp.currency || 'EUR');

      // Fetch product from DB for dynamic name & validity
      let previewProduct: any = null;
      if (sku && neonDb) {
        try {
          // Resolve by slug/name FIRST — `sku` is usually a slug like "family-classic"
          // (not a uuid), and calling getVoucherProduct(uuid) on a slug throws, which
          // previously aborted the whole lookup and skipped this slug match.
          if (typeof neonDb.getVoucherProducts === 'function') {
            const all = await neonDb.getVoucherProducts();
            const slug = sku.toLowerCase();
            previewProduct = all.find((p: any) => (p.slug || '').toLowerCase() === slug)
                          || all.find((p: any) => (p.name || '').toLowerCase().replace(/\s+/g, '-') === slug)
                          || all.find((p: any) => (p.name || '').toLowerCase().includes(slug.replace(/-/g, ' ')));
          }
          if (!previewProduct && typeof neonDb.getVoucherProduct === 'function') {
            try { previewProduct = await neonDb.getVoucherProduct(sku); } catch { /* sku is not a uuid */ }
          }
        } catch (e) {
          console.warn('Could not fetch product for preview:', e);
        }
      }
      
      // Look up PDF template if design_template_id provided
      let previewTemplate: any = null;
      const previewTemplateId = String(qp.design_template_id || '').trim();
      if (previewTemplateId && neonDb && typeof neonDb.getVoucherTemplate === 'function') {
        try {
          previewTemplate = await neonDb.getVoucherTemplate(previewTemplateId);
        } catch (e) {
          console.warn('Could not fetch template for preview:', e);
        }
      }

      // Resolve template styling variables
      const pvBannerColor = previewTemplate?.bannerColor || previewTemplate?.banner_color || '#b3202e';
      const pvBannerTextColor = previewTemplate?.bannerTextColor || previewTemplate?.banner_text_color || '#ffffff';
      const pvFontFamily = previewTemplate?.fontFamily || previewTemplate?.font_family || 'Helvetica';
      const pvMsgFontSize = parseInt(previewTemplate?.messageFontSize || previewTemplate?.message_font_size || '22', 10) || 22;
      const pvLogoUrl = previewTemplate?.logoUrl || previewTemplate?.logo_url || process.env.VOUCHER_LOGO_URL || 'https://i.postimg.cc/j55DNmbh/frontend-logo.jpg';
      const pvFooterText = previewTemplate?.footerText || previewTemplate?.footer_text || '';
      const pvFooterEmail = previewTemplate?.footerEmail || previewTemplate?.footer_email || '';
      const pvFooterPhone = previewTemplate?.footerPhone || previewTemplate?.footer_phone || 'WhatsApp: 0043 677 633 99210';
      const pvTermsText = previewTemplate?.termsText || previewTemplate?.terms_text || 'Einlösbar für die oben genannte Leistung in unserem Studio. Nicht bar auszahlbar. Termin nach Verfügbarkeit. Bitte zur Einlösung Gutschein-ID angeben.';

      // Try custom_image or design_image from query, template image, or product default
      let customImageUrl = String(qp.custom_image || qp.design_image || '').trim();
      if (!customImageUrl && previewTemplate) {
        customImageUrl = previewTemplate.imageUrl || previewTemplate.image_url || '';
      }
      if (!customImageUrl && previewProduct) {
        customImageUrl = previewProduct.imageUrl || '';
      }

      const titleMap: Record<string, string> = {
        'Maternity-Basic': 'Schwangerschafts Fotoshooting - Basic',
        'Family-Basic': 'Family Fotoshooting - Basic',
        'Newborn-Basic': 'Newborn Fotoshooting - Basic',
        'Maternity-Premium': 'Schwangerschafts Fotoshooting - Premium',
        'Family-Premium': 'Family Fotoshooting - Premium',
        'Newborn-Premium': 'Newborn Fotoshooting - Premium',
        'Maternity-Deluxe': 'Schwangerschafts Fotoshooting - Deluxe',
        'Family-Deluxe': 'Family Fotoshooting - Deluxe',
        'Newborn-Deluxe': 'Newborn Fotoshooting - Deluxe',
      };
      const title = String(qp.title || '').trim() || previewProduct?.name || titleMap[sku] || 'Gutschein';

      // Compute expiry from product's validityPeriod
      let exp = String(qp.expiry_date || '').trim();
      if (!exp) {
        const validityDays = previewProduct?.validityPeriod ?? previewProduct?.validity_period ?? null;
        if (validityDays && validityDays > 0) {
          const expiryDate = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
          exp = expiryDate.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } else {
          const expiryDate = new Date(Date.now() + 1460 * 24 * 60 * 60 * 1000);
          exp = expiryDate.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${vId}.pdf"`);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      doc.pipe(res);

      // Render the professional single-page voucher via the shared renderer.
      // (Design only — preview data resolution above is unchanged.)
      const paidPv = amount.toFixed(2) + ' ' + currency.toUpperCase();
      const dPv = new Date();
      const datePv = `${String(dPv.getDate()).padStart(2, '0')}.${String(dPv.getMonth() + 1).padStart(2, '0')}.${dPv.getFullYear()}`;
      await renderVoucherPdf(doc, {
        title,
        recipientName: name,
        fromName: from,
        message: note,
        voucherId: String(vId),
        sku: String(sku),
        expiry: exp,
        inclusions: (previewProduct?.description || previewProduct?.detailedDescription || previewProduct?.detailed_description || qp.product_description || '').toString(),
        heroImageUrl: customImageUrl,
        logoUrl: pvLogoUrl,
        bannerColor: pvBannerColor,
        bannerTextColor: pvBannerTextColor,
        fontFamily: pvFontFamily,
        termsText: pvTermsText,
        footerText: pvFooterText || getBizWebsite(),
        footerEmail: pvFooterEmail || getEnvContactEmailSync() || '',
        footerPhone: pvFooterPhone,
        paidAmount: paidPv,
        purchaseDate: datePv,
        // Preview the gift layout with ?gift=1 (or ?hide_value=1).
        hideValue: ['1', 'true', 'yes'].includes(String(qp.gift || qp.hide_value || '').toLowerCase()),
      });

      doc.end();
    } catch (e) {
      console.error('Voucher PDF preview failed', e);
      // Don't try to send error response if headers already sent
      if (!res.headersSent) {
        res.status(500).send('Failed to generate preview PDF');
      }
    }
  });

  // ==================== PRICE LIST ROUTES ====================
  app.get("/api/crm/price-list", async (req: Request, res: Response) => {
    try {
      // Fetch price list from database
      const priceList = await db.select().from(priceListItems).where(eq(priceListItems.isActive, true)).orderBy(priceListItems.category, priceListItems.name);
      
      // Convert decimal to number for API response
      const formattedPriceList = priceList.map(item => ({
        id: item.id,
        category: item.category,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price),
        currency: item.currency,
        taxRate: item.taxRate ? parseFloat(item.taxRate) : 0, // studio sets its own rate; no German default
        sku: item.sku,
        productCode: item.productCode,
        unit: item.unit,
        notes: item.notes,
        isActive: item.isActive
      }));

      res.json(formattedPriceList);
    } catch (error) {
      console.error("Error fetching price list:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create new price list item
  app.post("/api/crm/price-list", async (req: Request, res: Response) => {
    try {
      const newItem = await db.insert(priceListItems).values(req.body).returning();
      res.json(newItem[0]);
    } catch (error) {
      console.error("Error creating price list item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update price list item
  app.put("/api/crm/price-list/:id", async (req: Request, res: Response) => {
    try {
      const updatedItem = await db.update(priceListItems)
        .set(req.body)
        .where(eq(priceListItems.id, req.params.id))
        .returning();
      res.json(updatedItem[0]);
    } catch (error) {
      console.error("Error updating price list item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete price list item
  app.delete("/api/crm/price-list/:id", async (req: Request, res: Response) => {
    try {
      await db.delete(priceListItems).where(eq(priceListItems.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting price list item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Import price list from CSV
  app.post("/api/crm/price-list/import", async (req: Request, res: Response) => {
    try {
      const { items } = req.body;
      
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items must be an array" });
      }

      // Validate and format items
      const formattedItems = items.map((item: any) => ({
        name: item.name || item.Name || '',
        description: item.description || item.Description || '',
        category: item.category || item.Category || 'GENERAL',
        price: item.price || item.Price || '0',
        currency: item.currency || item.Currency || 'EUR',
        taxRate: item.taxRate || item.TaxRate || '0.00', // studio sets its own rate; no German default
        sku: item.sku || item.SKU || '',
        productCode: item.productCode || item.ProductCode || '',
        unit: item.unit || item.Unit || 'piece',
        notes: item.notes || item.Notes || '',
        isActive: item.isActive !== undefined ? item.isActive : true
      }));

      // Insert into database
      const insertedItems = await db.insert(priceListItems).values(formattedItems).returning();
      
      res.json({ 
        success: true, 
        imported: insertedItems.length,
        items: insertedItems 
      });
    } catch (error) {
      console.error("Error importing price list:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get original hardcoded price list (for migration/reference)
  app.get("/api/crm/price-list/legacy", async (req: Request, res: Response) => {
    try {
      // Complete New Age Fotografie price list based on official price guide
      const priceList = [
        // PRINTS Section
        {
          id: 'print-15x10',
          category: 'PRINTS',
          name: '15 x 10cm',
          description: 'Print 15 x 10cm',
          price: 35.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'print-10er-box',
          category: 'PRINTS',
          name: '10er 15 x 10cm + Gift Box',
          description: '10er 15 x 10cm + Geschenkbox',
          price: 300.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'print-20x30-a4',
          category: 'PRINTS',
          name: '20 x 30cm (A4)',
          description: 'Print 20 x 30cm (A4 Format)',
          price: 59.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'print-30x40-a3',
          category: 'PRINTS',
          name: '30 x 40cm (A3)',
          description: 'Print 30 x 40cm (A3 Format)',
          price: 79.00,
          currency: 'EUR',
          is_active: true
        },

        // LEINWAND Section
        {
          id: 'canvas-30x20-a4',
          category: 'LEINWAND',
          name: '30 x 20cm (A4)',
          description: 'Leinwand 30 x 20cm (A4 Format)',
          price: 75.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'canvas-40x30-a3',
          category: 'LEINWAND',
          name: '40 x 30cm (A3)',
          description: 'Leinwand 40 x 30cm (A3 Format)',
          price: 105.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'canvas-60x40-a2',
          category: 'LEINWAND',
          name: '60 x 40cm (A2)',
          description: 'Leinwand 60 x 40cm (A2 Format)',
          price: 145.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'canvas-70x50',
          category: 'LEINWAND',
          name: '70 x 50cm',
          description: 'Leinwand 70 x 50cm',
          price: 185.00,
          currency: 'EUR',
          is_active: true
        },

        // LUXUSRAHMEN Section
        {
          id: 'luxury-frame-a2-black',
          category: 'LUXUSRAHMEN',
          name: 'A2 (60 x 40cm) Leinwand in schwarzem Holzrahmen',
          description: 'A2 (60 x 40cm) Leinwand in schwarzem Holzrahmen',
          price: 190.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'luxury-frame-40x40',
          category: 'LUXUSRAHMEN',
          name: '40 x 40cm Bildrahmen',
          description: '40 x 40cm Bildrahmen',
          price: 145.00,
          currency: 'EUR',
          is_active: true
        },

        // DIGITAL Section
        {
          id: 'digital-1-bild',
          category: 'DIGITAL',
          name: '1 Bild',
          description: '1 Digitales Bild',
          price: 35.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'digital-10x-paket',
          category: 'DIGITAL',
          name: '10x Paket',
          description: '10 Digitale Bilder Paket',
          price: 295.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'digital-15x-paket',
          category: 'DIGITAL',
          name: '15x Paket',
          description: '15 Digitale Bilder Paket',
          price: 365.00,
          currency: 'EUR',
          is_active: true
        },
        {
          id: 'digital-20x-paket',
          category: 'DIGITAL',
          name: '20x Paket',
          description: '20 Digitale Bilder Paket',
          price: 395.00,
          currency: 'EUR',
          notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
          is_active: true
        },
        {
          id: 'digital-25x-paket',
          category: 'DIGITAL',
          name: '25x Paket',
          description: '25 Digitale Bilder Paket',
          price: 445.00,
          currency: 'EUR',
          notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
          is_active: true
        },
        {
          id: 'digital-30x-paket',
          category: 'DIGITAL',
          name: '30x Paket',
          description: '30 Digitale Bilder Paket',
          price: 490.00,
          currency: 'EUR',
          notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
          is_active: true
        },
        {
          id: 'digital-35x-paket',
          category: 'DIGITAL',
          name: '35x Paket',
          description: '35 Digitale Bilder Paket',
          price: 525.00,
          currency: 'EUR',
          notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
          is_active: true
        },
        {
          id: 'digital-alle-portraits',
          category: 'DIGITAL',
          name: 'Alle Porträts Insgesamt',
          description: 'Alle Porträts Insgesamt',
          price: 595.00,
          currency: 'EUR',
          notes: 'Leinwände Format A2 & 70x50cm 1 + 1 gratis',
          is_active: true
        },

        // EXTRAS Section
        {
          id: 'shooting-ohne-gutschein',
          category: 'EXTRAS',
          name: 'Shooting ohne Gutschein',
          description: 'Shooting ohne Gutschein',
          price: 95.00,
          currency: 'EUR',
          notes: 'Kostenlose Versand',
          is_active: true
        }
      ];
      
      res.json(priceList);
    } catch (error) {
      console.error("Error fetching price list:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== PRICE GUIDE DOCUMENT UPLOAD ====================
  
  // Upload price guide document (PDF, JPG, Word) to Backblaze B2
  app.post("/api/crm/price-guide/upload", authenticateUser, documentUpload.single('file'), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const s3Config = getS3Config();
      const s3 = getS3Client();
      const ext = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
      const timestamp = Date.now();
      const key = `price-guides/price-guide-${timestamp}${ext}`;

      await s3.send(new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }));

      const publicUrl = buildPublicUrl(s3Config.bucket, s3Config.endpoint, key);

      console.log(`[Price Guide] Uploaded: ${file.originalname} -> ${publicUrl}`);

      res.json({
        success: true,
        url: publicUrl,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
    } catch (error) {
      console.error("Error uploading price guide:", error);
      res.status(500).json({ error: "Failed to upload price guide" });
    }
  });

  // Get/set price guide metadata (stored in a simple key-value approach using studio_configs notes)
  app.get("/api/crm/price-guide/info", async (req: Request, res: Response) => {
    try {
      // Try to get from database - we'll store as a simple JSON in a known location
      const result = await db.select().from(priceListItems).where(eq(priceListItems.category, '__PRICE_GUIDE_DOC__')).limit(1);
      if (result.length > 0) {
        const meta = result[0];
        res.json({
          url: meta.description || '',
          filename: meta.name || '',
          mimetype: meta.unit || '',
          uploadedAt: meta.createdAt,
        });
      } else {
        res.json({ url: null, filename: null });
      }
    } catch (error) {
      console.error("Error fetching price guide info:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Save price guide metadata after upload
  app.post("/api/crm/price-guide/save-info", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { url, filename, mimetype } = req.body;
      
      // Delete old metadata entry
      await db.delete(priceListItems).where(eq(priceListItems.category, '__PRICE_GUIDE_DOC__'));
      
      // Insert new entry with metadata 
      await db.insert(priceListItems).values({
        name: filename || 'Price Guide',
        description: url,
        category: '__PRICE_GUIDE_DOC__',
        price: '0',
        unit: mimetype || 'application/pdf',
        isActive: false, // Hidden from normal price list queries (which filter isActive=true)
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error saving price guide info:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== KNOWLEDGE BASE ROUTES ====================
  app.get("/api/knowledge-base", authenticateUser, async (req: Request, res: Response) => {
    try {
      const entries = await db.select().from(knowledgeBase);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/knowledge-base", authenticateUser, async (req: Request, res: Response) => {
    try {
      const result = insertKnowledgeBaseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues });
      }

      // Ensure tags is an array per schema
      const kbData = {
        ...result.data,
        tags: Array.isArray(result.data.tags) ? result.data.tags : (result.data.tags ? [result.data.tags] : []),
      } as any;

  const kbInsertRes: any = await db.insert(knowledgeBase).values(kbData).returning() as any;
  const entry = Array.isArray(kbInsertRes) ? kbInsertRes[0] : (kbInsertRes?.rows?.[0] ?? kbInsertRes);

  res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating knowledge base entry:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/knowledge-base/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const result = insertKnowledgeBaseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues });
      }

      const updateData = {
        ...result.data,
        tags: Array.isArray(result.data.tags) ? result.data.tags : (result.data.tags ? [result.data.tags] : []),
        updatedAt: new Date(),
      } as any;

      const kbUpdateRes: any = await db.update(knowledgeBase)
        .set(updateData)
        .where(eq(knowledgeBase.id, req.params.id))
        .returning() as any;
      const entry = Array.isArray(kbUpdateRes) ? kbUpdateRes[0] : (kbUpdateRes?.rows?.[0] ?? kbUpdateRes);

      if (!entry) {
        return res.status(404).json({ error: "Knowledge base entry not found" });
      }

      res.json(entry);
    } catch (error) {
      console.error("Error updating knowledge base entry:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/knowledge-base/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const kbDeleteRes: any = await db.delete(knowledgeBase)
        .where(eq(knowledgeBase.id, req.params.id))
        .returning() as any;
      const entry = Array.isArray(kbDeleteRes) ? kbDeleteRes[0] : (kbDeleteRes?.rows?.[0] ?? kbDeleteRes);

      if (!entry) {
        return res.status(404).json({ error: "Knowledge base entry not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting knowledge base entry:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== QUESTIONNAIRE/SURVEY ROUTES ====================
  
  // Get all surveys (questionnaire templates)
  app.get("/api/surveys", authenticateUser, async (req: Request, res: Response) => {
    try {
      const surveys = await runSql('SELECT * FROM surveys ORDER BY created_at DESC');
      res.json({ surveys, total: surveys.length, page: 1, limit: 50 });
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create a new survey / questionnaire
  app.post("/api/surveys", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { title, description, pages, settings } = req.body;
      if (!title) return res.status(400).json({ error: 'Title is required' });

      const id = require('crypto').randomUUID();
      const rows = await runSql(
        `INSERT INTO surveys (id, title, description, status, pages, settings, created_at, updated_at)
         VALUES ($1, $2, $3, 'active', $4, $5, NOW(), NOW())
         RETURNING *`,
        [id, title, description || '', JSON.stringify(pages || []), JSON.stringify(settings || {})]
      );
      res.json({ survey: rows[0] });
    } catch (error) {
      console.error("Error creating survey:", error);
      res.status(500).json({ error: "Failed to create survey" });
    }
  });

  // Update an existing survey / questionnaire
  app.put("/api/surveys/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, pages, settings, status } = req.body;
      const rows = await runSql(
        `UPDATE surveys SET title = COALESCE($1, title), description = COALESCE($2, description),
         pages = COALESCE($3, pages), settings = COALESCE($4, settings),
         status = COALESCE($5, status), updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [title || null, description ?? null, pages ? JSON.stringify(pages) : null, settings ? JSON.stringify(settings) : null, status || null, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Survey not found' });
      res.json({ survey: rows[0] });
    } catch (error) {
      console.error("Error updating survey:", error);
      res.status(500).json({ error: "Failed to update survey" });
    }
  });

  // Delete a survey / questionnaire
  app.delete("/api/surveys/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const rows = await runSql('DELETE FROM surveys WHERE id = $1 RETURNING id', [id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Survey not found' });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting survey:", error);
      res.status(500).json({ error: "Failed to delete survey" });
    }
  });

  // Create questionnaire link for client
  app.post("/api/admin/create-questionnaire-link", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { client_id, template_id } = req.body;
      const effectiveClientId = client_id || 'anonymous';

      // Generate short token (16 hex chars)
      const token = require('crypto').randomBytes(8).toString('hex');
      
      // Set expiration to 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      // Insert questionnaire link
      await runSql(
        'INSERT INTO questionnaire_links (token, client_id, template_id, expires_at) VALUES ($1, $2, $3, $4)',
        [token, effectiveClientId, template_id || 'default-questionnaire', expiresAt]
      );
      
      // Generate public URL from request origin or env var
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || '';
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_URL || `${protocol}://${host}`;
      const link = `${baseUrl}/q/${token}`;
      
      res.json({ token, link });
    } catch (error) {
      console.error("Error creating questionnaire link:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get questionnaire by token (public endpoint)
  app.get("/api/questionnaire/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Get questionnaire link details
      const linkResult = await runSql(
        `SELECT ql.*, c.first_name, c.last_name, c.email 
         FROM questionnaire_links ql 
         LEFT JOIN crm_clients c ON ql.client_id = c.id::text 
         WHERE ql.token = $1 AND (ql.expires_at IS NULL OR ql.expires_at > NOW())`,
        [token]
      );
      
      if (linkResult.length === 0) {
        return res.status(404).json({ error: "Questionnaire not found or expired" });
      }
      
      const link = linkResult[0];
      
      // Get the questionnaire template
      const surveyResult = await runSql(
        'SELECT * FROM surveys WHERE id = $1',
        [link.template_id || 'default-questionnaire']
      );
      
      if (surveyResult.length === 0) {
        return res.status(404).json({ error: "Questionnaire template not found" });
      }
      
      const survey = surveyResult[0];
      
      // Parse pages and ensure all questions have required flag set
      let surveyPages = typeof survey.pages === 'string' ? JSON.parse(survey.pages) : (survey.pages || []);
      if (Array.isArray(surveyPages)) {
        surveyPages = surveyPages.map((page: any) => ({
          ...page,
          questions: (page.questions || []).map((q: any) => ({
            ...q,
            required: q.required !== false // default to true if not explicitly false
          }))
        }));
      }
      
      res.json({
        token,
        clientName: `${link.first_name || ''} ${link.last_name || ''}`.trim(),
        clientEmail: link.email || '',
        isUsed: link.is_used,
        survey: {
          title: survey.title,
          description: survey.description || 'Bitte fülle den Fragebogen so detailliert wie möglich aus.',
          pages: surveyPages,
          settings: typeof survey.settings === 'string' ? JSON.parse(survey.settings) : (survey.settings || {})
        }
      });
    } catch (error) {
      console.error("Error fetching questionnaire:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Submit questionnaire response (public endpoint)
  app.post("/api/email-questionnaire", async (req: Request, res: Response) => {
    try {
      const { token, clientName, clientEmail, answers } = req.body;
      
      if (!token || !answers) {
        return res.status(400).json({ error: "Missing required fields (token and answers)" });
      }
      
      if (!clientName || !clientName.trim()) {
        return res.status(400).json({ error: "Name is required. Please provide your name." });
      }
      
      // Verify token and get client info
      const linkResult = await runSql(
        `SELECT ql.*, c.first_name, c.last_name 
         FROM questionnaire_links ql 
         LEFT JOIN crm_clients c ON ql.client_id = c.id::text 
         WHERE ql.token = $1 AND (ql.expires_at IS NULL OR ql.expires_at > NOW()) AND ql.is_used = FALSE`,
        [token]
      );
      
      if (linkResult.length === 0) {
        return res.status(404).json({ error: "Invalid or expired questionnaire link" });
      }
      
      const link = linkResult[0];
      
      // Store response in database (include client name and email)
      await runSql(
        'INSERT INTO questionnaire_responses (client_id, token, template_slug, answers, client_name, client_email) VALUES ($1, $2, $3, $4, $5, $6)',
        [link.client_id, token, link.template_id, JSON.stringify(answers), clientName, clientEmail]
      );
      
      // Mark link as used
      await runSql('UPDATE questionnaire_links SET is_used = TRUE WHERE token = $1', [token]);
      
      // Send studio notification email
      try {
        const { sendStudioNotificationEmail, sendClientConfirmationEmail } = await import('./utils/emailService');
        
        // Send studio notification
        await sendStudioNotificationEmail(clientName, clientEmail, answers, link);
        
        // Send client confirmation
        await sendClientConfirmationEmail(clientEmail, clientName);
        
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        // Don't fail the response if email fails, just log it
      }
      
      res.json({ success: true, message: "Questionnaire submitted successfully" });
    } catch (error) {
      console.error("Error submitting questionnaire:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== OPENAI ASSISTANTS ROUTES ====================
  app.get("/api/openai/assistants", authenticateUser, async (req: Request, res: Response) => {
    try {
      const assistants = await db.select().from(openaiAssistants);
      res.json(assistants);
    } catch (error) {
      console.error("Error fetching OpenAI assistants:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/openai/assistants", authenticateUser, async (req: Request, res: Response) => {
    try {
      const result = insertOpenaiAssistantSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues });
      }

      // Create OpenAI Assistant via API if API key is available
      let openaiAssistantId = null;
      if (process.env.OPENAI_API_KEY) {
        try {
          const openaiResponse = await fetch('https://api.openai.com/v1/assistants', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2'
            },
            body: JSON.stringify({
              name: result.data.name,
              description: result.data.description,
              model: result.data.model || 'gpt-4o',
              instructions: result.data.instructions,
            })
          });

          if (openaiResponse.ok) {
            const openaiAssistant = await openaiResponse.json();
            openaiAssistantId = openaiAssistant.id;
          } else {
            console.error("OpenAI API error:", await openaiResponse.text());
          }
        } catch (openaiError) {
          console.error("Failed to create OpenAI assistant:", openaiError);
        }
      }

      const assistantData = {
        name: result.data.name,
        instructions: result.data.instructions,
        description: result.data.description || '',
        model: result.data.model || 'gpt-4o',
        isActive: typeof result.data.isActive === 'boolean' ? result.data.isActive : true,
        knowledgeBaseIds: Array.isArray(result.data.knowledgeBaseIds) ? result.data.knowledgeBaseIds : (result.data.knowledgeBaseIds ? [result.data.knowledgeBaseIds] : []),
        openaiAssistantId,
        createdBy: req.user.id,
  } as any;

  const assistantInsertRes: any = await db.insert(openaiAssistants).values(assistantData).returning() as any;
  const assistant = Array.isArray(assistantInsertRes) ? assistantInsertRes[0] : (assistantInsertRes?.rows?.[0] ?? assistantInsertRes);

      res.status(201).json(assistant);
    } catch (error) {
      console.error("Error creating OpenAI assistant:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/openai/assistants/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const result = insertOpenaiAssistantSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.issues });
      }

      const updateAssistant = {
        ...result.data,
        isActive: typeof result.data.isActive === 'boolean' ? result.data.isActive : undefined,
        updatedAt: new Date(),
  } as any;

  const assistantUpdateRes: any = await db.update(openaiAssistants)
    .set(updateAssistant)
    .where(eq(openaiAssistants.id, req.params.id))
    .returning() as any;
  const assistant = Array.isArray(assistantUpdateRes) ? assistantUpdateRes[0] : (assistantUpdateRes?.rows?.[0] ?? assistantUpdateRes);

  if (!assistant) {
        return res.status(404).json({ error: "OpenAI assistant not found" });
      }

      res.json(assistant);
    } catch (error) {
      console.error("Error updating OpenAI assistant:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/openai/assistants/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const assistantDeleteRes: any = await db.delete(openaiAssistants)
        .where(eq(openaiAssistants.id, req.params.id))
        .returning() as any;
      const assistant = Array.isArray(assistantDeleteRes) ? assistantDeleteRes[0] : (assistantDeleteRes?.rows?.[0] ?? assistantDeleteRes);

      if (!assistant) {
        return res.status(404).json({ error: "OpenAI assistant not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting OpenAI assistant:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== OPENAI CHAT ROUTES ====================
  app.post("/api/openai/chat/thread", async (req: Request, res: Response) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ error: "OpenAI API key not configured" });
      }

      const response = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const thread = await response.json();
      res.json({ threadId: thread.id });
    } catch (error) {
      console.error("Error creating thread:", error);
      res.status(500).json({ error: "Failed to create thread" });
    }
  });

  app.post("/api/openai/chat/message", async (req: Request, res: Response) => {
    try {
      const { message, threadId, assistantId } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ error: "OpenAI API key not configured" });
      }

      if (!threadId) {
        return res.status(400).json({ error: "Thread ID is required" });
      }

      // Use the provided assistantId or default to the CRM assistant
      const finalAssistantId = assistantId || 'asst_CH4vIbZPs7gUD36Lxf7vlfIV';
      console.log('Using assistant ID:', finalAssistantId);

      // Add message to thread
      await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: message
        })
      });

      // Create run with assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          assistant_id: finalAssistantId
        })
      });

      if (!runResponse.ok) {
        throw new Error(`Run creation failed: ${runResponse.status}`);
      }

      const run = await runResponse.json();

      // Poll for completion
      let runStatus = run.status;
      let attempts = 0;
      const maxAttempts = 30;

      while ((runStatus === 'queued' || runStatus === 'in_progress') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;

        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${run.id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          runStatus = statusData.status;
        }
      }

      // Get messages
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });

      if (!messagesResponse.ok) {
        throw new Error(`Failed to get messages: ${messagesResponse.status}`);
      }

      const messagesData = await messagesResponse.json();
      const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant');

      if (!assistantMessage) {
        throw new Error('No assistant response found');
      }

      const aiResponse = assistantMessage.content[0]?.text?.value || 'Sorry, I could not process your request.';
      res.json({ response: aiResponse });

    } catch (error) {
      console.error("Error sending message:", error);
      
      // Provide CRM-focused fallback response for admin users
      const crmFallbackResponse = generateCRMFallbackResponse(req.body.message);
      res.json({ response: crmFallbackResponse });
    }
  });

  function generateCRMFallbackResponse(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('client') || lowerMessage.includes('kunden') || lowerMessage.includes('customer')) {
      return `I can help you manage clients in your CRM system:

• **View all clients**: Go to Clients page to see your complete client database
• **Add new client**: Use the "New Client" button to create client records
• **Import clients**: Bulk import from CSV/Excel files
• **Client details**: View contact info, booking history, and revenue data
• **High-value clients**: See your top clients by revenue

What specific client management task can I help you with?`;
    }
    
    if (lowerMessage.includes('invoice') || lowerMessage.includes('rechnung') || lowerMessage.includes('payment')) {
      return `I can assist with invoice and payment management:

• **Create invoices**: Generate professional invoices with company branding
• **Track payments**: Monitor paid, pending, and overdue invoices
• **Send invoices**: Email invoices directly to clients
• **Payment status**: Update payment status and track revenue
• **Download invoices**: Generate PDF copies for your records

Which invoice task would you like help with?`;
    }
    
    if (lowerMessage.includes('booking') || lowerMessage.includes('appointment') || lowerMessage.includes('calendar') || lowerMessage.includes('termin')) {
      return `I can help you manage bookings and appointments:

• **View calendar**: See all upcoming photography sessions
• **Schedule sessions**: Book new client appointments
• **Manage availability**: Update your booking calendar
• **Session details**: Track session types, locations, and requirements
• **Client communications**: Send booking confirmations and reminders

What booking management task can I assist with?`;
    }
    
    if (lowerMessage.includes('email') || lowerMessage.includes('mail') || lowerMessage.includes('message')) {
      return `I can help with email and communication management:

• **Inbox management**: View and organize client emails
• **Send emails**: Compose and send professional communications
• **Email campaigns**: Create marketing campaigns for clients
• **Templates**: Use predefined templates for common responses
• **Lead notifications**: Track new lead inquiries automatically

What email task would you like assistance with?`;
    }
    
    if (lowerMessage.includes('report') || lowerMessage.includes('analytics') || lowerMessage.includes('revenue') || lowerMessage.includes('dashboard')) {
      return `I can help you with business analytics and reporting:

• **Revenue reports**: Track total revenue and payment status
• **Client analytics**: See your highest-value clients and booking patterns
• **Performance metrics**: Monitor business growth and key indicators
• **Dashboard overview**: Get a quick summary of your business status
• **Export data**: Download reports for external analysis

Which analytics or reporting task can I help you with?`;
    }
    
    return `Hello! I'm your CRM Operations Assistant. I can help you with:

• **Client Management**: Add, edit, and organize client records
• **Invoice Processing**: Create, send, and track invoices and payments
• **Booking Management**: Schedule appointments and manage your calendar
• **Email Communications**: Handle inbox, send emails, and manage campaigns
• **Business Analytics**: Generate reports and track performance metrics
• **Data Management**: Import/export client data and manage databases

What would you like help with today? Just describe the task and I'll guide you through it.`;
  }

  function generateFallbackResponse(message: string, knowledgeArticles: any[] = []): string {
    const lowerMessage = message.toLowerCase();
    
    // Search knowledge base for relevant content
    const relevantArticle = knowledgeArticles.find(article => 
      lowerMessage.includes(article.title.toLowerCase()) ||
      article.content.toLowerCase().includes(lowerMessage) ||
      article.tags.some((tag: string) => lowerMessage.includes(tag.toLowerCase()))
    );
    
    if (lowerMessage.includes('preis') || lowerMessage.includes('kosten') || lowerMessage.includes('price') || lowerMessage.includes('much') || lowerMessage.includes('cost')) {
      return `Gerne teile ich Ihnen unsere aktuellen Preise mit! 📸

**Professionelle Fotoshootings:**
• Kleines Paket: 1 Foto + Datei + 40x30cm Leinwand: €95
• Standard Paket: 5 Fotos + Dateien + 60x40cm Leinwand: €95  
• Premium Paket: 10 Fotos + Dateien + 70x50cm Leinwand: €295
• Digital Paket: 10 digitale Bilder: €250 - **BESTSELLER!**

**Alle Pakete inkludieren:**
• 60 Minuten professionelles Fotoshooting
• Willkommensgetränk und Beratung
• Outfit-Wechsel möglich
• Bis zu 12 Erwachsene + 4 Kinder
• Haustiere willkommen! 🐕

**Direkter Kontakt:**
WhatsApp: +43 677 633 99210
Email: ${getEnvContactEmailSync()}

Welches Paket interessiert Sie am meisten?`;
    }
    
    if (lowerMessage.includes('termin') || lowerMessage.includes('booking') || lowerMessage.includes('buchung')) {
      return `Sehr gerne helfe ich Ihnen bei der Terminbuchung! 📅

Wir sind meistens ausgebucht, aber ich kann Sie gerne auf unsere Warteliste setzen. Oft bekommen wir kurzfristig Termine frei!

**So geht's:**
1. Geben Sie mir Ihre WhatsApp Nummer: +43 677 633 99210
2. Nennen Sie mir Ihre Wunschtermine
3. Ich melde mich bei Ihnen sobald ein Platz frei wird

**Online Kalender:** https://newagefotografie.sproutstudio.com/invitation/live-link-shootings-new-age-fotografie

Welche Art von Shooting interessiert Sie? Familie, Neugeborene, Schwangerschaft oder Business?`;
    }
    
    if (lowerMessage.includes('hallo') || lowerMessage.includes('hi') || lowerMessage.includes('guten tag')) {
      return `Hallo! Schön, dass Sie da sind! 😊

Ich bin Alex von ${getBizName()} Wien. Wir sind spezialisiert auf:
• Familienfotografie
• Neugeborenen-Shootings  
• Schwangerschaftsfotos
• Business-Headshots

Wie kann ich Ihnen heute helfen? Haben Sie Fragen zu unseren Preisen, möchten Sie einen Termin vereinbaren oder brauchen Sie andere Informationen?

WhatsApp: +43 677 633 99210`;
    }

    if (lowerMessage.includes('familien') || lowerMessage.includes('family') || lowerMessage.includes('familie')) {
      return `Familienfotografie ist unsere Spezialität! 👨‍👩‍👧‍👦

**Familienfotos Pakete:**
• Kleines Paket: 1 Foto + Datei + 40x30cm Leinwand: €95
• Mittleres Paket: 5 Fotos + Dateien + 60x40cm Leinwand: €95  
• Großes Paket: 10 Fotos + Dateien + 70x50cm Leinwand: €295
• 10er Paket (nur digitale Bilder): €250 - **BESTSELLER!**

**Inklusive:**
• 60 Min professionelles Fotoshooting
• Willkommensgetränk & Beratung
• Outfit-Wechsel möglich
• Bis zu 12 Erwachsene + 4 Kinder
• Haustiere willkommen! 🐕

Termin buchen: WhatsApp +43 677 633 99210`;
    }
    
    if (lowerMessage.includes('location') || lowerMessage.includes('adresse') || lowerMessage.includes('wo')) {
      return `Wir haben Studios in Wien und Zürich! 📍

**Studio Wien:**
Schönbrunner Str. 25, 1050 Wien
(5 Minuten von Kettenbrückengasse, Parkplätze verfügbar)

**Kontakt:**
WhatsApp: +43 677 633 99210
Email: ${getEnvContactEmailSync()}

**Öffnungszeiten:**
Freitag - Sonntag: 09:00 - 17:00

Möchten Sie einen Termin vereinbaren?`;
    }
    
    // If we found a relevant article, use it intelligently
    if (relevantArticle) {
      // Extract specific pricing info from knowledge base if it's about pricing
      if (lowerMessage.includes('preis') || lowerMessage.includes('kosten') || lowerMessage.includes('price') || lowerMessage.includes('much')) {
        return `Gerne teile ich Ihnen unsere aktuellen Preise mit! 📸

**Professionelle Fotoshootings:**
• Kleines Paket: 1 Foto + Datei + 40x30cm Leinwand: €95
• Standard Paket: 5 Fotos + Dateien + 60x40cm Leinwand: €95  
• Premium Paket: 10 Fotos + Dateien + 70x50cm Leinwand: €295
• Digital Paket: 10 digitale Bilder: €250 - **BESTSELLER!**

**Alle Pakete inkludieren:**
• 60 Minuten professionelles Fotoshooting
• Willkommensgetränk und Beratung
• Outfit-Wechsel möglich
• Bis zu 12 Erwachsene + 4 Kinder
• Haustiere willkommen! 🐕

**Direkter Kontakt:**
WhatsApp: +43 677 633 99210
Email: ${getEnvContactEmailSync()}`;
      }
      
      // For general questions, provide focused response based on article content
      return `Basierend auf Ihrem Interesse kann ich Ihnen folgende Informationen geben:

Als Ihr Photo Consultant bei ${getBizName()} unterstütze ich Sie gerne bei allen Fragen rund um professionelle Fotoshootings in Wien.

**Unsere Spezialgebiete:**
• Familienfotografie & Kinderporträts
• Neugeborenen-Shootings
• Schwangerschaftsfotos (Babybauch)
• Business-Headshots & Corporate Fotografie

**Studio Wien:**
Schönbrunner Str. 25, 1050 Wien
(5 Min von Kettenbrückengasse)

**Direkter Kontakt:**
WhatsApp: +43 677 633 99210
Email: ${getEnvContactEmailSync()}

Was interessiert Sie am meisten? Preise, Terminbuchung oder spezielle Fotoshootings?`;
    }
    
    return `Vielen Dank für Ihre Nachricht! 😊

Ich bin Alex von ${getBizName()} Wien. Gerne helfe ich Ihnen bei:
• **Preisanfragen** (ab €95 für Foto-Pakete)
• **Terminbuchungen** (meist ausgebucht, aber Warteliste verfügbar)  
• **Informationen** über unsere Services

**Direkter Kontakt:**
WhatsApp: +43 677 633 99210
Email: ${getEnvContactEmailSync()}

Was interessiert Sie am meisten?`;
  }

  // ==================== CHAT LEADS TRACKING ====================
  app.post("/api/chat/save-lead", async (req: Request, res: Response) => {
    try {
  const { name, email, phone, message, conversation } = req.body;
      
  const leadInsertRes: any = await db.insert(crmLeads).values({
        name: name || 'Chat Visitor',
        email: email || '',
        phone: phone || '',
        message: message || '',
        source: 'Website Chat',
        status: 'new',
        priority: 'medium',
        value: 0,
        tags: ['chat', 'website'],
        followUpDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  } as any).returning() as any;
  const lead = Array.isArray(leadInsertRes) ? leadInsertRes[0] : (leadInsertRes?.rows?.[0] ?? leadInsertRes);

      // If conversation history exists, save it as a message
      if (conversation && conversation.length > 0) {
        const conversationText = conversation.map((msg: any) => 
          `${msg.isUser ? 'Kunde' : 'Alex'}: ${msg.text}`
        ).join('\n');
        
  await db.insert(crmMessages).values({
          senderName: name || 'Chat Visitor',
          senderEmail: email || 'chat@website.com',
          subject: 'Website Chat Conversation',
          content: conversationText,
          status: 'unread',
          clientId: null,
          assignedTo: null,
  } as any);
      }

      res.json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("Error saving chat lead:", error);
      res.status(500).json({ error: "Failed to save lead" });
    }
  });

  // Helper function to generate voucher codes
  function generateVoucherCode(): string {
    return 'NAF-' + Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  // Helper function to send voucher email
  async function sendVoucherEmail(voucherSale: any) {
    try {
      console.log(`Sending voucher email to ${voucherSale.customerEmail}`);
      console.log(`Voucher code: ${voucherSale.voucherCode}`);
      
      // Integration with existing email system
      // This would send a professional voucher email with the code
    } catch (error) {
      console.error('Error sending voucher email:', error);
    }
  }

  // ==================== AUTOBLOG ROUTES ====================
  // Set up multer for file uploads
  const autoblogUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 3 // Maximum 3 images
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed') as any, false);
      }
    }
  });

  // AutoBlog status endpoint
  app.get("/api/autoblog/status", async (req: Request, res: Response) => {
    try {
      res.json({
        available: !!process.env.OPENAI_API_KEY,
        maxImages: 3,
        supportedLanguages: ['de', 'en'],
        features: ['AI Content Generation', 'SEO Optimization', 'Multi-language Support', 'Direct Chat Interface']
      });
    } catch (error) {
      console.error('AutoBlog status error:', error);
      res.status(500).json({ error: 'Failed to get AutoBlog status' });
    }
  });

  // AutoBlog generation endpoint
  // FIX #2: AutoBlog route now exclusively uses TOGNINJA Assistant API (Fix from expert analysis)
  app.post("/api/autoblog/generate", authenticateUser, autoblogUpload.array('images', 3), async (req: Request, res: Response) => {
    try {
      const { AutoBlogOrchestrator } = await import('./autoblog');
      const { autoBlogInputSchema } = await import('./autoblog-schema');
      
      // FIX #2: Parse ALL form data properly
      const input = autoBlogInputSchema.parse({
        contentGuidance: req.body.contentGuidance || req.body.userPrompt, // Support both field names
        language: req.body.language || 'de',
        siteUrl: req.body.siteUrl,
        publishOption: req.body.publishOption || 'draft',
        scheduledFor: req.body.scheduledFor,
        customSlug: req.body.customSlug
      });

      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'At least one image is required' 
        });
      }

      // Get user ID for blog post creation
      const authorId = req.user?.id;
      if (!authorId) {
        return res.status(401).json({ 
          success: false, 
          error: 'User authentication required' 
        });
      }

      // Initialize AutoBlog orchestrator
      const orchestrator = new AutoBlogOrchestrator();
      
      // FIX #2: Pass ALL form data to orchestrator including images and guidance
      console.log('🔧 FIX #2: Passing complete form data to AutoBlog orchestrator...');
      console.log('Form data received:', {
        contentGuidance: input.contentGuidance,
        language: input.language,
        siteUrl: input.siteUrl,
        publishOption: input.publishOption,
        customSlug: input.customSlug,
        imageCount: req.files?.length || 0
      });

      // Generate blog post with complete form data
      const result = await orchestrator.generateAutoBlog(
        req.files as Express.Multer.File[],
        input,
        authorId,
        "e5dc81e8-7073-4041-8814-affb60f4ef6c" // pass studio ID for assistant lookup
      );

      res.json(result);
    } catch (error) {
      console.error('AutoBlog generation error:', error);
      
      let errorMessage = 'Failed to generate blog post';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        success: false, 
        error: errorMessage 
      });
    }
  });

  // AutoBlog Chat Interface - OpenAI Assistant API Communication
  app.post("/api/autoblog/chat", authenticateUser, autoblogUpload.array('images', 3), async (req: Request, res: Response) => {
    try {
      const { 
        message, 
        assistantId, 
        threadId, 
        publishOption = 'draft',
        customSlug,
        scheduledFor 
      } = req.body;
      const images = req.files as Express.Multer.File[];

      console.log('AutoBlog Assistant chat request:', { message, assistantId, threadId, imageCount: images?.length || 0 });

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: 'OpenAI API key not configured' });
      }

      if (!assistantId) {
        return res.status(400).json({ error: 'Assistant ID is required' });
      }

      // Import centralized config and debugging setup
      const { BLOG_ASSISTANT, DEBUG_OPENAI } = await import('./config');
      
      // Initialize OpenAI Assistant API with debug logging
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });
      
      if (DEBUG_OPENAI) {
        // Some OpenAI client implementations may not expose these properties in types
        (openai as any).baseURL = "https://api.openai.com/v1";
        (openai as any).defaultHeaders = { ...((openai as any).defaultHeaders || {}), "x-openai-debug": "true" };
      }

      // DIAGNOSTIC CHECK #1: Verify assistant ID
      console.dir({
        requestedAssistantId: assistantId, 
        configuredAssistantId: BLOG_ASSISTANT,
        match: assistantId === BLOG_ASSISTANT
      }, {depth: 2});

      // Force use of correct assistant ID
      const correctAssistantId = BLOG_ASSISTANT;

      // Create or retrieve thread
      let currentThreadId = threadId;
      if (!currentThreadId) {
        try {
          const thread = await openai.beta.threads.create();
          currentThreadId = thread.id;
          console.log('Created new thread:', currentThreadId);
        } catch (threadError) {
          console.error('Error creating thread:', threadError);
          throw new Error('Failed to create conversation thread');
        }
      }

      // Prepare message content for Assistant API
      let messageContent: any[] = [];
      
      if (message && message.trim()) {
        messageContent.push({
          type: "text",
          text: message
        });
      }

      // Handle image uploads for Assistant API with file upload approach
      if (images && images.length > 0) {
        console.log(`Processing ${images.length} images for Assistant API`);
        
        for (const image of images) {
          try {
            // Upload file to OpenAI for Assistant API
            const fileUpload = await openai.files.create({
              file: fs.createReadStream(image.path),
              purpose: "assistants"
            });
            
            messageContent.push({
              type: "image_file",
              image_file: { file_id: fileUpload.id }
            });
            
            console.log(`Uploaded file to OpenAI: ${fileUpload.id} for ${image.originalname}`);
          } catch (imageError) {
            console.error('Error uploading image to OpenAI:', imageError);
            // Fallback to base64 approach if file upload fails
            try {
              const imageBuffer = fs.readFileSync(image.path);
              const base64Image = imageBuffer.toString('base64');
              const mimeType = image.mimetype || 'image/jpeg';
              
              messageContent.push({
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              });
              console.log(`Added base64 image for ${image.originalname}`);
            } catch (base64Error) {
              console.error('Error converting image to base64:', base64Error);
            }
          }
        }
      }

      // Add message to thread
      try {
        await openai.beta.threads.messages.create(currentThreadId, {
          role: "user",
          content: messageContent.length > 0 ? messageContent : (message || "Generate a blog post")
        });
        console.log('Added message to thread');
      } catch (messageError) {
        console.error('Error adding message to thread:', messageError);
        throw new Error('Failed to add message to conversation');
      }

      // Now run the OpenAI Assistant
      console.log('Starting OpenAI Assistant run with Assistant ID:', assistantId);
      
      let run;
      try {
        run = await openai.beta.threads.runs.create(currentThreadId, {
          assistant_id: correctAssistantId,
          metadata: { feature: "autoblog-chat", studioId: req.user?.id }
        });
        
        console.log('✅ Using correct TOGNINJA assistant ID:', correctAssistantId);
        console.log('Started assistant run:', run.id, 'on thread:', currentThreadId);
      } catch (runError) {
        console.error('Error starting assistant run:', runError);
        throw new Error('Failed to start assistant processing');
      }

      // Use direct HTTP API calls to bypass SDK parameter ordering issues
      console.log('Using direct HTTP API calls to work around SDK compatibility issues...');
      
      // Wait for the Assistant run to complete using direct HTTP API
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max
      let runCompleted = false;
      
      while (attempts < maxAttempts && !runCompleted) {
        try {
          console.log(`Checking run status (attempt ${attempts + 1}) with threadId: ${currentThreadId}, runId: ${run.id}`);
          
          const statusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${run.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
              'OpenAI-Beta': 'assistants=v2'
            }
          });
          
          if (!statusResponse.ok) {
            throw new Error(`HTTP ${statusResponse.status}: ${statusResponse.statusText}`);
          }
          
          const runStatus = await statusResponse.json();
          console.log(`Assistant run status: ${runStatus.status} (attempt ${attempts + 1})`);
          
          if (runStatus.status === 'completed') {
            console.log('Assistant run completed successfully!');
            runCompleted = true;
            break;
          } else if (runStatus.status === 'failed' || runStatus.status === 'cancelled' || runStatus.status === 'expired') {
            throw new Error(`Assistant run failed with status: ${runStatus.status}`);
          }
          
          // Wait 2 seconds before checking again
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        } catch (statusError) {
          console.error('Error checking run status via HTTP API:', statusError);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!runCompleted) {
        throw new Error('Assistant run timed out after 2 minutes');
      }
      
      // Retrieve messages using direct HTTP API
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      
      if (!messagesResponse.ok) {
        throw new Error(`Failed to retrieve messages: ${messagesResponse.statusText}`);
      }
      
      const messagesData = await messagesResponse.json();
      const assistantMessages = messagesData.data.filter(msg => msg.role === 'assistant');
      
      if (assistantMessages.length === 0) {
        throw new Error('No response from assistant');
      }
      
      const latestMessage = assistantMessages[0];
      let responseText = '';
      
      // Extract text content from the message
      for (const content of latestMessage.content) {
        if (content.type === 'text') {
          responseText += content.text.value + '\n';
        }
      }
      
      responseText = responseText.trim();
      console.log('Generated blog content via OpenAI Assistant API (HTTP):', responseText.length, 'characters');

      // Handle blog post creation if this is a generation request
      let blogPost = null;
      if (responseText && publishOption) {
        try {
          const title = extractTitle(responseText);
          const content = responseText;
          const excerpt = extractExcerpt(responseText);
          
          if (title && content) {
            const baseSlug = customSlug || title.toLowerCase().replace(/[^a-z0-9äöüß]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
            const slug = `${baseSlug}-${Date.now()}`;
            
            const blogPostData = {
              title,
              content,
              excerpt,
              slug,
              // Map to the canonical status the cron expects — 'schedule'.toUpperCase()
              // is 'SCHEDULE' (missing the D), which the scheduler never matches.
              status: (({ publish: 'PUBLISHED', schedule: 'SCHEDULED', draft: 'DRAFT' } as Record<string, 'DRAFT' | 'PUBLISHED' | 'SCHEDULED'>)[String(publishOption).toLowerCase()] || 'DRAFT'),
              tags: ['Familienfotografie', 'Wien', 'Fotoshooting'],
              metaDescription: excerpt?.substring(0, 155) || '',
              scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
              imageUrl: `/blog-images/${Date.now()}-blog-header.jpg`,
              published: publishOption === 'publish',
              publishedAt: publishOption === 'publish' ? new Date() : null
            };

            const { blogPosts } = await import('@shared/schema');
            const [newPost] = await db.insert(blogPosts).values(blogPostData).returning();
            blogPost = newPost;
            console.log('Created blog post via OpenAI Assistant API:', blogPost.id);
          }
        } catch (blogError) {
          console.error('Error creating blog post:', blogError);
        }
      }

      res.json({
        success: true,
        response: responseText,
        threadId: currentThreadId,
        blogPost,
        metadata: {
          model: 'gpt-4o',
          assistantId: assistantId,
          runId: run.id,
          status: 'completed',
          method: 'openai-assistant-api',
          note: 'Generated using your specific OpenAI Assistant (TOGNINJA BLOG WRITER) with full capabilities'
        }
      });
      
    } catch (error: any) {
      console.error('AutoBlog Assistant chat error:', error);
      
      let errorMessage = 'Failed to process chat request';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        success: false, 
        error: errorMessage 
      });
    }
  });

  // Helper functions for blog content extraction
  function extractTitle(content: string): string {
    const titleMatch = content.match(/^#\s*(.+)$/m) || content.match(/Title:\s*(.+)$/m);
    return titleMatch ? titleMatch[1].trim() : `Familienfotografie Wien - ${new Date().toLocaleDateString('de-DE')}`;
  }

  function extractExcerpt(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 2).join('. ').trim().substring(0, 200) + '...';
  }

  // Test endpoint for debugging
  app.get("/api/autoblog/debug", async (req: Request, res: Response) => {
    try {
      res.json({
        message: "AutoBlog system debug",
        openaiAvailable: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // AutoBlog status endpoint
  app.get("/api/autoblog/status", authenticateUser, async (req: Request, res: Response) => {
    try {
      const openaiAvailable = !!process.env.OPENAI_API_KEY;
      const maxImages = parseInt(process.env.MAX_AUTOBLOG_IMAGES || '3');
      
      res.json({
        available: openaiAvailable,
        maxImages,
        supportedLanguages: ['de', 'en'],
        features: [
          'Image-based content generation',
          'SEO optimization',
          'Brand voice integration',
          'Multi-language support'
        ]
      });
    } catch (error) {
      console.error('AutoBlog status error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get AutoBlog status' 
      });
    }
  });

  // AI Agent Chat Endpoint
  app.post('/api/agent/chat', async (req: Request, res: Response) => {
    try {
      const { message, studioId, userId } = req.body;
      
      if (!message || !studioId || !userId) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      // Import runAgent dynamically to avoid module loading issues
      const { runAgent } = await import('../agent/run-agent');
      
      // Run the AI agent with the user's message
      const response = await runAgent(studioId, userId, message);
      
      res.json({ 
        response: response,
        actionPerformed: false // Could enhance this to detect if agent performed actions
      });
    } catch (error) {
      console.error('Agent chat error:', error);
      
      // Fallback response for CRM Operations Assistant
      const fallbackResponse = `I'm your CRM Operations Assistant. I can help you with:

📧 **Email Management**: Reply to client emails, send booking confirmations
📅 **Appointment Management**: Create, modify, cancel bookings
👥 **Client Management**: Add, update, search client records  
💰 **Invoice Operations**: Generate, send, track invoices and payments
📊 **Business Analytics**: Run reports, analyze data, export information

Current system status: The AI agent system is temporarily unavailable. Please try again shortly or describe what specific task you'd like help with.`;
      
      res.json({ 
        response: fallbackResponse,
        actionPerformed: false 
      });
    }
  });

  // Reusable lead auto-response. If an ENABLED emailAutomations rule exists for
  // this trigger type, render it with the lead's details and email them right
  // away — the speed-to-lead follow-up that website leads previously never got.
  // Mirrors the newsletter_signup path so contact/waitlist leads flow through the
  // same automation system admins already manage. Best-effort: never throws, and
  // if nothing is configured it silently does nothing (no regression, no dupes).
  const sendLeadAutomationEmail = async (
    triggerType: string,
    lead: { email: string; name?: string }
  ): Promise<void> => {
    try {
      if (!lead?.email) return;
      const rules = await db.select().from(emailAutomations).where(
        and(eq(emailAutomations.triggerType, triggerType), eq(emailAutomations.enabled, true))
      ).limit(1);
      if (rules.length === 0) return; // nothing configured for this trigger

      const rule = rules[0];
      const clientName = lead.name || lead.email.split('@')[0] || 'Kunde';
      const render = (s: string) => (s || '')
        .replace(/\{\{clientName\}\}/g, clientName)
        .replace(/\{\{clientEmail\}\}/g, lead.email);

      const transporter = nodemailer.createTransport({
        host: 'smtp.easyname.com',
        port: 465,
        secure: true,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        auth: {
          user: process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || '',
          pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || ''
        }
      });

      await transporter.sendMail({
        from: `"${getBizName()}" <${getEnvContactEmailSync() || 'no-reply@localhost'}>`,
        to: lead.email,
        subject: render(rule.emailSubject),
        html: render(rule.emailBodyHtml),
      });

      try {
        await db.insert(emailAutomationLogs).values({
          automationId: rule.id,
          bookingId: `${triggerType}-${Date.now()}`,
          clientEmail: lead.email,
          clientName,
          status: 'sent',
        });
      } catch (_) { /* logging is best-effort */ }

      console.log(`[lead-automation] Sent ${triggerType} auto-response to ${lead.email}`);
    } catch (err) {
      console.error(`[lead-automation] ${triggerType} send failed:`, err instanceof Error ? err.message : err);
    }
  };

  // ==================== CONTACT FORM ROUTES ====================
  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      const { fullName, email, phone, message } = req.body;

      // Validate required fields
      if (!fullName || !email || !message) {
        return res.status(400).json({ error: "Name, email, and message are required" });
      }

      // Save to database as a lead
      const leadData = {
        name: fullName,
        email: email,
        phone: phone || null,
        message: message,
        source: 'Website Contact Form',
        status: 'new'
      };

      const newLead = await db.insert(crmLeads).values(leadData).returning();

      // Send email notification to business
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.easyname.com',
          port: 465,
          secure: true,
          auth: {
            user: process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || '',
            pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || ''
          }
        });

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333; border-bottom: 2px solid #7C3AED; padding-bottom: 10px;">
              Neue Kontaktanfrage von Website
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">Kontaktdaten:</h3>
              <p><strong>Name:</strong> ${fullName}</p>
              <p><strong>E-Mail:</strong> <a href="mailto:${email}">${email}</a></p>
              ${phone ? `<p><strong>Telefon:</strong> <a href="tel:${phone}">${phone}</a></p>` : ''}
              <p><strong>Zeitpunkt:</strong> ${new Date().toLocaleString('de-DE')}</p>
            </div>

            <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
              <h3 style="color: #333; margin: 0 0 15px 0;">Nachricht:</h3>
              <p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
            </div>

            <div style="margin-top: 20px; padding: 15px; background-color: #e8f4fd; border-radius: 8px;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                Diese Nachricht wurde automatisch von Ihrer Website generiert. 
                Der Lead wurde bereits in Ihrem CRM-System gespeichert.
              </p>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: `"${getBizName()} Website" <${getEnvContactEmailSync() || 'no-reply@localhost'}>`,
          to: getEnvContactEmailSync() || 'no-reply@localhost',
          subject: `Neue Kontaktanfrage von ${fullName}`,
          html: emailHtml
        });

      } catch (emailError) {
        console.error('Error sending contact form email:', emailError);
        // Don't fail the request if email fails - lead is still saved
      }

      res.json({
        success: true,
        message: "Ihre Nachricht wurde erfolgreich gesendet. Wir melden uns bald bei Ihnen!",
        leadId: newLead[0]?.id
      });

      // Fire the configurable auto-response in the background (non-blocking).
      void sendLeadAutomationEmail('contact_form', { email, name: fullName });

    } catch (error) {
      console.error("Error processing contact form:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." });
    }
  });

  // ==================== APPOINTMENT/WAITLIST ROUTES ====================
  app.post("/api/waitlist", async (req: Request, res: Response) => {
    try {
      const { fullName, email, phone, preferredDate, message } = req.body;

      // Validate required fields. Phone + preferred date are OPTIONAL now (they
      // were high-friction on a low-commitment action) — we follow up to collect
      // them. Only name + a contactable email are required.
      if (!fullName || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }

      // Save to database as a lead with appointment details
      const leadData = {
        name: fullName,
        email: email,
        phone: phone,
        message: `${preferredDate ? `Preferred Date: ${preferredDate}` : 'Preferred Date: (not specified)'}${message ? '\n\nAdditional Message: ' + message : ''}`,
        source: 'Appointment Request (Waitlist)',
        status: 'new'
      };

      const newLead = await db.insert(crmLeads).values(leadData).returning();

      // Send appointment request email to business
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.easyname.com',
          port: 465,
          secure: true,
          auth: {
            user: process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || '',
            pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || ''
          }
        });

        const formatDate = (dateString: string) => {
          const date = new Date(dateString);
          return date.toLocaleDateString('de-DE', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        };

        const appointmentEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #7C3AED; border-bottom: 2px solid #7C3AED; padding-bottom: 10px;">
              📅 Neue Terminanfrage
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">Kundendaten:</h3>
              <p><strong>Name:</strong> ${fullName}</p>
              <p><strong>E-Mail:</strong> <a href="mailto:${email}">${email}</a></p>
              <p><strong>Telefon:</strong> <a href="tel:${phone}">${phone}</a></p>
              <p><strong>Eingegangen:</strong> ${new Date().toLocaleString('de-DE')}</p>
            </div>

            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7C3AED;">
              <h3 style="color: #7C3AED; margin: 0 0 15px 0;">🗓️ Gewünschter Termin:</h3>
              <p style="font-size: 18px; font-weight: bold; color: #333; margin: 0;">
                ${formatDate(preferredDate)}
              </p>
              <p style="font-size: 14px; color: #666; margin: 5px 0 0 0;">
                (${preferredDate})
              </p>
            </div>

            ${message ? `
              <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0;">💬 Zusätzliche Nachricht:</h3>
                <p style="line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
            ` : ''}

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">📞 Schnelle Aktionen:</h3>
              <p style="margin: 5px 0;">
                <a href="tel:${phone}" style="color: #7C3AED; text-decoration: none; font-weight: bold;">
                  📱 ${phone} anrufen
                </a>
              </p>
              <p style="margin: 5px 0;">
                <a href="mailto:${email}?subject=Bestätigung Ihres Fotoshooting-Termins am ${formatDate(preferredDate)}" style="color: #7C3AED; text-decoration: none; font-weight: bold;">
                  ✉️ Terminbestätigung senden
                </a>
              </p>
              <p style="margin: 5px 0;">
                <a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Hallo ${fullName.split(' ')[0]}, vielen Dank für Ihre Terminanfrage für den ${formatDate(preferredDate)}. Gerne bestätige ich Ihnen den Termin!" style="color: #7C3AED; text-decoration: none; font-weight: bold;">
                  💬 WhatsApp-Bestätigung
                </a>
              </p>
            </div>

            <div style="margin-top: 20px; padding: 15px; background-color: #e8f4fd; border-radius: 8px;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                Diese Terminanfrage wurde automatisch von Ihrer Website generiert. 
                Der Lead wurde bereits in Ihrem CRM-System gespeichert.
              </p>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: `"${getBizName()} Website" <${getEnvContactEmailSync() || 'no-reply@localhost'}>`,
          to: getEnvContactEmailSync() || 'no-reply@localhost',
          subject: `📅 Neue Terminanfrage: ${fullName} für ${formatDate(preferredDate)}`,
          html: appointmentEmailHtml
        });

        // Send confirmation email to customer
        const customerConfirmationHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #7C3AED; margin: 0;">${getBizName()}</h1>
              <p style="color: #666; margin: 5px 0;">Familienfotograf Wien</p>
            </div>

            <h2 style="color: #333; text-align: center;">
              Vielen Dank für Ihre Terminanfrage! 📸
            </h2>
            
            <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #7C3AED; margin: 0 0 20px 0;">Ihre Anfrage im Überblick:</h3>
              <p><strong>Gewünschter Termin:</strong> ${formatDate(preferredDate)}</p>
              <p><strong>Name:</strong> ${fullName}</p>
              <p><strong>E-Mail:</strong> ${email}</p>
              <p><strong>Telefon:</strong> ${phone}</p>
              ${message ? `<p><strong>Ihre Nachricht:</strong><br>${message}</p>` : ''}
            </div>

            <div style="background-color: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">📞 Wie geht es weiter?</h3>
              <p style="margin: 10px 0;">
                Wir melden uns innerhalb von <strong>24 Stunden</strong> bei Ihnen zurück, um Ihren Wunschtermin zu bestätigen oder alternative Termine vorzuschlagen.
              </p>
              <p style="margin: 10px 0;">
                <strong>Dringende Anfragen:</strong><br>
                WhatsApp/Tel: <a href="tel:+43677663992010" style="color: #7C3AED;">+43 677 633 99210</a><br>
                E-Mail: <a href="mailto:${getEnvContactEmailSync()}" style="color: #7C3AED;">${getEnvContactEmailSync()}</a>
              </p>
            </div>

            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #333; margin: 0 0 10px 0;">💡 Tipp für Ihren Fotoshooting-Termin:</h4>
              <ul style="color: #666; margin: 0; padding-left: 20px;">
                <li>Wir fotografieren auch an Wochenenden</li>
                <li>Flexible Termingestaltung nach Ihren Wünschen</li>
                <li>Outdoor- und Indoor-Fotoshootings möglich</li>
                <li>Professionelle Nachbearbeitung inklusive</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                ${getBizName()} | Wehrgasse 11A/2+5, 1050 Wien<br>
                Tel/WhatsApp: +43 677 633 99210 | E-Mail: ${getEnvContactEmailSync()}
              </p>
            </div>
          </div>
        `;

        await transporter.sendMail({
          from: `"${getBizName()}" <${getEnvContactEmailSync() || 'no-reply@localhost'}>`,
          to: email,
          subject: '📅 Terminanfrage erhalten - Wir melden uns bald!',
          html: customerConfirmationHtml
        });

      } catch (emailError) {
        console.error('Error sending appointment emails:', emailError);
        // Don't fail the request if email fails - lead is still saved
      }

      res.json({
        success: true,
        message: "Ihre Terminanfrage wurde erfolgreich übermittelt. Wir melden uns innerhalb von 24 Stunden bei Ihnen!",
        leadId: newLead[0]?.id
      });

      // Fire the configurable auto-response in the background (non-blocking).
      void sendLeadAutomationEmail('waitlist_signup', { email, name: fullName });

    } catch (error) {
      console.error("Error processing appointment request:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." });
    }
  });

  // ==================== NEWSLETTER/VOUCHER SIGNUP ROUTES ====================
  app.post("/api/newsletter/signup", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      // Validate email
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: "Valid email address is required" });
      }

      // Save to database as a lead
      const leadData = {
        name: email.split('@')[0] || 'Newsletter Subscriber',
        email: email,
        source: 'Newsletter Signup (50 EUR Voucher)',
        message: 'Signed up for 50 EUR voucher offer',
        status: 'new'
      };

      const newLead = await db.insert(crmLeads).values(leadData).returning();

      // Also add to email_subscribers for newsletter campaigns
      try {
        const existingSub = await db.select().from(emailSubscribers).where(eq(emailSubscribers.email, email)).limit(1);
        if (existingSub.length === 0) {
          await db.insert(emailSubscribers).values({
            email: email,
            firstName: email.split('@')[0] || 'Subscriber',
            status: 'active',
            source: 'form',
            tags: ['newsletter', 'voucher'],
          });
        }
      } catch (subError) {
        console.error('Error adding to email_subscribers:', subError);
      }

      // Respond immediately. The lead is already saved and the voucher emails are
      // best-effort, so we must not keep the request (and the signup button) hanging
      // on "Wird gesendet..." while SMTP is slow or unreachable.
      res.json({
        success: true,
        message: "Vielen Dank! Prüfen Sie Ihre E-Mails für Ihren 50€ Gutschein.",
        leadId: newLead[0]?.id
      });

      // Send the real €50 voucher email + notify the business, in the background
      // (non-fatal — the lead is already saved). The voucher send is centralised in
      // sendNewsletterVoucherEmail so the signup path and the admin resend tool are
      // always identical, and every send is logged in email_automation_logs.
      void (async () => {
        await sendNewsletterVoucherEmail(email);
        try {
          const transporter = nodemailer.createTransport({
            host: 'smtp.easyname.com', port: 465, secure: true,
            connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
            auth: {
              user: process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || '',
              pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || ''
            }
          });
          await transporter.sendMail({
            from: `"${getBizName()} Website" <${getEnvContactEmailSync() || 'no-reply@localhost'}>`,
            to: getEnvContactEmailSync() || 'no-reply@localhost',
            subject: `Neue Newsletter-Anmeldung: ${email}`,
            html: `
              <h3>Neue Newsletter-Anmeldung</h3>
              <p><strong>E-Mail:</strong> ${email}</p>
              <p><strong>Zeitpunkt:</strong> ${new Date().toLocaleString('de-DE')}</p>
              <p><strong>Angebot:</strong> 50 EUR Gutschein</p>
              <p>Der Lead wurde automatisch in Ihrem CRM-System gespeichert.</p>
            `
          });
        } catch (emailError) {
          console.error('Error sending business newsletter notification:', emailError);
        }
      })();

    } catch (error) {
      console.error("Error processing newsletter signup:", error);
      res.status(500).json({ error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." });
    }
  });

  // Newsletter voucher reconciliation: which signups have NOT been recorded as
  // having received their €50 voucher email (no 'sent' automation log for them).
  app.get('/api/email/newsletter/undelivered', authenticateUser, async (_req: Request, res: Response) => {
    try {
      const signups = await gatherNewsletterSignups();
      const logs = await db
        .select({ email: emailAutomationLogs.clientEmail })
        .from(emailAutomationLogs)
        .where(eq(emailAutomationLogs.status, 'sent'));
      const sentSet = new Set(logs.map((l: any) => String(l.email || '').toLowerCase()));
      const undelivered = [...signups.values()]
        .filter((s) => !sentSet.has(String(s.email).toLowerCase()))
        .map((s) => ({ email: s.email, firstName: s.firstName, createdAt: s.createdAt, legacy: s.legacy }))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      res.json({ total: signups.size, undeliveredCount: undelivered.length, undelivered });
    } catch (error) {
      console.error('Error computing undelivered newsletter vouchers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Resend the €50 voucher email to one address (`email`) or to every signup with
  // no recorded send (`all: true`). Capped per call to avoid runaway SMTP loops.
  app.post('/api/email/newsletter/resend', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { email, all } = (req.body || {}) as { email?: string; all?: boolean };
      let targets: string[] = [];
      if (email && String(email).includes('@')) {
        targets = [String(email).trim()];
      } else if (all) {
        const signups = await gatherNewsletterSignups();
        const logs = await db
          .select({ email: emailAutomationLogs.clientEmail })
          .from(emailAutomationLogs)
          .where(eq(emailAutomationLogs.status, 'sent'));
        const sentSet = new Set(logs.map((l: any) => String(l.email || '').toLowerCase()));
        targets = [...signups.values()]
          .filter((s) => !sentSet.has(String(s.email).toLowerCase()))
          .map((s) => String(s.email));
      } else {
        return res.status(400).json({ error: 'Provide `email` or `all: true`' });
      }

      const MAX = 200;
      const capped = targets.length > MAX;
      targets = targets.slice(0, MAX);

      let sent = 0, failed = 0;
      for (const t of targets) {
        const r = await sendNewsletterVoucherEmail(t, { isResend: true });
        if (r.ok) {
          sent++;
          // Backfill legacy homepage signups (crm_leads only) onto the mailing list
          // so they now appear in exports and future campaigns.
          try {
            const existing = await db.select({ id: emailSubscribers.id }).from(emailSubscribers).where(eq(emailSubscribers.email, t)).limit(1);
            if (existing.length === 0) {
              await db.insert(emailSubscribers).values({
                email: t,
                firstName: t.split('@')[0] || 'Subscriber',
                status: 'active',
                source: 'form',
                tags: ['newsletter', 'voucher'],
              });
            }
          } catch { /* backfill is best-effort */ }
        } else {
          failed++;
        }
      }
      res.json({ ok: true, attempted: targets.length, sent, failed, capped, cap: MAX });
    } catch (error) {
      console.error('Error resending newsletter vouchers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Website Wizard routes
  app.use('/api/website-wizard', websiteWizardRoutes);
  app.use('/api/gallery', galleryShopRouter);
  app.use('/api/integrations/shootcleaner', shootCleanerRoutes);
  app.use('/api/bundle', bundleRoutes);

  // Admin: self-serve ShootCleaner API key (Settings → ShootCleaner). Studios
  // generate/rotate their own key here and paste it into ShootCleaner.
  app.get('/api/admin/integrations/shootcleaner', authenticateUser, async (req: Request, res: Response) => {
    try {
      const rows = await runSql(`SELECT shootcleaner_api_key FROM studio_configs LIMIT 1`);
      const key = (rows?.[0] as any)?.shootcleaner_api_key || '';
      const envKey = (process.env.SHOOTCLEANER_API_KEY || '').trim();
      const active = key || envKey;
      const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      res.json({
        hasKey: !!active,
        source: key ? 'generated' : (envKey ? 'env' : 'none'),
        keyMasked: active ? `${active.slice(0, 6)}${'•'.repeat(8)}${active.slice(-4)}` : null,
        instanceUrl: `${proto}://${req.get('host')}`,
      });
    } catch (e: any) {
      console.error('shootcleaner key status error:', e?.message);
      res.status(500).json({ error: 'Failed to read integration status' });
    }
  });

  // Generate/rotate — returns the FULL key ONCE (copy it now).
  app.post('/api/admin/integrations/shootcleaner/rotate', authenticateUser, async (_req: Request, res: Response) => {
    try {
      const key = `sc_${require('crypto').randomBytes(24).toString('hex')}`;
      await pool.query(`UPDATE studio_configs SET shootcleaner_api_key = $1, updated_at = now() WHERE id = (SELECT id FROM studio_configs LIMIT 1)`, [key]);
      invalidateShootCleanerKey();
      res.json({ ok: true, apiKey: key });
    } catch (e: any) {
      console.error('shootcleaner key rotate error:', e?.message);
      res.status(500).json({ error: 'Failed to generate key' });
    }
  });

  // Disconnect — clears the generated key (env fallback, if any, still applies).
  app.post('/api/admin/integrations/shootcleaner/revoke', authenticateUser, async (_req: Request, res: Response) => {
    try {
      await pool.query(`UPDATE studio_configs SET shootcleaner_api_key = NULL, updated_at = now() WHERE id = (SELECT id FROM studio_configs LIMIT 1)`);
      invalidateShootCleanerKey();
      res.json({ ok: true });
    } catch (e: any) {
      console.error('shootcleaner key revoke error:', e?.message);
      res.status(500).json({ error: 'Failed to revoke key' });
    }
  });
  
  // Storage subscription routes
  app.use('/api/storage', storageRoutes);
  
  // File upload and management routes (DISABLED - has schema mismatches, using filesRouter above instead)
  // app.use('/api/files', fileRoutes);
  
  // Gallery transfer routes
  app.use('/api/gallery-transfer', galleryTransferRoutes);
  
  // Storage statistics routes
  app.use('/api/storage-stats', storageStatsRoutes);
  
  // Print ordering routes (Prodigi integration)
  app.use('/api/print', prodigiRoutes);

  // Storage health check (diagnostics for Backblaze/AWS S3 configuration)
  app.get('/api/storage/health', async (_req: Request, res: Response) => {
    const cfg = getS3Config();
    const { bucket, endpoint, region } = cfg;
    const accessConfigured = cfg.isConfigured;

    let canList = false;
    let error: string | undefined;
    try {
      await getS3Client().send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
      canList = true;
    } catch (e: any) {
      error = e?.message || String(e);
    }

    res.json({ bucket, endpoint, region, accessConfigured, canList, error });
  });
  
  // Accounting Export routes
  // Attach storage to request so accounting export can access invoices/clients
  app.use(
    '/api/accounting-export',
    authenticateUser,
    (req, _res, next) => {
      (req as any).storage = storageInstance;
      next();
    },
    accountingExportRouter
  );

  // Register test routes
  registerTestRoutes(app);

  // ==================== LANDING PAGES ====================

  // GET all landing pages (admin)
  app.get("/api/admin/landing-pages", authenticateUser, async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string || null;
      const pages = await neonDb.getLandingPages(status);
      res.json(pages);
    } catch (error) {
      console.error('Error fetching landing pages:', error);
      res.status(500).json({ error: 'Failed to fetch landing pages' });
    }
  });

  // GET seasonal template library (must be before /:id to avoid param matching)
  app.get("/api/admin/landing-pages/templates", authenticateUser, async (_req: Request, res: Response) => {
    try {
      const templates = [
        { id: 'easter', label: 'Easter Mini Sessions', pageType: 'mini_session', targetAudience: 'families' },
        { id: 'mother-day', label: "Mother's Day Portraits", pageType: 'portrait_session', targetAudience: 'families' },
        { id: 'christmas', label: 'Christmas Card Sessions', pageType: 'mini_session', targetAudience: 'families' },
        { id: 'mini-session-spring', label: 'Spring Mini Sessions', pageType: 'mini_session', targetAudience: 'families' },
        { id: 'newborn', label: 'Newborn Photography', pageType: 'studio_session', targetAudience: 'new_parents' },
        { id: 'family-wall-portrait', label: 'Family Wall Portrait', pageType: 'studio_session', targetAudience: 'families' },
        { id: 'summer-holiday', label: 'Summer Holiday Offer', pageType: 'mini_session', targetAudience: 'families' },
        { id: 'business-headshots', label: 'Business Headshots', pageType: 'commercial', targetAudience: 'professionals' },
        { id: 'school-holiday', label: 'School Holiday Sessions', pageType: 'mini_session', targetAudience: 'families' },
      ];
      res.json(templates);
    } catch (error: any) {
      console.error('Error fetching templates:', error.message);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // GET awaiting-approval executions for the current user (must be before /:id route)
  app.get("/api/admin/landing-pages/executions/awaiting-approval", authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const executions = await neonDb.getAwaitingApprovalExecutions(userId, 50);

      const mapped = executions.map((e: any) => ({
        id: e.id,
        landingPageId: e.landing_page_id,
        executionType: e.execution_type,
        executionStatus: e.execution_status,
        approvalStatus: e.approval_status,
        requestedPayload: e.requested_payload,
        createdAt: e.created_at,
      }));

      res.json(mapped);
    } catch (error: any) {
      console.error('Error listing awaiting-approval executions:', error.message);
      res.status(500).json({ error: 'Failed to list awaiting-approval executions' });
    }
  });

  // GET the AI-generated homepage draft from onboarding, for the post-login dashboard
  // banner ("Your AI homepage draft is ready → Review & edit"). Returns null once the
  // draft no longer exists. isHomepage tells the client whether it's already live at "/".
  app.get("/api/admin/homepage-draft", authenticateUser, async (_req: Request, res: Response) => {
    try {
      const rows = await runSql(`SELECT homepage_draft_landing_id AS draft_id, homepage_landing_slug AS home_slug FROM studio_configs LIMIT 1`);
      const draftId = (rows?.[0] as any)?.draft_id || null;
      const homeSlug = (rows?.[0] as any)?.home_slug || null;
      if (!draftId) return res.json({ draftId: null });
      const page = await neonDb.getLandingPage(draftId);
      if (!page) return res.json({ draftId: null });
      res.json({
        draftId,
        slug: page.slug,
        title: page.title,
        status: page.status,
        isHomepage: !!(homeSlug && page.slug === homeSlug),
      });
    } catch (error: any) {
      console.error('Error reading homepage draft:', error?.message);
      res.status(500).json({ error: 'Failed to read homepage draft' });
    }
  });

  // GET single landing page (admin)
  app.get("/api/admin/landing-pages/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const page = await neonDb.getLandingPage(req.params.id);
      if (!page) return res.status(404).json({ error: 'Landing page not found' });
      res.json(page);
    } catch (error) {
      console.error('Error fetching landing page:', error);
      res.status(500).json({ error: 'Failed to fetch landing page' });
    }
  });

  // POST create landing page
  app.post("/api/admin/landing-pages", authOrApiKey('landing-pages:write'), async (req: Request, res: Response) => {
    try {
      const data = req.body;
      if (!data.title || !data.slug) {
        return res.status(400).json({ error: 'Title and slug are required' });
      }
      // Check slug uniqueness
      const slugAvailable = await neonDb.checkSlugAvailable(data.slug);
      if (!slugAvailable) {
        return res.status(409).json({ error: 'Slug already in use' });
      }
      const page = await neonDb.createLandingPage(data);
      res.status(201).json(page);
    } catch (error) {
      console.error('Error creating landing page:', error);
      res.status(500).json({ error: 'Failed to create landing page' });
    }
  });

  // PUT update landing page
  app.put("/api/admin/landing-pages/:id", authOrApiKey('landing-pages:write'), async (req: Request, res: Response) => {
    try {
      const data = req.body;
      // If slug changed, check uniqueness
      if (data.slug) {
        const slugAvailable = await neonDb.checkSlugAvailable(data.slug, req.params.id);
        if (!slugAvailable) {
          return res.status(409).json({ error: 'Slug already in use' });
        }
      }
      const page = await neonDb.updateLandingPage(req.params.id, data);
      if (!page) return res.status(404).json({ error: 'Landing page not found' });
      res.json(page);
    } catch (error) {
      console.error('Error updating landing page:', error);
      res.status(500).json({ error: 'Failed to update landing page' });
    }
  });

  // POST publish landing page (with server-side readiness validation)
  app.post("/api/admin/landing-pages/:id/publish", authOrApiKey('landing-pages:write'), async (req: Request, res: Response) => {
    try {
      const page = await neonDb.getLandingPage(req.params.id);
      if (!page) return res.status(404).json({ error: 'Landing page not found' });

      // Server-side readiness validation
      const content = page.content_json || {};
      const validationErrors: string[] = [];
      const validationWarnings: string[] = [];

      if (!page.title?.trim()) validationErrors.push('Page title is missing');
      if (!page.slug?.trim()) validationErrors.push('URL slug is missing');
      if (!content.hero?.headline?.trim()) validationErrors.push('Hero headline is missing');
      if (!content.hero?.ctaText?.trim() && !page.cta_text?.trim()) validationErrors.push('Hero CTA text is missing');
      const seoTitle = content.seo?.title || page.seo_title;
      if (!seoTitle?.trim()) validationErrors.push('SEO title is missing');
      const metaDesc = content.seo?.description || content.seo?.metaDescription || page.meta_description;
      if (!metaDesc?.trim()) validationErrors.push('Meta description is missing');
      if (!content.hero && !content.offerSection && !content.finalCta) validationErrors.push('Page has no generated content');
      if (!content.finalCta?.ctaText?.trim()) validationWarnings.push('Final CTA section is recommended');

      if (validationErrors.length > 0) {
        return res.status(422).json({
          success: false,
          error: 'Page is not ready to publish',
          validation: {
            errors: validationErrors,
            warnings: validationWarnings,
          }
        });
      }

      // Save revision before publishing
      await neonDb.createLandingPageRevision(page.id, page.content_json, page.generation_context_json, req.user?.id || 'admin');

      const updated = await neonDb.updateLandingPage(req.params.id, {
        status: 'published',
        published_at: new Date().toISOString(),
        published_url: `/lp/${page.slug}`
      });
      res.json({
        success: true,
        page: updated,
        publishedUrl: `/lp/${page.slug}`,
      });
    } catch (error) {
      console.error('Error publishing landing page:', error);
      res.status(500).json({ error: 'Failed to publish landing page' });
    }
  });

  // POST unpublish landing page
  app.post("/api/admin/landing-pages/:id/unpublish", authOrApiKey('landing-pages:write'), async (req: Request, res: Response) => {
    try {
      const updated = await neonDb.updateLandingPage(req.params.id, {
        status: 'draft',
        published_url: null
      });
      if (!updated) return res.status(404).json({ error: 'Landing page not found' });
      // If this page was the live homepage, clear the pointer so "/" reverts to the
      // built-in HomePage instead of 404-ing on the now-unpublished slug.
      if (updated.slug) {
        await pool.query(
          `UPDATE studio_configs SET homepage_landing_slug = NULL, updated_at = now() WHERE homepage_landing_slug = $1`,
          [updated.slug],
        );
      }
      res.json(updated);
    } catch (error) {
      console.error('Error unpublishing landing page:', error);
      res.status(500).json({ error: 'Failed to unpublish landing page' });
    }
  });

  // POST set a published landing page as the public homepage ("/"). Writes the slug
  // to studio_configs.homepage_landing_slug; the "/" route + SSR meta honour it.
  app.post("/api/admin/landing-pages/:id/set-as-homepage", authOrApiKey('landing-pages:write'), async (req: Request, res: Response) => {
    try {
      const page = await neonDb.getLandingPage(req.params.id);
      if (!page) return res.status(404).json({ error: 'Landing page not found' });
      if (page.status !== 'published') {
        return res.status(422).json({ error: 'Publish the page before setting it as your homepage.' });
      }
      await pool.query(
        `UPDATE studio_configs SET homepage_landing_slug = $1, updated_at = now() WHERE id = (SELECT id FROM studio_configs LIMIT 1)`,
        [page.slug],
      );
      res.json({ success: true, slug: page.slug });
    } catch (error: any) {
      console.error('Error setting homepage:', error?.message);
      res.status(500).json({ error: 'Failed to set homepage' });
    }
  });

  // POST clear the custom homepage — "/" reverts to the built-in HomePage.
  app.post("/api/admin/landing-pages/unset-homepage", authOrApiKey('landing-pages:write'), async (_req: Request, res: Response) => {
    try {
      await pool.query(
        `UPDATE studio_configs SET homepage_landing_slug = NULL, updated_at = now() WHERE id = (SELECT id FROM studio_configs LIMIT 1)`,
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error clearing homepage:', error?.message);
      res.status(500).json({ error: 'Failed to clear homepage' });
    }
  });

  // POST create preview link for landing page
  app.post("/api/admin/landing-pages/:id/preview-link", authenticateUser, async (req: Request, res: Response) => {
    try {
      const page = await neonDb.getLandingPage(req.params.id);
      if (!page) return res.status(404).json({ error: 'Landing page not found' });

      // Defensive: ensure the preview columns exist even if the boot migration
      // hasn't run on this DB yet (otherwise the UPDATE below 500s).
      try {
        await runSql(`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS preview_token TEXT`);
        await runSql(`ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS preview_token_expires_at TIMESTAMPTZ`);
      } catch { /* best effort */ }

      // Generate a random preview token (64-char hex)
      const { randomBytes } = await import('crypto');
      const previewToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      await neonDb.updateLandingPage(req.params.id, {
        preview_token: previewToken,
        preview_token_expires_at: expiresAt,
      });

      const previewUrl = `/lp/${page.slug}?preview=${previewToken}`;
      res.json({
        previewUrl,
        expiresAt,
      });
    } catch (error) {
      console.error('Error creating preview link:', error);
      res.status(500).json({ error: 'Failed to create preview link' });
    }
  });

  // POST duplicate landing page
  app.post("/api/admin/landing-pages/:id/duplicate", authenticateUser, async (req: Request, res: Response) => {
    try {
      const duplicate = await neonDb.duplicateLandingPage(req.params.id);
      res.status(201).json(duplicate);
    } catch (error) {
      console.error('Error duplicating landing page:', error);
      res.status(500).json({ error: 'Failed to duplicate landing page' });
    }
  });

  // GET landing page revisions
  app.get("/api/admin/landing-pages/:id/revisions", authOrApiKey('landing-pages:write'), async (req: Request, res: Response) => {
    try {
      const revisions = await neonDb.getLandingPageRevisions(req.params.id);
      res.json(revisions);
    } catch (error) {
      console.error('Error fetching revisions:', error);
      res.status(500).json({ error: 'Failed to fetch revisions' });
    }
  });

  // POST restore a landing-page revision (rollback safety net for autonomous publishers)
  app.post("/api/admin/landing-pages/:id/revisions/:revisionId/restore", authOrApiKey('landing-pages:write'), async (req: Request, res: Response) => {
    try {
      const revisions = await neonDb.getLandingPageRevisions(req.params.id);
      const rev = (revisions || []).find((r: any) => String(r.id) === String(req.params.revisionId));
      if (!rev) return res.status(404).json({ error: 'Revision not found' });
      // Snapshot current content first, so the restore itself is reversible.
      const current = await neonDb.getLandingPage(req.params.id);
      if (current) {
        await neonDb.createLandingPageRevision(current.id, current.content_json, current.generation_context_json, (req as any).user?.id || 'restore');
      }
      const updated = await neonDb.updateLandingPage(req.params.id, {
        content_json: rev.content_json,
        generation_context_json: rev.generation_context_json,
      });
      res.json({ success: true, restoredFromVersion: rev.version_number, page: updated });
    } catch (error) {
      console.error('Error restoring revision:', error);
      res.status(500).json({ error: 'Failed to restore revision' });
    }
  });

  // DELETE landing page
  app.delete("/api/admin/landing-pages/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const page = await neonDb.deleteLandingPage(req.params.id);
      if (!page) return res.status(404).json({ error: 'Landing page not found' });
      // Clear any studio_configs pointers to this page so "/" and the dashboard banner
      // don't reference a deleted row.
      await pool.query(
        `UPDATE studio_configs SET
           homepage_landing_slug = CASE WHEN homepage_landing_slug = $1 THEN NULL ELSE homepage_landing_slug END,
           homepage_draft_landing_id = CASE WHEN homepage_draft_landing_id = $2 THEN NULL ELSE homepage_draft_landing_id END,
           updated_at = now()
         WHERE homepage_landing_slug = $1 OR homepage_draft_landing_id = $2`,
        [page.slug || null, req.params.id],
      );
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting landing page:', error);
      res.status(500).json({ error: 'Failed to delete landing page' });
    }
  });

  // POST check slug availability
  app.post("/api/admin/landing-pages/check-slug", authOrApiKey('landing-pages:write'), async (req: Request, res: Response) => {
    try {
      const { slug, excludeId } = req.body;
      if (!slug) return res.status(400).json({ error: 'Slug is required' });
      const available = await neonDb.checkSlugAvailable(slug, excludeId);
      res.json({ available, slug });
    } catch (error) {
      console.error('Error checking slug:', error);
      res.status(500).json({ error: 'Failed to check slug' });
    }
  });

  // POST AI generate landing page content
  app.post("/api/admin/landing-pages/generate", authenticateUser, async (req: Request, res: Response) => {
    try {
      // Prompt-building + OpenAI call now live in server/lib/landing-generator.ts so
      // the onboarding homepage pipeline can reuse the exact same generation.
      const result = await generateLandingContent(req.body || {});
      res.json(result);
    } catch (error: any) {
      console.error('Error generating landing page:', error?.message);
      res.status(500).json({ error: 'Failed to generate landing page content' });
    }
  });

  // POST AI regenerate a specific section
  app.post("/api/admin/landing-pages/regenerate-section", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { section, context, currentContent } = req.body;
      
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_LANDING_MODEL || process.env.OPENAI_PRICE_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are an expert landing page copywriter. Regenerate ONLY the "${section}" section of a landing page. Return ONLY a valid JSON object matching the structure of that section. Keep the same tone and context but write fresh, improved copy. If input is German, write German output.` },
          { role: 'user', content: `Regenerate the "${section}" section.\n\nContext: ${JSON.stringify(context)}\n\nCurrent content to improve: ${JSON.stringify(currentContent)}` }
        ],
        temperature: 0.9,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      let regenerated;
      try {
        regenerated = JSON.parse(responseText);
      } catch {
        return res.status(500).json({ error: 'AI returned invalid JSON' });
      }

      res.json({ section, content: regenerated });
    } catch (error: any) {
      console.error('Error regenerating section:', error.message);
      res.status(500).json({ error: 'Failed to regenerate section' });
    }
  });

  // POST AI regenerate a specific section (per-page URL, Phase 3)
  app.post("/api/admin/landing-pages/:id/regenerate-section", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { sectionKey, mode, customInstruction } = req.body;
      if (!sectionKey) return res.status(400).json({ error: 'sectionKey is required' });

      const page = await neonDb.getLandingPage(req.params.id);
      if (!page) return res.status(404).json({ error: 'Landing page not found' });

      const contentJson = typeof page.content_json === 'string' ? JSON.parse(page.content_json) : page.content_json;
      const currentContent = contentJson?.[sectionKey] || {};

      // Per-section JSON schemas. Without these, regenerating an EMPTY section
      // let the model invent an arbitrary shape the editor/renderer can't use
      // (the section stayed blank). Array sections must be wrapped in
      // {"items": [...]} because response_format json_object can't return a
      // top-level array — unwrapped below.
      const SECTION_SCHEMAS: Record<string, { schema: string; unwrapItems?: boolean }> = {
        hero: { schema: '{"eyebrow": "short kicker (optional)", "headline": "main headline", "subheadline": "1-2 sentences", "ctaText": "primary button label", "secondaryCtaText": "secondary button label (optional)", "badgeText": "small badge (optional)"}' },
        trustBar: { schema: '{"items": ["4 short trust points, e.g. \\"Seit 2012 in Wien\\""]}' },
        problemSection: { schema: '{"headline": "question-style headline", "description": "2-3 sentences", "painPoints": ["3 short pain points"]}' },
        offerSection: { schema: '{"headline": "offer name", "description": "2-3 sentences", "price": "e.g. \\"€225\\"", "inclusions": ["4-6 things included"], "urgency": "scarcity line (optional)"}' },
        benefits: { schema: '{"title": "short section heading", "items": [{"title": "benefit", "description": "1 sentence"}]} — 4-6 items' },
        whyChooseUs: { schema: '{"headline": "section headline", "reasons": [{"title": "reason", "description": "1 sentence"}] } with 3-4 reasons' },
        inclusions: { schema: '{"title": "short section heading, e.g. \\"Das ist alles dabei\\"", "items": ["4-8 short things that are included, e.g. \\"20 bearbeitete Fotos\\""]}' },
        testimonials: { schema: '{"title": "short section heading", "testimonials": [{"quote": "testimonial text", "author": "first name + initial", "role": "e.g. Familienshooting"}]} — 2-3 items' },
        faq: { schema: '{"title": "short section heading", "items": [{"question": "...", "answer": "2-3 sentences"}]} — 4-6 items' },
        finalCta: { schema: '{"headline": "closing headline", "description": "1-2 sentences", "ctaText": "button label"}' },
        seo: { schema: '{"title": "max 60 chars incl. city", "metaDescription": "max 155 chars"}' },
      };
      const sectionSpec = SECTION_SCHEMAS[sectionKey];

      const modeInstruction = mode ? `Mode: ${mode}.` : '';
      const customPart = customInstruction ? `\nAdditional instruction: ${customInstruction}` : '';
      const hasCurrent = currentContent && Object.keys(currentContent).length > 0;

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_LANDING_MODEL || process.env.OPENAI_PRICE_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert landing page copywriter. ${hasCurrent ? 'Regenerate' : 'Generate'} ONLY the "${sectionKey}" section of a landing page. Return ONLY a valid JSON object EXACTLY matching this structure: ${sectionSpec ? sectionSpec.schema : 'the structure of the current content'}. ${modeInstruction} Write in German unless the page context is clearly English. Fresh, conversion-focused copy; no placeholder text.`
          },
          {
            role: 'user',
            content: `${hasCurrent ? 'Regenerate (improve)' : 'Generate from scratch'} the "${sectionKey}" section.\n\nPage context: title="${page.title}", service="${page.primary_service || ''}", city="${page.city || ''}", audience="${page.target_audience || ''}", offer="${page.offer_summary || ''}"\n\n${hasCurrent ? `Current content to improve: ${JSON.stringify(currentContent)}` : 'This section is currently EMPTY — write it from the page context.'}${customPart}`
          }
        ],
        temperature: 0.9,
        max_tokens: 1200,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      let regenerated: any;
      try {
        regenerated = JSON.parse(responseText);
      } catch {
        return res.status(500).json({ error: 'AI returned invalid JSON' });
      }

      // Unwrap array sections ({"items": [...]} → [...]) so the editor and
      // public renderer receive the array shape they expect.
      if (sectionSpec?.unwrapItems) {
        regenerated = Array.isArray(regenerated) ? regenerated : (regenerated.items || regenerated[sectionKey] || []);
      } else if (sectionKey === 'trustBar' && Array.isArray(regenerated)) {
        regenerated = { items: regenerated };
      }

      res.json({ sectionKey, content: regenerated });
    } catch (error: any) {
      console.error('Error regenerating section:', error.message);
      res.status(500).json({ error: 'Failed to regenerate section' });
    }
  });

  // POST suggest the recommended/optional fields for an "optimal" landing page.
  // Generates copy for the nice-to-have fields (hero eyebrow/subheadline/
  // secondary-CTA/badge, final-CTA secondary CTA, SEO focus keyphrase) from the
  // page's existing context. The CLIENT applies each suggestion ONLY where the
  // field is currently empty, so nothing the user already wrote is overwritten.
  app.post("/api/admin/landing-pages/:id/suggest-fields", authenticateUser, async (req: Request, res: Response) => {
    try {
      const page = await neonDb.getLandingPage(req.params.id);
      if (!page) return res.status(404).json({ error: 'Landing page not found' });

      const contentJson = typeof page.content_json === 'string' ? JSON.parse(page.content_json) : (page.content_json || {});
      const hero = contentJson.hero || {};
      const offer = contentJson.offerSection || {};

      const schema = '{'
        + '"hero": {'
        + '"eyebrow": "short kicker line above the headline (2-4 words)",'
        + '"subheadline": "1-2 sentence supporting line under the headline",'
        + '"secondaryCtaText": "low-commitment secondary button label (e.g. \\"Pakete ansehen\\")",'
        + '"badgeText": "tiny badge/label (2-4 words, may include one emoji)"'
        + '},'
        + '"finalCta": {"secondaryCtaText": "secondary button label for the closing CTA"},'
        + '"seo": {"keyphrase": "the single primary keyword this page should rank for (2-4 words, include the city)"}'
        + '}';

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_LANDING_MODEL || process.env.OPENAI_PRICE_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert landing-page copywriter and SEO specialist. Suggest values for the OPTIONAL and RECOMMENDED fields that make a landing page optimal. Return ONLY a valid JSON object exactly matching: ${schema}. Match the language and tone of the existing copy (German unless the page is clearly English). Keep everything concise and conversion-focused; no placeholder text, no quotes around values beyond JSON.`
          },
          {
            role: 'user',
            content: `Suggest the recommended/optional fields for this page.\n\nContext: title="${page.title}", service="${page.primary_service || ''}", city="${page.city || ''}", audience="${page.target_audience || ''}", offer="${page.offer_summary || ''}"\nExisting headline: "${hero.headline || ''}"\nExisting subheadline: "${hero.subheadline || ''}"\nExisting primary CTA: "${hero.primaryCtaText || hero.ctaText || ''}"\nOffer: "${offer.headline || ''}" — "${offer.price || ''}"`
          }
        ],
        temperature: 0.85,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      let suggestions: any = {};
      try {
        suggestions = JSON.parse(completion.choices[0]?.message?.content || '{}');
      } catch {
        return res.status(500).json({ error: 'AI returned invalid JSON' });
      }
      res.json({ suggestions });
    } catch (error: any) {
      console.error('Error suggesting fields:', error.message);
      res.status(500).json({ error: 'Failed to suggest fields' });
    }
  });

  // ==================== LANDING PAGE PHASE 5: EVENTS / ANALYTICS / VARIANTS / GROWTH ====================

  // PUBLIC: POST record a landing page event (no auth — public tracking)
  app.post("/api/landing-pages/events", async (req: Request, res: Response) => {
    try {
      const { landing_page_id, event_type } = req.body;
      if (!landing_page_id || !event_type) {
        return res.status(400).json({ error: 'landing_page_id and event_type are required' });
      }
      await neonDb.recordLandingPageEvent(req.body);
      res.status(201).json({ ok: true });
    } catch (error: any) {
      console.error('Error recording landing page event:', error.message);
      res.status(500).json({ error: 'Failed to record event' });
    }
  });

  // GET analytics for a single landing page
  app.get("/api/admin/landing-pages/:id/analytics", authOrApiKey('analytics:read'), async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = await neonDb.getLandingPageAnalytics(req.params.id, days);
      res.json(analytics);
    } catch (error: any) {
      console.error('Error fetching landing page analytics:', error.message);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // GET analytics overview across all landing pages
  app.get("/api/admin/landing-pages-analytics-overview", authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const overview = await neonDb.getLandingPagesAnalyticsOverview(userId);
      res.json(overview);
    } catch (error: any) {
      console.error('Error fetching analytics overview:', error.message);
      res.status(500).json({ error: 'Failed to fetch analytics overview' });
    }
  });

  // GET variants for a landing page
  app.get("/api/admin/landing-pages/:id/variants", authenticateUser, async (req: Request, res: Response) => {
    try {
      const variants = await neonDb.listLandingPageVariants(req.params.id);
      res.json(variants);
    } catch (error: any) {
      console.error('Error listing variants:', error.message);
      res.status(500).json({ error: 'Failed to list variants' });
    }
  });

  // POST create a variant
  app.post("/api/admin/landing-pages/:id/variants", authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const body = req.body;
      const variant = await neonDb.createLandingPageVariant({
        landing_page_id: req.params.id,
        user_id: userId,
        variant_key: body.variantKey || body.variant_key,
        name: body.name,
        slug: body.slug || null,
        status: body.status || 'draft',
        traffic_weight: body.trafficWeight ?? body.traffic_weight ?? 0,
        content_json: body.contentJson || body.content_json || {},
        seo_title: body.seoTitle || body.seo_title || null,
        meta_description: body.metaDescription || body.meta_description || null,
        hero_headline: body.heroHeadline || body.hero_headline || null,
        cta_text: body.ctaText || body.cta_text || null,
      });
      res.status(201).json(variant);
    } catch (error: any) {
      console.error('Error creating variant:', error.message);
      res.status(500).json({ error: 'Failed to create variant' });
    }
  });

  // PUT update a variant
  app.put("/api/admin/landing-pages/variants/:variantId", authenticateUser, async (req: Request, res: Response) => {
    try {
      const updated = await neonDb.updateLandingPageVariant(req.params.variantId, req.body);
      if (!updated) return res.status(404).json({ error: 'Variant not found' });
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating variant:', error.message);
      res.status(500).json({ error: 'Failed to update variant' });
    }
  });

  // DELETE a variant
  app.delete("/api/admin/landing-pages/variants/:variantId", authenticateUser, async (req: Request, res: Response) => {
    try {
      const deleted = await neonDb.deleteLandingPageVariant(req.params.variantId);
      if (!deleted) return res.status(404).json({ error: 'Variant not found' });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting variant:', error.message);
      res.status(500).json({ error: 'Failed to delete variant' });
    }
  });

  // POST generate promo pack for a landing page
  app.post("/api/admin/landing-pages/:id/promo-pack", authenticateUser, async (req: Request, res: Response) => {
    try {
      const page = await neonDb.getLandingPage(req.params.id);
      if (!page) return res.status(404).json({ error: 'Landing page not found' });

      const { channels, tone, promoObjective } = req.body;
      const content = typeof page.content_json === 'string' ? JSON.parse(page.content_json) : page.content_json;

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'sk-not-configured' });

      const pageContext = `
Page: "${page.title || page.name || ''}"
Service: ${page.primary_service || 'Photography'}
City: ${page.city || 'Not specified'}
Headline: ${content?.hero?.headline || ''}
Subheadline: ${content?.hero?.subheadline || ''}
CTA: ${content?.hero?.ctaText || ''}
Offer: ${content?.offerSection?.headline || ''} — ${content?.offerSection?.price || ''}
Tone: ${tone || 'warm and professional'}
Objective: ${promoObjective || 'Drive bookings'}
URL: ${page.slug ? `/lp/${page.slug}` : ''}
      `.trim();

      const requestedChannels = channels || ['facebook', 'instagram', 'email', 'gmb'];

      const channelInstructions = requestedChannels.map((ch: string) => {
        switch (ch) {
          case 'facebook': return 'facebookPost: A compelling Facebook post (150-250 words) with emoji and CTA';
          case 'instagram': return 'instagramCaption: Instagram caption with hashtags (100-200 words)';
          case 'email': return 'emailSubject: Email subject line (max 60 chars)\nemailBody: Email body (200-400 words, warm tone)';
          case 'gmb': return 'gmbPost: Google Business Profile post (80-150 words, local focus)';
          case 'whatsapp': return 'whatsappPromo: WhatsApp message (80-150 words, casual)';
          case 'hero_image': return 'heroImagePrompt: Detailed DALL-E/Midjourney prompt for hero image';
          case 'voucher_image': return 'voucherImagePrompt: Image prompt for a voucher/gift card design';
          case 'social_creative': return 'socialCreativePrompt: Image prompt for social media creative';
          default: return '';
        }
      }).filter(Boolean).join('\n');

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_LANDING_MODEL || process.env.OPENAI_PRICE_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert marketing copywriter for photography studios. Generate promotional content for the specified channels. Return ONLY a valid JSON object with these fields:\n${channelInstructions}`
          },
          {
            role: 'user',
            content: pageContext
          }
        ],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      let promoPack;
      try {
        promoPack = JSON.parse(responseText);
      } catch {
        return res.status(500).json({ error: 'AI returned invalid JSON for promo pack' });
      }

      res.json(promoPack);
    } catch (error: any) {
      console.error('Error generating promo pack:', error.message);
      res.status(500).json({ error: 'Failed to generate promo pack' });
    }
  });

  // GET growth insights for a landing page
  app.get("/api/admin/landing-pages/:id/growth-insights", authenticateUser, async (req: Request, res: Response) => {
    try {
      const analytics = await neonDb.getLandingPageAnalytics(req.params.id, 30);
      const page = await neonDb.getLandingPage(req.params.id);
      const variants = await neonDb.listLandingPageVariants(req.params.id);

      const insights: Array<{ type: string; title: string; description: string; metric?: string; actionLabel?: string }> = [];

      // Views insight
      if (analytics.totalViews === 0) {
        insights.push({ type: 'warning', title: 'No Traffic Yet', description: 'This page has no views in the last 30 days. Share it on socials or run a promo.', actionLabel: 'Generate Promo Pack' });
      } else if (analytics.totalViews < 10) {
        insights.push({ type: 'suggestion', title: 'Low Traffic', description: `Only ${analytics.totalViews} views in 30 days. Consider sharing on more channels.`, metric: `${analytics.totalViews} views` });
      } else {
        insights.push({ type: 'success', title: 'Getting Traffic', description: `${analytics.totalViews} views in the last 30 days.`, metric: `${analytics.totalViews} views` });
      }

      // CTR insight
      if (analytics.totalViews > 5) {
        const ctr = analytics.clickThroughRate;
        if (ctr < 0.02) {
          insights.push({ type: 'warning', title: 'Low Click-Through Rate', description: 'Less than 2% of visitors click your CTA. Try a more compelling headline or offer.', metric: `${(ctr * 100).toFixed(1)}% CTR` });
        } else if (ctr >= 0.1) {
          insights.push({ type: 'success', title: 'Strong CTA Performance', description: `${(ctr * 100).toFixed(1)}% of visitors click your CTA — excellent!`, metric: `${(ctr * 100).toFixed(1)}% CTR` });
        }
      }

      // Variants insight
      if (variants.length === 0) {
        insights.push({ type: 'suggestion', title: 'Try A/B Testing', description: 'Create a variant with a different headline or CTA to see what converts better.', actionLabel: 'Create Variant' });
      } else {
        const best = variants.reduce((a: any, b: any) => (b.ctr > a.ctr ? b : a), variants[0]);
        if (best.ctr > 0) {
          insights.push({ type: 'success', title: 'Best Variant', description: `"${best.name}" is performing best with ${(best.ctr * 100).toFixed(1)}% CTR.`, metric: best.name });
        }
      }

      // Conversion insight
      if (analytics.totalFormSubmits > 0) {
        insights.push({ type: 'success', title: 'Conversions Happening', description: `${analytics.totalFormSubmits} form submissions in 30 days.`, metric: `${analytics.totalFormSubmits} conversions` });
      } else if (analytics.totalViews > 20) {
        insights.push({ type: 'warning', title: 'No Conversions', description: 'Lots of views but no form submissions. Review your offer and CTA urgency.' });
      }

      res.json({
        landingPageId: req.params.id,
        totalViews: analytics.totalViews,
        totalCtaClicks: analytics.totalCtaClicks,
        ctr: analytics.clickThroughRate,
        bestCta: analytics.topCtas[0]?.label || null,
        bestVariant: variants.length > 0 ? variants.reduce((a: any, b: any) => (b.ctr > a.ctr ? b : a), variants[0]).name : null,
        strongestSource: null,
        insights,
        recommendedNextAction: insights.find(i => i.actionLabel)?.actionLabel || null,
      });
    } catch (error: any) {
      console.error('Error fetching growth insights:', error.message);
      res.status(500).json({ error: 'Failed to fetch growth insights' });
    }
  });

  // ==================== LANDING PAGE PHASE 6: AUTOMATION / RECOMMENDATIONS / CAMPAIGN HEALTH ====================

  // GET automation rules for a landing page
  app.get("/api/admin/landing-pages/:id/automation-rules", authenticateUser, async (req: Request, res: Response) => {
    try {
      const rules = await neonDb.listLandingPageAutomationRules(req.user!.id, req.params.id);
      res.json(rules);
    } catch (error: any) {
      console.error('Error fetching automation rules:', error.message);
      res.status(500).json({ error: 'Failed to fetch automation rules' });
    }
  });

  // POST create automation rule
  app.post("/api/admin/landing-pages/:id/automation-rules", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { ruleType, name, isEnabled, conditionJson, actionJson, frequency } = req.body;
      if (!ruleType || !name) {
        return res.status(400).json({ error: 'ruleType and name are required' });
      }
      const rule = await neonDb.createLandingPageAutomationRule({
        landingPageId: req.params.id,
        userId: req.user!.id,
        ruleType,
        name,
        isEnabled,
        conditionJson,
        actionJson,
        frequency,
      });
      res.status(201).json(rule);
    } catch (error: any) {
      console.error('Error creating automation rule:', error.message);
      res.status(500).json({ error: 'Failed to create automation rule' });
    }
  });

  // PUT update automation rule
  app.put("/api/admin/landing-pages/automation-rules/:ruleId", authenticateUser, async (req: Request, res: Response) => {
    try {
      const rule = await neonDb.updateLandingPageAutomationRule(req.params.ruleId, req.body);
      if (!rule) return res.status(404).json({ error: 'Rule not found' });
      res.json(rule);
    } catch (error: any) {
      console.error('Error updating automation rule:', error.message);
      res.status(500).json({ error: 'Failed to update automation rule' });
    }
  });

  // DELETE automation rule
  app.delete("/api/admin/landing-pages/automation-rules/:ruleId", authenticateUser, async (req: Request, res: Response) => {
    try {
      const rule = await neonDb.deleteLandingPageAutomationRule(req.params.ruleId);
      if (!rule) return res.status(404).json({ error: 'Rule not found' });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting automation rule:', error.message);
      res.status(500).json({ error: 'Failed to delete automation rule' });
    }
  });

  // GET automation events for a landing page
  app.get("/api/admin/landing-pages/:id/automation-events", authenticateUser, async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const events = await neonDb.listLandingPageAutomationEvents(req.user!.id, req.params.id, limit);
      res.json(events);
    } catch (error: any) {
      console.error('Error fetching automation events:', error.message);
      res.status(500).json({ error: 'Failed to fetch automation events' });
    }
  });

  // GET recommendations for a landing page
  app.get("/api/admin/landing-pages/:id/recommendations", authenticateUser, async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = await neonDb.getLandingPageAnalytics(req.params.id, days);
      const variants = await neonDb.listLandingPageVariants(req.params.id);
      const page = await neonDb.getLandingPage(req.params.id);
      if (!page) return res.status(404).json({ error: 'Page not found' });

      const publishedDaysAgo = page.published_at
        ? Math.floor((Date.now() - new Date(page.published_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Build recommendation context
      const currentMetrics = {
        views: analytics.totalViews || 0,
        ctaClicks: analytics.totalCtaClicks || 0,
        formStarts: analytics.totalFormStarts || 0,
        formSubmits: analytics.totalFormSubmits || 0,
        ctr: analytics.clickThroughRate || 0,
        conversionRate: analytics.conversionRate || 0,
        windowDays: days,
      };

      const recommendations: any[] = [];

      // Low CTR recommendation
      if (currentMetrics.views >= 20 && currentMetrics.ctr < 3) {
        recommendations.push({
          id: `rec_ctr_${Date.now()}`,
          priority: 'high',
          category: 'cta',
          actionType: 'strengthen_cta',
          title: 'Strengthen Your CTA',
          description: `CTR is ${currentMetrics.ctr.toFixed(1)}% — try a more compelling call-to-action.`,
          actionLabel: 'Edit CTA',
          reasoning: `${currentMetrics.views} views but only ${currentMetrics.ctr.toFixed(1)}% CTR.`,
        });
      }

      // No variants
      if (variants.length === 0 && currentMetrics.views >= 30) {
        recommendations.push({
          id: `rec_variant_${Date.now()}`,
          priority: 'medium',
          category: 'variant_testing',
          actionType: 'test_variant',
          title: 'Try A/B Testing',
          description: 'Create a variant with a different headline or CTA.',
          actionLabel: 'Create Variant',
          reasoning: `Page has ${currentMetrics.views} views but no variants.`,
        });
      }

      // Clicks but no conversions
      if (currentMetrics.ctaClicks >= 5 && currentMetrics.formSubmits === 0) {
        recommendations.push({
          id: `rec_conv_${Date.now()}`,
          priority: 'high',
          category: 'offer',
          actionType: 'add_urgency',
          title: 'Add Urgency to Your Offer',
          description: 'People click but don\'t convert. Add a deadline or bonus.',
          actionLabel: 'Edit Offer',
          reasoning: `${currentMetrics.ctaClicks} CTA clicks with 0 submissions.`,
        });
      }

      // No traffic
      if (currentMetrics.views < 5 && publishedDaysAgo > 7) {
        recommendations.push({
          id: `rec_promo_${Date.now()}`,
          priority: 'medium',
          category: 'promotion',
          actionType: 'reshare_social',
          title: 'Re-share on Social Media',
          description: 'This page is getting very little traffic. Promote it again.',
          actionLabel: 'Create Social Post',
          reasoning: `Only ${currentMetrics.views} views in ${days} days.`,
        });
      }

      // Follow up on conversions
      if (currentMetrics.formSubmits >= 3) {
        recommendations.push({
          id: `rec_crm_${Date.now()}`,
          priority: 'medium',
          category: 'crm_followup',
          actionType: 'nurture_leads',
          title: 'Follow Up on Leads',
          description: `${currentMetrics.formSubmits} form submissions — make sure you're responding.`,
          actionLabel: 'View CRM Signals',
          reasoning: `Active conversions happening.`,
        });
      }

      res.json({
        landingPageId: req.params.id,
        generatedAt: new Date().toISOString(),
        recommendations,
        topRecommendation: recommendations[0] || null,
      });
    } catch (error: any) {
      console.error('Error fetching recommendations:', error.message);
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  });

  // GET campaign health for a landing page
  app.get("/api/admin/landing-pages/:id/campaign-health", authenticateUser, async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = await neonDb.getLandingPageAnalytics(req.params.id, days);
      const variants = await neonDb.listLandingPageVariants(req.params.id);
      const page = await neonDb.getLandingPage(req.params.id);
      if (!page) return res.status(404).json({ error: 'Page not found' });

      const publishedDaysAgo = page.published_at
        ? Math.floor((Date.now() - new Date(page.published_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const views = analytics.totalViews || 0;
      const ctaClicks = analytics.totalCtaClicks || 0;
      const formSubmits = analytics.totalFormSubmits || 0;
      const ctr = analytics.clickThroughRate || 0;
      const convRate = analytics.conversionRate || 0;

      // Determine health state
      let state = 'stable';
      let stateLabel = 'Stable';
      const reasons: string[] = [];
      const warnings: string[] = [];
      const opportunities: string[] = [];
      let recommendedNextMove: string | null = null;

      if (views === 0 && publishedDaysAgo > 30) {
        state = 'dormant';
        stateLabel = 'Dormant';
        reasons.push('No views in measurement window.', `Published ${publishedDaysAgo} days ago.`);
        warnings.push('Page has zero traffic. Consider promoting or archiving.');
        recommendedNextMove = 'Promote this page or archive it.';
      } else if (views >= 20 && convRate < 1 && ctaClicks > 0) {
        state = 'needs_attention';
        stateLabel = 'Needs Attention';
        reasons.push(`${views} views but conversion rate is ${convRate.toFixed(1)}%.`);
        warnings.push('CTA clicks exist but no conversions.');
        recommendedNextMove = 'Improve your offer or form.';
      } else if (views >= 10 && ctr >= 3) {
        state = 'healthy';
        stateLabel = 'Healthy';
        reasons.push(`${views} views with ${ctr.toFixed(1)}% CTR.`);
        if (formSubmits > 0) reasons.push(`${formSubmits} conversions.`);
      } else if (views < 5 && publishedDaysAgo > 7) {
        state = 'stalled';
        stateLabel = 'Stalled';
        reasons.push(`Only ${views} views over ${publishedDaysAgo} days.`);
        recommendedNextMove = 'Promote this page again.';
      } else {
        reasons.push('Traffic and engagement are steady.');
      }

      if (variants.length === 0 && views >= 30) {
        opportunities.push('Try A/B testing with a variant.');
      }
      if (formSubmits >= 3) {
        opportunities.push('Follow up on leads — conversions are happening.');
      }

      res.json({
        landingPageId: req.params.id,
        state,
        stateLabel,
        reasons,
        warnings,
        opportunities,
        recommendedNextMove,
        trends: [],
        lastEvaluatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Error fetching campaign health:', error.message);
      res.status(500).json({ error: 'Failed to fetch campaign health' });
    }
  });

  // GET scheduled actions for a landing page
  app.get("/api/admin/landing-pages/:id/scheduled-actions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const actions = await neonDb.listLandingPageScheduledActions(req.user!.id, req.params.id);
      res.json(actions);
    } catch (error: any) {
      console.error('Error fetching scheduled actions:', error.message);
      res.status(500).json({ error: 'Failed to fetch scheduled actions' });
    }
  });

  // POST create scheduled action
  app.post("/api/admin/landing-pages/:id/scheduled-actions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { actionType, actionPayload, scheduledFor } = req.body;
      if (!actionType || !scheduledFor) {
        return res.status(400).json({ error: 'actionType and scheduledFor are required' });
      }
      const action = await neonDb.createLandingPageScheduledAction({
        landingPageId: req.params.id,
        userId: req.user!.id,
        actionType,
        actionPayload,
        scheduledFor,
      });
      res.status(201).json(action);
    } catch (error: any) {
      console.error('Error creating scheduled action:', error.message);
      res.status(500).json({ error: 'Failed to create scheduled action' });
    }
  });

  // GET CRM routing suggestions for a landing page
  app.get("/api/admin/landing-pages/:id/crm-routing", authenticateUser, async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = await neonDb.getLandingPageAnalytics(req.params.id, days);

      const signals: any[] = [];
      const now = new Date().toISOString();

      if (analytics.totalCtaClicks >= 3 && (analytics.totalVoucherClicks || 0) >= 1) {
        signals.push({ signalType: 'strong_buyer_intent', label: 'Strong Buyer Intent', description: `${analytics.totalCtaClicks} CTA clicks and voucher interest.`, strength: 'high', eventCount: analytics.totalCtaClicks, detectedAt: now });
      }
      if (analytics.totalViews >= 5) {
        signals.push({ signalType: 'warm_lead', label: 'Warm Lead Activity', description: `${analytics.totalViews} page views indicate interest.`, strength: analytics.totalViews >= 20 ? 'high' : 'medium', eventCount: analytics.totalViews, detectedAt: now });
      }
      if (analytics.totalFormStarts > 0 && analytics.totalFormSubmits === 0) {
        signals.push({ signalType: 'partial_intent', label: 'Partial Lead Intent', description: `${analytics.totalFormStarts} form starts without submission.`, strength: 'medium', eventCount: analytics.totalFormStarts, detectedAt: now });
      }
      if ((analytics.totalWhatsappClicks || 0) >= 1) {
        signals.push({ signalType: 'immediate_contact', label: 'Immediate Contact Intent', description: `${analytics.totalWhatsappClicks} WhatsApp clicks.`, strength: 'high', eventCount: analytics.totalWhatsappClicks, detectedAt: now });
      }

      const intentScore = signals.reduce((s, sig) => s + (sig.strength === 'high' ? 30 : sig.strength === 'medium' ? 15 : 5), 0);

      const routingRecommendations: any[] = [];
      if (signals.some(s => s.signalType === 'immediate_contact')) {
        routingRecommendations.push({ recommendation: 'Respond to direct contact attempts.', category: 'hot_lead', priority: 'high', suggestedAction: 'Check WhatsApp and missed calls.' });
      }
      if (signals.some(s => s.strength === 'high') && !signals.some(s => s.signalType === 'immediate_contact')) {
        routingRecommendations.push({ recommendation: 'Follow up with high-intent leads.', category: 'follow_up', priority: 'high', suggestedAction: 'Send a personalized follow-up.' });
      }
      if (signals.some(s => s.signalType === 'partial_intent')) {
        routingRecommendations.push({ recommendation: 'Nurture partial leads.', category: 'nurture', priority: 'medium', suggestedAction: 'Simplify the form or send a follow-up email.' });
      }

      res.json({
        landingPageId: req.params.id,
        totalSignals: signals.length,
        overallIntentScore: Math.min(intentScore, 100),
        topSignals: signals,
        routingRecommendations,
        generatedAt: now,
      });
    } catch (error: any) {
      console.error('Error fetching CRM routing:', error.message);
      res.status(500).json({ error: 'Failed to fetch CRM routing data' });
    }
  });

  // POST run automation evaluation for a landing page
  app.post("/api/admin/landing-pages/:id/automation-run", authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const landingPageId = req.params.id;
      const days = parseInt(req.query.days as string) || 30;

      // 1. Gather context
      const [analytics, variants, rules, page] = await Promise.all([
        neonDb.getLandingPageAnalytics(landingPageId, days),
        neonDb.listLandingPageVariants(landingPageId),
        neonDb.listLandingPageAutomationRules(userId, landingPageId),
        neonDb.getLandingPage(landingPageId),
      ]);

      if (!page) return res.status(404).json({ error: 'Page not found' });

      const publishedDaysAgo = page.published_at
        ? Math.floor((Date.now() - new Date(page.published_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const currentMetrics = {
        views: analytics.totalViews || 0,
        ctaClicks: analytics.totalCtaClicks || 0,
        formStarts: analytics.totalFormStarts || 0,
        formSubmits: analytics.totalFormSubmits || 0,
        ctr: analytics.clickThroughRate || 0,
        conversionRate: analytics.conversionRate || 0,
      };

      // 2. Evaluate each enabled rule
      const enabledRules = rules.filter((r: any) => r.is_enabled);
      const results: any[] = [];
      let triggeredCount = 0;

      for (const rule of enabledRules) {
        const condition = typeof rule.condition_json === 'string' ? JSON.parse(rule.condition_json) : rule.condition_json;
        const minSample = condition.minSampleSize ?? 10;
        let triggered = false;
        let reason = '';

        if (currentMetrics.views < minSample) {
          reason = `Not enough data (${currentMetrics.views} views, need ${minSample}).`;
        } else if (condition.metric && condition.operator && condition.threshold !== undefined) {
          const metricMap: Record<string, number> = {
            views: currentMetrics.views,
            ctaClicks: currentMetrics.ctaClicks,
            formStarts: currentMetrics.formStarts,
            formSubmits: currentMetrics.formSubmits,
            ctr: currentMetrics.ctr,
            conversionRate: currentMetrics.conversionRate,
          };
          const val = metricMap[condition.metric] ?? 0;
          switch (condition.operator) {
            case 'lt': triggered = val < condition.threshold; break;
            case 'gt': triggered = val > condition.threshold; break;
            case 'lte': triggered = val <= condition.threshold; break;
            case 'gte': triggered = val >= condition.threshold; break;
            case 'eq': triggered = val === condition.threshold; break;
          }
          reason = triggered
            ? `${condition.metric} is ${val} (${condition.operator} ${condition.threshold}).`
            : `${condition.metric} (${val}) does not meet ${condition.operator} ${condition.threshold}.`;
        } else {
          reason = 'Incomplete condition definition.';
        }

        if (triggered) triggeredCount++;

        const actionJson = typeof rule.action_json === 'string' ? JSON.parse(rule.action_json) : rule.action_json;
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.rule_type,
          triggered,
          reason,
          recommendedAction: triggered ? (actionJson.label || null) : null,
          severity: triggered ? (rule.rule_type.includes('alert') ? 'high' : 'medium') : 'low',
        });

        // Update last_evaluated_at and optionally last_triggered_at
        const updateData: any = { lastEvaluatedAt: new Date().toISOString() };
        if (triggered) updateData.lastTriggeredAt = new Date().toISOString();
        await neonDb.updateLandingPageAutomationRule(rule.id, updateData);

        // Log event for triggered rules
        if (triggered) {
          await neonDb.createLandingPageAutomationEvent({
            landingPageId,
            userId,
            automationRuleId: rule.id,
            eventType: 'rule_triggered',
            eventStatus: 'warning',
            summary: `Rule "${rule.name}" triggered: ${reason}`,
            detailJson: { ruleType: rule.rule_type, metric: condition.metric, threshold: condition.threshold },
          });
        }
      }

      // 3. Log overall run
      await neonDb.createLandingPageAutomationEvent({
        landingPageId,
        userId,
        eventType: 'automation_run_completed',
        eventStatus: 'info',
        summary: `Automation run: ${enabledRules.length} rules evaluated, ${triggeredCount} triggered.`,
        detailJson: { evaluatedCount: enabledRules.length, triggeredCount },
      });

      res.json({
        landingPageId,
        evaluatedCount: enabledRules.length,
        triggeredCount,
        results,
        healthUpdate: triggeredCount > 0 ? `${triggeredCount} automation${triggeredCount > 1 ? 's' : ''} triggered.` : null,
        recommendationUpdates: results.filter(r => r.triggered && r.recommendedAction).map(r => r.recommendedAction),
      });
    } catch (error: any) {
      console.error('Error running automation:', error.message);
      res.status(500).json({ error: 'Failed to run automation evaluation' });
    }
  });

  // ── Phase 7: Landing Page Executions ──────────────────────────────────

  // GET executions for a landing page
  app.get("/api/admin/landing-pages/:id/executions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const landingPageId = req.params.id;
      const status = req.query.status as string | undefined;
      const approvalStatus = req.query.approval_status as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const executions = await neonDb.listLandingPageExecutions(landingPageId, { status, approvalStatus, limit, offset });

      const mapped = executions.map((e: any) => ({
        id: e.id,
        landingPageId: e.landing_page_id,
        userId: e.user_id,
        automationRuleId: e.automation_rule_id,
        sourceEventId: e.source_event_id,
        executionType: e.execution_type,
        executionStatus: e.execution_status,
        approvalStatus: e.approval_status,
        isAutoExecutable: e.is_auto_executable,
        requestedPayload: e.requested_payload,
        executionPayload: e.execution_payload,
        resultJson: e.result_json,
        errorMessage: e.error_message,
        retryCount: e.retry_count,
        queuedAt: e.queued_at,
        executedAt: e.executed_at,
        completedAt: e.completed_at,
        failedAt: e.failed_at,
        approvedAt: e.approved_at,
        approvedBy: e.approved_by,
        rejectedAt: e.rejected_at,
        rejectedBy: e.rejected_by,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      }));

      res.json(mapped);
    } catch (error: any) {
      console.error('Error listing executions:', error.message);
      res.status(500).json({ error: 'Failed to list executions' });
    }
  });

  // GET execution queue summary
  app.get("/api/admin/landing-pages/:id/executions/summary", authenticateUser, async (req: Request, res: Response) => {
    try {
      const summary = await neonDb.getLandingPageExecutionQueueSummary(req.params.id);
      res.json({
        landingPageId: req.params.id,
        totalCount: parseInt(summary.total_count) || 0,
        pendingCount: parseInt(summary.pending_count) || 0,
        awaitingApprovalCount: parseInt(summary.awaiting_approval_count) || 0,
        runningCount: parseInt(summary.running_count) || 0,
        completedCount: parseInt(summary.completed_count) || 0,
        failedCount: parseInt(summary.failed_count) || 0,
        rejectedCount: parseInt(summary.rejected_count) || 0,
      });
    } catch (error: any) {
      console.error('Error getting execution summary:', error.message);
      res.status(500).json({ error: 'Failed to get execution summary' });
    }
  });

  // POST create execution
  app.post("/api/admin/landing-pages/:id/executions", authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const landingPageId = req.params.id;
      const { execution_type, automation_rule_id, source_event_id, requested_payload } = req.body;

      if (!execution_type) {
        return res.status(400).json({ error: 'execution_type is required' });
      }

      // Get user settings to determine approval requirements
      const settings = await neonDb.getLandingPageExecutionSettings(userId, landingPageId);

      // Determine if auto-executable based on policy + settings
      const safeTypes = ['generate_promo_pack', 'queue_social_promo', 'queue_gmb_promo', 'create_follow_up_task'];
      const isSafeType = safeTypes.includes(execution_type);
      const autoExecute = isSafeType && settings?.auto_execute_safe_actions;

      const approvalStatus = autoExecute ? 'not_required' : 'pending';
      const isAutoExecutable = autoExecute || false;

      const execution = await neonDb.createLandingPageExecution({
        landingPageId,
        userId,
        automationRuleId: automation_rule_id || null,
        sourceEventId: source_event_id || null,
        executionType: execution_type,
        approvalStatus,
        isAutoExecutable,
        requestedPayload: requested_payload || {},
      });

      res.status(201).json({
        id: execution.id,
        landingPageId: execution.landing_page_id,
        userId: execution.user_id,
        executionType: execution.execution_type,
        executionStatus: execution.execution_status,
        approvalStatus: execution.approval_status,
        isAutoExecutable: execution.is_auto_executable,
        requestedPayload: execution.requested_payload,
        queuedAt: execution.queued_at,
        createdAt: execution.created_at,
      });
    } catch (error: any) {
      console.error('Error creating execution:', error.message);
      res.status(500).json({ error: 'Failed to create execution' });
    }
  });

  // POST approve execution
  app.post("/api/admin/landing-pages/:id/executions/:executionId/approve", authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const execution = await neonDb.getLandingPageExecution(req.params.executionId);

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }
      if (execution.execution_status !== 'awaiting_approval') {
        return res.status(422).json({ error: `Cannot approve execution in status: ${execution.execution_status}` });
      }

      const updated = await neonDb.updateLandingPageExecutionStatus(execution.id, {
        executionStatus: 'queued',
        approvalStatus: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: userId,
      });

      res.json({
        id: updated.id,
        executionStatus: updated.execution_status,
        approvalStatus: updated.approval_status,
        approvedAt: updated.approved_at,
        approvedBy: updated.approved_by,
      });
    } catch (error: any) {
      console.error('Error approving execution:', error.message);
      res.status(500).json({ error: 'Failed to approve execution' });
    }
  });

  // POST reject execution
  app.post("/api/admin/landing-pages/:id/executions/:executionId/reject", authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const execution = await neonDb.getLandingPageExecution(req.params.executionId);

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }
      if (execution.execution_status !== 'awaiting_approval') {
        return res.status(422).json({ error: `Cannot reject execution in status: ${execution.execution_status}` });
      }

      const updated = await neonDb.updateLandingPageExecutionStatus(execution.id, {
        executionStatus: 'rejected',
        approvalStatus: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: userId,
      });

      res.json({
        id: updated.id,
        executionStatus: updated.execution_status,
        approvalStatus: updated.approval_status,
        rejectedAt: updated.rejected_at,
        rejectedBy: updated.rejected_by,
      });
    } catch (error: any) {
      console.error('Error rejecting execution:', error.message);
      res.status(500).json({ error: 'Failed to reject execution' });
    }
  });

  // POST retry execution
  app.post("/api/admin/landing-pages/:id/executions/:executionId/retry", authenticateUser, async (req: Request, res: Response) => {
    try {
      const execution = await neonDb.getLandingPageExecution(req.params.executionId);

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }
      if (execution.execution_status !== 'failed') {
        return res.status(422).json({ error: `Cannot retry execution in status: ${execution.execution_status}` });
      }
      if (execution.retry_count >= 3) {
        return res.status(422).json({ error: 'Maximum retry limit reached' });
      }

      const updated = await neonDb.updateLandingPageExecutionStatus(execution.id, {
        executionStatus: 'queued',
        approvalStatus: execution.approval_status,
        retryCount: execution.retry_count + 1,
        errorMessage: null,
        failedAt: null,
      });

      res.json({
        id: updated.id,
        executionStatus: updated.execution_status,
        retryCount: updated.retry_count,
      });
    } catch (error: any) {
      console.error('Error retrying execution:', error.message);
      res.status(500).json({ error: 'Failed to retry execution' });
    }
  });

  // POST cancel execution
  app.post("/api/admin/landing-pages/:id/executions/:executionId/cancel", authenticateUser, async (req: Request, res: Response) => {
    try {
      const execution = await neonDb.getLandingPageExecution(req.params.executionId);

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }
      const cancellable = ['pending', 'awaiting_approval', 'queued'];
      if (!cancellable.includes(execution.execution_status)) {
        return res.status(422).json({ error: `Cannot cancel execution in status: ${execution.execution_status}` });
      }

      const updated = await neonDb.updateLandingPageExecutionStatus(execution.id, {
        executionStatus: 'cancelled',
      });

      res.json({
        id: updated.id,
        executionStatus: updated.execution_status,
      });
    } catch (error: any) {
      console.error('Error cancelling execution:', error.message);
      res.status(500).json({ error: 'Failed to cancel execution' });
    }
  });

  // POST run/dispatch execution (simulation — executes and marks complete)
  app.post("/api/admin/landing-pages/:id/executions/:executionId/run", authenticateUser, async (req: Request, res: Response) => {
    try {
      const execution = await neonDb.getLandingPageExecution(req.params.executionId);

      if (!execution) {
        return res.status(404).json({ error: 'Execution not found' });
      }
      if (execution.execution_status !== 'queued') {
        return res.status(422).json({ error: `Cannot run execution in status: ${execution.execution_status}` });
      }

      // Mark as running
      await neonDb.updateLandingPageExecutionStatus(execution.id, {
        executionStatus: 'running',
        executedAt: new Date().toISOString(),
      });

      // Simulate execution — in production this would dispatch to actual handlers
      const resultJson = {
        executionType: execution.execution_type,
        simulatedAt: new Date().toISOString(),
        note: 'Execution dispatched successfully (simulated handler)',
        requestedPayload: execution.requested_payload,
      };

      const completed = await neonDb.updateLandingPageExecutionStatus(execution.id, {
        executionStatus: 'completed',
        resultJson,
        completedAt: new Date().toISOString(),
      });

      res.json({
        id: completed.id,
        executionType: completed.execution_type,
        executionStatus: completed.execution_status,
        resultJson: completed.result_json,
        completedAt: completed.completed_at,
      });
    } catch (error: any) {
      console.error('Error running execution:', error.message);
      // If running fails, mark as failed
      try {
        await neonDb.updateLandingPageExecutionStatus(req.params.executionId, {
          executionStatus: 'failed',
          errorMessage: error.message,
          failedAt: new Date().toISOString(),
        });
      } catch (_) { /* ignore cleanup error */ }
      res.status(500).json({ error: 'Failed to run execution' });
    }
  });

  // GET single landing page (admin)
  app.get("/api/admin/landing-pages/:id/execution-settings", authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const landingPageId = req.params.id;
      const settings = await neonDb.getLandingPageExecutionSettings(userId, landingPageId);

      if (!settings) {
        return res.json({
          userId,
          landingPageId,
          autoExecuteSafeActions: false,
          requireApprovalForContentChanges: true,
          requireApprovalForCrmPushes: true,
          requireApprovalForVariantCreation: true,
        });
      }

      res.json({
        id: settings.id,
        userId: settings.user_id,
        landingPageId: settings.landing_page_id,
        autoExecuteSafeActions: settings.auto_execute_safe_actions,
        requireApprovalForContentChanges: settings.require_approval_for_content_changes,
        requireApprovalForCrmPushes: settings.require_approval_for_crm_pushes,
        requireApprovalForVariantCreation: settings.require_approval_for_variant_creation,
        createdAt: settings.created_at,
        updatedAt: settings.updated_at,
      });
    } catch (error: any) {
      console.error('Error getting execution settings:', error.message);
      res.status(500).json({ error: 'Failed to get execution settings' });
    }
  });

  // PUT execution settings
  app.put("/api/admin/landing-pages/:id/execution-settings", authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const landingPageId = req.params.id;
      const { auto_execute_safe_actions, require_approval_for_content_changes, require_approval_for_crm_pushes, require_approval_for_variant_creation } = req.body;

      const settings = await neonDb.upsertLandingPageExecutionSettings(userId, landingPageId, {
        autoExecuteSafeActions: auto_execute_safe_actions,
        requireApprovalForContentChanges: require_approval_for_content_changes,
        requireApprovalForCrmPushes: require_approval_for_crm_pushes,
        requireApprovalForVariantCreation: require_approval_for_variant_creation,
      });

      res.json({
        id: settings.id,
        userId: settings.user_id,
        landingPageId: settings.landing_page_id,
        autoExecuteSafeActions: settings.auto_execute_safe_actions,
        requireApprovalForContentChanges: settings.require_approval_for_content_changes,
        requireApprovalForCrmPushes: settings.require_approval_for_crm_pushes,
        requireApprovalForVariantCreation: settings.require_approval_for_variant_creation,
        updatedAt: settings.updated_at,
      });
    } catch (error: any) {
      console.error('Error updating execution settings:', error.message);
      res.status(500).json({ error: 'Failed to update execution settings' });
    }
  });

  // PUBLIC: GET landing page by slug (for live pages + preview token)
  app.get("/api/lp/:slug", async (req: Request, res: Response) => {
    try {
      const previewToken = req.query.preview as string | undefined;

      // Sign the voucher-offer amount server-side so the CTA URL can't be edited
      // to pay a different price (the checkout verifies this token).
      //
      // Amount priority: explicit cta_voucher_amount (Settings panel) → the
      // price advertised in the page's own generated content
      // (content_json.offerSection.price, e.g. "€225" / "ab 1.299€"). The
      // content fallback means every AI-generated landing page's "Jetzt
      // buchen" opens the voucher personalization flow at the page's own
      // advertised price out of the box — previously an unconfigured page
      // fell through to a dead '/contact' route.
      const parseOfferPrice = (raw: any): number => {
        if (!raw) return 0;
        let s = String(raw);
        // German formats: strip thousands dots ("1.299"), comma decimals ("225,50")
        s = s.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
        const m = s.match(/\d+(?:\.\d{1,2})?/);
        return m ? parseFloat(m[0]) : 0;
      };
      const attachOfferToken = async (pg: any) => {
        if (!pg) return pg;
        const amount = Number(pg.cta_voucher_amount) > 0
          ? Number(pg.cta_voucher_amount)
          : parseOfferPrice(pg.content_json?.offerSection?.price);
        if (amount > 0) {
          const { signOfferToken } = await import('./utils/offer-token');
          const title = pg.cta_voucher_title || pg.content_json?.offerSection?.headline || pg.title || 'Gutschein';
          // Carry the bound voucher product slug so product-restricted coupons
          // (e.g. a "Family Classic only" code) can correctly match — or be
          // correctly rejected — at checkout for landing-page offer purchases.
          const offerSlug = (pg.cta_voucher_slug && String(pg.cta_voucher_slug).trim()) || undefined;
          pg.cta_offer_token = signOfferToken({ amount, title, slug: offerSlug });
          // Let the client's amount>0 branch engage even when the amount came
          // from page content rather than the Settings panel.
          if (!(Number(pg.cta_voucher_amount) > 0)) pg.cta_voucher_amount = amount;
        }
        return pg;
      };

      // Optional on-the-fly translation of the page copy. German is the
      // authoring language; when the visitor picks another language (?language=en)
      // we deep-translate the title + content_json and cache per-string, so the
      // studio only ever authors once. Non-copy fields (URLs, colours, prices,
      // ids) are left untouched by translateDeep, and CTA tokens are re-signed
      // afterwards so the offer amount is never affected by translation.
      const maybeTranslatePage = async (pg: any, langRaw: any) => {
        const lang = String(langRaw || 'de').toLowerCase();
        if (!pg || lang === 'de' || !/^[a-z]{2}$/.test(lang)) return pg;
        try {
          const { translateText, translateDeep } = await import('./lib/translate');
          const [title, content_json] = await Promise.all([
            translateText(pg.title, lang),
            translateDeep(pg.content_json, lang),
          ]);
          return { ...pg, title, content_json, _language: lang };
        } catch (e) {
          console.warn('[lp] translation failed, serving original:', (e as Error).message);
          return pg;
        }
      };

      // If preview token provided, try preview access first (allows viewing unpublished pages)
      if (previewToken) {
        const previewPage = await neonDb.getLandingPageForPreview(req.params.slug, previewToken);
        if (previewPage) {
          return res.json({ ...(await attachOfferToken(await maybeTranslatePage(previewPage, req.query.language))), _isPreview: true });
        }
        // Invalid/expired token — fall through to normal published check
      }

      const page = await neonDb.getLandingPageBySlug(req.params.slug);
      if (!page) return res.status(404).json({ error: 'Page not found' });
      res.json(await attachOfferToken(await maybeTranslatePage(page, req.query.language)));
    } catch (error) {
      console.error('Error fetching public landing page:', error);
      res.status(500).json({ error: 'Failed to fetch page' });
    }
  });

  // ==================== EMAIL AUTOMATIONS CRUD ====================
  
  // GET all automations
  app.get("/api/admin/automations", authenticateUser, async (req: Request, res: Response) => {
    try {
      const automations = await db.select().from(emailAutomations).orderBy(emailAutomations.offsetHours);
      res.json(automations);
    } catch (error) {
      console.error("Error fetching automations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET single automation
  app.get("/api/admin/automations/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const result = await db.select().from(emailAutomations).where(eq(emailAutomations.id, parseInt(req.params.id))).limit(1);
      if (result.length === 0) return res.status(404).json({ error: "Automation not found" });
      res.json(result[0]);
    } catch (error) {
      console.error("Error fetching automation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST create automation
  app.post("/api/admin/automations", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { name, description, triggerType, offsetHours, emailSubject, emailBodyHtml, questionnaireSlug, enabled } = req.body;
      const result = await db.insert(emailAutomations).values({
        name, description, triggerType, offsetHours: parseInt(offsetHours),
        emailSubject, emailBodyHtml, questionnaireSlug: questionnaireSlug || null,
        enabled: enabled !== false
      }).returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Error creating automation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // PUT update automation
  app.put("/api/admin/automations/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      const { name, description, triggerType, offsetHours, emailSubject, emailBodyHtml, questionnaireSlug, enabled } = req.body;
      const updates: any = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (triggerType !== undefined) updates.triggerType = triggerType;
      if (offsetHours !== undefined) updates.offsetHours = parseInt(offsetHours);
      if (emailSubject !== undefined) updates.emailSubject = emailSubject;
      if (emailBodyHtml !== undefined) updates.emailBodyHtml = emailBodyHtml;
      if (questionnaireSlug !== undefined) updates.questionnaireSlug = questionnaireSlug || null;
      if (enabled !== undefined) updates.enabled = enabled;
      
      const result = await db.update(emailAutomations).set(updates).where(eq(emailAutomations.id, parseInt(req.params.id))).returning();
      if (result.length === 0) return res.status(404).json({ error: "Automation not found" });
      res.json(result[0]);
    } catch (error) {
      console.error("Error updating automation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE automation
  app.delete("/api/admin/automations/:id", authenticateUser, async (req: Request, res: Response) => {
    try {
      await db.delete(emailAutomations).where(eq(emailAutomations.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting automation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET automation logs (for viewing sent emails)
  app.get("/api/admin/automations/:id/logs", authenticateUser, async (req: Request, res: Response) => {
    try {
      const logs = await db.select().from(emailAutomationLogs)
        .where(eq(emailAutomationLogs.automationId, parseInt(req.params.id)))
        .orderBy(desc(emailAutomationLogs.sentAt))
        .limit(50);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching automation logs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST test/preview an automation email (sends to admin)
  app.post("/api/admin/automations/:id/test", authenticateUser, async (req: Request, res: Response) => {
    try {
      const automation = await db.select().from(emailAutomations).where(eq(emailAutomations.id, parseInt(req.params.id))).limit(1);
      if (automation.length === 0) return res.status(404).json({ error: "Automation not found" });

      const rule = automation[0];
      const testHtml = rule.emailBodyHtml
        .replace(/\{\{clientName\}\}/g, 'Max Mustermann')
        .replace(/\{\{bookingDate\}\}/g, '15. März 2026')
        .replace(/\{\{bookingTime\}\}/g, '14:00 Uhr')
        .replace(/\{\{questionnaireLink\}\}/g, `${getBaseUrl()}/q/${rule.questionnaireSlug || 'pre-shoot'}`);

      const testSubject = rule.emailSubject
        .replace(/\{\{clientName\}\}/g, 'Max Mustermann')
        .replace(/\{\{bookingDate\}\}/g, '15. März 2026')
        .replace(/\{\{bookingTime\}\}/g, '14:00 Uhr');

      const transporter = nodemailer.createTransport({
        host: 'smtp.easyname.com', port: 465, secure: true,
        auth: { user: process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || '', pass: process.env.EMAIL_PASSWORD || '' }
      });

      const adminEmail = getEnvContactEmailSync();
      await transporter.sendMail({
        from: `"${getBizName()}" <${adminEmail || 'no-reply@localhost'}>`,
        to: adminEmail,
        subject: `[TEST] ${testSubject}`,
        html: testHtml
      });

      res.json({ success: true, message: `Test-E-Mail an ${adminEmail} gesendet` });
    } catch (error) {
      console.error("Error sending test automation:", error);
      res.status(500).json({ error: "Fehler beim Senden der Test-E-Mail" });
    }
  });

  // ==================== BACKGROUND AUTOMATION CRON JOB ====================
  let automationInterval: NodeJS.Timeout | null = null;
  let isAutomationRunning = false;

  const AUTOMATION_CHECK_INTERVAL_MS = 30 * 60 * 1000; // Check every 30 minutes

  const runAutomationCheck = async () => {
    if (isAutomationRunning) return;
    isAutomationRunning = true;

    try {
      // Get all enabled automations
      const automations = await db.select().from(emailAutomations).where(eq(emailAutomations.enabled, true));
      if (automations.length === 0) { isAutomationRunning = false; return; }

      // Get all confirmed bookings (not cancelled) with dates in the relevant range
      const now = new Date();
      const bookings = await db.select().from(schedulerBookings).where(
        and(
          eq(schedulerBookings.status, 'confirmed'),
          sql`${schedulerBookings.clientEmail} IS NOT NULL AND ${schedulerBookings.clientEmail} != ''`
        )
      );

      if (bookings.length === 0) { isAutomationRunning = false; return; }

      // Set up transporter once
      const emailPassword = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
      if (!emailPassword) { isAutomationRunning = false; return; }

      const transporter = nodemailer.createTransport({
        host: 'smtp.easyname.com', port: 465, secure: true,
        auth: { user: process.env.BUSINESS_MAILBOX_USER || process.env.SMTP_USER || '', pass: emailPassword }
      });
      const fromEmail = getEnvContactEmailSync() || 'no-reply@localhost';

      let emailsSent = 0;

      for (const rule of automations) {
        for (const booking of bookings) {
          try {
            const bookingDate = new Date(booking.scheduledDate);
            
            // Calculate when this email should be sent
            // offsetHours is negative for "before" (e.g. -48 = 2 days before) and positive for "after"
            const sendAt = new Date(bookingDate.getTime() + rule.offsetHours * 60 * 60 * 1000);
            
            // Check if we're in the send window:
            // The email should be sent if sendAt is in the past (or within 30 min from now)
            // but not more than 30 minutes ago (to avoid re-sending on every cycle)
            const timeDiff = now.getTime() - sendAt.getTime();
            const withinWindow = timeDiff >= 0 && timeDiff < AUTOMATION_CHECK_INTERVAL_MS;

            if (!withinWindow) continue;

            // Check if already sent for this booking+automation combo
            const existingLog = await db.select().from(emailAutomationLogs).where(
              and(
                eq(emailAutomationLogs.automationId, rule.id),
                eq(emailAutomationLogs.bookingId, booking.id)
              )
            ).limit(1);

            if (existingLog.length > 0) continue;

            // Prepare email content with variable substitution
            const dateFormatter = new Intl.DateTimeFormat('de-AT', { 
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              timeZone: 'Europe/Vienna'
            });
            const timeFormatter = new Intl.DateTimeFormat('de-AT', {
              hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna'
            });

            const formattedDate = dateFormatter.format(bookingDate);
            const formattedTime = timeFormatter.format(bookingDate) + ' Uhr';
            const questionnaireLink = rule.questionnaireSlug 
              ? `${getBaseUrl()}/q/${rule.questionnaireSlug}`
              : '';

            const emailHtml = rule.emailBodyHtml
              .replace(/\{\{clientName\}\}/g, booking.clientName || 'Kunde')
              .replace(/\{\{bookingDate\}\}/g, formattedDate)
              .replace(/\{\{bookingTime\}\}/g, formattedTime)
              .replace(/\{\{questionnaireLink\}\}/g, questionnaireLink);

            const emailSubject = rule.emailSubject
              .replace(/\{\{clientName\}\}/g, booking.clientName || 'Kunde')
              .replace(/\{\{bookingDate\}\}/g, formattedDate)
              .replace(/\{\{bookingTime\}\}/g, formattedTime);

            // Send the email
            await transporter.sendMail({
              from: `"${getBizName()}" <${fromEmail}>`,
              to: booking.clientEmail,
              subject: emailSubject,
              html: emailHtml
            });

            // Log the sent email
            await db.insert(emailAutomationLogs).values({
              automationId: rule.id,
              bookingId: booking.id,
              clientEmail: booking.clientEmail,
              clientName: booking.clientName,
              status: 'sent'
            });

            emailsSent++;
            console.log(`📧 Automation "${rule.name}" sent to ${booking.clientEmail} for booking ${booking.id}`);
          } catch (sendError: any) {
            console.error(`❌ Automation "${rule.name}" failed for booking ${booking.id}:`, sendError.message);
            // Log the failure
            try {
              await db.insert(emailAutomationLogs).values({
                automationId: rule.id,
                bookingId: booking.id,
                clientEmail: booking.clientEmail || 'unknown',
                clientName: booking.clientName,
                status: 'failed',
                errorMessage: sendError.message
              });
            } catch (_) {}
          }
        }
      }

      if (emailsSent > 0) {
        console.log(`✅ Automation check complete: ${emailsSent} email(s) sent`);
      }
    } catch (error) {
      console.error('❌ Automation check error:', error);
    } finally {
      isAutomationRunning = false;
    }
  };

  // Start the automation cron job
  const startAutomationCron = () => {
    if (process.env.DEMO_MODE === 'true') {
      console.log('🤖 Email automations disabled in demo mode');
      return;
    }

    // First check after 60 seconds
    setTimeout(() => runAutomationCheck(), 60 * 1000);

    // Then every 30 minutes
    automationInterval = setInterval(() => runAutomationCheck(), AUTOMATION_CHECK_INTERVAL_MS);
    console.log('✅ Email automation cron started (checks every 30 min)');
  };

  startAutomationCron();

  const httpServer = createServer(app);
  return httpServer;
}

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        isAdmin: boolean;
      };
    }
  }
}
