/* ============================================================
   Storage adapter — Postgres on Supabase over HTTPS.
   Zero npm dependencies on purpose: the whole server layer is plain ESM
   with node builtins and fetch, so it deploys with or without a build step.
   The phone-side shape of a record is translated here, once, at the boundary.
   ============================================================ */
import { hasDb, rpc } from './_lib.js';

export const COLLECTIONS = ['orders', 'invoices', 'customers', 'suppliers', 'shipments',
  'ledger', 'payments', 'stock', 'trips', 'content'];

/* Postgres is the only store. No npm dependencies, so this deploys
   without a build step. If the database is not configured the endpoints
   say so plainly rather than pretending to save his books. */
const NO_DB = () => { throw new Error('no-database'); };

const num = v => (v === '' || v === null || v === undefined) ? null : Number(v);
const str = v => (v === undefined || v === null || v === '') ? null : String(v);
const dt  = v => (v && /^\d{4}-\d{2}-\d{2}/.test(String(v))) ? String(v).slice(0, 10) : null;

/* ============================================================
   Mappers: phone shape  <->  database shape
   ============================================================ */
const M = {
  customers: {
    table: 'parties', fixed: { kind: 'customer' },
    filter: 'kind=eq.customer',
    to: r => ({ client_id: r.id, kind: 'customer', name: str(r.name) || '—', city: str(r.city),
      phone: str(r.phone), notes: str(r.notes), opening: num(r.opening) || 0 }),
    from: d => ({ id: d.client_id || d.id, name: d.name || '', city: d.city || '',
      phone: d.phone || '', notes: d.notes || '', opening: d.opening || '' })
  },
  suppliers: {
    table: 'parties', fixed: { kind: 'supplier' },
    filter: 'kind=eq.supplier',
    to: r => ({ client_id: r.id, kind: 'supplier', name: str(r.name) || '—', market: str(r.market),
      category: str(r.category), contact: str(r.contact), notes: str(r.notes) }),
    from: d => ({ id: d.client_id || d.id, name: d.name || '', market: d.market || '',
      category: d.category || '', contact: d.contact || '', notes: d.notes || '' })
  },
  orders: {
    table: 'orders',
    to: r => ({ client_id: r.id, no: str(r.no), order_date: dt(r.date), party_name: str(r.customer),
      city: str(r.city), phone: str(r.phone), item: str(r.item), qty: num(r.qty),
      value: num(r.value), status: r.status || 'new', source: r.source || 'manual',
      notes: str(r.notes) }),
    from: d => ({ id: d.client_id || d.id, no: d.no || '', date: d.order_date || '',
      customer: d.party_name || '', city: d.city || '', phone: d.phone || '', item: d.item || '',
      qty: d.qty ?? '', value: d.value ?? '', status: d.status || 'new',
      source: d.source || 'manual', notes: d.notes || '' })
  },
  invoices: {
    table: 'invoices', lines: true,
    to: r => ({ client_id: r.id, no: str(r.no) || ('INV-' + String(r.id).slice(-6)),
      inv_date: dt(r.date), due_date: dt(r.due), party_name: str(r.customer),
      discount: num(r.discount) || 0, tax_pct: num(r.tax) || 0, advance: num(r.advance) || 0,
      notes: str(r.notes) }),
    from: d => ({ id: d.client_id || d.id, no: d.no || '', date: d.inv_date || '',
      due: d.due_date || '', customer: d.party_name || '', discount: d.discount || '',
      tax: d.tax_pct || '', advance: d.advance || '', notes: d.notes || '',
      lines: (d.invoice_lines || []).sort((a, b) => a.sort - b.sort)
        .map(l => ({ item: l.item || '', qty: l.qty ?? '', rate: l.rate ?? '' })) })
  },
  payments: {
    table: 'payments',
    to: r => ({ client_id: r.id, pay_date: dt(r.date), party_name: str(r.party),
      party_kind: r.partyType === 'supplier' ? 'supplier' : 'customer',
      dir: r.dir === 'out' ? 'out' : 'in', amount: num(r.amount) || 0, method: str(r.method),
      invoice_no: str(r.invoice), note: str(r.note) }),
    from: d => ({ id: d.client_id || d.id, date: d.pay_date || '', party: d.party_name || '',
      partyType: d.party_kind || 'customer', dir: d.dir || 'in', amount: d.amount ?? '',
      method: d.method || '', invoice: d.invoice_no || '', note: d.note || '' })
  },
  ledger: {
    table: 'ledger',
    to: r => ({ client_id: r.id, entry_date: dt(r.date), dir: r.type === 'out' ? 'out' : 'in',
      amount: num(r.amount) || 0, category: str(r.category), note: str(r.note) }),
    from: d => ({ id: d.client_id || d.id, date: d.entry_date || '', type: d.dir || 'in',
      amount: d.amount ?? '', category: d.category || '', note: d.note || '' })
  },
  stock: {
    table: 'stock',
    to: r => ({ client_id: r.id, item: str(r.item) || '—', unit: str(r.unit),
      in_qty: num(r.inQty) || 0, out_qty: num(r.outQty) || 0, unit_cost: num(r.unitCost) || 0,
      sale_price: num(r.salePrice) || 0, reorder: num(r.reorder) || 0, notes: str(r.notes) }),
    from: d => ({ id: d.client_id || d.id, item: d.item || '', unit: d.unit || '',
      inQty: d.in_qty ?? '', outQty: d.out_qty ?? '', unitCost: d.unit_cost ?? '',
      salePrice: d.sale_price ?? '', reorder: d.reorder ?? '', notes: d.notes || '' })
  },
  shipments: {
    table: 'shipments',
    to: r => ({ client_id: r.id, no: str(r.no), supplier_name: str(r.supplier), item: str(r.item),
      cost: num(r.cost) || 0, freight: num(r.freight) || 0, duty: num(r.duty) || 0,
      clearing: num(r.clearing) || 0, awb: str(r.awb), ship_date: dt(r.date), eta: dt(r.eta),
      status: r.status || 'planned', notes: str(r.notes) }),
    from: d => ({ id: d.client_id || d.id, no: d.no || '', supplier: d.supplier_name || '',
      item: d.item || '', cost: d.cost ?? '', freight: d.freight ?? '', duty: d.duty ?? '',
      clearing: d.clearing ?? '', awb: d.awb || '', date: d.ship_date || '', eta: d.eta || '',
      status: d.status || 'planned', notes: d.notes || '' })
  },
  trips: {
    table: 'trips',
    to: r => ({ client_id: r.id, city: str(r.city) || 'Yiwu', from_date: dt(r.from),
      to_date: dt(r.to), status: r.status || 'planning', notes: str(r.notes) }),
    from: d => ({ id: d.client_id || d.id, city: d.city || '', from: d.from_date || '',
      to: d.to_date || '', status: d.status || 'planning', notes: d.notes || '' })
  },
  content: {
    table: 'content_items',
    to: r => ({ client_id: r.id, title: str(r.title), platform: str(r.platform),
      status: r.status || 'draft', caption: str(r.caption), media_url: str(r.mediaUrl),
      thumb_url: str(r.thumbUrl), notes: str(r.notes) }),
    from: d => ({ id: d.client_id || d.id, title: d.title || '', platform: d.platform || '',
      status: d.status || 'draft', caption: d.caption || '', mediaUrl: d.media_url || '',
      thumbUrl: d.thumb_url || '', notes: d.notes || '' })
  }
};

/* which database table each phone-side collection lives in */
const TABLE = {
  customers: 'parties', suppliers: 'parties', orders: 'orders', invoices: 'invoices',
  payments: 'payments', ledger: 'ledger', stock: 'stock', shipments: 'shipments',
  trips: 'trips', content: 'content_items'
};

/* ============================================================
   Vocabulary guard.

   The database constrains status words, and a raw constraint failure tells a
   caller nothing useful — DULCi once blamed the phone field and silently
   downgraded a real order to a note. So: accept the obvious synonyms, and when
   a word genuinely is not allowed, say which column and list the choices.
   ============================================================ */
const ENUMS = {
  orders:    { status: ['new','quoted','approved','shipped','done','cancelled'] },
  shipments: { status: ['planned','booked','sailing','port','cleared','delivered'] },
  trips:     { status: ['planning','booked','travelling','done'] },
  content:   { status: ['draft','ready','scheduled','published'] },
  payments:  { dir: ['in','out'], partyType: ['customer','supplier'] },
  ledger:    { type: ['in','out'] }
};
const SYNONYM = {
  pending: 'new', open: 'new', received: 'new', enquiry: 'new',
  confirmed: 'approved', accepted: 'approved', agreed: 'approved',
  complete: 'done', completed: 'done', finished: 'done', delivered: 'done',
  cancel: 'cancelled', canceled: 'cancelled',
  paid: 'in', received_in: 'in', credit: 'in', debit: 'out', spent: 'out',
  transit: 'sailing', shipping: 'sailing', customs: 'port',
  live: 'published', posted: 'published'
};

function vet(coll, item) {
  const spec = ENUMS[coll]; if (!spec) return item;
  const out = { ...item };
  for (const [field, allowed] of Object.entries(spec)) {
    const raw = out[field];
    if (raw === undefined || raw === null || raw === '') continue;
    const v = String(raw).trim().toLowerCase().replace(/\s+/g, '_');
    if (allowed.includes(v)) { out[field] = v; continue; }
    const mapped = SYNONYM[v];
    if (mapped && allowed.includes(mapped)) { out[field] = mapped; continue; }
    throw new Error(
      `invalid ${coll}.${field}: "${raw}". Allowed: ${allowed.join(', ')}.`);
  }
  return out;
}

/* ============================================================
   Records
   ============================================================ */
export async function readAll() {
  if (!hasDb()) NO_DB();
  const { data } = await rpc('read_all');
  const out = {};
  for (const c of COLLECTIONS) {
    const m = M[c];
    let rows = data[TABLE[c]] || [];
    if (m.fixed && m.fixed.kind) rows = rows.filter(r => r.kind === m.fixed.kind);
    out[c] = rows.map(m.from);
  }
  return out;
}

export async function upsert(coll, item) {
  if (!M[coll]) throw new Error('unknown-collection');
  if (!hasDb()) NO_DB();
  const m = M[coll];
  const row = { ...m.to(vet(coll, item)), ...(m.fixed || {}), deleted_at: null };
  const saved = (await rpc('upsert', { table: TABLE[coll], row })).row;

  if (m.lines && Array.isArray(item.lines) && saved && saved.id) {
    await rpc('set_lines', {
      invoice_id: saved.id,
      lines: item.lines
        .filter(l => String(l.item || '').trim() || Number(l.rate))
        .map((l, i) => ({ item: l.item || null, qty: Number(l.qty) || 0,
          rate: Number(l.rate) || 0, sort: i }))
    });
  }
  return item;
}

export async function remove(coll, id) {
  if (!M[coll]) throw new Error('unknown-collection');
  if (!hasDb()) NO_DB();
  // soft delete, so a stale phone cannot resurrect it
  await rpc('soft_delete', { table: TABLE[coll], id });
  return true;
}

/* ============================================================
   Events — the app's inbox from DULCi
   ============================================================ */
export async function appendEvent(ev) {
  const { kind, ...payload } = ev;
  if (!hasDb()) NO_DB();
  const r = await rpc('append_event', { kind, payload });
  return r.seq;
}

export async function readEvents(since = 0) {
  if (!hasDb()) NO_DB();
  const rows = (await rpc('events_since', { since })).events || [];
  return {
    seq: rows.length ? rows[rows.length - 1].seq : since,
    events: rows.map(r => ({ seq: r.seq, kind: r.kind, at: r.created_at, ...(r.payload || {}) }))
  };
}

/* ============================================================
   Conversation
   ============================================================ */
export async function appendMessage(msg) {
  if (!hasDb()) NO_DB();
  await rpc('append_message', {
    role: msg.role || 'me', text: msg.text || null,
    image_url: msg.image_url || null, audio_url: msg.audio_url || null, lang: msg.lang || 'ur'
  });
}

export async function readMessages(limit = 40) {
  if (!hasDb()) NO_DB();
  return (await rpc('messages', { limit })).messages || [];
}

/* ============================================================
   Operations desk: runs, approvals, tasks
   ============================================================ */
export async function ops() {
  if (!hasDb()) return { runs: [], approvals: [], tasks: [], db: false };
  try {
    const r = await rpc('ops');
    return { runs: r.runs || [], approvals: r.approvals || [], tasks: r.tasks || [], db: true };
  } catch {
    return { runs: [], approvals: [], tasks: [], db: true };
  }
}

export const decideApproval = async (id, status) =>
  [(await rpc('decide_approval', { id, status })).row];

export const cancelTask = id => rpc('cancel_task', { id });

/* runs / tasks / approvals are authored by DULCi, keyed on their own id */
export const opsUpsert = async (table, row) => (await rpc('upsert', { table, row })).row;

/* ============================================================
   Website intake (separate schema — it can never read the books)
   ============================================================ */
export async function addEnquiry(e) {
  if (!hasDb()) NO_DB();
  await rpc('add_enquiry', e);
  return { ok: true, stored: 'db' };
}

export const listEnquiries = async () =>
  hasDb() ? ((await rpc('enquiries')).enquiries || []) : [];

export { hasDb };
