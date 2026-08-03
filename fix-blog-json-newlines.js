const fs = require('fs');

const path = 'blog-articles.json';
const src = fs.readFileSync(path, 'utf8');

// Replace raw newline characters inside quoted content/excerpt strings with escaped \n
function fixField(text, fieldName) {
  const re = new RegExp(`("${fieldName}"\\s*:\\s*")([\
\























console.log('Updated JSON written. Backup saved as blog-articles.json.bak');fs.writeFileSync(path, fixed);fs.writeFileSync(path + '.bak', src);}  console.error('Still invalid JSON:', e.message);} catch (e) {  console.log('Fixed JSON is valid');  JSON.parse(fixed);try {// Try to parse to ensure validityfixed = fixField(fixed, 'excerpt');fixed = fixField(fixed, 'content');let fixed = src;}  });    return pre + b2 + post;    const b2 = body.replace(/\r?\n/g, '\\n');  return text.replace(re, (m, pre, body, post) => {\\s\\S]*?)(")`, 'g');\