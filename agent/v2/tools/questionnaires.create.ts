/**
 * Questionnaire Create Tool
 * Tier 2: Medium-risk write
 *
 * WHY THIS DID NOT EXIST. The agent could not build a questionnaire, which is one of the few
 * things a photographer genuinely wants dictated rather than clicked: "ask them the venue,
 * the timings, who's giving a speech, and any photos they must have" is a sentence, and
 * building it by hand is eight form rows.
 *
 * THE FIELD SHAPE IS THE WHOLE RISK. questionnaires.fields is `jsonb NOT NULL`, so a
 * malformed array is stored happily and only fails when a client opens the form — by which
 * point the studio has already sent them the link. Every field is validated into a known
 * shape here rather than trusted from the model.
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { db } from "../../../server/db";
import { questionnaires } from "../../../shared/schema";
import { eq } from "drizzle-orm";

const field = z.object({
  label: z.string().min(1, "Every question needs wording"),
  // The renderer understands these. An unknown type is a question that draws as nothing.
  type: z.enum(["text", "textarea", "email", "phone", "date", "number", "select", "checkbox"]),
  required: z.boolean().optional(),
  // Only meaningful for select. A select with no options is a dropdown a client cannot answer.
  options: z.array(z.string()).optional(),
});

const params = z.object({
  title: z.string().min(1, "A questionnaire needs a title"),
  description: z.string().optional(),
  questions: z.array(field).min(1, "Add at least one question"),
  notifyEmail: z.string().email().optional(),
  __confirm: z.boolean().optional(),
});

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'questionnaire';
}

const def: ToolDef<typeof params> = {
  name: "questionnaires_create",
  description:
    "Create a questionnaire to send a client. Give it a title and the questions to ask; each "
    + "question needs wording and a type (text, textarea, email, phone, date, number, select, "
    + "checkbox). A select question also needs its options.",
  parameters: params,
  authz: ["CRM_WRITE"],
  risk: "medium",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    const title = args.title.trim();

    // A select with no options renders as a dropdown nobody can answer. Caught here rather
    // than by the client who received the link.
    const broken = args.questions.find(
      (q) => q.type === 'select' && (!q.options || q.options.length === 0),
    );
    if (broken) {
      throw new Error(`"${broken.label}" is a multiple-choice question with no options to choose from.`);
    }

    // slug is unique and not null, so a collision is a hard error rather than something to
    // recover from after the insert.
    const base = slugify(title);
    let slug = base;
    for (let n = 2; n < 50; n++) {
      const [taken] = await db.select({ id: questionnaires.id }).from(questionnaires)
        .where(eq(questionnaires.slug, slug)).limit(1);
      if (!taken) break;
      slug = `${base}-${n}`;
    }

    const fields = args.questions.map((q, i) => ({
      id: `q${i + 1}`,
      label: q.label.trim(),
      type: q.type,
      required: q.required ?? false,
      ...(q.type === 'select' ? { options: (q.options || []).map((o) => o.trim()).filter(Boolean) } : {}),
    }));

    if (ctx.dryRun) {
      return {
        success: true,
        simulated: true,
        message: `Would create "${title}" with ${fields.length} question(s) at /q/${slug}.`,
        fields,
      };
    }

    const [created] = await db.insert(questionnaires).values({
      title,
      slug,
      description: args.description?.trim() || '',
      fields,
      notifyEmail: args.notifyEmail?.trim() || null,
      isActive: true,
    }).returning();

    return {
      success: true,
      message: `Created "${title}" with ${fields.length} question(s). Share it at /q/${slug}.`,
      questionnaire: { id: created.id, title: created.title, slug: created.slug, questions: fields.length },
    };
  },
};

registerTool(def);
export default def;
