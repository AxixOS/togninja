/**
 * Contract Create Tool
 * Tier 3: High-risk write — ALWAYS requires confirmation
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: write contract terms.
 *
 * A contract is a legal document. An agent that drafts the clauses is inventing the terms a
 * studio will be held to, from a prompt, with nobody who understands the jurisdiction in the
 * loop. So this SELECTS a template the studio already wrote and merges the client's details
 * into it — the same thing the Contracts screen does, through the same merge engine, with the
 * same studio values.
 *
 * That is why it is risk "high" rather than "medium" like the other create tools: what comes
 * out is something a client will be asked to sign.
 *
 * It also refuses honestly when there is nothing to build from. contract_templates is empty
 * on a new instance, and "created a contract" from no template would either fail obscurely or
 * produce an empty document.
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { pool } from "../../../server/db";
import { mergeContract } from "../../../shared/contractMerge";
import { studioValues } from "../../../server/routes/contracts";

const params = z.object({
  // Either is accepted: a studio dictating this says "the wedding one", not a UUID.
  templateId: z.string().uuid().optional(),
  templateName: z.string().optional(),
  clientId: z.string().uuid("A contract needs a client"),
  title: z.string().optional(),
  /** Anything the template asks for that the studio row cannot supply — dates, fees, venue. */
  values: z.record(z.string()).optional(),
  __confirm: z.boolean().optional(),
});

const def: ToolDef<typeof params> = {
  name: "contracts_create",
  description:
    "Create a contract for a client from one of the studio's existing templates. Name the "
    + "template and the client. Does NOT write contract terms — it fills in a template the "
    + "studio already wrote. Leaves it as a draft for review; it is not sent.",
  parameters: params,
  authz: ["CRM_WRITE"],
  risk: "high",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    // Nothing to build from is the common state on a new instance, and it deserves a real
    // sentence rather than a foreign-key error.
    const all = await pool.query(`SELECT id, name, body FROM contract_templates ORDER BY name`);
    if (!all.rows.length) {
      throw new Error(
        'There are no contract templates yet, so there is nothing to build a contract from. '
        + 'Create a template first under Contracts → Templates.',
      );
    }

    let tpl = args.templateId
      ? all.rows.find((t: any) => t.id === args.templateId)
      : undefined;

    if (!tpl && args.templateName) {
      const want = args.templateName.trim().toLowerCase();
      const matches = all.rows.filter((t: any) => String(t.name).toLowerCase().includes(want));
      // Ambiguity is reported, not guessed. Picking the first of three plausible templates
      // means a client signs the wrong terms.
      if (matches.length > 1) {
        throw new Error(
          `"${args.templateName}" matches ${matches.length} templates: `
          + `${matches.map((m: any) => m.name).join(', ')}. Which one?`,
        );
      }
      tpl = matches[0];
    }

    if (!tpl) {
      throw new Error(
        `No template matched. Available: ${all.rows.map((t: any) => t.name).join(', ')}.`,
      );
    }

    const client = await pool.query(
      `SELECT first_name, last_name, email FROM crm_clients WHERE id = $1`, [args.clientId],
    );
    if (!client.rows.length) throw new Error(`No client with id ${args.clientId}.`);
    const c = client.rows[0];

    // The SAME studio values the Contracts route merges with, and the same merge engine.
    const merged: Record<string, string> = {
      ...(await studioValues()),
      'Client Name': `${c.first_name} ${c.last_name}`.trim(),
      'Client Email': c.email || '',
      ...(args.values || {}),
    };
    const result = mergeContract(tpl.body, merged);

    const title = args.title?.trim() || tpl.name;

    if (ctx.dryRun) {
      return {
        success: true,
        simulated: true,
        message: `Would create "${title}" for ${c.first_name} ${c.last_name} from the `
          + `"${tpl.name}" template.`,
        unresolved: result.missing,
      };
    }

    const created = await pool.query(
      `INSERT INTO contracts (template_id, client_id, title, body, merge_values, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, 'draft') RETURNING id`,
      [tpl.id, args.clientId, title, result.text, JSON.stringify(merged)],
    );

    // Reported, not hidden. An unfilled placeholder blocks sending anyway, and the studio
    // should hear about it now rather than when they try to send it.
    const gaps = result.missing?.length
      ? ` Still needs filling in: ${result.missing.join(', ')}.`
      : '';

    return {
      success: true,
      message: `Created "${title}" for ${c.first_name} ${c.last_name} as a DRAFT — nothing has `
        + `been sent.${gaps}`,
      contract: { id: created.rows[0].id, title, status: 'draft', unresolved: result.missing || [] },
    };
  },
};

registerTool(def);
export default def;
