import crypto from "crypto";
import { db } from "../../../lib/db";

function baseUrl(req: any) {
  return process.env.APP_BASE_URL
    || `${req.headers["x-forwarded-proto"] ?? "https"}://${req.headers.host}`;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");
  
  const { questionnaire_id, client_id, expires_in_days } = req.body || {};
  if (!questionnaire_id) return res.status(400).json({ error: "questionnaire_id required" });

  try {
    const token = crypto.randomBytes(10).toString("hex"); // 20-char
    const expires_at = expires_in_days ? `now() + interval '${Number(expires_in_days)} days'` : "null";

    await db(
      `INSERT INTO questionnaire_links(token, questionnaire_id, client_id, expires_at)
       VALUES ($1,$2,$3, ${expires_in_days ? expires_at : "null"})`,
      [token, questionnaire_id, client_id ?? null]
    );

    const link = `${baseUrl(req)}/q/${token}`;
    return res.status(200).json({ token, link });
  } catch (error) {
    console.error("Error creating questionnaire link:", error);
    return res.status(500).json({ error: "Failed to create questionnaire link" });
  }
}