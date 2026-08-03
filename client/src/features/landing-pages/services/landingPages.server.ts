/**
 * Server-side landing page service reference.
 *
 * In TogNinja the server layer lives in two places:
 *   1. database.js — raw SQL functions accessed via `neonDb` in routes
 *   2. server/routes.ts — Express route handlers
 *
 * The following functions are already implemented in database.js:
 *
 *   neonDb.getLandingPages(status?)         — list pages (optionally filtered)
 *   neonDb.getLandingPage(id)               — fetch one page
 *   neonDb.getLandingPageBySlug(slug)       — fetch published page by slug
 *   neonDb.createLandingPage(data)          — insert new page
 *   neonDb.updateLandingPage(id, data)      — update page fields
 *   neonDb.deleteLandingPage(id)            — delete page
 *   neonDb.duplicateLandingPage(id)         — clone with new slug
 *   neonDb.checkSlugAvailable(slug, id?)    — uniqueness check
 *   neonDb.createLandingPageRevision(...)   — version history
 *
 * All of these are user-scoped at the route layer via authenticateUser
 * middleware, which adds req.user to the request context.
 *
 * TODO: Phase 2 — add AI generation helper (wraps OpenAI call)
 * TODO: Phase 3 — add publish/unpublish lifecycle with revision snapshots
 * TODO: Phase 4 — add rendered_html caching for public pages
 */

export {};
