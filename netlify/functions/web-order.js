/* /api/web-order — the only public door in the whole system.
   POST (no login) : yuan.pk's order form posts here; the row lands in the
                     separate `web` schema, which cannot read his books.
   GET  (his login): the enquiry inbox for the desk.

   Deliberately narrow: a fixed field list, hard length caps, a honeypot,
   and no way to reach anything else in the database. */
import { json, bad, env, guard, callAgent } from './_lib.js';
import { addEnquiry, listEnquiries, appendEvent } from './_store.js';

const ALLOWED = ['https://yuan.pk', 'https://www.yuan.pk',
  'https://yuanpk.netlify.app'];   // the site's address until the domain is pointed
const cors = origin => ({
  'access-control-allow-origin': ALLOWED.includes(origin) ? origin : ALLOWED[0],
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400'
});
const cap = (v, n) => String(v ?? '').trim().slice(0, n);

export default async req => {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

  if (req.method === 'GET') {
    const stop = guard(req); if (stop) return stop;
    return json({ ok: true, enquiries: await listEnquiries() });
  }
  if (req.method !== 'POST') return bad('method', 405);

  let b = {};
  try { b = await req.json(); } catch { return bad('body'); }

  if (b.website) return json({ ok: true }, 200, cors(origin));      // honeypot: silent success
  const name = cap(b.name, 120), phone = cap(b.phone, 40);
  if (!name || !phone) return json({ ok: false, error: 'name-and-phone' }, 400, cors(origin));

  const row = {
    name, phone,
    city: cap(b.city, 80) || null,
    item: cap(b.item, 300) || null,
    qty: cap(b.qty, 60) || null,
    message: cap(b.message, 2000) || null,
    source: cap(b.source, 40) || 'yuan.pk'
  };

  try {
    await addEnquiry(row);

    // he should see it on his desk without asking
    await appendEvent({
      kind: 'note',
      text: `نیا آرڈر ویب سائٹ سے — ${row.name} (${row.phone})${row.item ? ' — ' + row.item : ''}`
    });

    // keep the human-readable mirror alive, and tell DULCi so it can quote
    const mirror = env('GSHEET_WEBHOOK_URL');
    if (mirror) {
      fetch(mirror, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(row) }).catch(() => {});
    }
    callAgent({
      message: `A new enquiry arrived from yuan.pk: ${row.name}, ${row.phone}, ` +
               `${row.city || 'city unknown'} — wants ${row.item || 'unspecified goods'} ` +
               `(${row.qty || 'qty unstated'}). Message: ${row.message || 'none'}. ` +
               `Draft a reply for him to approve, and add it to the order book.`,
      event: 'web-enquiry', enquiry: row
    }, { origin: new URL(req.url).origin }).catch(() => {});

    return json({ ok: true }, 200, cors(origin));
  } catch (e) {
    return json({ ok: false, error: String(e.message || e) }, 502, cors(origin));
  }
};
