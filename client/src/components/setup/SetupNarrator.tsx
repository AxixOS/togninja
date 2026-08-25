import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Search, PenLine, AlertTriangle } from 'lucide-react';

/**
 * What the setup wizard is doing, while it does it.
 *
 * Behind this screen a whole website gets crawled, the studio's own subjects get pulled out
 * of their page titles, and a homepage gets written from them. A minute or more of real work,
 * presented as a spinner and a single stage word. A spinner that long does not read as
 * "working" — it reads as "hung", and the studio whose screenshot prompted this stopped at
 * exactly that point.
 *
 * Every line is a fact the pipeline actually established: a page count it really read, a
 * subject that really came off one of their pages. Nothing is padded, and no tick appears for
 * something that did not happen — a fabricated progress feed is worse than a spinner, because
 * it lies about a specific thing rather than saying nothing at all.
 */

export interface Finding {
  at: string;
  text: string;
  kind: 'reading' | 'found' | 'writing' | 'done' | 'problem';
}

const ICONS: Record<Finding['kind'], React.ComponentType<{ className?: string }>> = {
  reading: Search,
  found: Check,
  writing: PenLine,
  done: Check,
  problem: AlertTriangle,
};

const TONE: Record<Finding['kind'], string> = {
  reading: 'text-blue-600 bg-blue-50 ring-blue-100',
  found: 'text-emerald-600 bg-emerald-50 ring-emerald-100',
  writing: 'text-violet-600 bg-violet-50 ring-violet-100',
  done: 'text-emerald-600 bg-emerald-50 ring-emerald-100',
  problem: 'text-amber-600 bg-amber-50 ring-amber-100',
};

export default function SetupNarrator({
  findings,
  busy,
}: {
  findings: Finding[];
  busy: boolean;
}) {
  // Reveal one at a time even when several arrive in the same 2.5s poll, so the feed reads as
  // something happening rather than a list appearing all at once.
  const [shown, setShown] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (shown >= findings.length) return;
    timer.current = window.setTimeout(() => setShown((n) => Math.min(n + 1, findings.length)), 420);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [shown, findings.length]);

  // A poll returning fewer than we have shown means a re-run started; follow it back down.
  useEffect(() => {
    if (findings.length < shown) setShown(findings.length);
  }, [findings.length, shown]);

  if (!findings.length && !busy) return null;

  const visible = findings.slice(0, shown);

  return (
    <div className="rounded-xl border border-gray-200 bg-white/70 p-4">
      <ul className="space-y-2.5">
        {visible.map((f, i) => {
          const Icon = ICONS[f.kind] || Check;
          return (
            <li
              key={`${f.at}-${i}`}
              className="flex items-start gap-3 text-sm text-gray-800 setup-finding"
            >
              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ${TONE[f.kind]}`}>
                <Icon className="h-3 w-3" />
              </span>
              <span>{f.text}</span>
            </li>
          );
        })}

        {/* The live row — only while there is genuinely more coming. */}
        {busy && shown >= findings.length && (
          <li className="flex items-start gap-3 text-sm text-gray-500">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">
              <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
            </span>
            <span>Working&hellip;</span>
          </li>
        )}
      </ul>
    </div>
  );
}
