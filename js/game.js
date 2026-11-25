/* ==== CAFFÈ LUNETTA — logica di gioco ==== */
'use strict';
const GAME = (function () {
const SAVE_KEY = 'caffe-lunetta-v1';
const CATS = Object.keys(DATA.CATS);
const ROOM_OF = { caffe: 'bancone', dolci: 'tavolini', te: 'saletta', pasticceria: 'laboratorio' };
const BASE_RECIPE = { caffe: 'espresso', dolci: 'biscotti', te: 'te_nero', pasticceria: 'cornetto' };
// costi base per categoria (personale e livello crescono con la categoria)
const COST = { caffe: 1, dolci: 8, te: 60, pasticceria: 300 };

let G = null;           // stato salvato
const hooks = {};       // agganci verso la scena (posti a sedere)
const L = {             // stato di sessione (non salvato)
  customers: [], nextId: 1, spawnT: 2, hintT: 25, events: [], time: 0,
};

function fresh() {
  const st = {}, menu = {}, slots = {};
  for (const c of CATS) { st[c] = { lvl: 1, staff: 0, ready: 0, prog: 0 }; menu[c] = []; slots[c] = 2; }
  menu.caffe = ['espresso'];
  const reg = {}; for (const k in DATA.REGULARS) reg[k] = { here: false, v: 0, cap: 0, next: 20 + Math.random() * 30, seen: 0 };
  return {
    v: 1, money: 0, fama: 0, served: 0, lost: 0, earned: 0,
    rooms: { bancone: true }, sups: { latteria: true }, known: { espresso: true },
    menu, slots, st, decor: {}, reg, heard: [], tries: 0, cosm: {},
    lastSave: Date.now(), play: 0, sound: true, tut: 0, waiters: 0, wlvl: 1,
  };
}

// ---------------- derivate ----------------
function famaLevel() { let l = 0; while (l + 1 < DATA.FAMA.length && G.fama >= DATA.FAMA[l + 1]) l++; return l; }
function famaProgress() { const l = famaLevel(); if (l + 1 >= DATA.FAMA.length) return 1; return (G.fama - DATA.FAMA[l]) / (DATA.FAMA[l + 1] - DATA.FAMA[l]); }
function atmosphere() { let a = 0; for (const k in G.decor) if (G.decor[k]) a += DATA.D[k].a; for (const k in G.cosm) if (G.cosm[k] && COSM[k]) a += 0; return a; }
function openCats() { return CATS.filter(c => G.rooms[ROOM_OF[c]] && G.menu[c].length); }
function menuCount() { return CATS.reduce((s, c) => s + (G.rooms[ROOM_OF[c]] ? G.menu[c].length : 0), 0); }
function roomsCount() { return Object.keys(G.rooms).filter(k => G.rooms[k]).length; }
function demand() {
  return 0.2 * (1 + 0.2 * famaLevel()) * (1 + 0.07 * Math.max(0, menuCount() - 1)) * (1 + 0.35 * (roomsCount() - 1)) * (1 + atmosphere() / 250);
}
function priceMult() { return 1 + atmosphere() / 100; }
function speed(c) { return 1 + 0.25 * (G.st[c].lvl - 1); }
function autoRate(c) { return G.st[c].staff * 0.22 * speed(c); }
function bufCap(c) { return 3 + G.st[c].lvl; }
function tapYield(c) { return 1 + Math.floor((G.st[c].lvl - 1) / 5); }
function staffCost(c) { return Math.ceil(12 * COST[c] * Math.pow(1.55, G.st[c].staff)); }
function lvlCost(c) { return Math.ceil(8 * COST[c] * Math.pow(1.32, G.st[c].lvl - 1)); }
function slotCost(c) { return Math.ceil(40 * COST[c] * Math.pow(3, G.slots[c] - 2)); }
const MAX_SLOTS = 6;
function avgPrice(c) { const m = G.menu[c]; if (!m.length) return 0; return m.reduce((s, id) => s + DATA.R[id].p, 0) / m.length; }
function availIngs() { return Object.keys(DATA.INGS).filter(k => G.sups[DATA.INGS[k].sup]); }
function availBases() { return Object.keys(DATA.BASES).filter(b => G.rooms[ROOM_OF[DATA.BASES[b].cat]]); }
function knownCount() { return Object.keys(G.known).length; }

// ---------------- eventi verso l'interfaccia ----------------
function emit(type, data) { L.events.push({ type, data }); }

// ---------------- clienti ----------------
function pickRecipe(c) {
  const m = G.menu[c]; return m[(Math.random() * m.length) | 0];
}
function spawnCustomer(opts) {
  opts = opts || {};
  const cats = openCats(); if (!cats.length) return null;
  let c, rid;
  if (opts.reg) {
    const R = DATA.REGULARS[opts.reg], fav = DATA.R[R.fav];
    const fc = fav && DATA.BASES[fav.b].cat;
    if (fav && G.known[R.fav] && G.rooms[ROOM_OF[fc]]) { c = fc; rid = R.fav; }
    else { c = cats[(Math.random() * cats.length) | 0]; rid = pickRecipe(c); }
  } else {
    // peso per categoria: numero di voci in menu
    const w = cats.map(k => G.menu[k].length + 1), tot = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot; c = cats[0];
    for (let i = 0; i < cats.length; i++) { r -= w[i]; if (r <= 0) { c = cats[i]; break; } }
    rid = pickRecipe(c);
  }
  const queue = L.customers.filter(k => k.cat === c && k.state === 'queue');
  const cu = {
    id: L.nextId++, cat: c, rid, reg: opts.reg || null, state: 'enter', t: 0,
    patience: 28 + atmosphere() * 0.25 + (opts.reg ? 30 : 0), look: opts.reg ? DATA.REGULARS[opts.reg].look : randomLook(),
    x: -20, tx: 0, seat: null, say: null, sayT: 0, full: queue.length >= 5, mode: 'banco',
  };
  // al tavolo se c'è un posto libero (e non sempre: c'è anche chi beve al volo)
  const seat = hooks.seat ? hooks.seat(ROOM_OF[c], 'table') : null;
  if (seat && (Math.random() < 0.62 || cu.full)) { cu.mode = 'tavolo'; cu.seat = seat; cu.full = false; cu.patience = 48 + atmosphere() * 0.3 + (opts.reg ? 30 : 0); }
  L.customers.push(cu);
  emit('spawn', cu);
  return cu;
}
function randomLook() {
  const P = DATA.PASSERS, r = (a) => a[(Math.random() * a.length) | 0];
  return { skin: r(P.skins), hair: r(P.hairs), top: r(P.tops), bot: r(P.bots), style: r(P.styles), glasses: Math.random() < 0.15, hat: Math.random() < 0.08, earring: Math.random() < 0.12, h: 0.92 + Math.random() * 0.16 };
}
function serve(cu) {
  const st = G.st[cu.cat];
  st.ready--;
  const r = DATA.R[cu.rid], pay = r.p * priceMult();
  G.money += pay; G.earned += pay; G.served++;
  const before = famaLevel();
  G.fama += cu.reg ? 2 : 1;
  cu.state = 'served'; cu.t = 0; cu.paid = pay;
  emit('serve', cu);
  if (famaLevel() > before) emit('fama', famaLevel());
  if (cu.reg) visitRegular(cu.reg);
}
function visitRegular(k) {
  const R = DATA.REGULARS[k], s = G.reg[k];
  s.v++;
  if (s.cap < R.cap.length) {
    const cap = R.cap[s.cap];
    const reqOk = !cap.req || G.reg[cap.req[0]].cap >= cap.req[1];
    if (s.v >= cap.v && reqOk) { s.cap++; emit('chapter', { k, i: s.cap - 1 }); if (s.cap === R.cap.length) giveCosmetic(k); }
  }
}
// consegna al tavolo: a mano (tocco) o da un cameriere che ha già prenotato il piatto
const TABLE_BONUS = 1.25;
function reserve(cu) {
  if (cu.state !== 'wait' || cu.reserved) return false;
  const st = G.st[cu.cat]; if (st.ready < 1) return false;
  st.ready--; cu.reserved = true; return true;
}
function deliver(cu, reserved) {
  if (cu.state !== 'wait') return 'no';
  if (!reserved) { if (cu.reserved) return 'busy'; const st = G.st[cu.cat]; if (st.ready < 1) return 'empty'; st.ready--; }
  const r = DATA.R[cu.rid], pay = r.p * priceMult() * TABLE_BONUS;
  G.money += pay; G.earned += pay; G.served++;
  const before = famaLevel();
  G.fama += cu.reg ? 2 : 1;
  cu.byWaiter = !!reserved; cu.state = 'eat'; cu.t = 0; cu.paid = pay; cu.stay = 9 + Math.random() * 10 + (cu.reg ? 10 : 0);
  emit('deliver', cu);
  if (famaLevel() > before) emit('fama', famaLevel());
  if (cu.reg) visitRegular(cu.reg);
  if (G.tut < 3) G.tut = 3;
  return 'ok';
}
function waiterSpeed() { return 70 * (1 + 0.2 * (G.wlvl - 1)); }
function waiterCost() { return Math.ceil(25 * Math.pow(1.8, G.waiters)); }
function wlvlCost() { return Math.ceil(30 * Math.pow(1.5, G.wlvl - 1)); }
function buyWaiter() { const x = waiterCost(); if (!spend(x)) return false; G.waiters++; emit('buy', 'waiter'); return true; }
function buyWlvl() { const x = wlvlCost(); if (!spend(x)) return false; G.wlvl++; emit('buy', 'wlvl'); return true; }

// ricordi cosmetici delle storie (solo estetica, nessun effetto di gioco)
const COSM = { nadia: 'Vasetto di menta di Nadia', ottavio: 'Lettera di Ottavio', leo: 'Disegno di Leo', marta: 'Volantino degli Spifferi', grigio: 'Insegna del Bar Luna' };
function giveCosmetic(k) { G.cosm[k] = true; emit('cosm', k); }

function regularsCheck(dt) {
  for (const k in DATA.REGULARS) {
    const R = DATA.REGULARS[k], s = G.reg[k];
    if (!s.here) {
      const a = R.arr;
      if ((a.fama == null || famaLevel() >= a.fama) && (!a.room || G.rooms[a.room]) && (!a.decor || G.decor[a.decor])) { s.here = true; s.next = 8 + Math.random() * 10; emit('arrive', k); }
      continue;
    }
    if (L.customers.some(c => c.reg === k)) continue;
    s.next -= dt;
    if (s.next <= 0) { s.next = 50 + Math.random() * 50; spawnCustomer({ reg: k }); }
  }
}

// ---------------- indizi ----------------
function hintable() {
  const ings = new Set(availIngs()), bases = new Set(availBases());
  return DATA.RECIPES.filter(r => !G.known[r.id] && r.h && bases.has(r.b) && r.i.every(i => ings.has(i)));
}
function hintTick(dt) {
  L.hintT -= dt; if (L.hintT > 0) return;
  L.hintT = (G.decor.lavagna ? 22 : 34) + Math.random() * 14;
  const H = hintable().filter(r => !G.heard.includes(r.id));
  const pool = H.length ? H : hintable();
  if (!pool.length) return;
  const r = pool[(Math.random() * pool.length) | 0];
  const who = L.customers.filter(c => c.state === 'queue' || c.state === 'sit' || c.state === 'walk');
  if (!who.length) { L.hintT = 4; return; }
  const cu = who[(Math.random() * who.length) | 0];
  cu.say = r.h; cu.sayT = 6; cu.hint = r.id;
  if (!G.heard.includes(r.id)) { G.heard.push(r.id); emit('hint', r.id); }
}

// ---------------- laboratorio ----------------
function experiment(base, ings) {
  ings = [...new Set(ings)].sort();
  const key = ings.join('+');
  const match = DATA.RECIPES.find(r => r.b === base && r.i.slice().sort().join('+') === key);
  G.tries++;
  if (match) {
    if (G.known[match.id]) return { kind: 'known', r: match };
    G.known[match.id] = true; G.fama += 5;
    const c = DATA.BASES[base].cat;
    // la mettiamo subito in menu se c'è posto
    if (G.menu[c].length < G.slots[c]) G.menu[c].push(match.id);
    G.heard = G.heard.filter(h => h !== match.id);
    emit('discover', match.id);
    return { kind: 'new', r: match };
  }
  // vicinanza: ricetta della stessa base con più ingredienti in comune
  let best = null, bs = -1;
  for (const r of DATA.RECIPES) {
    if (r.b !== base || G.known[r.id] && r.i.length === 0) continue;
    const common = r.i.filter(i => ings.includes(i)).length;
    const score = common * 2 - Math.abs(r.i.length - ings.length);
    if (common > 0 && score > bs) { bs = score; best = r; }
  }
  if (best && !G.known[best.id]) {
    const common = best.i.filter(i => ings.includes(i)).length;
    if (common === best.i.length && ings.length > best.i.length) return { kind: 'extra' };
    if (common === ings.length && best.i.length > ings.length) return { kind: 'missing' };
    if (common >= 1) return { kind: 'close' };
  }
  return { kind: 'nothing' };
}

// ---------------- acquisti ----------------
function spend(x) { if (G.money + 1e-9 < x) return false; G.money -= x; return true; }
function buyStaff(c) { const x = staffCost(c); if (!spend(x)) return false; G.st[c].staff++; emit('buy', 'staff'); return true; }
function buyLvl(c) { const x = lvlCost(c); if (!spend(x)) return false; G.st[c].lvl++; emit('buy', 'lvl'); return true; }
function buySlot(c) { if (G.slots[c] >= MAX_SLOTS) return false; const x = slotCost(c); if (!spend(x)) return false; G.slots[c]++; emit('buy', 'slot'); return true; }
function buyRoom(id) {
  const R = DATA.ROOMS.find(r => r.id === id); if (G.rooms[id] || famaLevel() < R.fama || !spend(R.cost)) return false;
  G.rooms[id] = true;
  const c = CATS.find(k => ROOM_OF[k] === id);
  if (c) { const b = BASE_RECIPE[c]; G.known[b] = true; if (!G.menu[c].includes(b)) G.menu[c].push(b); }
  emit('room', id); return true;
}
function buySup(id) { const S = DATA.SUPS[id]; if (G.sups[id] || famaLevel() < S.fama || !spend(S.cost)) return false; G.sups[id] = true; emit('sup', id); return true; }
function buyDecor(id) { const D = DATA.D[id]; if (G.decor[id] || (D.req && !G.rooms[D.req]) || !spend(D.cost)) return false; G.decor[id] = true; emit('decor', id); return true; }
function toggleMenu(id) {
  const r = DATA.R[id], c = DATA.BASES[r.b].cat, m = G.menu[c], i = m.indexOf(id);
  if (i >= 0) { if (m.length <= 1) return 'last'; m.splice(i, 1); return 'out'; }
  if (m.length >= G.slots[c]) return 'full';
  m.push(id); return 'in';
}

// ---------------- tocco su postazione ----------------
function tap(c) {
  if (!G.rooms[ROOM_OF[c]]) return 0;
  const st = G.st[c], cap = bufCap(c);
  const y = tapYield(c);
  const waiting = L.customers.filter(k => k.cat === c && k.state === 'queue').length;
  if (st.ready >= cap && !waiting) { emit('full', c); return 0; }
  st.ready = Math.min(cap + waiting, st.ready + y);
  emit('tap', c);
  if (G.tut < 2 && c === 'caffe') G.tut = Math.max(G.tut, 1);
  return y;
}

// ---------------- simulazione ----------------
function tick(dt) {
  L.time += dt; G.play += dt;
  // produzione automatica
  for (const c of CATS) {
    if (!G.rooms[ROOM_OF[c]]) continue;
    const st = G.st[c], r = autoRate(c);
    if (r > 0 && st.ready < bufCap(c)) { st.prog += r * dt; while (st.prog >= 1 && st.ready < bufCap(c)) { st.prog -= 1; st.ready++; } if (st.ready >= bufCap(c)) st.prog = 0; }
  }
  // arrivi
  L.spawnT -= dt;
  if (L.spawnT <= 0) {
    const d = demand();
    L.spawnT = -Math.log(1 - Math.random()) / d;
    if (L.customers.length < 22) spawnCustomer();
  }
  regularsCheck(dt);
  hintTick(dt);
  // servizio: in ordine di arrivo per postazione
  for (const c of CATS) {
    const q = L.customers.filter(k => k.cat === c && k.state === 'queue').sort((a, b) => a.id - b.id);
    for (const cu of q) { if (G.st[c].ready >= 1) serve(cu); else break; }
  }
  // pazienza
  for (const cu of L.customers) {
    cu.t += dt; if (cu.sayT > 0) { cu.sayT -= dt; if (cu.sayT <= 0) cu.say = null; }
    if (cu.state === 'queue' || (cu.state === 'wait' && !cu.reserved)) { cu.patience -= dt; if (cu.patience <= 0) { cu.state = 'leave'; cu.t = 0; cu.sad = true; G.lost++; emit('lost', cu); } }
  }
}

// ---------------- salvataggio ----------------
function save() { try { G.lastSave = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {} }
function load() {
  let s = null; try { s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { s = null; }
  G = fresh();
  if (s && s.v === 1) {
    // fusione prudente con i default (per salvataggi vecchi)
    for (const k in s) if (k in G) G[k] = s[k];
    for (const c of CATS) { G.st[c] = Object.assign({ lvl: 1, staff: 0, ready: 0, prog: 0 }, G.st[c] || {}); if (!G.menu[c]) G.menu[c] = []; if (!G.slots[c]) G.slots[c] = 2; }
    for (const k in DATA.REGULARS) G.reg[k] = Object.assign({ here: false, v: 0, cap: 0, next: 30, seen: 0 }, G.reg[k] || {});
    return offline();
  }
  return null;
}
// guadagni mentre il gioco era chiuso (solo la produzione automatica, al 70%)
function offline() {
  const dt = Math.min(8 * 3600, Math.max(0, (Date.now() - (G.lastSave || Date.now())) / 1000));
  if (dt < 60) return null;
  const d = demand(), cats = openCats(); if (!cats.length) return null;
  const tot = cats.reduce((s, c) => s + G.menu[c].length + 1, 0);
  let money = 0, served = 0;
  for (const c of cats) {
    const dc = d * (G.menu[c].length + 1) / tot, n = Math.min(dc, autoRate(c)) * dt * 0.7;
    served += n; money += n * avgPrice(c) * priceMult();
  }
  served = Math.floor(served);
  G.money += money; G.earned += money; G.served += served; G.fama += Math.floor(served * 0.5);
  return { dt, money, served };
}
function reset() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} G = fresh(); L.customers = []; }

return {
  get G() { return G; }, L, CATS, ROOM_OF, COSM, MAX_SLOTS,
  famaLevel, famaProgress, atmosphere, demand, priceMult, autoRate, bufCap, tapYield, speed,
  staffCost, lvlCost, slotCost, avgPrice, availIngs, availBases, knownCount, hintable, openCats,
  experiment, offline, reserve, deliver, waiterSpeed, waiterCost, wlvlCost, buyWaiter, buyWlvl, hooks, TABLE_BONUS, buyStaff, buyLvl, buySlot, buyRoom, buySup, buyDecor, toggleMenu, tap, tick, save, load, reset, fresh,
  setG(x) { G = x; },
};
})();
