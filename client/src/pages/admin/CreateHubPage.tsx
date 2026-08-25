import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  Users, Image as ImageIcon, FileText, ScrollText, ClipboardList, CalendarPlus,
  Sparkles, ArrowRight, AlertTriangle,
} from 'lucide-react';

/**
 * The Create hub.
 *
 * Six things a photographer makes, each openable two ways: describe it to the agent, or
 * fill in the form yourself. The tile carries the intent across, so the agent already knows
 * what you came to do — a tile that opens an empty chat box just makes the studio type the
 * thing it has already clicked on.
 *
 * WHY BOTH ROUTES, ALWAYS. "Or set it up manually" is not a fallback for when the agent
 * fails; it is the honest acknowledgement that dictating a gallery title is slower than
 * typing it, and that some people would simply rather use the form. A hub that only offered
 * the agent would be a worse version of the six pages that already exist.
 *
 * EVERY MANUAL LINK GOES SOMEWHERE REAL. Checked against client/src/App.tsx: clients,
 * galleries and contracts have their own /new routes; invoices, questionnaires and session
 * types are created from their list pages, so that is where those links go. A tile whose
 * secondary link dead-ends would be worse than no tile.
 */

interface Tile {
  key: string;
  title: string;
  blurb: string;
  icon: React.ReactNode;
  /** What the agent is asked, when you choose that route. */
  ask: string;
  manualPath: string;
  manualLabel: string;
}

const TILES: Tile[] = [
  {
    key: 'client',
    title: 'Client',
    blurb: 'Someone new to keep track of.',
    icon: <Users className="h-5 w-5" />,
    ask: 'Add a new client. I will give you their name, and their email if I have it.',
    manualPath: '/admin/clients/new',
    manualLabel: 'or fill in the form',
  },
  {
    key: 'gallery',
    title: 'Gallery',
    blurb: 'Somewhere to deliver a shoot.',
    icon: <ImageIcon className="h-5 w-5" />,
    ask: 'Create a client gallery. I will tell you the title and who it is for.',
    manualPath: '/admin/galleries/new',
    manualLabel: 'or fill in the form',
  },
  {
    key: 'invoice',
    title: 'Invoice',
    blurb: 'Ask to be paid for work.',
    icon: <FileText className="h-5 w-5" />,
    ask: 'Draft an invoice. I will tell you the client and what to bill for.',
    manualPath: '/admin/invoices',
    manualLabel: 'or build it yourself',
  },
  {
    key: 'session',
    title: 'Session',
    blurb: 'A shoot in the calendar.',
    icon: <CalendarPlus className="h-5 w-5" />,
    ask: 'Book a session in the calendar. I will give you the client, the date and the time.',
    manualPath: '/admin/calendar',
    manualLabel: 'or add it in the calendar',
  },
  {
    key: 'contract',
    title: 'Contract',
    blurb: 'Terms for a client to sign.',
    icon: <ScrollText className="h-5 w-5" />,
    ask: 'Draft a contract for a client to sign.',
    manualPath: '/admin/contracts/new',
    manualLabel: 'or write it yourself',
  },
  {
    key: 'questionnaire',
    title: 'Questionnaire',
    blurb: 'Ask a client what they want.',
    icon: <ClipboardList className="h-5 w-5" />,
    ask: 'Create a questionnaire to send a client before their shoot.',
    manualPath: '/admin/questionnaires',
    manualLabel: 'or build it yourself',
  },
];

export default function CreateHubPage() {
  // Contracts are built from templates, and a studio with none cannot finish the journey a
  // tile invites them into. Rather than let them find that out at the end, the tile says so
  // and points at the place to fix it.
  const [templateCount, setTemplateCount] = useState<number | null>(null);
  useEffect(() => {
    fetch('/api/contracts/templates', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setTemplateCount(Array.isArray(d) ? d.length : (d?.templates?.length ?? 0)))
      .catch(() => setTemplateCount(null));   // unknown: say nothing rather than guess
  }, []);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900">Create</h1>
        <p className="mt-1 text-sm text-gray-600">
          Describe what you want and let the assistant draft it, or fill in the form yourself.
          Either way you see it before anything is saved.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TILES.map((tile) => {
            const blocked = tile.key === 'contract' && templateCount === 0;
            return (
              <div
                key={tile.key}
                className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col"
              >
                <div className="flex items-center gap-2 text-gray-900">
                  <span className="rounded-lg bg-gray-100 p-2">{tile.icon}</span>
                  <h2 className="text-base font-semibold">{tile.title}</h2>
                </div>
                <p className="mt-2 text-sm text-gray-600 flex-1">{tile.blurb}</p>

                {blocked ? (
                  <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="flex items-start gap-2 text-xs text-amber-900">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        You have no contract templates yet, so there is nothing to build one
                        from.
                      </span>
                    </p>
                    <Link
                      to="/admin/contracts/templates"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-900 underline"
                    >
                      Make a template first <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                ) : (
                  <>
                    <Link
                      to={`/admin/agent-v2?ask=${encodeURIComponent(tile.ask)}`}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                      <Sparkles className="h-4 w-4" />
                      Ask the assistant
                    </Link>
                    <Link
                      to={tile.manualPath}
                      className="mt-2 text-center text-xs text-gray-500 hover:text-gray-800 underline"
                    >
                      {tile.manualLabel}
                    </Link>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-gray-500">
          The assistant proposes; you approve. Anything that writes to your business shows you
          exactly what it is about to do, and you can change it before it happens.
        </p>
      </div>
    </AdminLayout>
  );
}
