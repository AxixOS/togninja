const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'client', 'src', 'content', 'newageCopyMap.ts');
let s = fs.readFileSync(file, 'utf8');
const before = s;
// Replace opening single-quote for withSeoExpansion(\' to backtick
s = s.replace(/withSeoExpansion\('\s*/g, 'withSeoExpansion(`');
// Replace closing '\', seoExpansion. with `, seoExpansion.
s = s.replace(/'\s*,\s*seoExpansion\./g, '`, seoExpansion.');
// Also replace any stray backtick-comma sequences like `\n`, seoExpansion. to `, seoExpansion.
s = s.replace(/`\s*,\s*seoExpansion\./g, '`, seoExpansion.');
if (s === before) {
  console.log('No changes made');
  process.exit(0);
}
fs.writeFileSync(file, s, 'utf8');
console.log('Converted withSeoExpansion single-quote blocks to template literals in newageCopyMap.ts');
