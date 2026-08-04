/* /api/ack — he finished (or cancelled) a login on the handed-over browser screen. */
import { json, bad, guard, callAgent } from './_lib.js';
import { appendEvent } from './_store.js';

export default async req => {
  const stop = guard(req); if (stop) return stop;
  if (req.method !== 'POST') return bad('method', 405);

  let body = {};
  try { body = await req.json(); } catch { return bad('body'); }
  const { done = false, sessionId = '' } = body;

  await appendEvent({ kind: 'ack-recorded', done, sessionId });

  await callAgent({
    message: done
      ? 'He has completed the login on the handed-over browser screen. Continue the task.'
      : 'He cancelled the browser login. Stop and ask him what to do instead.',
    event: 'screen-ack', done, sessionId
  }, { origin: new URL(req.url).origin });

  return json({ ok: true });
};
