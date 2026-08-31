// GET /api/capabilities — what this studio can do, and what is stopping the rest.
//
// One endpoint behind the padlocks. The client gate reads this rather than each screen
// working out for itself whether a key is present, which is how three features ended up
// with three different-looking refusals.
import { Router, type Request, type Response } from 'express';
import { capabilityStates } from '../lib/capabilities';
import { firstTasks } from '../lib/firstTasks';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const states = await capabilityStates();
    // The things that need DOING rather than connecting — prices and clients. Same question
    // the dashboard is asking, so the same request; kept out of CAPABILITIES because that
    // registry means "gated on a credential" and eight other callers rely on it meaning that.
    const tasks = await firstTasks().catch(() => []);
    res.json({
      tasks,
      capabilities: states.map((c) => ({
        key: c.key,
        label: c.label,
        available: c.available,
        // The state, not just the verdict. A studio mid-Stripe-verification is neither
        // "ready" nor "not set up", and a boolean has to call it one of those.
        status: c.status,
        statusDetail: c.statusDetail ?? null,
        owner: c.owner,
        // Only for the studio's own keys. A link to a settings page that cannot fix a
        // platform credential is worse than no link.
        settingsPath: c.owner === 'studio' ? c.settingsPath : null,
        blockedMessage: c.blockedMessage,
        worksWithout: c.worksWithout,
      })),
    });
  } catch (e: any) {
    // A capability check that fails must not lock the product. Reporting nothing is read by
    // the client as "no gates known", which leaves every screen usable — the opposite
    // failure, padlocking everything because a query threw, would be far worse.
    console.warn('[capabilities] could not evaluate:', e?.message || e);
    res.json({ capabilities: [], tasks: [] });
  }
});

export default router;
