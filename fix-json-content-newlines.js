const fs = require('fs');

const path = 'blog-articles.json';
const src = fs.readFileSync(path, 'utf8');

function fixField(text, fieldName) {
  const re = new RegExp('("' + fieldName + '"\\s*:\\s*")([\\s\\S]*?)(")', 'g');
  return text.replace(re, (m, pre, body, post) => {
    const b2 = body.replace(/\r?\n/g, '\\n').replace(/"/g, '\\"');
    return pre + b2 + post;
  });
}

let fixed = src;
fixed = fixField(fixed, 'content');
fixed = fixField(fixed, 'excerpt');

try {
  JSON.parse(fixed);
  console.log('Fixed JSON is valid');
} catch (e) {
  console.error('Still invalid JSON:', e.message);
}

fs.writeFileSync(path + '.bak', src);
fs.writeFileSync(path, fixed);
console.log('Updated JSON written. Backup saved as blog-articles.json.bak');
