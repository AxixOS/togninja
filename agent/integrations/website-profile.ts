import { neon } from "../../server/db-compat.js";
import { scrapeSite } from "./webscrape";

export async function analyzeAndStoreWebsite(studioId: string, url: string) {
  const scrape = await scrapeSite(url);
  // Lazy-load Lighthouse to avoid initializing it during general server startup
  const { runLighthouse } = await import("./lighthouse");
  const lighthouse = await runLighthouse(url);

  const websiteProfile = {
    studio_id: studioId,
    url,
    html_hash: scrape.html_hash,
    profile_json: scrape,
    lighthouse_json: lighthouse
  };

  // Insert into database using Neon serverless connection
  const sql = neon(process.env.DATABASE_URL!);
  
  const query = `
    INSERT INTO website_profiles (studio_id, url, html_hash, profile_json, lighthouse_json)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  
  const result = await sql(query, [
    studioId,
    url,
    scrape.html_hash,
    JSON.stringify(scrape),
    JSON.stringify(lighthouse)
  ]);

  return result[0];
}

export async function getWebsiteProfile(studioId: string) {
  const sql = neon(process.env.DATABASE_URL!);
  
  const query = `
    SELECT * FROM website_profiles
    WHERE studio_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
  
  const result = await sql(query, [studioId]);
  return result[0] || null;
}