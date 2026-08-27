// Mint storage for ONE tenant: a bucket of their own, and a key that reaches only it.
//
// WHY THIS EXISTS. provision-instance.mjs wrote the SAME five AWS_* values into every
// instance it created — `need('AWS_ACCESS_KEY_ID')` reads the operator's environment, so
// every studio provisioned by that script shared one bucket under one credential.
//
// That was survivable only while nobody could read their own environment. Under the owned
// model they can: the LTD creates a Render account, hands it to the studio, and from then on
// the studio holds the dashboard. A shared storage credential in that environment is a
// credential every customer holds, reaching every other customer's photographs — client
// portraits, weddings, newborn sessions. The same argument AxixOS made about their shared
// API key, with worse consequences if it is wrong.
//
// WHY BACKBLAZE AND NOT SUPABASE. Supabase Storage S3 access keys are PROJECT-scoped: a key
// reaches every bucket in the project, and there is no bucket or prefix narrowing. There is
// no key we could mint on Supabase that reaches one tenant and not the rest, short of a
// Supabase project per studio. B2's b2_create_key takes a bucketId, so the scoping we need
// is a field on a call we already have to make.
//
// WHY A BUCKET EACH, RATHER THAN PREFIXES IN ONE BUCKET. Object keys are built as
// `uploads/${folderPath}/${fileName}` (server/services/s3-storage.ts). Prefixing them per
// tenant would change every read path too — delete, metadata, list, presigned URLs — and
// leave every existing object on the old shape needing a migration. A bucket each needs no
// server change at all and nothing to migrate.

const B2_API = 'https://api.backblazeb2.com/b2api/v3/b2_authorize_account';

async function call(url, token, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`B2 ${url.split('/').pop()} failed (${res.status}): ${json?.message || json?.code || 'unknown'}`);
    err.code = json?.code;
    err.status = res.status;
    throw err;
  }
  return json;
}

/** Sign in with the MASTER key. Only the provisioner ever holds this; no tenant sees it. */
export async function authorize(keyId, appKey) {
  const res = await fetch(B2_API, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${keyId}:${appKey}`).toString('base64') },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`B2 authorize failed (${res.status}): ${json?.message || 'check B2_KEY_ID / B2_APP_KEY'}`);
  }
  const storage = json?.apiInfo?.storageApi || {};
  if (!storage.apiUrl || !storage.s3ApiUrl) {
    throw new Error('B2 authorize returned no storage API URLs — is this an application key with the wrong capabilities?');
  }
  return {
    accountId: json.accountId,
    token: json.authorizationToken,
    apiUrl: storage.apiUrl,
    s3ApiUrl: storage.s3ApiUrl,
  };
}

/**
 * A bucket name derived from the service name.
 *
 * B2 bucket names are GLOBALLY unique across all of Backblaze, not just this account, and are
 * limited to 6-50 characters of lowercase letters, digits and hyphens. A studio called
 * "togninja-studio" would collide with anyone else's bucket of that name, so the account id
 * tail is mixed in — enough to make it ours without making it unreadable in the B2 console.
 */
export function bucketNameFor(serviceName, accountId) {
  const tail = String(accountId || '').slice(-6).toLowerCase().replace(/[^a-z0-9]/g, '') || 'tenant';
  // The BASE is truncated, never the whole name. Trimming the joined string instead dropped the
  // account tail off any service name long enough to reach 50 characters — removing the only
  // thing making the name unique in Backblaze's GLOBAL namespace, in exactly the case where a
  // descriptive studio name makes a collision most likely.
  const room = 50 - tail.length - 1;
  const base = String(serviceName)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, room)
    .replace(/-+$/, '');
  return `${base}-${tail}`;
}

/**
 * Create the tenant's bucket, or reuse it if this provision is being re-run.
 *
 * PUBLIC, deliberately: buildPublicUrl() serves gallery images straight from the bucket, and a
 * private bucket would mean signing every image on every page load. The names are opaque and
 * unguessable, which is the same protection the previous shared bucket had.
 */
export async function ensureBucket(auth, bucketName) {
  try {
    const made = await call(`${auth.apiUrl}/b2api/v3/b2_create_bucket`, auth.token, {
      accountId: auth.accountId,
      bucketName,
      bucketType: 'allPublic',
    });
    return { bucketId: made.bucketId, created: true };
  } catch (e) {
    if (e.code !== 'duplicate_bucket_name') throw e;
    const list = await call(`${auth.apiUrl}/b2api/v3/b2_list_buckets`, auth.token, {
      accountId: auth.accountId,
      bucketName,
    });
    const found = (list.buckets || [])[0];
    if (!found) {
      throw new Error(
        `B2 says "${bucketName}" already exists but it is not in this account. `
        + 'Bucket names are globally unique across Backblaze — choose a different SERVICE_NAME.',
      );
    }
    return { bucketId: found.bucketId, created: false };
  }
}

/**
 * An application key that can reach this bucket and nothing else.
 *
 * The capability list is the whole point, so it is spelled out rather than copied: read, write,
 * list and delete files INSIDE one bucket. No listBuckets, no key management, no account
 * access. A studio holding this key cannot enumerate the account it lives in, cannot reach
 * another studio's bucket, and cannot mint themselves a wider one.
 *
 * Returned once and never again — B2 does not store the secret either, so this value has to be
 * written into the instance now or the bucket is unreachable and has to be re-keyed.
 */
export async function createScopedKey(auth, bucketId, label) {
  const key = await call(`${auth.apiUrl}/b2api/v3/b2_create_key`, auth.token, {
    accountId: auth.accountId,
    keyName: String(label).replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 100),
    bucketId,
    capabilities: ['listFiles', 'readFiles', 'writeFiles', 'deleteFiles'],
  });
  return { keyId: key.applicationKeyId, appKey: key.applicationKey };
}

/**
 * Everything provision-instance.mjs needs for one tenant, in one call.
 *
 * Returns the five AWS_* values to write into the new instance. The region is read out of the
 * S3 endpoint rather than asked for, because a Region field that disagrees with the endpoint
 * host is the single most common way to make every upload fail with an error that never
 * mentions the region — see describeRegionMismatch() in server/services/s3-storage.ts.
 */
export async function provisionTenantStorage({ keyId, appKey, serviceName }) {
  const auth = await authorize(keyId, appKey);
  const bucketName = bucketNameFor(serviceName, auth.accountId);
  const { bucketId, created } = await ensureBucket(auth, bucketName);
  const scoped = await createScopedKey(auth, bucketId, `togninja-${serviceName}`);

  // s3ApiUrl is https://s3.<region>.backblazeb2.com
  const region = (auth.s3ApiUrl.match(/^https:\/\/s3\.([a-z0-9-]+)\.backblazeb2\.com/) || [])[1];
  if (!region) throw new Error(`Could not read a region from the B2 S3 endpoint "${auth.s3ApiUrl}"`);

  return {
    created,
    bucketName,
    env: {
      AWS_S3_ENDPOINT: auth.s3ApiUrl,
      AWS_S3_BUCKET: bucketName,
      AWS_ACCESS_KEY_ID: scoped.keyId,
      AWS_SECRET_ACCESS_KEY: scoped.appKey,
      AWS_REGION: region,
    },
  };
}
