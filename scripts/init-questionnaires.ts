import { pool } from "../server/db";

async function main() {
  const client = await pool.connect();
  try {
    console.log("Initializing questionnaire tables...");
    await client.query("BEGIN");
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

    // Ensure questionnaires table
    await client.query(`
      CREATE TABLE IF NOT EXISTS questionnaires (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug          text UNIQUE NOT NULL,
        title         text NOT NULL,
        description   text,
        fields        jsonb NOT NULL,
        notify_email  text,
        is_active     boolean NOT NULL DEFAULT true,
        created_at    timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Ensure questionnaire_responses table (create if missing)
    await client.query(`
      CREATE TABLE IF NOT EXISTS questionnaire_responses (
        id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        client_email      text,
        client_name       text,
        answers           jsonb NOT NULL,
        created_at        timestamptz NOT NULL DEFAULT now(),
        ip                inet,
        user_agent        text
      );
    `);

    // Ensure missing columns are added for existing installations
    const ensureColumn = async (name: string, type: string, defaultExpr?: string) => {
      const exists = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name='questionnaire_responses' AND column_name=$1`,
        [name]
      );
      if (exists.rowCount === 0) {
        const def = defaultExpr ? ` DEFAULT ${defaultExpr}` : '';
        await client.query(`ALTER TABLE questionnaire_responses ADD COLUMN ${name} ${type}${def};`);
      }
    };

    await ensureColumn('client_email', 'text');
    await ensureColumn('client_name', 'text');
    await ensureColumn('answers', 'jsonb');
    await ensureColumn('created_at', 'timestamptz', 'now()');
    await ensureColumn('ip', 'inet');
    await ensureColumn('user_agent', 'text');

    // Backfill columns on existing table if they are missing
    await client.query(`
      ALTER TABLE questionnaire_responses
      ADD COLUMN IF NOT EXISTS client_email text,
      ADD COLUMN IF NOT EXISTS client_name text,
      ADD COLUMN IF NOT EXISTS answers jsonb,
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS ip inet,
      ADD COLUMN IF NOT EXISTS user_agent text;
    `);

    // Add questionnaire_id column if missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'questionnaire_responses' AND column_name = 'questionnaire_id'
        ) THEN
          ALTER TABLE questionnaire_responses ADD COLUMN questionnaire_id uuid;
        END IF;
      END $$;
    `);

    // Add foreign key if missing
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'questionnaire_responses' AND constraint_type = 'FOREIGN KEY'
            AND constraint_name = 'questionnaire_responses_questionnaire_id_fkey'
        ) THEN
          ALTER TABLE questionnaire_responses
          ADD CONSTRAINT questionnaire_responses_questionnaire_id_fkey
          FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Create index if column exists
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'questionnaire_responses' AND column_name = 'questionnaire_id'
        ) THEN
          CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_qid
          ON questionnaire_responses(questionnaire_id);
        END IF;
      END $$;
    `);

    await client.query("COMMIT");
    console.log("✅ Questionnaire tables ensured");
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to init questionnaires:", e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
