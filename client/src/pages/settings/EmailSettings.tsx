import React, { useState } from 'react';
import { saveEmailSettings } from '../../api/email';

const EmailSettings: React.FC = () => {
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveEmailSettings({ smtpHost, smtpPort, smtpUser, smtpPass });
      alert('Settings saved');
    } catch (err) {
      alert('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Email Settings</h1>
      <label>SMTP Host</label>
      <input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} />
      <label>SMTP Port</label>
      <input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} />
      <label>SMTP Username</label>
      <input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} />
      <label>SMTP Password</label>
      <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} />
      <button onClick={handleSave} disabled={loading}>Save</button>
    </div>
  );
};

export default EmailSettings;
