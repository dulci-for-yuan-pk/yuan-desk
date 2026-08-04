/* Generates the app icons at build time — no dependencies, just node's zlib.
   Keeps binary files out of git while still shipping real PNGs for the
   iPhone home screen. Run by netlify.toml's build command. */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'public/img';

/* ---------- tiny PNG writer ---------- */
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = buf => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;                              // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;   // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- the mark ---------- */
const mix = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
const PETROL_TOP = [4, 16, 26], PETROL_BOT = [14, 56, 78];
const JADE = [18, 223, 160], GOLD = [245, 203, 123];

/* distance from point p to segment ab */
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
  const dx = px - (ax + t * vx), dy = py - (ay + t * vy);
  return Math.hypot(dx, dy);
}

function icon(size, maskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const pad = maskable ? size * 0.30 : size * 0.19;
  const inner = size - pad * 2;
  const cx = size / 2, cy = size / 2;
  const ringR = inner / 2, ringW = Math.max(1.4, size * 0.019);
  const stroke = Math.max(2, size * 0.055) / 2;
  const glowR = size * 0.46, glowCy = size * 0.40;

  // the Y: two arms into a stem, plus a gold crossbar (a yuan mark)
  const top = cy - inner * 0.26, mid = cy + inner * 0.03, bot = cy + inner * 0.30;
  const left = cx - inner * 0.235, right = cx + inner * 0.235;
  const barY = mid + inner * 0.115, barW = inner * 0.20;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const p = y / size;
      let r = mix(PETROL_TOP[0], PETROL_BOT[0], p);
      let g = mix(PETROL_TOP[1], PETROL_BOT[1], p);
      let b = mix(PETROL_TOP[2], PETROL_BOT[2], p);

      // jade glow behind the mark
      const gd = Math.hypot(x - cx, y - glowCy) / glowR;
      if (gd < 1) {
        const a = Math.pow(1 - gd, 2.4) * 0.42;
        r = mix(r, JADE[0], a); g = mix(g, JADE[1], a); b = mix(b, JADE[2], a);
      }

      // gold ring
      const rd = Math.abs(Math.hypot(x - cx, y - cy) - ringR);
      if (rd < ringW) {
        const a = 1 - rd / ringW;
        r = mix(r, GOLD[0], a); g = mix(g, GOLD[1], a); b = mix(b, GOLD[2], a);
      }

      // jade Y
      const dy = Math.min(
        segDist(x, y, left, top, cx, mid),
        segDist(x, y, right, top, cx, mid),
        segDist(x, y, cx, mid, cx, bot)
      );
      if (dy < stroke + 1) {
        const a = Math.min(1, (stroke + 1 - dy));
        r = mix(r, JADE[0], a); g = mix(g, JADE[1], a); b = mix(b, JADE[2], a);
      }

      // gold crossbar
      const db = segDist(x, y, cx - barW, barY, cx + barW, barY);
      if (db < stroke * 0.62 + 1) {
        const a = Math.min(1, (stroke * 0.62 + 1 - db)) * 0.92;
        r = mix(r, GOLD[0], a); g = mix(g, GOLD[1], a); b = mix(b, GOLD[2], a);
      }

      buf[i] = Math.round(r); buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(b); buf[i + 3] = 255;
    }
  }
  return png(size, size, buf);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/icon-192.png`, icon(192));
writeFileSync(`${OUT}/icon-512.png`, icon(512));
writeFileSync(`${OUT}/icon-maskable.png`, icon(512, true));
writeFileSync(`${OUT}/apple-touch-icon.png`, icon(180));
console.log('Yuan Desk icons generated in', OUT);
