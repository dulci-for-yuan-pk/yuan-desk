/* POST /api/login  { pin }  -> sets the session cookie */
import crypto from 'node:crypto';
import { json, bad, env, makeSession, sessionCookie } from './_lib.js';

const DEFAULT_PIN = '7563';

const hash = (pin, salt) =>
  crypto.createHash('sha256').update(String(pin) + String(salt)).digest('hex');

export default async req => {
  if (req.method !== 'POST') return bad('method', 405);

  let pin = '';
  try { ({ pin } = await req.json()); } catch { return bad('body'); }
  pin = String(pin || '').trim();
  if (!/^\d{4,8}$/.test(pin)) return bad('pin', 401);

  const salt = env('APP_PIN_SALT');
  const want = env('APP_PIN_HASH');

  let ok;
  if (want) {
    const got = hash(pin, salt);
    ok = got.length === want.length &&
         crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
  } else {
    // No hash configured yet — fall back to the agreed passcode so the app
    // is usable the moment it deploys. Set APP_PIN_HASH to lock it down.
    ok = pin === DEFAULT_PIN;
  }

  if (!ok) {
    await new Promise(r => setTimeout(r, 600)); // slow down guessing
    return bad('wrong-pin', 401);
  }

  return json(
    { ok: true, configured: !!env('AGENT_WEBHOOK_URL'), hardened: !!want },
    200,
    { 'set-cookie': sessionCookie(makeSession(), 120 * 86400) }
  );
};
