// Supabase storage bridge removed. This file remains as a compatibility stub
// to avoid refactors in modules still importing it. Uses Neon-only.
import { decrypt } from "../util/crypto";
import { db } from "../../server/db"; // reuse existing Neon drizzle instance
import { studioIntegrations } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface StudioCreds {
  smtp: { host: string | null; port: number | null; user: string | null; pass: string; from: string };
  stripe: { accountId?: string };
  openai: { apiKey?: string };
  currency: string;
}

export async function loadStudioCreds(studioId: string): Promise<StudioCreds> {
  const rows = await db.select().from(studioIntegrations).where(eq(studioIntegrations.studioId, studioId));
  if (!rows.length) throw new Error('Studio integrations missing');
  const integration = rows[0];
  return {
    smtp: {
      host: (integration as any).smtp_host,
      port: (integration as any).smtp_port,
      user: (integration as any).smtp_user,
      pass: decrypt(((integration as any).smtp_pass_encrypted) ?? ''),
      from: (integration as any).default_from_email ?? process.env.STUDIO_DEFAULT_EMAIL_FROM ?? 'no-reply@example.com'
    },
    stripe: { accountId: (integration as any).stripe_account_id ?? undefined },
    openai: {
      apiKey: (integration as any).openai_api_key_encrypted ? decrypt((integration as any).openai_api_key_encrypted) : undefined,
    },
    currency: (integration as any).default_currency ?? 'EUR'
  };
}

export const SUPABASE_REMOVED = true;