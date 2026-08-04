/* Shared plumbing. Every secret stays in this process — never in the page. */
import crypto from 'node:crypto';
import CFG from './config.js';

/* Environment variables win; the bundled config is the fallback so a
   self-contained deploy works even before the dashboard is filled in. */
export const env = k => process.env[k] || CFG[k] || '';

/* ---------- responses ---------- */
export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers }
  });
export const bad = (msg, status = 400) => json({ ok: false, error: msg }, status);

/* ---------- signed session cookie ---------- */
const b64u = b => Buffer.from(b).toString('base64url');
const sign = v => crypto.createHmac('sha256', env('APP_SESSION_SECRET') || 'dev-only-secret')
  .update(v).digest('base64url');

export function makeSession(days = 120) {
  const payload = b64u(JSON.stringify({ u: 'javaid', exp: Date.now() + days * 864e5 }));
  return payload + '.' + sign(payload);
}
export function validSession(req) {
  const raw = (req.headers.get('cookie') || '').split(/;\s*/).find(c => c.startsWith('yd_sess='));
  if (!raw) return false;
  const [payload, sig] = decodeURIComponent(raw.slice(8)).split('.');
  if (!payload || !sig) return false;
  const expect = sign(payload);
  if (sig.length !== expect.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); }
  catch { return false; }
}
export const sessionCookie = (value, maxAge) =>
  `yd_sess=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export const guard = req => validSession(req) ? null : bad('unauthorised', 401);

/* ---------- a scoped, short-lived reply token ----------
   The payload we hand DULCi must let it answer, but a run's transcript is
   readable, so it must NOT carry the long-lived secret that can also read his
   books. This token expires, and callback.js only accepts it for writing a
   reply — never for reading the inbox. */
export function mintReplyToken(hours = 6) {
  const exp = String(Date.now() + hours * 3600e3);
  const sig = crypto.createHmac('sha256', env('APP_SESSION_SECRET') || 'dev-only-secret')
    .update('reply:' + exp).digest('base64url');
  return exp + '.' + sig;
}

export function validReplyToken(req) {
  const tok = req.headers.get('x-yuan-token') || '';
  const [exp, sig] = tok.split('.');
  if (!exp || !sig) return false;
  const expect = crypto.createHmac('sha256', env('APP_SESSION_SECRET') || 'dev-only-secret')
    .update('reply:' + exp).digest('base64url');
  if (sig.length !== expect.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return false;
  return Number(exp) > Date.now();
}

/* ---------- DULCi authenticating itself to us ---------- */
export function agentAuthorised(req) {
  const secret = env('APP_AGENT_SECRET');
  if (!secret) return false;
  const got = req.headers.get('x-yuan-secret') || '';
  const a = Buffer.from(got), b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ============================================================
   The database, reached through one narrow gateway function.

   There is deliberately no service-role key anywhere in this app. The
   publishable key can only call yd_call, and yd_call refuses everything
   unless DB_APP_SECRET is also correct — and that lives only here, in the
   server environment. A leaked page or publishable key gets nothing.
   ============================================================ */
export const hasDb = () =>
  !!(env('SUPABASE_URL') && env('SUPABASE_ANON_KEY') && env('DB_APP_SECRET'));

export async function rpc(action, payload = {}) {
  if (!hasDb()) throw new Error('no-database');
  const key = env('SUPABASE_ANON_KEY');
  const res = await fetch(env('SUPABASE_URL').replace(/\/$/, '') + '/rest/v1/rpc/yd_call', {
    method: 'POST',
    headers: {
      apikey: key,
      authorization: 'Bearer ' + key,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ p_secret: env('DB_APP_SECRET'), p_action: action, p_payload: payload })
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`db ${res.status}: ${text.slice(0, 300)}`);
  const out = text ? JSON.parse(text) : null;
  if (out && out.ok === false) throw new Error('db: ' + (out.error || 'refused'));
  return out;
}

/* ============================================================
   Talking to DULCi.

   The webhook's expected auth scheme is not documented in the dialog that
   creates it, so instead of guessing once and failing silently, the desk
   tries the plausible schemes in order, remembers the one that works, and
   reuses it. If every scheme is refused it says so plainly.
   ============================================================ */
const SCHEMES = [
  /* The platform's own answer, learned from its 401 body:
     "Missing X-Hyperagent-Webhook-Secret header". The rest stay as fallbacks
     in case the contract ever changes. */
  { id: 'hyperagent', headers: s => ({ 'X-Hyperagent-Webhook-Secret': s }) },
  { id: 'x-webhook-secret', headers: s => ({ 'x-webhook-secret': s }) },
  { id: 'bearer',           headers: s => ({ authorization: 'Bearer ' + s }) },
  { id: 'x-hyperagent-secret', headers: s => ({ 'x-hyperagent-secret': s }) },
  { id: 'x-secret',         headers: s => ({ 'x-secret': s }) },
  { id: 'query',            headers: () => ({}), query: true },
  { id: 'body',             headers: () => ({}), body: true },
  { id: 'none',             headers: () => ({}) }
];

let learned = null;   // remembered for the life of this function instance

export async function callAgent(payload, { origin } = {}) {
  const hook = env('AGENT_WEBHOOK_URL');
  if (!hook) return { ok: false, reason: 'not-configured' };
  const secret = env('AGENT_WEBHOOK_SECRET');

  const url0 = (origin || '') + '/api/callback';
  const body = {
    ...payload,
    source: 'yuan-desk',
    reply_to: {
      url: url0,
      token: mintReplyToken(6),
      how: [
        `POST ${url0} with header 'x-yuan-token: <token>' (valid 6 hours).`,
        `Reply to him:      {"kind":"reply","text":"<Urdu>","audio":"data:audio/wav;base64,..."}`,
        `Quiet system line: {"kind":"note","text":"<Urdu>"}`,
        `Hand over a login: {"kind":"browser","url":"...","instruction":"<Urdu>"}`,
        `Show progress:     {"kind":"task","title_ur":"...","title_en":"...","status":"working","progress":40}`,
        `Ask permission:    {"kind":"approval","approvalKind":"publish|post|submit|payment|message",` +
          `"title_ur":"...","title_en":"...","detail_ur":"..."}`,
        `Write to his books:{"kind":"record","collection":"orders","item":{...}}`,
        `Log the job:       {"kind":"run","title":"...","status":"done","cost_usd":0.01}`,
        `Book shapes — orders {id,no,date,customer,city,phone,item,qty,value,status,notes}; ` +
          `customers {id,name,city,phone,notes}; invoices {id,no,date,customer,lines:[{item,qty,rate}]}; ` +
          `payments {id,date,party,partyType,dir,amount,method,invoice}; ` +
          `ledger {id,date,type,amount,category,note}. Money is plain rupee numbers; dates YYYY-MM-DD; ` +
          `id is any string you choose (reuse it to update the same record). ` +
          `orders.status must be new|quoted|approved|shipped|done|cancelled; ` +
          `payments.dir and ledger.type are in|out. Close synonyms are accepted.`,
        `NEVER use an audio URL that needs a login — send the bytes as a data URL or it will not play.`
      ].join(' ')
    }
  };

  const order = learned
    ? [SCHEMES.find(x => x.id === learned), ...SCHEMES.filter(x => x.id !== learned)]
    : SCHEMES;

  let lastStatus = 0, lastBody = '';
  for (const sc of order) {
    if (!sc) continue;
    if (!secret && sc.id !== 'none') continue;          // nothing to send
    const url = sc.query ? hook + (hook.includes('?') ? '&' : '?') + 'secret=' +
      encodeURIComponent(secret) : hook;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...sc.headers(secret) },
        body: JSON.stringify(sc.body ? { ...body, secret } : body)
      });
      if (res.ok) { learned = sc.id; return { ok: true, scheme: sc.id }; }
      lastStatus = res.status;
      lastBody = (await res.text()).slice(0, 200);
      // only an auth refusal is worth retrying with another scheme
      if (res.status !== 401 && res.status !== 403) break;
    } catch (e) {
      lastStatus = 0; lastBody = String(e.message || e);
      break;
    }
  }
  return { ok: false, reason: 'refused', status: lastStatus, detail: lastBody };
}
