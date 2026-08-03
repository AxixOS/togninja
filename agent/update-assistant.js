#!/usr/bin/env node

// Assistant updater for CRM agent system
import { OpenAI } from "openai";
import fs from "fs";
import path from "path";

const studioId = process.argv[2] || "newage";

// Replace with your OpenAI Assistant ID for the CRM agent
const ASSISTANT_ID = "asst_CH4vIbZPs7gUD36Lxf7vlfIV"; // CRM Operations Assistant

async function updateAssistant() {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Read the updated prompt
    const promptPath = path.join(process.cwd(), "prompts", "system-updated.txt");
    
    if (!fs.existsSync(promptPath)) {
      console.log("❌ No updated prompt found. Run: npx tsx agent/scripts/update-system-prompt.ts first");
      process.exit(1);
    }
    
    let promptTemplate = fs.readFileSync(promptPath, "utf8");
    
    // Replace template variables with actual values
    const prompt = promptTemplate
      .replace(/{{DATE}}/g, new Date().toISOString().split('T')[0])
      .replace(/{{POLICY_MODE}}/g, "auto_safe")
      .replace(/{{POLICY_AUTHORITIES_CSV}}/g, "CREATE_LEAD,UPDATE_CLIENT,SEND_INVOICE,SEND_EMAIL,MANAGE_VOUCHERS,READ_DASHBOARD,MANAGE_CALENDAR,MANAGE_FILES,MANAGE_BLOG,MANAGE_CAMPAIGNS,MANAGE_QUESTIONNAIRES,GENERATE_REPORTS,MANAGE_SYSTEM,MANAGE_INTEGRATIONS,MANAGE_AUTOMATION,MANAGE_PORTAL")
      .replace(/{{POLICY_AMOUNT_LIMIT}}/g, "500")
      .replace(/{{STUDIO_CURRENCY}}/g, "EUR");

    // Update the assistant
    const response = await openai.beta.assistants.update(ASSISTANT_ID, {
      instructions: prompt,
      name: "CRM Operations Assistant v3",
      description: "Comprehensive CRM agent with 63 tools for complete photography business management"
    });

    console.log(`✅ Assistant updated successfully: ${response.id}`);
    console.log(`📝 Instructions length: ${prompt.length} characters`);
    console.log(`🔧 Studio: ${studioId}`);
    console.log(`📋 Ready to test all 63 tools`);
    
  } catch (error) {
    console.error("❌ Failed to update assistant:", error.message);
    process.exit(1);
  }
}

updateAssistant();