#!/usr/bin/env npx tsx
// Test script for lead creation

import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const studioId = process.argv[2] || "e5dc81e8-7073-4041-8814-affb60f4ef6c";

async function testLeadCreate() {
  try {
    const { data, error } = await sb.from("crm_leads").insert({
      studio_id: studioId,
      first_name: "Test",
      last_name: "Lead", 
      email: "test@example.com",
      phone: "+43123456789",
      message: "Test lead creation from agent system",
      status: "new",
      source: "agent-test"
    }).select().single();

    if (error) {
      console.error("Error creating test lead:", error);
      process.exit(1);
    }

    console.log("✅ Test lead created successfully:", data.id);
    console.log("Lead details:", { name: `${data.first_name} ${data.last_name}`, email: data.email });
  } catch (error) {
    console.error("Failed to create test lead:", error);
    process.exit(1);
  }
}

testLeadCreate();