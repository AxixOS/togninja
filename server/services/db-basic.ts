import { pool } from "../db";

export async function q(text: string, params?: any[]) {
  const result = await pool.query(text, params || []);
  return result.rows;
}
