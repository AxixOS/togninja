import React, { useState } from 'react';

/**
 * Public bundle buy page (/bundle) — a simple front door that starts a Stripe Checkout for
 * the TogNinja + ShootCleaner package. Price/mode are configured server-side (env).
 */
const BundlePage: React.FC = () => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buy = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/bundle/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error || 'Checkout is not available yet.');
      window.location.href = d.url;
    } catch (e: any) { setError(e?.message || 'Checkout failed'); setBusy(false); }
  };

  const perks = [
    'Your own TogNinja CRM — leads, galleries, invoices, blog & website',
    'ShootCleaner desktop app — culling, enhancement, case studies',
    'Connected out of the box — cull in ShootCleaner, it flows into your CRM',
    'Guided setup and your own isolated instance',
  ];

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: 'linear-gradient(135deg,#faf5ff,#eef2ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}>
      <div style={{ maxWidth: 560, width: '100%', background: '#fff', borderRadius: 20, boxShadow: '0 24px 70px -24px rgba(80,40,140,.4)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)', color: '#fff', padding: '32px' }}>
          <div style={{ fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .85 }}>The all-in-one package</div>
          <h1 style={{ margin: '6px 0 0', fontSize: 30 }}>TogNinja + ShootCleaner</h1>
          <p style={{ margin: '8px 0 0', opacity: .92 }}>Your studio’s CRM and your editing app — sold together, connected together.</p>
        </div>
        <div style={{ padding: '28px 32px' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
            {perks.map((p) => (
              <li key={p} style={{ display: 'flex', gap: 10, padding: '8px 0', color: '#374151' }}>
                <span style={{ color: '#7c3aed', fontWeight: 700 }}>✓</span> {p}
              </li>
            ))}
          </ul>
          {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: 10, fontSize: 14, marginBottom: 16 }}>{error}</div>}
          <button onClick={buy} disabled={busy} style={{ width: '100%', background: '#7c3aed', color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: busy ? .6 : 1 }}>
            {busy ? 'Starting checkout…' : 'Get the bundle →'}
          </button>
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 12 }}>Secure checkout via Stripe. You’ll get your setup link and download right after payment.</p>
        </div>
      </div>
    </div>
  );
};

export default BundlePage;
