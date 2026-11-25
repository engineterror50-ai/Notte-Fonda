/* ==== CAFFÈ LUNETTA — interfaccia e ciclo principale ==== */
'use strict';
const UI = (function () {
const $ = (s) => document.querySelector(s);
const fmt0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
const fmt2 = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function money(x) { return (x < 100 ? fmt2.format(x) : fmt0.format(x)) + ' €'; }
let tab = 'locale', panelKey = '', lastPanel = 0;

// ---------------- avvio ----------------
function boot() {
  TITLE.init($('#titlecv')); TITLE.start();
  window.addEventListener('resize', () => { TITLE.resize(); layout(); });
  const P = new URLSearchParams(location.search);
  const off = GAME.load();
  if (P.has('demo')) demo();
  $('#bPlay').onclick = () => startGame(off);
  $('#bNew').onclick = () => { if (GAME.G.served && !confirm('Ricominciare da capo? Il caffè attuale andrà perso.')) return; GAME.reset(); startGame(null); };
  $('#bOpt').onclick = () => toast('⚙️', 'Opzioni', 'Arrivano a breve.');
  if (P.has('play')) startGame(off);
}
function startGame(off) {
  TITLE.stop(); $('#title').classList.add('hidden'); $('#app').classList.remove('hidden');
  SCENE.init($('#scene')); layout(); SCENE.buildSeats();
  SCENE.onHit = (h) => {
    if (h.kind === 'station') { if (GAME.tap(h.cat)) SCENE.onTap(h.cat); }
    else if (h.kind === 'table') { const r = GAME.deliver(h.cu); if (r === 'empty') SCENE.noReady(h.cu.cat); }
    else if (h.kind === 'locked') setTab('shop'); else if (h.kind === 'regular') setTab('diario');
  };
  document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => setTab(b.dataset.t));
  setTab('locale');
  if (off) toast('🌙', 'Bentornata!', 'Mentre eri via il caffè ha servito ' + fmt0.format(off.served) + ' clienti: +' + money(off.money));
  let last = performance.now(), saveT = 0;
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    GAME.tick(dt); events(); SCENE.frame(dt); top();
    lastPanel += dt; if (lastPanel > 0.25) { lastPanel = 0; renderPanel(); }
    saveT += dt; if (saveT > 10) { saveT = 0; GAME.save(); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) GAME.save(); });
}
function layout() {
  const w = $('#scenewrap'); if (!w || $('#app').classList.contains('hidden')) return;
  SCENE.resize(w.clientWidth, w.clientHeight, Math.min(2, window.devicePixelRatio || 1));
}

// ---------------- eventi di gioco ----------------
function events() {
  const E = GAME.L.events; GAME.L.events = [];
  for (const e of E) {
    if (e.type === 'serve') SCENE.onServe(e.data);
    else if (e.type === 'deliver') SCENE.onDeliver(e.data, !e.data.byWaiter);
    else if (e.type === 'fama') toast('⭐', 'Il caffè cresce', 'Ora siete «' + DATA.FAMA_NAMES[e.data] + '»');
    else if (e.type === 'arrive') toast('👋', 'Un nuovo cliente abituale', DATA.REGULARS[e.data].n + ' ha cominciato a passare di qui.');
    else if (e.type === 'chapter') { const R = DATA.REGULARS[e.data.k]; toast('📔', 'Nuova pagina nel Taccuino', R.n + ' — ' + R.cap[e.data.i].t); }
    else if (e.type === 'room') { SCENE.buildSeats(); SCENE.focus(e.data); panelKey = ''; }
    else if (e.type === 'decor' || e.type === 'sup' || e.type === 'discover') panelKey = '';
  }
}

// ---------------- barra in alto ----------------
function top() {
  const G = GAME.G;
  $('#money').textContent = money(G.money);
  const l = GAME.famaLevel();
  $('#famaName').innerHTML = 'Fama: <i>' + DATA.FAMA_NAMES[l] + '</i>';
  $('#famaBar').style.width = (GAME.famaProgress() * 100).toFixed(1) + '%';
  $('#atm').textContent = '+' + GAME.atmosphere() + '%';
}

// ---------------- pannelli ----------------
function setTab(t) { tab = t; panelKey = ''; document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); renderPanel(); $('#panel').scrollTop = 0; }
function renderPanel() {
  const p = $('#panel');
  if (tab === 'locale') return locale(p);
  if (panelKey !== tab) { panelKey = tab; p.innerHTML = '<h3 class="sec">In arrivo</h3><div class="card">Questa sezione la vediamo nel prossimo passaggio.</div>'; }
}
function locale(p) {
  const G = GAME.G;
  const cats = GAME.CATS.filter(c => G.rooms[GAME.ROOM_OF[c]]);
  const key = 'locale:' + cats.join(',');
  if (panelKey !== key) {
    panelKey = key;
    p.innerHTML = '<div class="demand"><span id="dDem"></span><span id="dInc"></span></div>' + `<div class="card" id="sala">
        <div class="st-head"><div class="st-ico">🍽️</div><div><h4>Servizio ai tavoli</h4><p data-f="info"></p></div></div>
        <div class="chips" data-f="chips"></div>
        <div class="row2">
          <button class="buy" data-a="waiter"><b>Assumi cameriere</b><small>serve i tavoli da solo</small><span class="pr" data-f="wP"></span></button>
          <button class="buy" data-a="wlvl"><b>Scarpe comode</b><small>camerieri più veloci</small><span class="pr" data-f="lP"></span></button>
        </div></div>` + cats.map(c => {
      const C = DATA.CATS[c];
      return `<div class="card" data-c="${c}">
        <div class="st-head"><div class="st-ico">${C.icon}</div><div><h4>${C.st}</h4><p data-f="info"></p></div><button class="tapbtn" data-a="tap">Prepara</button></div>
        <div class="chips" data-f="chips"></div>
        <div class="row2">
          <button class="buy" data-a="staff"><b>Assumi aiutante</b><small data-f="staffI"></small><span class="pr" data-f="staffP"></span></button>
          <button class="buy" data-a="lvl"><b>Migliora postazione</b><small data-f="lvlI"></small><span class="pr" data-f="lvlP"></span></button>
        </div></div>`;
    }).join('');
    $('#sala [data-a=waiter]').onclick = () => GAME.buyWaiter();
    $('#sala [data-a=wlvl]').onclick = () => GAME.buyWlvl();
    p.querySelectorAll('.card[data-c]').forEach(card => {
      const c = card.dataset.c;
      card.querySelector('[data-a=tap]').onclick = () => { if (GAME.tap(c)) SCENE.onTap(c); };
      card.querySelector('[data-a=staff]').onclick = () => GAME.buyStaff(c);
      card.querySelector('[data-a=lvl]').onclick = () => GAME.buyLvl(c);
    });
  }
  const per = GAME.demand() * 60;
  $('#dDem').textContent = '👥 ~' + per.toFixed(0) + ' clienti al minuto';
  $('#dInc').textContent = '🍽️ ' + GAME.openCats().reduce((s, c) => s + G.menu[c].length, 0) + ' voci in menu';
  {
    const sala = $('#sala'), waiting = GAME.L.customers.filter(k => k.state === 'wait').length;
    sala.querySelector('[data-f=info]').textContent = waiting ? waiting + ' ' + (waiting === 1 ? 'tavolo aspetta' : 'tavoli aspettano') + ' l\'ordinazione' : 'Tutti serviti, per ora';
    sala.querySelector('[data-f=chips]').innerHTML = `<span class="chip">👆 tocca un cliente seduto per servirlo</span><span class="chip">💶 +25% al tavolo</span><span class="chip">🧑‍🍳 ${G.waiters} camerieri</span>`;
    const wc = GAME.waiterCost(), lc = GAME.wlvlCost(), wb = sala.querySelector('[data-a=waiter]'), lb = sala.querySelector('[data-a=wlvl]');
    sala.querySelector('[data-f=wP]').textContent = money(wc); sala.querySelector('[data-f=lP]').textContent = money(lc);
    wb.disabled = G.money < wc; wb.classList.toggle('can', G.money >= wc); lb.disabled = G.money < lc || !G.waiters; lb.classList.toggle('can', G.money >= lc && G.waiters > 0);
  }
  p.querySelectorAll('.card[data-c]').forEach(card => {
    const c = card.dataset.c, st = G.st[c];
    const q = GAME.L.customers.filter(k => k.cat === c && k.state === 'queue').length;
    card.querySelector('[data-f=info]').textContent = 'Pronte ' + Math.floor(st.ready) + '/' + GAME.bufCap(c) + ' · in fila ' + q;
    card.querySelector('[data-f=chips]').innerHTML = `<span class="chip">⚙️ ${GAME.autoRate(c).toFixed(2)}/s automatico</span><span class="chip">👐 +${GAME.tapYield(c)} a tocco</span><span class="chip">🧑‍🍳 ${st.staff} aiutanti</span><span class="chip">⭐ livello ${st.lvl}</span>`;
    const sc = GAME.staffCost(c), lc = GAME.lvlCost(c);
    const sb = card.querySelector('[data-a=staff]'), lb = card.querySelector('[data-a=lvl]');
    card.querySelector('[data-f=staffI]').textContent = '+' + (0.22 * GAME.speed(c)).toFixed(2) + '/s automatico';
    card.querySelector('[data-f=staffP]').textContent = money(sc);
    card.querySelector('[data-f=lvlI]').textContent = 'più veloce, più capiente';
    card.querySelector('[data-f=lvlP]').textContent = money(lc);
    sb.disabled = G.money < sc; sb.classList.toggle('can', G.money >= sc);
    lb.disabled = G.money < lc; lb.classList.toggle('can', G.money >= lc);
  });
}

// ---------------- notifiche ----------------
function toast(e, title, text) {
  const box = $('#toasts'), d = document.createElement('div'); d.className = 'toast';
  d.innerHTML = `<span class="e">${e}</span><div>${title}<small>${text}</small></div>`;
  box.appendChild(d); while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { d.style.transition = 'opacity .4s'; d.style.opacity = 0; setTimeout(() => d.remove(), 400); }, 4200);
}

// ---------------- partita dimostrativa (per vedere la grafica) ----------------
function demo() {
  const G = GAME.fresh();
  Object.assign(G, { money: 2480, fama: 520, served: 640 });
  G.rooms = { bancone: true, tavolini: true, saletta: true };
  G.sups = { latteria: true, drogheria: true, mercato: true };
  ['espresso', 'cappuccino', 'marocchino', 'biscotti', 'crostata', 'te_nero', 'te_latte', 'te_menta'].forEach(k => G.known[k] = true);
  G.menu = { caffe: ['espresso', 'cappuccino', 'marocchino'], dolci: ['biscotti', 'crostata'], te: ['te_nero', 'te_latte', 'te_menta'], pasticceria: [] };
  G.slots = { caffe: 3, dolci: 2, te: 3, pasticceria: 2 };
  G.st.caffe = { lvl: 6, staff: 2, ready: 4, prog: 0.4 }; G.st.dolci = { lvl: 3, staff: 1, ready: 5, prog: 0.2 }; G.st.te = { lvl: 2, staff: 1, ready: 2, prog: 0.7 };
  G.decor = { monstera: true, lavagna: true, lucine: true, tende: true, giradischi: true, quadri: true, tappeto: true, libreria: true, pendolo: true, cuccia: true };
  G.tut = 2; G.waiters = 1; GAME.setG(G);
  for (const k of ['nadia', 'ottavio', 'leo', 'marta']) { G.reg[k].here = true; G.reg[k].v = 5; G.reg[k].cap = 2; }
  // qualche cliente già in sala
  for (let i = 0; i < 9; i++) { GAME.tick(0.01); GAME.L.spawnT = 0; }
}

return { boot, money, toast, setTab };
})();
window.addEventListener('DOMContentLoaded', UI.boot);
