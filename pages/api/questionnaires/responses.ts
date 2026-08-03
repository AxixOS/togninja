import { db } from "../../../lib/db";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");
  
  const { questionnaire_id } = req.query;
  if (!questionnaire_id) return res.status(400).json({ error: "questionnaire_id required" });

  try {
    const r = await db(
      `SELECT id, client_id, submitted_at, answers
       FROM questionnaire_responses
       WHERE questionnaire_id=$1
       ORDER BY submitted_at DESC`,
      [String(questionnaire_id)]
    );

    return res.status(200).json({ count: r.rowCount, rows: r.rows });
  } catch (error) {
    console.error("Error fetching questionnaire responses:", error);
    return res.status(500).json({ error: "Failed to fetch responses" });
  }
}