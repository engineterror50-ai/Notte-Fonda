/* ==== NOTTE FONDA — Scultore 2.5D (bassorilievo biomeccanico) ====
 * Ogni illustrazione è una mappa di altezze scolpita con primitive (cupole,
 * capsule, tubi a costole, vertebre, spine, lastre smussate, anelli) unite con
 * massimo morbido, poi illuminata pixel per pixel: diffusa, speculare cromata,
 * occlusione delle cavità e profondità. Il risultato ricorda la pittura ad
 * aerografo su rilievo. Albedo separato per orbite, fauci, crepe.
 */
(function (G) {
'use strict';
const A = G.NFArt;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function smax(a, b, k) { if (k <= 0) return a > b ? a : b; const h = clamp(0.5 + 0.5 * (a - b) / k, 0, 1); return b + (a - b) * h + k * h * (1 - h); }

// rampe tonali (valore → colore): monocromi biomeccanici
const RAMPS = {
  ossa:    ['#000000', '#0a0b0b', '#25292a', '#5d6462', '#9da39b', '#d6d7cb', '#f4f3ea', '#ffffff'],
  freddo:  ['#000000', '#07090c', '#1c242b', '#4d5a63', '#8b98a0', '#c9d2d4', '#eef3f2', '#ffffff'],
  palude:  ['#000000', '#070906', '#1b2219', '#475443', '#86917a', '#c3c8b0', '#eef0e2', '#ffffff'],
  seppia:  ['#000000', '#0c0906', '#2a2119', '#5e4e3c', '#9c8a6e', '#d4c4a4', '#f4ead6', '#ffffff'],
  sangue:  ['#000000', '#0e0606', '#2c1515', '#603a36', '#9c7a70', '#d4bcb0', '#f6ebe4', '#ffffff'],
  viola:   ['#000000', '#0a070d', '#221a2a', '#4f445a', '#8c8296', '#c8c2d0', '#efecf2', '#ffffff'],
};

function Sculpt(w, h) {
  this.w = w || A.W; this.h = h || A.H;
  const n = this.w * this.h;
  this.H = new Float32Array(n);
  this.Al = new Float32Array(n).fill(1);
  this.Gl = new Float32Array(n).fill(1);   // lucentezza
}
const P = Sculpt.prototype;
A.Sculpt = Sculpt;
A.sculpt = (w, h) => new Sculpt(w, h);

// scrive un valore di altezza secondo la modalità
P._put = function (i, v, o) {
  const H = this.H, old = H[i];
  const mode = o.mode || 'max';
  let nv;
  if (mode === 'max') nv = smax(v, old, o.k || 0);
  else if (mode === 'add') nv = old + v;
  else if (mode === 'sub') nv = old - v;
  else if (mode === 'min') nv = Math.min(old, v);
  else if (mode === 'set') nv = v;
  else if (mode === 'on') nv = smax(old + v, old, o.k || 0);
  H[i] = nv;
  if (o.alb != null) {
    if (mode === 'sub' || mode === 'add' || mode === 'on') { const t = clamp(Math.abs(nv - old) / (o.albRange || 6), 0, 1); this.Al[i] += (o.alb - this.Al[i]) * t; }
    else if (nv > old + 0.01) this.Al[i] = o.alb;
  }
  if (o.gloss != null && nv > old + 0.01) this.Gl[i] = o.gloss;
};
P._box = function (x0, y0, x1, y1, fn) {
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(this.w - 1, Math.ceil(x1)); y1 = Math.min(this.h - 1, Math.ceil(y1));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) fn(x, y, y * this.w + x);
};

// cupola ellissoidale (rz = altezza della cupola, z = base)
P.dome = function (cx, cy, rx, ry, z, o) {
  o = o || {}; const rot = o.rot || 0, ca = Math.cos(rot), sa = Math.sin(rot), rz = o.rz == null ? Math.min(rx, ry) : o.rz;
  const pw = o.pow || 0.5, R = Math.max(rx, ry);
  this._box(cx - R, cy - R, cx + R, cy + R, (x, y, i) => {
    const dx = x - cx, dy = y - cy, u = (dx * ca + dy * sa) / rx, v = (-dx * sa + dy * ca) / ry, d = u * u + v * v;
    if (d >= 1) return;
    this._put(i, z + rz * Math.pow(1 - d, pw), o);
  });
  return this;
};
// capsula conica con profilo arrotondato
P.capsule = function (x1, y1, r1, x2, y2, r2, z, o) {
  o = o || {}; const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1, R = Math.max(r1, r2);
  const zr = o.zr == null ? 1 : o.zr, z2 = o.z2 == null ? z : o.z2;
  this._box(Math.min(x1, x2) - R, Math.min(y1, y2) - R, Math.max(x1, x2) + R, Math.max(y1, y2) + R, (x, y, i) => {
    let t = ((x - x1) * dx + (y - y1) * dy) / L2; t = clamp(t, 0, 1);
    const px = x1 + dx * t - x, py = y1 + dy * t - y, d = Math.sqrt(px * px + py * py), r = r1 + (r2 - r1) * t;
    if (d >= r) return;
    let rr = r;
    if (o.rib) { const s = (o.s0 || 0) + t * Math.sqrt(L2); rr = r * (1 - o.ribD * (0.5 + 0.5 * Math.cos(s / o.rib * TAU))); if (d >= rr) return; }
    const q = d / rr;
    this._put(i, z + (z2 - z) * t + rr * zr * Math.sqrt(1 - q * q), o);
  });
  return this;
};
// tubo a costole lungo una curva (rib = passo costole in px, ribD = profondità 0..1)
P.tube = function (pts, r0, r1, z, o) {
  o = Object.assign({}, o || {}); const Q = A.spline(pts, 10);
  let len = 0; const S = [0];
  for (let i = 1; i < Q.length; i++) { len += Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]); S.push(len); }
  const z1 = o.z1 == null ? z : o.z1;
  if (o.rib == null) o.rib = (r0 + r1) * 0.32;
  if (o.ribD == null) o.ribD = 0.16;
  for (let i = 0; i < Q.length - 1; i++) {
    const t0 = S[i] / len, t1 = S[i + 1] / len;
    this.capsule(Q[i][0], Q[i][1], r0 + (r1 - r0) * t0, Q[i + 1][0], Q[i + 1][1], r0 + (r1 - r0) * t1, z + (z1 - z) * t0, Object.assign({}, o, { s0: S[i], z2: z + (z1 - z) * t1 }));
  }
  return this;
};
// spina/artiglio: tubo rastremato fino a punta
P.spike = function (x, y, len, ang, w, z, o) {
  o = o || {}; const b = o.bend || 0, nx = -Math.sin(ang), ny = Math.cos(ang);
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  return this.tube([[x, y], [(x + ex) / 2 + nx * len * b, (y + ey) / 2 + ny * len * b], [ex, ey]], w / 2, 0.6, z, Object.assign({ rib: 0, ribD: 0, z1: o.z1 == null ? z : o.z1 }, o));
};
// vertebre lungo una curva
P.vertebrae = function (pts, s0, s1, z, o) {
  o = o || {}; const Q = A.spline(pts, 14); let acc = 0, idx = 0; const out = [[Q[0], 0]];
  for (let i = 1; i < Q.length; i++) { acc += Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]); const s = s0 + (s1 - s0) * i / Q.length; if (acc >= s * (o.gap || 1.0)) { out.push([Q[i], i / Q.length]); acc = 0; } }
  for (let j = 0; j < out.length; j++) {
    const [p, t] = out[j], q = out[Math.min(out.length - 1, j + 1)][0], b = out[Math.max(0, j - 1)][0];
    const ang = Math.atan2(q[1] - b[1], q[0] - b[0]), s = s0 + (s1 - s0) * t, nx = -Math.sin(ang), ny = Math.cos(ang);
    // processi trasversi
    if (o.wings !== false) for (const sd of [-1, 1]) this.capsule(p[0], p[1], s * 0.2, p[0] + nx * s * sd * 0.95, p[1] + ny * s * sd * 0.95 + s * 0.12, s * 0.08, z, o);
    this.dome(p[0], p[1], s * 0.5, s * 0.42, z, Object.assign({}, o, { rot: ang, rz: s * 0.55, pow: 0.6 }));
    this.dome(p[0], p[1], s * 0.16, s * 0.16, z + s * 0.35, Object.assign({}, o, { rz: s * 0.25 }));
  }
  return this;
};
// lastra con bordo smussato (poligono)
P.plate = function (pts, z, bev, o) {
  o = o || {}; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const n = pts.length, bz = o.bz == null ? bev * 0.6 : o.bz;
  this._box(x0, y0, x1, y1, (x, y, i) => {
    let inside = false, md = 1e9;
    for (let a = 0, b = n - 1; a < n; b = a++) {
      const xa = pts[a][0], ya = pts[a][1], xb = pts[b][0], yb = pts[b][1];
      if (((ya > y) !== (yb > y)) && (x < (xb - xa) * (y - ya) / (yb - ya) + xa)) inside = !inside;
      const dx = xb - xa, dy = yb - ya, L = dx * dx + dy * dy || 1; let t = ((x - xa) * dx + (y - ya) * dy) / L; t = clamp(t, 0, 1);
      const ex = xa + dx * t - x, ey = ya + dy * t - y; md = Math.min(md, ex * ex + ey * ey);
    }
    if (!inside) return;
    const d = Math.sqrt(md), q = clamp(d / bev, 0, 1);
    this._put(i, z + bz * Math.sqrt(1 - (1 - q) * (1 - q)), o);
  });
  return this;
};
// anello / toro ellittico
P.ring = function (cx, cy, rx, ry, th, z, o) {
  o = o || {}; const R = Math.max(rx, ry) + th;
  this._box(cx - R, cy - R, cx + R, cy + R, (x, y, i) => {
    const u = (x - cx) / rx, v = (y - cy) / ry, e = Math.sqrt(u * u + v * v); if (e === 0) return;
    const ang = Math.atan2(v, u);
    const d = Math.abs(e - 1) * Math.min(rx, ry) / 1; if (d >= th) return;
    let rr = th; if (o.rib) { rr = th * (1 - (o.ribD || 0.2) * (0.5 + 0.5 * Math.cos(ang * o.rib))); if (d >= rr) return; }
    const q = d / rr; this._put(i, z + rr * Math.sqrt(1 - q * q), o);
  });
  return this;
};
// solco/cavità (orbite, bocche): abbassa e scurisce
P.hole = function (cx, cy, rx, ry, depth, o) {
  o = Object.assign({ mode: 'sub', alb: 0.05, albRange: depth * 0.5 }, o || {});
  return this.dome(cx, cy, rx, ry, 0, Object.assign(o, { rz: depth, pow: o.pow || 0.7 }));
};
// rugosità/grinze organiche ovunque (o in un rettangolo)
P.noise = function (amp, sc, seed, box) {
  const n = A.noise2(seed || 1), b = box || [0, 0, this.w, this.h];
  this._box(b[0], b[1], b[0] + b[2], b[1] + b[3], (x, y, i) => {
    let v = A.fbm(n, x / sc, y / sc, 4) - 0.5;
    v = (1 - Math.abs(v * 2)) - 0.5;            // creste (stile organico)
    this.H[i] += v * amp;
  });
  return this;
};
// fasci di cavi paralleli (capelli/cavi): n tubi sottili affiancati lungo pts
P.cables = function (pts, n, gap, r, z, o) {
  const Q = A.spline(pts, 8);
  for (let k = 0; k < n; k++) {
    const off = (k - (n - 1) / 2) * gap;
    const C = Q.map((p, i) => { const q = Q[Math.min(Q.length - 1, i + 1)], b = Q[Math.max(0, i - 1)], a = Math.atan2(q[1] - b[1], q[0] - b[0]); return [p[0] - Math.sin(a) * off, p[1] + Math.cos(a) * off]; });
    this.tube(C, r, r * ((o && o.taper) || 1), z, Object.assign({ ribD: 0.1 }, o || {}));
  }
  return this;
};
// teschio scolpito (frontale), s = mezza larghezza, elong = allungamento del cranio
P.skull = function (x, y, s, z, o) {
  o = o || {}; const el = o.elong || 1.15;
  this.dome(x, y - s * 0.25 * el, s, s * el, z, { rz: s * 0.8, k: s * 0.1 });
  this.dome(x, y + s * 0.55, s * 0.62, s * 0.42, z, { rz: s * 0.4, k: s * 0.15 });
  for (const sx of [-1, 1]) {
    this.dome(x + sx * s * 0.6, y + s * 0.35, s * 0.3, s * 0.25, z + s * 0.2, { rz: s * 0.25, k: s * 0.1 });
    this.hole(x + sx * s * 0.38, y + s * 0.12, s * 0.3, s * 0.26, s * 0.7, { rot: sx * 0.3 });
  }
  this.hole(x, y + s * 0.48, s * 0.11, s * 0.16, s * 0.5);
  for (let k = 0; k < 6; k++) this.dome(x - s * 0.36 + k * s * 0.144, y + s * 0.82, s * 0.065, s * 0.13, z + s * 0.25, { rz: s * 0.12 });
  this.hole(x, y + s * 0.82, s * 0.42, s * 0.03, s * 0.2, { alb: 0.1 });
  return this;
};
// volto umano sereno (frontale, occhi chiusi) – tratto ieratico
P.face = function (x, y, s, z, o) {
  o = o || {};
  this.dome(x, y, s, s * 1.3, z, { rz: s * 0.7, k: s * 0.2 });
  this.dome(x, y + s * 0.85, s * 0.55, s * 0.4, z + s * 0.3, { rz: s * 0.35, k: s * 0.25 });           // mento
  for (const sx of [-1, 1]) {
    this.dome(x + sx * s * 0.55, y + s * 0.25, s * 0.38, s * 0.32, z + s * 0.35, { rz: s * 0.3, k: s * 0.2 }); // zigomi
    this.hole(x + sx * s * 0.38, y - s * 0.08, s * 0.28, s * 0.16, s * 0.25, { alb: 0.55, rot: sx * 0.12 });
    if (o.open) { this.hole(x + sx * s * 0.38, y - s * 0.06, s * 0.16, s * 0.08, s * 0.3, { alb: 0.0 }); }
    else this.dome(x + sx * s * 0.38, y - s * 0.06, s * 0.24, s * 0.11, z + s * 0.48, { rz: s * 0.1, k: s * 0.05 }); // palpebra chiusa
    this.capsule(x + sx * s * 0.62, y - s * 0.3, s * 0.05, x + sx * s * 0.15, y - s * 0.28, s * 0.06, z + s * 0.62, { k: s * 0.15 }); // arcata
  }
  this.capsule(x, y - s * 0.15, s * 0.1, x, y + s * 0.38, s * 0.15, z + s * 0.6, { z2: z + s * 0.75, k: s * 0.12 }); // naso
  this.dome(x, y + s * 0.62, s * 0.24, s * 0.07, z + s * 0.6, { rz: s * 0.08, k: s * 0.05 });           // labbro sup
  this.dome(x, y + s * 0.74, s * 0.2, s * 0.08, z + s * 0.6, { rz: s * 0.09, k: s * 0.05 });            // labbro inf
  this.hole(x, y + s * 0.67, s * 0.24, s * 0.018, s * 0.15, { alb: 0.2 });
  return this;
};
// specchia la metà sinistra sulla destra (simmetria ieratica)
P.mirror = function (cx) {
  cx = cx == null ? this.w / 2 : cx; const w = this.w;
  for (let y = 0; y < this.h; y++) for (let x = Math.ceil(cx); x < w; x++) {
    const sx = Math.round(2 * cx - x); if (sx < 0) continue;
    const i = y * w + x, j = y * w + sx; this.H[i] = this.H[j]; this.Al[i] = this.Al[j]; this.Gl[i] = this.Gl[j];
  }
  return this;
};
// sfondo di base: piano con gradiente di altezza
P.base = function (z, o) { o = o || {}; for (let i = 0; i < this.H.length; i++) this.H[i] = z; return this; };

// sfocatura a scatola separabile (per occlusione)
function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), k = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) { let s = 0; const o = y * w; for (let x = -r; x <= r; x++) s += src[o + clamp(x, 0, w - 1)]; for (let x = 0; x < w; x++) { tmp[o + x] = s * k; s += src[o + clamp(x + r + 1, 0, w - 1)] - src[o + clamp(x - r, 0, w - 1)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[clamp(y, 0, h - 1) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = s * k; s += tmp[clamp(y + r + 1, 0, h - 1) * w + x] - tmp[clamp(y - r, 0, h - 1) * w + x]; } }
  return out;
}
function rampLUT(stops) {
  const cols = stops.map(A.hexRGB), lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) { const t = i / 255 * (cols.length - 1), a = Math.floor(t), b = Math.min(cols.length - 1, a + 1), f = t - a; for (let k = 0; k < 3; k++) lut[i * 3 + k] = cols[a][k] + (cols[b][k] - cols[a][k]) * f; }
  return lut;
}
A.RAMPS = RAMPS;

// illuminazione → canvas
P.render = function (o) {
  o = o || {};
  const w = this.w, h = this.h, H = this.H, Al = this.Al, Gl = this.Gl;
  const lut = rampLUT(o.ramp ? (Array.isArray(o.ramp) ? o.ramp : RAMPS[o.ramp]) : RAMPS.ossa);
  let L = o.light || [-0.55, -0.7, 0.75]; const ln = Math.hypot(L[0], L[1], L[2]); L = [L[0] / ln, L[1] / ln, L[2] / ln];
  const Hv = [L[0], L[1], L[2] + 1], hn = Math.hypot(Hv[0], Hv[1], Hv[2]); Hv[0] /= hn; Hv[1] /= hn; Hv[2] /= hn;
  const B1 = boxBlur(H, w, h, 3), B2 = boxBlur(H, w, h, 12), B3 = boxBlur(H, w, h, 34);
  let zmin = 1e9, zmax = -1e9; for (let i = 0; i < H.length; i++) { if (H[i] < zmin) zmin = H[i]; if (H[i] > zmax) zmax = H[i]; }
  const zr = Math.max(1, (o.zmax || zmax) - zmin);
  const bump = o.bump || 1, amb = o.amb == null ? 0.04 : o.amb, kd = o.kd == null ? 0.7 : o.kd, ks = o.ks == null ? 1.0 : o.ks, shin = o.shin || 60, envK = o.env == null ? 0.1 : o.env;
  const cav = o.cav == null ? 1.5 : o.cav, depth = o.depth == null ? 0.85 : o.depth;
  const cv = A.canvas(w, h), c = cv.getContext('2d'), img = c.createImageData(w, h), D = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const xl = H[y * w + Math.max(0, x - 1)], xr = H[y * w + Math.min(w - 1, x + 1)], yu = H[Math.max(0, y - 1) * w + x], yd = H[Math.min(h - 1, y + 1) * w + x];
    let nx = (xl - xr) * bump, ny = (yu - yd) * bump, nz = 2; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    const dif = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    const sp = Math.pow(Math.max(0, nx * Hv[0] + ny * Hv[1] + nz * Hv[2]), shin);
    const sp2 = Math.pow(Math.max(0, nx * Hv[0] + ny * Hv[1] + nz * Hv[2]), 6);
    // riflesso ambientale cromato: superfici rivolte in alto più chiare
    const env = 0.5 - ny * 0.5;
    // occlusione: quanto il punto è più basso dei dintorni
    const occ = clamp(1 + ((H[i] - B1[i]) * 0.06 + (H[i] - B2[i]) * 0.035 + (H[i] - B3[i]) * 0.012) * cav, 0, 1.25);
    const dz = clamp((H[i] - zmin) / zr, 0, 1);
    const dep = 1 - depth + depth * Math.pow(dz, 1.1);
    const a = Al[i], g = Gl[i];
    let v = (amb + kd * Math.pow(dif, 1.6) + env * envK) * occ * dep * a;
    v += (ks * sp + 0.1 * sp2) * g * Math.min(1, occ) * (0.3 + 0.7 * dep) * Math.sqrt(a);
    v = Math.pow(clamp(v, 0, 1), o.gamma || 1.15);
    v = clamp(v, 0, 1);
    const li = (v * 255) | 0, k = i * 4;
    D[k] = lut[li * 3]; D[k + 1] = lut[li * 3 + 1]; D[k + 2] = lut[li * 3 + 2]; D[k + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return cv;
};
})(window);
