(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, NC = 6;
  var COLS = ['#ff5ec4', '#5ee7ff', '#ffd166', '#7dff9b', '#b48cff', '#ff7a45'];
  var CFG = [{ n: 10, m: 18, b: 100 }, { n: 14, m: 25, b: 250 }, { n: 18, m: 32, b: 500 }];
  var diff = +A.get('neowa_flood_diff', '0') || 0;
  var fx = new A.FX();
  var N, CS, GX, GY, grid, moves, maxM, wins, score, region, ripple, dyingT, nextT;
  function setup() { var cf = CFG[diff]; N = cf.n; maxM = cf.m; CS = Math.floor(500 / N); GX = (W - N * CS) / 2; GY = 130 + (560 - N * CS) / 2; grid = []; for (var i = 0; i < N * N; i++) grid.push(A.irand(0, NC - 1)); moves = 0; ripple = {}; calc(); }
  function calc() { region = {}; var c = grid[0], q = [0]; region[0] = 0; while (q.length) { var i = q.shift(), x = i % N, y = Math.floor(i / N); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = x + d[0], ny = y + d[1], ni = ny * N + nx; if (nx < 0 || ny < 0 || nx >= N || ny >= N || region[ni] != null || grid[ni] !== c) return; region[ni] = region[i] + 1; q.push(ni); }); } }
  function reset() { wins = 0; score = 0; dyingT = 0; nextT = 0; setup(); fx.clear(); hud(); }
  function pick(col) {
    if (S.state !== 'playing' || dyingT > 0 || nextT > 0 || col === grid[0]) return;
    var before = Object.keys(region).length;
    Object.keys(region).forEach(function (k) { grid[k] = col; ripple[k] = region[k] * 0.012; });
    moves++; calc(); var gained = Object.keys(region).length - before; A.sfx('eat', 0.8 + Math.min(1, gained / 20));
    Object.keys(region).forEach(function (k) { if (ripple[k] == null) ripple[k] = region[k] * 0.012; });
    if (Object.keys(region).length === N * N) { var pts = CFG[diff].b + (maxM - moves) * 30; score += pts; wins++; nextT = 1.2; A.sfx('level'); fx.text(W / 2, GY - 30, '완성! +' + pts, '#ffd166', 26); for (var i = 0; i < 4; i++) fx.burst(A.rand(100, W - 100), A.rand(250, 650), COLS[col], 20, 300, 0.7, 4); }
    else if (moves >= maxM) { dyingT = 1.2; A.sfx('hurt'); fx.flashIt('#ff2244', 0.4); }
    hud();
  }
  function update(dt) {
    fx.update(dt); for (var k in ripple) { ripple[k] -= dt; if (ripple[k] < -0.3) delete ripple[k]; }
    if (nextT > 0) { nextT -= dt; if (nextT <= 0) { setup(); S.banner(wins + 1 + '번째 판', '연속 도전'); hud(); } }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['완성한 판', String(wins)], ['크기', N + '×' + N]]); }
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0c0410'; c.fillRect(-10, -10, W + 20, H + 20);
    if (!grid) setup();
    for (var i = 0; i < N * N; i++) {
      var x = i % N, y = Math.floor(i / N), r = ripple[i], s = r != null && r < 0 ? 1 + Math.sin(-r / 0.3 * Math.PI) * 0.18 : 1;
      c.fillStyle = COLS[grid[i]]; var sz = CS * s; c.fillRect(GX + x * CS + (CS - sz) / 2, GY + y * CS + (CS - sz) / 2, sz + 0.5, sz + 0.5);
    }
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.strokeRect(GX - 2, GY - 2, N * CS + 4, N * CS + 4);
    // 색 버튼
    for (var k = 0; k < NC; k++) { var bx = 30 + k * 82, by = 760, cur = grid[0] === k; c.save(); if (!cur) { c.shadowColor = COLS[k]; c.shadowBlur = 14; } c.fillStyle = COLS[k]; c.globalAlpha = cur ? 0.25 : 1; A.rr(c, bx, by, 70, 70, 18); c.fill(); c.restore();
      c.fillStyle = 'rgba(0,0,0,.45)'; c.font = '700 16px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(k + 1), bx + 35, by + 35); }
    c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '600 16px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('왼쪽 위부터 같은 색이 퍼져 나갑니다', W / 2, 870);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); var m = document.getElementById('hB'); m.textContent = moves + '/' + maxM; m.style.color = maxM - moves <= 3 ? '#ff4d6d' : ''; document.getElementById('hC').textContent = wins; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; var p = S.toLocal(e);
    if (p.y > 760 && p.y < 830) { var k = Math.floor((p.x - 30) / 82); if (k >= 0 && k < NC && (p.x - 30) % 82 < 72) pick(k); return; }
    var x = Math.floor((p.x - GX) / CS), y = Math.floor((p.y - GY) / CS); if (x >= 0 && y >= 0 && x < N && y < N) pick(grid[y * N + x]);
  });
  var dbtns = document.querySelectorAll('[data-diff]');
  function paint() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_flood_diff', diff); A.sfx('click'); paint(); grid = null; }); }); paint();
  var S = new A.Shell({ id: 'flood', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if (/^[1-6]$/.test(e.key) && !e.repeat) pick(+e.key - 1); } });
})();
