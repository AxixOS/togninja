/*
  Update all phone numbers from +43 677 663 99210 to +43 677 633 99210
  This script will update the remaining backend files
*/

const fs = require('fs');
const path = require('path');

// Files to update
const filesToUpdate = [
  'server/routes.ts',
  'server/autoblog.ts', 
  'server/autoblog-assistant-first.ts',
  'server/public/index.html',
  'scripts/fix-deployment-issue.js',
  'test-email-endpoints.js',
  'agent/scripts/update-system-prompt.ts'
];

const oldNumber = '+43 677 663 99210';
const newNumber = '+43 677 633 99210';

console.log('🔄 Updating phone numbers in backend files...');

let updatedFiles = 0;
let totalReplacements = 0;

filesToUpdate.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  if (fs.existsSync(fullPath)) {
    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      const originalContent = content;
      
      // Count replacements in this file
      const matches = (content.match(new RegExp(oldNumber.replace(/[+]/g, '\\+'), 'g')) || []).length;
      
      if (matches > 0) {
        content = content.replace(new RegExp(oldNumber.replace(/[+]/g, '\\+'), 'g'), newNumber);
        fs.writeFileSync(fullPath, content, 'utf8');
        
        console.log(`✅ Updated ${filePath}: ${matches} replacements`);
        updatedFiles++;
        totalReplacements += matches;
      }
    } catch (error) {
      console.error(`❌ Error updating ${filePath}:`, error.message);
    }
  } else {
    console.log(`⏭️ File not found: ${filePath}`);
  }
});

console.log(`\n🎉 Phone number update completed!`);
console.log(`📊 Updated ${updatedFiles} files with ${totalReplacements} total replacements`);
console.log(`📞 Changed from: ${oldNumber}`);
console.log(`📞 Changed to: ${newNumber}`);