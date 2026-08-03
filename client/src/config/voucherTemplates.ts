// Voucher Template Images Configuration
// This file provides fallback images and template configurations for the voucher system

export const VOUCHER_TEMPLATE_IMAGES = {
  // Delivery method images
  delivery: {
    pdf: '/images/voucher-pdf.png',
    postStandard: '/images/voucher-post-standard.png',
    postPremium: '/images/voucher-post-premium.png',
    geschenkbox: '/images/voucher-geschenkbox.png'
  },
  
  // Design template images
  templates: {
    massage: '/images/templates/massage.jpg',
    birthday: '/images/templates/birthday.jpg',
    anniversary: '/images/templates/anniversary.jpg',
    mothersDay: '/images/templates/mothers-day.jpg',
    valentines: '/images/templates/valentines.jpg',
    christmas: '/images/templates/christmas.jpg',
    thankYou: '/images/templates/thank-you.jpg',
    congratulations: '/images/templates/congratulations.jpg',
    getWell: '/images/templates/get-well.jpg'
  },
  
  // Fallback images for when templates don't load
  fallbacks: {
    delivery: '📦',
    template: '🎨',
    voucher: '🎁'
  }
};

// Template configuration with occasions and categories
export const TEMPLATE_CONFIGS = {
  massage: { 
    name: 'Massage Template', 
    category: 'wellness', 
    occasion: 'Entspannung',
    colors: ['#8B4513', '#F4A460', '#DEB887']
  },
  birthday: { 
    name: 'Birthday Celebration', 
    category: 'birthday', 
    occasion: 'Happy Birthday',
    colors: ['#FF69B4', '#FFD700', '#32CD32']
  },
  anniversary: { 
    name: 'Anniversary', 
    category: 'anniversary', 
    occasion: 'Happy Anniversary',
    colors: ['#DC143C', '#FFB6C1', '#FFF8DC']
  },
  mothersDay: { 
    name: 'Mother\'s Day', 
    category: 'mothers-day', 
    occasion: 'Happy Mother\'s Day',
    colors: ['#FF1493', '#FFB6C1', '#FFFFFF']
  },
  valentines: { 
    name: 'Valentine\'s Day', 
    category: 'love', 
    occasion: 'I Love You',
    colors: ['#DC143C', '#FF69B4', '#FFFFFF']
  },
  christmas: { 
    name: 'Christmas', 
    category: 'christmas', 
    occasion: 'Merry Christmas',
    colors: ['#228B22', '#DC143C', '#FFD700']
  },
  thankYou: { 
    name: 'Thank You', 
    category: 'gratitude', 
    occasion: 'Thank You',
    colors: ['#4169E1', '#87CEEB', '#FFFFFF']
  },
  congratulations: { 
    name: 'Congratulations', 
    category: 'celebration', 
    occasion: 'Congratulations',
    colors: ['#FFD700', '#FF4500', '#FFFFFF']
  },
  getWell: { 
    name: 'Get Well Soon', 
    category: 'wellness', 
    occasion: 'Get Well Soon',
    colors: ['#90EE90', '#87CEEB', '#FFFFFF']
  }
};

// Generate placeholder images for development
export const generatePlaceholderImage = (text: string, width = 200, height = 150) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);
    
    // Text
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
  }
  
  return canvas.toDataURL();
};
