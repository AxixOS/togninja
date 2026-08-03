require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    // Test what error we get when updating
    const invoiceId = '66882c13-313a-4955-8c5c-9f705d912170';
    
    console.log('Testing invoice update...');
    
    // Test the exact same update that the server does
    const dueDate = '2026-02-27';
    
    await sql`
      UPDATE crm_invoices 
      SET 
        due_date = ${dueDate},
        subtotal = ${0},
        tax_amount = ${0},
        discount_type = ${'fixed'},
        discount_value = ${0},
        discount_amount = ${0},
        total = ${0},
        status = ${'draft'},
        notes = ${''},
        footer_text = ${''},
        updated_at = NOW()
      WHERE id = ${invoiceId}::uuid
    `;
    
    console.log('✅ Update successful!');
    
    // Now test deleting and inserting items
    console.log('Testing delete items...');
    await sql`DELETE FROM crm_invoice_items WHERE invoice_id = ${invoiceId}::uuid`;
    console.log('✅ Delete successful!');
    
    console.log('Testing insert item...');
    await sql`
      INSERT INTO crm_invoice_items (
        invoice_id, description, quantity, unit_price, tax_rate, sort_order
      ) VALUES (
        ${invoiceId}::uuid, ${'Test item'}, ${1}, 
        ${100}, ${0}, ${0}
      )
    `;
    console.log('✅ Insert successful!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
  }
  process.exit(0);
})();
