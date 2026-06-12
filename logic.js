// Motor del marcador de tenis de mesa (sin dependencias de UI,
// reutilizable tal cual en una futura app React Native / Expo).
const Engine = (() => {
  const other = p => (p === 'A' ? 'B' : 'A');

  function newMatch(cfg) {
    const now = Date.now();
    return {
      config: {
        nameA: (cfg.nameA || '').trim() || 'Jugador A',
        nameB: (cfg.nameB || '').trim() || 'Jugador B',
        bestOf: cfg.bestOf === 5 ? 5 : 3,
        firstServer: cfg.firstServer === 'B' ? 'B' : 'A',
        swapAt5: !!cfg.swapAt5,
      },
      sets: [],            // sets terminados: {a, b, winner, ms}
      scoreA: 0,
      scoreB: 0,
      setStart: now,
      matchStart: now,
      log: [],             // todos los puntos del partido
      deciderSwapDone: false,
      betweenSets: false,
      finished: false,
      winner: null,
      undoStack: [],
    };
  }

  const setsNeeded = m => (m.config.bestOf + 1) / 2;
  const setIndex = m => m.sets.length;
  const isDecider = m => m.sets.length === m.config.bestOf - 1;

  // El saque inicial alterna entre jugadores en cada set.
  function firstServerOfSet(m) {
    return setIndex(m) % 2 === 0 ? m.config.firstServer : other(m.config.firstServer);
  }

  // Cambio de saque cada 2 puntos; a partir de 10-10, cada punto.
  function currentServer(m) {
    const p = m.scoreA + m.scoreB;
    const idx = p < 20 ? Math.floor(p / 2) % 2 : p % 2;
    return idx === 0 ? firstServerOfSet(m) : other(firstServerOfSet(m));
  }

  // Los jugadores cambian de lado en cada set; en el decisivo,
  // adicionalmente al llegar alguien a 5 (si está activada la opción).
  function sidesSwapped(m) {
    return (setIndex(m) % 2 === 1) !== m.deciderSwapDone;
  }

  function snapshot(m) {
    const { undoStack, ...rest } = m;
    return JSON.stringify(rest);
  }

  // who: quién gana el punto. err (opcional): 'S' o 'A' si el punto se
  // ganó por un fallo del rival (saque o ataque fallado).
  function addPoint(m, who, err) {
    if (m.finished || m.betweenSets) return [];
    m.undoStack.push(snapshot(m));
    if (m.undoStack.length > 300) m.undoStack.shift();

    const server = currentServer(m);
    if (who === 'A') m.scoreA++; else m.scoreB++;
    const entry = {
      t: Date.now(),
      set: setIndex(m) + 1,
      who,
      server,
      a: m.scoreA,
      b: m.scoreB,
    };
    if (err) entry.err = err;
    m.log.push(entry);

    const events = [];
    const a = m.scoreA, b = m.scoreB;
    if ((a >= 11 || b >= 11) && Math.abs(a - b) >= 2) {
      const w = a > b ? 'A' : 'B';
      m.sets.push({ a, b, winner: w, ms: Date.now() - m.setStart });
      m.scoreA = 0;
      m.scoreB = 0;
      m.deciderSwapDone = false;
      const won = m.sets.filter(s => s.winner === w).length;
      if (won >= setsNeeded(m)) {
        m.finished = true;
        m.winner = w;
        events.push({ type: 'match', winner: w });
      } else {
        m.betweenSets = true;
        events.push({ type: 'set', winner: w, a, b });
      }
    } else if (isDecider(m) && m.config.swapAt5 && !m.deciderSwapDone && (a === 5 || b === 5)) {
      m.deciderSwapDone = true;
      events.push({ type: 'swap' });
    }
    return events;
  }

  function startNextSet(m) {
    if (!m.betweenSets) return;
    m.betweenSets = false;
    m.setStart = Date.now();
  }

  function undo(m) {
    const s = m.undoStack.pop();
    if (!s) return false;
    Object.assign(m, JSON.parse(s));
    return true;
  }

  // Duración estimada del set según el ritmo de puntos que se lleva.
  function estimateSetMs(m) {
    const pts = m.scoreA + m.scoreB;
    if (pts < 4 || m.betweenSets || m.finished) return null;
    const perPoint = (Date.now() - m.setStart) / pts;
    let estTotal;
    if (m.scoreA >= 10 && m.scoreB >= 10) {
      estTotal = pts + 2;
    } else {
      const leader = Math.max(m.scoreA, m.scoreB);
      estTotal = Math.max(pts + 1, Math.round(pts * 11 / Math.max(leader, 1)));
    }
    return perPoint * estTotal;
  }

  return {
    newMatch, addPoint, undo, startNextSet,
    currentServer, sidesSwapped, estimateSetMs,
    setsNeeded, setIndex, isDecider, other, firstServerOfSet,
  };
})();

if (typeof module !== 'undefined') module.exports = Engine;
