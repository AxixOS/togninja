/**
 * Session Type (Scheduler) Create Tool
 * Tier 2: Medium-risk write
 *
 * A scheduler is the bookable thing a client picks: "Family Session, 60 minutes, in the
 * studio". It is what /book offers, so creating one is how a photographer opens a new kind of
 * work for booking — and the agent could not do it.
 *
 * TWO THINGS THIS TABLE WILL NOT DO FOR YOU:
 *
 *   `id` is text with NO default, unlike almost every other table here. Omit it and the
 *   insert fails on a not-null primary key.
 *
 *   `slug` is unique and not null, and it is the public booking URL — /book/<slug>. So it is
 *   derived from the name and made unique before the insert, not after.
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { db } from "../../../server/db";
import { schedulers } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const params = z.object({
  name: z.string().min(1, "A session type needs a name"),
  duration: z.number().int().positive().max(1440).optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  // Free text on purpose. The survey found five different session-type vocabularies in this
  // product — the calendar knows six values, the importer five, the questionnaire four — so
  // constraining it here would just add a sixth that disagrees with all of them.
  sessionType: z.string().optional(),
  __confirm: z.boolean().optional(),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'session';
}

const def: ToolDef<typeof params> = {
  name: "schedulers_create",
  description:
    "Create a bookable session type — the thing a client picks on the booking page. Needs a "
    + "name; duration defaults to 60 minutes. Creates the booking link too.",
  parameters: params,
  authz: ["SESSION_WRITE", "CALENDAR_WRITE"],
  risk: "medium",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    const name = args.name.trim();
    const duration = args.duration ?? 60;

    const base = slugify(name);
    let slug = base;
    for (let n = 2; n < 50; n++) {
      const [taken] = await db.select({ id: schedulers.id }).from(schedulers)
        .where(eq(schedulers.slug, slug)).limit(1);
      if (!taken) break;
      slug = `${base}-${n}`;
    }

    if (ctx.dryRun) {
      return {
        success: true,
        simulated: true,
        message: `Would create "${name}" (${duration} min), bookable at /book/${slug}.`,
      };
    }

    const [created] = await db.insert(schedulers).values({
      // Supplied, because this primary key has no default.
      id: randomUUID(),
      name,
      slug,
      description: args.description?.trim() || null,
      location: args.location?.trim() || null,
      // Defaults to the name lowercased rather than the schema's hardcoded 'portrait', which
      // is how a scheduler called "Family Shoot" ended up typed as a portrait session.
      sessionType: (args.sessionType?.trim() || name).toLowerCase(),
      duration,
    }).returning();

    return {
      success: true,
      message: `Created "${name}" — ${duration} minutes, bookable at /book/${slug}. `
        + `Check its availability before sharing the link.`,
      scheduler: { id: created.id, name: created.name, slug: created.slug, duration },
    };
  },
};

registerTool(def);
export default def;
