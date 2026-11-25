/* ==== CAFFÈ LUNETTA — la scena: il locale in sezione, atmosfera lofi notturna ==== */
'use strict';
const SCENE = (function () {
const RW = 440, RH = 320, OUT = 170;           // larghezza stanza, altezza, strada a sinistra
const ROOMS = DATA.ROOMS.map(r => r.id);
const TAU = Math.PI * 2;
const OL = '#22172a';                           // colore contorno (stile cel)
let cv, c, W = 0, H = 0, DPR = 1, scale = 1, extra = 0;
const cam = { x: -30, vx: 0, target: null, drag: null };
const fx = [];
let rain = true, rainT = 240 + Math.random() * 300;
let hover = null, t = 0, lights = [], grain = null;
const waiters = [];

// ---------------- geometria ----------------
function rx(id) { return ROOMS.indexOf(id) * RW; }
function station(cat) {
  const r = GAME.ROOM_OF[cat], x0 = rx(r);
  if (cat === 'caffe') return { x: x0 + 330, y: 196, qx: x0 + 400, px: x0 + 330, room: r, w: 76, h: 64 };
  if (cat === 'dolci') return { x: x0 + 92, y: 200, qx: x0 + 160, px: x0 + 120, room: r, w: 120, h: 70 };
  if (cat === 'te') return { x: x0 + 96, y: 190, qx: x0 + 160, px: x0 + 120, room: r, w: 80, h: 60 };
  return { x: x0 + 320, y: 236, qx: x0 + 250, px: x0 + 280, room: r, w: 120, h: 150 };
}
const TABLES = {
  bancone: [[70, 300], [160, 300]],
  tavolini: [[230, 298], [330, 298], [270, 262], [380, 262]],
};
let seats = [];
function buildSeats() {
  seats = [];
  const G = GAME.G, b = rx('bancone');
  for (const x of [236, 268]) seats.push({ room: 'bancone', x: b + x, y: 302, kind: 'stand', face: 1 });
  for (const id of ['bancone', 'tavolini']) if (G.rooms[id]) TABLES[id].forEach(([x, y]) => {
    const x0 = rx(id), d = id === 'bancone' ? 20 : 26;
    seats.push({ room: id, x: x0 + x - d, y, kind: 'table', face: 1, tx: x0 + x });
    seats.push({ room: id, x: x0 + x + d, y, kind: 'table', face: -1, tx: x0 + x });
  });
  if (G.rooms.saletta) { const x0 = rx('saletta'); [[230, 292], [320, 274], [395, 296]].forEach(([x, y]) => seats.push({ room: 'saletta', x: x0 + x, y, kind: 'table', arm: 1, face: -1 })); }
  if (G.rooms.laboratorio) { const x0 = rx('laboratorio'); [[90, 294], [150, 294]].forEach(([x, y]) => seats.push({ room: 'laboratorio', x: x0 + x, y, kind: 'table', stool: 1, face: 1 })); }
}
function freeSeat(room, kind) {
  const busy = new Set(GAME.L.customers.filter(k => k.seat && k.seat !== 'none').map(k => k.seat));
  const free = seats.filter(s => s.kind === kind && !busy.has(s));
  if (!free.length) return null;
  const pref = free.filter(s => s.room === room);
  const pool = pref.length ? pref : free;
  return pool[(Math.random() * pool.length) | 0];
}
function worldRight() { let n = 0; for (const r of ROOMS) if (GAME.G.rooms[r]) n++; return Math.min(ROOMS.length, n + 1) * RW; }

// ---------------- init e input ----------------
function init(canvas) {
  cv = canvas; c = cv.getContext('2d');
  GAME.hooks.seat = freeSeat;
  buildSeats();
  grain = document.createElement('canvas'); grain.width = grain.height = 160;
  const gc = grain.getContext('2d'), img = gc.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  gc.putImageData(img, 0, 0);
  const P = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => { const [x, y] = P(e); cam.drag = { x, y, cx: cam.x, moved: 0, t: performance.now(), lx: x }; cam.vx = 0; cam.target = null; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => {
    const [x, y] = P(e);
    if (cam.drag) { const dx = x - cam.drag.x; cam.drag.moved = Math.max(cam.drag.moved, Math.abs(dx)); cam.x = cam.drag.cx - dx / scale; const now = performance.now(); cam.vx = (cam.drag.lx - x) / scale / Math.max(1, now - cam.drag.t) * 1000 * 0.5; cam.drag.t = now; cam.drag.lx = x; }
    hover = hit(x, y); cv.style.cursor = hover ? 'pointer' : 'grab';
  });
  const up = (e) => { if (!cam.drag) return; const [x, y] = P(e); const d = cam.drag; cam.drag = null; if (d.moved < 8) { cam.vx = 0; const h = hit(x, y); if (h) SCENE.onHit && SCENE.onHit(h, x, y); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => { cam.x += (e.deltaX || e.deltaY) / scale; cam.target = null; e.preventDefault(); }, { passive: false });
}
function resize(w, h, dpr) {
  W = w; H = h; DPR = dpr; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.width = w + 'px'; cv.style.height = h + 'px';
  scale = Math.min(h / RH, w / (RW * 1.2));
  if (w / scale > RW * 3) scale = w / (RW * 3);
  extra = Math.max(0, h / scale - RH);
}
function toWorld(sx, sy) { return [sx / scale + cam.x, sy / scale - extra]; }
function hit(sx, sy) {
  const [x, y] = toWorld(sx, sy);
  let best = null, bd = 1e9;
  for (const cu of GAME.L.customers) {
    if (cu.state !== 'wait') continue;
    const by = cu.y - 112, d = Math.hypot(x - cu.x, (y - by) * 0.7);
    if ((d < 30 || (Math.abs(x - cu.x) < 16 && y > cu.y - 90 && y < cu.y + 4)) && d < bd) { bd = d; best = cu; }
  }
  if (best) return { kind: 'table', cu: best };
  for (const cat of GAME.CATS) {
    if (!GAME.G.rooms[GAME.ROOM_OF[cat]]) continue;
    const s = station(cat);
    if (x > s.x - s.w / 2 - 8 && x < s.x + s.w / 2 + 8 && y > s.y - s.h - 34 && y < s.y + 20) return { kind: 'station', cat };
  }
  const next = ROOMS.find(r => !GAME.G.rooms[r]);
  if (next && x > rx(next) && x < rx(next) + RW) return { kind: 'locked', room: next };
  for (const cu of GAME.L.customers) if (cu.reg && Math.abs(x - cu.x) < 18 && y > cu.y - 90 && y < cu.y + 6) return { kind: 'regular', k: cu.reg };
  return null;
}
function focus(room) { cam.target = rx(room) + RW / 2 - (W / scale) / 2; }

// ---------------- movimento ----------------
function updateCustomers(dt) {
  const L = GAME.L, G = GAME.G;
  for (const cu of L.customers) {
    if (cu.y == null) { cu.y = 302 + Math.random() * 6; cu.x = -OUT + 10; cu.ph = Math.random() * TAU; }
    if (cu.state === 'enter') {
      if (cu.mode === 'tavolo') {
        cu.tx = cu.seat.x; cu.ty = cu.seat.y;
        if (walk(cu, dt)) { cu.state = 'wait'; cu.face = cu.seat.face; cu.t = 0; }
        continue;
      }
      const s = station(cu.cat);
      if (cu.full) cu.tx = rx(s.room) + 30;
      else { const q = L.customers.filter(k => k.cat === cu.cat && (k.state === 'queue' || (k.state === 'enter' && k.mode === 'banco')) && k.id < cu.id).length; cu.tx = s.qx - q * 30; }
      if (walk(cu, dt)) {
        if (cu.full) { cu.state = 'leave'; cu.sad = true; G.lost++; cu.say = 'Troppa fila…'; cu.sayT = 2.5; }
        else { cu.state = 'queue'; cu.face = 1; }
      }
    } else if (cu.state === 'queue') {
      const s = station(cu.cat), q = L.customers.filter(k => k.cat === cu.cat && k.state === 'queue' && k.id < cu.id).length;
      cu.tx = s.qx - q * 30; walk(cu, dt);
    } else if (cu.state === 'served') {
      if (!cu.seat) { cu.seat = freeSeat('bancone', 'stand') || 'none'; cu.stay = 5 + Math.random() * 6; chatter(cu); }
      if (cu.seat === 'none') { cu.state = 'leave'; continue; }
      cu.tx = cu.seat.x; cu.ty = cu.seat.y;
      if (walk(cu, dt)) { cu.state = 'sit'; cu.t = 0; cu.face = cu.seat.face; }
    } else if (cu.state === 'sit' || cu.state === 'eat') {
      if (cu.state === 'eat' && !cu.chatted) { cu.chatted = 1; chatter(cu); }
      if (cu.t > cu.stay) { cu.state = 'leave'; cu.ty = 302 + Math.random() * 6; }
    } else if (cu.state === 'leave') {
      if (cu.seat && cu.seat !== 'none') cu.seat = null;
      cu.tx = -OUT - 40; cu.ty = cu.ty || 304;
      if (walk(cu, dt)) cu.gone = true;
    }
  }
  L.customers = L.customers.filter(k => !k.gone);
}
function chatter(cu) {
  if (cu.reg) { const R = DATA.REGULARS[cu.reg]; cu.say = R.lines[(Math.random() * R.lines.length) | 0]; cu.sayT = 5; }
  else if (Math.random() < 0.15) { cu.say = DATA.PASSERS.chat[(Math.random() * DATA.PASSERS.chat.length) | 0]; cu.sayT = 3.5; }
}
function walk(o, dt, speed) {
  const sp = speed || (o.reg === 'ottavio' ? 52 : o.reg === 'grigio' ? 48 : 80);
  const ty = o.ty == null ? 302 : o.ty;
  const dx = o.tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
  if (d < 2) { o.x = o.tx; o.y = ty; o.moving = false; return true; }
  const k = Math.min(1, sp * dt / d);
  o.x += dx * k; o.y += dy * k * (Math.abs(dx) < 70 ? 1 : 0.25);
  if (Math.abs(dx) > 0.5) o.face = dx > 0 ? 1 : -1;
  o.moving = true; o.ph = (o.ph || 0) + dt * sp * 0.11; return false;
}
// camerieri automatici
function updateWaiters(dt) {
  const G = GAME.G, home = rx('bancone') + 196;
  while (waiters.length < G.waiters) waiters.push({ x: home, y: 304, tx: home, ty: 304, state: 'idle', look: waiterLook(waiters.length), face: 1 });
  const sp = GAME.waiterSpeed();
  for (const w of waiters) {
    if (w.state === 'idle') {
      const targets = GAME.L.customers.filter(cu => cu.state === 'wait' && !cu.reserved && G.st[cu.cat].ready >= 1).sort((a, b) => a.patience - b.patience);
      if (targets.length && GAME.reserve(targets[0])) { w.cu = targets[0]; w.cat = w.cu.cat; w.state = 'fetch'; const s = station(w.cat); w.tx = s.px; w.ty = 306; }
      else { w.tx = home + waiters.indexOf(w) * 22; w.ty = 304; walk(w, dt, sp * 0.6); }
    } else if (w.state === 'fetch') {
      if (w.cu.state !== 'wait') { G.st[w.cat].ready++; w.cu.reserved = false; w.cu = null; w.state = 'idle'; continue; }
      if (walk(w, dt, sp)) w.state = 'carry';
    } else if (w.state === 'carry') {
      if (w.cu.state !== 'wait') { G.st[w.cat].ready++; w.cu = null; w.state = 'idle'; continue; }
      w.tx = w.cu.x - (w.cu.face || 1) * 22; w.ty = w.cu.y + 4;
      if (walk(w, dt, sp)) { GAME.deliver(w.cu, true); w.cu = null; w.state = 'idle'; }
    }
  }
}
function waiterLook(i) {
  const L = [{ skin: '#f0c8a8', hair: '#1e1612', style: 'short' }, { skin: '#c98e64', hair: '#3a2418', style: 'bun' }, { skin: '#e8b48a', hair: '#8a2a2a', style: 'pony' }, { skin: '#8e5a3c', hair: '#1e1612', style: 'curly' }][i % 4];
  return Object.assign({ top: '#f4efe6', bot: '#24202e', apron: '#1e2a3a', bow: 1 }, L);
}

// ---------------- utilità di disegno ----------------
function rr(x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function fillRR(x, y, w, h, r, col) { c.fillStyle = col; rr(x, y, w, h, r); c.fill(); }
function circ(x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function ell(x, y, a, b, col) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, a, b, 0, 0, TAU); c.fill(); }
function glow(x, y, r, col, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.globalAlpha = a == null ? 1 : a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.max(0, Math.min(255, r * k)); g = Math.max(0, Math.min(255, g * k)); b = Math.max(0, Math.min(255, b * k)); return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'; }
function light(x, y, r, col, a) { lights.push({ x, y, r, col, a: a == null ? 1 : a }); }
function stroke(w) { c.strokeStyle = OL; c.lineWidth = w || 1.2; c.stroke(); }
function rngS(s) { return () => (s = (s * 16807 + 11) % 2147483647) / 2147483647; }

// finestra sulla città di notte, con neon e pioggia
function windowPane(x, y, w, h, frame, seed) {
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#0e1236'); g.addColorStop(1, '#3a2a62');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  const r = rngS(seed || 1);
  for (let i = 0; i < 4; i++) {
    const bx = x + r() * w * 0.8, bw = 14 + r() * 24, bh = h * (0.3 + r() * 0.6);
    c.fillStyle = i % 2 ? '#1a1a40' : '#22204a'; c.fillRect(bx, y + h - bh, Math.min(bw, x + w - bx), bh);
    for (let k = 0; k < 6; k++) if (r() < 0.5) { c.fillStyle = r() < 0.75 ? '#ffcf7a' : '#7ae0ff'; const wx = bx + 2 + r() * (bw - 6); if (wx < x + w - 3) c.fillRect(wx, y + h - bh + 4 + r() * (bh - 10), 3, 3); }
  }
  if (r() < 0.8) { const nx = x + r() * (w - 16), ny = y + 10 + r() * h * 0.3, col = r() < 0.5 ? '#ff5aa8' : '#5ae6ff'; fillRR(nx, ny, 12, 5, 2, col); light(nx + 6, ny + 2, 26, col, 0.6); }
  if (rain) { c.strokeStyle = 'rgba(170,190,255,.45)'; c.lineWidth = 0.8; for (let i = 0; i < 10; i++) { const rx_ = x + ((i * 37 + t * 60) % w), ry_ = y + ((i * 53 + t * 230) % h); c.beginPath(); c.moveTo(rx_, ry_); c.lineTo(rx_ - 1.5, ry_ + 7); c.stroke(); } }
  for (let i = 0; i < 5; i++) { const gx = x + ((i * 71) % w), gy = y + ((i * 43 + t * (8 + i * 3)) % h); circ(gx, gy, 1.2, 'rgba(200,220,255,.35)'); }
  c.strokeStyle = frame || '#4a2e26'; c.lineWidth = 5; c.strokeRect(x, y, w, h);
  c.lineWidth = 3; c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h * 0.45); c.lineTo(x + w, y + h * 0.45); c.stroke();
  c.fillStyle = frame || '#4a2e26'; c.fillRect(x - 6, y + h, w + 12, 6);
}

// ---------------- stanze ----------------
function wall(x0, top, mid, stripe) {
  c.fillStyle = top; c.fillRect(x0, 0, RW, 236);
  if (stripe) { c.fillStyle = stripe; for (let x = x0 + 8; x < x0 + RW; x += 26) c.fillRect(x, 0, 9, 160); }
  c.fillStyle = mid; c.fillRect(x0, 160, RW, 76);
  c.fillStyle = shade(mid, 0.82); for (let x = x0 + 14; x < x0 + RW - 20; x += 62) { rr(x, 172, 48, 52, 3); c.fill(); }
  c.fillStyle = shade(mid, 1.2); c.fillRect(x0, 160, RW, 4);
}
function floorTiles(x0, a, b) { for (let y = 236, i = 0; y < RH; y += 14, i++) for (let x = x0 - (i % 2) * 14, j = 0; x < x0 + RW; x += 28, j++) { c.fillStyle = (j % 2) ? a : b; c.fillRect(Math.max(x0, x), y, 28 - Math.max(0, x0 - x), 14); } }
function floorWood(x0, a) {
  c.fillStyle = a; c.fillRect(x0, 236, RW, RH - 236);
  c.strokeStyle = shade(a, 0.78); c.lineWidth = 1;
  for (let y = 236; y < RH; y += 11) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + RW, y); c.stroke(); for (let x = x0 + ((y * 7) % 60); x < x0 + RW; x += 90) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 11); c.stroke(); } }
}
function lamp(x, y, col) {
  c.strokeStyle = '#1e1418'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, y - 10); c.stroke();
  c.fillStyle = col || '#2f4a3a'; c.beginPath(); c.moveTo(x - 17, y); c.lineTo(x + 17, y); c.lineTo(x + 8, y - 13); c.lineTo(x - 8, y - 13); c.closePath(); c.fill(); stroke(1);
  ell(x, y + 1, 7, 2.5, '#fff2c4');
  light(x, y + 40, 150, '#ffb060', 0.85); light(x, y + 4, 30, '#fff0c0', 0.9);
}
function cup(x, y, s, col) { fillRR(x - 5 * s, y - 7 * s, 10 * s, 8 * s, 2 * s, col || '#f4efe6'); c.strokeStyle = col || '#f4efe6'; c.lineWidth = 1.4 * s; c.beginPath(); c.arc(x + 5.5 * s, y - 3.5 * s, 2.4 * s, -1.3, 1.3); c.stroke(); ell(x, y + 1 * s, 7 * s, 1.6 * s, '#e4ddd0'); }

function drawUpper() {
  const top = -extra - 2, right = worldRight();
  c.fillStyle = '#8a6a7a'; c.fillRect(-14, top, right + 14, extra + 2);
  c.fillStyle = 'rgba(0,0,0,.08)'; for (let y = -10; y > top; y -= 18) c.fillRect(-14, y, right + 14, 2);
  if (extra > 70) for (let x = 50; x < right - 40; x += 150) { const wy = Math.max(top + 14, -96); fillRR(x, wy, 46, 60, 3, '#ffcf7a'); light(x + 23, wy + 30, 60, '#ffb060', 0.5); c.fillStyle = '#2e4a3c'; c.fillRect(x - 16, wy - 2, 14, 64); c.fillRect(x + 48, wy - 2, 14, 64); }
  c.fillStyle = '#2a1a16'; c.fillRect(-14, -10, right + 14, 10);
}
function drawStreet() {
  const x0 = -OUT;
  const g = c.createLinearGradient(0, -extra, 0, 240); g.addColorStop(0, '#0b0f2e'); g.addColorStop(0.6, '#2a2456'); g.addColorStop(1, '#5a3a6a');
  c.fillStyle = g; c.fillRect(x0, -extra - 2, OUT, 242 + extra);
  const r = rngS(9);
  for (let i = 0; i < 5; i++) { const bx = x0 + i * 36 - 10, bh = 90 + r() * 120; c.fillStyle = i % 2 ? '#1a1838' : '#221e46'; c.fillRect(bx, 240 - bh, 34, bh); for (let k = 0; k < 8; k++) if (r() < 0.45) { c.fillStyle = r() < 0.8 ? '#ffcf7a' : '#7ae0ff'; c.fillRect(bx + 4 + r() * 24, 240 - bh + 6 + r() * (bh - 20), 3, 4); } }
  const flick = Math.sin(t * 23) > -0.92 ? 1 : 0.2;
  fillRR(x0 + 18, 96, 26, 10, 3, '#ff5aa8'); light(x0 + 31, 101, 50, '#ff5aa8', 0.8 * flick);
  fillRR(x0 + 70, 70, 8, 30, 3, '#5ae6ff'); light(x0 + 74, 85, 50, '#5ae6ff', 0.7);
  c.fillStyle = '#2a2838'; c.fillRect(x0, 236, OUT, 84);
  c.fillStyle = '#3a3648'; c.fillRect(x0, 236, OUT, 10);
  for (const [xx, col] of [[x0 + 31, '#ff5aa8'], [x0 + 74, '#5ae6ff'], [x0 + 42, '#ffd090']]) { c.save(); c.globalAlpha = 0.35; const gg = c.createLinearGradient(0, 250, 0, 320); gg.addColorStop(0, col); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.fillRect(xx - 6, 250, 12, 70); c.restore(); }
  c.fillStyle = '#16141e'; c.fillRect(x0 + 40, 90, 4, 150); c.fillRect(x0 + 34, 86, 16, 6);
  circ(x0 + 42, 96, 5, '#ffe0a0'); light(x0 + 42, 110, 110, '#ffc070', 0.9);
  if (rain) { c.strokeStyle = 'rgba(170,190,255,.5)'; c.lineWidth = 1; for (let i = 0; i < 40; i++) { const xx = x0 + ((i * 29 + t * 70) % OUT), yy = -extra + ((i * 47 + t * 420) % (320 + extra)); c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx - 3, yy + 10); c.stroke(); } }
  c.fillStyle = '#4a2e26'; c.fillRect(-14, -extra - 2, 14, 322 + extra);
  const G = GAME.G;
  fillRR(x0 + 66, 18, 94, 38, 7, '#1c1a2a'); c.strokeStyle = '#3a3048'; c.lineWidth = 2; rr(x0 + 66, 18, 94, 38, 7); c.stroke();
  for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#e8dcc8' : '#2e4a3c'; c.beginPath(); c.moveTo(x0 + 64 + i * 16, 62); c.lineTo(x0 + 64 + (i + 1) * 16, 62); c.lineTo(x0 + 64 + (i + 1) * 16, 76); c.quadraticCurveTo(x0 + 64 + (i + 0.5) * 16, 82, x0 + 64 + i * 16, 76); c.fill(); }
  fillRR(x0 + 112, 268, 24, 26, 4, '#8a4a32'); circ(x0 + 116, 260, 12, '#2e5a3a'); circ(x0 + 130, 254, 12, '#3a6a40'); circ(x0 + 124, 264, 11, '#264a30');
  if (G.cosm.marta) { fillRR(x0 + 76, 140, 30, 40, 2, '#f4e8c8'); c.fillStyle = '#2a2a2e'; c.font = '700 6px sans-serif'; c.textAlign = 'center'; c.fillText('SPIFFERI', x0 + 91, 152); c.fillText('sab. piazza', x0 + 91, 172); }
}
// insegna al neon (disegnata dopo la luce, così brilla)
function drawNeonSign() {
  const x0 = -OUT, G = GAME.G, nf = Math.sin(t * 17) > -0.97 ? 1 : 0.3;
  c.save(); c.font = 'italic 600 15px "Fraunces", Georgia, serif'; c.textAlign = 'center';
  c.shadowColor = '#ff7ac0'; c.shadowBlur = 10 * nf; c.fillStyle = nf > 0.5 ? '#ffe0f2' : '#7a4a6a'; c.fillText(G.cosm.grigio ? 'Bar Lunetta' : 'Lunetta', x0 + 116, 43);
  c.strokeStyle = '#8af0ff'; c.shadowColor = '#7ae6ff'; c.shadowBlur = 8; c.lineWidth = 2; c.beginPath(); c.arc(x0 + 79, 37, 7, 0.6, 5.4); c.stroke();
  c.restore();
  glow(x0 + 113, 37, 60, 'rgba(255,90,168,0.6)', 0.5 * nf);
}

function drawBancone() {
  const x0 = rx('bancone'), G = GAME.G;
  wall(x0, '#c9a88e', '#6a3a30', '#c09e86');
  floorTiles(x0, '#d8d0c4', '#34303e');
  windowPane(x0 + 26, 40, 100, 104, '#4a2e26', 3);
  c.fillStyle = '#4a2e22'; c.fillRect(x0 + 200, 60, 220, 6); c.fillRect(x0 + 200, 110, 220, 6);
  const jars = ['#c9905a', '#7a4a2e', '#d8c49a', '#5a3a22', '#e0b070'];
  for (let i = 0; i < 7; i++) { fillRR(x0 + 210 + i * 30, 34, 20, 26, 4, 'rgba(220,235,240,.5)'); fillRR(x0 + 212 + i * 30, 44, 16, 15, 3, jars[i % 5]); fillRR(x0 + 209 + i * 30, 30, 22, 6, 2, '#6a3a26'); }
  for (let i = 0; i < 8; i++) cup(x0 + 216 + i * 26, 108, 1.1, i % 3 ? '#f4efe6' : '#7fa8a0');
  if (G.decor.lavagna) { fillRR(x0 + 146, 30, 40, 60, 3, '#24302c'); c.strokeStyle = '#6a4a3a'; c.lineWidth = 3; rr(x0 + 146, 30, 40, 60, 3); c.stroke(); c.fillStyle = '#e8e4d8'; c.font = '600 6px sans-serif'; c.textAlign = 'center'; c.fillText('MENU', x0 + 166, 42); for (let i = 0; i < 4; i++) c.fillRect(x0 + 153, 50 + i * 8, 18 + (i * 7) % 9, 1.5); }
  if (G.decor.monstera) { fillRR(x0 + 150, 214, 26, 30, 5, '#8a4a32'); const lv = (a, l) => { c.save(); c.translate(x0 + 163, 216); c.rotate(a); ell(0, -l, 11, l * 0.55, '#2e6a3e'); c.restore(); }; [-0.9, -0.4, 0.1, 0.6, 1.0, -0.15].forEach((a, i) => lv(a, 22 + (i % 3) * 7)); }
  const st = G.st.caffe;
  for (let i = 0; i < Math.min(2, st.staff); i++) drawPerson(x0 + 270 - i * 50, 236, { skin: ['#d9a27a', '#e8b48a'][i], hair: ['#1e1612', '#b07a3a'][i], style: ['short', 'bun'][i], top: '#f4efe6', bot: '#24202e', apron: '#2e4a3c' }, { face: 1, bob: Math.sin(t * 2.4 + i) * 0.6 });
  drawPerson(x0 + 380, 236, { skin: '#f0c8a8', hair: '#3a2230', style: 'pony', top: '#f4efe6', bot: '#24202e', apron: '#2e4a3c' }, { face: -1, bob: Math.sin(t * 2) * 0.6, work: tapAnim.caffe > 0 });
  fillRR(x0 + 196, 196, 236, 12, 3, '#2a1a16');
  const g = c.createLinearGradient(0, 206, 0, 262); g.addColorStop(0, '#7a4a30'); g.addColorStop(1, '#4a2a1e');
  c.fillStyle = g; c.fillRect(x0 + 200, 206, 228, 56);
  c.fillStyle = 'rgba(0,0,0,.14)'; for (let x = x0 + 208; x < x0 + 420; x += 46) c.fillRect(x, 212, 36, 44);
  c.fillStyle = '#c9a46a'; c.fillRect(x0 + 196, 196, 236, 2);
  if (G.cosm.nadia) { fillRR(x0 + 220, 184, 14, 13, 3, '#8a4a32'); circ(x0 + 224, 180, 6, '#3a7a4a'); circ(x0 + 231, 177, 6, '#2e6a3e'); }
  if (G.cosm.ottavio) { c.save(); c.translate(x0 + 252, 192); c.rotate(-0.15); fillRR(-10, -4, 20, 9, 1, '#f6f0e0'); c.restore(); }
  drawMachine(x0 + 330, 196);
  lamp(x0 + 260, 58, '#2e4a3c'); lamp(x0 + 380, 58, '#2e4a3c');
  if (G.decor.lucine) { c.strokeStyle = '#1e1418'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0 + 10, 12); for (let i = 0; i <= 10; i++) c.quadraticCurveTo(x0 + 10 + i * 42 - 21, 30, x0 + 10 + i * 42, 12); c.stroke(); for (let i = 0; i < 20; i++) { const xx = x0 + 20 + i * 21, yy = 22 + Math.sin(i * 1.5) * 3; circ(xx, yy, 2.4, '#ffe3a0'); light(xx, yy, 22, '#ffd090', 0.5 + Math.sin(t * 2 + i) * 0.2); } }
  TABLES.bancone.forEach(([x, y]) => drawTable(x0 + x, y, 0.82));
  light(x0 + 76, 92, 90, '#8aa0ff', 0.3);
}
function drawMachine(x, y) {
  const k = tapAnim.caffe > 0 ? 1 + tapAnim.caffe * 0.06 : 1;
  c.save(); c.translate(x, y); c.scale(k, 2 - k);
  const g = c.createLinearGradient(-38, 0, 38, 0); g.addColorStop(0, '#6a6e78'); g.addColorStop(0.4, '#e8ecf0'); g.addColorStop(1, '#7a7e88');
  c.fillStyle = g; rr(-37, -57, 74, 56, 7); c.fill(); stroke(1.4);
  fillRR(-40, -65, 80, 9, 3, '#a8222a');
  circ(-16, -40, 7, '#2a2a2e'); circ(-16, -40, 5, '#e8e4dc');
  circ(14, -40, 4, '#ffcf6a');
  fillRR(-10, -22, 20, 8, 2, '#2a2a2e'); c.fillRect(-2, -14, 4, 6);
  cup(0, -1, 1, '#f4efe6');
  c.restore();
  light(x + 14, y - 40, 16, '#ffcf6a', 0.9);
  for (let i = 0; i < 3; i++) { const a = (t * 0.6 + i / 3) % 1; c.save(); c.globalAlpha = (1 - a) * 0.3; circ(x + Math.sin(a * 6 + i) * 4, y - 72 - a * 30, 4 + a * 6, '#ffffff'); c.restore(); }
}
function drawTavolini() {
  const x0 = rx('tavolini'), G = GAME.G;
  wall(x0, '#5a7a6e', '#4a2e2a', '#527266');
  floorWood(x0, '#7a5236');
  windowPane(x0 + 200, 36, 80, 104, '#3a2420', 5); windowPane(x0 + 320, 36, 80, 104, '#3a2420', 7);
  if (G.decor.tende) for (const wx of [200, 320]) { c.fillStyle = 'rgba(250,240,230,.8)'; c.beginPath(); c.moveTo(x0 + wx - 4, 32); c.quadraticCurveTo(x0 + wx + 14, 90, x0 + wx + 4, 140); c.lineTo(x0 + wx - 4, 140); c.fill(); c.beginPath(); c.moveTo(x0 + wx + 84, 32); c.quadraticCurveTo(x0 + wx + 66, 90, x0 + wx + 76, 140); c.lineTo(x0 + wx + 84, 140); c.fill(); }
  if (G.decor.quadri) { [[150, 60, '#7fa8c0'], [150, 112, '#d8a86a']].forEach(([x, y, col]) => { fillRR(x0 + x - 18, y - 14, 36, 28, 1, '#6a4a2a'); c.fillStyle = col; c.fillRect(x0 + x - 14, y - 10, 28, 20); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x0 + x - 14, y + 2, 28, 3); }); }
  drawPerson(x0 + 92, 216, { skin: '#c98e64', hair: '#2a2a3a', style: 'short', top: '#f4efe6', bot: '#24202e', apron: '#b5523a' }, { face: 1, bob: Math.sin(t * 2 + 1) * 0.6, work: tapAnim.dolci > 0 });
  fillRR(x0 + 30, 200, 124, 60, 4, '#5a3a2a'); stroke(1);
  c.fillStyle = 'rgba(200,230,240,.4)'; rr(x0 + 34, 160, 116, 42, 4); c.fill(); c.strokeStyle = '#c9a46a'; c.lineWidth = 2; c.stroke();
  light(x0 + 92, 180, 60, '#ffe0a0', 0.6);
  const pastries = ['#d8a060', '#a8603a', '#e8c890', '#c87a4a', '#f0d8a8'];
  const n = Math.min(10, G.st.dolci.ready);
  for (let i = 0; i < 10; i++) { const px = x0 + 46 + (i % 5) * 22, py = 182 + Math.floor(i / 5) * 14; if (i < n) { ell(px, py, 8, 4, pastries[i % 5]); ell(px, py - 2, 6, 2.5, shade(pastries[i % 5], 1.15)); } }
  TABLES.tavolini.forEach(([x, y]) => drawTable(x0 + x, y));
  lamp(x0 + 280, 44, '#7a2a2a'); lamp(x0 + 380, 44, '#7a2a2a');
  if (G.decor.giradischi) { fillRR(x0 + 160, 206, 40, 30, 3, '#4a3426'); fillRR(x0 + 158, 200, 44, 8, 2, '#3a2418'); ell(x0 + 180, 200, 14, 3, '#121212'); circ(x0 + 180, 200, 2, '#b5523a'); }
  if (G.decor.cuccia) drawCat(x0 + 410, 300);
}
function drawCat(x, y) {
  ell(x, y, 24, 9, '#5a3424'); ell(x, y - 3, 20, 6, '#8a4a5a');
  ell(x, y - 8, 13, 7, '#24202a'); ell(x + 4, y - 6, 7, 4, '#f4efe6'); circ(x - 10, y - 11, 6, '#24202a');
  c.fillStyle = '#24202a'; c.beginPath(); c.moveTo(x - 14, y - 15); c.lineTo(x - 13, y - 21); c.lineTo(x - 9, y - 16); c.fill(); c.beginPath(); c.moveTo(x - 8, y - 16); c.lineTo(x - 5, y - 21); c.lineTo(x - 4, y - 15); c.fill();
  ell(x - 10, y - 9, 3, 2, '#f4efe6');
}
function drawTable(x, y, k) {
  k = k || 1;
  ell(x, y + 2, 26 * k, 5, 'rgba(0,0,0,.2)');
  c.fillStyle = '#2a1a16'; c.fillRect(x - 2, y - 30 * k, 4, 30 * k); ell(x, y, 12 * k, 3, '#2a1a16');
  ell(x, y - 31 * k, 24 * k, 6, '#d0ccc4'); c.beginPath(); c.ellipse(x, y - 33 * k, 24 * k, 6, 0, 0, TAU); c.fillStyle = '#f6f2ea'; c.fill(); stroke(1);
  fillRR(x - 2, y - 41 * k, 4, 7, 1, '#f4e8d0'); circ(x, y - 43 * k, 1.6, '#ffd070'); light(x, y - 43 * k, 36, '#ffb060', 0.6);
}
function drawSaletta() {
  const x0 = rx('saletta'), G = GAME.G;
  wall(x0, '#2e3a58', '#4a2a2a', '#34405e');
  floorWood(x0, '#5a3a26');
  windowPane(x0 + 240, 40, 90, 100, '#2a1a16', 11);
  if (G.decor.tappeto) { c.save(); c.beginPath(); c.ellipse(x0 + 300, 292, 120, 22, 0, 0, TAU); c.fillStyle = '#7a2a3a'; c.fill(); c.strokeStyle = '#d8a86a'; c.lineWidth = 3; c.stroke(); c.restore(); }
  if (G.decor.libreria) { fillRR(x0 + 350, 30, 80, 200, 2, '#3a2418'); const bc = ['#8a2a2a', '#2a4a6a', '#d8a86a', '#3a6a4a', '#6a3a6a', '#c9784a']; for (let s = 0; s < 5; s++) { c.fillStyle = '#2a1810'; c.fillRect(x0 + 352, 66 + s * 38, 76, 4); for (let i = 0; i < 9; i++) { const h = 22 + ((i * 7 + s * 3) % 10); c.fillStyle = bc[(i + s) % 6]; c.fillRect(x0 + 355 + i * 8, 66 + s * 38 - h, 7, h); } } }
  if (G.decor.pendolo) { const px = x0 + 196; fillRR(px - 14, 60, 28, 170, 4, '#4a2a18'); stroke(1); circ(px, 82, 12, '#f2ead6'); const a = Math.sin(t * 2.2) * 0.25; c.strokeStyle = '#c9a46a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(px, 100); c.lineTo(px + Math.sin(a) * 50, 100 + Math.cos(a) * 50); c.stroke(); circ(px + Math.sin(a) * 50, 100 + Math.cos(a) * 50, 6, '#d8b46a'); }
  fillRR(x0 + 40, 196, 120, 64, 4, '#4a2e1e'); stroke(1); fillRR(x0 + 36, 190, 128, 8, 3, '#2a1810');
  drawPerson(x0 + 132, 190, { skin: '#f6dcc4', hair: '#d8b878', style: 'long', top: '#6f8a4e', bot: '#24202e' }, { face: -1, bob: Math.sin(t * 1.8 + 2) * 0.6, work: tapAnim.te > 0 }, 0.9);
  const k = tapAnim.te > 0 ? 1 + tapAnim.te * 0.08 : 1;
  c.save(); c.translate(x0 + 92, 190); c.scale(k, 2 - k);
  c.beginPath(); c.ellipse(0, -14, 20, 16, 0, 0, TAU); c.fillStyle = '#2a4a3a'; c.fill(); stroke(1.2);
  fillRR(-16, -4, 32, 6, 2, '#1e3428'); circ(0, -31, 4, '#c9a46a');
  c.strokeStyle = '#2a4a3a'; c.lineWidth = 4; c.beginPath(); c.moveTo(16, -18); c.quadraticCurveTo(28, -22, 30, -30); c.stroke(); c.beginPath(); c.arc(-18, -14, 8, 1.6, 4.6); c.stroke();
  c.restore();
  for (let i = 0; i < 2; i++) { const a = (t * 0.5 + i / 2) % 1; c.save(); c.globalAlpha = (1 - a) * 0.3; circ(x0 + 122 + Math.sin(a * 5) * 3, 152 - a * 26, 3 + a * 5, '#ffffff'); c.restore(); }
  c.fillStyle = '#1e1418'; c.fillRect(x0 + 270, 150, 3, 140); ell(x0 + 271, 292, 12, 3, '#1e1418');
  c.fillStyle = '#2f6a4a'; c.beginPath(); c.moveTo(x0 + 256, 152); c.lineTo(x0 + 286, 152); c.lineTo(x0 + 278, 136); c.lineTo(x0 + 264, 136); c.fill(); stroke(1);
  light(x0 + 271, 190, 140, '#ffb060', 0.9); light(x0 + 92, 160, 70, '#ffc080', 0.5);
  [[230, 292], [320, 274], [395, 296]].forEach(([x, y], i) => drawArmchair(x0 + x, y, i === 1 && G.decor.poltrona ? '#2f5a3a' : ['#8a3a3a', '#5a4a7a', '#a8523a'][i]));
  if (G.cosm.leo) { fillRR(x0 + 262, 60, 40, 30, 1, '#f6f0e0'); c.strokeStyle = '#4a4a4a'; c.lineWidth = 0.8; c.strokeRect(x0 + 268, 66, 28, 18); }
}
function drawArmchair(x, y, col) {
  ell(x, y + 2, 26, 5, 'rgba(0,0,0,.25)');
  c.beginPath(); c.roundRect(x - 24, y - 50, 48, 34, 10); c.fillStyle = shade(col, 0.85); c.fill(); stroke(1);
  c.beginPath(); c.roundRect(x - 26, y - 22, 52, 20, 6); c.fillStyle = col; c.fill(); stroke(1);
  fillRR(x - 30, y - 32, 12, 30, 5, shade(col, 0.95)); fillRR(x + 18, y - 32, 12, 30, 5, shade(col, 0.95));
}
function drawLaboratorio() {
  const x0 = rx('laboratorio'), G = GAME.G;
  wall(x0, '#d8ccbc', '#8a7a6a', null);
  c.strokeStyle = 'rgba(0,0,0,.07)'; for (let y = 0; y < 160; y += 16) for (let x = x0; x < x0 + RW; x += 16) c.strokeRect(x, y, 16, 16);
  floorTiles(x0, '#c8bcac', '#b0a290');
  windowPane(x0 + 40, 40, 70, 80, '#4a2e26', 13);
  const k = tapAnim.pasticceria > 0 ? 1 + tapAnim.pasticceria * 0.04 : 1;
  c.save(); c.translate(x0 + 320, 236); c.scale(k, 2 - k);
  c.fillStyle = '#9a4a2e'; c.beginPath(); c.moveTo(-60, 0); c.lineTo(-60, -90); c.quadraticCurveTo(0, -150, 60, -90); c.lineTo(60, 0); c.closePath(); c.fill(); stroke(1.4);
  c.fillStyle = '#1e1410'; c.beginPath(); c.moveTo(-30, -20); c.lineTo(-30, -60); c.quadraticCurveTo(0, -84, 30, -60); c.lineTo(30, -20); c.fill();
  for (let i = 0; i < 5; i++) { c.fillStyle = ['#ff9a3a', '#ffcf6a', '#ff6a2a'][i % 3]; c.beginPath(); c.ellipse(-16 + i * 8, -26, 4, 8 + Math.sin(t * 9 + i) * 3, 0, 0, TAU); c.fill(); }
  fillRR(-64, -4, 128, 8, 2, '#6a2a1a');
  c.restore();
  light(x0 + 320, 205, 160, '#ff8a30', 0.75 + Math.sin(t * 7) * 0.1);
  fillRR(x0 + 140, 214, 110, 10, 2, '#f2eee8'); c.fillStyle = '#6a4a3a'; c.fillRect(x0 + 146, 224, 6, 40); c.fillRect(x0 + 238, 224, 6, 40);
  drawPerson(x0 + 196, 214, { skin: '#e8b48a', hair: '#6a4428', style: 'bun', top: '#f4efe6', bot: '#24202e', apron: '#d8c49a', chef: 1 }, { face: 1, bob: Math.sin(t * 3) * 1, work: tapAnim.pasticceria > 0 });
  [[90, 294], [150, 294]].forEach(([x, y]) => { ell(x0 + x, y - 26, 12, 4, '#6a4a2a'); c.fillStyle = '#2a1a16'; c.fillRect(x0 + x - 8, y - 24, 2, 24); c.fillRect(x0 + x + 6, y - 24, 2, 24); });
  lamp(x0 + 196, 60, '#c9a46a');
  if (G.decor.pianoforte) { fillRR(x0 + 16, 150, 70, 90, 4, '#1e1410'); c.fillStyle = '#f4efe6'; c.fillRect(x0 + 20, 192, 62, 8); }
}
function drawLocked(id) {
  const x0 = rx(id);
  c.fillStyle = '#8a7a6a'; c.fillRect(x0, 0, RW, RH);
  for (let y = 0, i = 0; y < 236; y += 16, i++) for (let x = x0 - (i % 2) * 18; x < x0 + RW; x += 36) { c.fillStyle = (x / 36 + i) % 3 < 1 ? '#7a6a5a' : '#86725e'; c.fillRect(Math.max(x0, x) + 1, y + 1, 34 - Math.max(0, x0 - x), 14); }
  c.fillStyle = '#5a4e44'; c.fillRect(x0, 236, RW, RH - 236);
  c.strokeStyle = '#4a3e34'; c.lineWidth = 4; for (const x of [60, 380]) { c.beginPath(); c.moveTo(x0 + x, 40); c.lineTo(x0 + x, 300); c.stroke(); }
  c.beginPath(); c.moveTo(x0 + 60, 120); c.lineTo(x0 + 380, 120); c.moveTo(x0 + 60, 220); c.lineTo(x0 + 380, 220); c.stroke();
  light(x0 + 220, 100, 170, '#ffc070', 0.6);
}
function drawLockedSign(id) {
  const x0 = rx(id), R = DATA.ROOMS.find(r => r.id === id), G = GAME.G;
  const ok = GAME.famaLevel() >= R.fama, aff = G.money >= R.cost;
  const pulse = ok && aff ? 1 + Math.sin(t * 4) * 0.03 : 1;
  c.save(); c.translate(x0 + RW / 2, 168); c.scale(pulse, pulse);
  fillRR(-120, -46, 240, 92, 10, '#f6ecd8'); c.strokeStyle = '#4a2e20'; c.lineWidth = 3; rr(-120, -46, 240, 92, 10); c.stroke();
  c.fillStyle = '#4a2e20'; c.textAlign = 'center'; c.font = '600 16px "Fraunces", Georgia, serif'; c.fillText(R.n, 0, -18);
  c.font = '700 11px "Nunito", sans-serif'; c.fillStyle = '#7a5a44';
  c.fillText(ok ? 'Lavori in corso' : 'Serve più fama: «' + DATA.FAMA_NAMES[R.fama] + '»', 0, 2);
  c.font = '800 15px "Nunito", sans-serif'; c.fillStyle = ok && aff ? '#2e7a4a' : '#8a5a44'; c.fillText(UI.money(R.cost), 0, 28);
  c.restore();
}

// ---------------- persone (stile anime con contorno) ----------------
function drawPerson(x, y, L, o, sc) {
  o = o || {}; sc = (sc || 1) * (L.h || 1);
  c.save(); c.translate(x, y + (o.bob || 0)); c.scale(sc * (o.face || 1), sc);
  c.lineJoin = 'round';
  const walkA = o.walk ? Math.sin(o.walk) : 0;
  if (o.sit) {
    c.fillStyle = L.bot; c.beginPath(); c.roundRect(-6, -24, 20, 8, 3); c.fill(); stroke(1);
    c.beginPath(); c.roundRect(8, -22, 7, 20, 3); c.fill(); stroke(1);
    fillRR(7, -4, 11, 4, 2, '#1e1a1e');
  } else {
    ell(0, 1, 12, 3, 'rgba(0,0,0,.3)');
    for (const [sx, a] of [[-4, walkA], [4, -walkA]]) { c.save(); c.translate(sx, -23); c.rotate(a * 0.35); c.beginPath(); c.roundRect(-3.2, 0, 6.4, 23, 3); c.fillStyle = L.bot; c.fill(); stroke(1); c.restore(); }
    fillRR(-8 + walkA * 7, -3, 9, 4, 2, '#1e1a1e'); fillRR(0 - walkA * 7, -3, 9, 4, 2, '#1e1a1e');
  }
  c.beginPath(); c.roundRect(-10, -51, 20, 31, 8); c.fillStyle = L.top; c.fill(); stroke(1.2);
  if (L.apron) { c.beginPath(); c.roundRect(-8, -40, 16, 22, 3); c.fillStyle = L.apron; c.fill(); stroke(0.8); c.fillStyle = L.apron; c.fillRect(-5, -49, 10, 9); }
  if (L.bow) { c.fillStyle = '#1e1a1e'; c.beginPath(); c.moveTo(0, -49); c.lineTo(-4, -51); c.lineTo(-4, -47); c.closePath(); c.moveTo(0, -49); c.lineTo(4, -51); c.lineTo(4, -47); c.fill(); }
  const arm = (rot, len) => { c.save(); c.translate(6, -46); c.rotate(rot); c.beginPath(); c.roundRect(-3, 0, 6, len, 3); c.fillStyle = shade(L.top, 0.88); c.fill(); stroke(1); circ(0, len, 2.6, L.skin); c.restore(); };
  if (o.work) arm(-1.2 + Math.sin(t * 20) * 0.2, 18);
  else if (o.tray) { arm(-1.45, 16); fillRR(6, -64, 24, 3, 1.5, '#d8d4cc'); c.save(); c.translate(18, -66); c.scale(o.face || 1, 1); c.font = '10px sans-serif'; c.textAlign = 'center'; c.fillText(o.tray, 0, 0); c.restore(); }
  else if (o.hold) { arm(-0.9, 16); cup(16, -37, 0.8); }
  else arm(-0.12 - walkA * 0.3, 20);
  c.fillStyle = L.skin; c.fillRect(-3, -56, 6, 6);
  c.beginPath(); c.arc(0, -65, 12, 0, TAU); c.fillStyle = L.skin; c.fill(); stroke(1.2);
  drawHair(L);
  const blink = (Math.sin(t * 0.7 + x * 0.13) > 0.985);
  for (const ex of [4, 9.5]) {
    if (blink) { c.strokeStyle = OL; c.lineWidth = 1; c.beginPath(); c.moveTo(ex - 1.8, -65); c.lineTo(ex + 1.8, -65); c.stroke(); }
    else { ell(ex, -65.5, 1.7, 2.5, '#2a1a24'); circ(ex + 0.6, -66.6, 0.7, '#ffffff'); }
  }
  c.strokeStyle = shade(L.hair, 0.8); c.lineWidth = 0.9; c.beginPath(); c.moveTo(2.4, -70); c.lineTo(5.6, -70.6); c.moveTo(8, -70.6); c.lineTo(11, -70); c.stroke();
  ell(7, -60.5, 2.6, 1.3, 'rgba(240,110,120,.45)');
  c.strokeStyle = '#6a2a2a'; c.lineWidth = 0.9; c.beginPath(); if (o.sad) c.arc(7.5, -56.5, 1.8, 3.6, 5.8); else c.arc(7.5, -59.6, 1.6, 0.3, 1.9); c.stroke();
  if (L.glasses) { c.strokeStyle = '#2a2a2e'; c.lineWidth = 0.9; c.beginPath(); c.arc(4, -65.5, 3, 0, TAU); c.moveTo(12.5, -65.5); c.arc(9.5, -65.5, 3, 0, TAU); c.stroke(); }
  if (L.earring) circ(-2, -59, 1.4, '#e8c060');
  if (L.hat) { fillRR(-14, -77, 28, 4, 2, '#2a2a30'); c.beginPath(); c.roundRect(-9, -87, 18, 12, 4); c.fillStyle = '#2a2a30'; c.fill(); stroke(1); }
  if (L.chef) { c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(-10, -88, 20, 14, 6); c.fill(); circ(-6, -88, 6, '#ffffff'); circ(6, -88, 6, '#ffffff'); }
  c.restore();
}
function drawHair(L) {
  const h = L.hair, hi = shade(h, 1.6);
  c.fillStyle = h;
  if (L.style === 'bald') { c.beginPath(); c.arc(0, -65, 12.3, 2.5, 4.3); c.fill(); return; }
  c.beginPath(); c.arc(0, -67, 12.8, Math.PI * 0.92, Math.PI * 2.06); c.closePath(); c.fill(); stroke(1.1);
  c.fillStyle = h; c.beginPath(); c.moveTo(-6, -77); c.lineTo(13, -73); c.lineTo(12.6, -67); c.lineTo(9.5, -70.5); c.lineTo(7, -67.5); c.lineTo(4.5, -71); c.lineTo(1.5, -67); c.lineTo(-1, -71); c.closePath(); c.fill();
  if (L.style === 'short') { c.beginPath(); c.moveTo(-12.6, -66); c.lineTo(-11, -56); c.lineTo(-6, -60); c.lineTo(-5, -68); c.fill(); }
  else if (L.style === 'long') { c.beginPath(); c.moveTo(-12.6, -68); c.quadraticCurveTo(-16, -50, -12, -40); c.lineTo(-4, -42); c.lineTo(-5, -66); c.fill(); stroke(1); }
  else if (L.style === 'bun') { c.beginPath(); c.arc(-9, -77, 6, 0, TAU); c.fill(); stroke(1); c.beginPath(); c.moveTo(-12.6, -66); c.lineTo(-11, -59); c.lineTo(-6, -64); c.fill(); }
  else if (L.style === 'pony') { c.beginPath(); c.moveTo(-10, -70); c.quadraticCurveTo(-24, -62, -17, -44); c.lineTo(-12, -47); c.quadraticCurveTo(-16, -58, -7, -65); c.fill(); stroke(1); }
  else if (L.style === 'curly') { for (let i = 0; i < 7; i++) circ(-10 + i * 3.6, -75 + Math.sin(i * 1.7) * 2, 5.2, h); circ(-12, -66, 5, h); }
  c.strokeStyle = hi; c.lineWidth = 1.4; c.globalAlpha = 0.7; c.beginPath(); c.arc(0, -67, 9, Math.PI * 1.15, Math.PI * 1.45); c.stroke(); c.globalAlpha = 1;
}
function isSitting(cu) { return (cu.state === 'wait' || cu.state === 'eat' || cu.state === 'sit') && cu.seat && cu.seat !== 'none' && cu.seat.kind !== 'stand' && !cu.moving; }
function drawCustomerBody(cu) {
  const s = isSitting(cu), dy = s ? (cu.seat.arm ? 18 : 16) : 0;
  drawPerson(cu.x, cu.y - dy, cu.look, { face: cu.face || 1, walk: cu.moving ? cu.ph : 0, sit: s, sad: cu.sad, hold: cu.state === 'eat' || cu.state === 'sit' || cu.state === 'served' });
}
function drawCustomerOverlay(cu) {
  const hx = cu.x, hy = cu.y - 96 - (isSitting(cu) ? 16 : 0);
  if (cu.say) { speech(hx, hy, cu.say, cu.hint); return; }
  const showOrder = cu.state === 'queue' || cu.state === 'wait' || (cu.state === 'enter' && cu.mode === 'banco' && !cu.full && Math.abs(cu.x - cu.tx) < 120);
  if (!showOrder) { if (cu.reg && cu.state !== 'leave') nameTag(cu); return; }
  const r = DATA.R[cu.rid], waitT = cu.state === 'wait';
  const ready = waitT && GAME.G.st[cu.cat].ready >= 1 && !cu.reserved;
  const pulse = ready ? 1 + Math.sin(t * 6) * 0.08 : 1;
  c.save(); c.translate(hx, hy); c.scale(pulse, pulse);
  fillRR(-16, -15, 32, 26, 11, ready ? '#fff3c8' : '#fffaf0');
  c.strokeStyle = ready ? '#e8a84a' : 'rgba(74,46,32,.25)'; c.lineWidth = ready ? 2 : 1; rr(-16, -15, 32, 26, 11); c.stroke();
  c.fillStyle = ready ? '#fff3c8' : '#fffaf0'; c.beginPath(); c.moveTo(-4, 10); c.lineTo(2, 17); c.lineTo(5, 10); c.fill();
  c.font = '15px sans-serif'; c.textAlign = 'center'; c.fillText(DATA.BASES[r.b].icon, 0, 4);
  if (r.i.length) { c.font = '9px sans-serif'; c.fillText(DATA.INGS[r.i[0]].icon, 12, -6); }
  if (waitT && cu.reserved) { c.font = '9px sans-serif'; c.fillText('🏃', -13, -7); }
  const max = waitT ? 48 + GAME.atmosphere() * 0.3 + (cu.reg ? 30 : 0) : 28 + GAME.atmosphere() * 0.25 + (cu.reg ? 30 : 0);
  const p = Math.max(0, cu.patience / max); c.strokeStyle = p > 0.5 ? '#7ac07a' : p > 0.25 ? '#e8b04a' : '#e0583a'; c.lineWidth = 2.5; c.beginPath(); c.arc(0, -2, 19.5, -Math.PI / 2, -Math.PI / 2 + TAU * p); c.stroke();
  c.restore();
  if (ready && GAME.G.tut < 3) { c.save(); c.globalAlpha = 0.6 + Math.sin(t * 5) * 0.4; c.font = '800 10px "Nunito", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff6e4'; c.fillText('tocca per servire', hx, hy - 26); c.restore(); }
  if (cu.reg) nameTag(cu);
}
function nameTag(cu) {
  c.font = '800 9px "Nunito", sans-serif'; c.textAlign = 'center';
  const nm = DATA.REGULARS[cu.reg].n, w = c.measureText(nm).width + 10;
  fillRR(cu.x - w / 2, cu.y + 4, w, 13, 6, 'rgba(255,246,228,.9)'); c.fillStyle = '#5a3a26'; c.fillText(nm, cu.x, cu.y + 14);
}
function speech(x, y, text, isHint) {
  c.font = '600 10px "Nunito", sans-serif';
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (c.measureText(tt).width > 150) { lines.push(cur); cur = w; } else cur = tt; }
  lines.push(cur);
  const w = Math.min(164, Math.max(...lines.map(l => c.measureText(l).width))) + 14, h = lines.length * 12 + 8;
  let bx = x - w / 2; bx = Math.max(cam.x + 4, Math.min(cam.x + W / scale - w - 4, bx));
  const by = y - h + 8;
  fillRR(bx, by, w, h, 8, isHint ? '#fff3c8' : '#fffaf0');
  if (isHint) { c.strokeStyle = '#d8a84a'; c.lineWidth = 1.2; rr(bx, by, w, h, 8); c.stroke(); }
  c.fillStyle = isHint ? '#fff3c8' : '#fffaf0'; c.beginPath(); c.moveTo(x - 4, by + h - 1); c.lineTo(x + 1, by + h + 7); c.lineTo(x + 5, by + h - 1); c.fill();
  c.fillStyle = '#4a3226'; c.textAlign = 'left';
  lines.forEach((l, i) => c.fillText(l, bx + 7, by + 14 + i * 12));
}
function stationBadge(cat) {
  const s = station(cat), st = GAME.G.st[cat], cap = GAME.bufCap(cat);
  const q = GAME.L.customers.filter(k => k.cat === cat && k.state === 'queue').length;
  const x = s.x, y = s.y - s.h - 22;
  const hov = hover && hover.kind === 'station' && hover.cat === cat;
  const pul = pulseSt[cat] > 0 ? 1 + pulseSt[cat] * 0.25 : 1;
  c.save(); c.translate(x, y); c.scale(pul, pul);
  fillRR(-31, -11, 62, 21, 10, pulseSt[cat] > 0 ? 'rgba(200,80,60,.95)' : hov ? 'rgba(46,74,60,.95)' : 'rgba(26,20,36,.82)');
  c.fillStyle = '#fff6e4'; c.font = '800 11px "Nunito", sans-serif'; c.textAlign = 'center';
  c.fillText(DATA.CATS[cat].icon + ' ' + Math.floor(st.ready) + '/' + cap, 0, 4);
  if (GAME.autoRate(cat) > 0) { c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(-24, 7, 48, 2); c.fillStyle = '#ffcf6a'; c.fillRect(-24, 7, 48 * st.prog, 2); }
  if (q) { fillRR(24, -17, 18, 14, 7, '#c8583a'); c.fillStyle = '#fff'; c.font = '800 9px "Nunito", sans-serif'; c.fillText(q, 33, -7); }
  c.restore();
  if (GAME.G.tut < 1 && cat === 'caffe') { c.save(); c.globalAlpha = 0.5 + Math.sin(t * 5) * 0.5; c.font = '800 12px "Nunito", sans-serif'; c.fillStyle = '#fff6e4'; c.textAlign = 'center'; c.fillText('Tocca la macchina!', x, y - 22); c.restore(); }
}

// ---------------- effetti ----------------
const tapAnim = { caffe: 0, dolci: 0, te: 0, pasticceria: 0 };
const pulseSt = { caffe: 0, dolci: 0, te: 0, pasticceria: 0 };
function addFloat(x, y, text, col) { fx.push({ x, y, text, col: col || '#7ae0a0', t: 0 }); }
function onTap(cat) { tapAnim[cat] = 1; const s = station(cat); addFloat(s.x + (Math.random() - 0.5) * 20, s.y - s.h - 38, '+' + GAME.tapYield(cat) + ' ' + DATA.CATS[cat].icon, '#ffe0a0'); for (let i = 0; i < 4; i++) fx.push({ puff: 1, x: s.x + (Math.random() - 0.5) * 30, y: s.y - s.h * 0.6, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, t: 0 }); }
function onServe(cu) { addFloat(cu.x, cu.y - 104, '+' + UI.money(cu.paid), '#7ae0a0'); }
function onDeliver(cu, manual) {
  if (manual) { const s = station(cu.cat); fx.push({ tray: DATA.BASES[DATA.R[cu.rid].b].icon, x0: s.x, y0: s.y - s.h * 0.5, x1: cu.x, y1: cu.y - 50, t: 0 }); }
  addFloat(cu.x, cu.y - 112, '+' + UI.money(cu.paid), '#ffd98a');
}
function noReady(cat) { pulseSt[cat] = 1; const s = station(cat); addFloat(s.x, s.y - s.h - 44, 'Prima prepara!', '#ffb0a0'); }

// ---------------- frame ----------------
function frame(dt) {
  t += dt; lights = [];
  rainT -= dt; if (rainT <= 0) { rain = !rain; rainT = rain ? 240 + Math.random() * 300 : 120 + Math.random() * 160; }
  for (const k in tapAnim) { tapAnim[k] = Math.max(0, tapAnim[k] - dt * 5); pulseSt[k] = Math.max(0, pulseSt[k] - dt * 2.5); }
  updateCustomers(dt); updateWaiters(dt);
  const vis = W / scale, minX = -OUT, maxX = Math.max(minX, worldRight() - vis);
  if (!cam.drag) {
    if (cam.target != null) { cam.x += (cam.target - cam.x) * Math.min(1, dt * 4); if (Math.abs(cam.target - cam.x) < 1) cam.target = null; }
    else { cam.x += cam.vx * dt; cam.vx *= Math.pow(0.04, dt); }
  }
  if (cam.x < minX) { cam.x += (minX - cam.x) * Math.min(1, dt * 10); if (cam.target != null && cam.target < minX) cam.target = null; }
  if (cam.x > maxX) { cam.x += (maxX - cam.x) * Math.min(1, dt * 10); if (cam.target != null && cam.target > maxX) cam.target = null; }

  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.fillStyle = '#0e0c18'; c.fillRect(0, 0, W, H);
  c.save(); c.scale(scale, scale); c.translate(-cam.x, extra);
  if (extra > 0) drawUpper();
  drawStreet();
  const nextLocked = ROOMS.find(r => !GAME.G.rooms[r]);
  for (const id of ROOMS) {
    const x0 = rx(id);
    if (x0 > cam.x + vis + 10 || x0 + RW < cam.x - 10) continue;
    if (!GAME.G.rooms[id]) { if (id === nextLocked) drawLocked(id); continue; }
    if (id === 'bancone') drawBancone(); else if (id === 'tavolini') drawTavolini(); else if (id === 'saletta') drawSaletta(); else drawLaboratorio();
    c.fillStyle = '#2a1a16'; c.fillRect(x0 + RW - 4, 0, 8, 236);
  }
  const people = GAME.L.customers.map(cu => ({ y: cu.y, cu })).concat(waiters.map(w => ({ y: w.y + 0.5, w })));
  people.sort((a, b) => a.y - b.y);
  for (const p of people) {
    if (p.cu) drawCustomerBody(p.cu);
    else drawPerson(p.w.x, p.w.y, p.w.look, { face: p.w.face, walk: p.w.moving ? p.w.ph : 0, tray: p.w.state === 'carry' ? DATA.CATS[p.w.cat].icon : null });
  }
  // ---- luce: notte su tutto, poi pozze di luce calda e neon ----
  c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = '#46447e'; c.fillRect(cam.x - 2, -extra - 2, vis + 4, RH + extra + 4); c.restore();
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const L of lights) { if (L.x + L.r < cam.x || L.x - L.r > cam.x + vis) continue; glow(L.x, L.y, L.r, L.col, L.a * 0.95); }
  c.restore();
  drawNeonSign();
  // interfaccia sopra la luce
  if (nextLocked) drawLockedSign(nextLocked);
  for (const cat of GAME.CATS) if (GAME.G.rooms[GAME.ROOM_OF[cat]]) stationBadge(cat);
  for (const cu of GAME.L.customers) drawCustomerOverlay(cu);
  for (const f of fx) {
    f.t += dt;
    if (f.puff) { f.x += f.vx * dt; f.y += f.vy * dt; c.save(); c.globalAlpha = Math.max(0, 0.4 - f.t); circ(f.x, f.y, 3 + f.t * 10, '#ffffff'); c.restore(); }
    else if (f.tray) { const k = Math.min(1, f.t / 0.45), x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(k * Math.PI) * 50; c.save(); c.globalAlpha = 1 - Math.max(0, (f.t - 0.45) * 4); fillRR(x - 12, y + 6, 24, 3, 1.5, '#d8d4cc'); c.font = '14px sans-serif'; c.textAlign = 'center'; c.fillText(f.tray, x, y + 4); c.restore(); }
    else { c.save(); c.globalAlpha = Math.max(0, 1 - f.t / 1.2); c.font = '800 12px "Nunito", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#1a1424'; c.fillText(f.text, f.x + 1, f.y - f.t * 30 + 1); c.fillStyle = f.col; c.fillText(f.text, f.x, f.y - f.t * 30); c.restore(); }
  }
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t > 1.3) fx.splice(i, 1);
  c.restore();
  const vg = c.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,6,24,.45)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = 0.07; c.globalCompositeOperation = 'overlay';
  const ox = (Math.random() * 160) | 0, oy = (Math.random() * 160) | 0;
  c.translate(-ox, -oy); c.fillStyle = c.createPattern(grain, 'repeat'); c.fillRect(0, 0, W + 160, H + 160); c.restore();
}

return { init, resize, frame, focus, onTap, onServe, onDeliver, noReady, addFloat, buildSeats, station, get rain() { return rain; }, onHit: null };
})();
