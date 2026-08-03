// Posts a minimal questionnaire to production and prints the response
const fs = require('fs');
const url = process.env.APP_URL || 'https://clean-crm-photography-cf3af67a2afe.herokuapp.com';

(async () => {
  try {
    const payload = {
      title: 'Quick Test',
      description: 'Server e2e',
      notifyEmail: process.env.SMTP_FROM || 'test@example.com',
      fields: [
        { key: 'note', label: 'Note', type: 'text', required: true }
      ],
    };
    const res = await fetch(url + '/api/questionnaires', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error('post-questionnaire error:', e);
    process.exit(1);
  }
})();
