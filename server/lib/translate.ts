// On-demand translation for user-facing content (currently blog posts).
//
// German is the studio's authoring language; when a visitor selects another
// language we translate on the fly and cache the result in memory, keyed by a
// hash of the source text, so each unique string is translated at most once per
// process (cheap + fast after the first hit). If no key resolves for this studio, or the
// call fails, we return the original text — translation must never break content.
//
// "No key resolves" means tenantOpenAI came back empty: the studio's own key first, the
// platform's only as a fallback. It deliberately does NOT mean OPENAI_API_KEY is unset, which
// is what this used to check and which is false on every provisioned tenant.

import crypto from 'crypto';
import { tenantOpenAI } from './openaiClient';

const cache = new Map<string, string>();
const MAX_CACHE = 5000;

const LANG_NAME: Record<string, string> = {
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
};

/** Translate a single string into `target` (default English). Cached + safe. */
export async function translateText(
  text: string | null | undefined,
  target = 'en'
): Promise<string> {
  const src = (text ?? '').toString();
  if (!src.trim()) return src;

  const key = `${target}:${crypto.createHash('sha1').update(src).digest('hex')}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  try {
    // Resolved, not assumed.
    //
    // This read `!process.env.OPENAI_API_KEY` and returned the source text before tenantOpenAI
    // was ever reached. On an AxixOS-provisioned tenant that variable is deliberately unset and
    // the studio's key lives in the database, so every translation silently returned the
    // untranslated German source and the tenant wiring below was unreachable code. A studio
    // would have watched their own site refuse to speak English, with nothing in any log.
    const client = await tenantOpenAI('translate');
    if (!client) {
      // Optional by design: the caller renders the source rather than an error. Returning the
      // SOURCE, not null — the signature promises Promise<string> and translateDeep assigns
      // the result straight into the object it is walking.
      return src;
    }
    const langName = LANG_NAME[target] || target;
    const r = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            `Translate the user's text into natural, fluent ${langName}. ` +
            `If the text contains HTML, preserve every tag and attribute exactly and translate ` +
            `only the human-readable text between/inside them. Do not add comments, notes, ` +
            `explanations or surrounding quotation marks — output only the translated text.`,
        },
        { role: 'user', content: src },
      ],
      temperature: 0.3,
    });
    const out = r.choices?.[0]?.message?.content?.trim() || src;
    if (cache.size > MAX_CACHE) cache.clear();
    cache.set(key, out);
    return out;
  } catch (err) {
    console.warn('[translate] failed, returning original:', (err as Error).message);
    return src;
  }
}

// Keys whose values are never human copy (URLs, assets, colours, ids, tokens).
const NON_COPY_KEY = /(url|href|src|image|img|photo|icon|color|colour|id|slug|token|email|phone|tel|video|poster|background|link|class|style|font|align|position|placement|variant|type|action|target|amount|price_?id)/i;
// Values that are clearly not translatable prose.
const NON_COPY_VALUE = /^(https?:\/\/|\/[^\s]*$|#?[0-9a-fA-F]{3,8}$|data:|mailto:|tel:|\+?[\d\s()-]{6,}$|[\w.+-]+@[\w.-]+$)/;
const HAS_LETTER = /[A-Za-zÀ-ÿ]/;

/**
 * Deep-translate every human-readable string leaf inside `value` into `target`,
 * leaving structure, keys, URLs, colours, ids and other non-copy values intact.
 * Strings are translated in parallel and cached per-string, so repeated views of
 * the same page are cheap. Returns `value` unchanged for German / no API key.
 */
export async function translateDeep<T>(value: T, target = 'en'): Promise<T> {
  // Same correction as translateText: ask whether a client resolves, not whether one particular
  // environment variable is set. config.get caches for 60s, so this costs nothing per call.
  if (target === 'de' || !(await tenantOpenAI('translate'))) return value;
  const walk = async (node: any, key?: string): Promise<any> => {
    if (typeof node === 'string') {
      if (!node.trim() || !HAS_LETTER.test(node)) return node;
      if (key && NON_COPY_KEY.test(key)) return node;
      if (NON_COPY_VALUE.test(node.trim())) return node;
      return translateText(node, target);
    }
    if (Array.isArray(node)) return Promise.all(node.map((v) => walk(v, key)));
    if (node && typeof node === 'object') {
      const out: any = {};
      await Promise.all(
        Object.entries(node).map(async ([k, v]) => { out[k] = await walk(v, k); })
      );
      return out;
    }
    return node;
  };
  return walk(value);
}

/**
 * Return a shallow copy of `obj` with the given string fields translated into
 * `target` (translated in parallel; non-string/empty fields are left as-is).
 */
export async function translateFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  target = 'en'
): Promise<T> {
  if (target === 'de' || !(await tenantOpenAI('translate'))) return obj;
  const out: any = { ...obj };
  await Promise.all(
    fields.map(async (f) => {
      const v = obj[f];
      if (typeof v === 'string' && v.trim()) out[f] = await translateText(v, target);
    })
  );
  return out;
}
