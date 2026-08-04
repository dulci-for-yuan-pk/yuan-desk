/* /api/state?since=N — DULCi's replies, browser handoffs, and anything
   waiting for his approval. This is what the app polls. */
import { json, guard, env, hasDb } from './_lib.js';
import { readEvents, ops } from './_store.js';

export default async req => {
  const stop = guard(req); if (stop) return stop;
  const since = Number(new URL(req.url).searchParams.get('since') || 0);

  const { seq, events } = await readEvents(since);
  let pending = 0, working = 0;
  if (hasDb()) {
    try {
      const o = await ops();
      pending = o.approvals.filter(a => a.status === 'pending').length;
      working = o.tasks.filter(t => ['queued', 'working'].includes(t.status)).length;
    } catch { /* the feed still works without the counters */ }
  }

  return json({
    ok: true, seq, events,
    connected: !!env('AGENT_WEBHOOK_URL'),
    db: hasDb(),
    pending, working
  });
};
