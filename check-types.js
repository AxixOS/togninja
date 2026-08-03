const { Pool } = require('pg');
const p = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_2sKfUx0ctHQN@ep-snowy-art-agb4ejwo-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});
p.query(`SELECT table_name, column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name IN ('questionnaire_responses','crm_clients','surveys','questionnaire_links') 
  ORDER BY table_name, ordinal_position`)
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); p.end(); })
  .catch(e => { console.error(e); p.end(); });
