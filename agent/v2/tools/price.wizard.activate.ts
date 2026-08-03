/**
 * Price Wizard Activate Tool
 * Tier 2: Medium-risk write tool
 * 
 * Activates AI-generated price suggestions to the price_lists table
 */

import { z } from "zod";
import { registerTool } from "../core/ToolBus";
import { ToolDef, ToolContext } from "../core/Types";
import pkg from 'pg';
const { Pool } = pkg;

// Create pool connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
});

// Zod schema for parameter validation
const params = z.object({
  sessionId: z.string().uuid().describe("Price wizard session ID containing the suggestions to activate"),
  suggestionIds: z.array(z.string().uuid()).optional()
    .describe("Specific suggestion IDs to activate (if omitted, activates all pending suggestions)"),
  priceAdjustments: z.record(z.string(), z.number()).optional()
    .describe("Optional price adjustments as { suggestionId: newPrice }"),
  serviceCategory: z.string().default("Photography").optional()
    .describe("Service category for price list (default: Photography)")
});

// Tool definition
const def: ToolDef<typeof params> = {
  name: "price_wizard_activate",
  description: `Activate AI-generated price suggestions to your active price lists.

This tool will:
1. Retrieve approved price suggestions from a research session
2. Optionally adjust prices before activation
3. Create or update entries in the price_lists table
4. Mark suggestions as "activated" to prevent duplicates
5. Link suggestions to created price list items

Use this to answer questions like:
- "Activate the recommended family photography prices"
- "Add the standard tier pricing from my research to price lists"
- "Create price list entries from session abc-123-def"
- "Activate newborn photography prices with 10% increase"

⚠️  REQUIRES USER CONFIRMATION in auto_safe mode
This tool modifies your public pricing, so review suggestions first.

Returns: Summary of activated prices with created price list item IDs`,
  parameters: params,
  authz: ["CRM_WRITE", "PRICE_WRITE"],
  risk: "medium",
  handler: async (ctx: ToolContext, args: z.infer<typeof params>) => {
    try {
      ctx.log(`🔄 Activating price suggestions from session ${args.sessionId}`);

      // Verify session exists and is completed
      const sessionCheck = await pool.query(`
        SELECT status, suggestions_generated 
        FROM price_wizard_sessions 
        WHERE id = $1
      `, [args.sessionId]);

      if (sessionCheck.rows.length === 0) {
        throw new Error(`Session ${args.sessionId} not found`);
      }

      const session = sessionCheck.rows[0];
      
      if (session.status !== 'completed') {
        throw new Error(`Session status is '${session.status}', must be 'completed' to activate prices`);
      }

      if (session.suggestions_generated === 0) {
        throw new Error(`Session has no price suggestions to activate`);
      }

      // Get suggestions to activate
      let suggestionsQuery = `
        SELECT id, service_type, tier, suggested_price, reasoning, status
        FROM price_list_suggestions
        WHERE session_id = $1 AND status = 'pending_review'
      `;
      
      const queryParams: any[] = [args.sessionId];

      if (args.suggestionIds && args.suggestionIds.length > 0) {
        suggestionsQuery += ` AND id = ANY($2)`;
        queryParams.push(args.suggestionIds);
      }

      const suggestionsResult = await pool.query(suggestionsQuery, queryParams);
      const suggestions = suggestionsResult.rows;

      if (suggestions.length === 0) {
        return {
          success: false,
          message: "No pending suggestions found to activate. They may have already been activated or rejected.",
          activated_count: 0
        };
      }

      ctx.log(`📋 Found ${suggestions.length} suggestions to activate`);

      // Activate each suggestion
      const activated = [];
      
      for (const suggestion of suggestions) {
        const suggestionId = suggestion.id;
        let finalPrice = suggestion.suggested_price;

        // Apply manual adjustment if provided
        if (args.priceAdjustments && args.priceAdjustments[suggestionId]) {
          finalPrice = args.priceAdjustments[suggestionId];
          ctx.log(`💰 Adjusted ${suggestion.service_type} ${suggestion.tier}: €${suggestion.suggested_price} → €${finalPrice}`);
        }

        // Create price list entry
        const priceListResult = await pool.query(`
          INSERT INTO price_lists (
            service_name,
            category,
            price,
            description,
            active
          ) VALUES ($1, $2, $3, $4, true)
          RETURNING id, service_name, price
        `, [
          `${suggestion.service_type} (${suggestion.tier})`,
          args.serviceCategory || 'Photography',
          finalPrice,
          suggestion.reasoning
        ]);

        const priceListItem = priceListResult.rows[0];

        // Mark suggestion as activated
        await pool.query(`
          UPDATE price_list_suggestions
          SET 
            status = 'activated',
            activated_product_id = $2,
            updated_at = NOW()
          WHERE id = $1
        `, [suggestionId, priceListItem.id]);

        activated.push({
          suggestion_id: suggestionId,
          price_list_id: priceListItem.id,
          service: suggestion.service_type,
          tier: suggestion.tier,
          price: finalPrice,
          original_price: suggestion.suggested_price,
          adjusted: finalPrice !== suggestion.suggested_price
        });

        ctx.log(`✅ Activated: ${suggestion.service_type} ${suggestion.tier} at €${finalPrice}`);
      }

      return {
        success: true,
        session_id: args.sessionId,
        activated_count: activated.length,
        activated_prices: activated,
        total_revenue_potential: activated.reduce((sum, p) => sum + p.price, 0),
        summary: {
          basic_tier: activated.filter(p => p.tier === 'basic').length,
          standard_tier: activated.filter(p => p.tier === 'standard').length,
          premium_tier: activated.filter(p => p.tier === 'premium').length
        },
        next_steps: [
          "Review activated prices in your public price list",
          "Update service descriptions and package details as needed",
          "Consider A/B testing different pricing tiers",
          "Monitor booking rates and adjust prices based on demand"
        ]
      };

    } catch (error: any) {
      ctx.log(`❌ Price activation failed: ${error.message}`);
      throw new Error(`Failed to activate prices: ${error.message}`);
    }
  }
};

// Register the tool
registerTool(def);

export default def;
