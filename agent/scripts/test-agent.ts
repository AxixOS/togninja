#!/usr/bin/env node
import { runAgentCLI } from "../run-agent";

async function main() {
  console.log("=== Testing Multi-Studio AI Agent System ===");
  console.log("Running pipeline summary test...\n");
  
  try {
    await runAgentCLI();
  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

// ES module equivalent of require.main === module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}