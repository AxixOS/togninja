const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'client', 'src', 'content', 'newageCopyMap.ts');
let s = fs.readFileSync(file, 'utf8');
const before = s;
// Replace backtick-newline-backtick-comma patterns before seoExpansion
s = s.replace(/`\s*`\s*,\s*seoExpansion\./g, '`, seoExpansion.');
if (s === before) {
  console.log('No occurrences found');
  process.exit(0);
}
fs.writeFileSync(file, s, 'utf8');
console.log('Removed duplicated backticks before seoExpansion in newageCopyMap.ts');
