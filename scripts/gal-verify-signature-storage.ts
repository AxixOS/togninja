// Does the column really keep what the encoder produced?
//
// scripts/ui-verify-contract-sign.mjs proves the ENCODER's half without a database: it
// applies the route's own `String(signature).slice(0, 4000)` to real encoder output and
// shows nothing changes. This file proves the other half, against Postgres, because the
// two questions are genuinely different and only one of them can be answered by arithmetic:
//
//   the slice is the only narrowing the CODE performs — proved in the .mjs guard
//   the COLUMN then stores every byte of it — provable only by writing and reading back
//
// contract_signers.signature is `text`, so it is unbounded, and a text column does not
// truncate. But "the schema says text" is a claim about a file, and this is a legal
// document: a signature that comes back one byte different is a signature that was not the
// one given. So the value goes in through the route's exact UPDATE, comes back out through
// a SELECT, and is compared byte for byte and re-parsed into the same geometry.
//
// It also stores the alternative that was REJECTED — a PNG data URL — through the same
// expression and the same column, and shows it come back truncated and no longer an image.
// That is the whole reason the drawn signature is a path and not a raster, demonstrated
// against the real database rather than asserted in a comment.
//
// Writes to a probe contract and deletes it again. Run against the demo tenant:
//   PG_POOL_MAX=2 PG_SESSION_POOL_MAX=1 PG_LEGACY_POOL_MAX=1 npx tsx scripts/gal-verify-signature-storage.ts
import 'dotenv/config';
import fs from 'fs';
import crypto from 'crypto';
import { pool } from '../server/db';
import {
  encodeDrawnSignature,
  parseSignature,
  MAX_DRAWN_SIGNATURE_CHARS,
  type SignatureStroke,
} from '../shared/contractSignature';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

/**
 * The cap the ROUTE applies, read out of the route.
 *
 * Hardcoding 4000 here would let the two drift apart silently, which is the exact failure
 * this whole exercise exists to prevent. Comment lines are stripped first: the route's own
 * header quotes the expression.
 */
function routeCap(): number | null {
  const src = fs
    .readFileSync('server/routes/contracts.ts', 'utf8')
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');
  const m = src.match(/String\(signature\)\.slice\(0,\s*(\d+)\)/);
  return m ? Number(m[1]) : null;
}

/** A signature-shaped set of strokes. */
function scrawl(): SignatureStroke[] {
  let s = 7;
  const rnd = () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
  const out: SignatureStroke[] = [];
  for (let k = 0; k < 3; k++) {
    const pts: SignatureStroke = [];
    for (let i = 0; i < 400; i++) {
      const t = i / 399;
      pts.push({ x: 20 + k * 40 + t * 520, y: 100 + Math.sin(t * 13 + k) * 60 + (rnd() - 0.5) * 3 });
    }
    out.push(pts);
  }
  return out;
}

async function main() {
  const cap = routeCap();
  console.log('\n=== the cap this test writes against ===');
  check('the route still truncates with a slice()', cap !== null, cap === null ? 'not found' : `slice(0, ${cap})`);
  if (cap === null) {
    console.log('\n  cannot continue without knowing the cap\n');
    process.exit(1);
  }

  const encoded = encodeDrawnSignature(scrawl());
  check('a realistic signature encoded', encoded !== null, encoded ? `${encoded.length} chars` : 'null');
  if (!encoded) {
    process.exit(1);
  }
  check('it is inside the encoder budget', encoded.length <= MAX_DRAWN_SIGNATURE_CHARS,
    `${encoded.length} <= ${MAX_DRAWN_SIGNATURE_CHARS}`);

  const created: string[] = [];
  try {
    const token = crypto.randomBytes(24).toString('base64url');
    const c = await pool.query(
      `INSERT INTO contracts (title, body, status, access_token)
       VALUES ('Signature storage probe','<p>Probe.</p>','sent',$1) RETURNING id`,
      [token],
    );
    const contractId = c.rows[0].id;
    created.push(contractId);

    const drawn = await pool.query(
      `INSERT INTO contract_signers (contract_id,name,email,role,sort_order)
       VALUES ($1,'Drawn Probe','drawn@example.invalid','client',0) RETURNING id`,
      [contractId],
    );
    const raster = await pool.query(
      `INSERT INTO contract_signers (contract_id,name,email,role,sort_order)
       VALUES ($1,'Raster Probe','raster@example.invalid','client',1) RETURNING id`,
      [contractId],
    );

    // ── The drawn signature, written exactly as the route writes it ──────────
    console.log('\n=== the encoded path, through the route\'s own UPDATE ===');
    await pool.query(
      `UPDATE contract_signers
          SET signed_at = NOW(), signature = $1, signed_ip = $2, signed_user_agent = $3
        WHERE id = $4 AND contract_id = $5 AND signed_at IS NULL`,
      [
        String(encoded).slice(0, cap),
        '203.0.113.7'.slice(0, 100),
        'signature-storage-probe'.slice(0, 300),
        drawn.rows[0].id,
        contractId,
      ],
    );

    const back = await pool.query(`SELECT signature FROM contract_signers WHERE id = $1`, [drawn.rows[0].id]);
    const stored: string = back.rows[0].signature;
    check('a value came back at all', typeof stored === 'string' && stored.length > 0,
      `${stored ? stored.length : 0} chars`);
    check('the stored length is the sent length', stored.length === encoded.length,
      `sent ${encoded.length}, stored ${stored.length}`);
    check('the stored value is BYTE-IDENTICAL to what was sent', stored === encoded);
    // Length equality is not identity, and identity is not usability. Parse it back.
    const parsed = parseSignature(stored);
    check('it still parses as geometry after the round trip',
      !!parsed && parsed.kind === 'drawn', parsed ? parsed.kind : 'null');
    check('the path data is unchanged',
      !!parsed && parsed.kind === 'drawn' && encoded.endsWith(parsed.d));
    check('the box it was drawn in survived too',
      !!parsed && parsed.kind === 'drawn' && parsed.width === 600 && parsed.height === 200);

    // ── The alternative that was rejected ────────────────────────────────────
    console.log('\n=== the same column, given the PNG data URL this replaced ===');
    // Representative of canvas.toDataURL('image/png') for a signature: 5-30KB.
    const dataUrl = 'data:image/png;base64,' + 'iVBORw0KGgoAAAANSUhEUg'.repeat(700);
    await pool.query(
      `UPDATE contract_signers
          SET signed_at = NOW(), signature = $1
        WHERE id = $2 AND contract_id = $3 AND signed_at IS NULL`,
      [String(dataUrl).slice(0, cap), raster.rows[0].id, contractId],
    );
    const rback = await pool.query(`SELECT signature FROM contract_signers WHERE id = $1`, [raster.rows[0].id]);
    const rstored: string = rback.rows[0].signature;
    check('a PNG data URL is longer than the cap', dataUrl.length > cap, `${dataUrl.length} chars`);
    check('it is TRUNCATED on the way in, with no error anywhere',
      rstored.length === cap && rstored !== dataUrl, `${dataUrl.length} in, ${rstored.length} out`);
    check('and what comes back is no longer a usable image',
      rstored.startsWith('data:image/png') && rstored.length < dataUrl.length,
      'a broken-image icon on a signed contract');

    // ── The evidence the route records alongside it ─────────────────────────
    console.log('\n=== the signature is kept with its evidence ===');
    const ev = await pool.query(
      `SELECT signed_at, signed_ip, signed_user_agent FROM contract_signers WHERE id = $1`,
      [drawn.rows[0].id],
    );
    check('signed_at was set', !!ev.rows[0].signed_at);
    check('signed_ip was kept', ev.rows[0].signed_ip === '203.0.113.7');
    check('signed_user_agent was kept', ev.rows[0].signed_user_agent === 'signature-storage-probe');
  } finally {
    // contract_signers cascades from contracts, so one delete clears both.
    for (const id of created) {
      await pool.query(`DELETE FROM contracts WHERE id = $1`, [id]).catch(() => {});
    }
    await pool.end().catch(() => {});
  }

  console.log(bad
    ? `\n  ${bad} CHECK(S) FAILED — the column is not keeping what the encoder produced\n`
    : '\n  ALL CHECKS PASSED — the drawn signature goes in and comes out identical; the raster it replaced does not\n');
  process.exit(bad ? 1 : 0);
}

main().catch((e) => {
  console.error('\n  probe failed:', e?.message || e, '\n');
  process.exit(1);
});
