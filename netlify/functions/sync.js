/* /api/sync — the offline queue lands here.
   POST { ops: [ { collection, item } | { collection, deleteId } ] }
   Applies everything his phone did with no signal, then hands back the
   authoritative books so both sides agree. Each op reports its own fate,
   so one bad record can never block the rest of his day's work. */
import { json, bad, guard } from './_lib.js';
import { readAll, upsert, remove, COLLECTIONS, hasDb } from './_store.js';

export default async req => {
  const stop = guard(req); if (stop) return stop;
  if (req.method !== 'POST') return bad('method', 405);

  let body = {};
  try { body = await req.json(); } catch { return bad('body'); }
  const ops = Array.isArray(body.ops) ? body.ops.slice(0, 400) : [];

  const applied = [], failed = [];
  for (const op of ops) {
    const c = op.collection;
    if (!COLLECTIONS.includes(c)) { failed.push({ op, error: 'collection' }); continue; }
    try {
      if (op.deleteId) { await remove(c, op.deleteId); applied.push(op.id ?? op.deleteId); }
      else if (op.item && op.item.id) { await upsert(c, op.item); applied.push(op.id ?? op.item.id); }
      else failed.push({ op, error: 'item' });
    } catch (e) {
      failed.push({ op, error: String(e.message || e) });
    }
  }

  return json({
    ok: true, applied, failed,
    data: await readAll(),
    db: hasDb(),
    at: new Date().toISOString()
  });
};
