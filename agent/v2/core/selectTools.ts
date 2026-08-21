// Which tools to put in front of the model for THIS message.
//
// server/routes/agent-v2.ts did this:
//
//   // Get available tools for this user (limit to 20 to avoid token overflow)
//   const availableTools = allTools.slice(0, 20);
//
// 47 tools are registered and 20 were sent. The comment's concern is real — every tool
// schema costs input tokens on every turn — but slice() takes whatever happens to be
// first, and what is first is decided by the order of the side-effect imports in
// agent/v2/tools/index.ts. That file lists all the read tools, then all the write tools.
// So the cut landed exactly on the boundary and EVERY write tool fell off: email_draft,
// calendar_create_appointment, clients_update, invoices_create, email_send, invoices_send,
// invoices_mark_paid. The agent was read-only by accident, for every role including owner.
//
// Raising 20 to 47 would fix that and reintroduce the cost the comment was worried about,
// on every turn, most of it irrelevant to what was asked. Choose by relevance instead.

interface OpenAITool {
  type: string;
  function: { name: string; description?: string; parameters?: any };
}

/** Words too common to discriminate between tools. */
const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'at', 'is', 'are',
  'was', 'were', 'be', 'do', 'does', 'did', 'can', 'could', 'would', 'should', 'will',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'this', 'that', 'with', 'from',
  'please', 'show', 'get', 'give', 'tell', 'what', 'which', 'who', 'how', 'all', 'any',
]);

const tokenize = (s: string): string[] =>
  String(s || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));

/**
 * Rank the caller's tools against the message and return the best `max`.
 *
 * Scoring is deliberately boring — substring overlap on the tool's own name and
 * description, name weighted higher. No embedding, no extra model call: this runs on
 * every turn and must cost nothing. The tool NAMES are already good keywords
 * ("invoices_create", "email_draft"), which is what makes so cheap a method work.
 *
 * `alwaysInclude` guarantees the general-purpose tools survive a message that matches
 * nothing, so the agent can still answer "what do you know about my studio?".
 */
export function selectTools(
  tools: OpenAITool[],
  message: string,
  max = 24,
  alwaysInclude: string[] = ['crm_clients_search', 'general_sql_query', 'invoices_list', 'crm_leads_list'],
): OpenAITool[] {
  if (tools.length <= max) return tools;

  const words = tokenize(message);
  const keep = new Map<string, OpenAITool>();

  // 1. The floor.
  for (const name of alwaysInclude) {
    const t = tools.find((x) => x.function.name === name);
    if (t) keep.set(name, t);
  }

  // 2. Everything else by score.
  const scored = tools
    .filter((t) => !keep.has(t.function.name))
    .map((t) => {
      const name = t.function.name.toLowerCase();
      const desc = String(t.function.description || '').toLowerCase();
      let score = 0;
      for (const w of words) {
        if (name.includes(w)) score += 3;
        else if (desc.includes(w)) score += 1;
      }
      return { tool: t, score };
    })
    .sort((a, b) => b.score - a.score);

  for (const { tool } of scored) {
    if (keep.size >= max) break;
    keep.set(tool.function.name, tool);
  }

  return Array.from(keep.values());
}
