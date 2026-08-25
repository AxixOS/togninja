import React, { useEffect } from 'react';
import { openAssistant } from '../../lib/assistantBus';
import { Shield, Sparkles, Zap } from 'lucide-react';
import AdminLayout from '../../components/admin/AdminLayout';

// The connection status type went with the reconnection chain it described.

const AgentV2Page: React.FC = () => {
  // Everything that used to live here — session state, a message list, a send handler, a
  // retry handler, a health poller and a reconnection chain — drove this page's own chat
  // panel, which was a second copy of the assistant AdminLayout already mounts. With the
  // panel gone it was all unreachable, and unreachable chat code is exactly what this
  // codebase already had three of.
  //
  // One thing it did was a live bug worth naming: the health-monitor effect listed
  // connectionStatus in its own dependency array, so every status change tore the monitor
  // down and started a fresh reconnection chain on top of the one already sleeping.

  /**
   * An intent handed over from the Create hub.
   *
   * The tiles open the agent already knowing what you came to do, which is the whole
   * point of a Create surface — otherwise a tile is a link to an empty chat box and the
   * studio types the intent it just clicked on.
   *
   * PRE-FILLED, NOT AUTO-SENT. The text lands in the input and the person presses send.
   * Firing a request because somebody clicked a tile means a misclick starts the agent
   * doing something, and the agent writes to their business.
   */
  useEffect(() => {
    const ask = new URLSearchParams(window.location.search).get('ask');
    if (!ask) return;
    // Opens the assistant AdminLayout already mounted, rather than a second one of our
    // own. Still pre-filled and not auto-sent, for the reason above.
    openAssistant(ask);
    // Drop it from the URL so a refresh does not re-fill a box the studio has cleared.
    const url = new URL(window.location.href);
    url.searchParams.delete('ask');
    window.history.replaceState({}, '', url.toString());
  }, []);

  return (
    <AdminLayout>
      <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-3 rounded-xl shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                Your assistant
              </h1>
              <p className="text-gray-600 mt-1">
                Ask for something and watch it work. Nothing reaches a client, or your
                books, without you seeing it first.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-violet-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-violet-100 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-violet-600" />
              </div>
              <h3 className="font-semibold text-lg">It asks before it acts</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Anything that changes a record, sends a message or touches money stops and
              shows you exactly what it is about to do. You can change it, then approve it.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-purple-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg">It can do 52 things</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Find a client, chase an invoice, draft an email, book a session, build a
              gallery, or research what photographers near you charge. 52 registered tools;
              37 of them only ever read.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-pink-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-pink-100 p-2 rounded-lg">
                <Sparkles className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-semibold text-lg">It remembers the conversation</h3>
            </div>
            <p className="text-gray-600 text-sm">
              Every message is kept, so you can pick up where you left off and it still
              knows what you were talking about.
            </p>
          </div>
        </div>

        {/* Safety Modes Info */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
          <h3 className="font-semibold text-lg mb-4">What it will and will not do on its own</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-green-700 mb-1">Read-Only Mode</h4>
              <p className="text-sm text-gray-600">
                Only search and list operations. No modifications allowed.
              </p>
            </div>
            <div className="border-l-4 border-amber-500 pl-4">
              <h4 className="font-semibold text-amber-700 mb-1">Auto-Safe Mode (Default)</h4>
              <p className="text-sm text-gray-600">
                Medium-risk actions require confirmation. High-risk always confirm.
              </p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-semibold text-red-700 mb-1">Auto-Full Mode</h4>
              <p className="text-sm text-gray-600">
                Every tool runs without asking, including sending email, sending invoices and
                marking them paid. Nothing prompts. Turn this on only when you are watching.
              </p>
            </div>
          </div>
        </div>

        {/* Available Tools */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-200">
          <h3 className="font-semibold text-lg mb-4">
            Available Tools <span className="font-normal text-gray-500 text-base">(52 registered — a representative selection below)</span>
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Read-Only (Low Risk)
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Search clients</li>
                <li>• List leads</li>
                <li>• List invoices</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-amber-600 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Safe Writes (Medium Risk)
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Draft email</li>
                <li>• Create calendar event</li>
                <li>• Update client info</li>
                <li>• Create invoice draft</li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                High Risk (Always Confirm)
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Send email</li>
                <li>• Send invoice via email</li>
                <li>• Mark invoice as paid</li>
              </ul>
            </div>
          </div>
        </div>

        {/*
          A button, not a set of directions to one.

          Step 1 used to read "Click the chat button in the bottom-right corner" — on a page
          that was itself rendering a second chat button in that corner, on top of the real
          one. Step 4 pointed at an Agent Console for "audit logs and session history"; those
          tables hold no rows, which is why that claim was removed from this page in v1.9.121.
          The history that does exist is the conversation itself, under Assistant history.
        */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl shadow-md p-6 text-white mb-8">
          <h3 className="font-semibold text-lg">Ready when you are</h3>
          <p className="mt-1 text-sm text-white/90">
            Try &ldquo;show me unpaid invoices&rdquo;, &ldquo;draft a follow-up to Sarah&rdquo;, or
            &ldquo;what did I earn last month?&rdquo;. Anything that changes a record will stop and
            ask you first.
          </p>
          <button
            type="button"
            onClick={() => openAssistant()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            <Sparkles className="w-4 h-4" />
            Open the assistant
          </button>
          <p className="mt-3 text-xs text-white/80">
            It stays with you as you move around &mdash; and everything you have asked it is kept
            under Assistant history.
          </p>
        </div>
        </div>

        {/* Floating Chat Button */}
        {/*
          The page used to render its own chat here — a second one. AdminLayout mounts
          AgentChatWidget on every admin page, so this page showed two windows with the
          same title, holding two unrelated conversations against the same endpoint.

          They were not equals. The widget can approve a tool the agent asks permission
          for; this panel printed "Confirmation required" as a chat bubble with no control
          to answer it, and its confirmRequired branch could never even run, because the
          server always sends a message alongside and the branch above it matched first. So
          the page devoted to the assistant offered the copy that could not act, and the
          three cards above it described approving and remembering — neither of which this
          panel did.

          There is now one chat in the product. This page opens it.
        */}
        {/* Agent disabled */}
      </div>
    </AdminLayout>
  );
};

export default AgentV2Page;
