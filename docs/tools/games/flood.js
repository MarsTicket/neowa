(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, NC = 6;
  var COLS = ['#ff5ec4', '#5ee7ff', '#ffd166', '#7dff9b', '#b48cff', '#ff7a45'];
  var CFG = [{ n: 10, m: 18, b: 100 }, { n: 14, m: 25, b: 250 }, { n: 18, m: 32, b: 500 }];
  var diff = +A.get('neowa_flood_diff', '0') || 0;
  var fx = new A.FX();
  var N, CS, GX, GY, grid, moves, maxM, wins = 0, score, region, ripple, dyingT, nextT, cpu = 0;
  // 컴퓨터 풀이(2수 앞을 보는 욕심쟁이)로 몇 번에 풀리는지 계산 → 제한 횟수 안에 풀 수 있는 판만 냄
  function cpuSolve(g) {
    var R = new Uint8Array(N * N), m = 0, cur = g[0], i; R[0] = 1;
    function grow(Rr, col) { var st = [], add = 0, j; for (j = 0; j < N * N; j++) if (Rr[j]) st.push(j); while (st.length) { j = st.pop(); var x = j % N, y = (j / N) | 0; for (var d = 0; d < 4; d++) { var nx = x + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = y + (d === 2 ? 1 : d === 3 ? -1 : 0); if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; var ni = ny * N + nx; if (Rr[ni] || g[ni] !== col) continue; Rr[ni] = 1; add++; st.push(ni); } } return add; }
    function left(Rr) { var o = {}, n = 0; for (var j = 0; j < N * N; j++) if (!Rr[j] && !o[g[j]]) { o[g[j]] = 1; n++; } return n; }
    grow(R, cur);
    while (m < 99) {
      var t = 0; for (i = 0; i < N * N; i++) t += R[i]; if (t === N * N) return m;
      var best = -1, bc = 0, cl = left(R);
      for (var c = 0; c < NC; c++) { if (c === cur) continue; var R1 = R.slice(), a = grow(R1, c); if (!a) continue; var v = a + (left(R1) < cl ? 1000 : 0), b2 = 0;
        for (var c2 = 0; c2 < NC; c2++) { if (c2 === c) continue; var a2 = grow(R1.slice(), c2); if (a2 > b2) b2 = a2; } v += b2 * 0.9; if (v > best) { best = v; bc = c; } }
      grow(R, bc); cur = bc; m++;
    }
    return m;
  }
  function setup() {
    var cf = CFG[diff], i, tries = 0; N = cf.n; CS = Math.floor(500 / N); GX = (W - N * CS) / 2; GY = 130 + (560 - N * CS) / 2;
    do { grid = []; for (i = 0; i < N * N; i++) grid.push(A.irand(0, NC - 1)); cpu = cpuSolve(grid); } while (cpu > cf.m - 2 && ++tries < 60);
    // 처음엔 컴퓨터보다 4번 넉넉하게, 판을 풀 때마다 1번씩 줄어듦 (컴퓨터 풀이 +1 아래로는 안 내려감)
    maxM = cpu + Math.max(1, 4 - (wins || 0));
    moves = 0; ripple = {}; calc();
  }
  function calc() { region = {}; var c = grid[0], q = [0]; region[0] = 0; while (q.length) { var i = q.shift(), x = i % N, y = Math.floor(i / N); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = x + d[0], ny = y + d[1], ni = ny * N + nx; if (nx < 0 || ny < 0 || nx >= N || ny >= N || region[ni] != null || grid[ni] !== c) return; region[ni] = region[i] + 1; q.push(ni); }); } }
  function reset() { wins = 0; score = 0; dyingT = 0; nextT = 0; setup(); fx.clear(); hud(); }
  function pick(col) {
    if (S.state !== 'playing' || dyingT > 0 || nextT > 0 || col === grid[0]) return;
    var before = Object.keys(region).length;
    Object.keys(region).forEach(function (k) { grid[k] = col; ripple[k] = region[k] * 0.012; });
    moves++; calc(); var gained = Object.keys(region).length - before; A.sfx('eat', 0.8 + Math.min(1, gained / 20));
    Object.keys(region).forEach(function (k) { if (ripple[k] == null) ripple[k] = region[k] * 0.012; });
    if (Object.keys(region).length === N * N) { var beat = moves <= cpu, pts = CFG[diff].b + (maxM - moves) * 30 + (beat ? CFG[diff].b : 0); score += pts; wins++; nextT = 1.2; A.sfx(beat ? 'gold' : 'level'); fx.text(W / 2, GY - 30, (moves < cpu ? '컴퓨터 이김! +' : beat ? '컴퓨터와 동점! +' : '완성! +') + pts, '#ffd166', 26); for (var i = 0; i < 4; i++) fx.burst(A.rand(100, W - 100), A.rand(250, 650), COLS[col], 20, 300, 0.7, 4); }
    else if (moves >= maxM) { dyingT = 1.2; A.sfx('hurt'); fx.flashIt('#ff2244', 0.4); }
    hud();
  }
  function update(dt) {
    fx.update(dt); for (var k in ripple) { ripple[k] -= dt; if (ripple[k] < -0.3) delete ripple[k]; }
    if (nextT > 0) { nextT -= dt; if (nextT <= 0) { setup(); S.banner(wins + 1 + '번째 판', '제한 ' + maxM + '번'); hud(); } }
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
    for (var k = 0; k < NC; k++) { var bx = 30 + k * 82, by = 760, cur = grid[0] === k; c.save(); if (!cur) { c.fillStyle = A.hexA(COLS[k], 0.22); A.rr(c, bx - 5, by - 5, 80, 80, 22); c.fill(); } c.fillStyle = COLS[k]; c.globalAlpha = cur ? 0.25 : 1; A.rr(c, bx, by, 70, 70, 18); c.fill(); c.restore();
      c.fillStyle = 'rgba(0,0,0,.45)'; c.font = '700 16px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(k + 1), bx + 35, by + 35); }
    c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '600 16px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('왼쪽 위부터 같은 색이 퍼져 나갑니다', W / 2, 870);
    if (cpu) { c.fillStyle = 'rgba(255,209,102,.8)'; c.font = '600 15px "Pretendard Variable",system-ui'; c.fillText('컴퓨터는 ' + cpu + '번에 풀었어요 · 같거나 적으면 보너스', W / 2, 900); }
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
