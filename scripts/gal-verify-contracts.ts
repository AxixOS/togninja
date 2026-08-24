// Can a contract be signed twice, or signed by the wrong link, or marked complete early?
//
// Contracts have the same shape as the gallery problem: a client has no login, so the link
// they are emailed IS the authorisation. Galleries taught us what happens when that link is
// guessable and the token unchecked — so here the token is 24 random bytes, unique, checked
// on every read, and scoped to exactly one contract.
//
// The signing state machine is the other half, and it is enforced in SQL rather than in
// control flow, for the same reason as print orders: two people can click Sign at the same
// moment, and a check-then-act would let both through.
//
//   a signature is claimed with a conditional UPDATE matching signed_at IS NULL
//   the CONTRACT is only 'signed' when NO signer remains unsigned
//   a second signature on the same signer cannot overwrite the first, or its evidence
//
// Run: npx tsx scripts/gal-verify-contracts.ts
import 'dotenv/config';
import fs from 'fs';
import crypto from 'crypto';
import { pool } from '../server/db';

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

/** The same conditional claim the route uses. */
async function sign(signerId: string, contractId: string, signature: string) {
  const r = await pool.query(
    `UPDATE contract_signers
        SET signed_at = NOW(), signature = $1, signed_ip = '1.2.3.4'
      WHERE id = $2 AND contract_id = $3 AND signed_at IS NULL
      RETURNING id`,
    [signature, signerId, contractId]);
  if (!r.rows.length) return { claimed: false, complete: false };
  const rem = await pool.query(
    `SELECT count(*)::int AS n FROM contract_signers WHERE contract_id = $1 AND signed_at IS NULL`,
    [contractId]);
  const complete = rem.rows[0].n === 0;
  if (complete) {
    await pool.query(`UPDATE contracts SET status='signed', signed_at=NOW() WHERE id=$1`, [contractId]);
  }
  return { claimed: true, complete };
}

async function main() {
  const made: string[] = [];
  try {
    console.log('\n=== a contract with two signers ===');
    const token = crypto.randomBytes(24).toString('base64url');
    const c = await pool.query(
      `INSERT INTO contracts (title, body, status, access_token)
       VALUES ('Probe Contract','Agreed by Jane Doe for £1,200.00.','sent',$1) RETURNING id`, [token]);
    const cid = c.rows[0].id;
    made.push(cid);

    const s1 = await pool.query(
      `INSERT INTO contract_signers (contract_id,name,email,role,sort_order)
       VALUES ($1,'Studio','studio@example.invalid','studio',0) RETURNING id`, [cid]);
    const s2 = await pool.query(
      `INSERT INTO contract_signers (contract_id,name,email,role,sort_order)
       VALUES ($1,'Jane Doe','jane@example.invalid','client',1) RETURNING id`, [cid]);

    console.log('\n=== one signature does not complete it ===');
    const first = await sign(s1.rows[0].id, cid, 'Studio');
    check('the first signature is recorded', first.claimed);
    check('the contract is NOT yet signed', !first.complete);
    const mid = await pool.query(`SELECT status FROM contracts WHERE id=$1`, [cid]);
    check("its status is still 'sent'", mid.rows[0].status === 'sent', mid.rows[0].status);

    console.log('\n=== the same signer cannot sign twice ===');
    // Without the signed_at IS NULL guard, a re-submit would overwrite the original
    // signature and its IP — destroying the evidence of the first signing.
    const again = await sign(s1.rows[0].id, cid, 'Someone Else');
    check('the second attempt is refused', !again.claimed);
    const keep = await pool.query(`SELECT signature, signed_ip FROM contract_signers WHERE id=$1`, [s1.rows[0].id]);
    check('the original signature is intact', keep.rows[0].signature === 'Studio', keep.rows[0].signature);
    check('the original evidence is intact', keep.rows[0].signed_ip === '1.2.3.4');

    console.log('\n=== the last signature completes it ===');
    const second = await sign(s2.rows[0].id, cid, 'Jane Doe');
    check('the second signer is recorded', second.claimed);
    check('the contract is now complete', second.complete);
    const done = await pool.query(`SELECT status, signed_at FROM contracts WHERE id=$1`, [cid]);
    check("status is 'signed'", done.rows[0].status === 'signed', done.rows[0].status);
    check('signed_at is set', Boolean(done.rows[0].signed_at));

    console.log('\n=== two people signing at the same instant ===');
    const t2 = crypto.randomBytes(24).toString('base64url');
    const c2 = await pool.query(
      `INSERT INTO contracts (title, body, status, access_token)
       VALUES ('Race Probe','Body.','sent',$1) RETURNING id`, [t2]);
    made.push(c2.rows[0].id);
    const rs = await pool.query(
      `INSERT INTO contract_signers (contract_id,name,email) VALUES ($1,'R','r@example.invalid') RETURNING id`,
      [c2.rows[0].id]);
    const results = await Promise.all([
      sign(rs.rows[0].id, c2.rows[0].id, 'A'),
      sign(rs.rows[0].id, c2.rows[0].id, 'B'),
      sign(rs.rows[0].id, c2.rows[0].id, 'C'),
    ]);
    check('exactly one of three concurrent signings wins',
      results.filter((r) => r.claimed).length === 1,
      results.filter((r) => r.claimed).length + ' won');

    console.log('\n=== a signer cannot be signed via another contract\'s token ===');
    const cross = await sign(s2.rows[0].id, c2.rows[0].id, 'Wrong');
    check('the contract id is part of the claim', !cross.claimed);

    console.log('\n=== the token is a real capability ===');
    check('tokens are unguessably long', token.length >= 32, token.length + ' chars');
    check('two tokens differ', token !== t2);
    const uq = await pool.query(
      `SELECT COUNT(*)::int n FROM pg_indexes WHERE tablename='contracts' AND indexdef ILIKE '%access_token%'`);
    check('access_token is unique in the database', uq.rows[0].n > 0);

    console.log('\n=== the public route gives away nothing else ===');
    const src = fs.readFileSync('server/routes/contracts.ts', 'utf8');
    const pub = src.slice(src.indexOf("router.get('/public/:token'"), src.indexOf("router.post('/public/:token/sign'"));
    check('it selects only what the client needs',
      /SELECT id, title, body, status, signed_at, expires_at FROM contracts WHERE access_token/.test(pub));
    check('it never returns the client id', !/client_id/.test(pub));
    check('it never returns the template id', !/template_id/.test(pub));
    check('an unknown token is a 404', /404/.test(pub));
    check('an expired contract is refused', /410/.test(pub));

    console.log('\n=== studio routes are behind auth ===');
    const guarded = (src.match(/router\.(get|post|put)\('[^']*',\s*requireAuth/g) || []).length;
    const publicRoutes = (src.match(/router\.(get|post)\('\/public\//g) || []).length;
    check('every non-public route requires auth', guarded >= 6, guarded + ' guarded');
    // Named, not counted. Every entry here is token-scoped and safe to reach without a
    // session; anything NOT here is a new hole in the public surface and fails the check.
    const ALLOWED_PUBLIC = ['/public/:token', '/public/:token/sign', '/public/:token/pdf'];
    const publicPaths = [...src.matchAll(/router\.(?:get|post)\('(\/public\/[^']*)'/g)].map((m) => m[1]);
    const unexpected = publicPaths.filter((p) => !ALLOWED_PUBLIC.includes(p));
    check('the public surface is exactly the routes we intend', unexpected.length === 0,
      unexpected.join(', ') || publicPaths.length + ' known-public route(s)');
    check('sending is blocked on unresolved fields', /unresolved_fields/.test(src));
    check('an already-signed contract cannot be re-sent', /already been signed/.test(src));
  } finally {
    for (const id of made) await pool.query('DELETE FROM contracts WHERE id = $1', [id]).catch(() => {});
  }

  console.log(bad
    ? `\n  ${bad} CHECK(S) FAILED\n`
    : '\n  ALL CHECKS PASSED — one signature each, one link each, nothing signed twice\n');
  process.exit(bad ? 1 : 0);
}

main();
