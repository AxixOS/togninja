import { neon } from "../../server/db-compat.js";

const sql = neon(process.env.DATABASE_URL!);

export async function getPriceBySku(studioId: string, sku: string) {
  try {
    const result = await sql`
      SELECT id, sku, label, unit_price, currency, is_active
      FROM price_list 
      WHERE studio_id = ${studioId} 
        AND is_active = true 
        AND LOWER(sku) = LOWER(${sku})
      LIMIT 1
    `;
    
    if (result.length === 0) return null;
    return result[0];
  } catch (error) {
    console.error('❌ getPriceBySku error:', error);
    return null;
  }
}

export async function getAllActivePrices(studioId: string) {
  try {
    const result = await sql`
      SELECT id, sku, label, unit_price, currency, category
      FROM price_list 
      WHERE studio_id = ${studioId} 
        AND is_active = true
      ORDER BY category, sku
    `;
    
    return result;
  } catch (error) {
    console.error('❌ getAllActivePrices error:', error);
    return [];
  }
}