import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useLanguage } from '../../context/LanguageContext';

const QuestionnairesPageV2: React.FC = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  // Builder-specific state
  const [logoUrl, setLogoUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  // Responses UI state
  const [responses, setResponses] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [filterClientId, setFilterClientId] = useState('');
  const [filterQuestionnaireId, setFilterQuestionnaireId] = useState('');
  const [attachInputs, setAttachInputs] = useState<Record<string, string>>({});
  const [clientOptions, setClientOptions] = useState<Record<string, any[]>>({});
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const [openSearchId, setOpenSearchId] = useState<string | null>(null);
  const [highlightIdx, setHighlightIdx] = useState<Record<string, number>>({});
  const searchTimeoutsRef = useRef<Record<string, any>>({});
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [searchLoading, setSearchLoading] = useState<Record<string, boolean>>({});
  // Client picker for link creation
  const [linkClientSearch, setLinkClientSearch] = useState('');
  const [linkClientResults, setLinkClientResults] = useState<any[]>([]);
  const [linkClientId, setLinkClientId] = useState<string | null>(null);
  const [linkClientName, setLinkClientName] = useState('');
  const [linkClientOpen, setLinkClientOpen] = useState(false);
  const linkClientRef = useRef<HTMLDivElement>(null);
  const linkSearchTimeout = useRef<any>(null);
  // Email template customization
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailFooter, setEmailFooter] = useState('');
  const [emailTemplateSaving, setEmailTemplateSaving] = useState(false);
  // Thank-you message customization
  const [thankYouMessage, setThankYouMessage] = useState('');
  const responsesRef = useRef<HTMLDivElement>(null);

  // Search clients for link creation
  const searchLinkClients = async (q: string) => {
    if (q.length < 2) { setLinkClientResults([]); return; }
    try {
      const res = await fetch(`/api/admin/clients/search?q=${encodeURIComponent(q)}&limit=6`);
      if (!res.ok) return;
      const data = await res.json();
      setLinkClientResults(data.clients || []);
    } catch {}
  };

  const debouncedLinkSearch = (q: string) => {
    if (linkSearchTimeout.current) clearTimeout(linkSearchTimeout.current);
    linkSearchTimeout.current = setTimeout(() => searchLinkClients(q), 250);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (linkClientRef.current && e.target instanceof Node && !linkClientRef.current.contains(e.target)) {
        setLinkClientOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreateQuestionnaireLink = async () => {
    try {
      setLoading(true);
      setError(null);

      const template = selectedSurveyId || 'default-questionnaire';
      const response = await fetch('/api/admin/create-questionnaire-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: linkClientId || 'anonymous', template_id: template }),
      });

      if (!response.ok) throw new Error('Failed to create questionnaire link');

      const data = await response.json();
      navigator.clipboard.writeText(data.link);
      const clientLabel = linkClientName || 'General (no client selected)';
      alert(`✅ Questionnaire link created and copied to clipboard!\n\nLink: ${data.link}\nClient: ${clientLabel}\n\nYou can now send this to your client via WhatsApp or email.`);
    } catch (err) {
      console.error('Error creating questionnaire link:', err);
      setError('Failed to create questionnaire link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load email template
  const loadEmailTemplate = async () => {
    try {
      const res = await fetch('/api/admin/questionnaire-email-template');
      if (!res.ok) return;
      const data = await res.json();
      setEmailSubject(data.subject || '');
      setEmailBody(data.body || '');
      setEmailFooter(data.footer || '');
    } catch {}
  };

  const saveEmailTemplate = async () => {
    try {
      setEmailTemplateSaving(true);
      const res = await fetch('/api/admin/questionnaire-email-template', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, body: emailBody, footer: emailFooter })
      });
      if (!res.ok) throw new Error('Save failed');
      alert('✅ Email template saved successfully!');
    } catch {
      alert('Failed to save email template.');
    } finally {
      setEmailTemplateSaving(false);
    }
  };

  // Build a label map from survey pages data (maps q1 -> actual question text)
  const buildLabelMap = (r: any): Record<string, string> => {
    const labelMap: Record<string, string> = {};
    try {
      const pages = r.survey_pages || [];
      const parsedPages = typeof pages === 'string' ? JSON.parse(pages) : pages;
      if (Array.isArray(parsedPages)) {
        for (const page of parsedPages) {
          for (const q of (page.questions || [])) {
            if (q.id && q.title) labelMap[q.id] = q.title;
          }
        }
      }
    } catch {}
    // Also try matching from loaded surveys state
    if (Object.keys(labelMap).length === 0 && r.template_slug) {
      const survey = surveys.find((s: any) => s.id === r.template_slug);
      if (survey) {
        try {
          const pages = survey.pages || [];
          for (const page of pages) {
            for (const q of (page.questions || [])) {
              if (q.id && (q.title || q.text)) labelMap[q.id] = q.title || q.text;
            }
          }
        } catch {}
      }
    }
    return labelMap;
  };

  // Get the display entries for a response (resolved labels, non-empty values)
  const getDisplayEntries = (r: any): [string, string][] => {
    // Prefer server-resolved answers (already has proper question labels as keys)
    if (r.resolved_answers && Object.keys(r.resolved_answers).length > 0) {
      return Object.entries(r.resolved_answers)
        .filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '') as [string, string][];
    }
    // Fallback: resolve labels client-side
    const answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : (r.answers || {});
    const labelMap = buildLabelMap(r);
    return Object.entries(answers)
      .filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '')
      .map(([key, val]) => {
        const label = labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        return [label, String(val)] as [string, string];
      });
  };

  // Build formatted HTML for a response (used by both View and Print)
  const buildResponseHtml = (r: any) => {
    const entries = getDisplayEntries(r);
    const safeClientName = (r.client_name || 'Unknown').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeClientEmail = (r.client_email || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const answersHtml = entries.map(([label, val]) => {
        const safeVal = String(val).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeLabel = label.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<tr><td style="padding:10px 14px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;width:40%;vertical-align:top;color:#374151;">${safeLabel}</td><td style="padding:10px 14px;border:1px solid #e5e7eb;color:#1f2937;">${safeVal}</td></tr>`;
      }).join('');
    return `
      <html><head><title>${r.questionnaire_title || 'Questionnaire Response'} - ${safeClientName}</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:800px;margin:0 auto;padding:40px 30px;color:#1f2937;background:#f3f4f6}
        .card{background:white;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden}
        .header{background:linear-gradient(135deg,#6C2BD9,#9D50BB);color:white;padding:24px 30px}
        .header h1{margin:0;font-size:22px;font-weight:600}
        .header .client-subtitle{margin:8px 0 0;font-size:16px;font-weight:400;opacity:0.95}
        .client-box{background:#f0fdf4;border-left:4px solid #22c55e;padding:16px 20px;margin:20px 24px}
        .client-name{font-size:20px;font-weight:700;color:#166534;margin:0 0 4px 0}
        .client-detail{color:#15803d;font-size:14px;margin:0}
        .meta{color:#6b7280;font-size:13px;padding:0 24px 12px}
        table{border-collapse:collapse;width:calc(100% - 48px);margin:0 24px 24px}
        .section-title{font-size:16px;font-weight:600;color:#374151;padding:16px 24px 8px;margin:0}
        @media print{body{padding:10px;background:white}.card{box-shadow:none}}
      </style>
      </head><body>
      <div class="card">
        <div class="header">
          <h1>${r.questionnaire_title || 'Questionnaire Response'}</h1>
          <p class="client-subtitle">Client: ${safeClientName}</p>
        </div>
        <div class="client-box">
          <p class="client-name">${safeClientName}</p>
          <p class="client-detail">Email: ${safeClientEmail} &bull; Submitted: ${new Date(r.submitted_at).toLocaleString()}</p>
        </div>
        <p class="section-title">Responses</p>
        <table>${answersHtml}</table>
      </div>
      </body></html>`;
  };

  // View a questionnaire response (formatted, no print dialog)
  const handleViewResponse = (r: any) => {
    const html = buildResponseHtml(r);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  };

  // Print a questionnaire response
  const handlePrintResponse = (r: any) => {
    const html = buildResponseHtml(r);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); w.print(); }
  };

  const handleViewResponses = async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
      if (filterClientId.trim()) params.set('client_id', filterClientId.trim());
      if (filterQuestionnaireId.trim()) params.set('questionnaire_id', filterQuestionnaireId.trim());
      const res = await fetch(`/api/admin/questionnaire-responses?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch responses');
      const data = await res.json();
      setResponses(data.responses || []);
      setTotal(data.total || 0);
      // Scroll to responses section
      setTimeout(() => { responsesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
    } catch (err) {
      console.error('Error fetching responses:', err);
      setError('Failed to fetch questionnaire responses.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (!confirm('Are you sure you want to delete this response? This cannot be undone.')) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/questionnaire-responses/${responseId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete response');
      setResponses(prev => prev.filter(r => r.id !== responseId));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error deleting response:', err);
      setError('Failed to delete response.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttach = async (responseId: string, explicitClientId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const clientId = (explicitClientId ?? attachInputs[responseId] ?? '').toString().trim();
      if (!clientId) {
        // Focus the search input and show client list
        const container = containerRefs.current[responseId];
        if (container) {
          const input = container.querySelector('input');
          if (input) { input.focus(); }
        }
        setOpenSearchId(responseId);
        debouncedSearch(responseId, '', 0);
        return;
      }
      const res = await fetch('/api/admin/attach-response-to-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_id: responseId, client_id: clientId })
      });
      if (!res.ok) throw new Error('Attach failed');
      await handleViewResponses();
    } catch (err) {
      console.error('Attach failed:', err);
      setError('Failed to attach response to client.');
    } finally {
      setLoading(false);
    }
  };

  const searchClients = async (responseId: string, q: string) => {
    try {
      const u = `/api/admin/clients/search?q=${encodeURIComponent(q)}&limit=20`;
      const res = await fetch(u);
      if (!res.ok) return;
      const data = await res.json();
      setClientOptions(prev => ({ ...prev, [responseId]: data.clients || [] }));
      setHighlightIdx(prev => ({ ...prev, [responseId]: (data.clients && data.clients.length > 0) ? 0 : -1 }));
    } catch {}
    finally {
      setSearchLoading(prev => ({ ...prev, [responseId]: false }));
    }
  };

  const debouncedSearch = (responseId: string, q: string, delay = 250) => {
    if (searchTimeoutsRef.current[responseId]) clearTimeout(searchTimeoutsRef.current[responseId]);
    setSearchLoading(prev => ({ ...prev, [responseId]: true }));
    searchTimeoutsRef.current[responseId] = setTimeout(() => {
      searchClients(responseId, q);
    }, delay);
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const openId = openSearchId;
      if (!openId) return;
      const container = containerRefs.current[openId];
      if (container && e.target instanceof Node && !container.contains(e.target)) {
        setClientOptions(prev => ({ ...prev, [openId]: [] }));
        setOpenSearchId(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openSearchId]);

  // Load available questionnaires (surveys)
  const fetchSurveys = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/surveys');
      if (!res.ok) throw new Error('Failed to load surveys');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.surveys || []);
      setSurveys(list);
      if (list.length > 0 && !selectedSurveyId) setSelectedSurveyId(list[0].id);
    } catch (err) {
      console.error('Error loading surveys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  // Auto-load latest responses on initial mount
  useEffect(() => {
    handleViewResponses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddClick = () => {
    setIsAdding(true);
    setEditingId(null);
    setFormTitle('New Questionnaire');
    setFormDescription('');
    setLogoUrl('');
    setQuestions(['']);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormTitle('');
    setFormDescription('');
    setLogoUrl('');
    setQuestions([]);
    setThankYouMessage('');
  };

  const handleSaveNew = async () => {
    try {
      setLoading(true);
      // Build survey payload with pages and settings — all questions are required by default
      const pages = [
        {
          id: 'page-1',
          title: formTitle,
          questions: questions.map((q, idx) => ({ id: `q${idx+1}`, type: 'text', title: q, required: true }))
        }
      ];

      const settings: any = { logo: logoUrl };
      if (thankYouMessage.trim()) settings.thankYouMessage = thankYouMessage.trim();
      const body = { title: formTitle, description: formDescription, pages, settings };
      const res = await fetch('/api/surveys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed to create survey');
      const result = await res.json();
      const newSurvey = result.survey || result;
      setSurveys(prev => [newSurvey, ...prev]);
      handleCancel();
    } catch (err) {
      console.error('Error creating survey:', err);
      alert('Failed to create questionnaire.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (survey: any) => {
    setEditingId(survey.id);
    setIsAdding(false);
    setFormTitle(survey.title || '');
    setFormDescription(survey.description || '');
    // Load existing builder state if available
    try {
      const pages = survey.pages || (survey.survey && survey.survey.pages) || [];
      const first = pages[0] || { questions: [] };
      setQuestions((first.questions || []).map((qq: any) => qq.title || qq.text || ''));
    } catch (e) {
      setQuestions([]);
    }
    setLogoUrl((survey.settings && survey.settings.logo) || '');
    setThankYouMessage((survey.settings && survey.settings.thankYouMessage) || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      setLoading(true);
      const pages = [
        {
          id: 'page-1',
          title: formTitle,
          questions: questions.map((q, idx) => ({ id: `q${idx+1}`, type: 'text', title: q, required: true }))
        }
      ];
      // Keep the thank-you message on edit — settings is written wholesale, so leaving
      // it out here silently wiped the message the studio set when creating the form.
      const settings: any = { logo: logoUrl };
      if (thankYouMessage.trim()) settings.thankYouMessage = thankYouMessage.trim();
      const body = { title: formTitle, description: formDescription, pages, settings };
      const res = await fetch(`/api/surveys/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed to update survey');
      const result = await res.json();
      const updated = result.survey || result;
      setSurveys(prev => prev.map(s => s.id === editingId ? { ...s, ...updated } : s));
      handleCancel();
    } catch (err) {
      console.error('Error updating survey:', err);
      alert('Failed to save questionnaire changes.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (surveyId: string) => {
    if (!confirm('Are you sure you want to delete this questionnaire?')) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/surveys/${surveyId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete survey');
      setSurveys(prev => prev.filter(s => s.id !== surveyId));
    } catch (err) {
      console.error('Error deleting survey:', err);
      alert('Failed to delete questionnaire.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo file must be under 5 MB.');
      return;
    }
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const url = data.url || data.imageUrl || data.publicUrl || '';
      if (url) {
        setLogoUrl(url);
      } else {
        throw new Error('No URL returned from upload');
      }
    } catch (err) {
      console.error('Logo upload error:', err);
      alert('Failed to upload logo. Please try again or paste a URL instead.');
    } finally {
      setLogoUploading(false);
      if (logoFileRef.current) logoFileRef.current.value = '';
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Questionnaires</h1>
          <p className="mt-2 text-gray-600">Create and manage client surveys and questionnaires</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors">
              <div className="text-blue-600 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Create Questionnaire Link</h3>
              <p className="text-gray-500 mb-2">Select a questionnaire to generate a shareable link</p>
              {/* Client search for link creation (optional) */}
              <div className="mb-3 relative text-left" ref={linkClientRef}>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client <span className="text-gray-400">(optional)</span></label>
                <input
                  value={linkClientSearch}
                  onChange={(e) => { setLinkClientSearch(e.target.value); setLinkClientId(null); setLinkClientName(''); setLinkClientOpen(true); debouncedLinkSearch(e.target.value); }}
                  onFocus={() => { if (linkClientSearch.length >= 2) { setLinkClientOpen(true); debouncedLinkSearch(linkClientSearch); } }}
                  placeholder="Search client by name or email..."
                  className="w-full border rounded px-2 py-1 text-sm"
                />
                {linkClientOpen && linkClientResults.length > 0 && (
                  <div className="absolute z-20 w-full bg-white border rounded shadow max-h-48 overflow-auto mt-1">
                    {linkClientResults.map((c) => (
                      <button key={c.id} type="button" className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                        onClick={() => { setLinkClientId(c.id); const name = [c.first_name, c.last_name].filter(Boolean).join(' '); setLinkClientName(name); setLinkClientSearch(name + (c.email ? ` (${c.email})` : '')); setLinkClientOpen(false); setLinkClientResults([]); }}>
                        <div className="font-medium">{[c.first_name, c.last_name].filter(Boolean).join(' ')}</div>
                        <div className="text-xs text-gray-500">{c.email}</div>
                      </button>
                    ))}
                  </div>
                )}
                {linkClientId && <p className="text-xs text-green-600 mt-1">✓ {linkClientName} selected</p>}
              </div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Questionnaire</label>
                <select value={selectedSurveyId || ''} onChange={e => setSelectedSurveyId(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                  {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              <button onClick={handleCreateQuestionnaireLink} disabled={loading || !selectedSurveyId} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Link'}
              </button>
            </div>

            <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 transition-colors">
              <div className="text-purple-600 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">View Responses</h3>
              <p className="text-gray-500 mb-4">Check submitted questionnaire responses from clients</p>
              <button onClick={handleViewResponses} disabled={loading} className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50">
                {loading ? 'Loading...' : 'View Responses'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">How to use questionnaires:</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1. Create Link:</strong> Click "Create Link" to generate a shareable questionnaire link</p>
            <p><strong>2. Share:</strong> Send the copied link to your client via WhatsApp, email, or SMS</p>
            <p><strong>3. Client Completes:</strong> Client clicks the link and fills out the questionnaire</p>
            <p><strong>4. View Responses:</strong> Click "View Responses" to see all submitted questionnaires</p>
            <p><strong>5. Email Notifications:</strong> You'll receive an email when a client submits a questionnaire</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Available Questionnaires:</h3>
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={handleAddClick} className="mr-2 inline-flex items-center px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Add Questionnaire</button>
              {(isAdding || editingId) && (
                <>
                  <button onClick={() => { if (editingId) { handleSaveEdit(); } else { handleSaveNew(); } }} disabled={loading} className="mr-2 inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700">{editingId ? 'Save' : 'Save'}</button>
                  <button onClick={handleCancel} className="inline-flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancel</button>
                </>
              )}
            </div>

            {(isAdding || editingId) && (
              <div className="p-4 bg-white border rounded">
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input value={formTitle} onChange={e => setFormTitle(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" />
                <label className="block text-sm font-medium text-gray-700 mt-3">Description</label>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" rows={3} />
                <label className="block text-sm font-medium text-gray-700 mt-3">Company Logo</label>
                <div className="mt-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={logoFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoFileRef.current?.click()}
                      disabled={logoUploading}
                      className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {logoUploading ? 'Uploading...' : 'Upload Logo'}
                    </button>
                    <span className="text-xs text-gray-500">or paste a URL below</span>
                  </div>
                  <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" className="block w-full border rounded px-2 py-1" />
                  {logoUrl && (
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded border">
                      <img src={logoUrl} alt="Logo preview" className="h-10 max-w-[160px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <button type="button" onClick={() => setLogoUrl('')} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Questions</label>
                    <button onClick={() => setQuestions(prev => [...prev, ''])} className="inline-flex items-center px-2 py-1 bg-blue-500 text-white rounded text-sm">Add Question</button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {questions.map((q, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <textarea value={q} onChange={e => setQuestions(prev => prev.map((x,i) => i===idx?e.target.value:x))} className="flex-1 border rounded px-2 py-1" rows={2} />
                        <div className="flex flex-col space-y-2">
                          <button onClick={() => setQuestions(prev => prev.filter((_,i)=>i!==idx))} className="inline-flex items-center px-2 py-1 bg-red-500 text-white rounded text-sm">Remove</button>
                          <button onClick={() => setQuestions(prev => { const arr=[...prev]; arr.splice(idx,1,prev[idx]+' '); return arr; })} className="inline-flex items-center px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm">Duplicate</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="block text-sm font-medium text-gray-700 mt-4">Thank-You Message <span className="text-gray-400 font-normal">(shown after submission)</span></label>
                <textarea value={thankYouMessage} onChange={e => setThankYouMessage(e.target.value)} placeholder="Thank you for completing our questionnaire! We'll be in touch with you soon." className="mt-1 block w-full border rounded px-2 py-1" rows={2} />
              </div>
            )}

            <div className="space-y-2">
              {surveys.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div>
                    <p className="font-medium">{s.title}</p>
                    <p className="text-sm text-gray-500">{s.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleEditClick(s)} className="inline-flex items-center px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600">Edit</button>
                    <button onClick={() => handleDelete(s.id)} className="inline-flex items-center px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600">Delete</button>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">{s.status || 'Active'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Responses filters */}
        <div ref={responsesRef} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Client Filter</label>
              <input value={filterClientId} onChange={(e) => setFilterClientId(e.target.value)} placeholder="client_id or CRM id" className="mt-1 w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Questionnaire</label>
              <select value={filterQuestionnaireId} onChange={(e) => setFilterQuestionnaireId(e.target.value)} className="mt-1 w-full border rounded px-3 py-2">
                <option value="">All</option>
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>{s.title || s.id}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setPage(1); handleViewResponses(); }} className="px-4 py-2 bg-indigo-600 text-white rounded">Apply</button>
              <button onClick={() => { setFilterClientId(''); setFilterQuestionnaireId(''); setPage(1); handleViewResponses(); }} className="px-4 py-2 bg-gray-200 rounded">Reset</button>
            </div>
          </div>
        </div>

        {/* Responses list */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Responses</h3>
            <div className="space-x-2">
              <button onClick={() => { if (page > 1) { setPage(page - 1); handleViewResponses(); } }} disabled={page === 1 || loading} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Prev</button>
              <button onClick={() => { setPage(page + 1); handleViewResponses(); }} disabled={(page * pageSize) >= total || loading} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Next</button>
            </div>
          </div>
          {responses.length === 0 ? (
            <p className="text-gray-500">No responses yet.</p>
          ) : (
            <div className="divide-y">
              {responses.map((r) => {
                const displayEntries = getDisplayEntries(r);
                return (
                <div key={r.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-lg">{r.client_name || 'Unknown Client'}</p>
                      <p className="text-sm text-gray-500">{r.client_email && r.client_email !== '-' ? `${r.client_email} • ` : ''}{new Date(r.submitted_at).toLocaleString()}</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{r.questionnaire_title || 'Questionnaire'}</span>
                  </div>
                  {displayEntries.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-blue-600 font-medium hover:text-blue-800">View answers ({displayEntries.length} fields)</summary>
                      <div className="mt-2 bg-gray-50 rounded-lg p-4 divide-y divide-gray-200">
                        {displayEntries.map(([label, val], idx) => (
                            <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                              <p className="text-sm font-semibold text-gray-800 leading-snug">{label}</p>
                              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap break-words">
                                {val && String(val).trim() ? val : '—'}
                              </p>
                            </div>
                          ))}
                      </div>
                    </details>
                  )}
                  <div className="mt-3 flex gap-2 items-end">
                    <div className="flex-1 relative" ref={(el) => { containerRefs.current[r.id] = el; }}>
                      <label className="block text-xs text-gray-600">Attach to Client</label>
                      <input
                        className="mt-1 w-full border rounded px-3 py-1"
                        placeholder="Search name or email (Client will be linked by ID)"
                        value={attachInputs[r.id] ?? ''}
                        onChange={(e) => { const v = e.target.value; setAttachInputs(prev => ({ ...prev, [r.id]: v })); setOpenSearchId(r.id); debouncedSearch(r.id, v); }}
                        onFocus={() => { setOpenSearchId(r.id); debouncedSearch(r.id, attachInputs[r.id] ?? '', 0); }}
                        onKeyDown={(e) => {
                          const opts = clientOptions[r.id] || [];
                          const idx = highlightIdx[r.id] ?? -1;
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (opts.length > 0) setHighlightIdx(prev => ({ ...prev, [r.id]: Math.min((idx < 0 ? 0 : idx + 1), opts.length - 1) }));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (opts.length > 0) setHighlightIdx(prev => ({ ...prev, [r.id]: Math.max((idx < 0 ? 0 : idx - 1), 0) }));
                          } else if (e.key === 'Enter') {
                            if (opts.length > 0 && idx >= 0) {
                              e.preventDefault();
                              const c = opts[idx];
                              setAttachInputs(prev => ({ ...prev, [r.id]: (c.client_id || c.id) }));
                              setClientOptions(prev => ({ ...prev, [r.id]: [] }));
                              setOpenSearchId(null);
                              // Auto-attach on Enter selection
                              handleAttach(r.id, (c.client_id || c.id));
                            }
                          } else if (e.key === 'Escape') {
                            setClientOptions(prev => ({ ...prev, [r.id]: [] }));
                            setOpenSearchId(null);
                          }
                        }}
                      />
                      {searchLoading[r.id] && (
                        <div className="absolute right-2 top-2.5 h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" aria-label="loading"></div>
                      )}
                      {(clientOptions[r.id]?.length ?? 0) > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-64 overflow-auto">
                          {clientOptions[r.id]!.map((c, i) => {
                            const active = (highlightIdx[r.id] ?? -1) === i;
                            return (
                              <button key={c.id}
                                type="button"
                                className={`w-full text-left px-3 py-2 ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                onMouseEnter={() => setHighlightIdx(prev => ({ ...prev, [r.id]: i }))}
                                onClick={() => { setAttachInputs(prev => ({ ...prev, [r.id]: ([c.first_name, c.last_name].filter(Boolean).join(' ') || c.client_id || c.id) })); setClientOptions(prev => ({ ...prev, [r.id]: [] })); setOpenSearchId(null); handleAttach(r.id, (c.client_id || c.id)); }}
                              >
                                <div className="text-sm font-medium">{[c.first_name, c.last_name].filter(Boolean).join(' ') || c.client_id || c.id}</div>
                                <div className="text-xs text-gray-500">{c.email}</div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <button onClick={() => handleAttach(r.id)} className="px-3 py-2 bg-green-600 text-white rounded" disabled={loading}>Attach</button>
                    <button onClick={() => handleViewResponse(r)} className="px-3 py-2 bg-purple-600 text-white rounded" title="View formatted response">View</button>
                    <button onClick={() => handlePrintResponse(r)} className="px-3 py-2 bg-blue-500 text-white rounded" title="Print response">Print</button>
                    <button onClick={() => handleDeleteResponse(r.id)} className="px-3 py-2 bg-red-500 text-white rounded" disabled={loading}>Delete</button>
                    <button onClick={() => setOpenDetailId(openDetailId === r.id ? null : r.id)} className="px-3 py-2 bg-gray-200 rounded">Details</button>
                  </div>
                  {openDetailId === r.id && (
                    <div className="mt-3 p-3 border rounded bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-500">Response ID:</span> {r.id}</div>
                        <div><span className="text-gray-500">Token:</span> {r.token}</div>
                        <div><span className="text-gray-500">Client ID:</span> {r.client_id || '-'}</div>
                        <div><span className="text-gray-500">Client Email:</span> {r.client_email || '-'}</div>
                        <div><span className="text-gray-500">Questionnaire:</span> {r.questionnaire_title || '-'}</div>
                        <div><span className="text-gray-500">Submitted:</span> {new Date(r.submitted_at).toLocaleString()}</div>
                      </div>
                    </div>
                  )}
                  {/* duplicate attach input removed; typeahead above handles attach */}
                </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 text-sm text-gray-600">Page {page} • Total {total}</div>
        </div>

        {/* Confirmation Email Template Customization */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Confirmation Email Template</h3>
            <button
              onClick={() => { if (!showEmailTemplate) loadEmailTemplate(); setShowEmailTemplate(!showEmailTemplate); }}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              {showEmailTemplate ? 'Hide' : 'Customize'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-2">Customise the confirmation email sent to clients after they submit a questionnaire.</p>
          {showEmailTemplate && (
            <div className="space-y-4 border-t pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                <strong>Available placeholders:</strong> {'{{clientName}}'} {'{{studioName}}'} {'{{siteUrl}}'}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="e.g. Thank you for completing your questionnaire" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Body</label>
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={10} className="mt-1 block w-full border rounded px-3 py-2 font-mono text-sm" placeholder="Email body with {{clientName}} etc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Footer</label>
                <input value={emailFooter} onChange={e => setEmailFooter(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="e.g. {{studioName}} • {{siteUrl}}" />
              </div>
              <div className="flex justify-end">
                <button onClick={saveEmailTemplate} disabled={emailTemplateSaving} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
                  {emailTemplateSaving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default QuestionnairesPageV2;
