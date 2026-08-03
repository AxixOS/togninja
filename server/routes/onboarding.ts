import express from "express";
import { pool } from "../db";

const router = express.Router();

// Lightweight helpers used by crawl + analysis
function normalizeUrl(u: string): string {
  try {
    const parsed = new URL(u);
    parsed.hash = "";
    const p = parsed.pathname.replace(/\/$/, "");
    parsed.pathname = p || "/";
    return parsed.toString();
  } catch {
    return u;
  }
}
function sameHost(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    return ua.host === ub.host;
  } catch {
    return false;
  }
}
async function fetchWithTimeout(u: string, ms = 12000): Promise<Response> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(u, { signal: ac.signal, redirect: "follow" });
  } finally {
    clearTimeout(t);
  }
}
function extractTitleAndLinks(html: string, baseUrl: string): { title: string | null; links: string[]; assets: string[]; meta: Record<string, string> } {
  const out = { title: null as string | null, links: [] as string[], assets: [] as string[], meta: {} as Record<string, string> };
  try {
    const t = html.match(/<title>([\s\S]*?)<\/title>/i);
    out.title = t ? t[1].trim().slice(0, 300) : null;
  } catch {}
  try {
    const hrefRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/ig;
    const srcRe = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/ig;
    const linkCssRe = /<link\s+[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/ig;
    let m: RegExpExecArray | null;
  const urls = new Set<string>();
  while ((m = hrefRe.exec(html))) { urls.add(m[1]); }
    while ((m = linkCssRe.exec(html))) { out.assets.push(m[1]); }
    while ((m = srcRe.exec(html))) { out.assets.push(m[1]); }
    const resolved: string[] = [];
    urls.forEach((raw) => {
      try { resolved.push(new URL(raw, baseUrl).toString()); } catch {}
    });
    out.links = resolved;

    // meta tags
    try {
      const metaRe = /<meta\s+([^>]*?)>/ig;
      let mm: RegExpExecArray | null;
      while ((mm = metaRe.exec(html))) {
        const tag = mm[1] || "";
        const nameMatch = tag.match(/\bname=["']([^"']+)["']/i);
        const propMatch = tag.match(/\bproperty=["']([^"']+)["']/i);
        const contentMatch = tag.match(/\bcontent=["']([^"']+)["']/i);
        const key = (nameMatch?.[1] || propMatch?.[1] || "").toLowerCase();
        const val = contentMatch?.[1] || "";
        if (key && val) out.meta[key] = val;
      }
    } catch {}
  } catch {}
  return out;
}

// Sitemap helpers (hoisted to module scope to avoid ES5 block function issues)
async function findSitemaps(siteUrl: string): Promise<string[]> {
  const sites = new Set<string>();
  try {
    const robotsUrl = new URL("/robots.txt", siteUrl).toString();
    const r = await fetchWithTimeout(robotsUrl, 6000);
    if (r.ok) {
      const txt = await r.text();
      const lines = txt.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const m = line.match(/sitemap:\s*(.+)/i);
        if (m && m[1]) {
          try { sites.add(new URL(m[1].trim(), robotsUrl).toString()); } catch {}
        }
      }
    }
  } catch {}
  try { sites.add(new URL("/sitemap.xml", siteUrl).toString()); } catch {}
  try { sites.add(new URL("/sitemap_index.xml", siteUrl).toString()); } catch {}
  return Array.from(sites);
}

async function parseSitemapXml(u: string): Promise<string[]> {
  try {
    const r = await fetchWithTimeout(u, 8000);
    if (!r.ok) return [];
    const xml = await r.text();
    const out: string[] = [];
    const locRe = /<loc>([\s\S]*?)<\/loc>/gi;
    let m: RegExpExecArray | null;
    while ((m = locRe.exec(xml))) { out.push(m[1].trim()); }
    return out;
  } catch { return []; }
}

// Ensure all onboarding-related tables exist (idempotent)
let onboardingEnsured = false;
async function ensureOnboardingSchema() {
  if (onboardingEnsured) return;
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
    await client.query(`
      CREATE TABLE IF NOT EXISTS onboarding_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_email text,
        stripe_session_id text,
        start_url text,
        status text DEFAULT 'started',
        crawl_status text DEFAULT 'pending',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS crawl_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        onboarding_session_id uuid NOT NULL REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
        seed_url text NOT NULL,
        sitemap_url text,
        status text DEFAULT 'pending',
        pages_discovered integer DEFAULT 0,
        pages_crawled integer DEFAULT 0,
        error text,
        started_at timestamptz,
        completed_at timestamptz,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS website_pages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        crawl_job_id uuid NOT NULL REFERENCES crawl_jobs(id) ON DELETE CASCADE,
        url text NOT NULL,
        status text,
        http_status integer,
        content_type text,
        title text,
        html text,
        text_content text,
        meta jsonb DEFAULT '{}'::jsonb,
        links jsonb DEFAULT '[]'::jsonb,
        assets jsonb DEFAULT '[]'::jsonb,
        screenshot_url text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS theme_analysis (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        onboarding_session_id uuid NOT NULL REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
        theme_name text,
        detected_stack text,
        primary_color text,
        secondary_color text,
        font_family text,
        layout_meta jsonb DEFAULT '{}'::jsonb,
        score numeric,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_credentials (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        onboarding_session_id uuid NOT NULL REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
        type text NOT NULL,
        data jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS price_lists (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        onboarding_session_id uuid NOT NULL REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
        name text,
        currency text DEFAULT 'EUR',
        items jsonb DEFAULT '[]'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS client_imports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        onboarding_session_id uuid NOT NULL REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
        source text,
        status text DEFAULT 'pending',
        total integer DEFAULT 0,
        imported integer DEFAULT 0,
        error text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON onboarding_sessions(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_crawl_jobs_session ON crawl_jobs(onboarding_session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_website_pages_job ON website_pages(crawl_job_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_website_pages_url ON website_pages((lower(url)))`);
    onboardingEnsured = true;
    console.log("✅ Onboarding schema ensured (Express)");
  } finally {
    client.release();
  }
}

// POST /api/onboarding/start
router.post("/start", async (req, res) => {
  try {
    await ensureOnboardingSchema();
    const { start_url, url, email, customer_email, stripe_session_id } = req.body || {};
    const startUrl = String(start_url || url || "").trim();
    if (!startUrl) return res.status(400).json({ error: "start_url required" });
    const custEmail = email || customer_email || null;

    const ins = await pool.query(
      `INSERT INTO onboarding_sessions(customer_email, stripe_session_id, start_url, status, crawl_status)
       VALUES ($1, $2, $3, 'started', 'pending') RETURNING id`,
      [custEmail, stripe_session_id || null, startUrl]
    );
    const session_id = ins.rows[0].id;
    const job = await pool.query(
      `INSERT INTO crawl_jobs(onboarding_session_id, seed_url, status)
       VALUES ($1, $2, 'pending') RETURNING id`,
      [session_id, startUrl]
    );
    return res.json({ ok: true, session_id, job_id: job.rows[0].id });
  } catch (e: any) {
    console.error("/onboarding/start error:", e);
    return res.status(500).json({ ok: false, error: e.message || "start failed" });
  }
});

// POST /api/onboarding/run-crawl
router.post("/run-crawl", async (req, res) => {
  try {
    await ensureOnboardingSchema();
    const { session_id, onboarding_session_id, max_pages } = req.body || {};
    const sid = session_id || onboarding_session_id;
    const maxPages = Math.min(25, Math.max(1, Number(max_pages || 10)));
    if (!sid) return res.status(400).json({ error: "session_id required" });

    const s = await pool.query(`SELECT id, start_url FROM onboarding_sessions WHERE id = $1 LIMIT 1`, [sid]);
    if (!s.rows.length) return res.status(404).json({ error: "session not found" });
    const startUrl: string = s.rows[0].start_url;

    const j = await pool.query(`SELECT id, status FROM crawl_jobs WHERE onboarding_session_id = $1 ORDER BY created_at DESC LIMIT 1`, [sid]);
    if (!j.rows.length) return res.status(404).json({ error: "crawl job not found" });
    const jobId: string = j.rows[0].id;

    await pool.query(`UPDATE crawl_jobs SET status = 'running', started_at = now(), error = NULL WHERE id = $1`, [jobId]);

    const queue: string[] = [normalizeUrl(startUrl)];
    const visited = new Set<string>();
    let crawled = 0;
    let discovered = 1;
    const origin = new URL(startUrl).toString();

    while (queue.length && crawled < maxPages) {
      const current = queue.shift()!;
      if (!current || visited.has(current)) continue;
      visited.add(current);
      try {
        const resp = await fetchWithTimeout(current, 12000);
        const ct = String(resp.headers.get("content-type") || "");
        const http_status = resp.status;
        let html = "";
        if (ct.includes("text/html")) html = await resp.text();
        const { title, links, assets, meta } = html
          ? extractTitleAndLinks(html, current)
          : { title: null, links: [] as string[], assets: [] as string[], meta: {} as Record<string, string> };
        const text_content = html
          ? html
              .replace(/<script[\s\S]*?<\/script>/gi, " ")
              .replace(/<style[\s\S]*?<\/style>/gi, " ")
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 20000)
          : null;
        const trimmedHtml = html ? html.slice(0, 200000) : null;
        await pool.query(
          `INSERT INTO website_pages(crawl_job_id, url, status, http_status, content_type, title, html, text_content, links, assets, meta)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb)`,
          [
            jobId,
            current,
            http_status >= 200 && http_status < 400 ? "ok" : "error",
            http_status,
            ct,
            title,
            trimmedHtml,
            text_content,
            JSON.stringify(links),
            JSON.stringify(assets),
            JSON.stringify(meta)
          ]
        );
        crawled++;
        for (const link of links) {
          if (!sameHost(link, origin)) continue;
          const n = normalizeUrl(link);
          if (!visited.has(n) && queue.length + crawled < maxPages * 2) {
            queue.push(n);
            discovered++;
          }
        }
      } catch (err) {
        await pool.query(
          `INSERT INTO website_pages(crawl_job_id, url, status, http_status, content_type, title, html, text_content, links, assets)
           VALUES ($1, $2, 'error', $3, NULL, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb)`,
          [jobId, current, null]
        );
      }
    }

    await pool.query(
      `UPDATE crawl_jobs SET status = 'completed', pages_discovered = $2, pages_crawled = $3, completed_at = now(), updated_at = now() WHERE id = $1`,
      [jobId, discovered, crawled]
    );
    await pool.query(`UPDATE onboarding_sessions SET crawl_status = 'completed', updated_at = now() WHERE id = $1`, [sid]);

    return res.json({ ok: true, session_id: sid, job_id: jobId, crawled, discovered });
  } catch (e: any) {
    console.error("/onboarding/run-crawl error:", e);
    return res.status(500).json({ ok: false, error: e.message || "crawl failed" });
  }
});

// GET /api/onboarding/status
router.get("/status", async (req, res) => {
  try {
    await ensureOnboardingSchema();
    const session_id = String(req.query.session_id || "").trim();
    if (!session_id) return res.status(400).json({ error: "session_id required" });
    const s = await pool.query(
      `SELECT id, customer_email, stripe_session_id, start_url, status, crawl_status, created_at, updated_at FROM onboarding_sessions WHERE id = $1 LIMIT 1`,
      [session_id]
    );
    if (!s.rows.length) return res.status(404).json({ error: "not found" });
    const j = await pool.query(
      `SELECT id, status, pages_discovered, pages_crawled, error, started_at, completed_at FROM crawl_jobs WHERE onboarding_session_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [session_id]
    );
    return res.json({ ok: true, session: s.rows[0], job: j.rows[0] || null });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message || "status failed" });
  }
});

// GET /api/onboarding/pages
router.get("/pages", async (req, res) => {
  try {
    await ensureOnboardingSchema();
    const session_id = String(req.query.session_id || "").trim();
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || "50"), 10)));
    if (!session_id) return res.status(400).json({ error: "session_id required" });
    const j = await pool.query(`SELECT id FROM crawl_jobs WHERE onboarding_session_id = $1 ORDER BY created_at DESC LIMIT 1`, [session_id]);
    if (!j.rows.length) return res.json({ ok: true, pages: [] });
    const pages = await pool.query(
      `SELECT id, url, status, http_status, title, content_type, created_at FROM website_pages WHERE crawl_job_id = $1 ORDER BY created_at ASC LIMIT $2`,
      [j.rows[0].id, limit]
    );
    return res.json({ ok: true, pages: pages.rows });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message || "pages failed" });
  }
});

// GET /api/onboarding/page-detail
router.get("/page-detail", async (req, res) => {
  try {
    await ensureOnboardingSchema();
    const session_id = String(req.query.session_id || "").trim();
    const pageUrl = String(req.query.url || "").trim();
    if (!session_id || !pageUrl) return res.status(400).json({ error: "session_id and url required" });
    const j = await pool.query(`SELECT id FROM crawl_jobs WHERE onboarding_session_id = $1 ORDER BY created_at DESC LIMIT 1`, [session_id]);
    if (!j.rows.length) return res.status(404).json({ error: "job not found" });
    const row = await pool.query(
      `SELECT id, url, status, http_status, content_type, title, html, text_content, meta, links, assets, created_at FROM website_pages WHERE crawl_job_id = $1 AND lower(url) = lower($2) LIMIT 1`,
      [j.rows[0].id, pageUrl]
    );
    return res.json({ ok: true, page: row.rows[0] || null });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message || "page-detail failed" });
  }
});

// GET /api/onboarding/discover-sitemap
router.get("/discover-sitemap", async (req, res) => {
  try {
    const base = String(req.query.url || "").trim();
    if (!base) return res.status(400).json({ error: "url required" });

    const sitemapUrls = await findSitemaps(base);
    const discovered: string[] = [];
    for (const s of sitemapUrls) {
      const urls = await parseSitemapXml(s);
      discovered.push(...urls.filter(u => sameHost(u, base)));
    }
    const set = Array.from(new Set(discovered)).slice(0, 500);
    return res.json({ ok: true, sitemaps: sitemapUrls, urls: set });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message || "discover-sitemap failed" });
  }
});

// GET /api/onboarding/robots
router.get("/robots", async (req, res) => {
  try {
    const base = String(req.query.url || "").trim();
    if (!base) return res.status(400).json({ error: "url required" });
    const robotsUrl = new URL("/robots.txt", base).toString();
    const r = await fetchWithTimeout(robotsUrl, 6000);
    const text = r.ok ? await r.text() : "";
    return res.json({ ok: true, url: robotsUrl, content: text });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message || "robots failed" });
  }
});

// GET /api/onboarding/analyze-theme
router.get("/analyze-theme", async (req, res) => {
  try {
    await ensureOnboardingSchema();
    const session_id = String(req.query.session_id || "").trim();
    if (!session_id) return res.status(400).json({ error: "session_id required" });
    const j = await pool.query(`SELECT id FROM crawl_jobs WHERE onboarding_session_id = $1 ORDER BY created_at DESC LIMIT 1`, [session_id]);
    if (!j.rows.length) return res.status(404).json({ error: "job not found" });

    const pages = await pool.query(`SELECT id, url, title, assets, meta FROM website_pages WHERE crawl_job_id = $1 ORDER BY created_at ASC LIMIT 20`, [j.rows[0].id]);
    if (!pages.rows.length) return res.json({ ok: true, analysis: null });

    const cssUrls: string[] = [];
    const fonts = new Set<string>();
    const colorCounts = new Map<string, number>();
    for (const p of pages.rows) {
      const assets: string[] = Array.isArray(p.assets) ? p.assets : [];
      for (const a of assets) {
        try {
          const abs = new URL(a, p.url).toString();
          if (/\.css(\?|$)/i.test(abs)) cssUrls.push(abs);
        } catch {}
      }
    }
    const uniqueCss = Array.from(new Set(cssUrls)).slice(0, 3);
    for (const cu of uniqueCss) {
      try {
        const r = await fetchWithTimeout(cu, 6000);
        if (!r.ok) continue;
        const css = await r.text();
        const colorRe = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
        let m: RegExpExecArray | null;
        while ((m = colorRe.exec(css))) {
          const c = "#" + m[1].toLowerCase();
          colorCounts.set(c, (colorCounts.get(c) || 0) + 1);
        }
        const fontRe = /font-family\s*:\s*([^;}{]+)/gi;
        let f: RegExpExecArray | null;
        while ((f = fontRe.exec(css))) {
          const families = String(f[1]).split(',').map(s => s.trim().replace(/^["']|["']$/g, ""));
          for (const fam of families) if (fam) fonts.add(fam);
        }
      } catch {}
    }
    const palette = Array.from(colorCounts.entries()).sort((a,b) => b[1]-a[1]).map(([k]) => k).slice(0, 8);
    const detected_stack = (() => {
      try {
        const hints = pages.rows.map(p => JSON.stringify(p.meta || {})).join(" ").toLowerCase();
        if (hints.includes("wp-content") || hints.includes("wordpress")) return "WordPress";
        if (hints.includes("wix")) return "Wix";
        if (hints.includes("shopify")) return "Shopify";
        if (hints.includes("squarespace")) return "Squarespace";
      } catch {}
      return "Custom/Unknown";
    })();
    const primary_color = palette[0] || null;
    const secondary_color = palette[1] || null;
    const font_family = Array.from(fonts).slice(0, 3).join(", ");

    const theme = await pool.query(
      `INSERT INTO theme_analysis(onboarding_session_id, detected_stack, primary_color, secondary_color, font_family, layout_meta, score)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7) RETURNING *`,
      [session_id, detected_stack, primary_color, secondary_color, font_family, JSON.stringify({ css_count: uniqueCss.length }), 0.8]
    );

    return res.json({ ok: true, theme: theme.rows[0], palette });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message || "analyze-theme failed" });
  }
});

// POST /api/onboarding/integrations
router.post("/integrations", async (req, res) => {
  try {
    await ensureOnboardingSchema();
    const { session_id, type, data } = req.body || {};
    if (!session_id || !type) return res.status(400).json({ error: "session_id and type required" });
    const ins = await pool.query(
      `INSERT INTO integration_credentials(onboarding_session_id, type, data) VALUES ($1, $2, $3::jsonb) RETURNING id`,
      [session_id, String(type).trim(), JSON.stringify(data || {})]
    );
    return res.json({ ok: true, id: ins.rows[0].id });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message || "integrations failed" });
  }
});

// Optional: GET /api/onboarding/entry (minimal – no Stripe lookup)
router.get("/entry", async (req, res) => {
  try {
    await ensureOnboardingSchema();
    const sid = String((req.query.session_id || req.query.stripe_session_id || "")).trim() || null;
    const start_url = String((req.query.url || req.query.start_url || "")).trim() || null;

    let sessionId: string | null = null;
    if (sid) {
      const existing = await pool.query(`SELECT id FROM onboarding_sessions WHERE stripe_session_id = $1 LIMIT 1`, [sid]);
      sessionId = existing.rows[0]?.id || null;
    }
    if (!sessionId) {
      const ins = await pool.query(
        `INSERT INTO onboarding_sessions(customer_email, stripe_session_id, start_url, status, crawl_status) VALUES ($1, $2, $3, 'started', 'pending') RETURNING id`,
        [null, sid, start_url]
      );
      const job = await pool.query(
        `INSERT INTO crawl_jobs(onboarding_session_id, seed_url, status) VALUES ($1, $2, 'pending') RETURNING id`,
        [ins.rows[0].id, start_url || ""]
      );
      sessionId = ins.rows[0].id;
    }
    return res.json({ ok: true, session_id: sessionId });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message || "entry failed" });
  }
});

export default router;
