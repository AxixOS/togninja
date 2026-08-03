(async () => {
  try {
    const url = 'http://127.0.0.1:3000/api/debug/photography-sessions';
    const res = await fetch(url, { method: 'GET' });
    console.log('STATUS', res.status, res.statusText);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log('TYPE', Array.isArray(json) ? 'array' : typeof json, 'LEN', Array.isArray(json) ? json.length : undefined);
      console.log('SAMPLE', JSON.stringify((json && json.slice ? json.slice(0,3) : json), null, 2));
    } catch (e) {
      console.log('BODY (non-JSON):', text.slice(0,1000));
    }
  } catch (err) {
    console.error('FETCH ERROR:', err);
    process.exit(2);
  }
})();
