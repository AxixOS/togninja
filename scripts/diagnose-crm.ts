import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from '../server/db';

// Simple read-only diagnostic: lists crm_* tables and counts core rows.
(async () => {
  const start = Date.now();
  const report: any = { ok: true, startedAt: new Date().toISOString() };
  try {
    // Verify basic connectivity
    await db.execute(sql`SELECT 1`);
    report.connection = 'ok';

    // List CRM-related tables present
    const tables = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (
          table_name LIKE 'crm_%' OR
          table_name IN ('users','admin_users')
        )
      ORDER BY table_name;
    `);
    const tableRows = (tables as any)?.rows ?? tables;
    report.tables = (tableRows as any[]).map((r: any) => r.table_name);

    // Helper to count table rows if table exists
    const countIf = async (name: string) => {
      if (!report.tables.includes(name)) return { table: name, exists: false };
      try {
        const rows = await db.execute(sql`SELECT count(*)::int AS count FROM ${sql.raw(name)}`);
        const r = (rows as any)?.rows ?? rows;
        const count = (r as any[])[0]?.count ?? 0;
        return { table: name, exists: true, count };
      } catch (err: any) {
        return { table: name, exists: true, error: err.message };
      }
    };

    report.counts = await Promise.all([
      countIf('crm_clients'),
      countIf('crm_leads'),
      countIf('crm_invoices'),
      countIf('crm_messages')
    ]);

    // Sample one row (anonymized) if clients table exists
    if (report.tables.includes('crm_clients')) {
      try {
        const sample = await db.execute(sql`SELECT id, first_name, last_name, email, created_at FROM crm_clients LIMIT 1`);
        const sampleRows = (sample as any)?.rows ?? sample;
        report.sampleClient = (Array.isArray(sampleRows) && sampleRows.length > 0) ? sampleRows[0] : null;
      } catch {/* ignore */}
    }
  } catch (error: any) {
    report.ok = false;
    report.error = error.message;
  } finally {
    report.durationMs = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.ok ? 0 : 1);
  }
})();
