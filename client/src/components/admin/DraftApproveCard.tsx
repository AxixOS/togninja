import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, X, RotateCcw } from 'lucide-react';

/**
 * Draft & Approve: the agent proposes, you correct it, then it commits.
 *
 * WHAT THIS REPLACES. The approval gate (v1.9.65) already worked end to end — Guardrails
 * raises ConfirmRequiredError, the reply comes back confirmRequired:true, the widget holds
 * the tool and asks. But the arguments were rendered as a read-only JSON <pre>, so the only
 * two answers were "yes, exactly as proposed" and "no". An agent that got the client's name
 * right and the date wrong had to be argued with in prose and asked again.
 *
 * The SERVER half of editing already worked: approvePending POSTs
 * `confirm: { tool, args }` and the server re-validates whatever it receives through the
 * tool's own Zod schema and scope checks. Nothing here can smuggle an argument past
 * validation — this is a better editor over a gate that was already closed.
 *
 * WHY THIS COMPONENT EXISTS SEPARATELY. Three surfaces render the same approval today
 * (AgentChatWidget, CRMOperationsAssistantV2, AgentV2Page) and each had its own copy of the
 * <pre>. The plan calls Draft & Approve a primitive "reused by every document type", so it
 * is one component rather than a fourth divergent copy.
 */

export interface DraftApproveProps {
  tool: string;
  args: Record<string, any>;
  reason?: string;
  onApprove: (editedArgs: Record<string, any>) => void;
  onDecline: () => void;
  busy?: boolean;
}

/** A key a human should never be asked to fill in. */
function isInternal(key: string): boolean {
  return key.startsWith('__') || key === 'confirm';
}

/** Turn snake_case / camelCase into something readable, without a lookup table. */
function humanise(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

export const DraftApproveCard: React.FC<DraftApproveProps> = ({
  tool, args, reason, onApprove, onDecline, busy,
}) => {
  const initial = useMemo(() => args || {}, [args]);
  const [edited, setEdited] = useState<Record<string, any>>(initial);
  const [jsonErrors, setJsonErrors] = useState<Record<string, string>>({});

  // A new proposal replaces whatever was being edited. Without this, approving one draft and
  // being offered another would show the previous draft's values in the new one's fields.
  useEffect(() => { setEdited(initial); setJsonErrors({}); }, [initial]);

  const keys = Object.keys(edited).filter((k) => !isInternal(k));
  const changed = keys.some((k) => JSON.stringify(edited[k]) !== JSON.stringify(initial[k]));
  const hasErrors = Object.keys(jsonErrors).length > 0;

  const setValue = (key: string, value: any) => setEdited((p) => ({ ...p, [key]: value }));

  const field = (key: string) => {
    const value = edited[key];

    if (typeof value === 'boolean') {
      return (
        <label className="flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={value}
            disabled={busy}
            onChange={(e) => setValue(key, e.target.checked)}
          />
          <span>{humanise(key)}</span>
        </label>
      );
    }

    if (typeof value === 'number') {
      return (
        <label className="block">
          <span className="block text-xs font-medium text-gray-600">{humanise(key)}</span>
          <input
            type="number"
            value={String(value)}
            disabled={busy}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              // An emptied number field must not become NaN and reach the server as null —
              // the tool's Zod schema would reject it and the studio would see a validation
              // error about a field they were only halfway through typing.
              setValue(key, Number.isFinite(n) ? n : 0);
            }}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      );
    }

    if (value !== null && typeof value === 'object') {
      // Objects and arrays as JSON. Rare in tool args, and a bespoke editor for an arbitrary
      // shape would be guesswork — but an unparseable edit must block approval rather than
      // silently send the last good value.
      return (
        <label className="block">
          <span className="block text-xs font-medium text-gray-600">{humanise(key)}</span>
          <textarea
            rows={3}
            disabled={busy}
            defaultValue={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                setValue(key, JSON.parse(e.target.value));
                setJsonErrors((p) => { const n = { ...p }; delete n[key]; return n; });
              } catch {
                setJsonErrors((p) => ({ ...p, [key]: 'This is not valid JSON yet.' }));
              }
            }}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 font-mono text-xs"
          />
          {jsonErrors[key] && <span className="text-xs text-red-600">{jsonErrors[key]}</span>}
        </label>
      );
    }

    const text = value == null ? '' : String(value);
    const long = text.length > 60;
    return (
      <label className="block">
        <span className="block text-xs font-medium text-gray-600">{humanise(key)}</span>
        {long ? (
          <textarea
            rows={3}
            value={text}
            disabled={busy}
            onChange={(e) => setValue(key, e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        ) : (
          <input
            type="text"
            value={text}
            disabled={busy}
            onChange={(e) => setValue(key, e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        )}
      </label>
    );
  };

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
      <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Run <span className="font-mono">{tool.replace(/_/g, ' ')}</span>?
      </p>
      {reason && <p className="mt-1 text-xs text-amber-800">{reason}</p>}

      {keys.length > 0 && (
        <div className="mt-3 space-y-2 rounded bg-white/70 p-2">
          {keys.map((k) => <div key={k}>{field(k)}</div>)}
        </div>
      )}

      {changed && (
        <p className="mt-2 flex items-center gap-1 text-xs text-amber-900">
          <RotateCcw className="h-3 w-3" />
          You have changed what was proposed.
          <button
            type="button"
            onClick={() => { setEdited(initial); setJsonErrors({}); }}
            className="underline"
          >
            Undo
          </button>
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onApprove(edited)}
          disabled={busy || hasErrors}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {changed ? 'Do it, with my changes' : 'Yes, do it'}
        </button>
        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          No
        </button>
      </div>
    </div>
  );
};

export default DraftApproveCard;
