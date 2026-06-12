// Pruebas rápidas del motor (node test-logic.js)
const Engine = require('./logic.js');
let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('FALLA: ' + msg); } else console.log('ok: ' + msg); };

// Saque: alterna cada 2 puntos, cada 1 a partir de 10-10
let m = Engine.newMatch({ firstServer: 'A' });
ok(Engine.currentServer(m) === 'A', 'saca A al inicio');
Engine.addPoint(m, 'A'); Engine.addPoint(m, 'B');
ok(Engine.currentServer(m) === 'B', 'con 2 puntos jugados saca B');
m = Engine.newMatch({ firstServer: 'A' });
for (let i = 0; i < 10; i++) { Engine.addPoint(m, 'A'); Engine.addPoint(m, 'B'); } // 10-10
ok(m.scoreA === 10 && m.scoreB === 10, 'llegamos a 10-10');
const s1 = Engine.currentServer(m);
Engine.addPoint(m, 'A'); // 11-10, no termina
ok(!m.betweenSets && !m.finished, 'a 11-10 el set sigue');
ok(Engine.currentServer(m) !== s1, 'en deuce el saque cambia cada punto');

// Fin de set 11-x y fin de partido 2 de 3
m = Engine.newMatch({ bestOf: 3, firstServer: 'A' });
for (let i = 0; i < 11; i++) Engine.addPoint(m, 'A');
ok(m.betweenSets && m.sets.length === 1 && m.sets[0].a === 11, 'set 1: 11-0 para A');
Engine.startNextSet(m);
ok(Engine.firstServerOfSet(m) === 'B', 'en el set 2 inicia sacando B');
ok(Engine.sidesSwapped(m) === true, 'en el set 2 los lados están cambiados');
for (let i = 0; i < 11; i++) Engine.addPoint(m, 'A');
ok(m.finished && m.winner === 'A', 'A gana el partido 2-0');

// Deuce: 11-10 no cierra, 12-10 sí
m = Engine.newMatch({});
for (let i = 0; i < 10; i++) { Engine.addPoint(m, 'A'); Engine.addPoint(m, 'B'); }
Engine.addPoint(m, 'A'); ok(!m.betweenSets, '11-10 no cierra el set');
Engine.addPoint(m, 'A'); ok(m.betweenSets, '12-10 cierra el set');

// Cambio de lado a los 5 en set decisivo (activado)
m = Engine.newMatch({ bestOf: 3, swapAt5: true });
for (let i = 0; i < 11; i++) Engine.addPoint(m, 'A'); Engine.startNextSet(m);
for (let i = 0; i < 11; i++) Engine.addPoint(m, 'B'); Engine.startNextSet(m);
ok(Engine.isDecider(m), 'set 3 es el decisivo');
const swapBefore = Engine.sidesSwapped(m);
let evs = [];
for (let i = 0; i < 5; i++) evs = evs.concat(Engine.addPoint(m, 'A'));
ok(evs.some(e => e.type === 'swap'), 'al llegar a 5 en el decisivo hay evento de cambio');
ok(Engine.sidesSwapped(m) !== swapBefore, 'los lados quedaron invertidos');

// Con la opción por default (no), no hay cambio
m = Engine.newMatch({ bestOf: 3 });
for (let i = 0; i < 11; i++) Engine.addPoint(m, 'A'); Engine.startNextSet(m);
for (let i = 0; i < 11; i++) Engine.addPoint(m, 'B'); Engine.startNextSet(m);
evs = [];
for (let i = 0; i < 5; i++) evs = evs.concat(Engine.addPoint(m, 'A'));
ok(!evs.some(e => e.type === 'swap'), 'por default no hay cambio a los 5');

// Undo cruza el fin de set
m = Engine.newMatch({});
for (let i = 0; i < 11; i++) Engine.addPoint(m, 'A');
ok(m.betweenSets, 'set cerrado');
Engine.undo(m);
ok(!m.betweenSets && m.scoreA === 10 && m.sets.length === 0, 'undo revierte el punto que cerró el set');

// 3 de 5
m = Engine.newMatch({ bestOf: 5 });
for (let s = 0; s < 3; s++) { for (let i = 0; i < 11; i++) Engine.addPoint(m, 'B'); if (!m.finished) Engine.startNextSet(m); }
ok(m.finished && m.winner === 'B', 'B gana 3-0 en partido a 5');

console.log(fails ? `\n${fails} pruebas fallaron` : '\nTodas las pruebas pasaron');
process.exit(fails ? 1 : 0);
