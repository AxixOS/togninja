// agent/integrations/pricing.js - Pricing system for CRM agent
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function getPriceBySku(studioId, sku) {
  try {
    console.log(`🔧 Getting price for SKU: ${sku} in studio: ${studioId}`);
    
    // Normalize SKU to prevent mismatch issues
    const normalizedSku = sku.trim().toUpperCase().replace(/[\u2010-\u2015]/g, '-');
    
    // Standard price mapping for common SKUs
    const standardPrices = {
      'DIGI-10': { label: '10x Digital Files', unit_price: 35.00, sku: 'DIGI-10' },
      'DIGI-50': { label: '50x Digital Files', unit_price: 295.00, sku: 'DIGI-50' },
      'CANVAS-A4': { label: 'A4 Canvas Print', unit_price: 75.00, sku: 'CANVAS-A4' },
      'LEINWAND-A4': { label: 'A4 Leinwand', unit_price: 75.00, sku: 'CANVAS-A4' }, // German alias
      'PRINTS-20': { label: '20x Photo Prints', unit_price: 145.00, sku: 'PRINTS-20' },
      'FAMILY-BASIC': { label: 'Family Photo Session', unit_price: 295.00, sku: 'FAMILY-BASIC' },
      'NEWBORN-DELUXE': { label: 'Newborn Photography Session', unit_price: 450.00, sku: 'NEWBORN-DELUXE' }
    };

    // Check standard prices first with normalized SKU
    if (standardPrices[normalizedSku]) {
      console.log(`✅ Found standard price for ${normalizedSku}: €${standardPrices[normalizedSku].unit_price}`);
      return standardPrices[normalizedSku];
    }

    // Try to get from database price list if available with normalized matching
    try {
      const dbResults = await sql`
        SELECT label, unit_price, sku FROM price_list 
        WHERE UPPER(TRIM(sku)) = ${normalizedSku} AND studio_id = ${studioId}
        LIMIT 1
      `;
      
      if (dbResults.length > 0) {
        console.log(`✅ Found database price for ${normalizedSku}: €${dbResults[0].unit_price}`);
        return {
          label: dbResults[0].label,
          unit_price: parseFloat(dbResults[0].unit_price),
          sku: dbResults[0].sku
        };
      }
    } catch (dbError) {
      console.log(`⚠️ Database price lookup failed: ${dbError.message}`);
    }

    console.log(`❌ No price found for SKU: ${sku} (normalized: ${normalizedSku})`);
    
    // List available SKUs for debugging
    const availableSkus = Object.keys(standardPrices);
    console.log(`Available SKUs: ${availableSkus.join(', ')}`);
    
    return null;

  } catch (error) {
    console.error('❌ getPriceBySku error:', error);
    return null;
  }
}