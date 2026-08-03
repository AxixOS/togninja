#!/usr/bin/env node

/**
 * Script to quickly add new templates from Bolt.new to the system
 * Usage: node scripts/add-template.js "Template Name" "category" "description" "#primary" "#secondary" "#accent" "feature1,feature2,feature3" "premium/free"
 */

const fs = require('fs');
const path = require('path');

function addTemplate() {
  const args = process.argv.slice(2);
  
  if (args.length < 7) {
    console.log('Usage: node add-template.js "Name" "category" "description" "#primary" "#secondary" "#accent" "feature1,feature2" "premium/free"');
    console.log('Example: node add-template.js "Portrait Elegance" "classic" "Sophisticated portrait showcase" "#8B4513" "#F5F5DC" "#DAA520" "Portrait Focus,Elegant Layout,Client Gallery" "premium"');
    process.exit(1);
  }

  const [name, category, description, primary, secondary, accent, featuresStr, tier] = args;
  
  // Generate template ID
  const id = `template-${String(Date.now()).slice(-8)}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  
  // Parse features
  const features = featuresStr.split(',').map(f => f.trim());
  
  // Create template config
  const templateConfig = {
    id,
    name,
    description,
    category,
    previewImage: `/templates/previews/${id}.jpg`,
    demoUrl: `/demo/${id}`,
    features,
    colorScheme: {
      primary,
      secondary, 
      accent,
      background: category === 'artistic' ? '#1a1a1a' : '#ffffff'
    },
    layout: {
      headerStyle: category === 'minimal' ? 'minimal' : category === 'classic' ? 'centered' : 'modern',
      navigationStyle: category === 'artistic' ? 'hamburger' : 'horizontal',
      footerStyle: category === 'minimal' ? 'minimal' : 'detailed'
    },
    components: {
      heroSection: `${category}-hero`,
      galleryLayout: `${category}-grid`,
      contactForm: `${category}-form`,
      aboutSection: `${category}-about`
    },
    isPremium: tier === 'premium'
  };

  // Read current template system file
  const templateSystemPath = path.join(__dirname, '../server/template-system.ts');
  let content = fs.readFileSync(templateSystemPath, 'utf8');
  
  // Find insertion point
  const insertPoint = content.indexOf('  // TODO: Import remaining 20 templates from Bolt.new');
  if (insertPoint === -1) {
    console.error('Could not find insertion point in template-system.ts');
    process.exit(1);
  }

  // Create template object string
  const templateStr = `  ,
  {
    id: '${templateConfig.id}',
    name: '${templateConfig.name}',
    description: '${templateConfig.description}',
    category: '${templateConfig.category}',
    previewImage: '${templateConfig.previewImage}',
    demoUrl: '${templateConfig.demoUrl}',
    features: [${templateConfig.features.map(f => `'${f}'`).join(', ')}],
    colorScheme: {
      primary: '${templateConfig.colorScheme.primary}',
      secondary: '${templateConfig.colorScheme.secondary}',
      accent: '${templateConfig.colorScheme.accent}',
      background: '${templateConfig.colorScheme.background}'
    },
    layout: {
      headerStyle: '${templateConfig.layout.headerStyle}',
      navigationStyle: '${templateConfig.layout.navigationStyle}',
      footerStyle: '${templateConfig.layout.footerStyle}'
    },
    components: {
      heroSection: '${templateConfig.components.heroSection}',
      galleryLayout: '${templateConfig.components.galleryLayout}',
      contactForm: '${templateConfig.components.contactForm}',
      aboutSection: '${templateConfig.components.aboutSection}'
    },
    isPremium: ${templateConfig.isPremium}
  }`;

  // Insert the new template
  const newContent = content.slice(0, insertPoint) + templateStr + '\n  ' + content.slice(insertPoint);
  
  // Write back to file
  fs.writeFileSync(templateSystemPath, newContent);
  
  console.log(`✅ Added template: ${name}`);
  console.log(`   ID: ${id}`);
  console.log(`   Category: ${category}`);
  console.log(`   Premium: ${tier === 'premium' ? 'Yes' : 'No'}`);
  console.log(`   Colors: ${primary}, ${secondary}, ${accent}`);
  console.log(`   Features: ${features.join(', ')}`);
  console.log('');
  console.log('Next steps:');
  console.log(`1. Add preview image: public/templates/previews/${id}.jpg`);
  console.log(`2. Create template components in: templates/${id}/`);
  console.log('3. Test the template in the admin interface');
}

addTemplate();