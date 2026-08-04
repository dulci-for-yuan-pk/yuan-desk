/* /api/health — what is wired and what is not.
   Reports only whether each piece is configured, never the values. */
import { json, env, guard, hasDb, rpc } from './_lib.js';

export default async req => {
  const stop = guard(req); if (stop) return stop;

  let dbOk = false, dbError = null;
  if (hasDb()) {
    try { dbOk = !!(await rpc('ping')).ok; }
    catch (e) { dbError = String(e.message || e).slice(0, 120); }
  }

  return json({
    ok: true,
    database: { configured: hasDb(), reachable: dbOk, error: dbError },
    dulci: {
      outbound: !!env('AGENT_WEBHOOK_URL'),      // the desk can reach DULCi
      inbound: !!env('APP_AGENT_SECRET'),        // DULCi can answer into the desk
      signed: !!env('AGENT_WEBHOOK_SECRET')
    },
    passcode: { hardened: !!env('APP_PIN_HASH') },
    sheetMirror: !!env('GSHEET_WEBHOOK_URL')
  });
};
