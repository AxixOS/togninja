import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Post-checkout landing (/bundle/thankyou?session_id=…). Claims the paid Stripe session
 * (verified server-side), then forwards to the customer's delivery page.
 */
const BundleThankYouPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId) { setError('Missing checkout session.'); return; }
    fetch('/api/bundle/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => { if (ok && d.token) navigate(`/deliver/${d.token}`, { replace: true }); else setError(d.error || 'Could not confirm your purchase.'); })
      .catch(() => setError('Could not confirm your purchase.'));
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: 'linear-gradient(135deg,#faf5ff,#eef2ff)', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 20px 60px -20px rgba(80,40,140,.35)', padding: '2rem', textAlign: 'center', maxWidth: 420 }}>
        {error ? (
          <>
            <div style={{ fontSize: '2.5rem' }}>⚠️</div>
            <h1 style={{ fontSize: 20, color: '#b91c1c', margin: '8px 0' }}>Something went wrong</h1>
            <p style={{ color: '#6b7280' }}>{error} If you were charged, contact support and we’ll sort it out right away.</p>
          </>
        ) : (
          <>
            <div style={{ width: 40, height: 40, border: '3px solid #ede9fe', borderTopColor: '#7c3aed', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
            <h1 style={{ fontSize: 20, margin: '0 0 6px' }}>Confirming your purchase…</h1>
            <p style={{ color: '#6b7280', margin: 0 }}>One moment — taking you to your bundle.</p>
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          </>
        )}
      </div>
    </div>
  );
};

export default BundleThankYouPage;
