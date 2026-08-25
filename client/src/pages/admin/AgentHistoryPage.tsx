import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { MessageSquare, Loader2, ArrowLeft, User, Sparkles, Info } from 'lucide-react';

/**
 * What you have asked the assistant, and what it said back.
 *
 * The data has been written since the agent shipped and read by nobody. The assistant itself
 * uses the last ten messages for context; the studio could not see a single one.
 *
 * This is the honest version of the "full audit trail" the assistant page used to advertise
 * — that claim was removed in v1.9.121 because the three tables behind it hold zero rows.
 * This one is backed by agent_message, which is genuinely written on every exchange.
 */

interface SessionRow {
  id: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  opening: string;
}

interface Message {
  role: string;
  content: string;
  createdAt: string;
  metadata: any;
}

export default function AgentHistoryPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingOne, setLoadingOne] = useState(false);

  useEffect(() => {
    fetch('/api/agent-history/sessions', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { setSessions(d.sessions || []); if (d.problem) setProblem(d.problem); })
      .catch(() => setProblem('The history could not be read.'))
      .finally(() => setLoading(false));
  }, []);

  const openSession = async (id: string) => {
    setOpen(id);
    setLoadingOne(true);
    setMessages([]);
    try {
      const r = await fetch(`/api/agent-history/sessions/${encodeURIComponent(id)}`, { credentials: 'include' });
      const d = await r.json();
      setMessages(d.messages || []);
    } catch {
      setProblem('That conversation could not be opened.');
    } finally {
      setLoadingOne(false);
    }
  };

  const when = (iso: string) => {
    try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return ''; }
  };

  if (open) {
    return (
      <AdminLayout>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" /> All conversations
          </button>

          {loadingOne ? (
            <p className="mt-6 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-4 ${
                    m.role === 'user'
                      ? 'bg-white border-gray-200'
                      : 'bg-purple-50/50 border-purple-100'
                  }`}
                >
                  <p className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    {m.role === 'user'
                      ? <><User className="w-3.5 h-3.5" /> You</>
                      : <><Sparkles className="w-3.5 h-3.5" /> Assistant</>}
                    <span className="ml-auto font-normal">{when(m.createdAt)}</span>
                  </p>
                  <p className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-sm text-gray-500">Nothing was recorded for this conversation.</p>
              )}
            </div>
          )}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">What you have asked the assistant</h1>
        <p className="mt-1 text-sm text-gray-600">
          Every conversation is kept. Useful when you cannot remember what you asked it to do,
          or want to check what it told you.
        </p>

        {problem && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {problem}
          </div>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        ) : sessions.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto" />
            <h2 className="mt-3 text-base font-semibold text-gray-900">Nothing yet</h2>
            <p className="mt-1 text-sm text-gray-600">
              Conversations with the assistant will appear here.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => openSession(s.id)}
                  className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-400 transition-colors"
                >
                  {/* The opening line IS the title. A timestamp tells you nothing about
                      which conversation this was. */}
                  <p className="text-sm font-medium text-gray-900">
                    {s.opening || 'Untitled conversation'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {when(s.updatedAt || s.createdAt)} · {s.messageCount} message
                    {s.messageCount === 1 ? '' : 's'}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 flex items-start gap-1.5 text-xs text-gray-500">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            This is the conversation itself. It is not a record of every change made to your
            data — anything the assistant does to a record still passes through your approval
            first.
          </span>
        </p>
      </div>
    </AdminLayout>
  );
}
