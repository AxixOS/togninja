const fs = require('fs');

// Load the backup file which has raw newlines inside content fields
const rawText = fs.readFileSync('blog-articles.json.bak', 'utf8');

// Strategy: manually rebuild the JSON by parsing articles more carefully
// Use a split on }, { to isolate each article, fix it, then rejoin

const articles = [];
let current = '';
let inString = false;
let escape = false;

for (let i = 0; i < rawText.length; i++) {
  const char = rawText[i];
  
  if (escape) {
    current += char;
    escape = false;
    continue;
  }
  
  if (char === '\\') {
    current += char;
    escape = true;
    continue;
  }
  
  if (char === '"') {
    inString = !inString;
    current += char;
    continue;
  }
  
  if (!inString && char === '}') {
    current += char;
    if (current.trim().startsWith('{')) {
      // End of an article
      articles.push(current.trim());
      current = '';
    }
    continue;
  }
  
  current += char;
}

console.log('Found', articles.length, 'article objects');

// Now fix each article by properly escaping newlines in content/excerpt
const fixed = articles.map(articleText => {
  // Parse this article carefully
  try {
    // Try parsing as-is first
    JSON.parse(articleText);
    return articleText; // Already valid
  } catch (e) {
    // Not valid; fix newlines in fields
    // Replace raw newlines within field values
    let fixed = articleText;
    
    // Replace raw newlines in content field
    fixed = fixed.replace(/("content":\s*")([^"]*?)(")/s, (match, pre, body, post) => {
      const escaped = body
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/"/g, '\\"')    // Escape quotes
        .replace(/\r\n/g, '\\n') // CRLF to \n
        .replace(/\n/g, '\\n')   // LF to \n
        .replace(/\r/g, '\\n');  // CR to \n
      return pre + escaped + post;
    });
    
    // Replace raw newlines in excerpt field
    fixed = fixed.replace(/("excerpt":\s*")([^"]*?)(")/s, (match, pre, body, post) => {
      const escaped = body
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r\n/g, '\\n')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\n');
      return pre + escaped + post;
    });
    
    // Verify this fix worked
    try {
      JSON.parse(fixed);
      return fixed;
    } catch (e2) {
      console.warn('Failed to fix article:', e2.message);
      return null;
    }
  }
});

// Filter out nulls and rebuild array
const validArticles = fixed.filter(Boolean);
console.log('Successfully fixed', validArticles.length, 'articles');

const jsonText = '[\n  ' + validArticles.join(',\n  ') + '\n]';

// Final validation
try {
  const parsed = JSON.parse(jsonText);
  console.log('✓ JSON is valid. Articles:', parsed.length);
  fs.writeFileSync('blog-articles.json', jsonText);
  console.log('✓ Written to blog-articles.json');
} catch (e) {
  console.error('✗ Final JSON still invalid:', e.message);
  fs.writeFileSync('blog-articles.json.debug', jsonText);
}
