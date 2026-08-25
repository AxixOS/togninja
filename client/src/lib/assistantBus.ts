// One way in to the assistant, from anywhere in the admin app.
//
// The assistant page could not reach the assistant. AdminLayout mounts AgentChatWidget on
// every admin page, and AgentV2Page — the page whose entire subject IS the assistant —
// mounted a SECOND chat of its own rather than opening that one. So /admin/agent-v2 showed
// two chat windows with the same title, holding two unrelated conversations against the
// same endpoint, and only one of them could approve anything.
//
// The two could not talk to each other because nothing connected them: the widget takes no
// props and knows nothing about routes, and the page has no handle on the widget. This is
// that connection, and it is deliberately the smallest thing that works — no context
// provider, no store, no dependency for either side beyond this file.

type Listener = (prefill?: string) => void;

const listeners = new Set<Listener>();

/**
 * Open the assistant, optionally with a question already typed in.
 *
 * Safe to call when no assistant is mounted — on a page without AdminLayout there is
 * nothing listening, and this does nothing rather than throwing.
 */
export function openAssistant(prefill?: string): void {
  listeners.forEach((l) => {
    try { l(prefill); } catch { /* one bad listener must not stop the others */ }
  });
}

/** Subscribe. Returns the unsubscribe, for a useEffect cleanup. */
export function onOpenAssistant(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Whether anything is actually listening — lets a caller hide a button that would do nothing. */
export function assistantAvailable(): boolean {
  return listeners.size > 0;
}
