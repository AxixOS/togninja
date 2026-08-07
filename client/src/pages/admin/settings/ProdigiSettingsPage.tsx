import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Printer, Save, AlertCircle, CheckCircle, FlaskConical, Plus, Trash2, Search } from 'lucide-react';

interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  base_price: string | number | null;
  basePrice: number | null;
  currency: string | null;
  width_inches: number | null;
  height_inches: number | null;
  is_active: boolean;
}

/**
 * Prodigi print-fulfilment settings. Each studio brings its OWN Prodigi API key
 * (from the Prodigi dashboard) and chooses sandbox vs production. Reads/saves via
 * GET/POST /api/setup/technical/current | /prodigi | /test/prodigi — the same
 * per-tenant integration plumbing every other credential uses. The key is stored
 * encrypted and never returned to the client (only an "is set" flag).
 */
interface ProdigiState {
  apiKey: string;        // blank unless changing
  apiKeySet: boolean;    // whether a key is already stored
  environment: string;   // sandbox | production
}

const ProdigiSettingsPage: React.FC = () => {
  const [s, setS] = useState<ProdigiState>({ apiKey: '', apiKeySet: false, environment: 'sandbox' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Catalogue state
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCurrency, setNewCurrency] = useState('EUR');
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState<{ name: string; widthInches: number | null; heightInches: number | null } | null>(null);
  const [adding, setAdding] = useState(false);

  const loadCatalog = async () => {
    try {
      const res = await fetch('/api/print/catalog');
      if (res.ok) setProducts((await res.json()).products || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/setup/technical/current');
        if (res.ok) {
          const data = await res.json();
          const p = data.prodigi || {};
          setS(prev => ({ ...prev, apiKeySet: !!p.apiKeySet, environment: p.environment || 'sandbox' }));
        }
      } catch { /* keep defaults */ } finally { setIsLoading(false); }
      loadCatalog();
    })();
  }, []);

  const handleValidateSku = async () => {
    const sku = newSku.trim();
    if (!sku) return;
    setValidating(true); setValidated(null); setMessage(null);
    try {
      const res = await fetch('/api/print/catalog/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setValidated({ name: data.product.name, widthInches: data.product.widthInches, heightInches: data.product.heightInches });
        if (!newName) setNewName(data.product.name || '');
      } else {
        throw new Error(data.error || 'Prodigi could not find that SKU.');
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'SKU validation failed.' });
    } finally { setValidating(false); }
  };

  const handleAddProduct = async () => {
    const sku = newSku.trim();
    if (!sku) return;
    setAdding(true); setMessage(null);
    try {
      const res = await fetch('/api/print/catalog', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, name: newName.trim() || undefined, basePrice: newPrice ? parseFloat(newPrice) : undefined, currency: newCurrency }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not add product.');
      setNewSku(''); setNewName(''); setNewPrice(''); setValidated(null);
      setMessage({ type: 'success', text: 'Product added to your catalogue.' });
      loadCatalog();
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not add product.' });
    } finally { setAdding(false); }
  };

  const handleUpdateProduct = async (id: string, patch: any) => {
    try {
      await fetch(`/api/print/catalog/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
      });
      loadCatalog();
    } catch { /* ignore */ }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Remove this product from your catalogue?')) return;
    try {
      await fetch(`/api/print/catalog/${id}`, { method: 'DELETE' });
      loadCatalog();
    } catch { /* ignore */ }
  };

  const handleSave = async () => {
    setIsSaving(true); setMessage(null);
    try {
      const body: any = { environment: s.environment };
      if (s.apiKey) body.apiKey = s.apiKey; // only send if changing
      const res = await fetch('/api/setup/technical/prodigi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      setMessage({ type: 'success', text: 'Prodigi settings saved. Print ordering will use this key.' });
      if (s.apiKey) setS(prev => ({ ...prev, apiKey: '', apiKeySet: true }));
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not save Prodigi settings.' });
    } finally { setIsSaving(false); }
  };

  const handleTest = async () => {
    setIsTesting(true); setMessage(null);
    try {
      const body: any = { environment: s.environment };
      if (s.apiKey) body.apiKey = s.apiKey; // test the typed key if present, else the saved one
      const res = await fetch('/api/setup/technical/test/prodigi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        setMessage({ type: 'success', text: data.message || 'Prodigi key verified.' });
      } else {
        throw new Error(data.error || 'Prodigi test failed.');
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `${e?.message || 'Prodigi test failed.'} (Tip: enter the key to test; a saved key is not re-sent.)` });
    } finally { setIsTesting(false); }
  };

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500';

  if (isLoading) {
    return <AdminLayout><div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><Printer size={22} className="text-purple-600" /> Print Fulfilment (Prodigi)</h1>
            <p className="text-gray-600">Connect your own Prodigi account to sell + fulfil prints. Orders are placed on your Prodigi account.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={handleTest} disabled={isTesting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50">
              <FlaskConical size={16} className="mr-2" /> {isTesting ? 'Testing…' : 'Test Connection'}
            </button>
            <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50">
              <Save size={16} className="mr-2" /> {isSaving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>

        {message && (
          <div className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              {message.type === 'success' ? <CheckCircle size={20} className="text-green-600 mr-2" /> : <AlertCircle size={20} className="text-red-600 mr-2" />}
              <span className={`text-sm font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{message.text}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
            <select value={s.environment} onChange={e => setS(p => ({ ...p, environment: e.target.value }))} className={field}>
              <option value="sandbox">Sandbox (testing — no real prints)</option>
              <option value="production">Production (live orders)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Use Sandbox with a Prodigi sandbox key while testing; switch to Production to place real orders.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prodigi API Key</label>
            <input type="password" value={s.apiKey} onChange={e => setS(p => ({ ...p, apiKey: e.target.value }))} className={field} placeholder={s.apiKeySet ? '•••••••• (saved — leave blank to keep)' : 'Paste your Prodigi API key'} />
            <p className="text-xs text-gray-500 mt-1">Find this in your Prodigi dashboard under <em>Settings → API</em>. The key is stored encrypted.</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl text-sm text-blue-800 space-y-1">
          <p><strong>How it works:</strong> once connected, add the Prodigi products you want to sell (by SKU) in your print catalogue below, then place orders from an invoice — your client pays, and the order is sent to Prodigi automatically.</p>
          <p>Get product SKUs from the <a href="https://www.prodigi.com/print-products/" target="_blank" rel="noopener noreferrer" className="underline">Prodigi product catalogue</a> and API details from the <a href="https://www.prodigi.com/print-api/docs/reference/" target="_blank" rel="noopener noreferrer" className="underline">Prodigi API docs</a>.</p>
        </div>

        {/* Print catalogue */}
        <div className="bg-white rounded-lg shadow p-6 max-w-4xl space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Print Catalogue</h2>
            <p className="text-sm text-gray-600">Add the Prodigi products you sell. Enter a SKU, validate it against Prodigi, then set your own price.</p>
          </div>

          {/* Add row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-gray-50 rounded-lg p-3">
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Prodigi SKU</label>
              <div className="flex gap-1">
                <input value={newSku} onChange={e => { setNewSku(e.target.value); setValidated(null); }} className={field} placeholder="e.g. GLOBAL-FAP-A4" />
                <button onClick={handleValidateSku} disabled={validating || !newSku.trim()} className="shrink-0 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50" title="Validate SKU with Prodigi">
                  <Search size={16} />
                </button>
              </div>
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Display name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} className={field} placeholder={validated?.name || 'Product name'} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Your price</label>
              <input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" step="0.01" min="0" className={field} placeholder="0.00" />
            </div>
            <div className="md:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Cur.</label>
              <select value={newCurrency} onChange={e => setNewCurrency(e.target.value)} className={field}>
                <option>EUR</option><option>GBP</option><option>USD</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <button onClick={handleAddProduct} disabled={adding || !newSku.trim()} className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center disabled:opacity-50" title="Add to catalogue">
                <Plus size={18} />
              </button>
            </div>
            {validated && (
              <div className="md:col-span-12 text-xs text-green-700">
                ✓ Validated: <strong>{validated.name}</strong>
                {validated.widthInches && validated.heightInches ? ` — ${validated.widthInches}″ × ${validated.heightInches}″` : ''}
              </div>
            )}
          </div>

          {/* Catalogue list */}
          {products.length === 0 ? (
            <p className="text-sm text-gray-500">No products yet. Add your first Prodigi SKU above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-2">SKU</th>
                    <th className="py-2 pr-2">Name</th>
                    <th className="py-2 pr-2">Size</th>
                    <th className="py-2 pr-2">Price</th>
                    <th className="py-2 pr-2">Active</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-2 font-mono text-xs text-gray-700">{p.sku}</td>
                      <td className="py-2 pr-2">{p.name}</td>
                      <td className="py-2 pr-2 text-gray-500">{p.width_inches && p.height_inches ? `${p.width_inches}″×${p.height_inches}″` : '—'}</td>
                      <td className="py-2 pr-2">
                        <input
                          defaultValue={p.basePrice != null ? String(p.basePrice) : ''}
                          type="number" step="0.01" min="0"
                          onBlur={e => { const v = e.target.value; if (v !== '' && parseFloat(v) !== p.basePrice) handleUpdateProduct(p.id, { basePrice: parseFloat(v) }); }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded"
                        /> <span className="text-xs text-gray-500">{p.currency || 'EUR'}</span>
                      </td>
                      <td className="py-2 pr-2">
                        <input type="checkbox" checked={!!p.is_active} onChange={e => handleUpdateProduct(p.id, { isActive: e.target.checked })} />
                      </td>
                      <td className="py-2 text-right">
                        <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:text-red-700 p-1" title="Remove"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProdigiSettingsPage;
