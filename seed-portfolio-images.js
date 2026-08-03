require('dotenv/config');

const { Pool } = require('@neondatabase/serverless');

async function seedPortfolioImages() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const images = [
    { category: 'family', url: 'https://images.unsplash.com/photo-1581952976147-5a2d15560349?w=800', alt: 'Family photography', title: 'Family Moments' },
    { category: 'family', url: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800', alt: 'Family portrait', title: 'Family Portrait' },
    { category: 'family', url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800', alt: 'Happy family', title: 'Together' },
    { category: 'newborn', url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800', alt: 'Newborn photography', title: 'Newborn Dreams' },
    { category: 'newborn', url: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800', alt: 'Baby sleeping', title: 'Peaceful Sleep' },
    { category: 'newborn', url: 'https://images.unsplash.com/photo-1492725764893-90b379c2b6e7?w=800', alt: 'Baby portrait', title: 'Little One' },
    { category: 'maternity', url: 'https://images.unsplash.com/photo-1519689373023-dd07c7988603?w=800', alt: 'Maternity photography', title: 'Expecting Joy' },
    { category: 'maternity', url: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=800', alt: 'Pregnancy portrait', title: 'Beautiful Journey' },
    { category: 'wedding', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', alt: 'Wedding photography', title: 'Wedding Day' },
    { category: 'wedding', url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800', alt: 'Wedding couple', title: 'Love Story' },
    { category: 'wedding', url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800', alt: 'Wedding ceremony', title: 'I Do' },
    { category: 'business', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800', alt: 'Business photography', title: 'Professional' },
    { category: 'business', url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800', alt: 'Corporate portrait', title: 'Executive' },
    { category: 'event', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', alt: 'Event photography', title: 'Celebration' },
    { category: 'event', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800', alt: 'Party event', title: 'Special Moments' },
    { category: 'featured', url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800', alt: 'Featured work', title: 'Artistic Vision' },
    { category: 'featured', url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800', alt: 'Featured photography', title: 'Creative Eye' },
    { category: 'featured', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800', alt: 'Camera', title: 'The Craft' },
  ];

  try {
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      await pool.query(
        'INSERT INTO portfolio_images (category, url, alt, title, sort_order) VALUES ($1, $2, $3, $4, $5)',
        [img.category, img.url, img.alt, img.title, i]
      );
      console.log(`Inserted: ${img.title}`);
    }
    console.log('All seed data inserted successfully!');
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

seedPortfolioImages();
