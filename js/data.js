/* ==== CAFFÈ LUNETTA — dati di gioco ==== */
'use strict';
const DATA = {};

// ---------- categorie e postazioni ----------
// ogni categoria ha una postazione che prepara le ordinazioni
DATA.CATS = {
  caffe: { n: 'Caffè', st: 'Macchina espresso', icon: '☕', base: 'espresso', room: 'bancone', col: '#7a4a2e' },
  dolci: { n: 'Dolci', st: 'Vetrina', icon: '🍪', base: 'frolla', room: 'tavolini', col: '#c98a4b' },
  te:    { n: 'Tè e infusi', st: 'Bollitore', icon: '🫖', base: 'te', room: 'saletta', col: '#6f8a4e' },
  pasticceria: { n: 'Pasticceria', st: 'Forno', icon: '🥐', base: 'lievitata', room: 'laboratorio', col: '#d0a04a' },
};

// ---------- basi e ingredienti ----------
DATA.BASES = {
  espresso: { n: 'Espresso', icon: '☕', cat: 'caffe' },
  frolla: { n: 'Pasta frolla', icon: '🍪', cat: 'dolci' },
  te: { n: 'Tè nero', icon: '🍵', cat: 'te' },
  lievitata: { n: 'Pasta lievitata', icon: '🥐', cat: 'pasticceria' },
};
DATA.INGS = {
  latte: { n: 'Latte', icon: '🥛', sup: 'latteria' },
  panna: { n: 'Panna', icon: '🍦', sup: 'latteria' },
  cacao: { n: 'Cacao', icon: '🍫', sup: 'drogheria' },
  zucchero: { n: 'Zucchero di canna', icon: '🧂', sup: 'drogheria' },
  vaniglia: { n: 'Vaniglia', icon: '🌼', sup: 'drogheria' },
  limone: { n: 'Limone', icon: '🍋', sup: 'mercato' },
  arancia: { n: 'Arancia', icon: '🍊', sup: 'mercato' },
  menta: { n: 'Menta', icon: '🌿', sup: 'mercato' },
  zenzero: { n: 'Zenzero', icon: '🫚', sup: 'mercato' },
  cannella: { n: 'Cannella', icon: '🪵', sup: 'spezie' },
  cardamomo: { n: 'Cardamomo', icon: '🌰', sup: 'spezie' },
  miele: { n: 'Miele', icon: '🍯', sup: 'apicoltore' },
  uova: { n: 'Uova', icon: '🥚', sup: 'fattoria' },
  nocciola: { n: 'Nocciola', icon: '🌰', sup: 'nocciole' },
  ghiaccio: { n: 'Ghiaccio', icon: '🧊', sup: 'ghiacciaia' },
};
// fornitori: si sbloccano una volta e rendono disponibili gli ingredienti in Laboratorio
DATA.SUPS = {
  latteria:   { n: 'Latteria Bianchi', d: 'Latte fresco e panna, consegnati all\'alba.', cost: 0, fama: 0 },
  drogheria:  { n: 'Drogheria Fumagalli', d: 'Cacao, zucchero di canna e bacche di vaniglia.', cost: 30, fama: 1 },
  mercato:    { n: 'Banco del mercato', d: 'Agrumi, menta e zenzero dal mercato rionale.', cost: 120, fama: 2 },
  spezie:     { n: 'Bottega delle spezie', d: 'Cannella e cardamomo da un negozietto vicino al porto.', cost: 450, fama: 3 },
  apicoltore: { n: 'Apicoltore Fiore', d: 'Miele di castagno e di acacia, dalle colline.', cost: 1400, fama: 5 },
  fattoria:   { n: 'Fattoria Le Querce', d: 'Uova di galline che razzolano libere.', cost: 3500, fama: 6 },
  nocciole:   { n: 'Nocciole delle Langhe', d: 'Nocciole tostate, arrivano in sacchi di juta.', cost: 7000, fama: 7 },
  ghiacciaia: { n: 'La Ghiacciaia', d: 'Ghiaccio limpido in blocchi, per le bevande fredde.', cost: 15000, fama: 8 },
};

// ---------- ricette ----------
// base + ingredienti (insieme). p = prezzo, h = indizio sentito dai clienti
DATA.RECIPES = [
  // caffè
  { id: 'espresso', n: 'Espresso', b: 'espresso', i: [], p: 1.0, d: 'Corto, denso, con la crema color nocciola. Si beve in piedi.', h: '' },
  { id: 'cappuccino', n: 'Cappuccino', b: 'espresso', i: ['latte'], p: 1.6, d: 'Espresso e latte montato, schiuma alta e morbida.', h: 'Un caffè, ma morbido… con qualcosa di bianco e caldo.' },
  { id: 'marocchino', n: 'Marocchino', b: 'espresso', i: ['latte', 'cacao'], p: 2.0, d: 'Nel bicchierino di vetro: cacao, espresso, schiuma.', h: 'Un caffè col latte e una nuvola di cioccolato, nel bicchierino.' },
  { id: 'viennese', n: 'Caffè viennese', b: 'espresso', i: ['panna'], p: 2.2, d: 'Espresso sotto un cappello di panna montata.', h: 'Un caffè con la panna sopra, come in quei caffè con gli specchi.' },
  { id: 'mocaccino', n: 'Mocaccino alla cannella', b: 'espresso', i: ['cacao', 'cannella'], p: 2.6, d: 'Cioccolato e caffè con un filo di cannella.', h: 'Cioccolato, caffè e una spezia che sa di legno dolce…' },
  { id: 'natale', n: 'Caffè di Natale', b: 'espresso', i: ['arancia', 'cannella'], p: 2.8, d: 'Scorza d\'arancia e cannella: sa di dicembre tutto l\'anno.', h: 'Vorrei qualcosa di caldo che sappia d\'arancia e di Natale…' },
  { id: 'amalfi', n: 'Espresso al limone', b: 'espresso', i: ['limone'], p: 1.8, d: 'Con una scorza di limone, come lo bevono sulla costiera.', h: 'Mia nonna di Amalfi ci metteva una scorza gialla nel caffè.' },
  { id: 'cardamomo', n: 'Caffè al cardamomo', b: 'espresso', i: ['cardamomo'], p: 2.4, d: 'Profumato e un po\' lontano, come un viaggio.', h: 'Ho bevuto un caffè speziato in un viaggio, non ricordo la spezia… era verde, profumatissima.' },
  { id: 'nocciolino', n: 'Caffè alla nocciola', b: 'espresso', i: ['nocciola', 'panna'], p: 3.0, d: 'Crema di nocciola e panna, la specialità della casa.', h: 'Un caffè cremoso con la nocciola e la panna, tipo quello di Napoli…' },
  { id: 'shakerato', n: 'Caffè shakerato', b: 'espresso', i: ['ghiaccio', 'zucchero'], p: 3.2, d: 'Shakerato con ghiaccio e zucchero, servito nella coppa.', h: 'Fa un caldo… un caffè freddo, shakerato, dolce!' },
  // dolci
  { id: 'biscotti', n: 'Biscotti di frolla', b: 'frolla', i: [], p: 1.2, d: 'Friabili, al burro, a forma di mezzaluna.', h: '' },
  { id: 'crostata', n: 'Crostata all\'arancia', b: 'frolla', i: ['arancia'], p: 2.4, d: 'Marmellata d\'arancia amara sotto la griglia di frolla.', h: 'Una fetta di crostata… con la marmellata d\'agrumi, quella amarognola.' },
  { id: 'limone_t', n: 'Tartelletta al limone', b: 'frolla', i: ['limone', 'uova'], p: 2.8, d: 'Crema al limone e uova in un guscio di frolla.', h: 'Un dolcetto giallo, aspro e cremoso… con le uova e il limone.' },
  { id: 'baci', n: 'Baci di dama', b: 'frolla', i: ['nocciola', 'cacao'], p: 2.6, d: 'Due cupolette di nocciola unite da un bacio di cioccolato.', h: 'Quei biscottini a coppie, nocciola e cioccolato in mezzo…' },
  { id: 'speziati', n: 'Biscotti cannella e miele', b: 'frolla', i: ['cannella', 'miele'], p: 2.0, d: 'Speziati e lucidi di miele, si sciolgono nel tè.', h: 'Biscotti alle spezie col miele, da inzuppare.' },
  { id: 'zenzerini', n: 'Omini di zenzero', b: 'frolla', i: ['zenzero', 'miele'], p: 2.2, d: 'Piccanti e dolci, con i bottoni di glassa.', h: 'Mia figlia vuole gli omini… quelli piccanti col miele!' },
  // tè
  { id: 'te_nero', n: 'Tè nero', b: 'te', i: [], p: 1.4, d: 'Ceylon in foglia, servito nella teiera di ghisa.', h: '' },
  { id: 'te_latte', n: 'Tè al latte', b: 'te', i: ['latte'], p: 1.8, d: 'All\'inglese, con una nuvola di latte.', h: 'Un tè come lo fanno a Londra, con quel goccio di bianco.' },
  { id: 'te_menta', n: 'Tè alla menta', b: 'te', i: ['menta', 'zucchero'], p: 2.0, d: 'Dolcissimo, versato dall\'alto, con le foglie fresche.', h: 'Un tè verde di foglie fresche, dolce dolce, versato dall\'alto…' },
  { id: 'limone_miele', n: 'Tè limone e miele', b: 'te', i: ['limone', 'miele'], p: 2.2, d: 'Per la gola, per la pioggia, per tutto.', h: 'Ho la gola che graffia: un tè con quelle due cose che fa la nonna?' },
  { id: 'chai', n: 'Chai', b: 'te', i: ['latte', 'cannella', 'cardamomo'], p: 3.0, d: 'Tè speziato bollito nel latte, alla maniera indiana.', h: 'Un tè col latte e tante spezie, come a Bombay… almeno due spezie.' },
  { id: 'zenzero_inf', n: 'Infuso zenzero e limone', b: 'te', i: ['zenzero', 'limone'], p: 2.0, d: 'Pizzica e scalda, senza tè vero e proprio dentro.', h: 'Qualcosa che pizzichi e scaldi… radice e agrumi.' },
  { id: 'te_freddo', n: 'Tè freddo al limone', b: 'te', i: ['ghiaccio', 'limone'], p: 2.6, d: 'Fatto in casa, con le fette di limone e tanto ghiaccio.', h: 'Un tè, ma freddo! Con le fettine gialle dentro.' },
  // pasticceria
  { id: 'cornetto', n: 'Cornetto', b: 'lievitata', i: [], p: 1.3, d: 'Sfogliato, lucido, appena sfornato.', h: '' },
  { id: 'cornetto_crema', n: 'Cornetto alla crema', b: 'lievitata', i: ['uova', 'vaniglia'], p: 1.8, d: 'Ripieno di crema pasticcera alla vaniglia.', h: 'Un cornetto pieno, con la crema gialla alla vaniglia.' },
  { id: 'cornetto_cioc', n: 'Cornetto al cioccolato', b: 'lievitata', i: ['cacao'], p: 1.8, d: 'Con il cuore fondente che cola al primo morso.', h: 'Un cornetto con il cuore scuro e dolce…' },
  { id: 'maritozzo', n: 'Maritozzo', b: 'lievitata', i: ['panna', 'zucchero'], p: 2.6, d: 'Panino dolce spaccato e riempito di panna fino a scoppiare.', h: 'Quel panino dolce romano pieno di panna, zuccherato sopra!' },
  { id: 'girella', n: 'Girella alla cannella', b: 'lievitata', i: ['cannella', 'zucchero'], p: 2.4, d: 'Arrotolata, glassata, profuma tutto il locale.', h: 'Una brioche arrotolata con dentro spezia e zucchero scuro.' },
  { id: 'bombolone', n: 'Bombolone', b: 'lievitata', i: ['uova', 'zucchero'], p: 2.0, d: 'Fritto, zuccherato, con la crema che spunta di lato.', h: 'Un bombolone! Fritto, ricoperto di zucchero, come al mare.' },
  { id: 'veneziana', n: 'Veneziana alle mandorle', b: 'lievitata', i: ['nocciola', 'zucchero', 'uova'], p: 3.4, d: 'Soffice, con la crosta di zucchero e frutta secca.', h: 'Quel dolce soffice di Venezia, con la crosta croccante di zucchero e frutta secca… e uova.' },
];
DATA.R = {}; DATA.RECIPES.forEach(r => DATA.R[r.id] = r);

// ---------- espansioni ----------
DATA.ROOMS = [
  { id: 'bancone', n: 'Il bancone', d: 'Una macchina, tre sgabelli e una vetrina vuota. Si comincia.', cost: 0, fama: 0 },
  { id: 'tavolini', n: 'I tavolini', d: 'Quattro tavolini di marmo e la vetrina dei dolci. La gente comincia a fermarsi.', cost: 150, fama: 2 },
  { id: 'saletta', n: 'La saletta lettura', d: 'Poltrone, una lampada verde e il bollitore sempre caldo. Arrivano i tè.', cost: 1800, fama: 4 },
  { id: 'laboratorio', n: 'Il laboratorio sul retro', d: 'Un forno vero, il tavolo di marmo per impastare. Arriva la pasticceria.', cost: 9000, fama: 6 },
];

// ---------- arredi ----------
// a = atmosfera (+% incasso). room = dove compare. req = stanza richiesta
DATA.DECOR = [
  { id: 'monstera', n: 'Monstera in vaso', d: 'Grande, lucida, cresce verso la vetrina.', cost: 25, a: 5, room: 'bancone' },
  { id: 'lavagna', n: 'Lavagna del menu', d: 'Scritta a gesso, con un gatto disegnato in un angolo. I clienti chiedono più spesso ricette nuove.', cost: 60, a: 4, room: 'bancone', hint: 1 },
  { id: 'lucine', n: 'Lucine a filo', d: 'Lampadine calde appese sopra il bancone.', cost: 140, a: 6, room: 'bancone' },
  { id: 'tende', n: 'Tende di pizzo', d: 'Fanno entrare la luce a fiorellini.', cost: 220, a: 5, room: 'tavolini', req: 'tavolini' },
  { id: 'quadri', n: 'Quadri del quartiere', d: 'Acquerelli di Via dei Tigli, comprati al mercatino.', cost: 480, a: 7, room: 'tavolini', req: 'tavolini' },
  { id: 'giradischi', n: 'Giradischi', d: 'Jazz a basso volume. Qualcuno si ferma ad ascoltare.', cost: 900, a: 8, room: 'tavolini', req: 'tavolini' },
  { id: 'tappeto', n: 'Tappeto persiano', d: 'Consumato al punto giusto.', cost: 1500, a: 6, room: 'saletta', req: 'saletta' },
  { id: 'libreria', n: 'Libreria a muro', d: 'Libri lasciati dai clienti, da prendere e da lasciare.', cost: 2600, a: 8, room: 'saletta', req: 'saletta' },
  { id: 'pendolo', n: 'Orologio a pendolo', d: 'Trovato da un rigattiere. Batte le ore con mezzo minuto di ritardo.', cost: 4200, a: 7, room: 'saletta', req: 'saletta' },
  { id: 'cuccia', n: 'Cuccia sotto la finestra', d: 'Una cesta e una copertina. Forse qualcuno la userà.', cost: 6500, a: 10, room: 'tavolini', req: 'tavolini' },
  { id: 'poltrona', n: 'Poltrona di velluto', d: 'Verde bottiglia, la più contesa del locale.', cost: 11000, a: 8, room: 'saletta', req: 'saletta' },
  { id: 'pianoforte', n: 'Pianoforte verticale', d: 'Un po\' scordato. Chiunque può suonarlo.', cost: 24000, a: 12, room: 'laboratorio', req: 'laboratorio' },
];
DATA.D = {}; DATA.DECOR.forEach(d => DATA.D[d.id] = d);

// ---------- fama ----------
DATA.FAMA = [0, 20, 70, 180, 400, 850, 1700, 3200, 6000, 11000, 20000, 36000, 65000];
DATA.FAMA_NAMES = ['Sconosciuto', 'Il caffè all\'angolo', 'Quello buono', 'Il preferito della via', 'Famoso nel quartiere', 'Se ne parla in città', 'Una tappa obbligata', 'Nelle guide', 'Un\'istituzione', 'Leggendario', 'Leggendario ★', 'Leggendario ★★', 'Leggendario ★★★'];

// ---------- clienti abituali e le loro storie ----------
// arrivo: condizione per comparire. cap[n].v = visite necessarie, cap[n].req = [chi, capitolo]
DATA.REGULARS = {
  nadia: {
    n: 'Nadia', eta: 29, lav: 'Infermiera, turni di notte in pediatria', fav: 'cappuccino', gusti: 'Piante, documentari sugli oceani, il silenzio del mattino',
    arr: { fama: 1 }, look: { skin: '#e8b48a', hair: '#3a2418', style: 'bun', top: '#5f8fa8', bot: '#3c4a5a' },
    lines: ['Ancora tre ore di sonno e torno umana.', 'Il limone nano ha fatto un fiore. UN fiore.', 'Stanotte un bimbo mi ha regalato un disegno.', 'Buongiorno… cioè, buonanotte per me.'],
    cap: [
      { t: 'Fine turno', v: 1, x: 'Entra alle 6:40 con la divisa azzurra sotto il cappotto. Infermiera, turni di notte in pediatria. Ordina un cappuccino con due bustine di zucchero e non dice una parola prima del primo sorso. Dopo il secondo, sorride.' },
      { t: 'Le piantine', v: 3, x: 'Sul davanzale di casa coltiva basilico, peperoncini e un limone nano che non dà frutti da due anni. Te ne mostra le foto come altri mostrano i figli. «Questo è Gino. È il limone. Non giudicarlo.»' },
      { t: 'Il vivaio in vendita', v: 6, x: 'Ha visto un annuncio: un piccolo vivaio fuori città, il proprietario va in pensione. Lo rilegge ogni mattina sul telefono, poi lo blocca e lo mette a faccia in giù sul tavolino. «Sono matta, vero? Non rispondere.»' },
      { t: 'I conti', v: 10, req: ['marta', 3], x: 'Fogli pieni di numeri: mutuo, serre, risparmi, turni da fare ancora. Marta, al tavolo accanto, sbircia e le dice: «Io suono in una band che non ascolta nessuno da nove anni. E rifarei tutto. Fallo.» Nadia ride, ma smette di cancellare i numeri.' },
      { t: 'Ultimo turno', v: 15, x: 'Arriva alle dieci, senza divisa, con la luce del giorno addosso. Ha firmato. Ti appoggia sul bancone un vasetto di menta: «Per i tuoi tè. Così ogni tanto pensi a me.» Ordina un cappuccino e, per la prima volta, si siede con calma.' },
    ],
  },
  ottavio: {
    n: 'Ottavio', eta: 71, lav: 'Professore di latino in pensione', fav: 'espresso', gusti: 'Cruciverba, Orazio, le stilografiche, il silenzio dopo pranzo',
    arr: { room: 'tavolini' }, look: { skin: '#e2b896', hair: '#d8d4cc', style: 'bald', top: '#7a6a4f', bot: '#4a4038', glasses: 1, hat: 0 },
    lines: ['Sette lettere: "luogo dove si sta bene". Caffè non basta.', 'Il caffè caldo è per chi ha fretta.', 'Horatius diceva: carpe diem. Io dico: carpe crostatam.', 'Mia nipote dice che scrivo come un notaio.'],
    cap: [
      { t: 'Il cruciverba', v: 1, x: 'Ogni mattina alle nove, sempre il tavolino vicino alla finestra. La Settimana Enigmistica, una matita corta, mai la gomma. Ordina un espresso e lo lascia raffreddare. «Il caffè caldo è per chi ha fretta, e io ho smesso di averne.»' },
      { t: 'Le lettere', v: 3, x: 'Oltre al cruciverba scrive lettere a mano, in bella calligrafia, indirizzate a "Elena". Pina ti sussurra che Elena era sua moglie, morta tre inverni fa. Lui le lettere non le spedisce: le ripiega in quattro e le tiene nel taschino della giacca.' },
      { t: 'Lisbona', v: 6, x: 'Squilla il telefono e lui lo guarda come un oggetto alieno. È la nipote Chiara, che studia a Lisbona. Parla forte, come se dovesse farsi sentire fino in Portogallo. «Mi manda le fotografie, ma io non so ingrandirle. Vedo solo dei puntini felici.»' },
      { t: 'Lezioni private', v: 10, req: ['leo', 1], x: 'Leo gli si siede accanto e gli insegna le videochiamate, con pazienza da architetto. Ottavio prende appunti a matita sul bordo del giornale: "verde = rispondo. rosso = ho chiuso la faccia di Chiara. NON toccare il rosso."' },
      { t: 'Il tavolino', v: 15, x: 'Videochiama Chiara dal caffè, girando il telefono piano per mostrarle il locale. «Questo è il posto dove scrivevo alla nonna.» Quando se ne va, sul tavolino c\'è una lettera. Stavolta è indirizzata a te: "Grazie per il caffè, sempre troppo caldo. O."' },
    ],
  },
  leo: {
    n: 'Leo', eta: 24, lav: 'Studente di architettura, fuorisede da Bari', fav: 'te_latte', gusti: 'Disegnare tutto, le scale a chiocciola, la focaccia di sua madre',
    arr: { room: 'saletta' }, look: { skin: '#d9a27a', hair: '#1e1612', style: 'curly', top: '#c46a3a', bot: '#2e3a52' },
    lines: ['Posso disegnare la macchina dell\'espresso? È bellissima.', 'La luce qui alle cinque è perfetta.', 'Mia madre dice che sono dimagrito. Mi manda focacce per posta.', 'Ho rifatto la tavola tre volte.'],
    cap: [
      { t: 'Il quaderno', v: 1, x: 'Studente di architettura, fuorisede da Bari. Disegna tutto: le sedie, la macchina dell\'espresso, le crepe del soffitto che tu non avevi mai notato. Ordina un tè al latte e lo dimentica sempre a metà.' },
      { t: 'La bassista', v: 3, req: ['marta', 1], x: 'Una sera Marta prova un giro di basso sottovoce, tamburellando sul tavolo mentre aspetta. Leo smette di disegnare per dieci minuti buoni. Poi gira pagina e comincia a disegnare lei, di nascosto, dietro la tazza.' },
      { t: 'Esame di composizione', v: 6, x: 'Tavole sparse ovunque, occhiaie, terzo tè. Il tema del progetto d\'esame è "un luogo dove si sta bene senza un motivo preciso". Ti mostra la pianta che ha disegnato: è questo caffè, con tutti i tavolini al loro posto.' },
      { t: 'Il ritratto', v: 10, req: ['marta', 2], x: 'Gli cade un foglio mentre raccoglie le tavole. Lo raccogli tu: è Marta, a matita, di profilo, con il basso in braccio. Leo diventa rosso fino alle orecchie. «Non dirle niente. Ti prego. Ti lascio la mancia per un anno.»' },
      { t: 'Trenta e lode', v: 15, req: ['marta', 4], x: 'Torna con un trenta e lode e un mazzo di fiori sbagliati (crisantemi). Si siede accanto a Marta e le mostra il quaderno, dalla prima pagina. Lei ride per i crisantemi, poi arriva ai disegni e smette di ridere.' },
    ],
  },
  marta: {
    n: 'Marta', eta: 31, lav: 'Bassista degli Spifferi, riparatrice di strumenti', fav: 'marocchino', gusti: 'Jazz, vinili usati, le corde nuove, i gatti che la ignorano',
    arr: { decor: 'giradischi' }, look: { skin: '#f0c8a8', hair: '#8a2a2a', style: 'short', top: '#2a2a2e', bot: '#3a3040', earring: 1 },
    lines: ['Questo vinile ha un graffio al minuto due. Lo adoro.', 'Sabato suoniamo. Tre persone, forse quattro.', 'Ho riparato un violino del 1920 oggi.', 'Il ragazzo del quaderno è tornato?'],
    cap: [
      { t: 'Il vinile', v: 1, x: 'Si ferma davanti al giradischi come davanti a un vecchio amico. «Posso?» Mette un disco di jazz, poi ordina un marocchino. Suona il basso negli Spifferi, una band di quartiere. «Il nome è bruttissimo, lo so. Lo ha scelto il batterista.»' },
      { t: 'Nove anni', v: 3, x: 'Gli Spifferi esistono da nove anni. Concerti in tre bar, un EP che ha ascoltato sua madre (due volte). Di giorno ripara strumenti in una bottega che odora di colla e legno. «Le chitarre degli altri suonano. Io le aggiusto.»' },
      { t: 'Il ragazzo del quaderno', v: 6, x: 'Ha notato Leo. «Quello lì disegna davvero o fa finta per sembrare interessante?» Ordina due tè al latte, ne porta uno fino a metà sala, poi torna indietro e li beve tutti e due.' },
      { t: 'Milano', v: 10, x: 'Le hanno offerto un posto fisso in un\'azienda di strumenti, a Milano. Stipendio vero, ferie vere. Vorrebbe dire smettere con gli Spifferi. Parla con Nadia per un\'ora intera, e il marocchino si fredda.' },
      { t: 'Restare', v: 15, req: ['leo', 4], x: 'Ha detto no a Milano. Gli Spifferi suoneranno sabato in piazza. Ti lascia un volantino da appendere: sopra, disegnata a matita, c\'è la facciata del tuo caffè. In basso, piccolo piccolo, c\'è scritto "disegno di L."' },
    ],
  },
  grigio: {
    n: 'Il signor Grigio', eta: '?', lav: '?', fav: 'espresso', gusti: '?',
    arr: { decor: 'pendolo' }, look: { skin: '#dcc0a4', hair: '#9a9a9a', style: 'bald', top: '#5a5d62', bot: '#3a3c40', hat: 1 },
    lines: ['…', '…grazie.', '(guarda il pendolo)', '(passa le dita sul bancone)'],
    cap: [
      { t: 'Il cliente silenzioso', v: 1, x: 'Cappotto grigio, cappello grigio, sempre alle cinque. Espresso ristretto, nessuna parola. Paga con monete vecchie, lucidate con cura, e le allinea sul bancone una accanto all\'altra.' },
      { t: 'L\'orologio', v: 3, x: 'Fissa il pendolo a lungo. Quando batte le cinque, con il suo mezzo minuto di ritardo, chiude gli occhi come chi ascolta una voce da lontano. Poi beve il caffè in un sorso solo.' },
      { t: 'Le iniziali', v: 6, x: 'Pulendo sotto il bancone trovi due iniziali incise nel legno: "G.L. 1962". Il giorno dopo, quando il signor Grigio paga, le sue dita si posano esattamente in quel punto, senza guardare.' },
      { t: 'La fotografia', v: 10, x: 'Pina arriva trafelata con una foto trovata in soffitta: questo locale nel 1962. L\'insegna dice "Bar Luna". Dietro al bancone, un ragazzino magro con il grembiule troppo grande. Ha gli stessi occhi del signor Grigio.' },
      { t: 'Bar Luna', v: 15, x: 'Finalmente parla. «Gino Lunardi. Questo era il bar di mio padre. Ho servito il primo caffè a quattordici anni, proprio lì.» Ti lascia la vecchia insegna di latta. «Lunetta… mi piace. È più piccola, ma è la stessa luna.»' },
    ],
  },
};

// ---------- clienti di passaggio ----------
DATA.PASSERS = {
  skins: ['#f2d0b4', '#e8b48a', '#c98e64', '#8e5a3c', '#f6dcc4', '#d9a27a', '#6e4630'],
  hairs: ['#1e1612', '#3a2418', '#6a4428', '#b07a3a', '#d8b878', '#8a2a2a', '#d8d4cc', '#2a2a3a'],
  tops: ['#c46a3a', '#5f8fa8', '#7a8a4e', '#b8506a', '#d4a24a', '#4a5a8a', '#8a5a9a', '#e0d4c0', '#3a6a5a', '#a84a3a'],
  bots: ['#2e3a52', '#3c4a5a', '#4a4038', '#2a2a2e', '#5a4a3a', '#6a6a72'],
  styles: ['short', 'long', 'bun', 'curly', 'bald', 'pony'],
  chat: ['Che profumo qui dentro.', 'Il solito, grazie!', 'Fuori fa un freddo…', 'Bel posto, non lo conoscevo.', 'Mi hanno parlato bene di voi.', 'Ci vuole proprio.', 'Ho dieci minuti, ce la facciamo?', 'Che bella luce.', 'Torno domani, giuro.', 'Mia madre veniva qui da ragazza.'],
};
