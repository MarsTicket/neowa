(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, N = 8, CS = 62, GX = (540 - 8 * 62) / 2, GY = 220, NC = 6;
  var COLS = ['#ff4d6d', '#ffd166', '#7dff9b', '#5ee7ff', '#b48cff', '#ff7aa8'];
  var fx = new A.FX();
  var g, moves, score, chain, bestChain, busy, sel, drag = null, cur = { x: 3, y: 3 }, kbd = false, dyingT, falling;
  // 칸: {c:색, sp: null|'h'|'v'|'bomb', y:그릴 위치(애니메이션)}
  function rnd() { return A.irand(0, NC - 1); }
  function at(x, y) { return x >= 0 && y >= 0 && x < N && y < N ? g[y][x] : null; }
  function fill() {
    g = []; for (var y = 0; y < N; y++) { g.push([]); for (var x = 0; x < N; x++) { var c; do { c = rnd(); } while ((x > 1 && g[y][x - 1].c === c && g[y][x - 2].c === c) || (y > 1 && g[y - 1][x].c === c && g[y - 2][x].c === c)); g[y].push({ c: c, sp: null, dy: 0 }); } }
    if (!hasMove()) fill();
  }
  function findMatches() {
    var runs = [];
    for (var y = 0; y < N; y++) for (var x = 0; x < N;) { var c = g[y][x].c, e = x; while (e + 1 < N && g[y][e + 1].c === c && c >= 0) e++; if (e - x >= 2 && c >= 0) runs.push({ cells: range(x, e).map(function (xx) { return [xx, y]; }), dir: 'h', c: c }); x = e + 1; }
    for (x = 0; x < N; x++) for (y = 0; y < N;) { var c2 = g[y][x].c, e2 = y; while (e2 + 1 < N && g[e2 + 1][x].c === c2 && c2 >= 0) e2++; if (e2 - y >= 2 && c2 >= 0) runs.push({ cells: range(y, e2).map(function (yy) { return [x, yy]; }), dir: 'v', c: c2 }); y = e2 + 1; }
    return runs;
  }
  function range(a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r; }
  function hasMove() {
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) for (var d = 0; d < 2; d++) {
      var nx = x + (d ? 0 : 1), ny = y + (d ? 1 : 0); if (nx >= N || ny >= N) continue;
      var a = g[y][x], b = g[ny][nx]; if (a.sp === 'bomb' || b.sp === 'bomb') return true;
      g[y][x] = b; g[ny][nx] = a; var m = findMatches().length; g[y][x] = a; g[ny][nx] = b; if (m) return true;
    }
    return false;
  }
  function blastCells(set, x, y) {
    var it = g[y][x]; if (set[x + ',' + y]) return; set[x + ',' + y] = 1;
    if (it.sp === 'h') for (var k = 0; k < N; k++) blastCells(set, k, y);
    if (it.sp === 'v') for (k = 0; k < N; k++) blastCells(set, x, k);
  }
  function resolve(swapA, swapB) {
    var runs = findMatches(); if (!runs.length) return false;
    chain++; bestChain = Math.max(bestChain, chain);
    var set = {}, make = [];
    runs.forEach(function (r) {
      r.cells.forEach(function (p) { blastCells(set, p[0], p[1]); });
      if (r.cells.length >= 4) { // 특수 보석 생성 위치: 방금 옮긴 칸이 있으면 거기
        var spot = r.cells.filter(function (p) { return (swapA && p[0] === swapA[0] && p[1] === swapA[1]) || (swapB && p[0] === swapB[0] && p[1] === swapB[1]); })[0] || r.cells[1];
        make.push({ x: spot[0], y: spot[1], c: r.c, sp: r.cells.length >= 5 ? 'bomb' : (r.dir === 'h' ? 'v' : 'h') });
      }
    });
    var n = 0;
    Object.keys(set).forEach(function (k) { var p = k.split(',').map(Number), it = g[p[1]][p[0]]; fx.burst(GX + (p[0] + 0.5) * CS, GY + (p[1] + 0.5) * CS, COLS[it.c] || '#fff', 6, 200, 0.4, 3); it.c = -1; n++; });
    make.forEach(function (m) { g[m.y][m.x] = { c: m.sp === 'bomb' ? 9 : m.c, sp: m.sp, dy: 0 }; });
    var pts = n * 10 * chain; score += pts; fx.text(W / 2, GY - 30, (chain > 1 ? chain + '연쇄 ' : '') + '+' + pts, chain > 1 ? '#ffd166' : '#fff', chain > 1 ? 26 : 20);
    A.sfx(chain > 1 ? 'gold' : 'coin', 1 + chain * 0.08); fx.shake(Math.min(10, 2 + n * 0.3), 0.15);
    collapse(); return true;
  }
  function collapse() {
    for (var x = 0; x < N; x++) {
      var col = []; for (var y = N - 1; y >= 0; y--) if (g[y][x].c !== -1) col.push(g[y][x]);
      var miss = N - col.length; for (var k = 0; k < miss; k++) col.push({ c: rnd(), sp: null, dy: 0, fresh: k });
      for (y = N - 1, k = 0; y >= 0; y--, k++) { var it = col[k], oldY = it.yy != null ? it.yy : (it.fresh != null ? -1 - it.fresh : y); it.dy = (oldY - y) * CS; g[y][x] = it; it.yy = y; delete it.fresh; }
    }
    busy = 0.32;
  }
  function colorBomb(bx, by, color) {
    var set = {}; g[by][bx].c = -1;
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (g[y][x].c === color) blastCells(set, x, y);
    var n = 0; Object.keys(set).forEach(function (k) { var p = k.split(',').map(Number); fx.burst(GX + (p[0] + 0.5) * CS, GY + (p[1] + 0.5) * CS, COLS[g[p[1]][p[0]].c] || '#fff', 8, 260, 0.5, 3); g[p[1]][p[0]].c = -1; n++; });
    score += n * 30; fx.flashIt('#ffffff', 0.4); A.sfx('bigboom'); fx.text(W / 2, GY - 30, '색 폭탄! +' + n * 30, '#ffd166', 28); collapse();
  }
  function trySwap(x1, y1, x2, y2) {
    if (busy > 0 || dyingT > 0 || S.state !== 'playing' || !at(x2, y2) || Math.abs(x1 - x2) + Math.abs(y1 - y2) !== 1) return;
    var a = g[y1][x1], b = g[y2][x2]; chain = 0;
    if (a.sp === 'bomb' || b.sp === 'bomb') { moves--; var bomb = a.sp === 'bomb' ? [x1, y1, b.c] : [x2, y2, a.c]; colorBomb(bomb[0], bomb[1], bomb[2] === 9 ? A.irand(0, NC - 1) : bomb[2]); hud(); return; }
    g[y1][x1] = b; g[y2][x2] = a; a.yy = y2; b.yy = y1;
    swapAnim = { a: a, b: b, ax: x1, ay: y1, bx: x2, by: y2, t: 0 };
    if (!findMatches().length) { g[y1][x1] = a; g[y2][x2] = b; a.yy = y1; b.yy = y2; swapAnim.back = true; A.sfx('wall'); busy = 0.25; return; }
    moves--; A.sfx('turn', 1.3); busy = 0.18; pendingSwap = [[x2, y2], [x1, y1]]; hud();
  }
  var swapAnim = null, pendingSwap = null;
  function reset() { fill(); for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) g[y][x].yy = y; moves = 30; score = 0; chain = 0; bestChain = 0; busy = 0; sel = null; dyingT = 0; fx.clear(); hud(); }
  function update(dt) {
    fx.update(dt);
    if (swapAnim) { swapAnim.t += dt * 6; if (swapAnim.t >= 1) swapAnim = null; }
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) { var it = g[y][x]; if (it.dy) { it.dy = it.dy < 0 ? Math.min(0, it.dy + dt * 1400) : 0; } }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['최대 연쇄', String(bestChain)]], { kick: 'FINISH', win: true }); return; }
    if (busy > 0) { busy -= dt; if (busy <= 0) {
      if (pendingSwap) { var ps = pendingSwap; pendingSwap = null; resolve(ps[0], ps[1]); }
      else if (!resolve()) { if (moves <= 0) { dyingT = 1; A.sfx('level'); } else if (!hasMove()) { fx.text(W / 2, H / 2, '섞는 중…', '#fff', 24); fill(); for (y = 0; y < N; y++) for (x = 0; x < N; x++) g[y][x].yy = y; } }
    } }
    hud();
  }
  function gem(c, it, px, py, s) {
    var col = COLS[it.c] || '#ffffff', r = CS * 0.38 * s;
    c.save(); c.translate(px, py);
    if (it.sp === 'bomb') { var gr = c.createRadialGradient(0, 0, 2, 0, 0, r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, '#b48cff'); gr.addColorStop(1, '#ff4d6d'); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.restore(); return; }
    c.shadowColor = col; c.shadowBlur = 10; c.fillStyle = col; c.beginPath();
    var sides = [6, 4, 5, 8, 3, 0][it.c % 6];
    if (!sides) c.arc(0, 0, r, 0, 7); else for (var k = 0; k < sides; k++) { var a = k / sides * Math.PI * 2 - Math.PI / 2; c[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill(); c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-r * 0.25, -r * 0.3, r * 0.35, r * 0.18, -0.5, 0, 7); c.fill();
    if (it.sp === 'h' || it.sp === 'v') { c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); if (it.sp === 'h') { c.moveTo(-r, 0); c.lineTo(r, 0); } else { c.moveTo(0, -r); c.lineTo(0, r); } c.stroke(); }
    c.restore();
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    var bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1c0614'); bg.addColorStop(1, '#08020a'); c.fillStyle = bg; c.fillRect(-10, -10, W + 20, H + 20);
    if (!g) { fill(); for (var yy = 0; yy < N; yy++) for (var xx = 0; xx < N; xx++) g[yy][xx].yy = yy; }
    c.fillStyle = 'rgba(255,122,168,.07)'; A.rr(c, GX - 8, GY - 8, N * CS + 16, N * CS + 16, 18); c.fill();
    c.save(); c.beginPath(); c.rect(GX - 8, GY - 8, N * CS + 16, N * CS + 16); c.clip();
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      c.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)'; c.fillRect(GX + x * CS, GY + y * CS, CS, CS);
      var it = g[y][x], px = GX + (x + 0.5) * CS, py = GY + (y + 0.5) * CS + (it.dy || 0);
      if (swapAnim && (it === swapAnim.a || it === swapAnim.b)) { var e = swapAnim.back ? Math.sin(swapAnim.t * Math.PI) : swapAnim.t; var fromX = it === swapAnim.a ? swapAnim.ax : swapAnim.bx, fromY = it === swapAnim.a ? swapAnim.ay : swapAnim.by, toX = it === swapAnim.a ? swapAnim.bx : swapAnim.ax, toY = it === swapAnim.a ? swapAnim.by : swapAnim.ay; if (swapAnim.back) { px = GX + (A.lerp(fromX, toX, e) + 0.5) * CS; py = GY + (A.lerp(fromY, toY, e) + 0.5) * CS; } else { px = GX + (A.lerp(fromX, toX, e) + 0.5) * CS; py = GY + (A.lerp(fromY, toY, e) + 0.5) * CS; } }
      if (it.c >= 0) gem(c, it, px, py, sel && sel[0] === x && sel[1] === y ? 1.12 : 1);
    }
    c.restore();
    if (sel) { c.strokeStyle = '#fff'; c.lineWidth = 3; A.rr(c, GX + sel[0] * CS + 3, GY + sel[1] * CS + 3, CS - 6, CS - 6, 12); c.stroke(); }
    if (kbd && S.state === 'playing') { c.strokeStyle = '#ffd166'; c.lineWidth = 3; A.rr(c, GX + cur.x * CS + 1, GY + cur.y * CS + 1, CS - 2, CS - 2, 12); c.stroke(); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); var m = document.getElementById('hB'); m.textContent = moves; m.style.color = moves <= 5 ? '#ff4d6d' : ''; document.getElementById('hC').textContent = bestChain; }
  var stage = document.getElementById('stage');
  function cellOf(p) { var x = Math.floor((p.x - GX) / CS), y = Math.floor((p.y - GY) / CS); return x >= 0 && y >= 0 && x < N && y < N ? [x, y] : null; }
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e), c = cellOf(p); if (!c) { sel = null; return; }
    if (sel && Math.abs(sel[0] - c[0]) + Math.abs(sel[1] - c[1]) === 1) { trySwap(sel[0], sel[1], c[0], c[1]); sel = null; return; }
    sel = c; drag = { c: c, x: p.x, y: p.y, id: e.pointerId }; A.sfx('tick'); try { stage.setPointerCapture(e.pointerId); } catch (er) {}
  });
  stage.addEventListener('pointermove', function (e) { if (!drag || drag.id !== e.pointerId) return; var p = S.toLocal(e), dx = p.x - drag.x, dy = p.y - drag.y; if (Math.max(Math.abs(dx), Math.abs(dy)) > CS * 0.4) { var t = Math.abs(dx) > Math.abs(dy) ? [drag.c[0] + Math.sign(dx), drag.c[1]] : [drag.c[0], drag.c[1] + Math.sign(dy)]; trySwap(drag.c[0], drag.c[1], t[0], t[1]); drag = null; sel = null; } });
  stage.addEventListener('pointerup', function () { drag = null; });
  var S = new A.Shell({ id: 'gems', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key, d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] }[k];
      if (d) { if (sel) { trySwap(sel[0], sel[1], sel[0] + d[0], sel[1] + d[1]); sel = null; } else { cur.x = A.clamp(cur.x + d[0], 0, N - 1); cur.y = A.clamp(cur.y + d[1], 0, N - 1); } }
      if ((k === ' ' || k === 'Enter') && !e.repeat) sel = sel ? null : [cur.x, cur.y]; } });
})();
