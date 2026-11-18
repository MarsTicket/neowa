(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, N = 8, CS = 62, GX = (540 - 8 * 62) / 2, GY = 220, NC = 6, land = false;
  // 세로: 540×960 / 가로 화면: 720×720 정사각형 판 (점수판은 오른쪽 패널)
  function geo(sh) { land = !!sh.land; W = sh.W; H = sh.H; if (land) { CS = 82; GX = GY = (720 - N * CS) / 2; } else { CS = 62; GX = (540 - N * CS) / 2; GY = 220; } }
  function msgY() { return land ? H / 2 : GY - 30; }
  var COLS = ['#ff4d6d', '#ffd166', '#7dff9b', '#5ee7ff', '#b48cff', '#ff7aa8'];
  var fx = new A.FX();
  var g, moves, score, chain, bestChain, busy, sel, drag = null, cur = { x: 3, y: 3 }, kbd = false, dyingT, falling, idleT = 0, hintMv = null, chainBonus = false;
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
  function findMove() {
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) for (var d = 0; d < 2; d++) {
      var nx = x + (d ? 0 : 1), ny = y + (d ? 1 : 0); if (nx >= N || ny >= N) continue;
      var a = g[y][x], b = g[ny][nx]; if (a.sp === 'bomb' || b.sp === 'bomb') return [x, y, nx, ny];
      g[y][x] = b; g[ny][nx] = a; var m = findMatches().length; g[y][x] = a; g[ny][nx] = b; if (m) return [x, y, nx, ny];
    }
    return null;
  }
  function hasMove() { return !!findMove(); }
  function blastCells(set, x, y) {
    var it = g[y][x]; if (set[x + ',' + y]) return; set[x + ',' + y] = 1;
    if (it.sp === 'h') for (var k = 0; k < N; k++) blastCells(set, k, y);
    if (it.sp === 'v') for (k = 0; k < N; k++) blastCells(set, x, k);
  }
  function resolve(swapA, swapB) {
    var runs = findMatches(); if (!runs.length) return false;
    chain++; bestChain = Math.max(bestChain, chain);
    if (chain === 3 && !chainBonus) { chainBonus = true; moves++; fx.text(W / 2, land ? H / 2 + 44 : GY + N * CS + 40, '3연쇄 보너스: 이동 +1', '#7dff9b', 22); A.sfx('power'); }
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
    var pts = n * 10 * chain; score += pts; fx.text(W / 2, msgY(), (chain > 1 ? chain + '연쇄 ' : '') + '+' + pts, chain > 1 ? '#ffd166' : '#fff', chain > 1 ? 26 : 20);
    A.sfx('match', 1 + Math.min(chain, 12) * 0.06); if (chain > 1) A.sfx('combo', 1 + Math.min(chain, 12) * 0.05); if (make.length) A.sfx('power', 1.2); fx.shake(Math.min(10, 2 + n * 0.3), 0.15);
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
    score += n * 30; fx.flashIt('#ffffff', 0.4); A.sfx('bigboom'); fx.text(W / 2, msgY(), '색 폭탄! +' + n * 30, '#ffd166', 28); collapse();
  }
  function trySwap(x1, y1, x2, y2) {
    if (busy > 0 || dyingT > 0 || S.state !== 'playing' || !at(x2, y2) || Math.abs(x1 - x2) + Math.abs(y1 - y2) !== 1) return;
    var a = g[y1][x1], b = g[y2][x2]; chain = 0; chainBonus = false; idleT = 0; hintMv = null;
    if (a.sp === 'bomb' || b.sp === 'bomb') { moves--; var bomb = a.sp === 'bomb' ? [x1, y1, b.c] : [x2, y2, a.c]; colorBomb(bomb[0], bomb[1], bomb[2] === 9 ? A.irand(0, NC - 1) : bomb[2]); hud(); return; }
    g[y1][x1] = b; g[y2][x2] = a; a.yy = y2; b.yy = y1;
    swapAnim = { a: a, b: b, ax: x1, ay: y1, bx: x2, by: y2, t: 0 };
    if (!findMatches().length) { g[y1][x1] = a; g[y2][x2] = b; a.yy = y1; b.yy = y2; swapAnim.back = true; A.sfx('wrong'); busy = 0.25; return; }
    moves--; A.sfx('slide', 1.3); if (moves > 0 && moves <= 3) A.sfx('warn'); busy = 0.18; pendingSwap = [[x2, y2], [x1, y1]]; hud();
  }
  var swapAnim = null, pendingSwap = null;
  function reset() { fill(); for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) g[y][x].yy = y; moves = 30; score = 0; chain = 0; bestChain = 0; busy = 0; sel = null; dyingT = 0; idleT = 0; hintMv = null; fx.clear(); hud(); }
  function update(dt) {
    fx.update(dt);
    if (swapAnim) { swapAnim.t += dt * 6; if (swapAnim.t >= 1) swapAnim = null; }
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) { var it = g[y][x]; if (it.dy) { it.dy = it.dy < 0 ? Math.min(0, it.dy + dt * 1400) : 0; } }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['최대 연쇄', String(bestChain)]], { kick: 'FINISH', win: true }); return; }
    // 6초 동안 아무것도 안 하면 바꿀 수 있는 두 보석을 살짝 알려 줌
    if (busy <= 0 && !swapAnim) { idleT += dt; if (idleT > 6 && !hintMv) hintMv = findMove(); }
    if (busy > 0) { busy -= dt; if (busy <= 0) {
      if (pendingSwap) { var ps = pendingSwap; pendingSwap = null; resolve(ps[0], ps[1]); }
      else if (!resolve()) { if (moves <= 0) { dyingT = 1; A.sfx('win'); } else if (!hasMove()) { fx.text(W / 2, H / 2, '섞는 중…', '#fff', 24); A.sfx('whoosh'); hintMv = null; idleT = 0; fill(); for (y = 0; y < N; y++) for (x = 0; x < N; x++) g[y][x].yy = y; } }
    } }
    hud();
  }
  /* 그림: 면이 깎인 보석(색·모양별 캐시, 매 장면 shadowBlur 없음), 폭탄 보석, 벨벳 보석함 배경 */
  function gemSpr(ci) {
    return A.sprite('gem' + ci, 60, 60, function (x) {
      x.translate(30, 30); var col = COLS[ci], r = 23.5, sides = [6, 4, 5, 8, 3, 0][ci % 6];
      var gl = x.createRadialGradient(0, 0, r * 0.7, 0, 0, r + 6); gl.addColorStop(0, A.hexA(col, 0.4)); gl.addColorStop(1, A.hexA(col, 0)); x.fillStyle = gl; x.fillRect(-30, -30, 60, 60);
      var pts = [];
      if (!sides) { for (var k = 0; k < 16; k++) { var a = k / 16 * Math.PI * 2; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } }
      else for (k = 0; k < sides; k++) { a = k / sides * Math.PI * 2 - Math.PI / 2; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
      var n = pts.length;
      for (k = 0; k < n; k++) {
        var p1 = pts[k], p2 = pts[(k + 1) % n], mid = Math.atan2(p1[1] + p2[1], p1[0] + p2[0]), lit = Math.cos(mid + 2.2);
        x.fillStyle = col; x.beginPath(); x.moveTo(p1[0] * 0.5, p1[1] * 0.5); x.lineTo(p1[0], p1[1]); x.lineTo(p2[0], p2[1]); x.lineTo(p2[0] * 0.5, p2[1] * 0.5); x.closePath(); x.fill();
        x.fillStyle = lit > 0 ? 'rgba(255,255,255,' + lit * 0.45 + ')' : 'rgba(0,0,40,' + (-lit) * 0.4 + ')'; x.fill();
      }
      var tg = x.createLinearGradient(-r * 0.5, -r * 0.5, r * 0.5, r * 0.5); tg.addColorStop(0, '#ffffff'); tg.addColorStop(0.45, col); tg.addColorStop(1, col);
      x.fillStyle = tg; x.beginPath(); for (k = 0; k < n; k++) x.lineTo(pts[k][0] * 0.5, pts[k][1] * 0.5); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 1; x.stroke();
      x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 1.2; x.beginPath(); for (k = 0; k < n; k++) x.lineTo(pts[k][0], pts[k][1]); x.closePath(); x.stroke();
      x.fillStyle = '#fff'; x.beginPath(); x.ellipse(-r * 0.3, -r * 0.35, r * 0.16, r * 0.07, -0.6, 0, 7); x.fill();
    });
  }
  var BOMBG = A.sprite('gembomb', 60, 60, function (x) {
    x.translate(30, 30); var r = 23;
    var gl = x.createRadialGradient(0, 0, 4, 0, 0, 30); gl.addColorStop(0, 'rgba(255,255,255,.6)'); gl.addColorStop(1, 'rgba(180,140,255,0)'); x.fillStyle = gl; x.fillRect(-30, -30, 60, 60);
    var g = x.createRadialGradient(-6, -8, 2, 0, 0, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#d0b8ff'); g.addColorStop(0.7, '#b48cff'); g.addColorStop(1, '#ff4d6d');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 2; for (var k = 0; k < 8; k++) { var a = k / 8 * Math.PI * 2; x.beginPath(); x.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); x.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); x.stroke(); }
  });
  // 화면 크기(세로/가로)별로 따로 그림
  function boxSpr() { return A.sprite('gembox' + W + 'x' + H + '_' + GX + '_' + GY + '_' + CS, W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a0820'); g.addColorStop(1, '#0a020a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 40; i++) { x.strokeStyle = 'rgba(255,122,168,.04)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-100 + i * 30, 0); x.lineTo(i * 30 + 200, H); x.stroke(); }
    // 금 테두리 보석함
    var bx = GX - 14, by = GY - 14, bw = N * CS + 28;
    x.fillStyle = 'rgba(0,0,0,.5)'; A.rr(x, bx + 4, by + 8, bw, bw, 22); x.fill();
    var fg = x.createLinearGradient(bx, by, bx + bw, by + bw); fg.addColorStop(0, '#ffe2a0'); fg.addColorStop(0.5, '#a0701a'); fg.addColorStop(1, '#ffd166');
    x.fillStyle = fg; A.rr(x, bx, by, bw, bw, 22); x.fill();
    x.fillStyle = '#3a0a28'; A.rr(x, bx + 6, by + 6, bw - 12, bw - 12, 17); x.fill();
    for (var yy = 0; yy < N; yy++) for (var xx = 0; xx < N; xx++) { var cg = x.createRadialGradient(GX + (xx + 0.5) * CS, GY + (yy + 0.5) * CS, 4, GX + (xx + 0.5) * CS, GY + (yy + 0.5) * CS, CS * 0.6); cg.addColorStop(0, (xx + yy) % 2 ? '#4a1236' : '#561640'); cg.addColorStop(1, (xx + yy) % 2 ? '#2a0820' : '#320a26'); x.fillStyle = cg; A.rr(x, GX + xx * CS + 2, GY + yy * CS + 2, CS - 4, CS - 4, 10); x.fill(); }
    [[bx + 4, by + 4], [bx + bw - 4, by + 4], [bx + 4, by + bw - 4], [bx + bw - 4, by + bw - 4]].forEach(function (p) { x.fillStyle = '#fff3c8'; x.beginPath(); x.arc(p[0], p[1], 5, 0, 7); x.fill(); x.fillStyle = '#c08a20'; x.beginPath(); x.arc(p[0], p[1], 3, 0, 7); x.fill(); });
  }); }
  function gem(c, it, px, py, s) {
    var r = CS * 0.38 * s, k = r / 23.5;
    if (it.sp === 'bomb') { A.draw(c, BOMBG, px, py, k * (1 + Math.sin(S.time * 6) * 0.05), S.time * 2); return; }
    A.draw(c, gemSpr(it.c % 6), px, py, k);
    if (it.sp === 'h' || it.sp === 'v') { c.save(); c.translate(px, py); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3; c.beginPath(); var w = r * (0.8 + Math.sin(S.time * 8) * 0.2); if (it.sp === 'h') { c.moveTo(-w, 0); c.lineTo(w, 0); } else { c.moveTo(0, -w); c.lineTo(0, w); } c.stroke(); c.restore(); }
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(boxSpr(), -10, -10, W + 20, H + 20);
    if (!g) { fill(); for (var yy = 0; yy < N; yy++) for (var xx = 0; xx < N; xx++) g[yy][xx].yy = yy; }
    c.save(); c.beginPath(); c.rect(GX - 8, GY - 8, N * CS + 16, N * CS + 16); c.clip();
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var it = g[y][x], px = GX + (x + 0.5) * CS, py = GY + (y + 0.5) * CS + (it.dy || 0);
      if (swapAnim && (it === swapAnim.a || it === swapAnim.b)) { var e = swapAnim.back ? Math.sin(swapAnim.t * Math.PI) : swapAnim.t; var fromX = it === swapAnim.a ? swapAnim.ax : swapAnim.bx, fromY = it === swapAnim.a ? swapAnim.ay : swapAnim.by, toX = it === swapAnim.a ? swapAnim.bx : swapAnim.ax, toY = it === swapAnim.a ? swapAnim.by : swapAnim.ay; if (swapAnim.back) { px = GX + (A.lerp(fromX, toX, e) + 0.5) * CS; py = GY + (A.lerp(fromY, toY, e) + 0.5) * CS; } else { px = GX + (A.lerp(fromX, toX, e) + 0.5) * CS; py = GY + (A.lerp(fromY, toY, e) + 0.5) * CS; } }
      var hs = hintMv && ((hintMv[0] === x && hintMv[1] === y) || (hintMv[2] === x && hintMv[3] === y)) ? 1 + 0.1 * Math.abs(Math.sin(S.time * 6)) : 1;
      if (it.c >= 0) gem(c, it, px, py, sel && sel[0] === x && sel[1] === y ? 1.12 : hs);
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
    if (sel && sel[0] === c[0] && sel[1] === c[1]) { sel = null; return; }
    sel = c; drag = { c: c, x: p.x, y: p.y, id: e.pointerId }; A.sfx('select'); try { stage.setPointerCapture(e.pointerId); } catch (er) {}
  });
  stage.addEventListener('pointermove', function (e) { if (!drag || drag.id !== e.pointerId) return; var p = S.toLocal(e), dx = p.x - drag.x, dy = p.y - drag.y; if (Math.max(Math.abs(dx), Math.abs(dy)) > CS * 0.4) { var t = Math.abs(dx) > Math.abs(dy) ? [drag.c[0] + Math.sign(dx), drag.c[1]] : [drag.c[0], drag.c[1] + Math.sign(dy)]; trySwap(drag.c[0], drag.c[1], t[0], t[1]); drag = null; sel = null; } });
  stage.addEventListener('pointerup', function () { drag = null; });
    // 가로 화면 패널: 점수판 복사본 + 큰 버튼 (게임판 위 점수판은 가로에서 숨김)
  function landPanel(btns) {
    var hudEl = document.querySelector('.g-hud'), ids = ['hA', 'hB', 'hC'], h = '<div class="g-card gp-stats">';
    hudEl.setAttribute('data-land-hide', '');
    ids.forEach(function (id) { var v = document.getElementById(id), lb = v.parentNode.querySelector('.h-lb'); h += '<div><span>' + (lb ? lb.textContent : '') + '</span><b id="pk' + id + '" style="font-size:22px"></b></div>'; });
    h += '</div><div id="pkMult" style="min-height:18px;padding:0 6px;font-size:14px;font-weight:700;color:var(--accent)"></div>' + (btns || '');
    S.panelSlot.innerHTML = h;
    function sync() { ids.forEach(function (id) { var v = document.getElementById(id), d = document.getElementById('pk' + id); d.textContent = v.textContent; d.style.color = v.style.color; }); var m = document.getElementById('hMult'); document.getElementById('pkMult').textContent = m ? m.textContent : ''; }
    new MutationObserver(sync).observe(hudEl, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style'] });
    sync();
  }
  var S = new A.Shell({ id: 'gems', W: W, H: H, land: [720, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key, d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] }[k];
      if (d) { if (sel) { trySwap(sel[0], sel[1], sel[0] + d[0], sel[1] + d[1]); sel = null; } else { cur.x = A.clamp(cur.x + d[0], 0, N - 1); cur.y = A.clamp(cur.y + d[1], 0, N - 1); } }
      if ((k === ' ' || k === 'Enter') && !e.repeat) { sel = sel ? null : [cur.x, cur.y]; A.sfx('select'); } } });
  landPanel('');
})();
