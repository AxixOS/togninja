#!/usr/bin/env node
// Generate the Ed25519 licence signing keypair. Run ONCE, keep the output safe.
//
//   node scripts/gen-license-keypair.mjs
//
// • LICENSE_PUBLIC_KEY  → safe to embed / set on every customer instance (verifies keys)
// • LICENSE_SIGNING_KEY → SECRET, vendor-only; used by mint-license.mjs to sign keys
//
// Anyone with the public key can VERIFY licences but cannot FORGE them.

import crypto from 'crypto';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

// Raw 32-byte public key (compact) — the app also accepts PEM.
const spki = publicKey.export({ format: 'der', type: 'spki' });
const rawPub = spki.subarray(spki.length - 32).toString('base64');
const privPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();

console.log('\n=== LICENSE_PUBLIC_KEY (set on customer instances — safe to share) ===\n');
console.log(rawPub);
console.log('\n=== LICENSE_SIGNING_KEY (KEEP SECRET — vendor machine only) ===\n');
console.log(privPem);
console.log('Store the signing key in a password manager. If it leaks, anyone can mint licences.\n');
