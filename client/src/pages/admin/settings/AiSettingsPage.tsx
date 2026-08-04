import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { Sparkles, Save, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * AI provider keys (OpenAI + Anthropic). Reads GET /api/setup/technical/current
 * (extras block, secrets masked) and saves to POST /api/setup/technical/extras —
 * the same endpoint the onboarding ExtrasStep uses, which writes only the fields
 * provided (so secrets are only overwritten when a new value is typed).
 */
interface AiState {
  openaiApiKey: string; openaiKeySet: boolean;
  openaiAssistantId: string;
  anthropicApiKey: string; anthropicKeySet: boolean;
}

const AiSettingsPage: React.FC = () => {
  const [s, setS] = useState<AiState>({ openaiApiKey: '', openaiKeySet: false, openaiAssistantId: '', anthropicApiKey: '', anthropicKeySet: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/setup/technical/current');
        if (res.ok) {
          const ex = (await res.json()).extras || {};
          setS(prev => ({
            ...prev,
            openaiKeySet: !!ex.openaiKeySet,
            openaiAssistantId: ex.openaiAssistantId || '',
            anthropicKeySet: !!ex.anthropicKeySet,
          }));
        }
      } catch { /* keep defaults */ } finally { setIsLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    setIsSaving(true); setMessage(null);
    try {
      const body: any = { openaiAssistantId: s.openaiAssistantId };
      if (s.openaiApiKey) body.openaiApiKey = s.openaiApiKey;
      if (s.anthropicApiKey) body.anthropicApiKey = s.anthropicApiKey;
      const res = await fetch('/api/setup/technical/extras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      setMessage({ type: 'success', text: 'AI keys saved.' });
      setS(prev => ({ ...prev, openaiApiKey: '', anthropicApiKey: '', openaiKeySet: prev.openaiKeySet || !!prev.openaiApiKey, anthropicKeySet: prev.anthropicKeySet || !!prev.anthropicApiKey }));
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Could not save AI keys.' });
    } finally { setIsSaving(false); }
  };

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500';
  if (isLoading) return <AdminLayout><div className="flex items-center justify-center min-h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2"><Sparkles size={22} className="text-purple-600" /> AI &amp; API Keys</h1>
            <p className="text-gray-600">Keys for the AI assistant, blog writer, price research and homepage generation.</p>
          </div>
          <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50">
            <Save size={16} className="mr-2" /> {isSaving ? 'Saving…' : 'Save Settings'}
          </button>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">OpenAI API Key</label>
            <input type="password" value={s.openaiApiKey} onChange={e => setS(p => ({ ...p, openaiApiKey: e.target.value }))} className={field} placeholder={s.openaiKeySet ? '•••••••• (saved — leave blank to keep)' : 'sk-…'} />
            <p className="text-xs text-gray-500 mt-1">Powers the AI assistant, blog generation and homepage writer. From platform.openai.com/api-keys.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">OpenAI Assistant ID <span className="text-gray-400">(optional)</span></label>
            <input type="text" value={s.openaiAssistantId} onChange={e => setS(p => ({ ...p, openaiAssistantId: e.target.value }))} className={field} placeholder="asst_…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Anthropic API Key <span className="text-gray-400">(optional)</span></label>
            <input type="password" value={s.anthropicApiKey} onChange={e => setS(p => ({ ...p, anthropicApiKey: e.target.value }))} className={field} placeholder={s.anthropicKeySet ? '•••••••• (saved — leave blank to keep)' : 'sk-ant-…'} />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl text-sm text-blue-800">
          AI features are optional — without a key they simply fall back to non-AI defaults. Your key is stored encrypted and never shown again after saving.
        </div>
      </div>
    </AdminLayout>
  );
};

export default AiSettingsPage;
