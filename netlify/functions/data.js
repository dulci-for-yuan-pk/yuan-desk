/* /api/data — his books.
   GET                            -> every collection
   POST { collection, item }      -> upsert one record
   POST { collection, deleteId }  -> remove one record
   No agent run involved, so bookkeeping costs nothing. */
import { json, bad, guard } from './_lib.js';
import { readAll, upsert, remove, COLLECTIONS, hasDb } from './_store.js';

export default async req => {
  const stop = guard(req); if (stop) return stop;

  if (req.method === 'GET') {
    return json({ ok: true, data: await readAll(), db: hasDb() });
  }
  if (req.method !== 'POST') return bad('method', 405);

  let body = {};
  try { body = await req.json(); } catch { return bad('body'); }
  const { collection, item, deleteId } = body;
  if (!COLLECTIONS.includes(collection)) return bad('collection');

  try {
    if (deleteId) { await remove(collection, deleteId); return json({ ok: true, deleted: deleteId }); }
    if (!item || !item.id) return bad('item');
    await upsert(collection, item);
    return json({ ok: true, saved: item.id });
  } catch (e) {
    return json({ ok: false, error: String(e.message || e) }, 502);
  }
};
