/**
 * IndexNow — instantly notify Bing, Yandex and (increasingly) Google that a URL
 * has been added or updated, instead of waiting for the next organic crawl.
 *
 * How it works:
 *   1. We expose a key file at  https://<host>/<KEY>.txt  containing exactly the
 *      key (served in server/vite.ts). This proves we own the domain.
 *   2. When a blog post is published/updated we POST the changed URL(s) to the
 *      IndexNow endpoint. One submission is shared by all participating engines.
 *
 * The key is PUBLIC by design (it sits at a public URL), so shipping a stable
 * default is fine; override with INDEXNOW_KEY if you want to rotate it. Set
 * INDEXNOW_DISABLED=1 to turn the whole feature off.
 *
 * Every call here is best-effort: failures are logged and swallowed so a slow or
 * down IndexNow endpoint can never delay or break a publish.
 */

// Stable, override-able key. Must match the filename we serve (see keyFileName()).
export const INDEXNOW_KEY =
  (process.env.INDEXNOW_KEY || "a3f5c9e10b7d42868f1c6e0d94b7a2e5").trim();

// Canonical public origin (no trailing slash). Mirrors the sitemap's origin.
function siteOrigin(): string {
  const raw = process.env.PUBLIC_SITE_URL || "https://www.newagefotografie.com";
  return raw.replace(/\/+$/, "");
}

export function keyFileName(): string {
  return `${INDEXNOW_KEY}.txt`;
}

function isDisabled(): boolean {
  return process.env.INDEXNOW_DISABLED === "1" || !INDEXNOW_KEY;
}

/**
 * Submit one or more absolute (or origin-relative) URLs to IndexNow.
 * Returns true if the endpoint accepted the batch, false otherwise. Never throws.
 */
export async function submitUrls(urls: string[]): Promise<boolean> {
  try {
    if (isDisabled()) return false;

    const origin = siteOrigin();
    const host = new URL(origin).host;

    // Normalise to absolute, de-dupe, and keep only same-host URLs (IndexNow
    // rejects a batch that mixes hosts).
    const urlList = Array.from(
      new Set(
        urls
          .map((u) => (u.startsWith("http") ? u : `${origin}${u.startsWith("/") ? "" : "/"}${u}`))
          .filter((u) => {
            try {
              return new URL(u).host === host;
            } catch {
              return false;
            }
          }),
      ),
    );

    if (urlList.length === 0) return false;

    const body = {
      host,
      key: INDEXNOW_KEY,
      keyLocation: `${origin}/${keyFileName()}`,
      urlList,
    };

    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });

    // 200 = accepted, 202 = accepted (queued). Anything else is a soft failure.
    const ok = res.status === 200 || res.status === 202;
    if (ok) {
      console.log(`[IndexNow] Submitted ${urlList.length} URL(s):`, urlList.join(", "));
    } else {
      console.warn(`[IndexNow] Endpoint returned ${res.status} for ${urlList.length} URL(s).`);
    }
    return ok;
  } catch (err) {
    console.warn("[IndexNow] Submit failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

/**
 * Convenience: ping IndexNow for a published blog post. Submits the post URL
 * plus the blog index (its listing changed too). Fire-and-forget friendly.
 */
export async function pingBlogPost(slug: string): Promise<void> {
  if (!slug) return;
  await submitUrls([`/blog/${slug}`, `/blog`]);
}
