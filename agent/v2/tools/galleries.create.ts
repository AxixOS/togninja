/**
 * Gallery Create Tool
 * Tier 2: Medium-risk write
 *
 * WHY THIS DID NOT EXIST. The agent could LIST galleries and count their images and could
 * not make one — so "set up a gallery for the Dubois shoot" ended in an apology, on a
 * product whose entire purpose is delivering photographs.
 *
 * THE SLUG IS THE DANGEROUS PART. It is UNIQUE and NOT NULL, and it is also the client's
 * URL. Two things follow:
 *
 *   A collision is a hard database error, not a warning — so the slug is derived, checked
 *   and made unique here rather than hoping.
 *
 *   The slug is what a client sees and types. Deriving it from the title is right; deriving
 *   it from a timestamp would produce /gallery/1787537282461, which is nobody's idea of a
 *   link to their wedding photographs.
 *
 * It creates the gallery EMPTY on purpose. Uploading images is a separate act with its own
 * surface, and an agent that both creates a gallery and decides which photographs go in it
 * is making an editorial judgement nobody asked it for.
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { db } from "../../../server/db";
import { galleries, crmClients } from "../../../shared/schema";
import { eq } from "drizzle-orm";

const params = z.object({
  title: z.string().min(1, "A gallery needs a title"),
  clientId: z.string().uuid().optional(),
  description: z.string().optional(),
  // Defaults chosen for a CLIENT gallery, which is what a photographer means by the word.
  // A public, downloadable, never-expiring gallery is a fine thing to ask for explicitly and
  // a poor thing to get by accident.
  isPublic: z.boolean().optional(),
  password: z.string().optional(),
  downloadEnabled: z.boolean().optional(),
  __confirm: z.boolean().optional(),
});

/** A slug a client can read, from a title a photographer typed. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // "Müller" -> "muller", not "mller"
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'gallery';
}

const def: ToolDef<typeof params> = {
  name: "galleries_create",
  description:
    "Create a new, empty client gallery. Give it a title, and optionally the client it "
    + "belongs to. Photographs are uploaded separately. Password-protected and "
    + "download-enabled by default, as a client delivery gallery normally is.",
  parameters: params,
  authz: ["GALLERY_WRITE", "CRM_WRITE"],
  risk: "medium",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    const { __confirm } = args;
    const title = args.title.trim();

    // If a client was named, it has to exist — a gallery pointing at a missing client is a
    // foreign-key error at best and an orphan at worst.
    let clientName: string | null = null;
    if (args.clientId) {
      const [client] = await db.select().from(crmClients)
        .where(eq(crmClients.id, args.clientId)).limit(1);
      if (!client) throw new Error(`No client with id ${args.clientId}.`);
      clientName = `${client.firstName} ${client.lastName}`;
    }

    // Make the slug unique BEFORE inserting. The column is unique and not null, so a
    // collision is an exception rather than something to recover from afterwards.
    const base = slugify(title);
    let slug = base;
    for (let n = 2; n < 50; n++) {
      const [taken] = await db.select({ id: galleries.id }).from(galleries)
        .where(eq(galleries.slug, slug)).limit(1);
      if (!taken) break;
      slug = `${base}-${n}`;
    }

    const password = args.password?.trim() || null;
    const isPublic = args.isPublic ?? false;

    if (ctx.dryRun) {
      return {
        success: true,
        simulated: true,
        message: `Would create the gallery "${title}" at /gallery/${slug}`
          + (clientName ? ` for ${clientName}.` : '.'),
      };
    }

    const [created] = await db.insert(galleries).values({
      title,
      slug,
      description: args.description?.trim() || null,
      clientId: args.clientId || null,
      isPublic,
      isPasswordProtected: !!password,
      password,
      downloadEnabled: args.downloadEnabled ?? true,
    }).returning();

    return {
      success: true,
      message: `Created "${title}"${clientName ? ` for ${clientName}` : ''} at /gallery/${slug}. `
        + `It has no photographs in it yet.`,
      gallery: { id: created.id, title: created.title, slug: created.slug },
    };
  },
};

registerTool(def);
export default def;
