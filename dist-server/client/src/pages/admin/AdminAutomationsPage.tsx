import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useLanguage } from '../../context/LanguageContext';
import {
  Zap, Plus, Edit, Trash2, Play, Pause, Send, Clock, CalendarCheck,
  ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, Loader2,
  Mail, TestTube, Eye, Code
} from 'lucide-react';

interface Automation {
  id: number;
  name: string;
  description: string | null;
  triggerType: string;
  offsetHours: number;
  emailSubject: string;
  emailBodyHtml: string;
  questionnaireSlug: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AutomationLog {
  id: number;
  automationId: number;
  bookingId: string;
  clientEmail: string;
  clientName: string | null;
  status: string;
  errorMessage: string | null;
  sentAt: string;
}

const OFFSET_PRESETS_DE = [
  { label: '7 Tage vorher', value: -168 },
  { label: '3 Tage vorher', value: -72 },
  { label: '2 Tage vorher', value: -48 },
  { label: '1 Tag vorher', value: -24 },
  { label: '2 Stunden vorher', value: -2 },
  { label: '1 Stunde danach', value: 1 },
  { label: '2 Stunden danach', value: 2 },
  { label: '1 Tag danach', value: 24 },
  { label: '3 Tage danach', value: 72 },
  { label: '1 Woche danach', value: 168 },
];

const OFFSET_PRESETS_EN = [
  { label: '7 days before', value: -168 },
  { label: '3 days before', value: -72 },
  { label: '2 days before', value: -48 },
  { label: '1 day before', value: -24 },
  { label: '2 hours before', value: -2 },
  { label: '1 hour after', value: 1 },
  { label: '2 hours after', value: 2 },
  { label: '1 day after', value: 24 },
  { label: '3 days after', value: 72 },
  { label: '1 week after', value: 168 },
];

function formatOffset(hours: number, triggerType?: string, lang: string = 'de'): string {
  if (triggerType === 'newsletter_signup') {
    return lang === 'en' ? 'Immediately on newsletter signup' : 'Sofort bei Newsletter-Anmeldung';
  }
  const abs = Math.abs(hours);
  if (lang === 'en') {
    const direction = hours < 0 ? 'before' : 'after';
    const ref = 'the appointment';
    if (abs >= 168) return `${Math.round(abs / 168)} week(s) ${direction} ${ref}`;
    if (abs >= 24) return `${Math.round(abs / 24)} day(s) ${direction} ${ref}`;
    return `${abs} hour(s) ${direction} ${ref}`;
  }
  const direction = hours < 0 ? 'vor' : 'nach';
  if (abs >= 168) return `${Math.round(abs / 168)} Woche(n) ${direction} dem Termin`;
  if (abs >= 24) return `${Math.round(abs / 24)} Tag(e) ${direction} dem Termin`;
  return `${abs} Stunde(n) ${direction} dem Termin`;
}

const i18n: Record<string, Record<string, string>> = {
  en: {
    title: 'Email Automations',
    subtitle: 'Automatic emails for bookings & newsletter',
    newAutomation: 'New Automation',
    howItWorks: "How it works:",
    howItWorksText: "Booking automations send emails based on the date of confirmed bookings (checked every 30 min). Newsletter automations are sent immediately on signup. Placeholders:",
    active: 'Active',
    paused: 'Paused',
    questionnaire: 'Questionnaire',
    sendTestEmail: 'Send test email',
    pause: 'Pause',
    activate: 'Activate',
    edit: 'Edit',
    delete: 'Delete',
    showSentEmails: 'Show sent emails',
    sentEmails: 'Sent Emails',
    noEmailsSent: 'No emails sent yet',
    noAutomations: 'No automations created yet',
    createFirst: '+ Create first automation',
    editAutomation: 'Edit Automation',
    newAutomationTitle: 'New Automation',
    nameLabel: 'Name *',
    namePlaceholder: 'e.g. Pre-shoot questionnaire',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Short description of the purpose',
    triggerLabel: 'Trigger',
    triggerBefore: 'Before booking (appointment-based)',
    triggerAfter: 'After booking (appointment-based)',
    triggerNewsletter: 'Newsletter signup (immediate)',
    timingLabel: 'Timing',
    questionnaireSlugLabel: 'Questionnaire slug (optional)',
    subjectLabel: 'Email Subject *',
    subjectPlaceholder: 'Use {{clientName}}, {{bookingDate}}, {{bookingTime}}',
    bodyLabel: 'Email Body (HTML) *',
    bodyPlaceholder: 'HTML email content with {{clientName}}, {{bookingDate}}, {{bookingTime}}, {{questionnaireLink}}',
    placeholders: 'Placeholders:',
    enableNow: 'Enable automation immediately',
    cancel: 'Cancel',
    save: 'Save',
    create: 'Create',
    errorLoading: 'Error loading automations',
    errorSaving: 'Error saving',
    errorDeleting: 'Error deleting',
    errorToggle: 'Error changing status',
    errorTestSend: 'Error sending test email',
    testFailed: 'Test failed',
    testSent: 'Test email sent!',
    updated: 'Automation updated',
    created: 'Automation created',
    confirmDelete: 'Really delete this automation?',
    requiredFields: 'Name, subject and email body are required',
    preview: 'Preview',
    htmlCode: 'HTML Code',
    previewNote: 'This is how the email will look. Placeholders like {{clientName}} will be replaced with actual values when sent.',
    test: 'Test',
    logs: 'Logs',
  },
  de: {
    title: 'E-Mail-Automatisierungen',
    subtitle: 'Automatische E-Mails für Buchungen & Newsletter',
    newAutomation: 'Neue Automatisierung',
    howItWorks: "So funktioniert's:",
    howItWorksText: "Buchungs-Automatisierungen senden E-Mails basierend auf dem Datum bestätigter Buchungen (alle 30 Min geprüft). Newsletter-Automatisierungen werden sofort bei Anmeldung verschickt. Platzhalter:",
    active: 'Aktiv',
    paused: 'Pausiert',
    questionnaire: 'Fragebogen',
    sendTestEmail: 'Test-E-Mail senden',
    pause: 'Pausieren',
    activate: 'Aktivieren',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    showSentEmails: 'Gesendete E-Mails anzeigen',
    sentEmails: 'Gesendete E-Mails',
    noEmailsSent: 'Noch keine E-Mails gesendet',
    noAutomations: 'Noch keine Automatisierungen erstellt',
    createFirst: '+ Erste Automatisierung erstellen',
    editAutomation: 'Automatisierung bearbeiten',
    newAutomationTitle: 'Neue Automatisierung',
    nameLabel: 'Name *',
    namePlaceholder: 'z.B. Fragebogen vor dem Shooting',
    descriptionLabel: 'Beschreibung',
    descriptionPlaceholder: 'Kurze Beschreibung des Zwecks',
    triggerLabel: 'Auslöser',
    triggerBefore: 'Vor Buchung (Termin-basiert)',
    triggerAfter: 'Nach Buchung (Termin-basiert)',
    triggerNewsletter: 'Newsletter-Anmeldung (sofort)',
    timingLabel: 'Zeitpunkt',
    questionnaireSlugLabel: 'Fragebogen-Slug (optional)',
    subjectLabel: 'E-Mail-Betreff *',
    subjectPlaceholder: 'Verwenden Sie {{clientName}}, {{bookingDate}}, {{bookingTime}}',
    bodyLabel: 'E-Mail-Inhalt (HTML) *',
    bodyPlaceholder: 'HTML-E-Mail-Inhalt mit {{clientName}}, {{bookingDate}}, {{bookingTime}}, {{questionnaireLink}}',
    placeholders: 'Platzhalter:',
    enableNow: 'Automatisierung sofort aktivieren',
    cancel: 'Abbrechen',
    save: 'Speichern',
    create: 'Erstellen',
    errorLoading: 'Fehler beim Laden der Automatisierungen',
    errorSaving: 'Fehler beim Speichern',
    errorDeleting: 'Fehler beim Löschen',
    errorToggle: 'Fehler beim Ändern des Status',
    errorTestSend: 'Fehler beim Senden der Test-E-Mail',
    testFailed: 'Test fehlgeschlagen',
    testSent: 'Test-E-Mail gesendet!',
    updated: 'Automatisierung aktualisiert',
    created: 'Automatisierung erstellt',
    confirmDelete: 'Diese Automatisierung wirklich löschen?',
    requiredFields: 'Name, Betreff und E-Mail-Inhalt sind erforderlich',
    preview: 'Vorschau',
    htmlCode: 'HTML-Code',
    previewNote: 'So wird die E-Mail aussehen. Platzhalter wie {{clientName}} werden beim Versand durch echte Werte ersetzt.',
    test: 'Test',
    logs: 'Protokoll',
  }
};

// Client-side translations for DB-stored automation content (DE → EN)
const CONTENT_DE_TO_EN: Record<string, string> = {
  // Names
  'Fragebogen vor dem Shooting': 'Pre-Shoot Questionnaire',
  'Termin-Erinnerung': 'Appointment Reminder',
  'Newsletter Gutschein (50€)': 'Newsletter Voucher (€50)',
  'Bewertung & Qualitätskontrolle': 'Review & Quality Control',
  // Descriptions
  'Sendet einen Vorbereitungs-Fragebogen 7 Tage vor dem Termin': 'Sends a preparation questionnaire 7 days before the appointment',
  'Sendet eine Erinnerung 2 Tage vor dem Termin': 'Sends a reminder 2 days before the appointment',
  'Automatische E-Mail mit 50€ Gutschein bei Newsletter-Anmeldung auf der Website': 'Automatic email with €50 voucher on website newsletter signup',
  'Sendet eine Bitte um Bewertung 1 Stunde nach dem Termin': 'Sends a review request 1 hour after the appointment',
  // Email subjects
  'Ihr Fotoshooting naht – bitte füllen Sie unseren Kundenfragebogen aus!': 'Your photoshoot is coming – please fill out our client questionnaire!',
  'Erinnerung: Ihr Fotoshooting am {{bookingDate}}': 'Reminder: Your photoshoot on {{bookingDate}}',
  'Ihr 50€ Fotoshooting-Gutschein ist da!': 'Your €50 Photoshoot Voucher is here!',
  'Wie war Ihr Fotoshooting? Wir freuen uns auf Ihr Feedback! ⭐': 'How was your photoshoot? We\'d love your feedback! ⭐',
};

const AdminAutomationsPage: React.FC = () => {
  const { language } = useLanguage();
  const tx = (key: string) => (i18n[language] || i18n.en)[key] || (i18n.en)[key] || key;
  const OFFSET_PRESETS = language === 'en' ? OFFSET_PRESETS_EN : OFFSET_PRESETS_DE;

  // Translate DB content when EN is selected
  const tc = (text: string | null): string => {
    if (!text) return '';
    if (language === 'en' && CONTENT_DE_TO_EN[text]) return CONTENT_DE_TO_EN[text];
    return text;
  };
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<number | null>(null);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [testSending, setTestSending] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTriggerType, setFormTriggerType] = useState('before_booking');
  const [formOffsetHours, setFormOffsetHours] = useState(-48);
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formQuestionnaire, setFormQuestionnaire] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const fetchAutomations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/automations', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAutomations(data);
    } catch (err) {
      setError(tx('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAutomations(); }, [fetchAutomations]);

  const fetchLogs = async (automationId: number) => {
    if (expandedLogs === automationId) {
      setExpandedLogs(null);
      return;
    }
    setLogsLoading(true);
    setExpandedLogs(automationId);
    try {
      const res = await fetch(`/api/admin/automations/${automationId}/logs`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch { }
    setLogsLoading(false);
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormTriggerType('before_booking');
    setFormOffsetHours(-48);
    setFormSubject('');
    setFormBody('');
    setFormQuestionnaire('');
    setFormEnabled(true);
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (a: Automation) => {
    setFormName(a.name);
    setFormDescription(a.description || '');
    setFormTriggerType(a.triggerType);
    setFormOffsetHours(a.offsetHours);
    setFormSubject(a.emailSubject);
    setFormBody(a.emailBodyHtml);
    setFormQuestionnaire(a.questionnaireSlug || '');
    setFormEnabled(a.enabled);
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName || !formSubject || !formBody) {
      setError(tx('requiredFields'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: formName,
        description: formDescription || null,
        triggerType: formTriggerType,
        offsetHours: formOffsetHours,
        emailSubject: formSubject,
        emailBodyHtml: formBody,
        questionnaireSlug: formQuestionnaire || null,
        enabled: formEnabled,
      };

      const url = editingId ? `/api/admin/automations/${editingId}` : '/api/admin/automations';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Save failed');
      setShowForm(false);
      resetForm();
      fetchAutomations();
      setSuccessMsg(editingId ? tx('updated') : tx('created'));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setError(tx('errorSaving'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(tx('confirmDelete'))) return;
    try {
      await fetch(`/api/admin/automations/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchAutomations();
    } catch {
      setError(tx('errorDeleting'));
    }
  };

  const handleToggle = async (a: Automation) => {
    try {
      await fetch(`/api/admin/automations/${a.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !a.enabled }),
      });
      fetchAutomations();
    } catch {
      setError(tx('errorToggle'));
    }
  };

  const handleTest = async (id: number) => {
    setTestSending(id);
    try {
      const res = await fetch(`/api/admin/automations/${id}/test`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || tx('testSent'));
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(data.error || tx('testFailed'));
      }
    } catch {
      setError(tx('errorTestSend'));
    } finally {
      setTestSending(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="text-purple-600" size={28} />
              {tx('title')}
            </h1>
            <p className="text-gray-600 mt-1">
              {tx('subtitle')}
            </p>
          </div>
          <button
            onClick={openNew}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={20} /> {tx('newAutomation')}
          </button>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            <strong>{tx('howItWorks')}</strong> {tx('howItWorksText')}{' '}
            <code className="bg-blue-100 px-1 rounded">{'{{clientName}}'}</code>,{' '}
            <code className="bg-blue-100 px-1 rounded">{'{{clientEmail}}'}</code>,{' '}
            <code className="bg-blue-100 px-1 rounded">{'{{bookingDate}}'}</code>,{' '}
            <code className="bg-blue-100 px-1 rounded">{'{{bookingTime}}'}</code>,{' '}
            <code className="bg-blue-100 px-1 rounded">{'{{questionnaireLink}}'}</code>
          </p>
        </div>

        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={18} /> {successMsg}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle size={18} /> {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {/* Automation List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-purple-600" size={32} />
          </div>
        ) : automations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Mail className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">{tx('noAutomations')}</p>
            <button onClick={openNew} className="mt-4 text-purple-600 hover:text-purple-700 font-medium">
              {tx('createFirst')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {automations.map(a => (
              <div key={a.id} className={`bg-white rounded-lg shadow overflow-hidden border-l-4 ${a.enabled ? 'border-green-500' : 'border-gray-300'}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{tc(a.name)}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${a.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {a.enabled ? <><CheckCircle size={12} /> {tx('active')}</> : <><Pause size={12} /> {tx('paused')}</>}
                        </span>
                      </div>
                      {a.description && <p className="text-gray-500 text-sm mb-2">{tc(a.description)}</p>}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {formatOffset(a.offsetHours, a.triggerType, language)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {(() => { const subj = tc(a.emailSubject); return subj.substring(0, 50) + (subj.length > 50 ? '...' : ''); })()}
                        </span>
                        {a.questionnaireSlug && (
                          <span className="flex items-center gap-1 text-purple-600">
                            <CalendarCheck size={14} />
                            {tx('questionnaire')}: {a.questionnaireSlug}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        onClick={() => handleTest(a.id)}
                        disabled={testSending === a.id}
                        className="flex flex-col items-center px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors min-w-[52px]"
                        title={tx('sendTestEmail')}
                      >
                        {testSending === a.id ? <Loader2 size={15} className="animate-spin" /> : <TestTube size={15} />}
                        <span className="text-[10px] mt-0.5 leading-tight">{tx('test')}</span>
                      </button>
                      <button
                        onClick={() => handleToggle(a)}
                        className={`flex flex-col items-center px-2 py-1.5 rounded-lg transition-colors min-w-[52px] ${a.enabled ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                        title={a.enabled ? tx('pause') : tx('activate')}
                      >
                        {a.enabled ? <Pause size={15} /> : <Play size={15} />}
                        <span className="text-[10px] mt-0.5 leading-tight">{a.enabled ? tx('pause') : tx('activate')}</span>
                      </button>
                      <button
                        onClick={() => openEdit(a)}
                        className="flex flex-col items-center px-2 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors min-w-[52px]"
                        title={tx('edit')}
                      >
                        <Edit size={15} />
                        <span className="text-[10px] mt-0.5 leading-tight">{tx('edit')}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="flex flex-col items-center px-2 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors min-w-[52px]"
                        title={tx('delete')}
                      >
                        <Trash2 size={15} />
                        <span className="text-[10px] mt-0.5 leading-tight">{tx('delete')}</span>
                      </button>
                      <button
                        onClick={() => fetchLogs(a.id)}
                        className="flex flex-col items-center px-2 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors min-w-[52px]"
                        title={tx('showSentEmails')}
                      >
                        {expandedLogs === a.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        <span className="text-[10px] mt-0.5 leading-tight">{tx('logs')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Logs */}
                {expandedLogs === a.id && (
                  <div className="border-t bg-gray-50 p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{tx('sentEmails')}</h4>
                    {logsLoading ? (
                      <Loader2 className="animate-spin text-gray-400" size={20} />
                    ) : logs.length === 0 ? (
                      <p className="text-gray-400 text-sm">{tx('noEmailsSent')}</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {logs.map(log => (
                          <div key={log.id} className="flex items-center justify-between bg-white p-3 rounded border text-sm">
                            <div className="flex items-center gap-3">
                              {log.status === 'sent' ? (
                                <CheckCircle size={14} className="text-green-500" />
                              ) : (
                                <XCircle size={14} className="text-red-500" />
                              )}
                              <span className="font-medium">{log.clientName || log.clientEmail}</span>
                              <span className="text-gray-400">{log.clientEmail}</span>
                            </div>
                            <div className="text-gray-400">
                              {new Date(log.sentAt).toLocaleString(language === 'en' ? 'en-US' : 'de-AT', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {editingId ? tx('editAutomation') : tx('newAutomationTitle')}
                </h2>
              </div>
              <div className="p-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tx('nameLabel')}</label>
                  <input
                    type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                    placeholder={tx('namePlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tx('descriptionLabel')}</label>
                  <input
                    type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                    placeholder={tx('descriptionPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Trigger Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tx('triggerLabel')}</label>
                  <select
                    value={formTriggerType}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormTriggerType(v);
                      if (v === 'newsletter_signup') setFormOffsetHours(0);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="before_booking">{tx('triggerBefore')}</option>
                    <option value="after_booking">{tx('triggerAfter')}</option>
                    <option value="newsletter_signup">{tx('triggerNewsletter')}</option>
                  </select>
                </div>

                {/* Timing - only for booking triggers */}
                {formTriggerType !== 'newsletter_signup' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{tx('timingLabel')}</label>
                      <select
                        value={formOffsetHours}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          setFormOffsetHours(v);
                          setFormTriggerType(v < 0 ? 'before_booking' : 'after_booking');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      >
                        {OFFSET_PRESETS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{tx('questionnaireSlugLabel')}</label>
                      <input
                        type="text" value={formQuestionnaire} onChange={(e) => setFormQuestionnaire(e.target.value)}
                        placeholder="e.g. pre-shoot"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{tx('subjectLabel')}</label>
                  <input
                    type="text" value={formSubject} onChange={(e) => setFormSubject(e.target.value)}
                    placeholder={tx('subjectPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Body */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">{tx('bodyLabel')}</label>
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setPreviewMode(false)}
                        className={`flex items-center gap-1 px-3 py-1 text-xs font-medium transition-colors ${
                          !previewMode ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Code size={12} /> {tx('htmlCode')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewMode(true)}
                        className={`flex items-center gap-1 px-3 py-1 text-xs font-medium transition-colors ${
                          previewMode ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Eye size={12} /> {tx('preview')}
                      </button>
                    </div>
                  </div>

                  {!previewMode ? (
                    <>
                      <textarea
                        value={formBody} onChange={(e) => setFormBody(e.target.value)}
                        rows={12}
                        placeholder={tx('bodyPlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {tx('placeholders')} {'{{clientName}}'}, {'{{clientEmail}}'}, {'{{bookingDate}}'}, {'{{bookingTime}}'}, {'{{questionnaireLink}}'}
                      </p>
                    </>
                  ) : (
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
                        <p className="text-xs text-gray-500">{tx('previewNote')}</p>
                      </div>
                      <div
                        className="p-4 bg-white min-h-[200px] max-h-[400px] overflow-y-auto"
                        dangerouslySetInnerHTML={{
                          __html: formBody
                            .replace(/\{\{clientName\}\}/g, 'Maria Muster')
                            .replace(/\{\{clientEmail\}\}/g, 'maria@example.com')
                            .replace(/\{\{bookingDate\}\}/g, '15.04.2026')
                            .replace(/\{\{bookingTime\}\}/g, '14:00')
                            .replace(/\{\{questionnaireLink\}\}/g, '#')
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Enabled */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox" checked={formEnabled} onChange={(e) => setFormEnabled(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label className="text-sm text-gray-700">{tx('enableNow')}</label>
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <button
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {tx('cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg flex items-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {editingId ? tx('save') : tx('create')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAutomationsPage;
