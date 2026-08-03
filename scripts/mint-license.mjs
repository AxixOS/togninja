#!/usr/bin/env node
// Mint a signed instance licence. Vendor-only — needs the SECRET signing key.
//
//   LICENSE_SIGNING_KEY="$(cat signing-key.pem)" \
//     node scripts/mint-license.mjs --sid studio_123 --plan self-hosted --days 365
//
// Flags:
//   --sid       studio id this licence is bound to (required)
//   --plan      self-hosted | hosted | trial   (default: self-hosted)
//   --days      validity in days; omit or 0 for a perpetual licence
//   --features  comma-separated feature flags (optional)
//
// Prints a `TOG1.…` key. Give it to the customer; they set it as LICENSE_KEY.

import crypto from 'crypto';

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const signingKeyPem = process.env.LICENSE_SIGNING_KEY;
if (!signingKeyPem) {
  console.error('✖ LICENSE_SIGNING_KEY is not set. Provide the secret signing key (PEM).');
  process.exit(1);
}
const sid = arg('sid');
if (!sid) {
  console.error('✖ --sid is required (the studio id this licence is bound to).');
  process.exit(1);
}
const plan = arg('plan', 'self-hosted');
const days = parseInt(arg('days', '0'), 10) || 0;
const features = (arg('features', '') || '').split(',').map((s) => s.trim()).filter(Boolean);

const nowSec = Math.floor(Date.now() / 1000);
const claims = {
  sid,
  plan,
  iat: nowSec,
  ...(days > 0 ? { exp: nowSec + days * 86400 } : {}),
  ...(features.length ? { features } : {}),
};

const b64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const payload = Buffer.from(JSON.stringify(claims));
const priv = crypto.createPrivateKey(signingKeyPem);
const sig = crypto.sign(null, payload, priv); // Ed25519

const token = `TOG1.${b64url(payload)}.${b64url(sig)}`;

console.log('\nLicence for studio:', sid, '| plan:', plan, '| expires:',
  claims.exp ? new Date(claims.exp * 1000).toISOString() : 'never');
console.log('\nLICENSE_KEY=' + token + '\n');
