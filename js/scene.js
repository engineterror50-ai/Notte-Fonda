/* ==== CAFFÈ LUNETTA — la scena: il locale in sezione ==== */
'use strict';
const SCENE = (function () {
const RW = 440, RH = 320, OUT = 150;           // larghezza stanza, altezza, strada a sinistra
const ROOMS = DATA.ROOMS.map(r => r.id);
const FEET = 298;                               // linea dei piedi in primo piano
const TAU = Math.PI * 2;
let cv, c, W = 0, H = 0, DPR = 1, scale = 1;
const cam = { x: -30, vx: 0, target: null, drag: null };
const fx = [];                                  // testi fluttuanti, sbuffi
let rain = false, rainT = 300 + Math.random() * 400, rainDrops = [];
let hover = null, t = 0, extra = 0;

// ---------------- geometria delle stanze ----------------
function rx(id) { return ROOMS.indexOf(id) * RW; }
// postazione di ogni categoria (in coordinate mondo)
function station(cat) {
  const r = GAME.ROOM_OF[cat], x0 = rx(r);
  if (cat === 'caffe') return { x: x0 + 310, y: 176, qx: x0 + 360, room: r, w: 76, h: 64 };
  if (cat === 'dolci') return { x: x0 + 92, y: 200, qx: x0 + 150, room: r, w: 120, h: 70 };
  if (cat === 'te') return { x: x0 + 96, y: 172, qx: x0 + 150, room: r, w: 80, h: 60 };
  return { x: x0 + 320, y: 170, qx: x0 + 260, room: r, w: 110, h: 110 };
}
// posti a sedere / in piedi
let seats = [];
function buildSeats() {
  seats = [];
  const G = GAME.G;
  const b = rx('bancone');
  // al bancone, in piedi, all'italiana
  for (let i = 0; i < 3; i++) seats.push({ room: 'bancone', x: b + 70 + i * 52, y: 292, kind: 'stand', face: 1 });
  if (G.rooms.tavolini) { const x0 = rx('tavolini'); [[230, 292], [330, 292], [270, 258], [380, 258]].forEach(([x, y], i) => { seats.push({ room: 'tavolini', x: x0 + x - 26, y, kind: 'chair', face: 1, tbl: i }); seats.push({ room: 'tavolini', x: x0 + x + 26, y, kind: 'chair', face: -1, tbl: i }); }); }
  if (G.rooms.saletta) { const x0 = rx('saletta'); [[230, 288], [320, 270], [395, 292]].forEach(([x, y]) => seats.push({ room: 'saletta', x: x0 + x, y, kind: 'arm', face: -1 })); }
  if (G.rooms.laboratorio) { const x0 = rx('laboratorio'); [[90, 290], [150, 290]].forEach(([x, y]) => seats.push({ room: 'laboratorio', x: x0 + x, y, kind: 'stool', face: 1 })); }
  for (const s of seats) s.who = null;
}
function freeSeat(prefRoom) {
  const busy = new Set(GAME.L.customers.filter(k => k.seat).map(k => k.seat));
  const free = seats.filter(s => !busy.has(s));
  if (!free.length) return null;
  const pref = free.filter(s => s.room === prefRoom || (prefRoom === 'laboratorio' && s.room !== 'bancone'));
  const pool = pref.length ? pref : free;
  return pool[(Math.random() * pool.length) | 0];
}
function worldRight() {
  let n = 0; for (const r of ROOMS) if (GAME.G.rooms[r]) n++;
  return Math.min(ROOMS.length, n + 1) * RW;
}

// ---------------- init e input ----------------
function init(canvas) {
  cv = canvas; c = cv.getContext('2d');
  buildSeats();
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
  // almeno una stanza e mezza visibile; se avanza altezza, mostriamo il soffitto
  scale = Math.min(h / RH, w / (RW * 1.2));
  if (w / scale > RW * 3) scale = w / (RW * 3);
  extra = Math.max(0, h / scale - RH);
}
function toWorld(sx, sy) { return [sx / scale + cam.x, sy / scale - extra]; }
function hit(sx, sy) {
  const [x, y] = toWorld(sx, sy);
  for (const cat of GAME.CATS) {
    if (!GAME.G.rooms[GAME.ROOM_OF[cat]]) continue;
    const s = station(cat);
    if (x > s.x - s.w / 2 - 8 && x < s.x + s.w / 2 + 8 && y > s.y - s.h - 10 && y < s.y + 30) return { kind: 'station', cat };
  }
  // stanza in costruzione
  const next = ROOMS.find(r => !GAME.G.rooms[r]);
  if (next && x > rx(next) && x < rx(next) + RW) return { kind: 'locked', room: next };
  // clienti abituali
  for (const cu of GAME.L.customers) if (cu.reg && Math.abs(x - cu.x) < 18 && y > cu.y - 80 && y < cu.y + 6) return { kind: 'regular', k: cu.reg };
  return null;
}
function focus(room) { cam.target = rx(room) + RW / 2 - (W / scale) / 2; }

// ---------------- movimento dei clienti ----------------
function updateCustomers(dt) {
  const L = GAME.L, G = GAME.G;
  for (const cu of L.customers) {
    if (cu.y == null) { cu.y = 300 + Math.random() * 8; cu.x = -OUT + 10; cu.ph = Math.random() * TAU; }
    if (cu.state === 'enter') {
      const s = station(cu.cat);
      if (cu.full) { cu.tx = rx(s.room) + 30; }
      else {
        const q = L.customers.filter(k => k.cat === cu.cat && (k.state === 'queue' || k.state === 'enter') && k.id < cu.id).length;
        cu.tx = s.qx - q * 30;
      }
      if (walk(cu, dt)) {
        if (cu.full) { cu.state = 'leave'; cu.sad = true; G.lost++; cu.say = 'Troppa fila…'; cu.sayT = 2.5; }
        else { cu.state = 'queue'; cu.face = 1; }
      }
    } else if (cu.state === 'queue') {
      const s = station(cu.cat), q = L.customers.filter(k => k.cat === cu.cat && k.state === 'queue' && k.id < cu.id).length;
      cu.tx = s.qx - q * 30; walk(cu, dt);
    } else if (cu.state === 'served') {
      if (!cu.seat) {
        cu.seat = freeSeat(GAME.ROOM_OF[cu.cat]) || 'none';
        cu.stay = 7 + Math.random() * 9 + (cu.reg ? 10 : 0);
        if (cu.reg) { const R = DATA.REGULARS[cu.reg]; cu.say = R.lines[(Math.random() * R.lines.length) | 0]; cu.sayT = 5; }
        else if (Math.random() < 0.18) { cu.say = DATA.PASSERS.chat[(Math.random() * DATA.PASSERS.chat.length) | 0]; cu.sayT = 3.5; }
      }
      if (cu.seat === 'none') { cu.state = 'leave'; continue; }
      cu.tx = cu.seat.x; cu.ty = cu.seat.y;
      if (walk(cu, dt)) { cu.state = 'sit'; cu.t = 0; cu.face = cu.seat.face; }
    } else if (cu.state === 'sit') {
      if (cu.t > cu.stay) { cu.state = 'leave'; cu.ty = 300 + Math.random() * 8; }
    } else if (cu.state === 'leave') {
      cu.tx = -OUT - 40; cu.seat = cu.seat === 'none' ? null : cu.seat;
      if (walk(cu, dt)) cu.gone = true;
    }
  }
  L.customers = L.customers.filter(k => !k.gone);
}
function walk(cu, dt) {
  const sp = cu.reg === 'ottavio' ? 52 : cu.reg === 'grigio' ? 48 : 78;
  const dx = cu.tx - cu.x, ty = cu.ty == null ? 300 : cu.ty, dy = ty - cu.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) { cu.x = cu.tx; cu.y = ty; cu.moving = false; return true; }
  const k = Math.min(1, sp * dt / d); cu.x += dx * k; cu.y += dy * k * (Math.abs(dx) < 80 ? 1 : 0.2);
  cu.face = dx > 0 ? 1 : -1; cu.moving = true; return false;
}

// ---------------- utilità di disegno ----------------
function rr(x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
function fillRR(x, y, w, h, r, col) { c.fillStyle = col; rr(x, y, w, h, r); c.fill(); }
function circ(x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function ell(x, y, a, b, col) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, a, b, 0, 0, TAU); c.fill(); }
function glow(x, y, r, col, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.globalAlpha = a == null ? 1 : a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.max(0, Math.min(255, r * k)); g = Math.max(0, Math.min(255, g * k)); b = Math.max(0, Math.min(255, b * k)); return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'; }

// ---------------- luce del giorno ----------------
function dayInfo() {
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
  // 0 notte → 1 pieno giorno
  let day; if (h < 5.5 || h > 21) day = 0; else if (h < 8) day = (h - 5.5) / 2.5; else if (h < 18) day = 1; else day = 1 - (h - 18) / 3;
  const dusk = (h > 17 && h < 21) ? 1 - Math.abs(h - 19) / 2 : (h > 5.5 && h < 8.5 ? 1 - Math.abs(h - 7) / 1.5 : 0);
  return { h, day: Math.max(0, Math.min(1, day)), dusk: Math.max(0, dusk) };
}
function skyGrad(x, y, w, h, D) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  const top = mixc('#0d1430', '#7fb6e6', D.day), bot = mixc('#26244a', '#d6ecf6', D.day);
  g.addColorStop(0, rain ? shade(top, 0.75) : top);
  g.addColorStop(1, D.dusk > 0 ? mixc(bot, '#f3a46a', D.dusk * 0.8) : (rain ? shade(bot, 0.8) : bot));
  return g;
}
function mixc(a, b, k) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const m = (s) => Math.round(((A >> s) & 255) + (((B >> s) & 255) - ((A >> s) & 255)) * k); return 'rgb(' + m(16) + ',' + m(8) + ',' + m(0) + ')'; }
function windowPane(x, y, w, h, D, frame) {
  c.fillStyle = skyGrad(x, y, w, h, D); c.fillRect(x, y, w, h);
  // case di fronte
  c.fillStyle = mixc('#1a1830', '#b9a99a', D.day * 0.8);
  c.fillRect(x, y + h * 0.55, w * 0.4, h * 0.45); c.fillRect(x + w * 0.55, y + h * 0.4, w * 0.45, h * 0.6);
  if (D.day < 0.5) { c.fillStyle = '#ffd98a'; for (let i = 0; i < 3; i++) c.fillRect(x + w * (0.6 + i * 0.12), y + h * 0.5, 4, 5); c.fillRect(x + w * 0.1, y + h * 0.65, 4, 5); }
  if (D.day < 0.3) { c.fillStyle = '#fff6dc'; circ(x + w * 0.25, y + h * 0.22, 5, '#f6f0d8'); }
  if (rain) { c.strokeStyle = 'rgba(200,220,255,.45)'; c.lineWidth = 1; for (let i = 0; i < 8; i++) { const rx_ = x + ((i * 37 + t * 140) % w), ry_ = y + ((i * 53 + t * 260) % h); c.beginPath(); c.moveTo(rx_, ry_); c.lineTo(rx_ - 2, ry_ + 8); c.stroke(); } }
  c.strokeStyle = frame || '#5a3a26'; c.lineWidth = 5; c.strokeRect(x, y, w, h);
  c.lineWidth = 3; c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h * 0.45); c.lineTo(x + w, y + h * 0.45); c.stroke();
  c.fillStyle = frame || '#5a3a26'; c.fillRect(x - 6, y + h, w + 12, 6);
}

// ---------------- stanze ----------------
function wall(x0, top, mid, stripe) {
  c.fillStyle = top; c.fillRect(x0, 0, RW, 236);
  if (stripe) { c.fillStyle = stripe; for (let x = x0 + 8; x < x0 + RW; x += 26) c.fillRect(x, 0, 9, 160); }
  c.fillStyle = mid; c.fillRect(x0, 160, RW, 76);                       // boiserie
  c.fillStyle = shade(mid, 0.82); for (let x = x0 + 14; x < x0 + RW - 20; x += 62) { rr(x, 172, 48, 52, 3); c.fill(); }
  c.fillStyle = shade(mid, 1.15); c.fillRect(x0, 160, RW, 5);
}
function floorTiles(x0, a, b) {
  for (let y = 236, i = 0; y < RH; y += 14, i++) for (let x = x0 - (i % 2) * 14, j = 0; x < x0 + RW; x += 28, j++) { c.fillStyle = (j % 2) ? a : b; c.fillRect(Math.max(x0, x), y, 28 - Math.max(0, x0 - x), 14); }
}
function floorWood(x0, a) {
  c.fillStyle = a; c.fillRect(x0, 236, RW, RH - 236);
  c.strokeStyle = shade(a, 0.82); c.lineWidth = 1;
  for (let y = 236; y < RH; y += 11) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + RW, y); c.stroke(); for (let x = x0 + ((y * 7) % 60); x < x0 + RW; x += 90) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 11); c.stroke(); } }
}
function lamp(x, y, D, col) {
  c.strokeStyle = '#3a2a20'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, y - 10); c.stroke();
  c.fillStyle = col || '#2f4a3a'; c.beginPath(); c.moveTo(x - 16, y); c.lineTo(x + 16, y); c.lineTo(x + 8, y - 12); c.lineTo(x - 8, y - 12); c.closePath(); c.fill();
  circ(x, y + 2, 4, '#fff2c4');
  glow(x, y + 30, 90, 'rgba(255,200,120,0.5)', 0.35 + (1 - D.day) * 0.5);
}
function cup(x, y, s, col) { fillRR(x - 5 * s, y - 7 * s, 10 * s, 8 * s, 2 * s, col || '#f4efe6'); c.strokeStyle = col || '#f4efe6'; c.lineWidth = 1.4 * s; c.beginPath(); c.arc(x + 5.5 * s, y - 3.5 * s, 2.4 * s, -1.3, 1.3); c.stroke(); ell(x, y + 1 * s, 7 * s, 1.6 * s, '#e4ddd0'); }

// piano superiore e soffitto quando lo schermo è più alto della scena
function drawUpper(D, vis) {
  const top = -extra - 2;
  c.fillStyle = skyGrad(-OUT, top, OUT, extra + 240, D); c.fillRect(-OUT, top, OUT, extra + 2);
  const right = worldRight();
  c.fillStyle = '#c9a07a'; c.fillRect(-14, top, right + 14, extra + 2);
  c.fillStyle = 'rgba(0,0,0,.06)'; for (let y = -10; y > top; y -= 18) c.fillRect(-14, y, right + 14, 2);
  for (let x = 40; x < right - 40; x += 140) { if (-extra + 20 > -30) break; const wy = Math.max(top + 14, -96); fillRR(x, wy, 46, 62, 3, '#ffcf7a'); c.fillStyle = '#3f6a52'; c.fillRect(x - 16, wy - 2, 14, 66); c.fillRect(x + 48, wy - 2, 14, 66); }
  c.fillStyle = '#3a2418'; c.fillRect(-14, -10, right + 14, 10);
}
function drawStreet(D) {
  const x0 = -OUT;
  c.fillStyle = skyGrad(x0, 0, OUT, 240, D); c.fillRect(x0, 0, OUT, 240);
  c.fillStyle = mixc('#1a1830', '#b9a99a', D.day * 0.8); c.fillRect(x0, 70, 60, 170); c.fillRect(x0 + 70, 110, 60, 130);
  c.fillStyle = mixc('#2a2a30', '#8a8a86', D.day); c.fillRect(x0, 236, OUT, 84);
  c.fillStyle = mixc('#3a3a40', '#a8a49a', D.day); c.fillRect(x0, 236, OUT, 10);
  // lampione
  c.fillStyle = '#2a2a2e'; c.fillRect(x0 + 40, 90, 4, 150); c.fillRect(x0 + 34, 86, 16, 6);
  circ(x0 + 42, 96, 5, D.day < 0.6 ? '#ffe0a0' : '#d8d4c8');
  if (D.day < 0.6) glow(x0 + 42, 100, 70, 'rgba(255,210,140,0.6)', 1 - D.day);
  // pioggia
  if (rain) { c.strokeStyle = 'rgba(190,210,240,.5)'; c.lineWidth = 1; for (let i = 0; i < 30; i++) { const xx = x0 + ((i * 29 + t * 90) % OUT), yy = ((i * 47 + t * 420) % 300); c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx - 3, yy + 10); c.stroke(); } }
  // facciata e porta
  const fx_ = -14;
  c.fillStyle = '#6a3e2a'; c.fillRect(fx_, 0, 14, 320);
  // insegna
  const G = GAME.G;
  fillRR(x0 + 64, 20, 92, 34, 6, '#2e4a3c'); c.strokeStyle = '#d8b46a'; c.lineWidth = 2; rr(x0 + 64, 20, 92, 34, 6); c.stroke();
  c.fillStyle = '#f3e2b8'; c.font = '700 12px "Fraunces", Georgia, serif'; c.textAlign = 'center';
  c.fillText(G.cosm.grigio ? 'Bar Lunetta' : 'Caffè', x0 + 110, 34); c.font = '700 13px "Fraunces", Georgia, serif'; c.fillText(G.cosm.grigio ? '· dal 1962 ·' : 'Lunetta', x0 + 110, 49);
  // tenda a righe
  for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? '#f1e6d2' : '#b5523a'; c.beginPath(); c.moveTo(x0 + 64 + i * 15.3, 60); c.lineTo(x0 + 64 + (i + 1) * 15.3, 60); c.lineTo(x0 + 64 + (i + 1) * 15.3, 74); c.quadraticCurveTo(x0 + 64 + (i + 0.5) * 15.3, 80, x0 + 64 + i * 15.3, 74); c.fill(); }
  // vaso fuori
  fillRR(x0 + 108, 266, 24, 26, 4, '#b5623a'); circ(x0 + 112, 258, 12, '#4a7a4a'); circ(x0 + 126, 252, 12, '#5a8a4e'); circ(x0 + 120, 262, 11, '#3e6a40');
  if (G.cosm.marta) { fillRR(x0 + 74, 140, 30, 40, 2, '#f4e8c8'); c.fillStyle = '#2a2a2e'; c.font = '700 6px sans-serif'; c.fillText('SPIFFERI', x0 + 89, 152); c.fillText('sab. piazza', x0 + 89, 172); c.strokeStyle = '#6a5a4a'; c.lineWidth = 0.6; c.strokeRect(x0 + 80, 155, 18, 10); }
}

function drawBancone(D) {
  const x0 = rx('bancone'), G = GAME.G;
  wall(x0, '#e9d7bd', '#7a4e34', '#e2ccae');
  floorTiles(x0, '#e8e0d2', '#3c3a40');
  windowPane(x0 + 30, 40, 90, 100, D);
  // mensole con barattoli e tazze
  c.fillStyle = '#6a442e'; c.fillRect(x0 + 190, 60, 220, 6); c.fillRect(x0 + 190, 110, 220, 6);
  const jars = ['#c9905a', '#7a4a2e', '#d8c49a', '#5a3a22', '#e0b070'];
  for (let i = 0; i < 7; i++) { fillRR(x0 + 200 + i * 30, 34, 20, 26, 4, 'rgba(230,240,240,.55)'); fillRR(x0 + 202 + i * 30, 44, 16, 15, 3, jars[i % 5]); fillRR(x0 + 199 + i * 30, 30, 22, 6, 2, '#8a5a3a'); }
  for (let i = 0; i < 8; i++) cup(x0 + 206 + i * 26, 108, 1.1, i % 3 ? '#f4efe6' : '#7fa8a0');
  if (G.decor.lucine) { c.strokeStyle = '#3a2a20'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0 + 10, 12); for (let i = 0; i <= 10; i++) c.quadraticCurveTo(x0 + 10 + i * 42 - 21, 30, x0 + 10 + i * 42, 12); c.stroke(); for (let i = 0; i < 20; i++) { const xx = x0 + 20 + i * 21, yy = 18 + Math.sin(i * 1.5) * 3 + 6; circ(xx, yy, 2.6, '#ffe3a0'); glow(xx, yy, 14, 'rgba(255,220,150,.8)', 0.5 + Math.sin(t * 2 + i) * 0.15); } }
  if (G.decor.lavagna) { fillRR(x0 + 140, 30, 40, 60, 3, '#2c3a34'); c.strokeStyle = '#8a6a4a'; c.lineWidth = 3; rr(x0 + 140, 30, 40, 60, 3); c.stroke(); c.fillStyle = '#e8e4d8'; c.font = '600 6px sans-serif'; c.textAlign = 'center'; c.fillText('MENU', x0 + 160, 42); for (let i = 0; i < 4; i++) c.fillRect(x0 + 147, 50 + i * 8, 18 + (i * 7) % 9, 1.5); circ(x0 + 172, 82, 3, '#e8e4d8'); }
  if (G.decor.monstera) { fillRR(x0 + 12, 238, 30, 36, 5, '#c9784a'); const lv = (a, l) => { c.save(); c.translate(x0 + 27, 240); c.rotate(a); ell(0, -l, 12, l * 0.55, '#3e7a4a'); c.restore(); }; [-0.9, -0.4, 0.1, 0.6, 1.0, -0.15].forEach((a, i) => lv(a, 26 + (i % 3) * 8)); }
  // barista (tu) dietro il bancone
  const st = G.st.caffe;
  drawPerson(x0 + 250, 236, { skin: '#f0c8a8', hair: '#4a2a1e', style: 'pony', top: '#f4efe6', bot: '#3a3040', apron: '#2e4a3c' }, { face: 1, bob: Math.sin(t * 2) * 0.6, work: tapAnim.caffe > 0 });
  // aiutanti
  for (let i = 0; i < Math.min(2, st.staff); i++) drawPerson(x0 + 180 - i * 46, 236, { skin: ['#d9a27a', '#e8b48a'][i], hair: ['#1e1612', '#b07a3a'][i], style: ['short', 'bun'][i], top: '#f4efe6', bot: '#3a3040', apron: '#2e4a3c' }, { face: 1, bob: Math.sin(t * 2.4 + i) * 0.6 });
  // bancone
  fillRR(x0 + 50, 196, 380, 12, 3, '#3a2a22');
  const g = c.createLinearGradient(0, 206, 0, 262); g.addColorStop(0, '#8a5a3a'); g.addColorStop(1, '#5a3824');
  c.fillStyle = g; c.fillRect(x0 + 56, 206, 368, 56);
  c.fillStyle = 'rgba(0,0,0,.12)'; for (let x = x0 + 64; x < x0 + 420; x += 46) c.fillRect(x, 212, 36, 44);
  c.fillStyle = '#c9a46a'; c.fillRect(x0 + 50, 196, 380, 2);
  // vasetto di Nadia
  if (G.cosm.nadia) { fillRR(x0 + 100, 184, 14, 13, 3, '#b5623a'); circ(x0 + 104, 180, 6, '#5a9a5a'); circ(x0 + 111, 177, 6, '#4a8a4e'); }
  if (G.cosm.ottavio) { c.save(); c.translate(x0 + 140, 192); c.rotate(-0.15); fillRR(-10, -4, 20, 9, 1, '#f6f0e0'); c.strokeStyle = '#b5523a'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-10, -4); c.lineTo(0, 1); c.lineTo(10, -4); c.stroke(); c.restore(); }
  // macchina espresso
  drawMachine(x0 + 310, 196, D);
  stationBadge('caffe');
}
function drawMachine(x, y, D) {
  const k = tapAnim.caffe > 0 ? 1 + tapAnim.caffe * 0.06 : 1;
  c.save(); c.translate(x, y); c.scale(k, 2 - k);
  fillRR(-38, -58, 76, 58, 8, '#b8bcc2');
  const g = c.createLinearGradient(-38, 0, 38, 0); g.addColorStop(0, '#7a7e86'); g.addColorStop(0.4, '#e8ecf0'); g.addColorStop(1, '#8a8e96');
  c.fillStyle = g; rr(-36, -56, 72, 54, 7); c.fill();
  fillRR(-40, -64, 80, 8, 3, '#a8222a');
  circ(-16, -40, 7, '#2a2a2e'); circ(-16, -40, 5, '#e8e4dc'); c.strokeStyle = '#a8222a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-16, -40); c.lineTo(-13, -43); c.stroke();
  circ(14, -40, 4, '#ffcf6a');
  fillRR(-10, -22, 20, 8, 2, '#2a2a2e'); c.fillRect(-2, -14, 4, 6);
  cup(0, -1, 1, '#f4efe6');
  c.restore();
  // vapore
  for (let i = 0; i < 3; i++) { const a = (t * 0.6 + i / 3) % 1; c.save(); c.globalAlpha = (1 - a) * 0.35; circ(x + Math.sin(a * 6 + i) * 4, y - 70 - a * 30, 4 + a * 6, '#ffffff'); c.restore(); }
}
function drawTavolini(D) {
  const x0 = rx('tavolini'), G = GAME.G;
  wall(x0, '#d9e2d0', '#6a7e5a', '#cfdac4');
  floorWood(x0, '#a8794e');
  windowPane(x0 + 200, 36, 80, 104, D); windowPane(x0 + 320, 36, 80, 104, D);
  if (G.decor.tende) for (const wx of [200, 320]) { c.fillStyle = 'rgba(250,246,236,.85)'; c.beginPath(); c.moveTo(x0 + wx - 4, 32); c.quadraticCurveTo(x0 + wx + 14, 90, x0 + wx + 4, 140); c.lineTo(x0 + wx - 4, 140); c.fill(); c.beginPath(); c.moveTo(x0 + wx + 84, 32); c.quadraticCurveTo(x0 + wx + 66, 90, x0 + wx + 76, 140); c.lineTo(x0 + wx + 84, 140); c.fill(); }
  if (G.decor.quadri) { [[150, 60, '#7fa8c0'], [150, 112, '#d8a86a']].forEach(([x, y, col]) => { fillRR(x0 + x - 18, y - 14, 36, 28, 1, '#8a6a3a'); c.fillStyle = col; c.fillRect(x0 + x - 14, y - 10, 28, 20); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(x0 + x - 14, y + 2, 28, 3); }); }
  lamp(x0 + 290, 40, D, '#7a3a2a'); lamp(x0 + 380, 40, D, '#7a3a2a');
  // vetrina dei dolci
  const st = station('dolci');
  drawPerson(x0 + 92, 216, { skin: '#c98e64', hair: '#2a2a3a', style: 'short', top: '#f4efe6', bot: '#3a3040', apron: '#b5523a' }, { face: 1, bob: Math.sin(t * 2 + 1) * 0.6 });
  fillRR(x0 + 30, 200, 124, 60, 4, '#6a4a32');
  c.fillStyle = 'rgba(220,240,245,.5)'; rr(x0 + 34, 160, 116, 42, 4); c.fill(); c.strokeStyle = '#c9a46a'; c.lineWidth = 2; c.stroke();
  const pastries = ['#d8a060', '#a8603a', '#e8c890', '#c87a4a', '#f0d8a8'];
  const n = Math.min(10, G.st.dolci.ready);
  for (let i = 0; i < 10; i++) { const px = x0 + 46 + (i % 5) * 22, py = 182 + Math.floor(i / 5) * 14; if (i < n) { ell(px, py, 8, 4, pastries[i % 5]); ell(px, py - 2, 6, 2.5, shade(pastries[i % 5], 1.15)); } else ell(px, py + 2, 8, 2, 'rgba(255,255,255,.25)'); }
  // tavolini
  [[230, 292], [330, 292], [270, 258], [380, 258]].forEach(([x, y]) => drawTable(x0 + x, y));
  if (G.decor.giradischi) { fillRR(x0 + 160, 206, 40, 30, 3, '#6a4a32'); fillRR(x0 + 158, 200, 44, 8, 2, '#4a3426'); ell(x0 + 180, 200, 14, 3, '#1a1a1a'); circ(x0 + 180, 200, 2, '#b5523a'); c.save(); c.globalAlpha = 0.6; c.fillStyle = '#3a2a20'; c.font = '10px serif'; c.fillText('♪', x0 + 196 + Math.sin(t) * 4, 186 - (t * 10 % 20)); c.restore(); }
  if (G.decor.cuccia) { ell(x0 + 410, 300, 24, 9, '#8a5a3a'); ell(x0 + 410, 297, 20, 6, '#c9784a'); // gatto
    ell(x0 + 410, 292, 13, 7, '#e8a060'); circ(x0 + 400, 289, 6, '#e8a060'); c.fillStyle = '#e8a060'; c.beginPath(); c.moveTo(x0 + 396, 285); c.lineTo(x0 + 397, 279); c.lineTo(x0 + 401, 284); c.fill(); c.beginPath(); c.moveTo(x0 + 402, 284); c.lineTo(x0 + 405, 279); c.lineTo(x0 + 406, 285); c.fill();
    c.strokeStyle = '#3a2a20'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x0 + 397, 289); c.lineTo(x0 + 400, 290); c.moveTo(x0 + 402, 290); c.lineTo(x0 + 405, 289); c.stroke();
    const zz = (t * 0.5) % 1; c.save(); c.globalAlpha = 1 - zz; c.fillStyle = '#6a5a7a'; c.font = '8px sans-serif'; c.fillText('z', x0 + 392, 280 - zz * 14); c.restore(); }
  stationBadge('dolci');
}
function drawTable(x, y) {
  ell(x, y + 2, 26, 5, 'rgba(0,0,0,.15)');
  c.fillStyle = '#3a2a22'; c.fillRect(x - 2, y - 30, 4, 30); ell(x, y, 12, 3, '#3a2a22');
  ell(x, y - 31, 24, 6, '#f0ece4'); ell(x, y - 33, 24, 6, '#fbf8f2');
}
function drawSaletta(D) {
  const x0 = rx('saletta'), G = GAME.G;
  wall(x0, '#3e4e5e', '#5a3a2e', '#46586a');
  floorWood(x0, '#7a5232');
  windowPane(x0 + 240, 40, 90, 100, D, '#3a2a20');
  if (G.decor.tappeto) { c.save(); c.beginPath(); c.ellipse(x0 + 300, 290, 120, 22, 0, 0, TAU); c.fillStyle = '#8a2a2a'; c.fill(); c.strokeStyle = '#d8a86a'; c.lineWidth = 3; c.stroke(); c.beginPath(); c.ellipse(x0 + 300, 290, 90, 14, 0, 0, TAU); c.strokeStyle = '#2a3a5a'; c.stroke(); c.restore(); }
  if (G.decor.libreria) { fillRR(x0 + 350, 30, 80, 200, 2, '#4a3022'); const bc = ['#8a2a2a', '#2a4a6a', '#d8a86a', '#3a6a4a', '#6a3a6a', '#c9784a']; for (let s = 0; s < 5; s++) { c.fillStyle = '#3a2418'; c.fillRect(x0 + 352, 66 + s * 38, 76, 4); for (let i = 0; i < 9; i++) { const h = 22 + ((i * 7 + s * 3) % 10); c.fillStyle = bc[(i + s) % 6]; c.fillRect(x0 + 355 + i * 8, 66 + s * 38 - h, 7, h); } } }
  if (G.decor.pendolo) { const px = x0 + 196; fillRR(px - 14, 60, 28, 170, 4, '#5a3420'); circ(px, 82, 12, '#f2ead6'); c.strokeStyle = '#2a1a10'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(px, 82); c.lineTo(px + 6, 78); c.moveTo(px, 82); c.lineTo(px, 74); c.stroke(); const a = Math.sin(t * 2.2) * 0.25; c.strokeStyle = '#c9a46a'; c.beginPath(); c.moveTo(px, 100); c.lineTo(px + Math.sin(a) * 50, 100 + Math.cos(a) * 50); c.stroke(); circ(px + Math.sin(a) * 50, 100 + Math.cos(a) * 50, 6, '#d8b46a'); }
  // credenza e bollitore
  fillRR(x0 + 40, 196, 120, 64, 4, '#5a3a26'); fillRR(x0 + 36, 190, 128, 8, 3, '#3a2418');
  drawPerson(x0 + 120, 190, { skin: '#f6dcc4', hair: '#d8b878', style: 'long', top: '#6f8a4e', bot: '#3a3040', apron: null }, { face: -1, bob: Math.sin(t * 1.8 + 2) * 0.6 }, 0.9);
  const k = tapAnim.te > 0 ? 1 + tapAnim.te * 0.08 : 1;
  c.save(); c.translate(x0 + 92, 190); c.scale(k, 2 - k);
  ell(0, -14, 20, 16, '#2a4a3a'); fillRR(-16, -4, 32, 6, 2, '#1e3428'); circ(0, -31, 4, '#c9a46a');
  c.strokeStyle = '#2a4a3a'; c.lineWidth = 4; c.beginPath(); c.moveTo(16, -18); c.quadraticCurveTo(28, -22, 30, -30); c.stroke(); c.beginPath(); c.arc(-18, -14, 8, 1.6, 4.6); c.stroke();
  c.restore();
  for (let i = 0; i < 2; i++) { const a = (t * 0.5 + i / 2) % 1; c.save(); c.globalAlpha = (1 - a) * 0.3; circ(x0 + 122 + Math.sin(a * 5) * 3, 156 - a * 26, 3 + a * 5, '#ffffff'); c.restore(); }
  lamp(x0 + 300, 50, D, '#2f5a3a');
  // poltrone
  [[230, 288], [320, 270], [395, 292]].forEach(([x, y], i) => drawArmchair(x0 + x, y, i === 1 && G.decor.poltrona ? '#2f5a3a' : ['#9a5a3a', '#7a5a8a', '#b5623a'][i]));
  if (G.cosm.leo) { fillRR(x0 + 262, 150, 40, 30, 1, '#f6f0e0'); c.strokeStyle = '#4a4a4a'; c.lineWidth = 0.8; c.strokeRect(x0 + 268, 156, 28, 18); c.beginPath(); c.moveTo(x0 + 268, 165); c.lineTo(x0 + 296, 165); c.moveTo(x0 + 282, 156); c.lineTo(x0 + 282, 174); c.stroke(); }
  stationBadge('te');
}
function drawArmchair(x, y, col) {
  ell(x, y + 2, 26, 5, 'rgba(0,0,0,.2)');
  fillRR(x - 24, y - 50, 48, 34, 10, shade(col, 0.85));
  fillRR(x - 26, y - 22, 52, 20, 6, col);
  fillRR(x - 30, y - 32, 12, 30, 5, shade(col, 0.95)); fillRR(x + 18, y - 32, 12, 30, 5, shade(col, 0.95));
  c.fillStyle = '#3a2418'; c.fillRect(x - 22, y - 2, 3, 4); c.fillRect(x + 19, y - 2, 3, 4);
}
function drawLaboratorio(D) {
  const x0 = rx('laboratorio'), G = GAME.G;
  wall(x0, '#efe8dc', '#c9b49a', null);
  c.strokeStyle = 'rgba(0,0,0,.06)'; for (let y = 0; y < 160; y += 16) for (let x = x0; x < x0 + RW; x += 16) c.strokeRect(x, y, 16, 16);
  floorTiles(x0, '#d8cdbd', '#c4b6a2');
  windowPane(x0 + 40, 40, 70, 80, D);
  // forno
  const k = tapAnim.pasticceria > 0 ? 1 + tapAnim.pasticceria * 0.04 : 1;
  c.save(); c.translate(x0 + 320, 236); c.scale(k, 2 - k);
  c.fillStyle = '#b5623a'; c.beginPath(); c.moveTo(-60, 0); c.lineTo(-60, -90); c.quadraticCurveTo(0, -150, 60, -90); c.lineTo(60, 0); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 1; for (let y = -10; y > -100; y -= 12) { c.beginPath(); c.moveTo(-60, y); c.lineTo(60, y); c.stroke(); }
  c.fillStyle = '#1e1410'; c.beginPath(); c.moveTo(-30, -20); c.lineTo(-30, -60); c.quadraticCurveTo(0, -84, 30, -60); c.lineTo(30, -20); c.fill();
  const fl = 0.7 + Math.sin(t * 7) * 0.15 + Math.sin(t * 11) * 0.1;
  glow(0, -36, 50, 'rgba(255,140,40,0.9)', fl);
  for (let i = 0; i < 5; i++) { c.fillStyle = ['#ff9a3a', '#ffcf6a', '#ff6a2a'][i % 3]; c.beginPath(); c.ellipse(-16 + i * 8, -26, 4, 8 + Math.sin(t * 9 + i) * 3, 0, 0, TAU); c.fill(); }
  fillRR(-64, -4, 128, 8, 2, '#7a3a22');
  c.restore();
  // banco di marmo
  fillRR(x0 + 140, 214, 110, 10, 2, '#f2eee8'); c.fillStyle = '#8a6a4a'; c.fillRect(x0 + 146, 224, 6, 40); c.fillRect(x0 + 238, 224, 6, 40);
  drawPerson(x0 + 196, 214, { skin: '#e8b48a', hair: '#6a4428', style: 'bun', top: '#f4efe6', bot: '#3a3040', apron: '#d8c49a', hat: 0, chef: 1 }, { face: 1, bob: Math.sin(t * 3) * 1 });
  ell(x0 + 180, 210, 14, 5, '#f0dcb4'); ell(x0 + 214, 210, 10, 4, '#e8c890');
  // sgabelli
  [[90, 290], [150, 290]].forEach(([x, y]) => { ell(x0 + x, y - 26, 12, 4, '#8a5a3a'); c.fillStyle = '#3a2a22'; c.fillRect(x0 + x - 8, y - 24, 2, 24); c.fillRect(x0 + x + 6, y - 24, 2, 24); });
  if (G.decor.pianoforte) { fillRR(x0 + 16, 150, 70, 90, 4, '#2a1a14'); c.fillStyle = '#f4efe6'; c.fillRect(x0 + 20, 192, 62, 8); c.fillStyle = '#1a1010'; for (let i = 0; i < 9; i++) c.fillRect(x0 + 22 + i * 7, 192, 3, 5); }
  stationBadge('pasticceria');
}
function drawLocked(id, D) {
  const x0 = rx(id), R = DATA.ROOMS.find(r => r.id === id), G = GAME.G;
  c.fillStyle = '#b8a48a'; c.fillRect(x0, 0, RW, RH);
  for (let y = 0, i = 0; y < 236; y += 16, i++) for (let x = x0 - (i % 2) * 18; x < x0 + RW; x += 36) { c.fillStyle = (x / 36 + i) % 3 < 1 ? '#a88a6a' : '#b49878'; c.fillRect(Math.max(x0, x) + 1, y + 1, 34 - Math.max(0, x0 - x), 14); }
  c.fillStyle = '#8a7a66'; c.fillRect(x0, 236, RW, RH - 236);
  // impalcatura e cartello
  c.strokeStyle = '#6a5a4a'; c.lineWidth = 4; [[60, 80], [380, 80]].forEach(([x]) => { c.beginPath(); c.moveTo(x0 + x, 40); c.lineTo(x0 + x, 300); c.stroke(); });
  c.beginPath(); c.moveTo(x0 + 60, 120); c.lineTo(x0 + 380, 120); c.moveTo(x0 + 60, 220); c.lineTo(x0 + 380, 220); c.stroke();
  const ok = GAME.famaLevel() >= R.fama, aff = G.money >= R.cost;
  const pulse = ok && aff ? 1 + Math.sin(t * 4) * 0.03 : 1;
  c.save(); c.translate(x0 + RW / 2, 168); c.scale(pulse, pulse);
  fillRR(-120, -46, 240, 92, 10, '#f6ecd8'); c.strokeStyle = '#7a4e34'; c.lineWidth = 3; rr(-120, -46, 240, 92, 10); c.stroke();
  c.fillStyle = '#4a2e20'; c.textAlign = 'center'; c.font = '700 16px "Fraunces", Georgia, serif'; c.fillText(R.n, 0, -18);
  c.font = '600 11px "Nunito", sans-serif'; c.fillStyle = '#7a5a44';
  c.fillText(ok ? 'Lavori in corso' : 'Serve più fama: «' + DATA.FAMA_NAMES[R.fama] + '»', 0, 2);
  c.font = '800 15px "Nunito", sans-serif'; c.fillStyle = ok && aff ? '#2e7a4a' : '#8a5a44'; c.fillText(UI.money(R.cost), 0, 28);
  c.restore();
}
// indicatore sopra la postazione: pronte / capienza e coda
function stationBadge(cat) {
  const s = station(cat), st = GAME.G.st[cat], cap = GAME.bufCap(cat);
  const q = GAME.L.customers.filter(k => k.cat === cat && k.state === 'queue').length;
  const x = s.x, y = s.y - s.h - 22;
  const hov = hover && hover.kind === 'station' && hover.cat === cat;
  fillRR(x - 30, y - 11, 60, 20, 10, hov ? 'rgba(46,74,60,.95)' : 'rgba(40,30,24,.78)');
  c.fillStyle = '#fff6e4'; c.font = '800 11px "Nunito", sans-serif'; c.textAlign = 'center';
  c.fillText(DATA.CATS[cat].icon + ' ' + Math.floor(st.ready) + '/' + cap, x, y + 3);
  // progresso automatico
  if (GAME.autoRate(cat) > 0) { c.fillStyle = 'rgba(255,255,255,.15)'; c.fillRect(x - 24, y + 6, 48, 2); c.fillStyle = '#ffcf6a'; c.fillRect(x - 24, y + 6, 48 * st.prog, 2); }
  if (q) { fillRR(x + 24, y - 16, 18, 14, 7, '#b5523a'); c.fillStyle = '#fff'; c.font = '800 9px "Nunito", sans-serif'; c.fillText(q, x + 33, y - 6); }
  // invito al tocco nei primi minuti
  if (GAME.G.tut < 1 && cat === 'caffe') { const a = 0.5 + Math.sin(t * 5) * 0.5; c.save(); c.globalAlpha = a; c.font = '800 12px "Nunito", sans-serif'; c.fillStyle = '#fff6e4'; c.fillText('Tocca la macchina!', x, y - 22); c.restore(); }
}

// ---------------- persone ----------------
function drawPerson(x, y, L, o, sc) {
  o = o || {}; sc = (sc || 1) * (L.h || 1);
  c.save(); c.translate(x, y + (o.bob || 0)); c.scale(sc * (o.face || 1), sc);
  const walkA = o.walk ? Math.sin(o.walk) : 0;
  if (!o.sit && !o.upper) {
    ell(0, 1, 12, 3, 'rgba(0,0,0,.18)');
    c.fillStyle = L.bot; c.save(); c.translate(-4, -22); c.rotate(walkA * 0.35); c.fillRect(-3, 0, 6, 22); c.restore();
    c.save(); c.translate(4, -22); c.rotate(-walkA * 0.35); c.fillRect(-3, 0, 6, 22); c.restore();
    c.fillStyle = '#2a2220'; c.fillRect(-8 + walkA * 7, -2, 8, 3); c.fillRect(1 - walkA * 7, -2, 8, 3);
  } else if (o.sit) {
    c.fillStyle = L.bot; c.fillRect(-6, -22, 18, 7); c.fillRect(8, -22, 6, 20); c.fillStyle = '#2a2220'; c.fillRect(8, -3, 9, 3);
  }
  // busto
  fillRR(-10, -50, 20, 30, 7, L.top);
  if (L.apron) { fillRR(-8, -40, 16, 22, 3, L.apron); c.fillStyle = L.apron; c.fillRect(-5, -48, 10, 9); }
  // braccia
  c.fillStyle = shade(L.top, 0.9);
  if (o.work) { c.save(); c.translate(7, -46); c.rotate(-1.2 + Math.sin(t * 20) * 0.2); fillRR(-3, 0, 6, 18, 3, shade(L.top, 0.9)); c.restore(); }
  else if (o.hold) { c.save(); c.translate(7, -46); c.rotate(-0.9); fillRR(-3, 0, 6, 16, 3, shade(L.top, 0.9)); c.restore(); cup(16, -36, 0.8); }
  else { c.save(); c.translate(7, -46); c.rotate(-0.12 - walkA * 0.3); fillRR(-3, 0, 6, 20, 3, shade(L.top, 0.9)); c.restore(); }
  // testa
  c.fillStyle = L.skin; c.fillRect(-3, -55, 6, 6);
  circ(0, -63, 11, L.skin);
  drawHair(L);
  // viso
  c.fillStyle = '#2a1a14'; circ(4, -64, 1.3, '#2a1a14'); circ(9, -64, 1.1, '#2a1a14');
  c.fillStyle = 'rgba(230,110,110,.35)'; circ(6, -59.5, 2.4, 'rgba(230,110,110,.35)');
  c.strokeStyle = '#6a3a2a'; c.lineWidth = 1; c.beginPath(); if (o.sad) c.arc(7, -55, 2.2, 3.6, 5.8); else c.arc(7, -59, 2, 0.3, 1.9); c.stroke();
  if (L.glasses) { c.strokeStyle = '#2a2a2e'; c.lineWidth = 1; c.beginPath(); c.arc(4, -64, 2.8, 0, TAU); c.moveTo(11.6, -64); c.arc(9, -64, 2.6, 0, TAU); c.stroke(); }
  if (L.earring) circ(-2, -58, 1.4, '#e8c060');
  if (L.hat) { fillRR(-13, -74, 26, 4, 2, '#3a3a40'); fillRR(-9, -84, 18, 12, 4, '#3a3a40'); }
  if (L.chef) { fillRR(-10, -86, 20, 14, 6, '#ffffff'); circ(-6, -86, 6, '#ffffff'); circ(6, -86, 6, '#ffffff'); }
  c.restore();
}
function drawHair(L) {
  const h = L.hair;
  if (L.style === 'bald') { c.fillStyle = h; c.beginPath(); c.arc(0, -63, 11.4, 2.6, 4.2); c.fill(); return; }
  c.fillStyle = h; c.beginPath(); c.arc(0, -65, 11.8, Math.PI * 0.95, Math.PI * 2.05); c.fill();
  if (L.style === 'short') { c.fillRect(-11, -66, 6, 8); }
  else if (L.style === 'long') { fillRR(-13, -68, 9, 28, 4, h); }
  else if (L.style === 'bun') { circ(-8, -74, 6, h); c.fillRect(-11, -66, 5, 7); }
  else if (L.style === 'pony') { c.beginPath(); c.moveTo(-10, -68); c.quadraticCurveTo(-22, -60, -16, -44); c.lineTo(-12, -46); c.quadraticCurveTo(-16, -58, -8, -64); c.fill(); }
  else if (L.style === 'curly') { for (let i = 0; i < 7; i++) circ(-10 + i * 3.4, -73 + Math.sin(i * 1.7) * 2, 5, h); circ(-11, -64, 5, h); }
}
function drawCustomer(cu) {
  const G = GAME.G;
  if (cu.ph == null) cu.ph = Math.random() * TAU;
  cu.ph += cu.moving ? 0.2 : 0;
  const sit = cu.state === 'sit' && cu.seat && cu.seat.kind !== 'stand';
  const L = cu.look;
  drawPerson(cu.x, cu.y - (sit ? (cu.seat.kind === 'arm' ? 16 : 14) : 0), L, { face: cu.face || 1, walk: cu.moving ? cu.ph : 0, sit, sad: cu.sad, hold: cu.state === 'sit' || cu.state === 'served' }, 1);
  // fumetto ordinazione + pazienza
  const hx = cu.x, hy = cu.y - 92 - (sit ? 14 : 0);
  if (cu.say) speech(hx, hy, cu.say, cu.hint);
  else if (cu.state === 'queue' || (cu.state === 'enter' && !cu.full && Math.abs(cu.x - cu.tx) < 120)) {
    const r = DATA.R[cu.rid];
    fillRR(hx - 15, hy - 14, 30, 24, 10, '#fffaf0');
    c.fillStyle = '#fffaf0'; c.beginPath(); c.moveTo(hx - 4, hy + 9); c.lineTo(hx + 2, hy + 16); c.lineTo(hx + 5, hy + 9); c.fill();
    c.font = '14px sans-serif'; c.textAlign = 'center'; c.fillText(DATA.BASES[r.b].icon, hx, hy + 3);
    if (r.i.length) { c.font = '8px sans-serif'; c.fillText(DATA.INGS[r.i[0]].icon, hx + 12, hy - 6); }
    if (cu.state === 'queue') {
      const max = 28 + GAME.atmosphere() * 0.25 + (cu.reg ? 30 : 0), p = Math.max(0, cu.patience / max);
      c.strokeStyle = p > 0.5 ? '#6aa86a' : p > 0.25 ? '#e8b04a' : '#d0583a'; c.lineWidth = 2.5; c.beginPath(); c.arc(hx, hy - 2, 18, -Math.PI / 2, -Math.PI / 2 + TAU * p); c.stroke();
    }
  }
  if (cu.reg && (cu.state !== 'leave')) {
    c.font = '800 9px "Nunito", sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(40,30,24,.75)';
    const nm = DATA.REGULARS[cu.reg].n; const w = c.measureText(nm).width + 10;
    fillRR(cu.x - w / 2, cu.y + 4, w, 13, 6, 'rgba(255,246,228,.85)'); c.fillStyle = '#5a3a26'; c.fillText(nm, cu.x, cu.y + 14);
  }
}
function speech(x, y, text, isHint) {
  c.font = '600 10px "Nunito", sans-serif';
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (c.measureText(tt).width > 150) { lines.push(cur); cur = w; } else cur = tt; }
  lines.push(cur);
  const w = Math.min(160, Math.max(...lines.map(l => c.measureText(l).width))) + 14, h = lines.length * 12 + 8;
  let bx = x - w / 2; bx = Math.max(cam.x + 4, Math.min(cam.x + W / scale - w - 4, bx));
  const by = y - h + 8;
  fillRR(bx, by, w, h, 8, isHint ? '#fff3c8' : '#fffaf0');
  if (isHint) { c.strokeStyle = '#d8a84a'; c.lineWidth = 1.2; rr(bx, by, w, h, 8); c.stroke(); }
  c.fillStyle = isHint ? '#fff3c8' : '#fffaf0'; c.beginPath(); c.moveTo(x - 4, by + h - 1); c.lineTo(x + 1, by + h + 7); c.lineTo(x + 5, by + h - 1); c.fill();
  c.fillStyle = '#4a3226'; c.textAlign = 'left';
  lines.forEach((l, i) => c.fillText(l, bx + 7, by + 14 + i * 12));
}

// ---------------- effetti ----------------
const tapAnim = { caffe: 0, dolci: 0, te: 0, pasticceria: 0 };
function addFloat(x, y, text, col) { fx.push({ x, y, text, col: col || '#2e7a4a', t: 0 }); }
function onTap(cat) { tapAnim[cat] = 1; const s = station(cat); addFloat(s.x + (Math.random() - 0.5) * 20, s.y - s.h - 36, '+' + GAME.tapYield(cat) + ' ' + DATA.CATS[cat].icon, '#7a4a2e'); for (let i = 0; i < 4; i++) fx.push({ puff: 1, x: s.x + (Math.random() - 0.5) * 30, y: s.y - s.h * 0.6, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, t: 0 }); }
function onServe(cu) { addFloat(cu.x, cu.y - 100, '+' + UI.money(cu.paid), '#2e7a4a'); }

// ---------------- frame ----------------
function frame(dt) {
  t += dt;
  rainT -= dt; if (rainT <= 0) { rain = !rain; rainT = rain ? 120 + Math.random() * 200 : 300 + Math.random() * 500; }
  for (const k in tapAnim) tapAnim[k] = Math.max(0, tapAnim[k] - dt * 5);
  updateCustomers(dt);
  // camera
  const vis = W / scale, minX = -OUT, maxX = Math.max(minX, worldRight() - vis);
  if (!cam.drag) {
    if (cam.target != null) { cam.x += (cam.target - cam.x) * Math.min(1, dt * 4); if (Math.abs(cam.target - cam.x) < 1) cam.target = null; }
    else { cam.x += cam.vx * dt; cam.vx *= Math.pow(0.04, dt); }
  }
  if (cam.x < minX) { cam.x += (minX - cam.x) * Math.min(1, dt * 10); if (cam.target != null && cam.target < minX) cam.target = null; }
  if (cam.x > maxX) { cam.x += (maxX - cam.x) * Math.min(1, dt * 10); if (cam.target != null && cam.target > maxX) cam.target = null; }

  const D = dayInfo();
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.fillStyle = '#1a1410'; c.fillRect(0, 0, W, H);
  c.save(); c.scale(scale, scale); c.translate(-cam.x, extra);
  if (extra > 0) drawUpper(D, vis);
  drawStreet(D);
  for (const id of ROOMS) {
    const x0 = rx(id);
    if (x0 > cam.x + vis + 10 || x0 + RW < cam.x - 10) continue;
    if (!GAME.G.rooms[id]) { if (id === ROOMS.find(r => !GAME.G.rooms[r])) drawLocked(id, D); continue; }
    if (id === 'bancone') drawBancone(D); else if (id === 'tavolini') drawTavolini(D); else if (id === 'saletta') drawSaletta(D); else drawLaboratorio(D);
    // muro divisorio
    c.fillStyle = '#5a3a26'; c.fillRect(x0 + RW - 4, 0, 8, 236);
  }
  // clienti in ordine di profondità
  const list = GAME.L.customers.slice().sort((a, b) => a.y - b.y);
  for (const cu of list) drawCustomer(cu);
  // luce calda serale / notturna
  if (D.day < 0.95) { c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = mixc('#6a5a8a', '#ffffff', 0.55 + D.day * 0.45); c.fillRect(cam.x, -extra, vis, RH + extra); c.restore(); }
  // effetti
  for (const f of fx) {
    f.t += dt;
    if (f.puff) { f.x += f.vx * dt; f.y += f.vy * dt; c.save(); c.globalAlpha = Math.max(0, 0.5 - f.t); circ(f.x, f.y, 3 + f.t * 10, '#ffffff'); c.restore(); }
    else { c.save(); c.globalAlpha = Math.max(0, 1 - f.t / 1.2); c.font = '800 12px "Nunito", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fffaf0'; c.fillText(f.text, f.x + 1, f.y - f.t * 30 + 1); c.fillStyle = f.col; c.fillText(f.text, f.x, f.y - f.t * 30); c.restore(); }
  }
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i].t > 1.3) fx.splice(i, 1);
  c.restore();
}

return { init, resize, frame, focus, onTap, onServe, addFloat, buildSeats, station, get rain() { return rain; }, onHit: null };
})();
