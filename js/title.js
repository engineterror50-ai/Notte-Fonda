/* ==== CAFFÈ LUNETTA — schermata iniziale animata ==== */
'use strict';
const TITLE = (function () {
const TAU = Math.PI * 2;
let cv, c, W, H, DPR, t = 0, running = false, leaves = [];
function circ(x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function rr(x, y, w, h, r, col) { c.fillStyle = col; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); }
function glow(x, y, r, col, a) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.save(); c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }
function rng(s) { return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function init(canvas) {
  cv = canvas; c = cv.getContext('2d');
  const r = rng(7); for (let i = 0; i < 22; i++) leaves.push({ x: r(), y: r(), s: 0.6 + r() * 0.8, p: r() * TAU, v: 0.3 + r() * 0.5, col: ['#d8843a', '#c9583a', '#e8b04a', '#a86a2a'][(r() * 4) | 0] });
}
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * DPR; cv.height = H * DPR; }

function draw(dt) {
  t += dt;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  // cielo al crepuscolo
  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1b1838'); sky.addColorStop(0.45, '#4a3358'); sky.addColorStop(0.75, '#b8645a'); sky.addColorStop(1, '#e8a06a');
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  const r = rng(3);
  for (let i = 0; i < 70; i++) { const x = r() * W, y = r() * H * 0.45; c.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.8 + i)); circ(x, y, r() * 1.2 + 0.3, '#fff3dc'); }
  c.globalAlpha = 1;
  // luna crescente
  const mx = W > H ? W * 0.84 : W * 0.16, my = W > H ? H * 0.14 : H * 0.07, mr = Math.min(W, H) * 0.05;
  glow(mx, my, mr * 6, 'rgba(255,230,180,0.5)', 0.6);
  circ(mx, my, mr, '#fff0c8'); circ(mx + mr * 0.42, my - mr * 0.18, mr * 0.92, '#2a2244');
  // scala: la facciata occupa la parte bassa
  const land = W > H * 1.1;
  const s = land ? Math.min(W * 0.5 / 520, H * 0.82 / 470) : Math.min(W / 560, H * 0.5 / 470), cx = land ? W * 0.64 : W / 2, base = H;
  c.save(); c.translate(cx, base); c.scale(s, s);
  // palazzi ai lati
  const bld = (x, w, h, col, win) => {
    c.fillStyle = col; c.fillRect(x, -h, w, h);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x, -h, w, 8);
    for (let yy = -h + 30; yy < -150; yy += 56) for (let xx = x + 16; xx < x + w - 30; xx += 46) {
      const lit = ((xx * 7 + yy * 3) % 5) < 2;
      rr(xx, yy, 24, 34, 2, lit ? '#ffcf7a' : '#3a2a3a'); if (lit) glow(xx + 12, yy + 17, 30, 'rgba(255,200,120,.6)', 0.4);
      c.fillStyle = win; c.fillRect(xx - 6, yy, 5, 34); c.fillRect(xx + 25, yy, 5, 34);
    }
  };
  bld(-560, 300, 560, '#7a4a4a', '#4a6a5a');
  bld(250, 320, 620, '#a8784a', '#5a3a2a');
  // facciata del caffè
  c.fillStyle = '#e8c9a0'; c.fillRect(-260, -470, 520, 470);
  c.fillStyle = 'rgba(0,0,0,.06)'; for (let y = -470; y < 0; y += 22) c.fillRect(-260, y, 520, 2);
  // finestre del primo piano con persiane
  for (const x of [-190, -40, 110]) {
    rr(x, -440, 80, 96, 3, '#ffcf7a'); glow(x + 40, -392, 70, 'rgba(255,200,120,.7)', 0.35);
    c.fillStyle = '#3f6a52'; c.fillRect(x - 26, -444, 24, 104); c.fillRect(x + 82, -444, 24, 104);
    c.fillStyle = 'rgba(0,0,0,.15)'; for (let k = 0; k < 8; k++) { c.fillRect(x - 24, -436 + k * 12, 20, 2); c.fillRect(x + 84, -436 + k * 12, 20, 2); }
    c.fillStyle = '#6a3e2a'; c.fillRect(x - 6, -344, 92, 8);
    // gerani
    for (let k = 0; k < 5; k++) circ(x + 6 + k * 17, -350, 7, k % 2 ? '#c9483a' : '#3e7a4a');
  }
  // tenda a righe
  const aw = -300, aw2 = 300, ay = -300;
  for (let i = 0; i < 12; i++) {
    const x0 = aw + i * 50; c.fillStyle = i % 2 ? '#f6ecd8' : '#2e4a3c';
    c.beginPath(); c.moveTo(x0 + 10, ay - 40); c.lineTo(x0 + 60, ay - 40); c.lineTo(x0 + 50, ay + 20); c.lineTo(x0, ay + 20); c.fill();
    c.beginPath(); c.moveTo(x0, ay + 20); c.quadraticCurveTo(x0 + 25, ay + 38, x0 + 50, ay + 20); c.fill();
  }
  // insegna
  rr(-150, -296, 300, 0, 0, '#000');
  // vetrina grande con interno caldo
  const vx = -230, vy = -240, vw = 300, vh = 200;
  const inside = c.createLinearGradient(0, vy, 0, vy + vh); inside.addColorStop(0, '#ffcf8a'); inside.addColorStop(1, '#e8945a');
  rr(vx, vy, vw, vh, 6, '#5a3424'); c.fillStyle = inside; c.fillRect(vx + 8, vy + 8, vw - 16, vh - 16);
  // interno: mensole, bancone, persone
  c.fillStyle = 'rgba(120,60,30,.45)'; c.fillRect(vx + 20, vy + 50, vw - 40, 5); c.fillRect(vx + 20, vy + 90, vw - 40, 5);
  for (let k = 0; k < 9; k++) rr(vx + 30 + k * 28, vy + 30, 14, 20, 3, 'rgba(120,60,30,.4)');
  c.fillStyle = 'rgba(90,40,20,.55)'; c.fillRect(vx + 8, vy + 140, vw - 16, 52);
  const person = (x, y, sc, col, hair) => { c.fillStyle = col; c.beginPath(); c.roundRect(x - 12 * sc, y - 34 * sc, 24 * sc, 40 * sc, 9 * sc); c.fill(); circ(x, y - 46 * sc, 11 * sc, col); c.fillStyle = hair; c.beginPath(); c.arc(x, y - 48 * sc, 11.5 * sc, Math.PI, TAU); c.fill(); };
  person(vx + 70, vy + 150 + Math.sin(t * 1.5) * 1, 1.2, 'rgba(110,50,30,.65)', 'rgba(70,30,20,.7)');
  person(vx + 150, vy + 145, 1.1, 'rgba(110,50,30,.6)', 'rgba(70,30,20,.7)');
  person(vx + 230, vy + 152 + Math.sin(t * 1.2 + 1) * 1, 1.25, 'rgba(110,50,30,.65)', 'rgba(70,30,20,.7)');
  // vapore dalla tazza
  for (let i = 0; i < 3; i++) { const a = (t * 0.5 + i / 3) % 1; c.globalAlpha = (1 - a) * 0.35; circ(vx + 120 + Math.sin(a * 6 + i) * 5, vy + 130 - a * 40, 4 + a * 8, '#fff'); }
  c.globalAlpha = 1;
  // scritta sul vetro
  c.save(); c.fillStyle = 'rgba(255,246,226,.85)'; c.font = 'italic 600 22px Fraunces, Georgia, serif'; c.textAlign = 'center'; c.fillText('caffè · dolci · tè', vx + vw / 2, vy + 128); c.restore();
  c.strokeStyle = '#5a3424'; c.lineWidth = 6; c.beginPath(); c.moveTo(vx + vw / 2, vy); c.lineTo(vx + vw / 2, vy + 108); c.stroke();
  glow(vx + vw / 2, vy + vh / 2, 260, 'rgba(255,190,110,.55)', 0.5);
  // porta
  const dx = 100;
  rr(dx, -250, 120, 250, 8, '#2e4a3c'); rr(dx + 12, -236, 96, 120, 50, '#ffd28a'); glow(dx + 60, -180, 80, 'rgba(255,200,120,.6)', 0.35);
  c.fillStyle = '#2e4a3c'; c.fillRect(dx + 58, -236, 4, 120);
  circ(dx + 100, -110, 5, '#d8a84a');
  // cartello "aperto"
  c.save(); c.translate(dx + 60, -140 + Math.sin(t * 1.6) * 0.8); c.rotate(Math.sin(t * 1.3) * 0.04);
  c.strokeStyle = '#3a2418'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-14, -18); c.lineTo(0, -30); c.lineTo(14, -18); c.stroke();
  rr(-30, -18, 60, 24, 4, '#f6ecd8'); c.fillStyle = '#b5523a'; c.font = '800 12px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('APERTO', 0, -2); c.restore();
  // lucine sulla tenda
  c.strokeStyle = '#2a1a14'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-300, -330); for (let i = 1; i <= 6; i++) c.quadraticCurveTo(-300 + i * 100 - 50, -300, -300 + i * 100, -330); c.stroke();
  for (let i = 0; i < 24; i++) { const x = -290 + i * 25, y = -324 + Math.sin((i % 4) / 4 * Math.PI) * 20; const a = 0.6 + Math.sin(t * 2 + i * 1.3) * 0.3; circ(x, y, 4, '#ffe3a0'); glow(x, y, 20, 'rgba(255,220,150,.9)', a * 0.6); }
  // marciapiede
  c.fillStyle = '#6a5a5a'; c.fillRect(-600, -10, 1200, 30);
  c.fillStyle = '#8a7a72'; c.fillRect(-600, -14, 1200, 6);
  // vasi e panchina
  rr(-252, -60, 40, 50, 6, '#b5623a'); circ(-240, -70, 18, '#3e7a4a'); circ(-222, -80, 16, '#4a8a4e'); circ(-232, -88, 14, '#5a9a5a');
  rr(232, -56, 36, 46, 6, '#b5623a'); circ(250, -72, 20, '#3e7a4a'); circ(240, -84, 12, '#4a8a4e');
  // gatto sul davanzale della vetrina
  const gx = vx + 60, gy = vy + vh + 2;
  c.fillStyle = '#e8a060'; c.beginPath(); c.ellipse(gx, gy - 12, 20, 12, 0, 0, TAU); c.fill(); circ(gx + 16, gy - 24, 10, '#e8a060');
  c.beginPath(); c.moveTo(gx + 9, gy - 30); c.lineTo(gx + 10, gy - 40); c.lineTo(gx + 16, gy - 32); c.fill(); c.beginPath(); c.moveTo(gx + 17, gy - 32); c.lineTo(gx + 23, gy - 40); c.lineTo(gx + 24, gy - 30); c.fill();
  c.strokeStyle = '#e8a060'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(gx - 18, gy - 8); c.quadraticCurveTo(gx - 36, gy - 4 + Math.sin(t * 2) * 6, gx - 30, gy + 10); c.stroke();
  c.strokeStyle = '#4a2a1a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(gx + 11, gy - 24); c.lineTo(gx + 15, gy - 23); c.moveTo(gx + 18, gy - 23); c.lineTo(gx + 22, gy - 24); c.stroke();
  c.restore();
  // foglie che cadono
  for (const L of leaves) {
    L.y += dt * 0.04 * L.v; L.x += dt * 0.015 * Math.sin(t + L.p); if (L.y > 1.05) { L.y = -0.05; L.x = Math.random(); }
    c.save(); c.translate(L.x * W, L.y * H); c.rotate(t * L.v * 2 + L.p); c.fillStyle = L.col; c.beginPath(); c.ellipse(0, 0, 6 * L.s, 3 * L.s, 0, 0, TAU); c.fill(); c.restore();
  }
  // vignettatura calda
  const vg = c.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,10,20,.55)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
}
function start() { running = true; resize(); let last = performance.now(); const loop = (now) => { if (!running) return; const dt = Math.min(0.1, (now - last) / 1000); last = now; draw(dt); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
function stop() { running = false; }
return { init, resize, start, stop };
})();
