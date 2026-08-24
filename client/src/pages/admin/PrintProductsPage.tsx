// The print products a studio sells, with a home of their own.
//
// This catalogue used to live at the bottom of Settings → Print Fulfilment, behind an API
// key form. That is the wrong shelf for it twice over: a studio sells from this list, so
// it belongs beside the other things they sell rather than beside credentials, and it put
// four steps of setup in front of a feature nobody had been shown yet. print_products has
// been empty since the feature shipped.
//
// So the shape of this screen is: show what is there, offer to stock it, and only raise
// the Prodigi account question at the point where it is actually anyone's business — the
// order. Reading and stocking cost nobody anything (see server/lib/prodigiAccount.ts);
// placing an order is the studio's own account, always.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Printer,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Plus,
  Search,
  PackagePlus,
  CheckCircle,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useStudioCurrency } from '../../hooks/useStudioCurrency';
import { formatCurrency } from '../../utils/currency';

interface PrintProduct {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  base_price: string | number | null;
  basePrice: number | null;
  cost: number | null;
  currency: string | null;
  width_inches: number | null;
  height_inches: number | null;
  is_active: boolean;
}

interface CatalogStatus {
  products: { total: number; active: number };
  currency: string;
  markupPercent: number;
  defaultMarkupPercent: number;
  maxMarkupPercent: number;
  starterCatalogue: { available: boolean };
  ordering: { ready: boolean; message?: string; settingsPath?: string };
}

/** Why the studio is being asked to connect an account, and where. Both come from the
 *  server so this screen and the refusal it will meet later cannot say different things. */
interface ConnectPrompt {
  message: string;
  settingsPath: string;
  /** True when an action was actually refused, rather than this being a standing state. */
  refused: boolean;
}

type Filter = 'all' | 'active' | 'hidden';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'On sale' },
  { id: 'hidden', label: 'Hidden' },
];

const PrintProductsPage: React.FC = () => {
  // The currency this studio trades in, read from studio_configs. Never a symbol written
  // into the JSX — a euro sign on an American studio's screen is a bug this project has
  // already paid for once.
  const { currency: studioCurrency } = useStudioCurrency();

  const [products, setProducts] = useState<PrintProduct[]>([]);
  const [status, setStatus] = useState<CatalogStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connect, setConnect] = useState<ConnectPrompt | null>(null);

  // An error and a note are kept apart on purpose. Painting good news in the same colour
  // as bad news teaches people to stop reading both.
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: 'good' | 'plain'; text: string } | null>(null);

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const [markupInput, setMarkupInput] = useState('');
  const [savingMarkup, setSavingMarkup] = useState(false);
  const [stocking, setStocking] = useState(false);

  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState<{ name: string; widthInches: number | null; heightInches: number | null } | null>(null);
  const [adding, setAdding] = useState(false);

  /**
   * Every call this page makes goes through here, so a 402 lands in exactly one place.
   *
   * The link is the one the SERVER sent. Spelling the settings path in the client is how
   * two screens end up pointing at two different pages, and one of them at a 404.
   */
  const request = useCallback(async (url: string, init?: RequestInit): Promise<any> => {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));

    if (res.status === 402 && data?.code === 'prodigi_account_required') {
      setConnect({
        message: data.message || 'Connect your own Prodigi account before selling prints.',
        settingsPath: data.settingsPath || '',
        refused: true,
      });
      throw new Error(data.message || 'That needs your own Prodigi account.');
    }
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.message || data?.error || `The server refused that (${res.status}).`);
    }
    return data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cat, st] = await Promise.all([
        request('/api/print/catalog'),
        request('/api/print/catalog/status'),
      ]);
      setProducts(Array.isArray(cat.products) ? cat.products : []);
      setStatus(st);
      setMarkupInput(String(st?.markupPercent ?? ''));
      // A standing "you have not connected an account" is the same fact the 402 carries,
      // learned earlier. Only overwrite a prompt that came from a real refusal if the
      // condition has since cleared.
      if (st?.ordering && st.ordering.ready === false) {
        setConnect((prev) => (prev?.refused ? prev : {
          message: st.ordering.message || '',
          settingsPath: st.ordering.settingsPath || '',
          refused: false,
        }));
      } else {
        setConnect(null);
      }
    } catch (e: any) {
      setError(e?.message || 'The print catalogue could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (filter === 'active' && !p.is_active) return false;
      if (filter === 'hidden' && p.is_active) return false;
      if (!q) return true;
      return `${p.name || ''} ${p.sku || ''} ${p.category || ''}`.toLowerCase().includes(q);
    });
  }, [products, filter, search]);

  const money = (amount: number | null, code: string | null) =>
    amount == null ? null : formatCurrency(amount, (code || studioCurrency || 'EUR').toUpperCase());

  const saveMarkup = async () => {
    setSavingMarkup(true); setError(null); setNote(null);
    try {
      const data = await request('/api/print/catalog/markup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markupPercent: markupInput }),
      });
      setStatus((prev) => (prev ? { ...prev, markupPercent: data.markupPercent } : prev));
      setMarkupInput(String(data.markupPercent));
      setNote({
        tone: 'good',
        text: `Saved. Anything you stock or import from now on is priced at cost plus ${data.markupPercent}%. Prices already in the table below are untouched — change those in the table.`,
      });
    } catch (e: any) {
      setError(e?.message || 'The markup could not be saved.');
    } finally {
      setSavingMarkup(false);
    }
  };

  const stockShop = async () => {
    setStocking(true); setError(null); setNote(null);
    try {
      const data = await request('/api/print/catalog/seed', { method: 'POST' });
      // Stocking never overwrites, so "nothing happened" is a normal outcome and gets
      // said plainly instead of being dressed up as a success.
      if (data.seeded > 0) {
        setNote({
          tone: 'good',
          text: `${data.seeded} product${data.seeded === 1 ? '' : 's'} added, priced at cost plus ${data.markupPercent}% in ${data.currency}. Every price below is yours to change.`,
        });
      } else {
        setNote({
          tone: 'plain',
          text: data.reason || 'Nothing was added, and nothing you had was changed.',
        });
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'The shop could not be stocked.');
    } finally {
      setStocking(false);
    }
  };

  const validateSku = async () => {
    const sku = newSku.trim();
    if (!sku) return;
    setValidating(true); setValidated(null); setError(null); setNote(null);
    try {
      const data = await request('/api/print/catalog/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku }),
      });
      setValidated({
        name: data.product?.name || sku,
        widthInches: data.product?.widthInches ?? null,
        heightInches: data.product?.heightInches ?? null,
      });
      if (!newName) setNewName(data.product?.name || '');
    } catch (e: any) {
      setError(e?.message || 'Prodigi did not recognise that SKU.');
    } finally {
      setValidating(false);
    }
  };

  const addProduct = async () => {
    const sku = newSku.trim();
    if (!sku) return;
    setAdding(true); setError(null); setNote(null);
    try {
      await request('/api/print/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku,
          name: newName.trim() || undefined,
          basePrice: newPrice.trim() ? parseFloat(newPrice) : undefined,
          currency: studioCurrency,
        }),
      });
      setNewSku(''); setNewName(''); setNewPrice(''); setValidated(null);
      setNote({ tone: 'good', text: `${sku} is in your catalogue.` });
      await load();
    } catch (e: any) {
      setError(e?.message || 'That product could not be added.');
    } finally {
      setAdding(false);
    }
  };

  const updateProduct = async (id: string, patch: Record<string, any>) => {
    setError(null);
    try {
      await request(`/api/print/catalog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      await load();
    } catch (e: any) {
      setError(e?.message || 'That change was not saved.');
    }
  };

  const removeProduct = async (p: PrintProduct) => {
    if (!window.confirm(`Remove ${p.name || p.sku} from your catalogue? Clients will no longer be able to order it.`)) return;
    setError(null);
    try {
      await request(`/api/print/catalog/${p.id}`, { method: 'DELETE' });
      setNote({ tone: 'plain', text: `${p.name || p.sku} is no longer in your catalogue.` });
      await load();
    } catch (e: any) {
      setError(e?.message || 'That product could not be removed.');
    }
  };

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500';
  const starterAvailable = status?.starterCatalogue?.available === true;
  const alreadyStocked = (status?.products?.total ?? products.length) > 0;

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1200px] mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Printer className="w-6 h-6 text-purple-600" />
              Print Products
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              What your clients can order from a gallery, what it costs you, and what you charge.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <Link
              to="/admin/settings/prodigi"
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" /> Prodigi account
            </Link>
          </div>
        </div>

        {/* Whose account places the order. Shown as a standing fact once the studio has
            not connected one, and again verbatim if a call is ever refused with a 402. */}
        {connect && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-base font-semibold text-amber-900">
              {connect.refused
                ? 'That needs your own Prodigi account'
                : 'Connect your Prodigi account before you sell'}
            </h2>
            {connect.message && (
              <p className="mt-1 text-sm text-amber-900/90 max-w-2xl">{connect.message}</p>
            )}
            <ul className="mt-3 space-y-1 text-sm text-amber-900/90 list-disc pl-5 max-w-2xl">
              <li>The lab bills your card, so the margin you set below is money you keep.</li>
              <li>The parcel goes out under your studio name, not ours.</li>
              <li>When a print arrives creased, Prodigi reprints it for you directly.</li>
            </ul>
            <p className="mt-3 text-sm text-amber-900/90 max-w-2xl">
              Browsing and pricing this catalogue needs nothing from you. Only the order does.
            </p>
            {connect.settingsPath ? (
              <Link
                to={connect.settingsPath}
                className="mt-4 inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700"
              >
                Connect Prodigi
              </Link>
            ) : null}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {note && (
          <div
            className={`mb-4 rounded-lg border p-4 text-sm flex gap-2 ${
              note.tone === 'good'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-gray-200 bg-gray-50 text-gray-700'
            }`}
          >
            {note.tone === 'good'
              ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              : <Info className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{note.text}</span>
          </div>
        )}

        {/* Margin + stocking. Both are about what a product costs and what it sells for,
            so they sit together rather than in two separate panels. */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-[260px]">
              <label className="block text-sm font-medium text-gray-900" htmlFor="markup">
                Your markup
              </label>
              <p className="mt-1 text-xs text-gray-600 max-w-md">
                Added to what the lab charges. 100% means you sell at double cost. Applied
                when you stock the shop or import a pricing sheet; prices already in the
                table stay as they are.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="markup"
                  type="number"
                  min={0}
                  max={status?.maxMarkupPercent ?? 1000}
                  step="1"
                  value={markupInput}
                  onChange={(e) => setMarkupInput(e.target.value)}
                  className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-sm text-gray-600">%</span>
                <button
                  type="button"
                  onClick={saveMarkup}
                  disabled={savingMarkup || markupInput.trim() === ''}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {savingMarkup ? 'Saving…' : 'Save markup'}
                </button>
              </div>
            </div>

            <div className="min-w-[280px] max-w-md">
              <div className="text-sm font-medium text-gray-900">Stock my shop</div>
              {starterAvailable ? (
                <>
                  <p className="mt-1 text-xs text-gray-600">
                    Copies the print products that ship with this build into your catalogue
                    and prices them at cost plus your markup, in {status?.currency || studioCurrency}.
                    It only fills an empty catalogue.
                  </p>
                  <button
                    type="button"
                    onClick={stockShop}
                    disabled={stocking || alreadyStocked}
                    className="mt-2 inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {stocking
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Stocking…</>
                      : <><PackagePlus className="w-4 h-4" /> Stock my shop</>}
                  </button>
                  {alreadyStocked && (
                    <p className="mt-2 text-xs text-gray-500">
                      You already have {status?.products?.total ?? products.length} product
                      {(status?.products?.total ?? products.length) === 1 ? '' : 's'}. Stocking
                      only fills an empty catalogue, so it would leave every one of them
                      exactly as it is.
                    </p>
                  )}
                </>
              ) : (
                // The honest version of this state. hasStarterCatalogue() is false because
                // server/data/starter-print-catalogue.json is not in this build — the
                // pricing sheet it is generated from has not been exported yet. A button
                // here would do nothing, and claiming products are waiting would be a lie.
                <p className="mt-1 text-xs text-gray-600">
                  No starter catalogue is in this build, so there is nothing to copy in. It
                  is generated from a Prodigi pricing sheet by whoever runs this install and
                  shipped in the next release. Until then, add the sizes you actually sell
                  by SKU below — six or seven is a real shop.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Add one product. Kept above the table because on day one the table is empty. */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
          <div className="text-sm font-medium text-gray-900">Add a product</div>
          <p className="mt-1 text-xs text-gray-600">
            Paste a Prodigi SKU, check it, then set what you charge. SKUs are listed in the{' '}
            <a
              href="https://www.prodigi.com/print-products/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Prodigi product catalogue
            </a>.
          </p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">Prodigi SKU</label>
              <div className="flex gap-1">
                <input
                  value={newSku}
                  onChange={(e) => { setNewSku(e.target.value); setValidated(null); }}
                  className={field}
                  placeholder="GLOBAL-FAP-A4"
                />
                <button
                  type="button"
                  onClick={validateSku}
                  disabled={validating || !newSku.trim()}
                  className="shrink-0 px-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  title="Check this SKU with Prodigi"
                >
                  {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">What clients see</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={field}
                placeholder={validated?.name || 'A4 fine art print'}
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Your price ({studioCurrency})
              </label>
              <input
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                className={field}
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-1">
              <button
                type="button"
                onClick={addProduct}
                disabled={adding || !newSku.trim()}
                className="w-full px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center disabled:opacity-50"
                title="Add to catalogue"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>
            {validated && (
              <div className="md:col-span-12 text-xs text-green-700">
                Prodigi has it: <strong>{validated.name}</strong>
                {validated.widthInches && validated.heightInches
                  ? ` — ${validated.widthInches}″ × ${validated.heightInches}″`
                  : ''}
              </div>
            )}
          </div>
        </div>

        {products.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs border transition ${
                  filter === f.id
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or SKU"
              className="ml-auto w-56 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        )}

        {loading ? (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your print products…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-dashed border-red-200 bg-red-50/40 p-10 text-center">
            <AlertCircle className="w-8 h-8 text-red-300 mx-auto" />
            <h2 className="mt-3 text-base font-semibold text-gray-900">
              Your print products could not be loaded
            </h2>
            <p className="mt-1 text-sm text-gray-600 max-w-md mx-auto">
              This is a problem reaching the server, not a sign that your shop is empty —
              nothing has been changed or lost.
            </p>
            <button
              type="button"
              onClick={load}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800"
            >
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <Printer className="w-8 h-8 text-gray-300 mx-auto" />
            <h2 className="mt-3 text-base font-semibold text-gray-900">
              Nothing is for sale yet
            </h2>
            {starterAvailable ? (
              <>
                <p className="mt-1 text-sm text-gray-600 max-w-md mx-auto">
                  Stock the shop and you get a full set of sizes, priced at cost plus your
                  markup, that you can edit or delete straight away. Clients then order them
                  from their gallery.
                </p>
                <button
                  type="button"
                  onClick={stockShop}
                  disabled={stocking}
                  className="mt-4 inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {stocking
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Stocking…</>
                    : <><PackagePlus className="w-4 h-4" /> Stock my shop</>}
                </button>
              </>
            ) : (
              <p className="mt-1 text-sm text-gray-600 max-w-lg mx-auto">
                No starter catalogue ships with this build, so there is nothing to stock the
                shop from yet. Add the sizes you actually sell with the form above — a SKU,
                a name your clients will recognise, and your price. Six or seven is a real
                shop; you do not need Prodigi's whole range.
              </p>
            )}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
            Nothing matches that. {products.length} product{products.length === 1 ? '' : 's'} in total.
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Product</th>
                    <th className="text-left font-medium px-4 py-3">SKU</th>
                    <th className="text-left font-medium px-4 py-3">Size</th>
                    <th className="text-right font-medium px-4 py-3">Costs you</th>
                    <th className="text-right font-medium px-4 py-3">You charge</th>
                    <th className="text-left font-medium px-4 py-3">Currency</th>
                    <th className="text-center font-medium px-4 py-3">On sale</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.map((p) => {
                    const code = (p.currency || studioCurrency || 'EUR').toUpperCase();
                    const size = p.width_inches && p.height_inches
                      ? `${p.width_inches}″ × ${p.height_inches}″`
                      : '—';
                    return (
                      <tr key={p.id} className={`hover:bg-gray-50/60 ${p.is_active ? '' : 'opacity-60'}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{p.name || p.sku}</div>
                          {p.category && (
                            <div className="text-xs text-gray-500 mt-0.5">{p.category}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{p.sku}</td>
                        <td className="px-4 py-3 text-gray-500">{size}</td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {/* Cost is only known for products that came from a pricing
                              sheet. A SKU typed in by hand has none, and inventing one
                              would be worse than an honest dash. */}
                          {money(p.cost, p.currency) || <span className="text-gray-400">Not known</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            defaultValue={p.basePrice != null ? String(p.basePrice) : ''}
                            type="number"
                            step="0.01"
                            min="0"
                            aria-label={`What you charge for ${p.name || p.sku}`}
                            onBlur={(e) => {
                              const v = e.target.value;
                              if (v === '') return;
                              const next = parseFloat(v);
                              if (!Number.isFinite(next) || next === p.basePrice) return;
                              updateProduct(p.id, { basePrice: next });
                            }}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-600">{code}</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={!!p.is_active}
                            aria-label={`Sell ${p.name || p.sku} in galleries`}
                            onChange={(e) => updateProduct(p.id, { isActive: e.target.checked })}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => removeProduct(p)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title={`Remove ${p.name || p.sku}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default PrintProductsPage;
