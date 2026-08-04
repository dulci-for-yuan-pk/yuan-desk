/* ============================================================
   Yuan Desk — UI layer
   Theme (day/night), living background, motion, haptics, waveform.
   Exposes window.UI
   ============================================================ */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const LSget = (k, d) => { try { return JSON.parse(localStorage.getItem('yd_' + k)) ?? d; } catch { return d; } };
const LSset = (k, v) => { try { localStorage.setItem('yd_' + k, JSON.stringify(v)); } catch {} };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- haptics ---------------- */
const tap = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

/* ---------------- theme ---------------- */
const SUN  = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/></svg>';
const MOON = '<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"/></svg>';

function byClock() { const h = new Date().getHours(); return (h >= 6 && h < 18) ? 'day' : 'night'; }

function applyTheme(t, animate = true) {
  const html = document.documentElement;
  if (animate && !reduce) html.style.transition = 'background-color .55s cubic-bezier(.22,.61,.36,1)';
  html.dataset.theme = t;
  const btn = $('#themeBtn'); if (btn) btn.innerHTML = t === 'day' ? MOON : SUN;
  const setBtn = $('#setThemeBtn');
  if (setBtn) setBtn.textContent = window.T_LABEL ? window.T_LABEL(t) : t;
  $$('meta[name=theme-color]').forEach(m => m.setAttribute('content', t === 'day' ? '#F4EDE1' : '#04101A'));
  Amb.recolor();
}

const Theme = {
  init() {
    const saved = LSget('theme', null);
    applyTheme(saved || byClock(), false);
    if (!saved) {
      // No manual choice yet: keep following his clock.
      setInterval(() => { if (!LSget('theme', null)) applyTheme(byClock()); }, 15 * 60 * 1000);
    }
  },
  toggle() {
    const next = document.documentElement.dataset.theme === 'day' ? 'night' : 'day';
    LSset('theme', next); applyTheme(next); tap(12);
    return next;
  },
  current: () => document.documentElement.dataset.theme
};

/* ---------------- living background ---------------- */
const Amb = {
  cv: null, ctx: null, blobs: [], raf: 0, w: 0, h: 0, cols: [], running: false,
  init() {
    if (reduce) return;
    this.cv = $('#amb'); if (!this.cv) return;
    this.ctx = this.cv.getContext('2d', { alpha: true });
    this.resize();
    const n = matchMedia('(max-width:520px)').matches ? 4 : 6;
    this.blobs = Array.from({ length: n }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - .5) * 0.00028, vy: (Math.random() - .5) * 0.00024,
      r: 0.26 + Math.random() * 0.3, c: i % 3
    }));
    this.recolor();
    addEventListener('resize', () => this.resize(), { passive: true });
    document.addEventListener('visibilitychange', () => document.hidden ? this.stop() : this.start());
    this.start();
  },
  recolor() {
    if (!this.ctx) return;
    const cs = getComputedStyle(document.documentElement);
    this.cols = ['--amb-a', '--amb-b', '--amb-c'].map(v => cs.getPropertyValue(v).trim() || '#12DFA0');
  },
  resize() {
    if (!this.cv) return;
    const d = Math.min(devicePixelRatio || 1, 1.6);
    this.w = this.cv.width = innerWidth * d;
    this.h = this.cv.height = innerHeight * d;
    this.cv.style.width = innerWidth + 'px';
    this.cv.style.height = innerHeight + 'px';
  },
  frame(t) {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    this.blobs.forEach((b, i) => {
      b.x += b.vx; b.y += b.vy;
      if (b.x < -.25 || b.x > 1.25) b.vx *= -1;
      if (b.y < -.25 || b.y > 1.25) b.vy *= -1;
      const wob = Math.sin(t / 5200 + i * 1.7) * 0.05;
      const cx = (b.x + wob) * w, cy = (b.y - wob) * h, r = (b.r + wob) * Math.max(w, h) * .55;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, this.cols[b.c] || '#12DFA0');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.globalAlpha = .5;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill();
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    this.raf = requestAnimationFrame(ts => this.frame(ts));
  },
  start() { if (!this.ctx || this.running) return; this.running = true; this.raf = requestAnimationFrame(t => this.frame(t)); },
  stop()  { this.running = false; cancelAnimationFrame(this.raf); }
};

/* ---------------- 3D tilt on cards ---------------- */
function tilt(el, max = 7) {
  if (reduce) return;
  let raf = 0;
  const move = e => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - .5;
    const py = (e.clientY - r.top) / r.height - .5;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      el.style.transform =
        `perspective(760px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateZ(6px)`;
    });
  };
  const clear = () => { cancelAnimationFrame(raf); el.style.transform = ''; };
  el.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') move(e); });
  el.addEventListener('pointerleave', clear);
  el.addEventListener('pointerdown', () => tap(6));
}
const tiltAll = (sel, root = document) => $$(sel, root).forEach(el => tilt(el));

/* ---------------- count-up numbers ---------------- */
function countUp(el, to, fmt = n => Math.round(n).toLocaleString('en-US')) {
  if (reduce) { el.textContent = fmt(to); return; }
  const from = 0, dur = 780, t0 = performance.now();
  const step = t => {
    const p = Math.min((t - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------------- toast ---------------- */
let toastT;
function toast(msg) {
  const el = $('#toast'); if (!el) return;
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600);
}

/* ---------------- sheet (with drag to dismiss) ---------------- */
const Sheet = {
  open(title, bodyHtml, footHtml = '') {
    $('#sheetTitle').textContent = title;
    $('#sheetBody').innerHTML = bodyHtml;
    $('#sheetFoot').innerHTML = footHtml;
    $('#sheetFoot').hidden = !footHtml;
    $('#sheetWrap').hidden = false;
    $('#sheetBody').scrollTop = 0;
    this.bindDrag();
  },
  close() { $('#sheetWrap').hidden = true; },
  bindDrag() {
    const sh = $('#sheet'), grip = $('#sheet .sheet-grip');
    if (!grip || grip._bound) return;
    grip._bound = true;
    let y0 = 0, dy = 0, on = false;
    grip.addEventListener('pointerdown', e => { on = true; y0 = e.clientY; sh.style.transition = 'none'; grip.setPointerCapture(e.pointerId); });
    grip.addEventListener('pointermove', e => {
      if (!on) return; dy = Math.max(0, e.clientY - y0);
      sh.style.transform = `translateY(${dy}px)`;
    });
    grip.addEventListener('pointerup', () => {
      on = false; sh.style.transition = '';
      if (dy > 110) { Sheet.close(); tap(10); }
      sh.style.transform = ''; dy = 0;
    });
  }
};

/* ---------------- microphone with real waveform ---------------- */
const Mic = {
  rec: null, chunks: [], stream: null, ac: null, an: null, raf: 0, bars: [],
  async start(btn, onDone) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast(window.T_MIC_DENIED || 'Microphone permission is needed.');
      return false;
    }
    tap(14);
    btn.classList.add('rec');
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream);
    this.rec.ondataavailable = e => e.data.size && this.chunks.push(e.data);
    this.rec.onstop = () => {
      const blob = new Blob(this.chunks, { type: this.rec.mimeType || 'audio/webm' });
      this.teardown(btn);
      if (blob.size < 900) { toast(window.T_MIC_SHORT || 'Too short.'); return; }
      const fr = new FileReader();
      fr.onload = () => onDone(fr.result);
      fr.readAsDataURL(blob);
    };
    this.rec.start();
    this.meter();
    return true;
  },
  stop(btn) {
    if (this.rec && this.rec.state !== 'inactive') this.rec.stop();
    else this.teardown(btn);
  },
  teardown(btn) {
    btn && btn.classList.remove('rec');
    cancelAnimationFrame(this.raf);
    const w = $('#wave'); if (w) { w.hidden = true; w.innerHTML = ''; }
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.ac) { try { this.ac.close(); } catch {} this.ac = null; }
    this.stream = null; this.rec = null;
  },
  meter() {
    const w = $('#wave'); if (!w || reduce) return;
    w.hidden = false;
    w.innerHTML = Array.from({ length: 21 }, () => '<i></i>').join('');
    this.bars = $$('#wave i');
    try {
      this.ac = new (window.AudioContext || window.webkitAudioContext)();
      const src = this.ac.createMediaStreamSource(this.stream);
      this.an = this.ac.createAnalyser(); this.an.fftSize = 64;
      src.connect(this.an);
      const buf = new Uint8Array(this.an.frequencyBinCount);
      const draw = () => {
        this.an.getByteFrequencyData(buf);
        this.bars.forEach((b, i) => {
          const v = buf[Math.floor(i * buf.length / this.bars.length)] / 255;
          b.style.height = (4 + v * 22).toFixed(1) + 'px';
        });
        this.raf = requestAnimationFrame(draw);
      };
      draw();
    } catch {}
  },
  get active() { return !!this.rec; }
};

/* press-and-hold, with a tap fallback so he can never get stuck */
function bindMic(btn, onDone) {
  let held = false, timer = null;
  const begin = e => {
    e.preventDefault();
    timer = setTimeout(async () => { held = await Mic.start(btn, onDone); }, 130);
  };
  const end = () => {
    clearTimeout(timer);
    if (held) { Mic.stop(btn); held = false; }
  };
  btn.addEventListener('pointerdown', begin);
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
  btn.addEventListener('pointerleave', end);
}

window.UI = { $, $$, LSget, LSset, tap, Theme, Amb, tilt, tiltAll, countUp, toast, Sheet, Mic, bindMic, reduce, applyTheme };
})();
