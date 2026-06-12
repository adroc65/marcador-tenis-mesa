const $ = s => document.querySelector(s);
const STORE = 'marcador-ttm-v1';
let match = null;

function save() { if (match) localStorage.setItem(STORE, JSON.stringify(match)); }
function name(p) { return p === 'A' ? match.config.nameA : match.config.nameB; }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function fmtMs(ms) {
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
function fmtTime(t) { return new Date(t).toTimeString().slice(0, 8); }

/* ---------- Configuración ---------- */
function initSeg(root) {
  root.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    root.querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
  }));
}
const segVal = root => root.querySelector('button.on').dataset.v;
initSeg($('#segServer')); initSeg($('#segBestOf')); initSeg($('#segSwap'));

function syncServerLabels() {
  const btns = $('#segServer').querySelectorAll('button');
  btns[0].textContent = $('#inpA').value.trim() || 'Jugador A';
  btns[1].textContent = $('#inpB').value.trim() || 'Jugador B';
}
$('#inpA').addEventListener('input', syncServerLabels);
$('#inpB').addEventListener('input', syncServerLabels);

$('#btnStart').addEventListener('click', () => {
  match = Engine.newMatch({
    nameA: $('#inpA').value,
    nameB: $('#inpB').value,
    bestOf: parseInt(segVal($('#segBestOf')), 10),
    firstServer: segVal($('#segServer')),
    swapAt5: segVal($('#segSwap')) === 'si',
  });
  save();
  showGame();
});

// La pantalla de configuración gira libre (se ve mejor en vertical);
// el bloqueo horizontal solo aplica durante el partido.
try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) { /* no soportado */ }

(function checkSaved() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE)); } catch (e) { /* ignorar */ }
  if (!saved || !saved.config) return;
  $('#inpA').value = saved.config.nameA;
  $('#inpB').value = saved.config.nameB;
  syncServerLabels();
  if (!saved.finished) {
    const b = $('#btnResume');
    b.classList.remove('hidden');
    b.addEventListener('click', () => { match = saved; showGame(); });
  }
})();

/* ---------- Juego ---------- */
function showGame() {
  $('#setup').classList.add('hidden');
  $('#game').classList.remove('hidden');
  keepAwake();
  lockLandscape();
  render();
  updateTimer();
}

// Pantalla completa + orientación horizontal (el navegador solo lo permite
// como respuesta a un toque del usuario, por eso se llama desde showGame).
async function lockLandscape() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
  } catch (e) { /* no soportado */ }
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch (e) { /* solo funciona en móvil con pantalla completa */ }
}

$('#halfL').addEventListener('click', () => tap($('#halfL')));
$('#halfR').addEventListener('click', () => tap($('#halfR')));

function tap(el) {
  if (!match || match.finished || match.betweenSets) return;
  const evs = Engine.addPoint(match, el.dataset.player);
  evs.forEach(e => { if (e.type === 'swap') showBanner('🔄 Cambio de lado'); });
  render();
}

document.querySelectorAll('.half .nm').forEach(el => {
  el.addEventListener('click', ev => {
    ev.stopPropagation();
    const p = el.closest('.half').dataset.player;
    const v = prompt('Nombre del jugador', name(p));
    if (v && v.trim()) {
      if (p === 'A') match.config.nameA = v.trim();
      else match.config.nameB = v.trim();
      render();
    }
  });
});

function paintHalf(el, p) {
  const m = match;
  el.dataset.player = p;
  el.classList.toggle('pA', p === 'A');
  el.classList.toggle('pB', p === 'B');
  el.querySelector('.nm').textContent = name(p);
  el.querySelector('.pscore').textContent = p === 'A' ? m.scoreA : m.scoreB;
  const serving = !m.finished && !m.betweenSets && Engine.currentServer(m) === p;
  el.querySelector('.serve').classList.toggle('hidden', !serving);
}

function render() {
  const m = match;
  if (!m) return;
  const swapped = Engine.sidesSwapped(m);
  const Lp = swapped ? 'B' : 'A';
  const Rp = swapped ? 'A' : 'B';
  paintHalf($('#halfL'), Lp);
  paintHalf($('#halfR'), Rp);

  const wa = m.sets.filter(s => s.winner === 'A').length;
  const wb = m.sets.filter(s => s.winner === 'B').length;
  $('#setPills').textContent = swapped ? `${wb} – ${wa}` : `${wa} – ${wb}`;

  // Cuadrito central con los marcadores de sets pasados
  const ps = $('#pastSets');
  ps.innerHTML = '';
  const cell = (t, cls) => {
    const d = document.createElement('div');
    d.textContent = t;
    if (cls) d.className = cls;
    ps.appendChild(d);
  };
  if (m.sets.length) {
    cell('Set', 'hd'); cell(name(Lp), 'hd'); cell(name(Rp), 'hd');
    m.sets.forEach((s, i) => {
      cell(String(i + 1));
      cell(String(Lp === 'A' ? s.a : s.b), s.winner === Lp ? 'w' : '');
      cell(String(Rp === 'A' ? s.a : s.b), s.winner === Rp ? 'w' : '');
    });
  }

  renderOverlay();
  updateTimer();
  save();
}

function updateTimer() {
  const m = match;
  if (!m || $('#game').classList.contains('hidden')) return;
  if (m.finished) { $('#timer').textContent = 'Partido terminado'; $('#estimate').textContent = ''; return; }
  if (m.betweenSets) { $('#timer').textContent = 'Descanso entre sets'; $('#estimate').textContent = ''; return; }
  $('#timer').textContent = `Set ${m.sets.length + 1} · ${fmtMs(Date.now() - m.setStart)}`;
  const est = Engine.estimateSetMs(m);
  $('#estimate').textContent = est ? `Duración est. del set: ~${Math.max(1, Math.round(est / 60000))} min` : '';
}
setInterval(updateTimer, 1000);

/* ---------- Overlays ---------- */
function renderOverlay() {
  const ov = $('#overlay');
  const m = match;
  if (m.finished) {
    const setsStr = m.sets.map(s => `${s.a}–${s.b}`).join(' · ');
    const dur = m.log.length ? m.log[m.log.length - 1].t - m.matchStart : 0;
    ov.innerHTML = `<div class="modal">
      <h2>🏆 ${esc(name(m.winner))} gana el partido</h2>
      <p class="muted">${setsStr}</p>
      <p class="muted">Duración: ${Math.max(1, Math.round(dur / 60000))} min</p>
      <div class="row">
        <button class="ghost" id="ovUndo">↩ Deshacer</button>
        <button class="ghost" id="ovLog">📋 Log</button>
        <button class="primary" id="ovNew">Nuevo partido</button>
      </div></div>`;
    ov.classList.remove('hidden');
    $('#ovUndo').onclick = () => { Engine.undo(m); render(); };
    $('#ovLog').onclick = openLog;
    $('#ovNew').onclick = toSetup;
  } else if (m.betweenSets) {
    const last = m.sets[m.sets.length - 1];
    const next = m.sets.length + 1;
    const decider = next === m.config.bestOf;
    ov.innerHTML = `<div class="modal">
      <h2>Set ${m.sets.length} para ${esc(name(last.winner))}</h2>
      <p class="muted">${last.a}–${last.b} · ${Math.max(1, Math.round(last.ms / 60000))} min</p>
      <p class="muted">🔄 Cambio de lado · sigue el set ${next}${decider ? ' (decisivo)' : ''}</p>
      <div class="row">
        <button class="ghost" id="ovUndo">↩ Deshacer</button>
        <button class="primary" id="ovNext">Iniciar set ${next}</button>
      </div></div>`;
    ov.classList.remove('hidden');
    $('#ovUndo').onclick = () => { Engine.undo(m); render(); };
    $('#ovNext').onclick = () => { Engine.startNextSet(m); render(); };
  } else {
    ov.classList.add('hidden');
  }
}

/* ---------- Botones centrales ---------- */
$('#btnUndo').addEventListener('click', () => { if (match && Engine.undo(match)) render(); });
$('#btnLog').addEventListener('click', openLog);
$('#btnCloseLog').addEventListener('click', () => $('#logModal').classList.add('hidden'));
$('#btnMenu').addEventListener('click', () => {
  if (confirm('¿Salir al menú? El partido queda guardado y se puede continuar.')) location.reload();
});

function toSetup() {
  localStorage.removeItem(STORE);
  location.reload();
}

function openLog() {
  const wrap = $('#logList');
  wrap.innerHTML = '';
  if (!match.log.length) wrap.innerHTML = '<p class="muted">Aún no hay puntos.</p>';
  let curSet = 0;
  match.log.forEach(e => {
    if (e.set !== curSet) {
      curSet = e.set;
      const h = document.createElement('div');
      h.className = 'loghead';
      h.textContent = `Set ${curSet}`;
      wrap.appendChild(h);
    }
    const r = document.createElement('div');
    r.className = 'logrow';
    r.innerHTML = `<span class="tm">${fmtTime(e.t)}</span>` +
      `<b>${esc(name(e.who))}</b>` +
      `<span>${e.a}–${e.b}</span>` +
      `<span>sacaba ${esc(name(e.server))}</span>`;
    wrap.appendChild(r);
  });
  $('#logModal').classList.remove('hidden');
}

/* ---------- Guardar / compartir el log ---------- */
function buildLogText(m) {
  const pad = n => String(n).padStart(2, '0');
  const d = new Date(m.matchStart);
  const L = [];
  L.push('MARCADOR · TENIS DE MESA');
  L.push(`Partido: ${m.config.nameA} vs ${m.config.nameB}`);
  L.push(`Fecha: ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`);
  L.push(`Formato: ${m.config.bestOf === 5 ? '3 de 5' : '2 de 3'} sets · Saca primero: ${name(m.config.firstServer)}`);
  const wa = m.sets.filter(s => s.winner === 'A').length;
  const wb = m.sets.filter(s => s.winner === 'B').length;
  const setsStr = m.sets.map(s => `${s.a}-${s.b}`).join(', ');
  if (m.finished) {
    const dur = m.log.length ? Math.round((m.log[m.log.length - 1].t - m.matchStart) / 60000) : 0;
    const wWon = m.winner === 'A' ? wa : wb;
    const wLost = m.winner === 'A' ? wb : wa;
    L.push(`Resultado: ${name(m.winner)} gana ${wWon}-${wLost} (${setsStr})`);
    L.push(`Duración: ${Math.max(1, dur)} min`);
  } else {
    L.push(`Partido en curso · Sets: ${wa}-${wb}${setsStr ? ' (' + setsStr + ')' : ''} · Set actual: ${m.scoreA}-${m.scoreB}`);
  }
  let curSet = 0;
  m.log.forEach(e => {
    if (e.set !== curSet) {
      curSet = e.set;
      const fin = m.sets[curSet - 1];
      L.push('');
      L.push(fin
        ? `SET ${curSet} — ${fin.a}-${fin.b}, ${Math.max(1, Math.round(fin.ms / 60000))} min`
        : `SET ${curSet} — en curso`);
    }
    L.push(`${fmtTime(e.t)}  ${e.a}-${e.b}  punto para ${name(e.who)} (sacaba ${name(e.server)})`);
  });
  return L.join('\r\n');
}

function downloadLog() {
  const pad = n => String(n).padStart(2, '0');
  const d = new Date(match.matchStart);
  const fname = `partido-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.txt`;
  const blob = new Blob([buildLogText(match)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function shareLog() {
  try {
    await navigator.share({ title: 'Partido de tenis de mesa', text: buildLogText(match) });
  } catch (e) { /* el usuario canceló */ }
}

$('#btnSaveLog').addEventListener('click', downloadLog);
$('#btnShareLog').addEventListener('click', shareLog);
if (navigator.share) $('#btnShareLog').classList.remove('hidden');

/* ---------- Banner ---------- */
let bannerTo = null;
function showBanner(t) {
  const b = $('#banner');
  b.textContent = t;
  b.classList.remove('hidden');
  clearTimeout(bannerTo);
  bannerTo = setTimeout(() => b.classList.add('hidden'), 2500);
}

/* ---------- Mantener pantalla encendida ---------- */
let wakeLock = null;
async function keepAwake() {
  try {
    if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) { /* no soportado o denegado */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !$('#game').classList.contains('hidden')) keepAwake();
});

/* ---------- Service worker (offline) ---------- */
if ('serviceWorker' in navigator &&
    (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
