const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  // Find tables
  const tables = await p.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name LIKE '%tag%' OR table_name LIKE '%blog%') ORDER BY table_name"
  );
  console.log('Tables:', tables.rows);

  // Check blog_posts for tags/categories column
  const cols = await p.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='blog_posts' ORDER BY ordinal_position"
  );
  console.log('blog_posts columns:', cols.rows.map(r => r.column_name));

  // Sample a post to see tags data
  const sample = await p.query("SELECT id, title, tags, categories FROM blog_posts LIMIT 3");
  console.log('Sample posts:', JSON.stringify(sample.rows, null, 2));

  await p.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
