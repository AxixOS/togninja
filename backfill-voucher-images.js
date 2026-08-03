/**
 * Backfill voucher_sales records with missing image data from Stripe sessions.
 * 
 * For each sale that has a stripe_session_id but NULL custom_image/design_image,
 * fetch the Stripe session, extract metadata, and UPDATE the DB row.
 */
require('dotenv').config();
const Stripe = require('stripe');
const { Pool } = require('@neondatabase/serverless');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function backfill() {
  const client = await pool.connect();
  try {
    // Find all voucher_sales with a stripe_session_id but missing images
    const { rows } = await client.query(`
      SELECT id, stripe_session_id, custom_image, design_image, personalization_data
      FROM voucher_sales
      WHERE stripe_session_id IS NOT NULL
        AND stripe_session_id != ''
        AND (custom_image IS NULL OR design_image IS NULL)
      ORDER BY created_at DESC
    `);

    console.log(`Found ${rows.length} voucher sales to backfill`);

    let updated = 0;
    let skipped = 0;
    let errored = 0;

    for (const row of rows) {
      try {
        console.log(`\nProcessing sale ${row.id} (session: ${row.stripe_session_id})`);
        
        const session = await stripe.checkout.sessions.retrieve(row.stripe_session_id);
        const m = session.metadata || {};

        const customImage = m.custom_image || null;
        const designImage = m.design_image || null;
        const productHeroImage = m.product_hero_image || null;
        const designTemplateId = m.design_template_id || null;

        // Parse personalization data from voucher_data metadata
        let personalizationData = null;
        if (m.voucher_data) {
          try {
            personalizationData = JSON.parse(m.voucher_data);
          } catch { personalizationData = null; }
        }

        // Check if there's actually data to update
        const hasNewData = customImage || designImage || personalizationData;
        if (!hasNewData && row.custom_image && row.design_image) {
          console.log(`  -> Skipped: no new data from Stripe`);
          skipped++;
          continue;
        }

        // Update the row
        const result = await client.query(`
          UPDATE voucher_sales SET
            custom_image = COALESCE($1, custom_image),
            design_image = COALESCE($2, design_image),
            personalization_data = COALESCE($3, personalization_data)
          WHERE id = $4
        `, [customImage, designImage, personalizationData ? JSON.stringify(personalizationData) : null, row.id]);

        console.log(`  -> Updated: custom_image=${customImage ? 'SET' : 'null'}, design_image=${designImage ? 'SET' : 'null'}, personalization_data=${personalizationData ? 'SET' : 'null'}`);
        updated++;

      } catch (e) {
        console.error(`  -> Error processing sale ${row.id}:`, e.message);
        errored++;
      }
    }

    console.log(`\n=== Backfill Complete ===`);
    console.log(`Updated: ${updated}, Skipped: ${skipped}, Errored: ${errored}`);

  } finally {
    client.release();
    await pool.end();
  }
}

backfill().catch(e => {
  console.error('Backfill failed:', e);
  process.exit(1);
});
