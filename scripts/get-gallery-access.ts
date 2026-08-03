/**
 * Get gallery access details
 */
import 'dotenv/config';
import { pool } from '../server/db';

async function getGalleryAccess() {
  try {
    console.log('🔍 Checking Wedding Photography gallery access...\n');
    
    // Get gallery details
    const gallery = await pool.query(`
      SELECT *
      FROM galleries 
      WHERE slug = 'wedding-photos'
    `);
    
    if (gallery.rows.length === 0) {
      console.log('❌ Gallery not found');
      process.exit(1);
    }
    
    const g = gallery.rows[0];
    
    console.log('📸 Gallery: ' + g.title);
    console.log('🔗 URL: http://localhost:3001/gallery/' + g.slug);
    console.log('🌐 Public: ' + (g.is_public ? 'Yes' : 'No'));
    
    if (g.password) {
      console.log('\n🔑 PASSWORD: ' + g.password);
      console.log('\n✅ Use this password to access the gallery');
    } else {
      console.log('\n✅ No password set - gallery is open');
    }
    
    // Check for any existing access tokens
    const tokens = await pool.query(`
      SELECT token, email, expires_at
      FROM gallery_access_tokens
      WHERE gallery_id = $1
      AND expires_at > NOW()
      LIMIT 5
    `, [g.id]);
    
    if (tokens.rows.length > 0) {
      console.log('\n🎫 Active Access Tokens:');
      tokens.rows.forEach(t => {
        console.log(`  - ${t.email}: ${t.token}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

getGalleryAccess();
