const fs = require('fs');
const data = fs.readFileSync('blog-articles.json', 'utf8');
try {
  const j = JSON.parse(data);
  console.log('JSON OK. Articles:', Array.isArray(j) ? j.length : 'not array');
} catch (e) {
  console.error('JSON invalid:', e.message);
  // Show nearby context for debug
  const posMatch = /position (\d+)/.exec(e.message);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    const start = Math.max(0, pos - 120);
    const end = Math.min(data.length, pos + 120);
    console.error('Context:', data.slice(start, end));
  }
}
