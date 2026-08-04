/* ============================================================
   Yuan Desk — application core
   ============================================================ */
(() => {
'use strict';
const { $, $$, LSget, LSset, tap, Theme, Amb, tiltAll, countUp, toast, Sheet, Mic, bindMic } = window.UI;
const B = window.Books;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ============================ i18n ============================ */
const T = {
  ur: {
    lockHint: 'اپنا چار ہندسوں کا پن لکھیں', wrongPin: 'پن غلط ہے۔ دوبارہ کوشش کریں۔',
    greetSub: 'مرزا جاوید اقبال صاحب', micLabel: 'بات کریں', micNote: 'دبا کر رکھیں اور بولیں',
    gm: 'صبح بخیر', ga: 'السلام علیکم', ge: 'شب بخیر',
    navHome: 'گھر', navTalk: 'بات', navScreen: 'اسکرین', navDash: 'کاروبار', navKhata: 'کھاتہ',
    navCash: 'روزنامچہ', navStock: 'اسٹاک', navLanded: 'لاگت', navOrders: 'آرڈر',
    navInvoices: 'انوائس', navCustomers: 'گاہک', navSuppliers: 'سپلائر', navShipments: 'شپمنٹ',
    navTrips: 'سفر', navContent: 'ویڈیو و پوسٹ', navMore: 'مزید',
    composerPh: 'لکھیں…', send: 'بھیجیں', addNew: 'نیا', addPay: 'رقم درج کریں', refresh: 'تازہ',
    save: 'محفوظ کریں', del: 'حذف کریں', cancel: 'منسوخ', close: 'بند کریں', edit: 'تبدیلی',
    saved: 'محفوظ ہو گیا', deleted: 'حذف ہو گیا', confirmDel: 'واقعی حذف کریں؟', none: 'ابھی کچھ نہیں',
    offline: 'رابطہ نہیں ہو سکا۔ پیغام محفوظ ہے۔', thinking: 'DULCi سوچ رہا ہے…',
    notConnected: 'DULCi سے تار ابھی نہیں جڑا',
    screenEmptyT: 'ابھی کوئی اسکرین نہیں',
    screenEmptyS: 'جب DULCi کو کسی ویب سائٹ پر لاگ اِن کرنا ہوگا، وہ اپنی اسکرین یہاں بھیج دے گا۔ آپ اپنا پاس ورڈ خود لکھیں گے۔',
    siBadge: 'DULCi کی درخواست', screenDone: 'میں نے کر لیا', screenCancel: 'منسوخ',
    frameFallbackT: 'اسکرین یہاں نہیں کھل سکی۔', openTab: 'نئی ونڈو میں کھولیں',
    setMode: 'اسکرین کی قسم', setTheme: 'دن یا رات', setLang: 'زبان', setLogout: 'باہر نکلیں',
    setBackup: 'بیک اپ', download: 'محفوظ کریں', logout: 'لاگ آؤٹ',
    modeSimple: 'آسان اسکرین', modeFull: 'پورا کاروبار', themeDay: 'دن', themeNight: 'رات',
    /* operations desk */
    navOps: 'کام', navInterpret: 'ترجمان', navPlan: 'خریداری کا منصوبہ',
    opsApprovals: 'منظوری درکار', opsTasks: 'جاری کام', opsRuns: 'DULCi کا ریکارڈ',
    approve: 'منظور', refuse: 'منع', cancelTask: 'روک دیں',
    approved: 'منظور ہو گیا', refused: 'منع کر دیا', nothingPending: 'کوئی چیز باقی نہیں',
    stQueued: 'قطار میں', stWorking: 'جاری', stBlocked: 'رکا ہوا', stDone: 'مکمل',
    stFailed: 'ناکام', stRunning: 'چل رہا ہے', cost: 'خرچ',
    interpretHint: 'بٹن دبا کر اردو میں بولیں — چینی ترجمہ اسکرین پر آئے گا اور آواز بھی',
    interpretShow: 'یہ اسکرین دکاندار کو دکھائیں', interpretPlay: 'آواز چلائیں',
    interpretPhoto: 'قیمت یا لکھائی کی تصویر',
    syncOk: 'سب محفوظ', syncQueued: 'محفوظ ہو رہا ہے', syncOffline: 'آف لائن — بعد میں چلا جائے گا',
    planEmpty: 'ابھی منصوبہ نہیں۔ DULCi سے کہیں آرڈر بک سے بنا دے۔',
    district: 'مارکیٹ', target: 'ہدف قیمت', quoted: 'ملی قیمت',
    /* books */
    receivable: 'لینا ہے', payable: 'دینا ہے', cash: 'نقد', openOrders: 'کھلے آرڈر',
    stockValue: 'اسٹاک کی قیمت', overdue: 'میعاد گزری', unpaid: 'بقایا انوائس', inTransit: 'راستے میں',
    thisMonthIn: 'اس ماہ آیا', thisMonthOut: 'اس ماہ گیا', profit: 'نفع',
    customersW: 'گاہک', suppliersW: 'سپلائر', opening: 'سابقہ', closing: 'باقی',
    totalIn: 'کل آمد', totalOut: 'کل خرچ', balance: 'بیلنس', statement: 'کھاتہ',
    theyOwe: 'ان سے لینا', weOwe: 'ان کو دینا', settled: 'حساب صاف',
    /* invoice */
    invoice: 'انوائس', invNew: 'نئی انوائس', invTo: 'برائے', invFrom: 'از',
    invNo: 'انوائس نمبر', invDate: 'تاریخ', invDue: 'آخری تاریخ', item: 'مال',
    qty: 'تعداد', rate: 'ریٹ', amount: 'رقم', subtotal: 'میزان', discount: 'رعایت',
    tax: 'ٹیکس', total: 'کل رقم', paid: 'ادا شدہ', due: 'بقایا', inWords: 'الفاظ میں',
    addLine: 'مال شامل کریں', print: 'پرنٹ / PDF', share: 'واٹس ایپ پر بھیجیں',
    stPaid: 'ادا', stPart: 'جزوی', stUnpaid: 'بقایا', stOverdue: 'میعاد گزری',
    /* landed */
    landedHint: 'یوآن سے روپے تک — فی پیس اصل لاگت۔',
    lUnit: 'فی پیس یوآن', lQty: 'تعداد', lFx: 'ایک یوآن کے روپے', lFreight: 'کرایہ (روپے)',
    lDuty: 'ڈیوٹی %', lTax: 'سیلز ٹیکس %', lClearing: 'کلیئرنگ', lInland: 'اندرونی کرایہ',
    lMisc: 'دیگر', lMargin: 'منافع %', lGoods: 'مال کی قیمت', lPerUnit: 'فی پیس لاگت',
    lSale: 'فروخت قیمت', lTotal: 'کل لاگت', lProfit: 'متوقع نفع', lFreightShare: 'کرایہ حصہ',
    /* fields */
    fName: 'نام', fCity: 'شہر', fPhone: 'فون', fItem: 'مال', fQty: 'تعداد', fStatus: 'حالت',
    fNotes: 'نوٹ', fDate: 'تاریخ', fAmount: 'رقم', fType: 'قسم', fCategory: 'مد',
    fParty: 'کس کا', fMethod: 'ذریعہ', fDir: 'آمد یا ادائیگی', fIn: 'وصول ہوا', fOut: 'ادا کیا',
    fMarket: 'مارکیٹ', fContact: 'رابطہ', fSupplier: 'سپلائر', fCost: 'لاگت', fAwb: 'ٹریکنگ',
    fFrom: 'سے', fTo: 'تک', fUnit: 'یونٹ', fInQty: 'آیا', fOutQty: 'بکا',
    fUnitCost: 'فی پیس لاگت', fSalePrice: 'فروخت قیمت', fReorder: 'کم از کم', fValue: 'قیمت',
    fInvoice: 'انوائس نمبر', fBiz: 'کاروبار', fCustomer: 'گاہک',
    micDenied: 'مائیک کی اجازت دیں', micShort: 'بہت مختصر تھا'
  },
  en: {
    lockHint: 'Enter your four-digit passcode', wrongPin: 'Wrong passcode. Try again.',
    greetSub: 'Mirza Javaid Iqbal', micLabel: 'Talk', micNote: 'Hold and speak',
    gm: 'Good morning', ga: 'Assalam alaikum', ge: 'Good evening',
    navHome: 'Home', navTalk: 'Talk', navScreen: 'Screen', navDash: 'Business', navKhata: 'Khata',
    navCash: 'Cash book', navStock: 'Stock', navLanded: 'Landed cost', navOrders: 'Orders',
    navInvoices: 'Invoices', navCustomers: 'Customers', navSuppliers: 'Suppliers',
    navShipments: 'Shipments', navTrips: 'Trips', navContent: 'Content', navMore: 'More',
    composerPh: 'Write…', send: 'Send', addNew: 'New', addPay: 'Record money', refresh: 'Refresh',
    save: 'Save', del: 'Delete', cancel: 'Cancel', close: 'Close', edit: 'Edit',
    saved: 'Saved', deleted: 'Deleted', confirmDel: 'Delete this?', none: 'Nothing here yet',
    offline: 'Could not reach DULCi. Your message is saved.', thinking: 'DULCi is thinking…',
    notConnected: 'DULCi is not connected yet',
    screenEmptyT: 'No screen right now',
    screenEmptyS: 'When DULCi needs to log in somewhere, it will hand its screen to you here.',
    siBadge: 'DULCi needs you', screenDone: "I've done it", screenCancel: 'Cancel',
    frameFallbackT: 'The screen could not open here.', openTab: 'Open in a new window',
    setMode: 'Screen type', setTheme: 'Day or night', setLang: 'Language', setLogout: 'Sign out',
    setBackup: 'Backup', download: 'Download', logout: 'Sign out',
    modeSimple: 'Simple screen', modeFull: 'Full business', themeDay: 'Day', themeNight: 'Night',
    navOps: 'Work', navInterpret: 'Interpreter', navPlan: 'Sourcing plan',
    opsApprovals: 'Waiting for you', opsTasks: 'In progress', opsRuns: "DULCi's record",
    approve: 'Approve', refuse: 'Refuse', cancelTask: 'Stop',
    approved: 'Approved', refused: 'Refused', nothingPending: 'Nothing waiting',
    stQueued: 'Queued', stWorking: 'Working', stBlocked: 'Blocked', stDone: 'Done',
    stFailed: 'Failed', stRunning: 'Running', cost: 'Cost',
    interpretHint: 'Hold the button and speak Urdu — Chinese appears on screen and plays aloud',
    interpretShow: 'Show this screen to the supplier', interpretPlay: 'Play aloud',
    interpretPhoto: 'Photo of a price or label',
    syncOk: 'All saved', syncQueued: 'Saving…', syncOffline: 'Offline — will send later',
    planEmpty: 'No plan yet. Ask DULCi to build one from the order book.',
    district: 'Market', target: 'Target', quoted: 'Quoted',
    receivable: 'To receive', payable: 'To pay', cash: 'Cash', openOrders: 'Open orders',
    stockValue: 'Stock value', overdue: 'Overdue', unpaid: 'Unpaid invoices', inTransit: 'In transit',
    thisMonthIn: 'In this month', thisMonthOut: 'Out this month', profit: 'Profit',
    customersW: 'Customers', suppliersW: 'Suppliers', opening: 'Opening', closing: 'Closing',
    totalIn: 'Total in', totalOut: 'Total out', balance: 'Balance', statement: 'Statement',
    theyOwe: 'They owe', weOwe: 'We owe', settled: 'Settled',
    invoice: 'Invoice', invNew: 'New invoice', invTo: 'Billed to', invFrom: 'From',
    invNo: 'Invoice no', invDate: 'Date', invDue: 'Due date', item: 'Item',
    qty: 'Qty', rate: 'Rate', amount: 'Amount', subtotal: 'Subtotal', discount: 'Discount',
    tax: 'Tax', total: 'Total', paid: 'Paid', due: 'Balance due', inWords: 'In words',
    addLine: 'Add item', print: 'Print / PDF', share: 'Send on WhatsApp',
    stPaid: 'Paid', stPart: 'Part paid', stUnpaid: 'Unpaid', stOverdue: 'Overdue',
    landedHint: 'From yuan to rupees — what a piece truly costs.',
    lUnit: 'Unit price ¥', lQty: 'Quantity', lFx: 'PKR per ¥', lFreight: 'Freight (PKR)',
    lDuty: 'Duty %', lTax: 'Sales tax %', lClearing: 'Clearing', lInland: 'Inland freight',
    lMisc: 'Other', lMargin: 'Margin %', lGoods: 'Goods value', lPerUnit: 'Cost per piece',
    lSale: 'Sale price', lTotal: 'Total landed', lProfit: 'Expected profit', lFreightShare: 'Freight share',
    fName: 'Name', fCity: 'City', fPhone: 'Phone', fItem: 'Item', fQty: 'Qty', fStatus: 'Status',
    fNotes: 'Notes', fDate: 'Date', fAmount: 'Amount', fType: 'Type', fCategory: 'Category',
    fParty: 'Party', fMethod: 'Method', fDir: 'Received or paid', fIn: 'Received', fOut: 'Paid',
    fMarket: 'Market', fContact: 'Contact', fSupplier: 'Supplier', fCost: 'Cost', fAwb: 'Tracking',
    fFrom: 'From', fTo: 'To', fUnit: 'Unit', fInQty: 'Bought', fOutQty: 'Sold',
    fUnitCost: 'Cost / piece', fSalePrice: 'Sale price', fReorder: 'Reorder level', fValue: 'Value',
    fInvoice: 'Invoice no', fBiz: 'Business', fCustomer: 'Customer',
    micDenied: 'Please allow the microphone', micShort: 'That was too short'
  }
};
let lang = LSget('lang', 'ur');
const t = k => (T[lang] && T[lang][k]) || T.en[k] || k;
window.T_LABEL = th => t(th === 'day' ? 'themeDay' : 'themeNight');

function applyLang() {
  document.documentElement.lang = lang === 'ur' ? 'ur' : 'en';
  document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  document.body.classList.toggle('ur', lang === 'ur');
  $$('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  $$('[data-tph]').forEach(el => el.placeholder = t(el.dataset.tph));
  const lb = $('#langBtn'); if (lb) lb.textContent = lang === 'ur' ? 'A' : 'اُ';
  const slb = $('#setLangBtn'); if (slb) slb.textContent = lang === 'ur' ? 'اردو' : 'English';
  window.T_MIC_DENIED = t('micDenied'); window.T_MIC_SHORT = t('micShort');
  LSset('lang', lang);
  buildTabs(); if (unlocked) renderAll();
}

/* ============================ state ============================ */
const COLL = ['orders', 'invoices', 'customers', 'suppliers', 'shipments',
  'ledger', 'payments', 'stock', 'trips', 'content'];
const S = { msgs: [], cursor: 0, live: null, busy: false, connected: null, server: false,
  db: false, ops: { runs: [], approvals: [], tasks: [] }, interp: [] };
COLL.forEach(c => S[c] = []);

const BIZ = {
  name: 'Mirza Javaid Iqbal', trade: 'Yuan.pk — China Sourcing & Import',
  city: 'Multan, Pakistan', phone: '+92 300 630 7380', web: 'yuan.pk'
};

function loadLocal() {
  S.msgs = LSget('msgs', []);
  COLL.forEach(c => S[c] = LSget(c, []));
  // Demo rows only when explicitly asked for (?demo=1). His real books start
  // empty and honest — nothing invented is ever synced into Postgres.
  if (location.search.includes('demo=1') && !LSget('seeded', false)) seed();
}
function saveLocal() { LSset('msgs', S.msgs.slice(-300)); COLL.forEach(c => LSset(c, S[c])); }

function seed() {
  LSset('seeded', true);
  const d = B.today();
  S.customers = [
    { id: uid(), name: 'Rana Traders', city: 'Multan', phone: '0300 1234567', notes: 'General store, Hussain Agahi' },
    { id: uid(), name: 'Al-Madina Store', city: 'Lahore', phone: '0321 7654321', notes: 'Wholesale kitchenware' }
  ];
  S.orders = [
    { id: uid(), no: 'ORD-1001', date: d, customer: 'Rana Traders', city: 'Multan', phone: '0300 1234567',
      item: 'Steel kitchen sets', qty: '200', value: '480000', status: 'quoted', notes: 'Wants landed cost in PKR' },
    { id: uid(), no: 'ORD-1002', date: d, customer: 'Al-Madina Store', city: 'Lahore', phone: '0321 7654321',
      item: 'School bags — mixed sizes', qty: '500', value: '750000', status: 'new', notes: '' }
  ];
  S.suppliers = [
    { id: uid(), name: 'Yiwu Hongfa Houseware', market: 'District 2', category: 'Kitchen',
      contact: 'WeChat: hongfa88', notes: 'MOQ 100, quoted ¥12.5/set' }
  ];
  S.ledger = [
    { id: uid(), date: d, type: 'in', amount: '1500000', category: 'Capital', note: 'Opening cash' },
    { id: uid(), date: d, type: 'out', amount: '4200', category: 'Domain', note: 'yuan.pk registration' }
  ];
  S.invoices = [
    { id: uid(), no: 'INV-260001', date: d, customer: 'Rana Traders', due: '',
      lines: [{ item: 'Steel kitchen set', qty: '200', rate: '2400' }],
      discount: '', tax: '', advance: '', notes: 'Delivered at Hussain Agahi' }
  ];
  S.payments = [
    { id: uid(), date: d, party: 'Rana Traders', partyType: 'customer', dir: 'in',
      amount: '200000', method: 'Cash', invoice: 'INV-260001', note: 'Part payment' }
  ];
  S.stock = [
    { id: uid(), item: 'Steel kitchen set', unit: 'set', inQty: '200', outQty: '40',
      unitCost: '1850', salePrice: '2400', reorder: '50' }
  ];
  S.trips = [{ id: uid(), city: 'Yiwu', from: '', to: '', status: 'planning', notes: 'Plan around open orders' }];
  saveLocal();
}

/* ============================ api ============================ */
async function api(path, opts = {}) {
  const r = await fetch('/api/' + path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' }, ...opts
  });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
function setConn(state) { const c = $('#conn'); if (c) c.className = 'conn ' + (state || ''); }

/* ============================================================
   Sync — offline first, because he will be on Chinese mobile data
   Every change is written locally first and queued. The queue replays
   whenever a connection appears. He never waits for a server.
   ============================================================ */
const Sync = {
  queue: LSget('queue', []),
  busy: false,
  save() { LSset('queue', this.queue.slice(-500)); paintSync(); },

  push(collection, item) { this.queue.push({ collection, item, at: Date.now() }); this.save(); this.flush(); },
  del(collection, deleteId) { this.queue.push({ collection, deleteId, at: Date.now() }); this.save(); this.flush(); },

  async flush() {
    if (this.busy || !this.queue.length || !navigator.onLine) return;
    this.busy = true;
    const batch = this.queue.slice(0, 200);
    try {
      const r = await api('sync', { method: 'POST', body: JSON.stringify({ ops: batch }) });
      // only drop what the server actually accepted
      const done = new Set((r.applied || []).map(String));
      this.queue = this.queue.filter(op => {
        const key = String(op.deleteId || (op.item && op.item.id));
        return !(batch.includes(op) && done.has(key));
      });
      this.save();
      S.server = true; S.db = !!r.db;
      if (r.data) merge(r.data);
      if ((r.failed || []).length) {
        console.warn('sync rejected', r.failed);
        // a rejected op must not block the rest for ever
        this.queue = this.queue.filter(op => !batch.includes(op));
        this.save();
      }
    } catch {
      S.server = false; paintSync();
    } finally {
      this.busy = false;
      if (this.queue.length && navigator.onLine) setTimeout(() => this.flush(), 4000);
    }
  },

  async pull() {
    try {
      const r = await api('data');
      S.server = true; S.db = !!r.db;
      if (r.data) merge(r.data);
    } catch { S.server = false; }
    paintSync();
  }
};

/* server wins on fields it knows about; anything still queued locally stays */
function merge(remote) {
  const queued = new Set(Sync.queue.map(op => String(op.deleteId || (op.item && op.item.id))));
  let changed = false;
  COLL.forEach(c => {
    const rows = remote[c];
    if (!Array.isArray(rows)) return;
    const map = new Map((S[c] || []).map(x => [x.id, x]));
    rows.forEach(x => { if (!queued.has(String(x.id))) map.set(x.id, { ...map.get(x.id), ...x }); });
    S[c] = [...map.values()];
    changed = true;
  });
  if (changed) { saveLocal(); renderAll(); }
}

function paintSync() {
  const el = $('#syncPill'); if (!el) return;
  const n = Sync.queue.length;
  const state = !navigator.onLine ? 'off' : n ? 'queued' : 'ok';
  el.className = 'sync-pill ' + state;
  el.textContent = state === 'ok' ? t('syncOk')
    : state === 'queued' ? `${t('syncQueued')} ${n}` : t('syncOffline');
  el.hidden = state === 'ok';
}

const pushRec = (collection, item) => Sync.push(collection, item);
const pushDel = (collection, deleteId) => Sync.del(collection, deleteId);
const pullServer = () => Sync.pull();

/* ============================ lock ============================ */
const PIN_LEN = 4;
let pin = '', unlocked = false;

function buildKeypad() {
  const kp = $('#keypad'); kp.innerHTML = '';
  ['1','2','3','4','5','6','7','8','9','','0','⌫'].forEach(k => {
    if (k === '') { kp.appendChild(document.createElement('span')); return; }
    const b = document.createElement('button');
    b.className = 'key' + (k === '⌫' ? ' mini' : '');
    b.textContent = k;
    b.onclick = () => {
      tap(7);
      if (k === '⌫') pin = pin.slice(0, -1);
      else if (pin.length < PIN_LEN) pin += k;
      drawDots();
      if (pin.length === PIN_LEN) setTimeout(submitPin, 130);
    };
    kp.appendChild(b);
  });
  drawDots();
}
function drawDots() {
  $('#pinDots').innerHTML = Array.from({ length: PIN_LEN },
    (_, i) => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join('');
}
function pinFail() {
  const d = $('#pinDots');
  $('#pinErr').textContent = t('wrongPin');
  d.classList.add('shake'); tap(28);
  setTimeout(() => d.classList.remove('shake'), 460);
  pin = ''; drawDots();
}
async function submitPin() {
  $('#pinErr').textContent = '';
  const entered = pin;
  try {
    const r = await api('login', { method: 'POST', body: JSON.stringify({ pin: entered }) });
    S.connected = !!r.connected; S.server = true;
    LSset('pin', null); unlock();
  } catch (e) {
    if (String(e.message) === '401') { pinFail(); return; }
    // No server (local preview): accept the agreed passcode so the app still opens.
    if (entered === '7563' || entered === LSget('pin', null)) { S.server = false; unlock(); return; }
    pinFail();
  }
}
function unlock() {
  unlocked = true;
  $('#lock').hidden = true; $('#app').hidden = false;
  LSset('unlocked', true);
  boot();
}

/* ============================ nav ============================ */
const ICON = {
  home: 'M3 11l9-8 9 8M5 9v11h14V9', talk: 'M21 12a8 8 0 01-8 8H7l-4 3V12a8 8 0 018-8h2a8 8 0 018 8z',
  screen: 'M2 4h20v14H2zM8 21h8', dash: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  khata: 'M5 3h11l3 3v15H5zM9 8h6M9 12h6M9 16h4', cash: 'M3 7h18v10H3zM3 11h18M7 15h3',
  stock: 'M3 8l9-5 9 5-9 5zM3 8v8l9 5 9-5V8', landed: 'M4 19h16M6 15l4-6 3 4 5-8',
  orders: 'M4 5h16v15H4zM8 9h8M8 13h8M8 17h5', invoices: 'M6 3h9l3 3v15H6zM9 9h7M9 13h7M9 17h4',
  customers: 'M16 19a4 4 0 00-8 0M12 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7M20 19a3 3 0 00-4-2.8',
  suppliers: 'M3 9l2-5h14l2 5v10H3zM3 9h18M9 13h6', shipments: 'M2 8h11v8H2zM13 11h5l3 3v2h-8zM6 19a1.6 1.6 0 100-3.2M17 19a1.6 1.6 0 100-3.2',
  trips: 'M4 20l7-7M11 13l3-9 6 6-9 3M4 20l3-1', content: 'M3 5h18v14H3zM10 9l6 3-6 3z',
  ops: 'M9 5H5v14h14v-4M20 4l-9 9M14 4h6v6',
  interpret: 'M4 6h9M8 6v9M13 18l4-9 4 9M14.5 15h5',
  plan: 'M8 4h9l3 3v13H8zM4 8v12h4M12 11h5M12 15h3',
  more: 'M4 6h16M4 12h16M4 18h16'
};
const TABS = {
  simple: ['home', 'talk', 'screen', 'orders', 'more'],
  full:   ['home', 'talk', 'ops', 'khata', 'more']
};
function buildTabs() {
  const tb = $('#tabbar'); if (!tb) return;
  const mode = document.body.dataset.mode || 'simple';
  tb.innerHTML = '';
  TABS[mode].forEach(v => {
    const b = document.createElement('button');
    b.className = 'tab' + (v === view ? ' on' : ''); b.dataset.view = v;
    b.innerHTML = `<svg viewBox="0 0 24 24"><path d="${ICON[v]}"/></svg><span>${esc(t('nav' + v[0].toUpperCase() + v.slice(1)))}</span>`;
    b.onclick = () => { tap(6); go(v); };
    tb.appendChild(b);
  });
}
const TITLES = () => ({
  home: 'Yuan Desk', talk: t('navTalk'), screen: t('navScreen'), dash: t('navDash'),
  khata: t('navKhata'), cashbook: t('navCash'), stock: t('navStock'), landed: t('navLanded'),
  ops: t('navOps'), interpret: t('navInterpret'), plan: t('navPlan'), dash2: t('navDash'),
  orders: t('navOrders'), invoices: t('navInvoices'), customers: t('navCustomers'),
  suppliers: t('navSuppliers'), shipments: t('navShipments'), trips: t('navTrips'),
  content: t('navContent'), more: t('navMore')
});
let view = 'home';
function go(v) {
  view = v;
  $$('.view').forEach(s => s.classList.toggle('on', s.dataset.view === v));
  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  $('#topTitle').textContent = TITLES()[v] || 'Yuan Desk';
  const mode = document.body.dataset.mode || 'simple';
  $('#backBtn').hidden = TABS[mode].includes(v);
  $('#main').scrollTop = 0;
  render(v);
}
function render(v) {
  if (v === 'home') renderHome();
  else if (v === 'talk') { renderChat(); scrollChat(); }
  else if (v === 'screen') renderScreen();
  else if (v === 'dash') renderDash();
  else if (v === 'khata') renderKhata();
  else if (v === 'cashbook') renderCash();
  else if (v === 'stock') renderStock();
  else if (v === 'landed') renderLanded();
  else if (v === 'invoices') renderInvoices();
  else if (v === 'more') renderMore();
  else if (COLL.includes(v)) renderList(v);
  else if (window.YD_VIEWS && window.YD_VIEWS[v]) window.YD_VIEWS[v]();
}
function renderAll() { render(view); }

/* ============================ home ============================ */
function renderHome() {
  const h = new Date().getHours();
  $('#greetLine').textContent = h < 11 ? t('gm') : h < 18 ? t('ga') : t('ge');
  $('#greetDate').textContent = new Date().toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long' });

  const s = B.summary(S);
  $('#glance').innerHTML = [
    ['up', B.short(s.receivable), t('receivable')],
    ['hold', B.short(s.cash), t('cash')],
    ['down', B.short(s.payable), t('payable')]
  ].map(([c, v, l]) => `<div class="gl ${c}"><b class="num">${esc(v)}</b><span>${esc(l)}</span></div>`).join('');

  const pend = (S.ops.approvals || []).filter(a => a.status === 'pending').length;
  const tiles = [
    ['interpret', 'interpret', 'c', t('interpretShow')],
    ['orders', 'orders', '', s.openOrders + ' ' + t('openOrders')],
    ['invoices', 'invoices', 'g', s.unpaidInvoices ? s.unpaidInvoices + ' ' + t('unpaid') : t('stPaid')],
    ['khata', 'khata', 's', B.pkr(s.receivable)]
  ];
  if (pend) tiles.unshift(['ops', 'ops', 'g', pend + ' ' + t('opsApprovals')]);
  $('#homeTiles').innerHTML = tiles.map(([v, ic, cls, sub]) => `
    <button class="tile ${cls}" data-go="${v}">
      <span class="ti"><svg viewBox="0 0 24 24"><path d="${ICON[ic]}"/></svg></span>
      <div class="tt">${esc(TITLES()[v])}</div><div class="ts">${esc(sub)}</div>
    </button>`).join('');
  bindGo(); tiltAll('#homeTiles .tile');
}
function bindGo(root = document) {
  $$('[data-go]', root).forEach(b => b.onclick = () => { tap(6); go(b.dataset.go); });
}

/* ============================ more ============================ */
function renderMore() {
  const mode = document.body.dataset.mode || 'simple';
  const list = mode === 'simple'
    ? ['interpret', 'talk', 'screen', 'orders', 'invoices', 'khata', 'landed', 'content']
    : ['interpret', 'ops', 'dash', 'orders', 'invoices', 'khata', 'cashbook', 'stock', 'landed',
       'plan', 'customers', 'suppliers', 'shipments', 'trips', 'content', 'screen'];
  $('#moreTiles').innerHTML = list.map(v => `
    <button class="tile ${['khata','cashbook','stock'].includes(v) ? 'g' : ['landed','content'].includes(v) ? 'c' : ['customers','suppliers'].includes(v) ? 's' : ''}" data-go="${v}">
      <span class="ti"><svg viewBox="0 0 24 24"><path d="${ICON[v]}"/></svg></span>
      <div class="tt">${esc(TITLES()[v])}</div>
    </button>`).join('');
  bindGo(); tiltAll('#moreTiles .tile');
  $('#setModeBtn').textContent = t(mode === 'simple' ? 'modeSimple' : 'modeFull');
  $('#setThemeBtn').textContent = window.T_LABEL(Theme.current());
  $('#setLangBtn').textContent = lang === 'ur' ? 'اردو' : 'English';
  const demoRow = $('#demoRow');
  if (demoRow) demoRow.hidden = !LSget('seeded', false);
  paintHealth();
}

/* An honest picture of what is wired, so nothing fails silently */
async function paintHealth() {
  const box = $('#setMeta'); if (!box) return;
  const dot = ok => `<i class="hdot ${ok ? 'on' : 'off'}"></i>`;
  const row = (label, ok) =>
    `<div class="hrow">${dot(ok)}<span>${esc(label)}</span>
      <b>${esc(ok ? t('hOn') : t('hOff'))}</b></div>`;
  box.innerHTML = `<div class="hbox">${row(t('hDb'), S.db)}${row(t('hOut'), false)}${row(t('hIn'), false)}
    </div><div class="hver">Yuan Desk 3.0 · ${esc(BIZ.web)}</div>`;
  try {
    const h = await api('health');
    box.innerHTML = `<div class="hbox">
      ${row(t('hDb'), h.database && h.database.reachable)}
      ${row(t('hOut'), h.dulci && h.dulci.outbound)}
      ${row(t('hIn'), h.dulci && h.dulci.inbound)}
    </div><div class="hver">Yuan Desk 3.0 · ${esc(BIZ.web)}</div>`;
  } catch {}
}

/* ============================ chat ============================ */
function renderChat() {
  const box = $('#chat');
  box.innerHTML = S.msgs.slice(-120).map(m => {
    if (m.role === 'sys') return `<div class="bub sys">${esc(m.text)}</div>`;
    const time = new Date(m.ts || Date.now()).toLocaleTimeString(lang === 'ur' ? 'ur-PK' : 'en-GB',
      { hour: '2-digit', minute: '2-digit' });
    return `<div class="bub ${m.role === 'me' ? 'me' : 'ag'}">${
      m.text ? esc(m.text).replace(/\n/g, '<br>') : ''}${
      m.image ? `<img src="${esc(m.image)}" alt="">` : ''}${
      m.audio ? `<audio controls src="${esc(m.audio)}"></audio>` : ''}
      <div class="tm num">${esc(time)}</div></div>`;
  }).join('') + (S.busy ? '<div class="typing"><i></i><i></i><i></i></div>' : '');
}
const scrollChat = () => { const m = $('#main'); m.scrollTop = m.scrollHeight; };
function pushMsg(m) {
  S.msgs.push({ id: uid(), ts: Date.now(), ...m });
  saveLocal();
  if (view === 'talk') { renderChat(); scrollChat(); }
}
async function send(payload) {
  pushMsg({ role: 'me', ...payload });
  S.busy = true; setConn('busy'); if (view === 'talk') { renderChat(); scrollChat(); }
  try {
    const r = await api('chat', { method: 'POST', body: JSON.stringify({ ...payload, lang }) });
    setConn('ok');
    if (r && r.connected === false) pushMsg({ role: 'sys', text: t('notConnected') });
    poll();
  } catch {
    setConn('off');
    pushMsg({ role: 'sys', text: t('offline') });
  } finally { S.busy = false; if (view === 'talk') { renderChat(); scrollChat(); } }
}

let pollTimer = null;
async function poll() {
  try {
    const r = await api('state?since=' + S.cursor);
    setConn(S.busy ? 'busy' : 'ok');
    if (typeof r.connected === 'boolean') S.connected = r.connected;
    (r.events || []).forEach(ev => {
      S.cursor = Math.max(S.cursor, ev.seq || 0);
      if (ev.kind === 'reply') {
        pushMsg({ role: 'ag', text: ev.text, audio: ev.audio, image: ev.image }); tap(16);
        if (window.YD_INTERP && view === 'interpret') window.YD_INTERP({ text: ev.text, audio: ev.audio });
      }
      else if (ev.kind === 'note') pushMsg({ role: 'sys', text: ev.text });
      else if (ev.kind === 'approval') { badge('ops'); tap(40); toast(ev.text || t('opsApprovals')); loadOps(); }
      else if (ev.kind === 'ops') loadOps();
      else if (ev.kind === 'browser') { S.live = ev; renderScreen(); notifyScreen(); }
      else if (ev.kind === 'record' && COLL.includes(ev.collection) && ev.item) {
        const arr = S[ev.collection];
        const i = arr.findIndex(x => x.id === ev.item.id);
        if (i > -1) arr[i] = { ...arr[i], ...ev.item }; else arr.push(ev.item);
        saveLocal(); renderAll();
        toast(t('saved'));
      }
    });
  } catch { setConn('off'); }
}
const startPolling = () => { stopPolling(); pollTimer = setInterval(poll, 5000); };
const stopPolling = () => pollTimer && clearInterval(pollTimer);

function badge(view) {
  const tab = $(`.tab[data-view=${view}]`);
  if (tab && !tab.querySelector('.dot')) tab.insertAdjacentHTML('beforeend', '<span class="dot"></span>');
}
async function loadOps() {
  try {
    const r = await api('ops');
    S.ops = { runs: r.runs || [], approvals: r.approvals || [], tasks: r.tasks || [] };
    if ((S.ops.approvals || []).some(a => a.status === 'pending')) badge('ops');
    if (view === 'ops' || view === 'home') renderAll();
  } catch {}
}

function notifyScreen() {
  const tab = $('.tab[data-view=screen]');
  if (tab && view !== 'screen' && !tab.querySelector('.dot'))
    tab.insertAdjacentHTML('beforeend', '<span class="dot"></span>');
  tap(40);
  toast(lang === 'ur' ? 'DULCi کو آپ کی مدد چاہیے — اسکرین دیکھیں' : 'DULCi needs you — open Screen');
}

/* ============================ agent screen ============================ */
function renderScreen() {
  const has = !!(S.live && S.live.url);
  $('#screenEmpty').hidden = has;
  $('#screenLive').hidden = !has;
  $$('.tab[data-view=screen] .dot').forEach(d => d.remove());
  if (!has) return;
  $('#siText').textContent = S.live.instruction || (lang === 'ur'
    ? 'براہِ کرم اس اسکرین پر لاگ اِن کریں، پھر نیچے والا بٹن دبائیں۔'
    : 'Please log in on this screen, then press the button below.');
  const f = $('#liveFrame');
  if (f.dataset.src !== S.live.url) { f.dataset.src = S.live.url; f.src = S.live.url; f.dataset.loaded = ''; }
  $('#openTab').href = S.live.url;
  $('#frameFallback').hidden = true;
  clearTimeout(f._chk);
  f.onload = () => { f.dataset.loaded = '1'; $('#frameFallback').hidden = true; };
  f._chk = setTimeout(() => { if (!f.dataset.loaded) $('#frameFallback').hidden = false; }, 7000);
}
async function screenAck(done) {
  const sessionId = S.live && S.live.sessionId;
  S.live = null; renderScreen();
  try { await api('ack', { method: 'POST', body: JSON.stringify({ kind: 'screen-ack', done, sessionId }) }); } catch {}
  pushMsg({ role: 'sys', text: done
    ? (lang === 'ur' ? 'DULCi کو بتا دیا گیا — کام جاری ہے۔' : 'DULCi has been told — carrying on.')
    : (lang === 'ur' ? 'منسوخ کر دیا۔' : 'Cancelled.') });
  go('talk');
}

/* ============================ dashboard ============================ */
function renderDash() {
  const s = B.summary(S);
  const kpi = (cls, label, value, sub) => `
    <div class="kpi ${cls}"><h4>${esc(label)}</h4><b class="num" data-cnt="${value}">0</b>
    ${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  $('#dashKpis').innerHTML =
    kpi('j', t('receivable'), s.receivable, s.unpaidInvoices + ' ' + t('unpaid')) +
    kpi('c', t('payable'), s.payable, s.inTransit + ' ' + t('inTransit')) +
    kpi('s', t('cash'), s.cash, '') +
    kpi('g', t('stockValue'), s.stockValue, s.openOrders + ' ' + t('openOrders'));
  $$('#dashKpis b[data-cnt]').forEach(el =>
    countUp(el, Number(el.dataset.cnt), v => 'Rs ' + Math.round(v).toLocaleString('en-US')));

  const m = s.monthly, peak = Math.max(1, ...m.flatMap(x => [x.in, x.out]));
  $('#dashChart').innerHTML = `<h4>${esc(t('thisMonthIn'))} / ${esc(t('thisMonthOut'))}</h4>
    <div class="bars">${m.map(x => `
      <div style="height:${Math.max(3, x.in / peak * 100)}%" title="${x.month} in"></div>
      <div class="out" style="height:${Math.max(3, x.out / peak * 100)}%" title="${x.month} out"></div>`).join('')}</div>
    <div class="legend"><span><i style="background:var(--jade)"></i>${esc(t('totalIn'))}</span>
      <span><i style="background:var(--coral)"></i>${esc(t('totalOut'))}</span></div>`;

  const cust = B.balances('customer', S).filter(x => x.balance > 0).slice(0, 5);
  const overdue = (S.invoices || []).filter(i => B.invStatus(i, S.payments) === 'overdue');
  $('#dashLists').innerHTML = `
    <h4 style="margin:1.3rem 0 .6rem">${esc(t('theyOwe'))}</h4>
    <div class="stmt">${cust.length ? cust.map(c => `
      <div class="stmt-row" data-party="${esc(c.name)}" data-kind="customer">
        <span class="d">${c.rows}</span>
        <span class="n">${esc(c.name)}</span>
        <span class="v in num">${esc(B.pkr(c.balance))}</span>
      </div>`).join('') : `<div class="empty" style="border:0">${esc(t('settled'))}</div>`}</div>
    ${overdue.length ? `<h4 style="margin:1.3rem 0 .6rem">${esc(t('overdue'))}</h4>
    <div class="stmt">${overdue.map(i => `
      <div class="stmt-row" data-inv="${esc(i.id)}"><span class="d">${esc(i.due || '')}</span>
      <span class="n">${esc(i.no || '')}<small>${esc(i.customer || '')}</small></span>
      <span class="v out num">${esc(B.pkr(B.invBalance(i, S.payments)))}</span></div>`).join('')}</div>` : ''}`;
  $$('#dashLists [data-party]').forEach(r => r.onclick = () => statementSheet(r.dataset.party, r.dataset.kind));
  $$('#dashLists [data-inv]').forEach(r => r.onclick = () => {
    const inv = S.invoices.find(x => x.id === r.dataset.inv); if (inv) invoiceView(inv);
  });
}

/* ============================ khata ============================ */
let khataKind = 'customer';
function renderKhata() {
  $('#khataSeg').innerHTML = ['customer', 'supplier'].map(k =>
    `<button class="${k === khataKind ? 'on' : ''}" data-k="${k}">${esc(t(k === 'customer' ? 'customersW' : 'suppliersW'))}</button>`).join('');
  $$('#khataSeg button').forEach(b => b.onclick = () => { khataKind = b.dataset.k; tap(6); renderKhata(); });

  const rows = B.balances(khataKind, S);
  const total = rows.reduce((a, r) => a + Math.max(0, r.balance), 0);
  $('#khataBody').innerHTML = rows.length ? `
    <div class="stmt">${rows.map(r => `
      <div class="stmt-row" data-party="${esc(r.name)}">
        <span class="d">${r.rows}</span>
        <span class="n">${esc(r.name)}<small>${esc(r.balance > 0
          ? (khataKind === 'customer' ? t('theyOwe') : t('weOwe'))
          : r.balance < 0 ? t('paid') : t('settled'))}</small></span>
        <span class="v num ${r.balance > 0 ? (khataKind === 'customer' ? 'in' : 'out') : ''}">${esc(B.pkr(Math.abs(r.balance)))}</span>
      </div>`).join('')}
      <div class="stmt-foot"><span>${esc(khataKind === 'customer' ? t('receivable') : t('payable'))}</span>
        <span class="num">${esc(B.pkr(total))}</span></div>
    </div>` : `<div class="empty">${esc(t('none'))}</div>`;
  $$('#khataBody [data-party]').forEach(r => r.onclick = () => statementSheet(r.dataset.party, khataKind));
}

function statementSheet(party, kind) {
  const st = B.partyStatement(party, kind, S);
  const body = `
    <div class="stmt" style="box-shadow:none;background:transparent;border:0">
      ${st.rows.length ? st.rows.map(r => `
        <div class="stmt-row">
          <span class="d">${esc(String(r.date).slice(5))}</span>
          <span class="n">${esc(r.label)}<small>${esc(r.ref || r.kind)}</small></span>
          <span class="v num ${r.debit ? 'in' : 'out'}">${esc(B.pkr(r.debit || r.credit))}
            <small>${esc(B.pkr(r.balance))}</small></span>
        </div>`).join('') : `<div class="empty">${esc(t('none'))}</div>`}
      <div class="stmt-foot"><span>${esc(t('balance'))}</span>
        <span class="num">${esc(B.pkr(Math.abs(st.balance)))}</span></div>
    </div>`;
  Sheet.open(party, body,
    `<button class="btn btn-ghost" id="stClose">${esc(t('close'))}</button>
     <button class="btn btn-primary" id="stPay">${esc(t('addPay'))}</button>`);
  $('#stClose').onclick = Sheet.close;
  $('#stPay').onclick = () => formSheet('payments', {
    id: uid(), date: B.today(), party, partyType: kind, dir: kind === 'customer' ? 'in' : 'out'
  }, true);
}

/* ============================ cash book ============================ */
function renderCash() {
  const cb = B.cashbook(S);
  $('#cashBody').innerHTML = `
    <div class="kpis">
      <div class="kpi j"><h4>${esc(t('totalIn'))}</h4><b class="num">${esc(B.pkr(cb.in))}</b></div>
      <div class="kpi c"><h4>${esc(t('totalOut'))}</h4><b class="num">${esc(B.pkr(cb.out))}</b></div>
    </div>
    <div class="stmt">${cb.rows.length ? cb.rows.map(r => `
      <div class="stmt-row">
        <span class="d">${esc(String(r.date).slice(5))}</span>
        <span class="n">${esc(r.label || '—')}<small>${esc(r.ref || '')}</small></span>
        <span class="v num ${r.dir === 'in' ? 'in' : 'out'}">${r.dir === 'in' ? '+' : '−'}${esc(B.fmt(r.amount))}
          <small>${esc(B.fmt(r.balance))}</small></span>
      </div>`).join('') : `<div class="empty" style="border:0">${esc(t('none'))}</div>`}
      <div class="stmt-foot"><span>${esc(t('closing'))}</span>
        <span class="num">${esc(B.pkr(cb.closing))}</span></div>
    </div>`;
}

/* ============================ stock ============================ */
function renderStock() {
  const st = B.stockTotals(S);
  $('#stockKpis').innerHTML = `
    <div class="kpi g"><h4>${esc(t('stockValue'))}</h4><b class="num">${esc(B.pkr(st.value))}</b>
      <small>${st.items} ${esc(t('item'))}</small></div>
    <div class="kpi j"><h4>${esc(t('profit'))}</h4><b class="num">${esc(B.pkr(st.profit))}</b></div>`;
  $('#list-stock').innerHTML = st.rows.length ? st.rows.map(r => `
    <div class="card" data-edit="stock" data-id="${esc(r.id)}">
      <div class="card-t">${esc(r.item || '—')}</div>
      <div class="card-s">${esc(t('fInQty'))} ${esc(B.fmt(r.inQty))} · ${esc(t('fOutQty'))} ${esc(B.fmt(r.outQty))}
        · ${esc(t('fUnitCost'))} ${esc(B.pkr(r.unitCost))}</div>
      <div class="card-r"><span class="pill ${r.onHand <= B.n(r.reorder) && B.n(r.reorder) ? 'bad' : 'ok'}">${esc(B.fmt(r.onHand))} ${esc(r.unit || '')}</span>
        <div class="card-s num" style="margin-top:.3rem">${esc(B.pkr(r.value))}</div></div>
    </div>`).join('') : `<div class="empty">${esc(t('none'))}</div>`;
  bindEdits();
}

/* ============================ landed cost ============================ */
const LKEYS = [['unitCny','lUnit','2.5'],['qty','lQty','500'],['fx','lFx','40'],
  ['freight','lFreight','60000'],['dutyPct','lDuty','20'],['taxPct','lTax','18'],
  ['clearing','lClearing','15000'],['inland','lInland','8000'],['misc','lMisc','0'],
  ['marginPct','lMargin','35']];
function renderLanded() {
  const saved = LSget('landed', {});
  $('#landedForm').innerHTML = `<div class="fld-2">` + LKEYS.map(([k, lbl, ph]) => `
    <div class="fld"><label>${esc(t(lbl))}</label>
      <input inputmode="decimal" id="L_${k}" value="${esc(saved[k] ?? '')}" placeholder="${esc(ph)}"></div>`).join('') + `</div>`;
  $$('#landedForm input').forEach(i => i.oninput = calcLanded);
  calcLanded();
}
function calcLanded() {
  const inp = {}; LKEYS.forEach(([k]) => inp[k] = $('#L_' + k).value);
  LSset('landed', inp);
  const r = B.landed(inp);
  $('#landedOut').innerHTML = `
    <div class="kpis" style="margin-top:1rem">
      <div class="kpi j"><h4>${esc(t('lPerUnit'))}</h4><b class="num">${esc(B.pkr(r.perUnit))}</b>
        <small>${esc(t('lGoods'))} ${esc(B.cny(r.goodsCny))}</small></div>
      <div class="kpi g"><h4>${esc(t('lSale'))}</h4><b class="num">${esc(B.pkr(r.sale))}</b>
        <small>${esc(t('lProfit'))} ${esc(B.pkr(r.profit))}</small></div>
    </div>
    <div class="stmt" style="margin-top:.4rem">
      ${[[t('lGoods'), r.goodsPkr], [t('lFreight'), r.freight], ['Duty', r.duty],
         ['Sales tax', r.salesTax], [t('lMisc'), r.other]].map(([l, v]) => `
        <div class="stmt-row"><span class="d"></span><span class="n">${esc(l)}</span>
          <span class="v num">${esc(B.pkr(v))}</span></div>`).join('')}
      <div class="stmt-foot"><span>${esc(t('lTotal'))}</span><span class="num">${esc(B.pkr(r.total))}</span></div>
    </div>
    <p class="hintline">${esc(t('lFreightShare'))}: ${r.freightShare.toFixed(1)}%</p>`;
}

/* ============================ generic records ============================ */
const SCHEMA = {
  orders: { fields: [['customer','fCustomer'],['city','fCity'],['phone','fPhone'],['item','fItem'],
      ['qty','fQty'],['value','fAmount'],['status','fStatus','select',['new','quoted','approved','shipped','done','cancelled']],
      ['date','fDate','date'],['notes','fNotes','area']],
    card: o => [`${o.customer || '—'} · ${o.item || ''}`, `${o.city || ''} ${o.qty ? '· ' + o.qty : ''}`,
      o.status, o.value ? B.pkr(o.value) : ''] },
  customers: { fields: [['name','fName'],['city','fCity'],['phone','fPhone'],['notes','fNotes','area']],
    card: c => [c.name, `${c.city || ''} ${c.phone || ''}`, '', ''] },
  suppliers: { fields: [['name','fName'],['market','fMarket'],['category','fCategory'],
      ['contact','fContact'],['notes','fNotes','area']],
    card: s => [s.name, `${s.market || ''} ${s.category ? '· ' + s.category : ''}`, '', ''] },
  shipments: { fields: [['supplier','fSupplier'],['item','fItem'],['cost','fCost'],['awb','fAwb'],
      ['date','fDate','date'],['status','fStatus','select',['planned','booked','sailing','port','cleared','delivered']],
      ['notes','fNotes','area']],
    card: s => [`${s.supplier || '—'} · ${s.item || ''}`, s.awb || '', s.status, s.cost ? B.pkr(s.cost) : ''] },
  ledger: { fields: [['date','fDate','date'],['type','fType','select',['in','out']],['amount','fAmount'],
      ['category','fCategory'],['note','fNotes','area']],
    card: e => [`${e.category || e.note || '—'}`, e.date || '', e.type, B.pkr(e.amount)] },
  payments: { fields: [['date','fDate','date'],['party','fParty'],
      ['partyType','fType','select',['customer','supplier']],['dir','fDir','select',['in','out']],
      ['amount','fAmount'],['method','fMethod'],['invoice','fInvoice'],['note','fNotes','area']],
    card: p => [`${p.party || '—'}`, `${p.date || ''} ${p.method || ''}`, p.dir, B.pkr(p.amount)] },
  stock: { fields: [['item','fItem'],['unit','fUnit'],['inQty','fInQty'],['outQty','fOutQty'],
      ['unitCost','fUnitCost'],['salePrice','fSalePrice'],['reorder','fReorder'],['notes','fNotes','area']],
    card: s => [s.item, '', '', ''] },
  trips: { fields: [['city','fCity'],['from','fFrom','date'],['to','fTo','date'],
      ['status','fStatus','select',['planning','booked','travelling','done']],['notes','fNotes','area']],
    card: r => [r.city || '—', `${r.from || ''} → ${r.to || ''}`, r.status, ''] },
  content: { fields: [['title','fName'],['platform','fCategory'],
      ['status','fStatus','select',['draft','ready','scheduled','published']],['notes','fNotes','area']],
    card: c => [c.title || '—', c.platform || '', c.status, ''] }
};
const pillCls = s => ['done','delivered','published','paid','approved','cleared','in'].includes(s) ? 'ok'
  : ['cancelled','overdue','out'].includes(s) ? 'bad' : 'warn';

function renderList(coll) {
  const box = $('#list-' + coll); if (!box) return;
  const sc = SCHEMA[coll]; if (!sc) return;
  const arr = [...(S[coll] || [])].reverse();
  box.innerHTML = arr.length ? arr.map(x => {
    const [title, sub, status, right] = sc.card(x);
    return `<div class="card" data-edit="${coll}" data-id="${esc(x.id)}">
      <div class="card-t">${esc(title || '—')}</div>
      ${sub ? `<div class="card-s">${esc(sub)}</div>` : ''}
      <div class="card-r">${status ? `<span class="pill ${pillCls(status)}">${esc(status)}</span>` : ''}
        ${right ? `<div class="card-s num" style="margin-top:.3rem">${esc(right)}</div>` : ''}</div>
    </div>`;
  }).join('') : `<div class="empty">${esc(t('none'))}</div>`;
  bindEdits();
}
function bindEdits() {
  $$('[data-edit]').forEach(c => c.onclick = () => {
    const coll = c.dataset.edit;
    const item = (S[coll] || []).find(x => x.id === c.dataset.id);
    if (item) coll === 'invoices' ? invoiceView(item) : formSheet(coll, item);
  });
}

function field([k, lbl, type, opts], d) {
  const v = d[k] ?? '';
  if (type === 'select') return `<div class="fld"><label>${esc(t(lbl))}</label><select name="${k}">
    ${opts.map(o => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(t('f' + o[0].toUpperCase() + o.slice(1)) !== 'f' + o[0].toUpperCase() + o.slice(1) ? t('f' + o[0].toUpperCase() + o.slice(1)) : o)}</option>`).join('')}
    </select></div>`;
  if (type === 'area') return `<div class="fld"><label>${esc(t(lbl))}</label>
    <textarea name="${k}">${esc(v)}</textarea></div>`;
  if (type === 'date') return `<div class="fld"><label>${esc(t(lbl))}</label>
    <input type="date" name="${k}" value="${esc(v)}"></div>`;
  const numeric = /amount|qty|cost|price|value|reorder|fx/i.test(k);
  return `<div class="fld"><label>${esc(t(lbl))}</label>
    <input name="${k}" value="${esc(v)}" ${numeric ? 'inputmode="decimal"' : ''}></div>`;
}

function formSheet(coll, item, isNew = false) {
  const sc = SCHEMA[coll];
  const d = item || { id: uid(), date: B.today() };
  const fresh = isNew || !item || !(S[coll] || []).some(x => x.id === d.id);
  Sheet.open((fresh ? t('addNew') : t('edit')) + ' · ' + (TITLES()[coll] || coll),
    sc.fields.map(f => field(f, d)).join(''),
    `${fresh ? '' : `<button class="btn btn-danger" id="delBtn">${esc(t('del'))}</button>`}
     <button class="btn btn-primary" id="okBtn">${esc(t('save'))}</button>`);

  $('#okBtn').onclick = () => {
    const rec = { ...d };
    $$('#sheetBody [name]').forEach(el => rec[el.name] = el.value.trim());
    const arr = S[coll] || (S[coll] = []);
    const i = arr.findIndex(x => x.id === rec.id);
    if (i > -1) arr[i] = rec; else arr.push(rec);
    saveLocal(); pushRec(coll, rec); Sheet.close(); renderAll(); toast(t('saved')); tap(12);
  };
  if (!fresh) $('#delBtn').onclick = () => {
    if (!confirm(t('confirmDel'))) return;
    S[coll] = S[coll].filter(x => x.id !== d.id);
    saveLocal(); pushDel(coll, d.id); Sheet.close(); renderAll(); toast(t('deleted'));
  };
}

/* ============================ invoices ============================ */
function nextInvNo() {
  const yr = String(new Date().getFullYear()).slice(2);
  const nums = (S.invoices || []).map(i => Number(String(i.no || '').split('-').pop())).filter(Boolean);
  return `INV-${yr}${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`;
}
function renderInvoices() {
  const box = $('#list-invoices');
  const arr = [...(S.invoices || [])].reverse();
  box.innerHTML = arr.length ? arr.map(i => {
    const st = B.invStatus(i, S.payments);
    return `<div class="card" data-edit="invoices" data-id="${esc(i.id)}">
      <div class="card-t">${esc(i.no || '—')} <span style="color:var(--mute);font-size:.85rem">${esc(i.customer || '')}</span></div>
      <div class="card-s">${esc(i.date || '')} · ${(i.lines || []).length} ${esc(t('item'))}</div>
      <div class="card-r"><span class="pill ${st === 'paid' ? 'ok' : st === 'overdue' ? 'bad' : 'warn'}">${esc(t('st' + st[0].toUpperCase() + st.slice(1)))}</span>
        <div class="card-s num" style="margin-top:.3rem">${esc(B.pkr(B.invTotal(i)))}</div></div>
    </div>`;
  }).join('') : `<div class="empty">${esc(t('none'))}</div>`;
  bindEdits();
}

function invoiceEdit(inv) {
  const d = inv || { id: uid(), no: nextInvNo(), date: B.today(), customer: '',
    lines: [{ item: '', qty: '1', rate: '' }], discount: '', tax: '', advance: '', due: '', notes: '' };
  const lineRow = (l, idx) => `
    <div class="fld-3" data-line="${idx}">
      <div class="fld" style="grid-column:span 3"><label>${esc(t('item'))} ${idx + 1}</label>
        <input name="item" value="${esc(l.item || '')}"></div>
      <div class="fld"><label>${esc(t('qty'))}</label><input name="qty" inputmode="decimal" value="${esc(l.qty || '')}"></div>
      <div class="fld"><label>${esc(t('rate'))}</label><input name="rate" inputmode="decimal" value="${esc(l.rate || '')}"></div>
      <div class="fld"><label>&nbsp;</label><button class="btn btn-sm btn-danger" data-rm="${idx}">✕</button></div>
    </div>`;
  const body = `
    <div class="fld-2">
      <div class="fld"><label>${esc(t('invNo'))}</label><input name="no" value="${esc(d.no)}"></div>
      <div class="fld"><label>${esc(t('invDate'))}</label><input type="date" name="date" value="${esc(d.date)}"></div>
    </div>
    <div class="fld"><label>${esc(t('fCustomer'))}</label><input name="customer" value="${esc(d.customer)}"
      list="custList"><datalist id="custList">${(S.customers || []).map(c => `<option value="${esc(c.name)}">`).join('')}</datalist></div>
    <div class="fld"><label>${esc(t('invDue'))}</label><input type="date" name="due" value="${esc(d.due || '')}"></div>
    <h4 style="margin:.9rem 0 .5rem">${esc(t('item'))}</h4>
    <div id="lines">${(d.lines || []).map(lineRow).join('')}</div>
    <button class="btn btn-sm btn-ghost btn-block" id="addLine">+ ${esc(t('addLine'))}</button>
    <div class="fld-3" style="margin-top:1rem">
      <div class="fld"><label>${esc(t('discount'))}</label><input name="discount" inputmode="decimal" value="${esc(d.discount || '')}"></div>
      <div class="fld"><label>${esc(t('tax'))} %</label><input name="tax" inputmode="decimal" value="${esc(d.tax || '')}"></div>
      <div class="fld"><label>${esc(t('paid'))}</label><input name="advance" inputmode="decimal" value="${esc(d.advance || '')}"></div>
    </div>
    <div class="fld"><label>${esc(t('fNotes'))}</label><textarea name="notes">${esc(d.notes || '')}</textarea></div>`;

  Sheet.open(inv ? t('edit') + ' · ' + d.no : t('invNew'), body,
    `${inv ? `<button class="btn btn-danger" id="delBtn">${esc(t('del'))}</button>` : ''}
     <button class="btn btn-primary" id="okBtn">${esc(t('save'))}</button>`);

  const collect = () => {
    const rec = { ...d };
    ['no','date','customer','due','discount','tax','advance','notes'].forEach(k => {
      const el = $(`#sheetBody [name=${k}]`); if (el) rec[k] = el.value.trim();
    });
    rec.lines = $$('#lines [data-line]').map(row => ({
      item: $('[name=item]', row).value.trim(),
      qty: $('[name=qty]', row).value.trim(),
      rate: $('[name=rate]', row).value.trim()
    })).filter(l => l.item || l.rate);
    return rec;
  };
  const rebind = () => {
    $$('#lines [data-rm]').forEach(b => b.onclick = () => {
      const rec = collect(); rec.lines.splice(Number(b.dataset.rm), 1);
      if (!rec.lines.length) rec.lines = [{ item: '', qty: '1', rate: '' }];
      invoiceEdit(rec);
    });
  };
  $('#addLine').onclick = () => { const rec = collect(); rec.lines.push({ item: '', qty: '1', rate: '' }); invoiceEdit(rec); };
  rebind();
  $('#okBtn').onclick = () => {
    const rec = collect();
    const arr = S.invoices || (S.invoices = []);
    const i = arr.findIndex(x => x.id === rec.id);
    if (i > -1) arr[i] = rec; else arr.push(rec);
    saveLocal(); pushRec('invoices', rec); Sheet.close(); renderAll(); toast(t('saved')); tap(12);
  };
  if (inv) $('#delBtn').onclick = () => {
    if (!confirm(t('confirmDel'))) return;
    S.invoices = S.invoices.filter(x => x.id !== d.id);
    saveLocal(); pushDel('invoices', d.id); Sheet.close(); renderAll(); toast(t('deleted'));
  };
}

function invoiceDoc(inv) {
  const sub = B.invSub(inv), disc = B.invDisc(inv), tax = B.invTaxAmt(inv),
        tot = B.invTotal(inv), paid = B.invPaid(inv, S.payments), bal = tot - paid;
  const cust = (S.customers || []).find(c => c.name === inv.customer) || {};
  return `<div class="doc" id="invDoc">
    <div class="doc-top">
      <div><h1>${esc(BIZ.name)}</h1>
        <div class="doc-sub">${esc(BIZ.trade)}<br>${esc(BIZ.city)} · ${esc(BIZ.phone)} · ${esc(BIZ.web)}</div></div>
      <div class="doc-meta"><b>${esc(t('invoice').toUpperCase())}</b><br>${esc(inv.no || '')}<br>${esc(inv.date || '')}
        ${inv.due ? `<br>${esc(t('invDue'))}: ${esc(inv.due)}` : ''}</div>
    </div>
    <div class="doc-parties">
      <div><h4>${esc(t('invTo'))}</h4><b>${esc(inv.customer || '—')}</b>
        <div class="doc-sub">${esc(cust.city || '')} ${cust.phone ? '· ' + esc(cust.phone) : ''}</div></div>
    </div>
    <table><thead><tr><th>${esc(t('item'))}</th><th class="r">${esc(t('qty'))}</th>
      <th class="r">${esc(t('rate'))}</th><th class="r">${esc(t('amount'))}</th></tr></thead>
      <tbody>${(inv.lines || []).map(l => `<tr><td>${esc(l.item || '')}</td>
        <td class="r">${esc(B.fmt(l.qty))}</td><td class="r">${esc(B.fmt(l.rate))}</td>
        <td class="r">${esc(B.fmt(B.n(l.qty) * B.n(l.rate)))}</td></tr>`).join('')}</tbody></table>
    <div class="doc-tot">
      <div><span>${esc(t('subtotal'))}</span><span>${esc(B.fmt(sub))}</span></div>
      ${disc ? `<div><span>${esc(t('discount'))}</span><span>−${esc(B.fmt(disc))}</span></div>` : ''}
      ${tax ? `<div><span>${esc(t('tax'))} ${esc(inv.tax)}%</span><span>${esc(B.fmt(tax))}</span></div>` : ''}
      <div class="grand"><span>${esc(t('total'))}</span><span>${esc(B.pkr(tot))}</span></div>
      ${paid ? `<div><span>${esc(t('paid'))}</span><span>−${esc(B.fmt(paid))}</span></div>
        <div class="grand"><span>${esc(t('due'))}</span><span>${esc(B.pkr(bal))}</span></div>` : ''}
    </div>
    <div class="doc-words"><b>${esc(t('inWords'))}</b>
      <span class="en">${esc(B.wordsEn(tot))}</span>
      <div class="ur">${esc(B.wordsUr(tot))}</div></div>
    ${inv.notes ? `<div class="doc-sub">${esc(inv.notes)}</div>` : ''}
    <div class="doc-foot"><span>${esc(BIZ.web)} · ${esc(BIZ.phone)}</span><span>${esc(BIZ.name)}</span></div>
  </div>`;
}

function invoiceView(inv) {
  Sheet.open(inv.no || t('invoice'), invoiceDoc(inv),
    `<button class="btn btn-ghost btn-sm" id="invEdit">${esc(t('edit'))}</button>
     <button class="btn btn-ghost btn-sm" id="invShare">${esc(t('share'))}</button>
     <button class="btn btn-primary btn-sm" id="invPrint">${esc(t('print'))}</button>`);
  $('#invEdit').onclick = () => invoiceEdit(inv);
  $('#invPrint').onclick = () => window.print();
  $('#invShare').onclick = () => {
    const tot = B.invTotal(inv), bal = B.invBalance(inv, S.payments);
    const lines = (inv.lines || []).map(l => `• ${l.item} × ${B.fmt(l.qty)} = ${B.pkr(B.n(l.qty) * B.n(l.rate))}`).join('\n');
    const txt = `*${BIZ.name}* — ${BIZ.trade}\n${t('invoice')}: ${inv.no}\n${t('invDate')}: ${inv.date}\n` +
      `${t('invTo')}: ${inv.customer}\n\n${lines}\n\n${t('total')}: ${B.pkr(tot)}` +
      (bal !== tot ? `\n${t('due')}: ${B.pkr(bal)}` : '') +
      `\n${t('inWords')}: ${B.wordsUr(tot)}\n\n${BIZ.phone} · ${BIZ.web}`;
    const cust = (S.customers || []).find(c => c.name === inv.customer);
    const ph = (cust && cust.phone || '').replace(/[^0-9]/g, '').replace(/^0/, '92');
    window.open(`https://wa.me/${ph}?text=${encodeURIComponent(txt)}`, '_blank', 'noopener');
  };
}

/* Removes the sample rows an earlier build seeded on his phone. Matches only
   the exact records seed() creates, so anything he typed himself is untouched. */
const DEMO = {
  customers: ['Rana Traders', 'Al-Madina Store'],
  suppliers: ['Yiwu Hongfa Houseware'],
  orders: ['ORD-1001', 'ORD-1002'],
  invoices: ['INV-260001'],
  stock: ['Steel kitchen set'],
  ledger: ['yuan.pk registration', 'Opening cash'],
  payments: ['Part payment'],
  trips: ['Plan around open orders']
};
function clearDemo() {
  let n = 0;
  const drop = (coll, match) => {
    const before = (S[coll] || []).length;
    S[coll] = (S[coll] || []).filter(x => !match(x));
    n += before - S[coll].length;
  };
  drop('customers', x => DEMO.customers.includes(x.name));
  drop('suppliers', x => DEMO.suppliers.includes(x.name));
  drop('orders',    x => DEMO.orders.includes(x.no));
  drop('invoices',  x => DEMO.invoices.includes(x.no));
  drop('stock',     x => DEMO.stock.includes(x.item));
  drop('ledger',    x => DEMO.ledger.includes(x.note));
  drop('payments',  x => DEMO.payments.includes(x.note));
  drop('trips',     x => DEMO.trips.includes(x.notes));
  LSset('seeded', false);
  saveLocal(); renderAll(); toast(t('demoCleared') + ' (' + n + ')');
}

/* ============================ backup ============================ */
function backup() {
  const data = { at: new Date().toISOString(), biz: BIZ };
  COLL.forEach(c => data[c] = S[c]);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `yuan-desk-${B.today()}.json`; a.click();
  toast(t('saved'));
}

/* ============================ boot ============================ */
function boot() {
  loadLocal();
  document.body.dataset.mode = LSget('mode', 'simple');
  applyLang(); buildTabs();
  const deep = (location.hash || '').slice(1);
  go(TITLES()[deep] ? deep : 'home');
  pullServer(); loadOps(); startPolling(); poll();
  paintSync(); Sync.flush();
  addEventListener('online',  () => { paintSync(); Sync.flush(); pullServer(); });
  addEventListener('offline', () => { paintSync(); setConn('off'); });

  $('#backBtn').onclick = () => go('more');
  $('#themeBtn').onclick = () => { Theme.toggle(); if (view === 'more') renderMore(); };
  $('#setThemeBtn').onclick = () => { Theme.toggle(); renderMore(); };
  $('#langBtn').onclick = $('#setLangBtn').onclick =
    () => { lang = lang === 'ur' ? 'en' : 'ur'; applyLang(); };
  $('#modeBtn').onclick = $('#setModeBtn').onclick = toggleMode;
  $('#backupBtn').onclick = backup;
  const cd = $('#clearDemoBtn'); if (cd) cd.onclick = clearDemo;
  $('#logoutBtn').onclick = () => { LSset('unlocked', false); location.reload(); };

  $('#sendBtn').onclick = () => {
    const el = $('#msgIn'), v = el.value.trim(); if (!v) return;
    el.value = ''; el.style.height = 'auto'; send({ text: v });
  };
  $('#msgIn').addEventListener('input', e => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 130) + 'px';
  });
  $('#msgIn').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && innerWidth > 720) { e.preventDefault(); $('#sendBtn').click(); }
  });
  $('#attachBtn').onclick = () => $('#fileIn').click();
  $('#fileIn').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { send({ image: r.result, text: '' }); go('talk'); };
    r.readAsDataURL(f); e.target.value = '';
  };
  bindMic($('#micSm'), audio => send({ audio, text: '' }));
  bindMic($('#micBig'), audio => { go('talk'); send({ audio, text: '' }); });
  $('#micBig').addEventListener('click', () => { if (!Mic.active) go('talk'); });

  $('#screenDone').onclick = () => screenAck(true);
  $('#screenCancel').onclick = () => screenAck(false);
  $('#sheetClose').onclick = $('#sheetBack').onclick = Sheet.close;
  $('#dashRefresh').onclick = () => { pullServer(); renderDash(); toast(t('refresh')); };
  const oR = $('#opsRefresh');
  if (oR) oR.onclick = () => { loadOps(); Sync.flush(); toast(t('refresh')); };
  $$('[data-new]').forEach(b => b.onclick = () => {
    const c = b.dataset.new;
    c === 'invoices' ? invoiceEdit(null) : formSheet(c, null, true);
  });
  document.addEventListener('visibilitychange', () =>
    document.hidden ? stopPolling() : (startPolling(), poll(), Sync.flush(), loadOps()));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}
function toggleMode() {
  const m = document.body.dataset.mode === 'simple' ? 'full' : 'simple';
  document.body.dataset.mode = m; LSset('mode', m);
  buildTabs(); toast(t(m === 'simple' ? 'modeSimple' : 'modeFull')); tap(12);
  if (!TABS[m].includes(view)) go('home'); else renderAll();
}

/* what ops.js needs, and nothing more */
window.YD = {
  S, api, t, esc, uid, go, toast, Sheet, B, COLL, TITLES,
  saveLocal, renderAll, pushRec, loadOps, send, badge,
  lang: () => lang, addT: d => { Object.assign(T.ur, d.ur || {}); Object.assign(T.en, d.en || {}); },
  formSheet, view: () => view
};

/* ---------------- start ----------------
   Waits for the whole page so ops.js has registered its screens before
   the first render. Booting earlier left the Work view blank. */
function start() {
  Theme.init(); Amb.init();
  applyLang(); buildKeypad();
  if (LSget('unlocked', false)) unlock();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
})();
