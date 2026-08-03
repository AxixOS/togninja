const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/content/newageCopyMap.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace backtick template literals with regular strings
// Pattern: markdown: withSeoExpansion(`...content...\`, seoExpansion.xxx)
// Replace with: markdown: withSeoExpansion('...content...\\n...', seoExpansion.xxx)

// This is done by replacing opening and closing backticks
// Start: \`markdown: withSeoExpansion(\`
content = content.replace(/markdown: withSeoExpansion\(`/g, "markdown: withSeoExpansion('");

// End: \`, seoExpansion.xxx)
content = content.replace(/`\), seoExpansion/g, "'), seoExpansion");

// Also fix the second part of end marker
content = content.replace(/`\), seoExpansion/g, "'), seoExpansion");

// Now convert actual newlines to \n in the strings
// This is trickier - we need to find multiline strings and escape them

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed backticks in newageCopyMap.ts');
