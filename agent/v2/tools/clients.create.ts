/**
 * Client Create Tool
 * Tier 2: Medium-risk write
 *
 * WHY THIS DID NOT EXIST. Of the tools registered on the v2 bus, ten write and the rest
 * read — and there was no create tool for a client, which is the single most common thing a
 * photographer does in a CRM. The agent could search clients, report on them, update them
 * and invoice them, and could not add one. "Add Sarah Miller, sarah@example.com" ended in an
 * apology.
 *
 * DUPLICATES ARE THE REAL RISK HERE, not a bad field value. A studio dictating a client to
 * an assistant will not check first, and a CRM with the same person in it twice quietly
 * splits their history — some sessions under one row, some under the other. So this looks
 * before it writes, and REFUSES rather than creating a second copy.
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import { db } from "../../../server/db";
import { crmClients } from "../../../shared/schema";
import { eq, and, ilike } from "drizzle-orm";

const params = z.object({
  // The two the table requires. Everything else is genuinely optional, and asking a studio
  // for a postcode before it will save a name is how a tool stops being used.
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("A valid email, or leave it out").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  company: z.string().optional(),
  leadSource: z.string().optional(),
  notes: z.string().optional(),
  __confirm: z.boolean().optional(),
});

const def: ToolDef<typeof params> = {
  name: "clients_create",
  description:
    "Add a new client to the CRM. Requires a first and last name; everything else is "
    + "optional. Refuses if a client with the same email, or the same full name, already "
    + "exists — say so rather than creating a second record for the same person.",
  parameters: params,
  authz: ["CRM_WRITE"],
  risk: "medium",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    const { __confirm, ...fields } = args;
    const firstName = fields.firstName.trim();
    const lastName = fields.lastName.trim();
    const email = fields.email?.trim() || null;

    // EMAIL FIRST. It is the identifier a human actually uses, and two people at the same
    // studio genuinely can share a name.
    if (email) {
      const [byEmail] = await db.select().from(crmClients)
        .where(eq(crmClients.email, email)).limit(1);
      if (byEmail) {
        throw new Error(
          `${byEmail.firstName} ${byEmail.lastName} is already in the CRM with that email `
          + `address. Update that record instead of creating a second one.`,
        );
      }
    }

    // Then the full name, case-insensitively. Weaker evidence than an email, so it is
    // reported as something to check rather than treated as certain — but creating the
    // duplicate anyway and letting somebody find it later is the worse outcome.
    const [byName] = await db.select().from(crmClients)
      .where(and(ilike(crmClients.firstName, firstName), ilike(crmClients.lastName, lastName)))
      .limit(1);
    if (byName) {
      throw new Error(
        `There is already a client called ${byName.firstName} ${byName.lastName}`
        + `${byName.email ? ` (${byName.email})` : ''}. If this is a different person, add `
        + `something that distinguishes them — a company, or their email.`,
      );
    }

    if (ctx.dryRun) {
      return {
        success: true,
        simulated: true,
        message: `Would add ${firstName} ${lastName} to the CRM.`,
        client: { firstName, lastName, email },
      };
    }

    const [created] = await db.insert(crmClients).values({
      firstName,
      lastName,
      email,
      phone: fields.phone?.trim() || null,
      address: fields.address?.trim() || null,
      city: fields.city?.trim() || null,
      state: fields.state?.trim() || null,
      zip: fields.zip?.trim() || null,
      country: fields.country?.trim() || null,
      company: fields.company?.trim() || null,
      leadSource: fields.leadSource?.trim() || null,
      notes: fields.notes?.trim() || null,
      status: "active",
    }).returning();

    return {
      success: true,
      message: `Added ${firstName} ${lastName} to the CRM.`,
      client: {
        id: created.id,
        firstName: created.firstName,
        lastName: created.lastName,
        email: created.email,
      },
    };
  },
};

registerTool(def);
export default def;
