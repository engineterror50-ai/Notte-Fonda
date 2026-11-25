/* banco di prova scultore */
(function (G) {
const A = G.NFArt; const S = A.SCENES;
S.lupo = { post: { bloom: 0.25, grain: 0.06, paper: 0, vignette: 0.6 }, draw(c) {
  const s = A.sculpt(); const cx = 240;
  // parete di fondo: colonne a costole, vertebre, bande
  s.noise(2, 10, 3);
  for (let i = 0; i < 4; i++) s.tube([[14 + i * 22, -10], [10 + i * 24, 300], [16 + i * 22, 630]], 9, 9, 6, { rib: 6, ribD: 0.25 });
  s.vertebrae([[112, -10], [108, 300], [112, 630]], 16, 16, 10);
  for (let y = 40; y < 616; y += 120) s.tube([[0, y], [60, y + 6], [130, y]], 6, 6, 18, { rib: 5, ribD: 0.3 });
  // nicchia ogivale
  const arch = (r, y0) => { const p = []; for (let a = 0; a <= 1; a += 0.05) p.push([cx - r + r * (1 - Math.cos(a * Math.PI / 2)) * 0.0 - r * 0 + (cx - r - (cx - r)) , 0]); return p; };
  const ogive = (hw, top, bot) => { const p = [[cx - hw, bot]]; for (let t = 0; t <= 1.0001; t += 0.05) { const a = t * Math.PI / 2; p.push([cx - hw + hw * (1 - Math.cos(a)) , top + (1 - Math.sin(a)) * hw * 1.3 - 0]); } return p.concat(p.slice(1, -1).reverse().map(([x, y]) => [2 * cx - x, y])).concat([[cx + hw, bot]]); };
  s.plate(ogive(118, 20, 640), 14, 10, { bz: 8 });
  s.plate(ogive(100, 44, 640), 2, 8, { mode: 'set', bz: 4 });
  // aureola lunare: anelli a costole dietro la testa
  s.ring(cx, 180, 92, 92, 9, 18, { rib: 64, ribD: 0.3 });
  s.ring(cx, 180, 74, 74, 5, 16, { rib: 48, ribD: 0.3 });
  s.dome(cx, 180, 68, 68, 2, { rz: 10, pow: 1.5 });
  // criniera di cavi
  for (let k = 0; k < 5; k++) s.tube([[cx - 30, 140 + k * 8], [cx - 90 - k * 6, 170 + k * 20], [cx - 110 - k * 4, 300 + k * 30], [cx - 96 + k * 4, 420 + k * 26]], 7 - k * 0.6, 4, 26 + k * 2, { rib: 4, ribD: 0.3 });
  // spalle e torace
  s.dome(cx - 82, 372, 52, 40, 22, { rz: 34 });
  s.vertebrae([[cx, 340], [cx, 560]], 18, 14, 30, { wings: false });
  for (let i = 0; i < 7; i++) { const y = 380 + i * 24; s.tube([[cx - 6, y], [cx - 52 + i * 3, y - 8], [cx - 82 + i * 5, y + 18], [cx - 76 + i * 6, y + 44]], 8 - i * 0.6, 4, 40, { rib: 5, ribD: 0.2, k: 4 }); }
  // braccia: tubi con gomito e artigli
  s.tube([[cx - 112, 392], [cx - 140, 462], [cx - 118, 540]], 22, 14, 30, { rib: 7, ribD: 0.2 });
  s.dome(cx - 140, 462, 20, 20, 44, { rz: 16 });
  for (let k = 0; k < 4; k++) s.spike(cx - 126 + k * 10, 540, 52 - k * 4, 1.25 + k * 0.12, 9, 46, { bend: -0.25 });
  // testa di lupo frontale: cranio stretto, muso lungo, sguardo inclinato
  s.dome(cx, 146, 44, 50, 34, { rz: 38, k: 6 });
  s.capsule(cx - 6, 104, 6, cx - 6, 190, 6, 66, { k: 3 });                       // cresta sagittale
  s.spike(cx - 34, 128, 104, -2.0, 38, 38, { bend: 0.15, k: 6 });            // orecchio
  s.hole(cx - 52, 92, 9, 26, 10, { rot: -0.45, alb: 0.3 });
  s.capsule(cx - 50, 170, 11, cx - 10, 200, 8, 70, { k: 6 });                   // arcata sopraccigliare (corruga)
  s.dome(cx - 44, 230, 20, 26, 40, { rz: 20, k: 8, rot: 0.3 });                 // zigomo
  s.capsule(cx - 14, 196, 16, cx - 9, 300, 11, 62, { z2: 88, k: 8 });           // muso (metà)
  s.capsule(cx, 196, 12, cx, 300, 9, 70, { z2: 96, k: 6 });
  for (let k = 0; k < 6; k++) s.capsule(cx - 22, 214 + k * 9, 2.4, cx, 210 + k * 9, 2.4, 72 + k * 4, { mode: 'max', k: 2 }); // grinze del ringhio
  s.dome(cx, 300, 16, 12, 98, { rz: 10, k: 4 });                                // naso
  s.hole(cx - 6, 302, 4, 3, 8);
  s.hole(cx - 30, 204, 16, 6, 18, { rot: 0.55 });                               // orbita inclinata
  // fauci aperte
  s.hole(cx, 342, 30, 30, 50, { alb: 0.0 });
  s.capsule(cx - 30, 340, 10, cx - 6, 380, 11, 58, { k: 4 });                   // mandibola
  for (let k = 0; k < 3; k++) s.spike(cx - 24 + k * 9, 312, 42 - k * 12, Math.PI / 2 - 0.05, 8, 92, { bend: 0.08 });
  for (let k = 0; k < 2; k++) s.spike(cx - 20 + k * 11, 374, 26 - k * 6, -Math.PI / 2 + 0.12, 7, 74, {});
  s.noise(0.6, 4, 9);
  s.mirror(cx);
  // tubi bassi asimmetrici
  s.tube([[-10, 590], [140, 560], [260, 600], [490, 570]], 10, 10, 40, { rib: 6, ribD: 0.3 });
  const img = s.render({ ramp: 'freddo', bump: 1.1, ks: 0.8, shin: 40, depth: 0.75 });
  c.drawImage(img, 0, 0);
},
accent(c) {
  A.glowEye(c, 212, 206, 2.6, '#ffb02a'); A.glowEye(c, 268, 206, 2.6, '#ffb02a');
  A.glow(c, 240, 340, 26, '#ff2a10', 0.25, 'lighter');
} };
S.dama = { post: { bloom: 0.35, grain: 0.06, paper: 0, vignette: 0.6 }, draw(c) {
  const s = A.sculpt(); const cx = 240;
  s.noise(1.5, 9, 21);
  // pannelli laterali: canne d'organo a costole e teschi impilati
  for (let i = 0; i < 3; i++) s.tube([[22 + i * 26, 640], [22 + i * 26, -20]], 10, 10, 8, { rib: 7, ribD: 0.28 });
  for (let k = 0; k < 6; k++) s.skull(42, 40 + k * 108, 22, 16, { elong: 1.4 });
  s.plate([[96, -10], [128, -10], [128, 640], [96, 640]], 10, 6);
  // corona di teschi sopra la testa
  s.skull(cx, 50, 30, 30, { elong: 1.2 }); s.skull(cx - 52, 74, 20, 24); s.skull(cx - 90, 108, 15, 18);
  s.vertebrae([[cx, 92], [cx, 132]], 16, 18, 34, { wings: false });
  // velo/capelli: fasci di cavi che scendono dal capo
  for (let k = 0; k < 4; k++) s.cables([[cx - 40 - k * 6, 130], [cx - 100 - k * 12, 210], [cx - 118 - k * 10, 380], [cx - 90 - k * 16, 640]], 3, 7, 3.4, 30 + k * 3, { rib: 3.5, ribD: 0.3 });
  // volto sereno
  s.face(cx, 232, 74, 40);
  // collo e gorgiera di costole che si aprono come un colletto
  s.capsule(cx, 320, 26, cx, 430, 30, 40, { rib: 10, ribD: 0.08, k: 10 });
  for (let k = 0; k < 6; k++) s.tube([[cx, 400 + k * 20], [cx - 50, 392 + k * 22], [cx - 110 + k * 6, 410 + k * 26], [cx - 130 + k * 8, 450 + k * 28]], 9 - k * 0.6, 5, 52 - k * 2, { rib: 5, ribD: 0.25, k: 3 });
  // abito: spine come lacrime di pietra
  for (let k = 0; k < 5; k++) s.spike(cx - 96 + k * 20, 560, 90, Math.PI / 2 + 0.05, 16, 40, { bend: 0.05 });
  s.mirror(cx);
  s.noise(0.5, 3, 22);
  c.drawImage(s.render({ ramp: 'ossa', bump: 0.8, ks: 0.8, shin: 40, depth: 0.75, amb: 0.08, kd: 0.85, light: [-0.4, -0.7, 0.9] }), 0, 0);
},
accent(c) {
  A.glow(c, 240, 230, 200, '#cfe4ff', 0.25, 'lighter');
  
} };
})(window);
