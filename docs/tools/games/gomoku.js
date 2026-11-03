(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, N = 13;
  var fx = new A.FX();
  var diff = +A.get('neowa_gomoku_diff', '1') || 0, CS = 38, GX = (W - 12 * 38) / 2, GY = 230;
  var bd, turn, moves, hist, wins, score, undo, endT, winLine, thinking, cur = { x: 6, y: 6 }, kbd = false, lastMv = null;
  function reset() { wins = 0; score = 0; newGame(); fx.clear(); hud(); }
  function newGame() { bd = []; for (var i = 0; i < N * N; i++) bd.push(0); turn = 1; moves = 0; hist = []; undo = 3; endT = 0; winLine = null; thinking = 0; lastMv = null; }
  function at(x, y) { return x < 0 || y < 0 || x >= N || y >= N ? -1 : bd[y * N + x]; }
  var DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  function five(x, y, p) { for (var d = 0; d < 4; d++) { var line = [[x, y]]; for (var s = -1; s <= 1; s += 2) { var k = 1; while (at(x + DIRS[d][0] * k * s, y + DIRS[d][1] * k * s) === p) { line.push([x + DIRS[d][0] * k * s, y + DIRS[d][1] * k * s]); k++; } } if (line.length >= 5) return line; } return null; }
  // 한 방향 패턴 점수: 이어진 개수와 열린 끝 수
  function lineScore(x, y, p) {
    var total = 0;
    for (var d = 0; d < 4; d++) {
      var cnt = 1, open = 0;
      for (var s = -1; s <= 1; s += 2) { var k = 1; while (at(x + DIRS[d][0] * k * s, y + DIRS[d][1] * k * s) === p) { cnt++; k++; } if (at(x + DIRS[d][0] * k * s, y + DIRS[d][1] * k * s) === 0) open++; }
      if (cnt >= 5) total += 1e6; else if (cnt === 4) total += open === 2 ? 1e5 : open === 1 ? 1e4 : 0; else if (cnt === 3) total += open === 2 ? 5000 : open === 1 ? 300 : 0; else if (cnt === 2) total += open === 2 ? 200 : open === 1 ? 30 : 0; else total += open * 2;
    }
    return total;
  }
  function aiMove() {
    var best = null, bv = -1, cands = [];
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      if (bd[y * N + x]) continue; var near = false;
      for (var dy = -2; dy <= 2 && !near; dy++) for (var dx = -2; dx <= 2; dx++) if (at(x + dx, y + dy) > 0) { near = true; break; }
      if (!near) continue;
      bd[y * N + x] = 2; var att = lineScore(x, y, 2); bd[y * N + x] = 1; var def = lineScore(x, y, 1); bd[y * N + x] = 0;
      var v = att * [0.7, 1.1, 1.2][diff] + def * [0.6, 1, 1.05][diff] + Math.random() * [800, 60, 5][diff];
      cands.push([v, x, y]); if (v > bv) { bv = v; best = [x, y]; }
    }
    if (!best) best = [6, 6];
    put(best[0], best[1], 2);
  }
  function put(x, y, p) {
    bd[y * N + x] = p; moves++; hist.push([x, y]); lastMv = [x, y]; A.sfx('tick', p === 1 ? 1.3 : 0.9);
    var w = five(x, y, p);
    if (w) { winLine = w; endT = 1.6; if (p === 1) { A.sfx('level'); w.forEach(function (q) { fx.burst(GX + q[0] * CS, GY + q[1] * CS, '#ffd166', 10, 200, 0.5, 3); }); } else { A.sfx('hurt'); fx.flashIt('#ff2244', 0.3); } hud(); return; }
    if (moves >= N * N) { endT = 1.2; winLine = []; hud(); return; }
    turn = p === 1 ? 2 : 1; if (turn === 2) thinking = 0.35; hud();
  }
  function human(x, y) { if (S.state !== 'playing' || turn !== 1 || endT > 0 || thinking > 0 || at(x, y) !== 0) return; put(x, y, 1); }
  function doUndo() { if (undo <= 0 || turn !== 1 || hist.length < 2 || endT > 0) { A.sfx('wall'); return; } for (var k = 0; k < 2; k++) { var m = hist.pop(); bd[m[1] * N + m[0]] = 0; moves--; } undo--; score = Math.max(0, score - 30); lastMv = hist[hist.length - 1] || null; A.sfx('click'); hud(); }
  function update(dt) {
    fx.update(dt);
    if (endT > 0) { endT -= dt; if (endT <= 0) {
      var meWon = winLine && winLine.length && bd[winLine[0][1] * N + winLine[0][0]] === 1;
      if (meWon) { wins++; var pts = Math.max(100, (200 - moves) * 3) * (diff + 1); score += pts; S.banner(wins + '승!', '+' + pts); newGame(); hud(); }
      else if (winLine && !winLine.length) { score += 50; newGame(); hud(); }
      else S.gameOver(score, [['연승', String(wins)], ['난이도', ['쉬움', '보통', '어려움'][diff]]]);
    } return; }
    if (thinking > 0) { thinking -= dt; if (thinking <= 0 && turn === 2) aiMove(); }
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#120c02'; c.fillRect(-10, -10, W + 20, H + 20);
    var g = c.createLinearGradient(0, GY - 30, 0, GY + 12 * CS + 30); g.addColorStop(0, '#d9a85a'); g.addColorStop(1, '#b07a35'); c.fillStyle = g; A.rr(c, GX - 28, GY - 28, 12 * CS + 56, 12 * CS + 56, 14); c.fill();
    c.strokeStyle = 'rgba(60,35,10,.7)'; c.lineWidth = 1.2;
    for (var i = 0; i < N; i++) { c.beginPath(); c.moveTo(GX, GY + i * CS); c.lineTo(GX + 12 * CS, GY + i * CS); c.stroke(); c.beginPath(); c.moveTo(GX + i * CS, GY); c.lineTo(GX + i * CS, GY + 12 * CS); c.stroke(); }
    [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]].forEach(function (p) { c.fillStyle = 'rgba(60,35,10,.8)'; c.beginPath(); c.arc(GX + p[0] * CS, GY + p[1] * CS, 4, 0, 7); c.fill(); });
    if (!bd) newGame();
    for (i = 0; i < N * N; i++) if (bd[i]) {
      var x = GX + (i % N) * CS, y = GY + Math.floor(i / N) * CS, gr = c.createRadialGradient(x - 5, y - 5, 2, x, y, CS * 0.46);
      if (bd[i] === 1) { gr.addColorStop(0, '#666'); gr.addColorStop(1, '#0a0a0a'); } else { gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#c9c2b0'); }
      c.save(); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 4; c.shadowOffsetY = 2; c.fillStyle = gr; c.beginPath(); c.arc(x, y, CS * 0.45, 0, 7); c.fill(); c.restore();
    }
    if (lastMv) { c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(GX + lastMv[0] * CS, GY + lastMv[1] * CS, 4, 0, 7); c.fill(); }
    if (winLine && winLine.length) { c.save(); c.strokeStyle = '#ffd166'; c.lineWidth = 6; c.shadowColor = '#ffd166'; c.shadowBlur = 16; var sorted = winLine.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }); c.beginPath(); c.moveTo(GX + sorted[0][0] * CS, GY + sorted[0][1] * CS); c.lineTo(GX + sorted[sorted.length - 1][0] * CS, GY + sorted[sorted.length - 1][1] * CS); c.stroke(); c.restore(); }
    if (kbd && S.state === 'playing') { c.strokeStyle = '#5ee7ff'; c.lineWidth = 3; c.strokeRect(GX + cur.x * CS - CS / 2 + 2, GY + cur.y * CS - CS / 2 + 2, CS - 4, CS - 4); }
    c.fillStyle = '#ffd166'; c.font = '700 20px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(S.state === 'playing' ? (turn === 1 ? '나(흑) 차례' : '컴퓨터(백) 생각 중…') : '', W / 2, GY - 70);
    var by = GY + 12 * CS + 60; c.fillStyle = undo > 0 ? 'rgba(255,209,102,.15)' : 'rgba(255,255,255,.04)'; A.rr(c, W / 2 - 90, by, 180, 54, 14); c.fill(); c.fillStyle = undo > 0 ? '#ffd166' : 'rgba(255,255,255,.3)'; c.font = '700 17px "Pretendard Variable",system-ui'; c.fillText('무르기 ' + (undo == null ? 3 : undo), W / 2, by + 28);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = wins; document.getElementById('hC').textContent = moves; document.getElementById('hMult').textContent = ['쉬움', '보통', '어려움'][diff]; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e), by = GY + 12 * CS + 60;
    if (p.y > by && p.y < by + 54 && Math.abs(p.x - W / 2) < 90) { doUndo(); return; }
    var x = Math.round((p.x - GX) / CS), y = Math.round((p.y - GY) / CS); if (x >= 0 && y >= 0 && x < N && y < N) human(x, y);
  });
  var dbtns = document.querySelectorAll('[data-diff]');
  function pd() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_gomoku_diff', diff); A.sfx('click'); pd(); }); }); pd();
  var S = new A.Shell({ id: 'gomoku', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key;
      if (k === 'ArrowLeft' || k === 'a') cur.x = Math.max(0, cur.x - 1); if (k === 'ArrowRight' || k === 'd') cur.x = Math.min(N - 1, cur.x + 1); if (k === 'ArrowUp' || k === 'w') cur.y = Math.max(0, cur.y - 1); if (k === 'ArrowDown' || k === 's') cur.y = Math.min(N - 1, cur.y + 1);
      if ((k === ' ' || k === 'Enter') && !e.repeat) human(cur.x, cur.y); if (k === 'u' || k === 'U') doUndo(); } });
})();
