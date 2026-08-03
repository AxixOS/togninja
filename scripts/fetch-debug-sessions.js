import fetch from 'node-fetch';

(async () => {
  try {
    const res = await fetch('http://127.0.0.1:3000/api/debug/photography-sessions');
    const data = await res.json();
    console.log('status', res.status);
    console.log('count', Array.isArray(data) ? data.length : 0);
    console.log(JSON.stringify(data.slice(0,3), null, 2));
  } catch (e) {
    console.error('error', e.message);
  }
})();
