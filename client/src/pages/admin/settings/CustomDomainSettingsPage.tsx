import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Server, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';

/**
 * Custom Domain guide. This app doesn't provision DNS (hosting is on the studio's own
 * Render account), so we show the exact records to add at their registrar. The CNAME
 * target is THIS instance's host (its *.onrender.com address). Apex/root domains need
 * the A-record values Render shows in the dashboard, so we link there.
 */
const CustomDomainSettingsPage: React.FC = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'your-service.onrender.com';
  const [domain, setDomain] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const cleanDomain = domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  const isApex = cleanDomain && cleanDomain.split('.').length <= 2;
  const sub = isApex ? 'www' : (cleanDomain.split('.')[0] || 'www');

  const copy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500); });
  };

  const verify = async () => {
    if (!cleanDomain) return;
    setChecking(true); setCheckResult(null);
    try {
      // Public DNS-over-HTTPS lookup (no backend needed) — checks the domain resolves.
      const r = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(cleanDomain)}&type=A`);
      const j = await r.json();
      const answers = (j.Answer || []).map((a: any) => a.data).join(', ');
      setCheckResult(answers ? `Resolves to: ${answers}. If that isn't your Render service yet, DNS may still be propagating (up to 24h).` : 'No DNS records found yet — add the records below and allow time to propagate.');
    } catch {
      setCheckResult('Could not check DNS right now.');
    } finally { setChecking(false); }
  };

  const Row = ({ id, type, name, value }: { id: string; type: string; name: string; value: string }) => (
    <div className="grid grid-cols-[80px_90px_1fr_auto] items-center gap-3 py-2 border-b last:border-0 text-sm">
      <span className="font-mono font-medium">{type}</span>
      <span className="font-mono text-gray-600">{name}</span>
      <span className="font-mono text-gray-900 break-all">{value}</span>
      <button onClick={() => copy(value, id)} className="text-gray-400 hover:text-purple-600" title="Copy">
        {copied === id ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
      </button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><Server size={22} className="text-purple-600" /> Custom Domain</h1>
          <p className="text-gray-600">Point your own domain at this studio. Add these records at your domain registrar.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your domain</label>
            <div className="flex gap-2">
              <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="www.yourstudio.com" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
              <button onClick={verify} disabled={!cleanDomain || checking} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2">
                {checking && <Loader2 size={14} className="animate-spin" />} Check DNS
              </button>
            </div>
            {checkResult && <p className="text-xs text-gray-600 mt-2">{checkResult}</p>}
          </div>

          {cleanDomain && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="text-sm font-medium text-gray-900 mb-2">Add at your registrar (GoDaddy, Namecheap, etc.):</p>
              {isApex ? (
                <>
                  <Row id="a" type="A" name="@" value="(Render's IP — shown in your Render dashboard)" />
                  <Row id="cw" type="CNAME" name="www" value={host} />
                  <p className="text-xs text-amber-700 mt-2">Root/apex domains need Render's A-record IPs (they're account-specific). Add the domain in Render first — it shows the exact IPs to use for <span className="font-mono">@</span>.</p>
                </>
              ) : (
                <Row id="cn" type="CNAME" name={sub} value={host} />
              )}
            </div>
          )}

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-2">
            <p className="font-medium">Two steps to go live:</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>In <strong>Render → this service → Settings → Custom Domains</strong>, add your domain. <a href="https://render.com/docs/custom-domains" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">Render guide <ExternalLink size={12} /></a></li>
              <li>At your registrar, add the record(s) above. Render verifies and issues HTTPS automatically (can take up to a few hours).</li>
            </ol>
            <p>Then set the address on the <Link to="/admin/settings/domain" className="underline font-medium">Domain &amp; URLs</Link> page so emails and links use it.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default CustomDomainSettingsPage;
