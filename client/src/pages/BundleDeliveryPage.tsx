import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Customer delivery page (/deliver/:token) — where the two apps are handed over together:
 * the studio's TogNinja setup link, the ShootCleaner download, and the baked-in connection
 * (instance URL + API key). Shown once the operator has provisioned the instance.
 */
const BundleDeliveryPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/bundle/deliver/${token}`).then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => setD(null)).finally(() => setLoading(false));
  }, [token]);

  const copy = (text: string, id: string) => { navigator.clipboard?.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500); }); };
  const ready = d && d.instanceUrl;

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>Loading…</div>;
  if (!d) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#6b7280' }}>This delivery link isn’t valid.</div>;

  const Field = ({ label, value, id }: { label: string; value: string; id: string }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input readOnly value={value} style={{ flex: 1, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontFamily: 'ui-monospace, monospace', fontSize: 13, background: '#f9fafb' }} />
        <button onClick={() => copy(value, id)} style={{ padding: '0 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600, color: copied === id ? '#16a34a' : '#374151' }}>{copied === id ? 'Copied' : 'Copy'}</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#faf5ff,#eef2ff)', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', padding: '48px 20px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px -20px rgba(80,40,140,.35)', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)', color: '#fff', padding: '28px 32px' }}>
            <div style={{ fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .85 }}>Your bundle</div>
            <h1 style={{ margin: '4px 0 0', fontSize: 26 }}>TogNinja&nbsp;+&nbsp;ShootCleaner</h1>
            {d.customerName && <p style={{ margin: '6px 0 0', opacity: .9 }}>Welcome, {d.customerName} 👋</p>}
          </div>

          <div style={{ padding: '28px 32px' }}>
            {!ready ? (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 18, color: '#92400e' }}>
                <strong>Payment received — we’re setting up your studio now.</strong>
                <p style={{ margin: '6px 0 0', fontSize: 14 }}>Your links will appear here shortly (usually within a few minutes), and we’ll email you when it’s live. You can bookmark this page and refresh.</p>
              </div>
            ) : (
              <>
                {/* 1. Open the CRM */}
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>1. Set up your CRM</h2>
                  <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 10px' }}>Your own TogNinja is ready. Open it and follow the quick setup wizard.</p>
                  <a href={d.setupUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', background: '#7c3aed', color: '#fff', padding: '11px 20px', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>Open my TogNinja setup →</a>
                </div>

                {/* 2. Download ShootCleaner */}
                {d.shootcleanerDownloadUrl && (
                  <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>2. Download ShootCleaner</h2>
                    <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 10px' }}>Install the desktop app for culling, enhancement and case studies.</p>
                    <a href={d.shootcleanerDownloadUrl} style={{ display: 'inline-block', background: '#111827', color: '#fff', padding: '11px 20px', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}>Download ShootCleaner</a>
                  </div>
                )}

                {/* 3. Connect */}
                <div>
                  <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>{d.shootcleanerDownloadUrl ? '3.' : '2.'} Connect the two</h2>
                  <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 12px' }}>In ShootCleaner → <strong>Connect TogNinja</strong>, paste these two values. That’s it — everything you cull flows into your CRM.</p>
                  <Field label="TogNinja studio URL" value={d.instanceUrl} id="url" />
                  {d.shootcleanerApiKey && <Field label="API key" value={d.shootcleanerApiKey} id="key" />}
                </div>
              </>
            )}
          </div>
        </div>
        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 18 }}>Need a hand? Reply to your welcome email and we’ll help you get set up.</p>
      </div>
    </div>
  );
};

export default BundleDeliveryPage;
