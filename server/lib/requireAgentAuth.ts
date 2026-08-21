// Authentication for the agent endpoints.
//
// server/index.ts mounted `app.use('/api/agent/v2', agentV2Routes)` with NO middleware,
// and server/routes/agent-v2.ts then defaulted an unidentified caller to
//   userId "demo_user", studioId "demo_studio", role "photographer"
// — a role getUserScopes grants CRM_WRITE, INV_WRITE, EMAIL_SEND, CALENDAR_WRITE,
// SESSION_WRITE and PRICE_WRITE. Confirmed live: GET /api/agent/v2/stats returned 200 to
// an unauthenticated request and handed back the whole tool registry.
//
// The only reason that was not a data-modification hole is a separate bug —
// agent-v2.ts truncates the tool list to 20, which happens to cut every write tool. One
// defect was accidentally containing another, which is why this middleware has to land
// BEFORE the truncation is fixed, not after.
//
// Deliberately the same three credentials authenticateUser accepts (session, JWT bearer,
// X-Admin-Token), because the admin UI already sends `credentials: 'include'` on every
// agent call and a headless caller may hold the admin token. Nothing that works today
// stops working.
import { requireAuth } from '../auth';

/**
 * Reject anonymous callers. On success `req.user` carries a real identity, so the route
 * can stop inventing one.
 */
export async function requireAgentAuth(req: any, res: any, next: any) {
  try {
    // 1. A browser session — how the admin UI calls this.
    if (req.session?.userId) return requireAuth(req, res, next);

    // 2. A JWT bearer token.
    const authHeader = String(req.headers['authorization'] || '');
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const jwt: any = await import('jsonwebtoken' as any);
        const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'default-secret';
        const decoded = jwt.default.verify(token, secret) as any;
        if (decoded?.userId) {
          req.user = { id: decoded.userId, role: decoded.role || 'admin', studioId: decoded.studioId };
          return next();
        }
      } catch (e: any) {
        console.warn('[agent-auth] JWT rejected:', e?.message);
      }
    }

    // 3. The headless admin token, for scripts and integrations.
    const adminToken = String(req.headers['x-admin-token'] || '');
    const expected = String(process.env.ADMIN_TOKEN || '');
    if (expected && adminToken && adminToken === expected) {
      req.user = { id: 'admin-token', role: 'admin' };
      return next();
    }

    return res.status(401).json({ error: 'Authentication required' });
  } catch (err: any) {
    console.error('[agent-auth] error:', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
