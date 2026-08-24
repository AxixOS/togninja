// The contract body arrives as HTML and is rendered on a page anyone with the link can
// open. This is the only thing standing between that HTML and the DOM.
//
// The body is studio-authored — it comes from contract_templates.body, written behind
// requireAuth, merged by shared/contractMerge.ts (which HTML-escapes every substituted
// VALUE, so a client called `<img onerror=...>` cannot inject through their own name).
// None of that makes the TEMPLATE trustworthy: it is rich text a person pasted from a
// word processor, an old contract, or a website, and a studio account is exactly the sort
// of account that gets phished. Treat it as untrusted and the question of who typed it
// stops mattering.
//
// Allowlist, not denylist. A denylist of "script, iframe, onerror" is a list of the
// attacks somebody thought of; an allowlist of "p, strong, li, table" is a list of what a
// contract is actually made of, and everything anyone thinks of later is already excluded.
//
// The parse is done with DOMParser rather than by matching tags in a string. A string
// matcher and a browser disagree about malformed markup — that disagreement IS the
// bypass — whereas DOMParser builds the same tree the renderer would, from an inert
// document that runs nothing: no script executes, and no <img src> or <link href> is
// fetched, so this cannot phone home while being cleaned.

/** What a contract is made of. Anything outside this list is unwrapped or dropped. */
const ALLOWED_TAGS = new Set([
  'P', 'BR', 'HR', 'SPAN', 'DIV',
  'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SUP', 'SUB', 'SMALL', 'MARK',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE',
  'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TD', 'TH', 'CAPTION', 'COLGROUP', 'COL',
  'A',
]);

/**
 * Elements removed WITH their contents.
 *
 * Everything else that is not allowed is UNWRAPPED — its children survive — because a
 * contract clause wrapped in a tag we do not recognise must not silently vanish from a
 * document somebody is about to sign. These few are different: their text content is code
 * or a caption for something we refused to load, and showing it as prose is worse than
 * dropping it.
 */
const DROP_WITH_CONTENT = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEMPLATE',
  'FORM', 'INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'OPTION',
  'SVG', 'MATH', 'CANVAS', 'AUDIO', 'VIDEO', 'SOURCE', 'TRACK',
  'META', 'LINK', 'BASE', 'TITLE', 'HEAD',
]);

/** Per-tag attribute allowlist. Every attribute not named here is removed, `on*` included. */
const ALLOWED_ATTRS: Record<string, string[]> = {
  A: ['href'],
  TD: ['colspan', 'rowspan'],
  TH: ['colspan', 'rowspan', 'scope'],
  COL: ['span'],
  COLGROUP: ['span'],
};

/** Link schemes a contract may point at. javascript:, data: and everything else are not here. */
const SAFE_LINK = /^(https?:\/\/|mailto:|tel:)/i;

const escapeHtml = (v: string): string =>
  v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Clean a contract body for rendering.
 *
 * Returns HTML that is safe to hand to dangerouslySetInnerHTML. On a server render, or in
 * any environment without DOMParser, it returns the body ESCAPED — visible, readable,
 * inert — rather than either the raw HTML or nothing at all.
 */
export function sanitizeContractHtml(html: string | null | undefined): string {
  const source = String(html == null ? '' : html);
  if (!source.trim()) return '';

  if (typeof DOMParser === 'undefined') {
    // No parser: a prerender, a test runner, an old browser. Escaping keeps every word of
    // the contract on screen and executes none of it. Failing CLOSED to a blank page would
    // hide the document the whole page exists to show.
    return escapeHtml(source).replace(/\r?\n/g, '<br>');
  }

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString('<!doctype html><body>' + source, 'text/html');
  } catch {
    return escapeHtml(source);
  }
  const body = doc.body;
  if (!body) return escapeHtml(source);

  // Depth-first over a SNAPSHOT of the children at each level: unwrapping replaces a node
  // with its children mid-walk, and a live NodeList would skip the nodes that shuffle into
  // the vacated index — which is how a sanitiser ends up leaving one child of every
  // unwrapped element uncleaned.
  const clean = (node: Element): void => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toUpperCase();

      if (DROP_WITH_CONTENT.has(tag)) {
        child.remove();
        continue;
      }

      if (!ALLOWED_TAGS.has(tag)) {
        clean(child);
        // Unwrap: keep the words, lose the element.
        const parent = child.parentNode;
        if (parent) {
          while (child.firstChild) parent.insertBefore(child.firstChild, child);
          parent.removeChild(child);
        }
        continue;
      }

      const allowed = ALLOWED_ATTRS[tag] || [];
      for (const attr of Array.from(child.attributes)) {
        if (!allowed.includes(attr.name.toLowerCase())) {
          child.removeAttribute(attr.name);
        }
      }

      if (tag === 'A') {
        const href = (child.getAttribute('href') || '').trim();
        if (!SAFE_LINK.test(href)) {
          child.removeAttribute('href');
        } else {
          // A contract opening a link in the same tab loses the document the person was
          // reading. noopener is what stops the opened page reaching back through
          // window.opener; nofollow because this is a page a stranger with a link can open.
          child.setAttribute('target', '_blank');
          child.setAttribute('rel', 'noopener noreferrer nofollow');
        }
      }

      clean(child);
    }
  };
  clean(body);

  return body.innerHTML;
}
