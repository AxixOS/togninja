// Parse a Prodigi pricing sheet into rows we can turn into print products.
//
// Prodigi's Print API v4 has no endpoint that lists the catalogue — confirmed against
// their reference: the only product endpoints are GET /v4.0/products/{sku}, which needs a
// SKU you already know, and a photobook spine calculator. The catalogue lives behind
// "Pricing sheets" in their dashboard as a downloadable file.
//
// So the studio exports that sheet and we import it. Adding products one SKU at a time
// through the admin form is the alternative, and nobody is going to type ninety of them.
//
// DELIBERATELY TOLERANT ABOUT COLUMNS. Prodigi can rename a header, a studio may paste a
// trimmed-down list of their own, and Excel exports vary. Rather than hardcode a schema
// that breaks the first time it changes, find the SKU column by looking for a header that
// mentions "sku", and the cost column by looking for price/cost. If there is exactly one
// column and no recognisable header, treat the whole thing as a list of bare SKUs.

export interface SheetRow {
  sku: string;
  /** What Prodigi charges, if the sheet carried a price. */
  cost: number | null;
  /** Anything the sheet called a name or description. */
  label: string | null;
}

export interface SheetParse {
  rows: SheetRow[];
  /** Which column each field came from, so the UI can show what was understood. */
  columns: { sku: string | null; cost: string | null; label: string | null };
  skipped: number;
}

/** Split one CSV line, honouring quoted fields containing commas. */
function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // A doubled quote inside a quoted field is a literal quote.
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim().replace(/^"|"$/g, ''));
}

/** Prices arrive as "12.34", "£12.34", "12,34" or "1,234.56". */
function toNumber(raw: string): number | null {
  if (!raw) return null;
  let s = raw.replace(/[^0-9.,-]/g, '').trim();
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    // European: 1.234,56 — dots are thousands separators.
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

export function parseProdigiSheet(text: string): SheetParse {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return { rows: [], columns: { sku: null, cost: null, label: null }, skipped: 0 };

  // Tabs beat commas when both appear — a pasted spreadsheet is tab-separated.
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const header = splitLine(lines[0], delimiter);
  const lower = header.map((h) => h.toLowerCase());

  const findCol = (needles: string[], exclude: number[] = []) =>
    lower.findIndex((h, i) => !exclude.includes(i) && needles.some((needle) => h.includes(needle)));

  let skuIdx = findCol(['sku', 'product code', 'productcode']);
  const costIdx = findCol(['price', 'cost', 'amount'], [skuIdx]);
  // 'product' is a deliberately weak last resort, and it must never resolve back to the
  // SKU column: a header of 'Product Code' contains both 'product code' and 'product',
  // so without excluding the SKU index every label came out as a repeat of the SKU.
  const labelIdx = findCol(['description', 'name'], [skuIdx, costIdx]) >= 0
    ? findCol(['description', 'name'], [skuIdx, costIdx])
    : findCol(['product'], [skuIdx, costIdx]);

  // No header row at all: a bare list of SKUs, one per line.
  const headerless = skuIdx < 0 && costIdx < 0 && labelIdx < 0;
  if (headerless) skuIdx = 0;

  const rows: SheetRow[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const line of lines.slice(headerless ? 0 : 1)) {
    const cells = splitLine(line, delimiter);
    const sku = (cells[skuIdx] || '').trim();
    // A SKU is never a sentence and never empty. This also drops the blank rows and
    // trailing totals that spreadsheets collect.
    if (!sku || sku.length > 64 || /\s{2,}/.test(sku)) { skipped++; continue; }
    const key = sku.toLowerCase();
    if (seen.has(key)) { skipped++; continue; }
    seen.add(key);

    rows.push({
      sku,
      cost: costIdx >= 0 ? toNumber(cells[costIdx] || '') : null,
      label: labelIdx >= 0 ? (cells[labelIdx] || '').trim() || null : null,
    });
  }

  return {
    rows,
    columns: {
      sku: skuIdx >= 0 && !headerless ? header[skuIdx] : headerless ? '(no header — treated as a SKU list)' : null,
      cost: costIdx >= 0 ? header[costIdx] : null,
      label: labelIdx >= 0 ? header[labelIdx] : null,
    },
    skipped,
  };
}

/**
 * What the studio should charge, given what Prodigi charges.
 *
 * Returns null when there is no cost to mark up, rather than 0 — a product priced at zero
 * would be given away, and the store should show "price me" instead of a free print.
 */
export function applyMarkup(cost: number | null, markupPercent: number): number | null {
  if (cost == null || !Number.isFinite(cost) || cost <= 0) return null;
  const pct = Number.isFinite(markupPercent) ? markupPercent : 0;
  return Math.round(cost * (1 + pct / 100) * 100) / 100;
}
