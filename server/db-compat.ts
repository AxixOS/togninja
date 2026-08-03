// Drop-in replacement for @neondatabase/serverless's `neon()`, backed by the standard pg
// pool — so existing raw-SQL call sites keep working on ANY Postgres (Supabase / Neon /
// self-hosted), not just Neon's WebSocket endpoint.
//
// Covers every form the codebase uses:
//   const sql = neon(url);
//   await sql`SELECT ... WHERE id = ${id}`      // tagged template
//   await sql('SELECT ... WHERE id = $1', [id]) // function form
//   await sql.query('SELECT ...', [id])         // .query form
// All resolve to a rows array, exactly like Neon's client.
import { pool } from './db';

type Row = Record<string, any>;

export function neon(_url?: string) {
  const run = async (textOrStrings: any, ...values: any[]): Promise<Row[]> => {
    // Tagged-template: sql`... ${a} ...`  → parameterize $1, $2, …
    if (Array.isArray(textOrStrings) && Object.prototype.hasOwnProperty.call(textOrStrings, 'raw')) {
      let text = '';
      (textOrStrings as TemplateStringsArray).forEach((chunk, i) => {
        text += chunk;
        if (i < values.length) text += `$${i + 1}`;
      });
      return (await pool.query(text, values)).rows;
    }
    // Function form: sql(text, [params])  or  sql(text, p1, p2, …)
    const params = values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
    return (await pool.query(textOrStrings as string, params)).rows;
  };
  (run as any).query = async (text: string, params: any[] = []): Promise<Row[]> =>
    (await pool.query(text, params)).rows;
  return run;
}
