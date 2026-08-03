// Scoped integration API keys — lets trusted external apps (e.g. Infinite Authority)
// call selected write endpoints without the shared ADMIN_TOKEN. Keys are hashed
// (SHA-256) and never stored in plaintext; each key carries an explicit scope list.
//
// Key format: ia_live_<48 hex chars>. Mint with scripts/mint-integration-key.ts.
import { createHash, randomBytes } from 'crypto';
import { pool } from '../db';

export interface IntegrationKey {
  id: string;
  name: string;
  scopes: string[];
}

/** SHA-256 hex of the raw key. Only the hash is ever persisted. */
export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw.trim()).digest('hex');
}

/** Generate a fresh key (shown once at mint time). */
export function generateApiKey(): string {
  return 'ia_live_' + randomBytes(24).toString('hex');
}

let schemaReady: Promise<void> | null = null;
/** Create the keys table on first use (idempotent). */
export function ensureApiKeyTable(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool
      .query(`
        CREATE TABLE IF NOT EXISTS integration_api_keys (
          id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          name         text NOT NULL,
          key_prefix   text NOT NULL,
          key_hash     text UNIQUE NOT NULL,
          scopes       jsonb NOT NULL DEFAULT '[]'::jsonb,
          status       text NOT NULL DEFAULT 'active',
          last_used_at timestamptz,
          created_at   timestamptz DEFAULT now()
        )
      `)
      .then(() => undefined)
      .catch((err) => { schemaReady = null; throw err; });
  }
  return schemaReady;
}

/** Look up a presented key by hash. Returns the active key + its scopes, or null. */
export async function verifyIntegrationKey(presented: string): Promise<IntegrationKey | null> {
  const raw = (presented || '').trim();
  if (!raw) return null;
  try {
    await ensureApiKeyTable();
    const hash = hashApiKey(raw);
    const r = await pool.query(
      `SELECT id, name, scopes, status FROM integration_api_keys WHERE key_hash = $1 LIMIT 1`,
      [hash],
    );
    const row = r.rows[0];
    if (!row || row.status !== 'active') return null;
    // Best-effort last-used timestamp (never blocks the request).
    pool.query(`UPDATE integration_api_keys SET last_used_at = now() WHERE id = $1`, [row.id]).catch(() => {});
    const scopes = Array.isArray(row.scopes)
      ? row.scopes
      : (typeof row.scopes === 'string' ? JSON.parse(row.scopes || '[]') : []);
    return { id: row.id, name: row.name, scopes };
  } catch (e: any) {
    console.warn('[apiKeys] verify failed:', e?.message || e);
    return null;
  }
}

/** True if the key's scope list satisfies `required`. `*` / `admin` grant everything. */
export function keyHasScope(scopes: string[], required: string): boolean {
  if (!required) return true;
  if (!Array.isArray(scopes)) return false;
  if (scopes.includes('*') || scopes.includes('admin')) return true;
  return scopes.includes(required);
}
