/* ==== NOTTE FONDA — Motore grafico (nucleo) ====
 * Pittura procedurale per illustrazioni horror gotiche: cielo, luna, nebbia,
 * scenari, figure in controluce con luce di contorno, effetti e post-produzione.
 * Gira nel browser (Canvas 2D). Pensato per essere eseguito dallo Studio e dallo
 * script di esportazione, che salvano le immagini finite in assets/.
 * Tutto è deterministico: stessa carta = stessa immagine.
 */
(function (G) {
'use strict';
const A = G.NFArt = G.NFArt || {};
const TAU = Math.PI * 2;
// spazio di lavoro delle illustrazioni (rapporto carta 1:1.283)
const W = 480, H = 616;
A.W = W; A.H = H; A.TAU = TAU;

// ---------------- numeri casuali e rumore ----------------
function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function noise2(seed) {
  const r = rng(seed), P = new Float32Array(512);
  for (let i = 0; i < 512; i++) P[i] = r();
  const h = (x, y) => P[((x * 73856093) ^ (y * 19349663)) & 511];
  const s = (t) => t * t * (3 - 2 * t);
  return function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = s(x - xi), yf = s(y - yi);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}
function fbm(n, x, y, oct) { let v = 0, a = 0.5, f = 1, t = 0; for (let i = 0; i < (oct || 5); i++) { v += a * n(x * f, y * f); t += a; a *= 0.5; f *= 2.03; } return v / t; }
A.rng = rng; A.hash = hash; A.noise2 = noise2; A.fbm = fbm;

// ---------------- canvas e colori ----------------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function hexRGB(hex) {
  hex = hex.replace('#', ''); if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const n = parseInt(hex, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex, a) { const [r, g, b] = hexRGB(hex); return `rgba(${r},${g},${b},${a})`; }
function mix(h1, h2, t) { const a = hexRGB(h1), b = hexRGB(h2); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
A.canvas = canvas; A.rgba = rgba; A.mix = mix; A.hexRGB = hexRGB;
const lerp = (a, b, t) => a + (b - a) * t;
A.lerp = lerp;

// ---------------- primitive di forma ----------------
// capsula conica tra due cerchi (tangenti esterne)
function capsule(c, x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 0.001;
  const a = Math.atan2(dy, dx), k = Math.max(-1, Math.min(1, (r1 - r2) / d)), b = Math.acos(k);
  c.beginPath();
  c.arc(x1, y1, r1, a + b, a - b + TAU, false);
  c.arc(x2, y2, r2, a - b, a + b, false);
  c.closePath(); c.fill();
}
// catena di articolazioni [[x,y,r],...]
function chain(c, pts) { for (let i = 0; i < pts.length - 1; i++) capsule(c, pts[i][0], pts[i][1], pts[i][2], pts[i + 1][0], pts[i + 1][1], pts[i + 1][2]); }
// curva rastremata lungo una polilinea (spline Catmull-Rom), larghezza da w0 a w1
function taper(c, pts, w0, w1, steps) {
  const P = spline(pts, steps || 8), L = [], R = [];
  for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[Math.min(P.length - 1, i + 1)], o = P[Math.max(0, i - 1)];
    const dx = q[0] - o[0], dy = q[1] - o[1], d = Math.hypot(dx, dy) || 1;
    const w = lerp(w0, w1, i / (P.length - 1)) / 2;
    L.push([p[0] - dy / d * w, p[1] + dx / d * w]); R.push([p[0] + dy / d * w, p[1] - dx / d * w]);
  }
  c.beginPath(); c.moveTo(L[0][0], L[0][1]);
  for (const p of L) c.lineTo(p[0], p[1]);
  for (let i = R.length - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
  c.closePath(); c.fill();
}
function spline(pts, steps) {
  if (pts.length < 3) return pts.map(p => p.slice());
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
// poligono morbido chiuso (spline chiusa)
function blob(c, pts, fill) {
  const n = pts.length; c.beginPath();
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if (i === 0) c.moveTo(p1[0], p1[1]);
    c.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  c.closePath(); if (fill !== false) c.fill();
}
function poly(c, pts, fill) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); if (fill !== false) c.fill(); }
function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, TAU); c.fill(); }
function circle(c, x, y, r) { ell(c, x, y, r, r); }
// artiglio/spina ricurva
function claw(c, x, y, len, ang, w, bend) {
  bend = bend == null ? 0.35 : bend;
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  c.beginPath();
  c.moveTo(x + nx * w / 2, y + ny * w / 2);
  c.quadraticCurveTo((x + ex) / 2 + nx * len * bend, (y + ey) / 2 + ny * len * bend, ex, ey);
  c.quadraticCurveTo((x + ex) / 2 + nx * len * bend * 0.6, (y + ey) / 2 + ny * len * bend * 0.6, x - nx * w / 2, y - ny * w / 2);
  c.closePath(); c.fill();
}
// orlo sfilacciato: da (x0,y) a (x1,y) con frange verso il basso
function raggedEdge(c, pts, amp, seed, teeth) {
  const r = rng(seed), out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const n = teeth || 6;
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([lerp(ax, bx, t), lerp(ay, by, t)]);
      out.push([lerp(ax, bx, t + 0.5 / n) + (r() - 0.5) * amp * 0.4, lerp(ay, by, t + 0.5 / n) + amp * (0.4 + r() * 0.9)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
// pelo/spine lungo una linea: ciuffi orientati (ang) con variazione
function fur(c, pts, len, ang, seed, n, w, spread) {
  const P = spline(pts, 10), r = rng(seed || 1); n = n || P.length;
  for (let i = 0; i < n; i++) {
    const p = P[Math.floor(r() * P.length)];
    claw(c, p[0], p[1], len * (0.5 + r() * 0.8), ang + (r() - 0.5) * (spread == null ? 0.7 : spread), w || len * 0.35, (r() - 0.5) * 0.6);
  }
}
A.fur = fur;
A.capsule = capsule; A.chain = chain; A.taper = taper; A.spline = spline; A.blob = blob; A.poly = poly; A.ell = ell; A.circle = circle; A.claw = claw; A.raggedEdge = raggedEdge;

// ---------------- texture di rumore precalcolate ----------------
const TEX = {};
function noiseTex(seed, w, h, sc, oct, contrast) {
  const id = [seed, w, h, sc, oct, contrast].join(':'); if (TEX[id]) return TEX[id];
  const cv = canvas(w, h), c = cv.getContext('2d'), img = c.createImageData(w, h), n = noise2(seed);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = fbm(n, x / sc, y / sc, oct || 5);
    v = Math.max(0, Math.min(1, (v - 0.5) * (contrast || 1) + 0.5));
    const i = (y * w + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = v * 255;
  }
  c.putImageData(img, 0, 0); TEX[id] = cv; return cv;
}
A.noiseTex = noiseTex;
// tinge una texture alfa con un colore
function tint(tex, color) { const cv = canvas(tex.width, tex.height), c = cv.getContext('2d'); c.drawImage(tex, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, cv.width, cv.height); return cv; }
A.tint = tint;
// sfuma i bordi di una texture (in alto/basso e ai lati) per evitare tagli netti
function feather(cv, fy, fx) {
  const o = canvas(cv.width, cv.height), c = o.getContext('2d'); c.drawImage(cv, 0, 0);
  c.globalCompositeOperation = 'destination-in';
  const g = c.createLinearGradient(0, 0, 0, o.height);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(fy, 'rgba(0,0,0,1)'); g.addColorStop(1 - fy, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, o.width, o.height);
  if (fx) { const h = c.createLinearGradient(0, 0, o.width, 0); h.addColorStop(0, 'rgba(0,0,0,0)'); h.addColorStop(fx, 'rgba(0,0,0,1)'); h.addColorStop(1 - fx, 'rgba(0,0,0,1)'); h.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = h; c.fillRect(0, 0, o.width, o.height); }
  return o;
}
A.feather = feather;

// ---------------- luce ----------------
function glow(c, x, y, r, col, a, op) {
  c.save(); if (op) c.globalCompositeOperation = op; c.globalAlpha *= (a == null ? 1 : a);
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(0.35, rgba(col, 0.45)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
}
function glowEye(c, x, y, r, col, a) {
  glow(c, x, y, r * 9, col, 0.35 * (a || 1), 'lighter');
  glow(c, x, y, r * 3.5, col, 0.9 * (a || 1), 'lighter');
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#fff'; c.globalAlpha = 0.95 * (a || 1); ell(c, x, y, r, r * 0.75); c.restore();
}
function rays(c, x, y, len, col, n, spread, ang, a, seed) {
  const r = rng(seed || 3);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const t = ang + (r() - 0.5) * spread, w = 0.02 + r() * 0.05, L = len * (0.6 + r() * 0.5);
    const g = c.createLinearGradient(x, y, x + Math.cos(t) * L, y + Math.sin(t) * L);
    g.addColorStop(0, rgba(col, (a || 0.25) * (0.5 + r()))); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(x, y);
    c.lineTo(x + Math.cos(t - w) * L, y + Math.sin(t - w) * L); c.lineTo(x + Math.cos(t + w) * L, y + Math.sin(t + w) * L); c.closePath(); c.fill();
  }
  c.restore();
}
A.glow = glow; A.glowEye = glowEye; A.rays = rays;

// ---------------- figure in controluce ----------------
// Si disegna la sagoma su f.c (riempimento qualsiasi), poi f.render() la dipinge
// sul bersaglio con corpo sfumato, texture, luce di contorno e luce di rimbalzo.
function Figure(w, h) {
  this.w = w || W; this.h = h || H;
  this.cv = canvas(this.w, this.h); this.c = this.cv.getContext('2d');
  this.c.fillStyle = '#000'; this.c.strokeStyle = '#000';
}
Figure.prototype.render = function (t, o) {
  o = o || {};
  const w = this.w, h = this.h, m = this.cv;
  const out = canvas(w, h), c = out.getContext('2d');
  // corpo
  c.drawImage(m, 0, 0); c.globalCompositeOperation = 'source-in';
  const bt = o.bodyTop || '#120f1c', bb = o.bodyBot || '#050409';
  const g = c.createLinearGradient(0, o.y0 || 0, 0, o.y1 || h); g.addColorStop(0, bt); g.addColorStop(1, bb);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-atop';
  if (o.tex !== false) {
    const tx = noiseTex(o.texSeed || 11, 160, 205, o.texScale || 9, 5, 2.2);
    c.globalAlpha = o.texAlpha == null ? 0.22 : o.texAlpha;
    c.drawImage(tint(tx, o.texColor || '#3a3350'), 0, 0, w, h);
    c.globalAlpha = 1;
  }
  // luce interna (es. riflesso dal basso o colore locale)
  if (o.inner) for (const L of o.inner) glow(c, L.x, L.y, L.r, L.col, L.a == null ? 0.6 : L.a);
  // luce di contorno
  const rims = o.rims || (o.rim ? [o.rim] : []);
  for (const R of rims) {
    const rc = canvas(w, h), r = rc.getContext('2d');
    r.drawImage(m, 0, 0); r.globalCompositeOperation = 'source-in'; r.fillStyle = R.col; r.fillRect(0, 0, w, h);
    r.globalCompositeOperation = 'destination-out';
    const d = R.w || 4, dx = R.dx == null ? 0 : R.dx, dy = R.dy == null ? 1 : R.dy;
    if (R.all) { for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; r.drawImage(m, Math.cos(a) * d, Math.sin(a) * d); } }
    else { r.drawImage(m, dx * d, dy * d); r.drawImage(m, dx * d * 0.6 + dy * d * 0.25, dy * d * 0.6 - dx * d * 0.25); }
    c.save(); c.globalAlpha = R.a == null ? 1 : R.a; c.filter = 'blur(' + (R.blur == null ? 1.2 : R.blur) + 'px)';
    c.drawImage(rc, 0, 0); c.restore();
  }
  c.globalCompositeOperation = 'source-over';
  if (o.shadowBlur) { t.save(); t.shadowColor = o.shadowCol || 'rgba(0,0,0,.8)'; t.shadowBlur = o.shadowBlur; t.drawImage(out, 0, 0); t.restore(); }
  else t.drawImage(out, 0, 0);
  // alone esterno (es. fantasmi)
  if (o.halo) { t.save(); t.globalCompositeOperation = 'lighter'; t.globalAlpha = o.halo.a || 0.5; t.filter = 'blur(' + (o.halo.r || 10) + 'px)'; t.drawImage(tint(m, o.halo.col), 0, 0); t.restore(); }
  return out;
};
A.Figure = Figure;
A.fig = (w, h) => new Figure(w, h);

// ---------------- scenari ----------------
function sky(c, cols, y1) {
  const g = c.createLinearGradient(0, 0, 0, y1 || H);
  cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function stars(c, n, seed, ymax, a) {
  const r = rng(seed); c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * (ymax || H * 0.6), s = r() * r() * 1.6 + 0.3;
    c.globalAlpha = (a || 0.8) * (0.3 + r() * 0.7); c.fillStyle = r() < 0.15 ? '#ffe9c8' : '#dfe6ff';
    circle(c, x, y, s);
    if (s > 1.4) glow(c, x, y, s * 6, '#cfd8ff', 0.25);
  }
  c.restore();
}
function moon(c, x, y, r, o) {
  o = o || {};
  const col = o.col || '#efe9d6', halo = o.halo || '#c9d2ff';
  glow(c, x, y, r * (o.haloR || 5.5), halo, o.haloA == null ? 0.5 : o.haloA, 'lighter');
  glow(c, x, y, r * 2, halo, 0.5, 'lighter');
  c.save();
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, col); g.addColorStop(1, mix(col, '#6b6a80', 0.45));
  c.fillStyle = g; circle(c, x, y, r);
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
  const tx = noiseTex(77, 128, 128, 14, 5, 2.6);
  c.globalAlpha = 0.45; c.globalCompositeOperation = 'multiply';
  c.drawImage(tint(tx, mix(col, '#4a4660', 0.6)), x - r, y - r, r * 2, r * 2);
  const rr = rng(o.seed || 5);
  for (let i = 0; i < 9; i++) { c.globalAlpha = 0.18; c.fillStyle = '#5a5670'; circle(c, x + (rr() - 0.5) * r * 1.4, y + (rr() - 0.5) * r * 1.4, r * (0.06 + rr() * 0.16)); }
  if (o.blood) { c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.85; c.fillStyle = o.blood; c.fillRect(x - r, y - r, r * 2, r * 2); }
  if (o.phase) { c.globalCompositeOperation = 'source-over'; c.globalAlpha = 0.92; c.fillStyle = o.phaseCol || '#0b0a14'; circle(c, x + r * o.phase, y - r * 0.1, r * 1.02); }
  c.restore();
}
function clouds(c, o) {
  const tx = noiseTex(o.seed || 21, 240, 120, o.sc || 22, 6, o.contrast || 2.6);
  c.save(); c.globalAlpha = o.a == null ? 0.6 : o.a;
  if (o.op) c.globalCompositeOperation = o.op;
  c.drawImage(feather(tint(tx, o.col || '#2a2540'), o.feather || 0.3), o.x || -40, o.y || 0, o.w || W + 80, o.h || H * 0.55);
  c.restore();
}
function fog(c, y, h, col, a, seed, sc) {
  const tx = noiseTex(seed || 31, 200, 80, sc || 18, 5, 1.8);
  c.save(); c.globalAlpha = a == null ? 0.6 : a;
  const g = c.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(col, 0.5)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.fillRect(0, y - h / 2, W, h);
  c.drawImage(feather(tint(tx, col), 0.35), -20, y - h / 2, W + 40, h);
  c.restore();
}
function hills(c, y, amp, col, seed, rough) {
  const n = noise2(seed || 41); c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W; x += 4) c.lineTo(x, y - fbm(n, x / 90, 0.5, rough || 4) * amp);
  c.lineTo(W, H); c.closePath(); c.fill();
}
function mountains(c, y, amp, col, seed) {
  const n = noise2(seed || 43); c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
  for (let x = 0; x <= W; x += 3) { const v = 1 - Math.abs(fbm(n, x / 140, 0.3, 6) * 2 - 1); c.lineTo(x, y - v * v * amp); }
  c.lineTo(W, H); c.closePath(); c.fill();
}
// albero morto ricorsivo
function deadTree(c, x, y, len, ang, wid, seed, depth) {
  const r = rng(seed); depth = depth == null ? 7 : depth;
  (function br(x, y, len, ang, wid, d) {
    const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
    const mx = (x + ex) / 2 + (r() - 0.5) * len * 0.25, my = (y + ey) / 2 + (r() - 0.5) * len * 0.25;
    taper(c, [[x, y], [mx, my], [ex, ey]], wid, wid * 0.62, 5);
    if (d <= 0 || len < 4) return;
    const k = 2 + (r() < 0.35 ? 1 : 0);
    for (let i = 0; i < k; i++) br(ex, ey, len * (0.62 + r() * 0.22), ang + (r() - 0.5) * 1.3, wid * 0.62, d - 1);
  })(x, y, len, ang, wid, depth);
}
function pine(c, x, y, h, w) {
  c.beginPath(); c.moveTo(x, y - h);
  const n = 6;
  for (let i = 1; i <= n; i++) { const t = i / n; c.lineTo(x + w * t * 0.55, y - h + h * t * 0.95 - h * 0.04); c.lineTo(x + w * t * 0.25, y - h + h * t * 0.95 - h * 0.02); }
  c.lineTo(x + w * 0.55, y); c.lineTo(x - w * 0.55, y);
  for (let i = n; i >= 1; i--) { const t = i / n; c.lineTo(x - w * t * 0.25, y - h + h * t * 0.95 - h * 0.02); c.lineTo(x - w * t * 0.55, y - h + h * t * 0.95 - h * 0.04); }
  c.closePath(); c.fill();
}
function pines(c, y, hmin, hmax, col, seed, dens) {
  const r = rng(seed || 51); c.fillStyle = col;
  for (let x = -20; x < W + 20; x += (dens || 18) * (0.6 + r() * 0.8)) { const h = hmin + r() * (hmax - hmin); pine(c, x, y + r() * 6, h, h * 0.42); }
}
function grave(c, x, y, s, kind) {
  if (kind === 0) { c.beginPath(); c.moveTo(x - s * 0.5, y); c.lineTo(x - s * 0.5, y - s * 0.9); c.arc(x, y - s * 0.9, s * 0.5, Math.PI, 0); c.lineTo(x + s * 0.5, y); c.closePath(); c.fill(); }
  else if (kind === 1) { c.fillRect(x - s * 0.09, y - s * 1.5, s * 0.18, s * 1.5); c.fillRect(x - s * 0.45, y - s * 1.15, s * 0.9, s * 0.17); }
  else { c.beginPath(); c.moveTo(x - s * 0.4, y); c.lineTo(x - s * 0.35, y - s * 0.8); c.lineTo(x, y - s * 1.05); c.lineTo(x + s * 0.35, y - s * 0.8); c.lineTo(x + s * 0.4, y); c.closePath(); c.fill(); }
}
function graves(c, y, n, smin, smax, col, seed, tilt) {
  const r = rng(seed || 61); c.fillStyle = col;
  for (let i = 0; i < n; i++) { c.save(); const x = r() * W; c.translate(x, y + r() * 14); c.rotate((r() - 0.5) * (tilt || 0.3)); grave(c, 0, 0, smin + r() * (smax - smin), (r() * 3) | 0); c.restore(); }
}
// guglia gotica
function spire(c, x, y, w, h) {
  c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, y - h * 0.55); c.lineTo(x - w * 0.3, y - h * 0.62); c.lineTo(x, y - h); c.lineTo(x + w * 0.3, y - h * 0.62); c.lineTo(x + w / 2, y - h * 0.55); c.lineTo(x + w / 2, y); c.closePath(); c.fill();
  c.fillRect(x - 1, y - h - w * 0.4, 2, w * 0.4);
}
function cathedral(c, x, y, s, col, winCol) {
  c.fillStyle = col;
  c.fillRect(x - s * 0.9, y - s * 0.9, s * 1.8, s * 0.9);
  spire(c, x - s * 0.55, y - s * 0.6, s * 0.38, s * 1.9);
  spire(c, x + s * 0.55, y - s * 0.6, s * 0.38, s * 1.9);
  spire(c, x, y - s * 0.8, s * 0.3, s * 1.35);
  for (let i = -3; i <= 3; i++) spire(c, x + i * s * 0.26, y - s * 0.88, s * 0.06, s * 0.25);
  if (winCol) {
    c.save(); c.globalCompositeOperation = 'lighter';
    const win = (wx, wy, ww, wh) => { c.fillStyle = winCol; c.beginPath(); c.moveTo(wx - ww / 2, wy); c.lineTo(wx - ww / 2, wy - wh * 0.7); c.quadraticCurveTo(wx, wy - wh * 1.15, wx + ww / 2, wy - wh * 0.7); c.lineTo(wx + ww / 2, wy); c.fill(); glow(c, wx, wy - wh / 2, ww * 3, winCol, 0.35); };
    win(x - s * 0.55, y - s * 0.9, s * 0.1, s * 0.3); win(x + s * 0.55, y - s * 0.9, s * 0.1, s * 0.3);
    c.fillStyle = winCol; circle(c, x, y - s * 0.95, s * 0.12); glow(c, x, y - s * 0.95, s * 0.5, winCol, 0.4);
    c.restore();
  }
}
// palazzi stretti (vicoli)
function townRow(c, y, hmin, hmax, col, winCol, seed, o) {
  o = o || {}; const r = rng(seed || 71); let x = -10;
  while (x < W + 10) {
    const w = 30 + r() * 46, h = hmin + r() * (hmax - hmin);
    c.fillStyle = col; c.fillRect(x, y - h, w + 1, h);
    if (r() < 0.6) { c.beginPath(); c.moveTo(x - 3, y - h); c.lineTo(x + w / 2, y - h - 10 - r() * 26); c.lineTo(x + w + 3, y - h); c.fill(); }
    if (o.chimney && r() < 0.5) c.fillRect(x + w * 0.7, y - h - 14, 6, 16);
    if (winCol) {
      for (let wy = y - h + 12; wy < y - 14; wy += 22) for (let wx = x + 6; wx < x + w - 8; wx += 14) {
        if (r() < (o.lit || 0.18)) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = winCol; c.fillRect(wx, wy, 6, 10); glow(c, wx + 3, wy + 5, 18, winCol, 0.25); c.restore(); }
        else if (o.dark) { c.fillStyle = o.dark; c.fillRect(wx, wy, 6, 10); }
      }
    }
    x += w;
  }
}
// lampione a gas
function streetLamp(c, x, y, h, col, lightCol, a) {
  c.fillStyle = col;
  c.fillRect(x - 2.5, y - h, 5, h); c.fillRect(x - 7, y - 6, 14, 6);
  c.fillRect(x - 1, y - h - 4, 22, 3);
  poly(c, [[x + 13, y - h - 2], [x + 25, y - h - 2], [x + 22, y - h + 16], [x + 16, y - h + 16]]);
  if (lightCol) { glow(c, x + 19, y - h + 8, 90, lightCol, a == null ? 0.6 : a, 'lighter'); glow(c, x + 19, y - h + 8, 16, '#fff6dc', 0.9, 'lighter'); }
}
A.sky = sky; A.stars = stars; A.moon = moon; A.clouds = clouds; A.fog = fog; A.hills = hills; A.mountains = mountains;
A.deadTree = deadTree; A.pine = pine; A.pines = pines; A.grave = grave; A.graves = graves; A.spire = spire; A.cathedral = cathedral; A.townRow = townRow; A.streetLamp = streetLamp;

// ---------------- particelle ----------------
function embers(c, n, seed, box, col, size) {
  const r = rng(seed); c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = box[0] + r() * box[2], y = box[1] + r() * box[3], s = (size || 2) * (0.3 + r());
    c.globalAlpha = 0.4 + r() * 0.6; c.fillStyle = col; ell(c, x, y, s, s * (1 + r() * 1.5), r() * TAU);
    glow(c, x, y, s * 5, col, 0.35);
  }
  c.restore();
}
function motes(c, n, seed, box, col, size, a) {
  const r = rng(seed); c.save(); c.fillStyle = col;
  for (let i = 0; i < n; i++) { c.globalAlpha = (a || 0.7) * (0.3 + r() * 0.7); circle(c, box[0] + r() * box[2], box[1] + r() * box[3], (size || 1.5) * (0.4 + r())); }
  c.restore();
}
function bat(c, x, y, s, flap) {
  flap = flap == null ? 0.5 : flap;
  const up = (flap - 0.5) * s * 1.2;
  c.beginPath();
  c.moveTo(x, y - s * 0.1);
  c.quadraticCurveTo(x - s * 0.5, y - s * 0.3 - up, x - s * 1.1, y - s * 0.2 - up * 1.4);
  c.quadraticCurveTo(x - s * 0.85, y + s * 0.05 - up * 0.3, x - s * 0.7, y + s * 0.15 - up * 0.4);
  c.quadraticCurveTo(x - s * 0.55, y + s * 0.0, x - s * 0.4, y + s * 0.2 - up * 0.2);
  c.quadraticCurveTo(x - s * 0.25, y + s * 0.05, x, y + s * 0.25);
  c.quadraticCurveTo(x + s * 0.25, y + s * 0.05, x + s * 0.4, y + s * 0.2 - up * 0.2);
  c.quadraticCurveTo(x + s * 0.55, y + s * 0.0, x + s * 0.7, y + s * 0.15 - up * 0.4);
  c.quadraticCurveTo(x + s * 0.85, y + s * 0.05 - up * 0.3, x + s * 1.1, y - s * 0.2 - up * 1.4);
  c.quadraticCurveTo(x + s * 0.5, y - s * 0.3 - up, x, y - s * 0.1);
  c.fill();
  ell(c, x, y + s * 0.02, s * 0.12, s * 0.22);
  poly(c, [[x - s * 0.1, y - s * 0.12], [x - s * 0.06, y - s * 0.3], [x - s * 0.01, y - s * 0.14]]);
  poly(c, [[x + s * 0.1, y - s * 0.12], [x + s * 0.06, y - s * 0.3], [x + s * 0.01, y - s * 0.14]]);
}
function bats(c, n, seed, box, smin, smax, col) {
  const r = rng(seed); c.fillStyle = col || '#06050a';
  for (let i = 0; i < n; i++) bat(c, box[0] + r() * box[2], box[1] + r() * box[3], smin + r() * (smax - smin), r());
}
function crows(c, n, seed, box, s, col) {
  const r = rng(seed); c.fillStyle = col || '#06050a';
  for (let i = 0; i < n; i++) {
    const x = box[0] + r() * box[2], y = box[1] + r() * box[3], k = s * (0.6 + r() * 0.6), f = r();
    c.beginPath(); c.moveTo(x - k, y - k * (0.2 + f * 0.5)); c.quadraticCurveTo(x - k * 0.4, y - k * 0.1, x, y + k * 0.1);
    c.quadraticCurveTo(x + k * 0.4, y - k * 0.1, x + k, y - k * (0.2 + f * 0.5)); c.quadraticCurveTo(x + k * 0.4, y + k * 0.05, x, y + k * 0.25);
    c.quadraticCurveTo(x - k * 0.4, y + k * 0.05, x - k, y - k * (0.2 + f * 0.5)); c.fill();
  }
}
// gocce/schizzi di sangue
function splatter(c, x, y, s, col, seed, n) {
  const r = rng(seed || 9); c.save(); c.fillStyle = col;
  circle(c, x, y, s);
  for (let i = 0; i < (n || 14); i++) { const a = r() * TAU, d = s * (0.8 + r() * 2.2), k = s * (0.08 + r() * 0.3); circle(c, x + Math.cos(a) * d, y + Math.sin(a) * d, k); }
  c.restore();
}
function drips(c, x0, x1, y, col, seed, maxLen) {
  const r = rng(seed || 13); c.fillStyle = col;
  for (let x = x0; x < x1; x += 4 + r() * 10) { const L = r() * r() * (maxLen || 40); taper(c, [[x, y - 2], [x, y + L * 0.6], [x, y + L]], 2 + r() * 3, 1, 4); circle(c, x, y + L, 1.6 + r() * 1.6); }
}
A.embers = embers; A.motes = motes; A.bat = bat; A.bats = bats; A.crows = crows; A.splatter = splatter; A.drips = drips;

// ================= STILE BIOMECCANICO (aerografo + inchiostro) =================
// Tavolozza monocroma: ogni scena sceglie un "metallo" (osso, acciaio, verde oleoso…)
const MET = {
  osso:    { d: '#0b0a08', m: '#6e675a', l: '#e9e2cf', s: '#fffaf0' },
  acciaio: { d: '#07090b', m: '#55606a', l: '#c9d4dc', s: '#ffffff' },
  olio:    { d: '#060805', m: '#4a5444', l: '#b9c4a8', s: '#f4ffe8' },
  bronzo:  { d: '#0b0705', m: '#6a5238', l: '#e2c79a', s: '#fff4dc' },
  carne:   { d: '#0c0606', m: '#6a4a46', l: '#d8b4a8', s: '#fff0ea' },
};
A.MET = MET;
function met(m) { return typeof m === 'string' ? MET[m] : (m || MET.osso); }

// tubo a costole lucido lungo una curva
function tube(c, pts, r0, r1, o) {
  o = o || {}; const M = met(o.m), rib = o.rib == null ? 0.42 : o.rib;
  const P = spline(pts, 16);
  // ricampiona a passo costante
  const Q = [P[0]]; let acc = 0;
  for (let i = 1; i < P.length; i++) {
    const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); acc += d;
    const r = lerp(r0, r1, i / (P.length - 1));
    if (acc >= Math.max(1.2, r * rib)) { Q.push(P[i]); acc = 0; }
  }
  if (Q.length < 2) Q.push(P[P.length - 1]);
  const lx = o.lx == null ? -0.6 : o.lx, ly = o.ly == null ? -0.8 : o.ly;
  const seq = o.rev ? Q.map((_, i) => Q.length - 1 - i) : Q.map((_, i) => i);
  for (const i of seq) {
    const p = Q[i], q = Q[Math.min(Q.length - 1, i + 1)], b = Q[Math.max(0, i - 1)];
    const ang = Math.atan2(q[1] - b[1], q[0] - b[0]);
    const r = lerp(r0, r1, i / (Q.length - 1));
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const side = (nx * lx + ny * ly) > 0 ? 1 : -1;  // lato illuminato
    const g = c.createLinearGradient(p[0] - nx * r * side, p[1] - ny * r * side, p[0] + nx * r * side, p[1] + ny * r * side);
    g.addColorStop(0, M.d); g.addColorStop(0.45, M.m); g.addColorStop(0.72, M.l); g.addColorStop(0.82, M.s); g.addColorStop(0.92, M.m); g.addColorStop(1, M.d);
    c.fillStyle = g;
    c.beginPath(); c.ellipse(p[0], p[1], Math.max(0.8, r * rib * 1.25), r, ang, 0, TAU); c.fill();
    if (o.ink !== false) { c.strokeStyle = rgba(M.d, 0.8); c.lineWidth = Math.max(0.5, r * 0.07); c.beginPath(); c.ellipse(p[0], p[1], Math.max(0.8, r * rib * 1.25), r, ang, -Math.PI / 2, Math.PI / 2); c.stroke(); }
  }
}
// colonna di vertebre
function vertebrae(c, pts, s0, s1, o) {
  o = o || {}; const M = met(o.m), P = spline(pts, 16), Q = [P[0]]; let acc = 0;
  for (let i = 1; i < P.length; i++) { acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (acc >= lerp(s0, s1, i / P.length) * 1.05) { Q.push(P[i]); acc = 0; } }
  for (let i = 0; i < Q.length; i++) {
    const p = Q[i], q = Q[Math.min(Q.length - 1, i + 1)], b = Q[Math.max(0, i - 1)];
    const ang = Math.atan2(q[1] - b[1], q[0] - b[0]), s = lerp(s0, s1, i / Math.max(1, Q.length - 1));
    c.save(); c.translate(p[0], p[1]); c.rotate(ang);
    const side = o.flip ? -1 : 1;
    // processi trasversi e spinoso
    shadeShape(c, M, s, () => { c.beginPath(); c.moveTo(-s * 0.2, 0); c.lineTo(0, -s * 1.05 * side); c.lineTo(s * 0.25, 0); c.closePath(); });
    shadeShape(c, M, s, () => { c.beginPath(); c.ellipse(0, s * 0.42 * side, s * 0.14, s * 0.55, 0, 0, TAU); });
    // corpo vertebrale
    shadeShape(c, M, s, () => { c.beginPath(); c.ellipse(0, 0, s * 0.42, s * 0.5, 0, 0, TAU); });
    c.restore();
  }
}
// riempie la forma corrente con sfumatura ad aerografo (luce in alto a sinistra) e contorno a inchiostro
function shadeShape(c, M, s, path, o) {
  o = o || {};
  path();
  const g = c.createRadialGradient(-s * 0.25, -s * 0.3, s * 0.05, 0, 0, s * 1.1);
  g.addColorStop(0, M.s); g.addColorStop(0.25, M.l); g.addColorStop(0.65, M.m); g.addColorStop(1, M.d);
  c.fillStyle = g; c.fill();
  if (o.ink !== false) { c.strokeStyle = rgba(M.d, 0.9); c.lineWidth = Math.max(0.6, s * 0.05); c.stroke(); }
}
// teschio allungato ad aerografo
function skull(c, x, y, s, rot, o) {
  o = o || {}; const M = met(o.m), el = o.elong == null ? 1.6 : o.elong;
  c.save(); c.translate(x, y); c.rotate(rot || 0);
  // cranio allungato all'indietro
  c.beginPath(); c.ellipse(0, -s * 0.15 - s * 0.35 * (el - 1), s * 0.62, s * 0.62 * el, 0, 0, TAU);
  let g = c.createRadialGradient(-s * 0.25, -s * 0.6 * el, s * 0.05, 0, -s * 0.3, s * 1.2 * el);
  g.addColorStop(0, M.s); g.addColorStop(0.3, M.l); g.addColorStop(0.7, M.m); g.addColorStop(1, M.d);
  c.fillStyle = g; c.fill(); c.strokeStyle = rgba(M.d, 0.9); c.lineWidth = s * 0.03; c.stroke();
  // costole del cranio
  c.strokeStyle = rgba(M.d, 0.55); c.lineWidth = s * 0.025;
  for (let i = 1; i < 5; i++) { c.beginPath(); c.ellipse(0, -s * 0.15 - s * 0.35 * (el - 1) - s * 0.1 * i, s * 0.6 * (1 - i * 0.12), s * 0.12, 0, Math.PI, TAU); c.stroke(); }
  // mascella e zigomi
  c.beginPath(); c.moveTo(-s * 0.5, s * 0.05); c.quadraticCurveTo(-s * 0.45, s * 0.55, -s * 0.2, s * 0.72); c.lineTo(s * 0.2, s * 0.72); c.quadraticCurveTo(s * 0.45, s * 0.55, s * 0.5, s * 0.05); c.closePath();
  g = c.createLinearGradient(-s * 0.5, 0, s * 0.5, s * 0.6); g.addColorStop(0, M.l); g.addColorStop(0.5, M.m); g.addColorStop(1, M.d);
  c.fillStyle = g; c.fill(); c.stroke();
  // orbite profonde
  for (const sx of [-1, 1]) {
    c.beginPath(); c.ellipse(sx * s * 0.24, s * 0.08, s * 0.19, s * 0.15, sx * 0.35, 0, TAU);
    const e = c.createRadialGradient(sx * s * 0.24, s * 0.1, 0, sx * s * 0.24, s * 0.08, s * 0.2);
    e.addColorStop(0, '#000'); e.addColorStop(0.7, '#020202'); e.addColorStop(1, rgba(M.m, 0.6)); c.fillStyle = e; c.fill();
  }
  // naso
  c.fillStyle = '#030303'; c.beginPath(); c.moveTo(0, s * 0.22); c.lineTo(-s * 0.07, s * 0.38); c.lineTo(s * 0.07, s * 0.38); c.closePath(); c.fill();
  // denti
  const n = 8;
  for (let i = 0; i < n; i++) {
    const tx = -s * 0.28 + (i + 0.5) * s * 0.56 / n;
    const tg = c.createLinearGradient(tx, s * 0.48, tx, s * 0.72); tg.addColorStop(0, M.s); tg.addColorStop(1, M.m);
    c.fillStyle = tg; c.beginPath(); c.ellipse(tx, s * 0.6, s * 0.03, s * 0.1, 0, 0, TAU); c.fill();
    c.strokeStyle = rgba(M.d, 0.9); c.lineWidth = s * 0.012; c.stroke();
  }
  if (o.eyes) { glowEye(c, -s * 0.24, s * 0.09, s * 0.05, o.eyes, 0.9); glowEye(c, s * 0.24, s * 0.09, s * 0.05, o.eyes, 0.9); }
  c.restore();
}
// gabbia toracica
function ribs(c, x, y, w, h, n, o) {
  o = o || {}; const M = met(o.m);
  vertebrae(c, [[x, y], [x, y + h]], w * 0.09, w * 0.11, { m: M });
  for (let i = 0; i < n; i++) {
    const yy = y + h * (0.08 + i / n * 0.85), sp = w * 0.5 * Math.sin((i + 1) / (n + 1) * Math.PI * 0.9 + 0.3);
    for (const sx of [-1, 1]) tube(c, [[x, yy], [x + sx * sp * 0.7, yy - h * 0.04], [x + sx * sp, yy + h * 0.06], [x + sx * sp * 0.8, yy + h * 0.16]], w * 0.035, w * 0.02, { m: M, rib: 0.9, ink: false });
  }
}
// muro biomeccanico di sfondo: "horror vacui"
function bioWall(c, o) {
  o = o || {}; const M = met(o.m), r = rng(o.seed || 1), x0 = o.x || 0, x1 = o.x1 || W, y0 = o.y || 0, y1 = o.y1 || H;
  const dark = mix(M.d, M.m, 0.12);
  c.save(); c.fillStyle = dark; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip();
  const layers = o.layers || 3;
  for (let L = 0; L < layers; L++) {
    const k = (L + 1) / layers;                                  // 0 lontano → 1 vicino
    const MM = { d: M.d, m: mix(M.d, M.m, 0.35 + 0.65 * k), l: mix(M.d, M.l, 0.3 + 0.7 * k), s: mix(M.d, M.s, 0.25 + 0.75 * k) };
    const sc = (o.scale || 1) * (0.55 + k * 0.6);
    // colonne a costole
    const nc = Math.round((o.cols || 5) * (1.6 - k * 0.6));
    for (let i = 0; i < nc; i++) {
      const x = x0 + r() * (x1 - x0), w = (10 + r() * 16) * sc, sw = (r() - 0.5) * 60;
      tube(c, [[x, y0 - 30], [x + sw, (y0 + y1) / 2], [x - sw * 0.5, y1 + 30]], w, w * (0.6 + r() * 0.8), { m: MM, rib: 0.35 + r() * 0.3 });
    }
    // vertebre
    for (let i = 0; i < (o.spines || 2); i++) { const x = x0 + r() * (x1 - x0); vertebrae(c, [[x, y0 - 20], [x + (r() - 0.5) * 80, (y0 + y1) / 2], [x + (r() - 0.5) * 40, y1 + 20]], 14 * sc, 18 * sc, { m: MM }); }
    // tubi trasversali che si intrecciano
    for (let i = 0; i < (o.hoses || 3); i++) {
      const ya = y0 + r() * (y1 - y0), yb = y0 + r() * (y1 - y0), w = (4 + r() * 7) * sc;
      tube(c, [[x0 - 30, ya], [x0 + (x1 - x0) * 0.3, ya + (r() - 0.5) * 120], [x0 + (x1 - x0) * 0.7, yb + (r() - 0.5) * 120], [x1 + 30, yb]], w, w, { m: MM, rib: 0.5 });
    }
    // teschi incastonati
    for (let i = 0; i < (o.skulls == null ? 2 : o.skulls); i++) skull(c, x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), (16 + r() * 18) * sc, (r() - 0.5) * 0.8, { m: MM, elong: 1.2 + r() * 0.8 });
    // velo di profondità
    if (L < layers - 1) { c.fillStyle = rgba(o.haze || M.d, 0.45 - L * 0.08); c.fillRect(x0, y0, x1 - x0, y1 - y0); }
  }
  c.restore();
}
// tratteggio a inchiostro dentro la forma corrente (clip), più fitto in ombra
function hatch(c, x, y, w, h, ang, gap, col, a, seed) {
  const r = rng(seed || 7); c.save(); c.strokeStyle = col || '#000'; c.globalAlpha = a == null ? 0.35 : a; c.lineWidth = 0.7;
  const d = Math.hypot(w, h), cx = x + w / 2, cy = y + h / 2, ca = Math.cos(ang), sa = Math.sin(ang);
  for (let t = -d / 2; t < d / 2; t += gap * (0.7 + r() * 0.6)) {
    const px = cx - sa * t, py = cy + ca * t, j = (r() - 0.5) * 3;
    c.beginPath(); c.moveTo(px - ca * d / 2 + j, py - sa * d / 2); c.lineTo(px + ca * d / 2, py + sa * d / 2 + j); c.stroke();
  }
  c.restore();
}
// linea d'inchiostro tremolante
function inkLine(c, pts, w, col, seed, jit) {
  const r = rng(seed || 3), P = spline(pts, 10);
  c.save(); c.strokeStyle = col || '#050403'; c.lineCap = 'round'; c.lineJoin = 'round';
  for (let i = 1; i < P.length; i++) {
    c.lineWidth = w * (0.6 + r() * 0.7);
    c.beginPath(); c.moveTo(P[i - 1][0] + (r() - 0.5) * (jit || 1), P[i - 1][1] + (r() - 0.5) * (jit || 1)); c.lineTo(P[i][0], P[i][1]); c.stroke();
  }
  c.restore();
}
A.tube = tube; A.vertebrae = vertebrae; A.shadeShape = shadeShape; A.skull = skull; A.ribs = ribs; A.bioWall = bioWall; A.hatch = hatch; A.inkLine = inkLine;

// volume ad aerografo per una sagoma (maschera): bordi scuri, centro chiaro, riflesso
// speculare, contorno a inchiostro e tratteggio nelle ombre
Figure.prototype.bio = function (t, o) {
  o = o || {};
  const M = met(o.m), w = this.w, h = this.h, m = this.cv;
  const out = canvas(w, h), c = out.getContext('2d');
  // contorno (dilatazione nera)
  const ow = o.outline == null ? 2 : o.outline;
  if (ow) { const ink = tint(m, '#030302'); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; c.drawImage(ink, Math.cos(a) * ow, Math.sin(a) * ow); } }
  // tono medio
  const body = canvas(w, h), b = body.getContext('2d');
  b.drawImage(m, 0, 0); b.globalCompositeOperation = 'source-in';
  const g = b.createLinearGradient(0, o.y0 || 0, 0, o.y1 || h); g.addColorStop(0, M.l); g.addColorStop(0.5, M.m); g.addColorStop(1, mix(M.m, M.d, 0.6));
  b.fillStyle = g; b.fillRect(0, 0, w, h);
  b.globalCompositeOperation = 'source-atop';
  // ombra interna: inverso della maschera sfocato
  const inv = canvas(w, h), ic = inv.getContext('2d');
  ic.fillStyle = M.d; ic.fillRect(0, 0, w, h); ic.globalCompositeOperation = 'destination-out'; ic.drawImage(m, 0, 0);
  const sh = o.depth || 14;
  b.save(); b.filter = 'blur(' + sh + 'px)'; b.globalAlpha = 1; b.drawImage(inv, sh * 0.35, sh * 0.5); b.drawImage(inv, sh * 0.35, sh * 0.5); b.restore();
  b.save(); b.filter = 'blur(' + Math.round(sh / 3) + 'px)'; b.globalAlpha = 0.9; b.drawImage(inv, 0, 0); b.restore();
  // texture organica
  const tx = noiseTex(o.texSeed || 17, 160, 205, o.texScale || 5, 5, 2.6);
  b.globalAlpha = o.texAlpha == null ? 0.3 : o.texAlpha; b.globalCompositeOperation = 'overlay';
  b.drawImage(tint(tx, '#ffffff'), 0, 0, w, h);
  b.globalCompositeOperation = 'source-atop'; b.globalAlpha = 0.25; b.drawImage(tint(noiseTex((o.texSeed || 17) + 1, 160, 205, 3, 4, 3), M.d), 0, 0, w, h);
  b.globalAlpha = 1;
  // riflesso speculare: maschera erosa e spostata verso la luce
  const sp = canvas(w, h), s = sp.getContext('2d');
  s.drawImage(m, 0, 0); s.globalCompositeOperation = 'destination-out';
  const e = o.spec == null ? 5 : o.spec; s.drawImage(m, e, e * 1.3);
  b.save(); b.globalCompositeOperation = 'lighter'; b.filter = 'blur(' + (e * 0.5) + 'px)'; b.globalAlpha = 0.75; b.drawImage(tint(sp, M.s), 0, 0); b.restore();
  // tratteggio nelle ombre
  if (o.hatch !== false) {
    const hc = canvas(w, h), hx = hc.getContext('2d');
    hatch(hx, 0, 0, w, h, o.hatchAng == null ? -0.9 : o.hatchAng, o.hatchGap || 4, M.d, 0.8, 5);
    hx.globalCompositeOperation = 'destination-in'; hx.filter = 'blur(6px)'; hx.drawImage(inv, 4, 6);
    b.globalCompositeOperation = 'source-atop'; b.globalAlpha = 0.55; b.drawImage(hc, 0, 0); b.globalAlpha = 1;
  }
  c.drawImage(body, 0, 0);
  if (o.rim) { const R = o.rim; const rc = canvas(w, h), r = rc.getContext('2d'); r.drawImage(m, 0, 0); r.globalCompositeOperation = 'source-in'; r.fillStyle = R.col; r.fillRect(0, 0, w, h); r.globalCompositeOperation = 'destination-out'; r.drawImage(m, (R.dx || 0) * (R.w || 3), (R.dy == null ? 1 : R.dy) * (R.w || 3)); c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = R.a || 0.7; c.filter = 'blur(1px)'; c.drawImage(rc, 0, 0); c.restore(); }
  t.drawImage(out, 0, 0);
  return out;
};

// ---------------- post-produzione ----------------
function post(cv, o) {
  o = o || {};
  const c = cv.getContext('2d'), w = cv.width, h = cv.height;
  // monocromo biomeccanico: desatura e ritinge
  if (o.mono) {
    const t = canvas(w, h), tc = t.getContext('2d'); tc.filter = 'grayscale(1) contrast(' + (o.contrast || 1.15) + ')'; tc.drawImage(cv, 0, 0);
    c.clearRect(0, 0, w, h); c.drawImage(t, 0, 0);
    c.save(); c.globalCompositeOperation = 'color'; c.globalAlpha = o.monoA == null ? 0.55 : o.monoA; c.fillStyle = o.mono; c.fillRect(0, 0, w, h); c.restore();
  }
  if (o.accent) o.accent(c);
  // bloom
  if (o.bloom !== 0) {
    const b = canvas(w, h), bc = b.getContext('2d');
    bc.filter = 'brightness(0.85) contrast(2.4) saturate(1.3) blur(' + Math.round(w / 34) + 'px)';
    bc.drawImage(cv, 0, 0);
    c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = o.bloom == null ? 0.55 : o.bloom; c.drawImage(b, 0, 0); c.restore();
  }
  // gradazione colore
  if (o.grade) { c.save(); c.globalCompositeOperation = 'soft-light'; c.globalAlpha = o.gradeA == null ? 0.5 : o.gradeA; c.fillStyle = o.grade; c.fillRect(0, 0, w, h); c.restore(); }
  if (o.shadowTint) { c.save(); c.globalCompositeOperation = 'lighten'; c.fillStyle = o.shadowTint; c.fillRect(0, 0, w, h); c.restore(); }
  // vignetta
  const vg = c.createRadialGradient(w / 2, h * 0.45, w * 0.25, w / 2, h * 0.5, h * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + (o.vignette == null ? 0.72 : o.vignette) + ')');
  c.fillStyle = vg; c.fillRect(0, 0, w, h);
  // grana
  if (o.grain !== 0) {
    const gs = 2, gw = Math.ceil(w / gs), gh = Math.ceil(h / gs), gcv = canvas(gw, gh), gc = gcv.getContext('2d'), img = gc.createImageData(gw, gh), r = rng(o.seed || 99);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    gc.putImageData(img, 0, 0);
    c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = o.grain == null ? 0.07 : o.grain; c.imageSmoothingEnabled = false; c.drawImage(gcv, 0, 0, w, h); c.restore();
  }
  // carta vecchia: macchie e graffi
  if (o.paper !== 0) {
    c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = o.paper || 0.35;
    c.drawImage(tint(noiseTex(901, 120, 154, 10, 5, 2.2), '#6a5a40'), 0, 0, w, h); c.restore();
    const r = rng((o.seed || 1) + 7); c.save(); c.strokeStyle = 'rgba(235,225,200,.18)'; c.lineWidth = 0.6;
    for (let i = 0; i < 14; i++) { const x = r() * w, y = r() * h, L = 10 + r() * 60, a = r() * TAU; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); c.stroke(); }
    c.restore();
  }
}
A.post = post;

// ---------------- composizione di una carta ----------------
A.SCENES = A.SCENES || {};
A.renderArt = function (key, w, h) {
  const S = A.SCENES[key]; if (!S) throw new Error('Scena mancante: ' + key);
  w = w || W; h = h || H;
  const cv = canvas(W, H), c = cv.getContext('2d');
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  S.draw(c, A);
  post(cv, Object.assign({ seed: hash(key), accent: S.accent ? (cc) => S.accent(cc, A) : null }, S.post || {}));
  if (w === W && h === H) return cv;
  const o = canvas(w, h), oc = o.getContext('2d'); oc.imageSmoothingQuality = 'high'; oc.drawImage(cv, 0, 0, w, h); return o;
};
})(window);
