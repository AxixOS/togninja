import { pool } from './server/db';

async function addEasterTemplate() {
  try {
    // Check if Easter template already exists
    const existing = await pool.query(
      "SELECT id FROM voucher_templates WHERE LOWER(name) LIKE '%easter%' OR LOWER(category) = 'easter'"
    );
    if (existing.rows.length > 0) {
      console.log('✅ Easter template already exists, skipping');
      return;
    }

    // Insert Easter template matching existing style (Birthday, Anniversary, Mother's Day, etc.)
    const result = await pool.query(`
      INSERT INTO voucher_templates (name, category, occasion, is_active, display_order,
        banner_color, banner_text_color, font_family, message_font_size, layout_style)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      'Easter',           // name
      'easter',           // category
      'Happy Easter',     // occasion
      true,               // is_active
      8,                  // display_order (after existing 7 templates)
      '#8B5CF6',          // banner_color - purple/violet for Easter
      '#ffffff',          // banner_text_color
      'Helvetica',        // font_family
      22,                 // message_font_size
      'classic'           // layout_style
    ]);

    console.log('✅ Easter template created successfully:', result.rows[0]);
    console.log('📝 Note: Upload an Easter-themed image via the admin Templates tab');
  } catch (error: any) {
    console.error('❌ Error adding Easter template:', error.message);
  } finally {
    await pool.end();
  }
}

addEasterTemplate();
