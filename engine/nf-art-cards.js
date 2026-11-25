/* ==== NOTTE FONDA — Motore grafico: le 33 illustrazioni del Set Base ====
 * Ogni scena disegna su uno spazio fisso 480×616 usando il nucleo (nf-art-core.js).
 */
(function (G) {
'use strict';
const A = G.NFArt;
const { W, H, TAU } = A;
const S = A.SCENES;

// dati carta minimi (nome, tipo, rarità, costo) per lo Studio e le carte complete
A.CARDS = {
  ratti: ['Ratti delle Fogne', 'L', 'C', 1], fatuo: ['Fuoco Fatuo', 'L', 'C', 1], mazza: ['Mazzamurelli', 'L', 'C', 2],
  teke: ['Teke Teke', 'L', 'R', 2], muna: ['Munaciello', 'L', 'R', 2], kappa: ['Kappa', 'L', 'C', 3],
  anime: ['Anime Perdute', 'L', 'C', 3], chupa: ['Chupacabra', 'L', 'R', 3], bella: ["Bella 'Mbriana", 'L', 'R', 3],
  moth: ['Mothman', 'L', 'R', 3], nero: ['Uomo Nero', 'L', 'E', 3], banshee: ['Banshee', 'L', 'R', 4],
  cane: ['Cane Nero', 'L', 'R', 4], lupo: ['Lupo Mannaro', 'L', 'E', 4], alto: ['Uomo Alto', 'L', 'E', 4],
  kuchi: ['Kuchisake-onna', 'L', 'E', 4], wendi: ['Wendigo', 'L', 'E', 4], baba: ['Baba Jaga', 'L', 'M', 5],
  dama: ['Dama Bianca', 'L', 'M', 5], llorona: ['La Llorona', 'L', 'M', 5], krampus: ['Krampus', 'L', 'E', 6],
  candela: ['Candela', 'R', 'C', 1], campana: ['Campana a Morto', 'R', 'C', 2], nebbia: ['Nebbia', 'R', 'R', 2],
  pipi: ['Nuvola di Pipistrelli', 'R', 'C', 3], sale: ['Sale Benedetto', 'R', 'R', 3], seduta: ['Seduta Spiritica', 'R', 'E', '?'],
  falo: ['Falò', 'R', 'R', 4], malo: ['Malocchio', 'R', 'E', 4],
  lapide: ['Lapide', 'C', 'R', 3], edicola: ['Edicola Votiva', 'C', 'R', 4], specchio: ['Specchio', 'C', 'E', 4], casa: ['Casa Infestata', 'C', 'E', 5],
};

// ======================= LEGGENDE =======================

// zanne lucide lungo una linea
function fangs(c, x0, y0, x1, y1, n, len, dir, M) {
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = A.lerp(x0, x1, t), y = A.lerp(y0, y1, t), L = len * (0.6 + 0.6 * Math.sin(t * Math.PI));
    c.save(); c.translate(x, y);
    A.shadeShape(c, A.MET[M || 'osso'], L, () => { c.beginPath(); c.moveTo(-L * 0.18, 0); c.quadraticCurveTo(-L * 0.1, L * 0.6 * dir, L * 0.08, L * dir); c.quadraticCurveTo(L * 0.12, L * 0.5 * dir, L * 0.18, 0); c.closePath(); });
    c.restore();
  }
}
A.fangs = fangs;

S.lupo = { post: { mono: '#7f8a9a', monoA: 0.5, bloom: 0.35 },
draw(c) {
  A.bioWall(c, { m: 'acciaio', seed: 12, layers: 3, cols: 6, hoses: 3, skulls: 3 });
  // luna: un disco osseo con anelli, come un oblò
  c.save();
  const g = c.createRadialGradient(240, 190, 20, 250, 200, 165); g.addColorStop(0, '#f6f2e6'); g.addColorStop(0.6, '#bdb8aa'); g.addColorStop(0.92, '#4a4840'); g.addColorStop(1, '#0a0a08');
  c.fillStyle = g; A.circle(c, 250, 200, 160);
  A.clouds(c, { seed: 4, col: '#2a2a26', a: 0.55, y: 40, h: 330, op: 'multiply' });
  c.restore();
  A.tube(c, [[90, 200], [130, 60], [250, 30], [370, 60], [410, 200], [370, 340], [250, 370], [130, 340], [90, 200]], 18, 18, { m: 'acciaio', rib: 0.32 });
  // lupo: masse del corpo
  const f = A.fig(); const k = f.c;
  A.blob(k, [[180, 340], [178, 280], [196, 228], [232, 188], [272, 172], [304, 190], [314, 230], [298, 274], [270, 310], [246, 344], [212, 360]]);
  A.chain(k, [[205, 335, 36], [240, 395, 22]]); A.chain(k, [[232, 345, 30], [284, 392, 20]]);
  A.taper(k, [[262, 205], [284, 172], [300, 142]], 64, 40);
  // testa: cranio + muso allungato verso l'alto
  A.ell(k, 306, 128, 28, 24, -0.6);
  A.taper(k, [[300, 124], [334, 96], [378, 62]], 34, 10);
  A.taper(k, [[312, 146], [340, 128], [372, 104]], 22, 7);
  A.claw(k, 290, 108, 46, -2.3, 20, 0.15); A.claw(k, 306, 104, 40, -1.9, 17, 0.2);
  f.bio(c, { m: 'acciaio', depth: 12, spec: 4 });
  // spina dorsale esposta e costole
  A.vertebrae(c, [[176, 350], [182, 280], [205, 220], [245, 180], [292, 140]], 13, 9, { m: 'osso' });
  for (let i = 0; i < 6; i++) { const y = 230 + i * 18, x = 210 + i * 2; A.tube(c, [[x - 10, y], [x + 30, y - 6], [x + 70 - i * 6, y + 14], [x + 70 - i * 8, y + 32]], 4.5, 2.5, { m: 'osso', rib: 0.9 }); }
  // zampe: tubi a costole e articolazioni
  A.tube(c, [[240, 392], [200, 426], [232, 458]], 14, 9, { m: 'acciaio' });
  A.tube(c, [[284, 390], [258, 430], [296, 458]], 13, 8, { m: 'acciaio' });
  [[232, 458], [296, 458]].forEach(([x, y]) => { for (let i = 0; i < 3; i++) A.claw(c, x + i * 6, y, 22, 0.15 + i * 0.25, 6, -0.3); });
  // braccia: tubi con gomito a vertebra
  A.tube(c, [[292, 196], [324, 256], [338, 314]], 18, 9, { m: 'acciaio', rib: 0.38 });
  A.tube(c, [[246, 200], [226, 262], [240, 312]], 16, 8, { m: 'acciaio', rib: 0.38, rev: true });
  const M = A.MET.osso;
  [[338, 314, [2.0, 1.7, 1.35, 1.05]], [240, 312, [2.1, 1.75, 1.4]]].forEach(([x, y, angs]) => angs.forEach((a, i) => {
    c.save(); c.translate(x, y); c.rotate(a); A.shadeShape(c, M, 30, () => { c.beginPath(); c.moveTo(0, -4); c.quadraticCurveTo(22, -6, 34 - i * 3, 6); c.quadraticCurveTo(18, 2, 0, 4); c.closePath(); }); c.restore();
  }));
  // tubi che entrano nel collo
  A.tube(c, [[150, 120], [210, 150], [262, 170], [290, 150]], 7, 5, { m: 'olio' });
  A.tube(c, [[140, 180], [215, 200], [270, 190]], 6, 4, { m: 'olio' });
  // fauci: zanne
  fangs(c, 312, 116, 372, 72, 7, 13, 1, 'osso');
  fangs(c, 318, 140, 366, 108, 6, 10, -1, 'osso');
  c.fillStyle = '#050403'; A.poly(c, [[312, 128], [370, 80], [366, 104], [318, 140]]);
  // occhio incavato
  c.fillStyle = '#000'; A.ell(c, 316, 116, 9, 6, -0.6);
  A.fog(c, 590, 160, '#1a1c20', 0.8, 3);
},
accent(c) {
  A.glowEye(c, 316, 116, 3.2, '#ffb52a');
  A.glow(c, 345, 105, 40, '#ff5a1a', 0.35, 'lighter');
} };

S.cane = { post: { grade: '#2a5a3a', gradeA: 0.4 }, draw(c) {
  A.sky(c, ['#020504', '#071510', '#122a20', '#1a2a24']);
  A.stars(c, 60, 11, 220, 0.5);
  A.moon(c, 360, 130, 46, { col: '#d8ecd6', halo: '#8fe0b0', haloR: 5 });
  A.clouds(c, { seed: 12, col: '#06100c', a: 0.8, y: 60, h: 260 });
  A.hills(c, 440, 70, '#07110d', 13);
  A.fog(c, 430, 120, '#4c7a62', 0.5, 14);
  // brughiera con croce celtica e muretto
  c.fillStyle = '#030705'; A.graves(c, 470, 7, 16, 34, '#030705', 15);
  A.deadTree(c, 70, 520, 120, -1.65, 16, 7, 6);
  A.hills(c, 520, 40, '#020403', 16);
  // segugio nero gigante
  const f = A.fig(); const k = f.c;
  // corpo massiccio
  A.blob(k, [[110, 420], [140, 360], [210, 330], [290, 330], [350, 345], [380, 380], [370, 430], [320, 445], [200, 450], [130, 448]]);
  // collo e testa ringhiante in avanti
  A.blob(k, [[320, 350], [350, 300], [385, 280], [420, 286], [455, 305], [470, 330], [455, 345], [420, 350], [395, 380], [360, 400]]);
  A.poly(k, [[440, 325], [478, 330], [470, 350], [440, 350]]);
  A.claw(k, 390, 288, 34, -1.9, 14, -0.15); A.claw(k, 405, 286, 30, -1.3, 12, 0.2);
  // zampe
  A.chain(k, [[340, 420, 26], [350, 490, 17], [356, 548, 12], [374, 556, 9]]);
  A.chain(k, [[300, 430, 22], [296, 495, 15], [292, 552, 11], [310, 558, 8]]);
  A.chain(k, [[150, 420, 30], [120, 480, 18], [140, 545, 12], [158, 552, 9]]);
  A.chain(k, [[190, 430, 24], [196, 490, 15], [210, 548, 11], [226, 554, 8]]);
  // coda
  A.taper(k, [[118, 400], [80, 380], [52, 395], [30, 380]], 22, 4);
  // pelo irto
  const r = A.rng(21);
  for (let i = 0; i < 60; i++) { const t = r(); const x = A.lerp(120, 380, t), y = A.lerp(345, 320, t) + Math.sin(t * 7) * 8; A.claw(k, x, y + 6, 12 + r() * 20, -1.7 - r() * 0.7, 7, 0.3); }
  f.render(c, { bodyTop: '#0b120f', bodyBot: '#020403', texColor: '#2a4a3a', texAlpha: 0.25, rims: [{ col: '#bfffd8', dx: -0.6, dy: 1, w: 3, blur: 1.2 }, { col: '#ff3a2a', dx: 0.9, dy: -0.4, w: 2, blur: 2, a: 0.4 }] });
  // fiato ed occhi di brace
  A.glowEye(c, 432, 312, 4.2, '#ff2a12'); A.glowEye(c, 450, 314, 3.4, '#ff2a12');
  A.glow(c, 470, 340, 40, '#ff4a1a', 0.35, 'lighter');
  A.embers(c, 18, 22, [440, 300, 40, 60], '#ff6a2a', 1.5);
  A.fog(c, 570, 120, '#3c6a52', 0.6, 23);
} };

// ======================= RITUALI =======================

S.candela = { post: { grade: '#a0601a', gradeA: 0.35, bloom: 0.7 }, draw(c) {
  A.sky(c, ['#030203', '#0d0705', '#1c0e06', '#0a0503']);
  // altare di pietra
  c.fillStyle = '#120a06'; c.fillRect(0, 470, W, 150);
  const r = A.rng(31);
  c.fillStyle = '#1a100a'; for (let i = 0; i < 10; i++) c.fillRect(r() * W, 470 + r() * 140, 30 + r() * 80, 2);
  // teschio sullo sfondo
  const f = A.fig(); const k = f.c;
  A.blob(k, [[330, 470], [320, 420], [330, 380], [370, 362], [412, 372], [428, 410], [420, 450], [408, 470]]);
  A.poly(k, [[345, 470], [400, 470], [395, 492], [350, 492]]);
  k.globalCompositeOperation = 'destination-out';
  A.ell(k, 356, 420, 15, 13); A.ell(k, 398, 420, 15, 13); A.poly(k, [[377, 432], [370, 452], [384, 452]]);
  for (let i = 0; i < 5; i++) k.fillRect(352 + i * 9, 472, 5, 12);
  f.render(c, { bodyTop: '#6a4a2a', bodyBot: '#1a0e06', texColor: '#2a1608', texAlpha: 0.5, rims: [{ col: '#ffcf7a', dx: 1, dy: 0.2, w: 3, blur: 1.5 }] });
  // candela
  const cx = 210, top = 250;
  const g = c.createLinearGradient(cx - 40, 0, cx + 40, 0);
  g.addColorStop(0, '#4a3220'); g.addColorStop(0.35, '#f2dcb4'); g.addColorStop(0.6, '#d8b88a'); g.addColorStop(1, '#3a2414');
  c.fillStyle = g; c.fillRect(cx - 38, top, 76, 230);
  // colature di cera
  c.fillStyle = '#f6e6c4';
  A.blob(c, [[cx - 40, top + 6], [cx - 20, top - 6], [cx + 10, top - 4], [cx + 40, top + 4], [cx + 38, top + 24], [cx + 30, top + 18], [cx + 24, top + 60], [cx + 18, top + 22], [cx - 6, top + 14], [cx - 14, top + 90], [cx - 22, top + 18], [cx - 40, top + 30]]);
  c.fillStyle = '#c8a070'; A.ell(c, cx, top + 2, 30, 7);
  // pozza di cera alla base
  c.fillStyle = '#d8bc90'; A.ell(c, cx, 482, 70, 14);
  // stoppino e fiamma
  c.fillStyle = '#1a0a04'; c.fillRect(cx - 2, top - 20, 4, 22);
  A.glow(c, cx, top - 60, 260, '#ff8a2a', 0.55, 'lighter');
  A.glow(c, cx, top - 50, 90, '#ffb84a', 0.8, 'lighter');
  c.save(); c.globalCompositeOperation = 'lighter';
  const fl = (s, col, a) => { c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.moveTo(cx, top - 120 * s - 8); c.bezierCurveTo(cx + 26 * s, top - 70 * s, cx + 22 * s, top - 18, cx, top - 14); c.bezierCurveTo(cx - 22 * s, top - 18, cx - 26 * s, top - 70 * s, cx, top - 120 * s - 8); c.fill(); };
  fl(1, '#ff7a1a', 0.75); fl(0.78, '#ffc05a', 0.9); fl(0.5, '#fff6d8', 1);
  c.fillStyle = '#4a8aff'; c.globalAlpha = 0.7; A.ell(c, cx, top - 22, 6, 8);
  c.restore();
  A.embers(c, 16, 33, [120, 40, 180, 160], '#ffb060', 1.4);
  // fumo
  c.save(); c.globalAlpha = 0.25; c.strokeStyle = '#d8c8b0'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(cx, 120); c.bezierCurveTo(cx - 30, 80, cx + 30, 50, cx - 10, 0); c.stroke(); c.restore();
} };

// ======================= COVI =======================

S.lapide = { post: { grade: '#3a6a8a', gradeA: 0.35 }, draw(c) {
  A.sky(c, ['#030508', '#0a1420', '#132232', '#1a2838']);
  A.stars(c, 90, 41, 260);
  A.moon(c, 120, 110, 40, { col: '#e6ecf0', halo: '#a8d0ff', haloR: 6 });
  A.clouds(c, { seed: 42, col: '#06090f', a: 0.7, y: 40, h: 240 });
  A.cathedral(c, 360, 380, 70, '#070b12', '#ffb040');
  A.fog(c, 380, 110, '#5a7a9a', 0.5, 43);
  A.graves(c, 430, 9, 18, 40, '#060a10', 44);
  A.deadTree(c, 430, 470, 140, -1.75, 18, 45, 7);
  A.fog(c, 450, 90, '#6a8aaa', 0.4, 46);
  c.fillStyle = '#03050a'; A.hills(c, 520, 30, '#03050a', 47);
  // lapide in primo piano
  const f = A.fig(); const k = f.c;
  k.beginPath(); k.moveTo(150, 560); k.lineTo(150, 330); k.arc(240, 330, 90, Math.PI, 0); k.lineTo(330, 560); k.closePath(); k.fill();
  k.fillRect(130, 550, 220, 30);
  f.render(c, { bodyTop: '#4a5462', bodyBot: '#14181e', texColor: '#0a0c10', texAlpha: 0.65, texScale: 6, rims: [{ col: '#cfe4ff', dx: 1, dy: 1, w: 4, blur: 1.5 }] });
  // incisione: croce e R.I.P.
  c.save(); c.fillStyle = 'rgba(8,10,14,.85)';
  c.fillRect(232, 290, 16, 80); c.fillRect(206, 312, 68, 14);
  c.font = '900 36px Cinzel, serif'; c.textAlign = 'center'; c.fillText('R·I·P', 240, 430);
  c.fillStyle = 'rgba(180,200,230,.25)'; c.fillText('R·I·P', 241, 429);
  c.restore();
  // muschio e crepe
  c.save(); c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(290, 300); c.lineTo(276, 340); c.lineTo(288, 372); c.lineTo(270, 420); c.stroke(); c.restore();
  // anime che fuoriescono
  for (let i = 0; i < 3; i++) {
    const x = 190 + i * 55, y = 250 - i * 40;
    c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(3px)'; c.fillStyle = 'rgba(150,220,255,.35)';
    A.taper(c, [[x, 560], [x - 20, 480], [x + 15, 400], [x - 10, y + 30], [x, y]], 4, 38, 8); c.restore();
    A.glow(c, x, y, 50, '#8fe0ff', 0.6, 'lighter');
    A.glowEye(c, x - 7, y - 2, 2.4, '#d8f6ff'); A.glowEye(c, x + 7, y - 2, 2.4, '#d8f6ff');
  }
  // terra smossa
  c.fillStyle = '#05040a'; A.hills(c, 600, 40, '#050408', 48);
  A.fog(c, 590, 80, '#4a6a8a', 0.5, 49);
} };
})(window);
