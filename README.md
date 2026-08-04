# Yuan Desk

A private, installable business cockpit and DULCi console for **Mirza Javaid Iqbal**
(Yuan.pk — China sourcing and import, Multan → Yiwu).

Built to be usable by a non-technical Urdu-speaking businessman on an iPhone,
and to keep working when Telegram is blocked.

## What it does

| Screen | Purpose |
|---|---|
| Home | One large microphone, three live figures, four big tiles |
| Talk | Chat with DULCi — Urdu text, voice notes, photos, audio replies |
| Screen | DULCi hands over its live browser so he types his own passwords |
| Business | Receivables, payables, cash, stock value, six-month cash chart |
| Khata | Party-wise ledger with running balance for customers and suppliers |
| Cash book | Every rupee in and out with a running balance |
| Stock | Bought, sold, on-hand, valuation, reorder warnings |
| Landed cost | Yuan → rupees per piece, with freight, duty, tax and margin |
| Invoices | Numbered, bilingual, amount in words, print/PDF, WhatsApp share |
| Orders, customers, suppliers, shipments, trips, content | Records |

Bookkeeping runs entirely in the app — **no agent run, no cost**. Only talking to DULCi spends anything.

| Work | Approvals waiting on one tap, live task status, and DULCi's run log with cost |
| Interpreter | Full screen for a Yiwu counter: Urdu in, Chinese on screen and aloud |
| Sourcing plan | The order book as an itinerary by market district |

## Architecture

```
public/            static app (installs to the iPhone home screen)
  js/app.js        core: state, books UI, offline sync engine
  js/books.js      every rupee calculation
  js/ops.js        operations desk: approvals, tasks, runs, interpreter, plan
  js/ui.js         themes, living background, motion, microphone
netlify/functions/ server layer — holds every secret
  login.js         passcode check, signed HttpOnly session cookie
  chat.js          relays his message to DULCi's webhook
  state.js         DULCi's replies, handoffs, and what awaits his approval
  ack.js           tells DULCi he finished a login
  data.js          read and write his books
  sync.js          replays everything his phone did while offline
  ops.js           approvals and task control
  callback.js      DULCi speaks back in (x-yuan-secret)
  web-order.js     the only public door: yuan.pk's order form
  _store.js        Postgres when configured, file storage when not
db/schema.sql      the database
```

A static page cannot hold a secret, and a webhook cannot answer synchronously —
hence the thin function layer.

## Database

Postgres on Supabase, in two hard-separated schemas:

- **`desk`** — his books (parties, orders, invoices and lines, payments, ledger,
  stock and moves, shipments, trips, sourcing plan, content) plus the agent
  tables (conversation, events, runs, approvals, tasks, settings).
- **`web`** — only what the public yuan.pk form writes. It cannot read the books.

**Security stance:** RLS is on for every table with **no policies**, and the anon
and authenticated roles are revoked. Nothing is readable without the service-role
key, which exists only in Netlify's environment. The browser holds no database
key at all — his passcode session is the only credential his phone carries.

Set it up by pasting `db/schema.sql` into the Supabase SQL editor, then add
`desk` and `web` under **Project settings → API → Exposed schemas**.

Every syncable row carries the id his phone generated (`client_id`), so a record
created with no signal in a market aisle lands exactly once when he reconnects.
Deletes are soft, so a stale phone can never resurrect a deleted row.

## Deploying

1. In Netlify: **Add new site → Import an existing project → GitHub → this repo**
2. Build settings: no build command, publish directory `public`
   (`netlify.toml` already sets this, plus the `/api/*` routing)
3. Set the environment variables from `.env.example`
4. Deploy, then set **Site visibility → Public**

## Environment variables

| Variable | Where it comes from |
|---|---|
| `AGENT_WEBHOOK_URL` | DULCi → Invocations → Webhook |
| `AGENT_WEBHOOK_SECRET` | same place |
| `APP_SESSION_SECRET` | invent a long random string |
| `APP_AGENT_SECRET` | invent a long random string; DULCi sends it back as `x-yuan-secret` |
| `APP_PIN_SALT` / `APP_PIN_HASH` | optional hardening; without them the agreed passcode works |

Until the webhook variables are set the app runs and the books work — the chat
says plainly that DULCi is not connected rather than failing silently.

## How DULCi answers into the app

`POST /api/callback` with header `x-yuan-secret: <APP_AGENT_SECRET>`:

```json
{ "kind": "reply",   "text": "…", "audio": "data:audio/wav;base64,…" }
{ "kind": "browser", "url": "https://…", "instruction": "اس اسکرین پر لاگ اِن کریں" }
{ "kind": "record",  "collection": "orders", "item": { "id": "…", "…": "…" } }
{ "kind": "note",    "text": "…" }
```

`GET /api/callback` with the same header returns his recent messages, his books,
and whether he finished the last browser handoff.
