"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeAndStoreWebsite = analyzeAndStoreWebsite;
exports.getWebsiteProfile = getWebsiteProfile;
const serverless_1 = require("@neondatabase/serverless");
const webscrape_1 = require("./webscrape");
async function analyzeAndStoreWebsite(studioId, url) {
    const scrape = await (0, webscrape_1.scrapeSite)(url);
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
    const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
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
async function getWebsiteProfile(studioId) {
    const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
    const query = `
    SELECT * FROM website_profiles
    WHERE studio_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;
    const result = await sql(query, [studioId]);
    return result[0] || null;
}
