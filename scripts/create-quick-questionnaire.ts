import { pool } from "../server/db";

async function main() {
  const client = await pool.connect();
  try {
    const slug = Math.random().toString(36).slice(2, 12);
    const title = process.env.Q_TITLE || "Quick Test";
    const description = process.env.Q_DESC || "E2E smoke";
    const notify = process.env.TEST_NOTIFY_EMAIL || process.env.NOTIFY_EMAIL || null;
    const fields = [
      { key: "note", label: "Note", type: "text", required: true },
    ];
    const sql = `INSERT INTO questionnaires (slug,title,description,fields,notify_email)
                 VALUES ($1,$2,$3,$4,$5)
                 RETURNING id, slug`;
    const res = await client.query(sql, [slug, title, description, JSON.stringify(fields), notify]);
    const row = res.rows[0];
    const base = String(process.env.APP_BASE_URL || process.env.APP_URL || "").replace(/\/$/, "");
    const link = base ? `${base}/q/${row.slug}` : `/q/${row.slug}`;
    console.log(JSON.stringify({ ok: true, slug: row.slug, link }, null, 2));
  } catch (e: any) {
    console.error("Create questionnaire failed:", e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
