// Production-safe server entry point with TypeScript support
try {
  // Try to register tsx for TypeScript execution first
  const { register } = await import("tsx/esm");
  register();
  console.log("🔥 Starting server with TypeScript support...");
  await import("./server/index.ts");
} catch (err) {
  console.error("❌ Failed to start server:", err);
  console.error("Stack trace:", err.stack);
  process.exit(1);
}
