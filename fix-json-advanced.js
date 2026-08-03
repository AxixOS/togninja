const fs = require('fs');
const path = 'blog-articles.json';

// Read as binary to avoid Node's auto-conversion of newlines
const buffer = fs.readFileSync(path);
let text = buffer.toString('utf-8');

// Replace ALL raw newlines within JSON string values with \n
// This is a simple but effective approach: split on unescaped quote boundaries
// and process content/excerpt fields to escape newlines

// Split by articles to avoid edge cases with multi-line values
// Use a more robust replacement

function escapeNewlinesInValue(str) {
  // Replace raw newlines (LF and CRLF) with escaped \n sequences
  return str.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n').replace(/\r/g, '\\n');
}

// Parse as JSON array manually and reconstruct
try {
  const data = JSON.parse(text);
  console.log('Already valid JSON');
  process.exit(0);
} catch (e) {
  // Not valid; try to fix
  console.log('Fixing JSON...');
}

// Strategy: Use a regex to find and replace the content of "content" and "excerpt" fields
// This is complex in JSON, so let's use a different approach:
// Use a simple field-by-field substitution
text = text.replace(/"content":\s*"([^"\\]|\\.)*"/gs, function(match) {
  // This match is the full field; replace internal raw newlines
  const prefix = match.substring(0, match.indexOf(':') + 2);
  const value = match.substring(prefix.length);
  
  // Remove the quotes to get the inner value
  let inner = value.slice(1, -1);
  
  // Unescape existing escapes temporarily, then re-escape newlines
  inner = inner
    .replace(/\\n/g, '\n')   // convert escaped \n back to real newlines for clarity
    .replace(/\r\n/g, '\n')  // normalize CRLF to LF
    .replace(/\n/g, '\\n')   // re-escape all newlines
    .replace(/"/g, '\\"');    // escape any unescaped quotes
  
  return prefix + '"' + inner + '"';
});

text = text.replace(/"excerpt":\s*"([^"\\]|\\.)*"/gs, function(match) {
  const prefix = match.substring(0, match.indexOf(':') + 2);
  const value = match.substring(prefix.length);
  let inner = value.slice(1, -1);
  inner = inner
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');
  return prefix + '"' + inner + '"';
});

// Try to parse
try {
  JSON.parse(text);
  console.log('Fixed JSON is now valid');
  fs.writeFileSync(path, text);
  console.log('Written to', path);
} catch (e) {
  console.error('Still invalid:', e.message);
  // Save attempt for inspection
  fs.writeFileSync('blog-articles.json.attempt', text);
  console.log('Saved attempt to blog-articles.json.attempt');
}
