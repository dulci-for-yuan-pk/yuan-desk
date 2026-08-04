/* /api/callback — DULCi speaks into the desk.
   Header: x-yuan-secret: <APP_AGENT_SECRET>

   POST bodies:
     { kind:'reply',    text, audio?, image? }
     { kind:'browser',  url, instruction?, sessionId? }
     { kind:'record',   collection, item }
     { kind:'note',     text }
     { kind:'run',      id?, title, kind:'chat|schedule|…', status, summary?, cost_usd? }
     { kind:'task',     id?, title_ur, title_en, status, progress?, blocked_why? }
     { kind:'approval', approvalKind, title_ur, title_en, detail_ur?, detail_en?,
                        amount?, preview_url?, payload? }
   GET -> his recent messages, his books, the enquiry inbox and open ops. */
import { json, bad, agentAuthorised, validReplyToken, hasDb } from './_lib.js';
import { appendEvent, appendMessage, readMessages, readAll, ops, listEnquiries, COLLECTIONS,
  upsert, opsUpsert } from './_store.js';

/* Pulls remote audio into the desk so it plays without any login.
   Caps at 6 MB — a spoken sentence is a fraction of that. */
async function inlineAudio(url) {
  try {
    const ctl = AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined;
    const r = await fetch(url, { signal: ctl });
    if (!r.ok) return null;
    const type = r.headers.get('content-type') || 'audio/wav';
    if (!/^audio\//i.test(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length || buf.length > 6 * 1024 * 1024) return null;
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch { return null; }
}

export default async req => {
  const full = agentAuthorised(req);          // the skill's long-lived secret
  const token = !full && validReplyToken(req); // a run's short-lived reply token
  if (!full && !token) return bad('unauthorised', 401);

  // A reply token may write into the desk, but never read his books.
  if (req.method === 'GET') {
    if (!full) return bad('token-cannot-read', 403);
    const [messages, data, o, enquiries] = await Promise.all([
      readMessages(40), readAll(), ops().catch(() => ({})), listEnquiries().catch(() => [])
    ]);
    return json({ ok: true, db: hasDb(), messages, data, enquiries, ...o });
  }
  if (req.method !== 'POST') return bad('method', 405);

  let b = {};
  try { b = await req.json(); } catch { return bad('body'); }
  const kind = b.kind || 'reply';

  try {
    if (kind === 'reply') {
      if (!b.text && !b.audio) return bad('text-required');

      /* Audio has to PLAY on his phone. A link to a place that needs a login is
         worse than no audio at all — he would tap a dead player in front of a
         supplier. So fetch the bytes; if they cannot be fetched, refuse the
         audio and tell the caller exactly how to send it. */
      let audio = b.audio || '';
      let audioNote = null;
      if (audio && /^https?:\/\//i.test(audio)) {
        const inlined = await inlineAudio(audio);
        if (inlined) audio = inlined;
        else {
          audio = '';
          audioNote = 'audio-unreachable: that URL needs a login, so it will not play ' +
            'on his phone. Re-send it as a base64 data URL, e.g. ' +
            '{"kind":"reply","audio":"data:audio/wav;base64,..."}';
        }
      }

      await appendMessage({ role: 'ag', text: b.text || '', audio_url: audio || null });
      const seq = await appendEvent({
        kind: 'reply', text: b.text || '', audio, image: b.image || '' });
      return json({ ok: true, seq, ...(audioNote ? { warning: audioNote } : {}) });
    }

    if (kind === 'browser') {
      if (!b.url) return bad('url-required');
      return json({ ok: true, seq: await appendEvent({
        kind: 'browser', url: b.url, instruction: b.instruction || '', sessionId: b.sessionId || '' }) });
    }

    if (kind === 'record') {
      if (!COLLECTIONS.includes(b.collection) || !b.item || !b.item.id) return bad('record');
      await upsert(b.collection, b.item);
      return json({ ok: true, seq: await appendEvent({
        kind: 'record', collection: b.collection, item: b.item }) });
    }

    if (kind === 'note') {
      if (!b.text) return bad('text-required');
      return json({ ok: true, seq: await appendEvent({ kind: 'note', text: b.text }) });
    }

    /* ---------- operations desk ---------- */
    if (!hasDb()) return json({ ok: false, error: 'no-database' }, 503);

    if (kind === 'run') {
      const row = {
        ...(b.id ? { id: b.id } : {}),
        kind: b.runKind || 'chat', title: b.title || null, summary: b.summary || null,
        status: b.status || 'running', cost_usd: b.cost_usd ?? null,
        thread_url: b.thread_url || null,
        ...(b.status && b.status !== 'running' ? { ended_at: new Date().toISOString() } : {})
      };
      const saved = await opsUpsert('runs', row);
      return json({ ok: true, id: saved && saved.id });
    }

    if (kind === 'task') {
      const row = {
        ...(b.id ? { id: b.id } : {}),
        title_ur: b.title_ur || null, title_en: b.title_en || null, detail: b.detail || null,
        status: b.status || 'queued', progress: b.progress ?? 0,
        blocked_why: b.blocked_why || null, run_id: b.run_id || null
      };
      const saved = await opsUpsert('tasks', row);
      await appendEvent({ kind: 'ops', what: 'task', id: saved && saved.id, status: row.status });
      return json({ ok: true, id: saved && saved.id });
    }

    if (kind === 'approval') {
      const row = {
        kind: b.approvalKind || 'publish',
        title_ur: b.title_ur || null, title_en: b.title_en || null,
        detail_ur: b.detail_ur || null, detail_en: b.detail_en || null,
        amount: b.amount ?? null, preview_url: b.preview_url || null,
        payload: b.payload || {}, status: 'pending'
      };
      const saved = await opsUpsert('approvals', row);
      await appendEvent({
        kind: 'approval', id: saved && saved.id,
        title: row.title_ur || row.title_en || '',
        text: row.title_ur || row.title_en || 'آپ کی منظوری درکار ہے'
      });
      return json({ ok: true, id: saved && saved.id });
    }

    return bad('unknown-kind');
  } catch (e) {
    return json({ ok: false, error: String(e.message || e) }, 502);
  }
};
