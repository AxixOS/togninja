// Can a gallery token be forged, replayed against another gallery, or outlived?
//
// The token this replaces was `base64(galleryId:email:timestamp)` — no signature — and
// the two endpoints that consumed it either checked only that SOMETHING was present or
// checked nothing at all. So these assertions are the whole of the security now, and
// they run against the real module, not a copy of it.
//
// Run: npx tsx scripts/gal-verify-token.ts
//
// The secret is read lazily on first use, so setting it here — before any issue or
// verify call — is what the module ends up signing with.
import crypto from 'crypto';
import { issueGalleryToken, verifyGalleryToken, bearerFrom } from '../server/lib/galleryToken';

const SECRET = 'test-secret-not-a-real-one';
process.env.GALLERY_TOKEN_SECRET = SECRET;

let bad = 0;
const check = (label: string, ok: boolean, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};

const G1 = '11111111-1111-1111-1111-111111111111';
const G2 = '22222222-2222-2222-2222-222222222222';
const b64url = (b: Buffer) => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const payloadOf = (t: string) => t.slice(0, t.lastIndexOf('.'));
const macWith = (secret: string, payload: string) =>
  b64url(crypto.createHmac('sha256', secret).update(payload).digest());
const tokenAged = (galleryId: string, days: number) => {
  const p = b64url(Buffer.from(JSON.stringify({ g: galleryId, e: 'a@a.com', t: Date.now() - days * 864e5 })));
  return p + '.' + macWith(SECRET, p);
};

console.log('\n=== a token this server issued opens the gallery it was issued for ===');
const good = issueGalleryToken(G1, 'client@example.com');
const ok = verifyGalleryToken(good, G1);
check('a freshly issued token verifies', ok.ok);
check('the visitor email survives the round trip', ok.email === 'client@example.com', ok.email || '');

console.log('\n=== and nothing else does ===');
check('no token', verifyGalleryToken('', G1).reason === 'missing');
check('junk', !verifyGalleryToken('nonsense', G1).ok);

// The exact shape of the OLD token — what an attacker would have typed out by hand.
const legacy = Buffer.from(`${G1}:client@example.com:${Date.now()}`).toString('base64');
check('the old unsigned token is rejected', !verifyGalleryToken(legacy, G1).ok,
  'reason=' + verifyGalleryToken(legacy, G1).reason);

check('a made-up signature is rejected',
  verifyGalleryToken(payloadOf(good) + '.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', G1).reason === 'bad_signature');
check('a stripped signature is rejected', !verifyGalleryToken(payloadOf(good) + '.', G1).ok);
check('no signature at all is rejected', !verifyGalleryToken(payloadOf(good), G1).ok);

// A payload the attacker wrote, carrying a signature copied from a real token.
const forgedPayload = b64url(Buffer.from(JSON.stringify({ g: G2, e: 'x@x.com', t: Date.now() })));
check('a hand-built payload with a borrowed MAC is rejected',
  verifyGalleryToken(forgedPayload + '.' + payloadOf(good), G2).reason === 'bad_signature');

console.log('\n=== a token is good for ONE gallery ===');
// The attack this stops: a client holding a real token for their own shoot edits the
// slug in the URL and reads somebody else's.
check('a valid token for gallery 1 does not open gallery 2',
  verifyGalleryToken(good, G2).reason === 'wrong_gallery');
check('...and gallery 2 has its own working token',
  verifyGalleryToken(issueGalleryToken(G2, 'b@b.com'), G2).ok);

console.log('\n=== tokens do not live for ever ===');
check('a correctly signed 40-day-old token is expired', verifyGalleryToken(tokenAged(G1, 40), G1).reason === 'expired');
check('a 29-day-old token still works', verifyGalleryToken(tokenAged(G1, 29), G1).ok);

console.log('\n=== the signature actually depends on the secret ===');
// Two deployments with different secrets must not accept each other's tokens, or the
// per-deployment secret is decorative.
check('a token signed with another secret is rejected',
  verifyGalleryToken(payloadOf(good) + '.' + macWith('a-different-secret', payloadOf(good)), G1).reason === 'bad_signature');

console.log('\n=== the header parser ===');
check('reads a Bearer header', bearerFrom({ headers: { authorization: 'Bearer abc' } }) === 'abc');
check('ignores a non-Bearer scheme', bearerFrom({ headers: { authorization: 'Basic abc' } }) === null);
check('survives no headers at all', bearerFrom({}) === null);

console.log(bad
  ? `\n  ${bad} CHECK(S) FAILED\n`
  : '\n  ALL CHECKS PASSED — the token cannot be forged, reused across galleries, or aged past 30 days\n');
process.exit(bad ? 1 : 0);
