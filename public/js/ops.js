/* ============================================================
   Yuan Desk — the operations layer
   This is what makes it a desk he runs DULCi from, rather than a chat.
     • Approvals  — anything public waits here for one tap
     • Tasks      — honest live status instead of silence
     • Run log    — what DULCi did, and what it cost
     • Interpreter— full screen, for standing in front of a supplier
     • Plan       — the order book as a Yiwu itinerary
   ============================================================ */
(() => {
'use strict';
const YD = window.YD;
if (!YD) return;
const { S, api, t, esc, go, toast, B } = YD;
const { $, $$, tap, bindMic, Mic } = window.UI;

const KIND = {
  ur: { publish:'اشاعت', post:'سوشل پوسٹ', submit:'سرکاری فارم', payment:'ادائیگی',
        message:'گاہک کو پیغام', listing:'اشتہار', order:'آرڈر' },
  en: { publish:'Publish', post:'Social post', submit:'Official form', payment:'Payment',
        message:'Message a customer', listing:'Listing', order:'Order' }
};
const kindTx = k => (KIND[YD.lang()] || KIND.en)[k] || k || '';

const dtf = v => v ? new Date(v).toLocaleString(YD.lang() === 'ur' ? 'ur-PK' : 'en-GB',
  { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const stTx = s => t('st' + String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1)) || s;
const stCls = s => ['done', 'approved'].includes(s) ? 'ok'
  : ['failed', 'blocked', 'rejected'].includes(s) ? 'bad' : 'warn';

/* ============================================================
   WORK — approvals first, because they are blocking him
   ============================================================ */
function renderOps() {
  const box = $('#opsBody'); if (!box) return;
  const { approvals = [], tasks = [], runs = [] } = S.ops || {};
  const pending = approvals.filter(a => a.status === 'pending');
  const live = tasks.filter(x => ['queued', 'working', 'blocked'].includes(x.status));
  const ur = YD.lang() === 'ur';

  box.innerHTML = `
    <h4 style="margin:.2rem 0 .6rem">${esc(t('opsApprovals'))}</h4>
    ${pending.length ? pending.map(a => `
      <div class="appr" data-appr="${esc(a.id)}">
        <div class="appr-kind">${esc(kindTx(a.kind))}</div>
        <div class="appr-t">${esc((ur ? a.title_ur : a.title_en) || a.title_en || a.title_ur || '')}</div>
        ${(ur ? a.detail_ur : a.detail_en) ? `<div class="appr-d">${esc(ur ? a.detail_ur : a.detail_en)}</div>` : ''}
        ${a.amount ? `<div class="appr-amt num">${esc(B.pkr(a.amount))}</div>` : ''}
        ${a.preview_url ? `<a class="appr-link" href="${esc(a.preview_url)}" target="_blank" rel="noopener noreferrer">${esc(t('interpretShow'))}</a>` : ''}
        <div class="appr-act">
          <button class="btn btn-sm btn-ghost" data-no="${esc(a.id)}">${esc(t('refuse'))}</button>
          <button class="btn btn-sm btn-primary" data-yes="${esc(a.id)}">${esc(t('approve'))}</button>
        </div>
      </div>`).join('') : `<div class="empty">${esc(t('nothingPending'))}</div>`}

    <h4 style="margin:1.4rem 0 .6rem">${esc(t('opsTasks'))}</h4>
    ${live.length ? `<div class="stmt">${live.map(x => `
      <div class="stmt-row">
        <span class="d">${esc(dtf(x.created_at).split(',')[0] || '')}</span>
        <span class="n">${esc((ur ? x.title_ur : x.title_en) || x.title_en || x.title_ur || '')}
          <small>${esc(x.blocked_why || stTx(x.status))}</small>
          ${x.progress ? `<span class="prog"><i style="width:${Math.min(100, x.progress)}%"></i></span>` : ''}
        </span>
        <span class="v"><span class="pill ${stCls(x.status)}">${esc(stTx(x.status))}</span></span>
      </div>`).join('')}</div>` : `<div class="empty">${esc(t('none'))}</div>`}

    <h4 style="margin:1.4rem 0 .6rem">${esc(t('opsRuns'))}</h4>
    ${runs.length ? `<div class="stmt">${runs.slice(0, 15).map(r => `
      <div class="stmt-row">
        <span class="d">${esc(dtf(r.started_at))}</span>
        <span class="n">${esc(r.title || r.kind || '—')}<small>${esc(r.summary || '')}</small></span>
        <span class="v"><span class="pill ${stCls(r.status)}">${esc(stTx(r.status))}</span>
          ${r.cost_usd ? `<small class="num">$${Number(r.cost_usd).toFixed(3)}</small>` : ''}</span>
      </div>`).join('')}</div>` : `<div class="empty">${esc(S.db ? t('none') : t('notConnected'))}</div>`}`;

  $$('#opsBody .dot').forEach(d => d.remove());
  $$('.tab[data-view=ops] .dot').forEach(d => d.remove());
  $$('#opsBody [data-yes]').forEach(b => b.onclick = () => decide(b.dataset.yes, 'approved'));
  $$('#opsBody [data-no]').forEach(b => b.onclick = () => decide(b.dataset.no, 'rejected'));
}

async function decide(id, decision) {
  tap(18);
  const card = $(`[data-appr="${id}"]`);
  if (card) { card.style.opacity = '.45'; card.style.pointerEvents = 'none'; }
  try {
    await api('ops', { method: 'POST', body: JSON.stringify({ approvalId: id, decision }) });
    toast(t(decision === 'approved' ? 'approved' : 'refused'));
    await YD.loadOps(); renderOps();
  } catch {
    toast(t('offline'));
    if (card) { card.style.opacity = ''; card.style.pointerEvents = ''; }
  }
}

/* ============================================================
   INTERPRETER — the screen that matters most in a Yiwu aisle
   Urdu in, Chinese on screen to show and to play aloud.
   ============================================================ */
function renderInterpret() {
  const box = $('#interpBody'); if (!box) return;
  if (!box.dataset.built) {
    box.dataset.built = '1';
    box.innerHTML = `
      <p class="mic-note" style="margin:.2rem 0 1rem">${esc(t('interpretHint'))}</p>
      <div class="mic-wrap">
        <button class="mic-big" id="interpMic">
          <span class="mic-ring"></span>
          <svg viewBox="0 0 24 24" class="mic-ico"><path d="M12 15a4 4 0 004-4V7a4 4 0 00-8 0v4a4 4 0 004 4z"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>
          <span class="mic-label">中文</span>
        </button>
        <div class="wave" id="wave2" hidden></div>
      </div>
      <div class="interp-actions">
        <button class="btn btn-ghost btn-sm" id="interpPhoto">${esc(t('interpretPhoto'))}</button>
        <input type="file" id="interpFile" accept="image/*" capture="environment" hidden>
      </div>
      <div id="interpFeed" class="interp-feed"></div>`;

    bindMic($('#interpMic'), audio => {
      YD.send({ audio, text: '', mode: 'interpreter' });
      pushInterp({ side: 'me', text: YD.lang() === 'ur' ? '…' : '…' });
    });
    $('#interpPhoto').onclick = () => $('#interpFile').click();
    $('#interpFile').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => YD.send({ image: r.result, text: '', mode: 'interpreter' });
      r.readAsDataURL(f); e.target.value = '';
    };
  }
  paintFeed();
}

function pushInterp(item) { S.interp.push(item); paintFeed(); }

function paintFeed() {
  const f = $('#interpFeed'); if (!f) return;
  const rows = S.interp.slice(-8).reverse();
  f.innerHTML = rows.length ? rows.map((m, i) => `
    <div class="interp-card ${i === 0 ? 'lead' : ''} ${m.side}">
      <div class="interp-text">${esc(m.text || '')}</div>
      ${m.audio ? `<audio controls src="${esc(m.audio)}"></audio>` : ''}
      ${i === 0 ? `<div class="interp-note">${esc(t('interpretShow'))}</div>` : ''}
    </div>`).join('') : `<div class="empty">${esc(t('interpretHint'))}</div>`;
}

/* DULCi's replies land here too when he is in interpreter mode */
window.YD_INTERP = reply => { if (reply && (reply.text || reply.audio)) pushInterp({ side: 'ag', ...reply }); };

/* ============================================================
   SOURCING PLAN — the order book turned into an itinerary
   ============================================================ */
function renderPlan() {
  const box = $('#planBody'); if (!box) return;
  const plan = (S.plan || []);
  if (!plan.length) {
    const openOrders = (S.orders || []).filter(o => !['done', 'cancelled'].includes(o.status));
    box.innerHTML = `<div class="empty">${esc(t('planEmpty'))}</div>
      ${openOrders.length ? `
        <h4 style="margin:1.3rem 0 .6rem">${esc(t('openOrders'))}</h4>
        <div class="stmt">${openOrders.map(o => `
          <div class="stmt-row"><span class="d">${esc(String(o.date || '').slice(5))}</span>
            <span class="n">${esc(o.item || '')}<small>${esc(o.customer || '')}</small></span>
            <span class="v num">${esc(B.fmt(o.qty))}</span></div>`).join('')}</div>` : ''}
      <button class="btn btn-primary btn-block" id="askPlan" style="margin-top:1.2rem">${esc(t('navPlan'))}</button>`;
    const btn = $('#askPlan');
    if (btn) btn.onclick = () => {
      YD.send({ text: YD.lang() === 'ur'
        ? 'میرے کھلے آرڈرز سے ییوو کے سفر کا خریداری منصوبہ بنا دیں — کون سی مارکیٹ، کیا خریدنا ہے، ہدف قیمت کیا رکھنی ہے۔'
        : 'Build a Yiwu sourcing plan from my open orders — which district, what to buy, and the target price for each.' });
      go('talk');
    };
    return;
  }
  const byDistrict = {};
  plan.forEach(p => { (byDistrict[p.district || '—'] ||= []).push(p); });
  box.innerHTML = Object.entries(byDistrict).map(([d, items]) => `
    <h4 style="margin:1.1rem 0 .5rem">${esc(t('district'))} — ${esc(d)}</h4>
    <div class="stmt">${items.map(p => `
      <div class="stmt-row">
        <span class="d">${esc(B.fmt(p.qty))}</span>
        <span class="n">${esc(p.item || '')}<small>${esc(p.supplier_name || '')}</small></span>
        <span class="v num">${p.target_cny ? '¥' + esc(B.fmt(p.target_cny)) : ''}
          ${p.quoted_cny ? `<small>¥${esc(B.fmt(p.quoted_cny))}</small>` : ''}</span>
      </div>`).join('')}</div>`).join('');
}

/* ---------------- register with the app ---------------- */
window.YD_VIEWS = Object.assign(window.YD_VIEWS || {}, {
  ops: renderOps,
  interpret: renderInterpret,
  plan: renderPlan
});
})();
