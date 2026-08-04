/* ============================================================
   Yuan Desk — the account books
   Every rupee calculation lives here. No agent run, no cost.
   Exposes window.Books
   ============================================================ */
(() => {
'use strict';

const n = v => Number(String(v ?? '').replace(/[^0-9.\-]/g, '')) || 0;
const fmt = v => n(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmt2 = v => n(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pkr = v => 'Rs ' + fmt(v);
const cny = v => '¥' + n(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
const short = v => {
  const a = Math.abs(n(v));
  if (a >= 1e7) return (v / 1e7).toFixed(a >= 1e8 ? 0 : 1) + ' cr';
  if (a >= 1e5) return (v / 1e5).toFixed(a >= 1e6 ? 0 : 1) + ' lac';
  if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'k';
  return fmt(v);
};
const today = () => new Date().toISOString().slice(0, 10);
const ym = d => String(d || today()).slice(0, 7);
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 864e5);

/* ---------------- invoices ---------------- */
const invSub   = inv => (inv.lines || []).reduce((a, l) => a + n(l.qty) * n(l.rate), 0);
const invDisc  = inv => n(inv.discount);
const invTaxAmt= inv => (invSub(inv) - invDisc(inv)) * n(inv.tax) / 100;
const invTotal = inv => invSub(inv) - invDisc(inv) + invTaxAmt(inv);

const invPaid = (inv, payments = []) =>
  payments.filter(p => p.invoice === inv.no && p.dir === 'in').reduce((a, p) => a + n(p.amount), 0)
  + n(inv.advance);

const invBalance = (inv, payments = []) => invTotal(inv) - invPaid(inv, payments);

function invStatus(inv, payments = []) {
  const bal = invBalance(inv, payments);
  const tot = invTotal(inv);
  if (tot > 0 && bal <= 0.5) return 'paid';
  if (invPaid(inv, payments) > 0) return 'part';
  if (inv.due && daysBetween(inv.due, today()) > 0) return 'overdue';
  return 'unpaid';
}

/* ---------------- party khata ---------------- */
/* Customer: invoices are debit (he owes us), payments in are credit.
   Supplier: purchases are credit (we owe), payments out are debit. */
function partyStatement(party, kind, S) {
  const rows = [];
  if (kind === 'customer') {
    (S.invoices || []).filter(i => i.customer === party).forEach(i => rows.push({
      date: i.date || today(), kind: 'invoice', ref: i.no || '',
      label: (i.lines || []).map(l => l.item).filter(Boolean).join(', ') || 'Invoice',
      debit: invTotal(i), credit: 0
    }));
    if (0) {} // orders are not money until invoiced
  } else {
    (S.shipments || []).filter(s => s.supplier === party).forEach(s => rows.push({
      date: s.date || today(), kind: 'purchase', ref: s.no || s.awb || '',
      label: s.item || 'Purchase', debit: 0, credit: n(s.cost)
    }));
  }
  (S.payments || []).filter(p => p.party === party).forEach(p => rows.push({
    date: p.date || today(), kind: 'payment', ref: p.method || '',
    label: p.note || (p.dir === 'in' ? 'Received' : 'Paid'),
    debit: p.dir === 'out' ? n(p.amount) : 0,
    credit: p.dir === 'in' ? n(p.amount) : 0
  }));
  rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  let run = 0;
  rows.forEach(r => { run += r.debit - r.credit; r.balance = run; });
  return { rows, balance: run };
}

/* Every party with a non-zero position, biggest first. */
function balances(kind, S) {
  const names = new Set();
  if (kind === 'customer') {
    (S.customers || []).forEach(c => names.add(c.name));
    (S.invoices || []).forEach(i => i.customer && names.add(i.customer));
  } else {
    (S.suppliers || []).forEach(s => names.add(s.name));
    (S.shipments || []).forEach(s => s.supplier && names.add(s.supplier));
  }
  (S.payments || []).filter(p => p.partyType === kind).forEach(p => p.party && names.add(p.party));
  return [...names].filter(Boolean).map(name => {
    const st = partyStatement(name, kind, S);
    return { name, balance: st.balance, rows: st.rows.length };
  }).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
}

const receivable = S => balances('customer', S).reduce((a, p) => a + Math.max(0, p.balance), 0);
const payable    = S => balances('supplier', S).reduce((a, p) => a + Math.max(0, p.balance), 0);

/* ---------------- cash book ---------------- */
function cashbook(S, month = null) {
  const all = [
    ...(S.ledger || []).map(e => ({
      date: e.date || today(), dir: e.type === 'in' ? 'in' : 'out',
      amount: n(e.amount), label: e.note || e.category || '', ref: e.category || ''
    })),
    ...(S.payments || []).map(p => ({
      date: p.date || today(), dir: p.dir, amount: n(p.amount),
      label: (p.party || '') + (p.note ? ' — ' + p.note : ''), ref: p.method || ''
    }))
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  let run = 0;
  all.forEach(r => { run += r.dir === 'in' ? r.amount : -r.amount; r.balance = run; });

  const rows = month ? all.filter(r => ym(r.date) === month) : all;
  const opening = month && rows.length
    ? rows[0].balance - (rows[0].dir === 'in' ? rows[0].amount : -rows[0].amount) : 0;
  const inSum  = rows.filter(r => r.dir === 'in').reduce((a, r) => a + r.amount, 0);
  const outSum = rows.filter(r => r.dir === 'out').reduce((a, r) => a + r.amount, 0);
  return { rows: rows.slice().reverse(), opening, in: inSum, out: outSum, closing: run, all };
}

const cashInHand = S => cashbook(S).closing;

/* monthly in/out for the last N months */
function monthly(S, months = 6) {
  const keys = [];
  const d = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    keys.push(x.toISOString().slice(0, 7));
  }
  const all = cashbook(S).all;
  return keys.map(k => ({
    month: k,
    in:  all.filter(r => ym(r.date) === k && r.dir === 'in').reduce((a, r) => a + r.amount, 0),
    out: all.filter(r => ym(r.date) === k && r.dir === 'out').reduce((a, r) => a + r.amount, 0)
  }));
}

/* ---------------- stock register ---------------- */
function stockRow(it) {
  const inQ = n(it.inQty), outQ = n(it.outQty);
  const onHand = inQ - outQ;
  const unitCost = n(it.unitCost);
  return { ...it, onHand, unitCost, value: onHand * unitCost,
    sold: outQ, profit: outQ * (n(it.salePrice) - unitCost) };
}
function stockTotals(S) {
  const rows = (S.stock || []).map(stockRow);
  return {
    rows,
    value: rows.reduce((a, r) => a + r.value, 0),
    items: rows.length,
    low: rows.filter(r => r.onHand <= n(r.reorder || 0) && n(r.reorder || 0) > 0).length,
    profit: rows.reduce((a, r) => a + r.profit, 0)
  };
}

/* ---------------- landed cost ---------------- */
/* Everything a Yiwu purchase actually costs by the time it reaches Multan. */
function landed(i) {
  const qty = n(i.qty) || 1;
  const fx = n(i.fx) || 40;                      // PKR per CNY
  const goodsCny = n(i.unitCny) * qty;
  const goodsPkr = goodsCny * fx;
  const freight = n(i.freight);                  // PKR, door to door
  const other = n(i.clearing) + n(i.inland) + n(i.misc);
  const dutyBase = goodsPkr + freight;
  const duty = dutyBase * n(i.dutyPct) / 100;
  const salesTax = (dutyBase + duty) * n(i.taxPct) / 100;
  const total = goodsPkr + freight + other + duty + salesTax;
  const perUnit = total / qty;
  const margin = n(i.marginPct);
  const sale = perUnit * (1 + margin / 100);
  return {
    qty, fx, goodsCny, goodsPkr, freight, other, duty, salesTax, total, perUnit,
    sale, saleTotal: sale * qty, profit: (sale - perUnit) * qty,
    freightShare: total ? (freight + other) / total * 100 : 0
  };
}

/* ---------------- amount in words ---------------- */
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function two(v) {
  if (v < 20) return ONES[v];
  return TENS[Math.floor(v / 10)] + (v % 10 ? '-' + ONES[v % 10] : '');
}
function three(v) {
  const h = Math.floor(v / 100), r = v % 100;
  return (h ? ONES[h] + ' hundred' + (r ? ' ' : '') : '') + (r ? two(r) : '');
}
/* Pakistani system: crore, lakh, thousand, hundred */
function wordsEn(v) {
  v = Math.round(n(v));
  if (!v) return 'zero rupees only';
  const parts = [];
  const cr = Math.floor(v / 1e7); v %= 1e7;
  const la = Math.floor(v / 1e5); v %= 1e5;
  const th = Math.floor(v / 1e3); v %= 1e3;
  if (cr) parts.push(three(cr) + ' crore');
  if (la) parts.push(three(la) + ' lakh');
  if (th) parts.push(three(th) + ' thousand');
  if (v)  parts.push(three(v));
  const s = parts.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + ' rupees only';
}

const U_ONES = ['', 'ایک', 'دو', 'تین', 'چار', 'پانچ', 'چھ', 'سات', 'آٹھ', 'نو', 'دس',
  'گیارہ', 'بارہ', 'تیرہ', 'چودہ', 'پندرہ', 'سولہ', 'سترہ', 'اٹھارہ', 'انیس'];
const U_TENS = ['', '', 'بیس', 'تیس', 'چالیس', 'پچاس', 'ساٹھ', 'ستر', 'اسی', 'نوے'];

function uTwo(v) {
  if (v < 20) return U_ONES[v];
  const t = U_TENS[Math.floor(v / 10)], o = v % 10;
  return o ? U_ONES[o] + ' ' + t : t;
}
function uThree(v) {
  const h = Math.floor(v / 100), r = v % 100;
  return (h ? U_ONES[h] + ' سو ' : '') + (r ? uTwo(r) : '');
}
function wordsUr(v) {
  v = Math.round(n(v));
  if (!v) return 'صفر روپے';
  const p = [];
  const cr = Math.floor(v / 1e7); v %= 1e7;
  const la = Math.floor(v / 1e5); v %= 1e5;
  const th = Math.floor(v / 1e3); v %= 1e3;
  if (cr) p.push(uThree(cr) + ' کروڑ');
  if (la) p.push(uThree(la) + ' لاکھ');
  if (th) p.push(uThree(th) + ' ہزار');
  if (v)  p.push(uThree(v));
  return p.join(' ') + ' روپے';
}

/* ---------------- dashboard rollup ---------------- */
function summary(S) {
  const openOrders = (S.orders || []).filter(o => !['done', 'cancelled'].includes(o.status));
  const inv = S.invoices || [], pay = S.payments || [];
  const st = stockTotals(S);
  const overdue = inv.filter(i => invStatus(i, pay) === 'overdue');
  return {
    receivable: receivable(S),
    payable: payable(S),
    cash: cashInHand(S),
    openOrders: openOrders.length,
    orderValue: openOrders.reduce((a, o) => a + n(o.value), 0),
    unpaidInvoices: inv.filter(i => invBalance(i, pay) > 0.5).length,
    overdue: overdue.length,
    overdueAmount: overdue.reduce((a, i) => a + invBalance(i, pay), 0),
    stockValue: st.value,
    stockLow: st.low,
    inTransit: (S.shipments || []).filter(s => ['booked', 'sailing', 'transit', 'port'].includes(s.status)).length,
    customers: (S.customers || []).length,
    monthly: monthly(S, 6)
  };
}

window.Books = {
  n, fmt, fmt2, pkr, cny, short, today, ym, daysBetween,
  invSub, invDisc, invTaxAmt, invTotal, invPaid, invBalance, invStatus,
  partyStatement, balances, receivable, payable,
  cashbook, cashInHand, monthly,
  stockRow, stockTotals, landed,
  wordsEn, wordsUr, summary
};
})();
