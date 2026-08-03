require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

// Mapping of markdown files to page IDs
const PAGE_MAPPINGS = {
  'schwangerschaftsfotos.md': 'schwangerschaftsfotos',
  'babyfotos-3-12-monate.md': 'babyfotos',
  'neugeborenenfotos.md': 'neugeborenenfotos',
  'hochzeitsfotografie.md': 'hochzeitsfotografie',
  'bewerbungsfotos-linkedin.md': 'bewerbungsfotos',
  'team-mitarbeiterfotos.md': 'teamfotos',
  'business-portraits.md': 'business',
  'portraitfotografie.md': 'portraitfotografie',
  'produktfotografie.md': 'produktfotografie',
  'immobilienfotografie.md': 'immobilienfotografie',
  'studio-fotografie.md': 'studiofotografie',
  'eventfotografie.md': 'eventfotografie'
};

interface ParsedContent {
  heroTitle: string;
  heroSubtitle: string;
  introText: string;
  equipmentText: string;
  sessionDetails: string;
  amenitiesText: string;
  deliveryText: string;
  expectationsTitle: string;
  expectationsList: string[];
  packagesTitle: string;
  packagesTable: string;
  specialSectionTitle: string;
  specialSectionText: string;
  processTitle: string;
  processSteps: Array<{number: number, title: string, description: string}>;
  faqTitle: string;
  faqItems: Array<{question: string, answer: string}>;
  externalLink: string;
}

function parseMarkdownContent(content: string, pageId: string): ParsedContent {
  const lines = content.split('\n');
  
  const parsed: ParsedContent = {
    heroTitle: '',
    heroSubtitle: '',
    introText: '',
    equipmentText: '',
    sessionDetails: '',
    amenitiesText: '',
    deliveryText: '',
    expectationsTitle: '',
    expectationsList: [],
    packagesTitle: '',
    packagesTable: '',
    specialSectionTitle: '',
    specialSectionText: '',
    processTitle: '',
    processSteps: [],
    faqTitle: '',
    faqItems: [],
    externalLink: ''
  };

  let currentSection = '';
  let collectingIntro = false;
  let collectingExpectations = false;
  let collectingPackages = false;
  let collectingSpecial = false;
  let collectingProcess = false;
  let collectingFaq = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Hero title (first H1)
    if (line.startsWith('# ') && !parsed.heroTitle) {
      parsed.heroTitle = line.replace('# ', '');
      continue;
    }
    
    // Hero subtitle (bold text after title)
    if (line.startsWith('**') && line.endsWith('**') && !parsed.heroSubtitle && parsed.heroTitle) {
      parsed.heroSubtitle = line.replace(/\*\*/g, '');
      collectingIntro = true;
      continue;
    }
    
    // Intro paragraphs (before first ---) 
    if (collectingIntro && !line.startsWith('##') && line !== '---') {
      if (line && !line.startsWith('**')) {
        if (line.includes('Canon 1Dx III')) {
          parsed.equipmentText += line + ' ';
        } else if (line.includes('ca. 60 Minuten')) {
          parsed.sessionDetails += line + ' ';
        } else if (line.includes('Wasser, Kaffee')) {
          parsed.amenitiesText += line + ' ';
        } else if (line.includes('Make-up bieten')) {
          parsed.amenitiesText += line + ' ';
        } else if (line.includes('Cloud')) {
          parsed.deliveryText += line + ' ';
        } else {
          parsed.introText += line + ' ';
        }
      }
    }
    
    if (line === '---') {
      collectingIntro = false;
    }
    
    // Was ihr erwarten könnt section
    if (line.startsWith('## Was ihr erwarten könnt')) {
      parsed.expectationsTitle = line.replace('## ', '');
      collectingExpectations = true;
      continue;
    }
    
    if (collectingExpectations && line.startsWith('-')) {
      const bullet = line.replace(/^- \*\*/, '').replace(/\*\*:?/, ':');
      parsed.expectationsList.push(bullet);
    }
    
    // Pakete section
    if (line.startsWith('## Pakete')) {
      parsed.packagesTitle = line.replace('## ', '');
      collectingExpectations = false;
      collectingPackages = true;
      continue;
    }
    
    if (collectingPackages && (line.startsWith('|') || line.includes('Paket'))) {
      parsed.packagesTable += line + '\n';
    }
    
    // Special section (varies by page type)
    if (line.startsWith('##') && !line.includes('Pakete') && !line.includes('erwarten') && 
        !line.includes('Ablauf') && !line.includes('FAQ') && collectingPackages) {
      parsed.specialSectionTitle = line.replace('## ', '');
      collectingPackages = false;
      collectingSpecial = true;
      continue;
    }
    
    if (collectingSpecial && !line.startsWith('##')) {
      if (line && !line.startsWith('---')) {
        parsed.specialSectionText += line + ' ';
      }
    }
    
    // Process section
    if (line.startsWith('## Ablauf')) {
      parsed.processTitle = line.replace('## ', '');
      collectingSpecial = false;
      collectingProcess = true;
      continue;
    }
    
    if (collectingProcess && line.match(/^\d+\./)) {
      const match = line.match(/^(\d+)\.\s+\*\*([^*]+)\*\*:?\s*(.+)/);
      if (match) {
        parsed.processSteps.push({
          number: parseInt(match[1]),
          title: match[2],
          description: match[3]
        });
      }
    }
    
    // FAQ section
    if (line.startsWith('## Mini')) {
      parsed.faqTitle = 'Mini-FAQ';
      collectingProcess = false;
      collectingFaq = true;
      continue;
    }
    
    if (collectingFaq && line.startsWith('**') && line.endsWith('**')) {
      const question = line.replace(/\*\*/g, '');
      const nextLine = lines[i + 1]?.trim();
      if (nextLine) {
        parsed.faqItems.push({
          question: question,
          answer: nextLine
        });
        i++; // Skip the answer line
      }
    }
    
    // External link
    if (line.includes('Weitere Infos')) {
      const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        parsed.externalLink = match[2];
      }
    }
  }
  
  return parsed;
}

function generateContentKeys(pageId: string, parsed: ParsedContent): Record<string, string> {
  const keys: Record<string, string> = {};
  
  // Hero section
  keys[`manual.${pageId}.heroTitle`] = parsed.heroTitle;
  keys[`manual.${pageId}.heroSubtitle`] = parsed.heroSubtitle;
  keys[`manual.${pageId}.introText`] = parsed.introText.trim();
  keys[`manual.${pageId}.equipmentText`] = parsed.equipmentText.trim();
  keys[`manual.${pageId}.sessionDetails`] = parsed.sessionDetails.trim();
  keys[`manual.${pageId}.amenitiesText`] = parsed.amenitiesText.trim();
  keys[`manual.${pageId}.deliveryText`] = parsed.deliveryText.trim();
  
  // Expectations
  keys[`manual.${pageId}.expectationsTitle`] = parsed.expectationsTitle;
  parsed.expectationsList.forEach((item, index) => {
    keys[`manual.${pageId}.expectation${index + 1}`] = item;
  });
  
  // Packages
  keys[`manual.${pageId}.packagesTitle`] = parsed.packagesTitle;
  keys[`manual.${pageId}.packagesTable`] = parsed.packagesTable.trim();
  
  // Special section
  keys[`manual.${pageId}.specialSectionTitle`] = parsed.specialSectionTitle;
  keys[`manual.${pageId}.specialSectionText`] = parsed.specialSectionText.trim();
  
  // Process
  keys[`manual.${pageId}.processTitle`] = parsed.processTitle;
  parsed.processSteps.forEach((step) => {
    keys[`manual.${pageId}.process${step.number}.title`] = step.title;
    keys[`manual.${pageId}.process${step.number}.description`] = step.description;
  });
  
  // FAQ
  keys[`manual.${pageId}.faqTitle`] = parsed.faqTitle;
  parsed.faqItems.forEach((item, index) => {
    keys[`manual.${pageId}.faq${index + 1}.question`] = item.question;
    keys[`manual.${pageId}.faq${index + 1}.answer`] = item.answer;
  });
  
  // External link
  keys[`manual.${pageId}.externalLink`] = parsed.externalLink;
  
  return keys;
}

async function migrateAllPages() {
  console.log('🚀 Starting service content migration...\n');
  
  const serviceContentDir = path.join(__dirname, 'service-content');
  const studioId = 'a499a931-e58c-48fc-9cf5-6c5d688aed88'; // Your studio ID
  
  for (const [filename, pageId] of Object.entries(PAGE_MAPPINGS)) {
    try {
      console.log(`📄 Processing ${filename} → ${pageId}`);
      
      const filePath = path.join(serviceContentDir, filename);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filename}, skipping...\n`);
        continue;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = parseMarkdownContent(content, pageId);
      const contentKeys = generateContentKeys(pageId, parsed);
      
      console.log(`   Extracted ${Object.keys(contentKeys).length} content keys`);
      
      // Check if page already exists
      const existing = await sql`
        SELECT id, published_content FROM manual_page_content 
        WHERE studio_id = ${studioId} 
        AND page_id = ${pageId} 
        AND language = 'de'
      `;
      
      if (existing && existing.length > 0) {
        // Merge with existing content (preserve image URLs but allow text updates)
        const existingContent = existing[0].published_content || {};
        const mergedContent = { ...existingContent, ...contentKeys };
        
        // Update existing
        await sql`
          UPDATE manual_page_content 
          SET published_content = ${JSON.stringify(mergedContent)},
              status = 'published',
              published_at = NOW()
          WHERE studio_id = ${studioId} 
          AND page_id = ${pageId} 
          AND language = 'de'
        `;
        console.log(`   ✅ Updated existing content for ${pageId} (merged ${Object.keys(contentKeys).length} new keys with ${Object.keys(existingContent).length} existing keys)\n`);
      } else {
        // Insert new
        await sql`
          INSERT INTO manual_page_content (studio_id, page_id, language, published_content, status, published_at)
          VALUES (${studioId}, ${pageId}, 'de', ${JSON.stringify(contentKeys)}, 'published', NOW())
        `;
        console.log(`   ✅ Created new content for ${pageId}\n`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error processing ${filename}:`, error.message, '\n');
    }
  }
  
  console.log('✨ Migration complete!');
  process.exit(0);
}

migrateAllPages().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
