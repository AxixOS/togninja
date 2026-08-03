"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPriceBySku = getPriceBySku;
exports.getAllActivePrices = getAllActivePrices;
const serverless_1 = require("@neondatabase/serverless");
const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
async function getPriceBySku(studioId, sku) {
    try {
        const result = await sql `
      SELECT id, sku, label, unit_price, currency, is_active
      FROM price_list 
      WHERE studio_id = ${studioId} 
        AND is_active = true 
        AND LOWER(sku) = LOWER(${sku})
      LIMIT 1
    `;
        if (result.length === 0)
            return null;
        return result[0];
    }
    catch (error) {
        console.error('❌ getPriceBySku error:', error);
        return null;
    }
}
async function getAllActivePrices(studioId) {
    try {
        const result = await sql `
      SELECT id, sku, label, unit_price, currency, category
      FROM price_list 
      WHERE studio_id = ${studioId} 
        AND is_active = true
      ORDER BY category, sku
    `;
        return result;
    }
    catch (error) {
        console.error('❌ getAllActivePrices error:', error);
        return [];
    }
}
