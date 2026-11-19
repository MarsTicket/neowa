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
  /* 그림: 광택 있는 색 칸(색·칸 크기별 캐시), 물감 통 버튼(색마다 무늬가 달라 색 구분이 어려워도 고를 수 있음), 화실 배경 */
  var MARK = ['●', '▲', '■', '◆', '★', '♥'];
  function cellSpr(k, cs) {
    return A.sprite('fl2' + k + '_' + cs, cs, cs, function (x) {
      x.fillStyle = COLS[k]; x.fillRect(0, 0, cs, cs); x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(0, 0, cs, Math.max(1, cs * 0.14));
      x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, cs - Math.max(1, cs * 0.12), cs, Math.max(1, cs * 0.12));
    });
  }
  function potSpr(k) {
    return A.sprite('flpot' + k, 76, 76, function (x) {
      x.translate(38, 38);
      var gl = x.createRadialGradient(0, 0, 20, 0, 0, 38); gl.addColorStop(0, A.hexA(COLS[k], 0.45)); gl.addColorStop(1, A.hexA(COLS[k], 0)); x.fillStyle = gl; x.fillRect(-38, -38, 76, 76);
      x.fillStyle = 'rgba(0,0,0,.4)'; A.rr(x, -31, -29, 64, 66, 18); x.fill();
      var g = x.createLinearGradient(0, -33, 0, 33); g.addColorStop(0, '#ffffff'); g.addColorStop(0.2, COLS[k]); g.addColorStop(1, A.hexA(COLS[k], 0.75));
      x.fillStyle = g; A.rr(x, -33, -33, 66, 66, 18); x.fill();
      x.fillStyle = 'rgba(255,255,255,.5)'; A.rr(x, -26, -29, 52, 10, 5); x.fill();
      x.fillStyle = 'rgba(0,0,0,.35)'; x.font = '900 22px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(MARK[k], 0, 4);
    });
  }
  var FBG = A.sprite('flbg', W, H, function (x) {
    var g = x.createRadialGradient(W / 2, H * 0.4, 30, W / 2, H * 0.4, 640); g.addColorStop(0, '#2a1030'); g.addColorStop(1, '#08020a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 40; i++) { x.fillStyle = A.hexA(COLS[i % 6], 0.06); x.beginPath(); x.arc(Math.random() * W, Math.random() * H, 6 + Math.random() * 30, 0, 7); x.fill(); }
  });
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(FBG, -10, -10, W + 20, H + 20);
    if (!grid) setup();
    // 액자
    c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(GX - 8, GY - 4, N * CS + 18, N * CS + 18);
    var fg = c.createLinearGradient(GX - 12, GY - 12, GX + N * CS + 12, GY + N * CS + 12); fg.addColorStop(0, '#e8d0a8'); fg.addColorStop(0.5, '#7a5a3a'); fg.addColorStop(1, '#c8a878'); c.fillStyle = fg; c.fillRect(GX - 12, GY - 12, N * CS + 24, N * CS + 24);
    for (var i = 0; i < N * N; i++) {
      var x = i % N, y = Math.floor(i / N), r = ripple[i], s = r != null && r < 0 ? 1 + Math.sin(-r / 0.3 * Math.PI) * 0.18 : 1;
      var sz = CS * s; c.drawImage(cellSpr(grid[i], CS), GX + x * CS + (CS - sz) / 2, GY + y * CS + (CS - sz) / 2, sz + 0.5, sz + 0.5);
    }
    // 색 버튼
    for (var k = 0; k < NC; k++) { var bx = 30 + k * 82, by = 760, cur = grid[0] === k; c.globalAlpha = cur ? 0.3 : 1; c.drawImage(potSpr(k), bx - 3, by - 3, 76, 76); c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '700 13px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(k + 1), bx + 35, by + 84); }
    c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '600 16px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('왼쪽 위부터 같은 색이 퍼져 나갑니다', W / 2, 880);
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
