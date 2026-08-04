/* /api/chat — his message goes to DULCi. The webhook secret never leaves this process. */
import { json, bad, env, guard, callAgent } from './_lib.js';
import { appendMessage, appendEvent } from './_store.js';

export default async req => {
  const stop = guard(req); if (stop) return stop;
  if (req.method !== 'POST') return bad('method', 405);

  let body = {};
  try { body = await req.json(); } catch { return bad('body'); }
  const { text = '', image = '', audio = '', lang = 'ur', mode = 'chat' } = body;
  if (!text && !image && !audio) return bad('empty');

  await appendMessage({ role: 'me', text, lang });

  const hook = env('AGENT_WEBHOOK_URL');
  if (!hook) {
    await appendEvent({
      kind: 'note',
      text: lang === 'ur'
        ? 'DULCi سے رابطہ ابھی مکمل نہیں ہوا۔ آپ کا پیغام محفوظ ہے۔'
        : 'DULCi is not connected yet. Your message has been saved.'
    });
    return json({ ok: true, queued: false, connected: false });
  }

  const origin = new URL(req.url).origin;

  /* mode tells DULCi how to answer:
     chat        — normal conversation
     interpreter — he is standing in front of a supplier: translate, nothing else */
  const r = await callAgent({
    message: text || (image ? '[photo]' : '[voice note]'),
    text, image: image || undefined, audio: audio || undefined, lang, mode
  }, { origin });

  if (r.ok) return json({ ok: true, queued: true, connected: true, scheme: r.scheme });

  await appendEvent({
    kind: 'note',
    text: lang === 'ur' ? 'پیغام بھیجنے میں مسئلہ ہوا۔ دوبارہ کوشش کریں۔'
                        : 'The message could not be delivered. Please try again.'
  });
  return json({ ok: false, error: r.reason, status: r.status, detail: r.detail }, 502);
};
