const { neon } = require('@neondatabase/serverless');

async function checkFolders() {
  const sql = neon(process.env.DATABASE_URL);
  
  const folders = await sql`SELECT * FROM digital_folders WHERE id = 1`;
  console.log(JSON.stringify(folders, null, 2));
}

checkFolders().catch(console.error);
