/**
 * Boot-check: load the server modules that do work at IMPORT time so a
 * load-order error (e.g. a temporal-dead-zone ReferenceError from a
 * module-level const evaluating a function that reads a not-yet-initialised
 * const) fails the BUILD instead of crash-looping a live dyno.
 *
 * A normal build does NOT execute module bodies, so this class of error is
 * invisible until the server actually starts — which is how a broken deploy
 * once took the site down. Chained after the build in `heroku-postbuild`.
 *
 * Keep this to modules with real module-level evaluation and NO side effects
 * (no listen(), no DB). server/vite.ts is where such top-level work lives.
 */
async function main() {
  await import('../server/vite.ts');
  console.log('✅ boot-check: server modules load without a load-order error');
}

main().catch((err: any) => {
  console.error('❌ boot-check FAILED — server would crash on start:', err?.message || err);
  process.exit(1);
});
