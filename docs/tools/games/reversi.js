(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, N = 8, CS = 60, GX = (540 - 480) / 2, GY = 230;
  var fx = new A.FX();
  var diff = +A.get('neowa_reversi_diff', '1') || 0;
  var WT = [100, -20, 10, 5, 5, 10, -20, 100, -20, -50, -2, -2, -2, -2, -50, -20, 10, -2, 1, 1, 1, 1, -2, 10, 5, -2, 1, 0, 0, 1, -2, 5, 5, -2, 1, 0, 0, 1, -2, 5, 10, -2, 1, 1, 1, 1, -2, 10, -20, -50, -2, -2, -2, -2, -50, -20, 100, -20, 10, 5, 5, 10, -20, 100];
  var bd, turn, wins, score, thinking, endT, flips = {}, cur = { x: 3, y: 2 }, kbd = false, passMsg = 0, lastMv = null;
  function newGame() { bd = []; for (var i = 0; i < 64; i++) bd.push(0); bd[27] = 2; bd[28] = 1; bd[35] = 1; bd[36] = 2; turn = 1; thinking = 0; endT = 0; flips = {}; lastMv = null; }
  function reset() { wins = 0; score = 0; newGame(); fx.clear(); hud(); }
  function flipsFor(b, i, p) {
    if (b[i]) return []; var x = i % N, y = Math.floor(i / N), out = [];
    [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (d) {
      var line = [], k = 1; while (true) { var nx = x + d[0] * k, ny = y + d[1] * k; if (nx < 0 || ny < 0 || nx >= N || ny >= N) { line = []; break; } var v = b[ny * N + nx]; if (v === 3 - p) { line.push(ny * N + nx); k++; } else { if (v !== p) line = []; break; } }
      out = out.concat(line);
    });
    return out;
  }
  function moves(b, p) { var r = []; for (var i = 0; i < 64; i++) if (!b[i]) { var f = flipsFor(b, i, p); if (f.length) r.push({ i: i, f: f }); } return r; }
  function apply(b, m, p) { var nb = b.slice(); nb[m.i] = p; m.f.forEach(function (k) { nb[k] = p; }); return nb; }
  function evalB(b) { var s = 0; for (var i = 0; i < 64; i++) if (b[i] === 2) s += WT[i]; else if (b[i] === 1) s -= WT[i]; return s + (moves(b, 2).length - moves(b, 1).length) * 3; }
  function aiPick(ms) {
    if (diff === 0) return Math.random() < 0.5 ? A.pick(ms) : ms.reduce(function (a, b) { return b.f.length > a.f.length ? b : a; });
    if (diff === 1) return ms.reduce(function (a, m) { var v = WT[m.i] + m.f.length; return v > a.v ? { v: v, m: m } : a; }, { v: -1e9 }).m;
    var best = null, bv = -1e9;
    ms.forEach(function (m) { var b1 = apply(bd, m, 2), opp = moves(b1, 1), worst = 1e9;
      if (!opp.length) worst = evalB(b1); else opp.forEach(function (o) { var b2 = apply(b1, o, 1), mine = moves(b2, 2), bestR = -1e9; if (!mine.length) bestR = evalB(b2); else mine.forEach(function (q) { bestR = Math.max(bestR, evalB(apply(b2, q, 2))); }); worst = Math.min(worst, bestR); });
      if (worst > bv) { bv = worst; best = m; } });
    return best;
  }
  function play(m, p) {
    bd = apply(bd, m, p); lastMv = m.i; m.f.forEach(function (k, n) { flips[k] = -n * 0.04; }); flips[m.i] = 0;
    A.sfx('tick', p === 1 ? 1.3 : 0.9); if (m.f.length >= 4) A.sfx('coin', 1 + m.f.length * 0.03);
    next(3 - p);
  }
  function next(p) {
    if (moves(bd, p).length) { turn = p; if (p === 2) thinking = 0.5; }
    else if (moves(bd, 3 - p).length) { turn = 3 - p; passMsg = 1.2; if (turn === 2) thinking = 0.6; }
    else { turn = 0; endT = 1.5; }
    hud();
  }
  function cnt(p) { return bd.filter(function (v) { return v === p; }).length; }
  function human(i) { if (S.state !== 'playing' || turn !== 1 || thinking > 0 || endT > 0) return; var f = flipsFor(bd, i, 1); if (!f.length) { A.sfx('wall'); return; } play({ i: i, f: f }, 1); }
  function update(dt) {
    fx.update(dt); for (var k in flips) { flips[k] += dt; if (flips[k] > 0.35) delete flips[k]; } if (passMsg > 0) passMsg -= dt;
    if (endT > 0) { endT -= dt; if (endT <= 0) { var me = cnt(1), cp = cnt(2);
      if (me > cp) { wins++; var pts = (me - cp) * 10 * (diff + 1) + 100 * (diff + 1); score += pts; S.banner(wins + '승! ' + me + ':' + cp, '+' + pts); A.sfx('level'); newGame(); hud(); }
      else if (me === cp) { score += 50; S.banner('무승부', '+50'); newGame(); hud(); }
      else S.gameOver(score, [['연승', String(wins)], ['마지막', me + ' : ' + cp]]); } return; }
    if (thinking > 0) { thinking -= dt; if (thinking <= 0 && turn === 2) { var ms = moves(bd, 2); if (ms.length) play(aiPick(ms), 2); else next(1); } }
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#031008'; c.fillRect(-10, -10, W + 20, H + 20);
    if (!bd) newGame();
    c.fillStyle = '#0d4a26'; A.rr(c, GX - 10, GY - 10, 500, 500, 16); c.fill();
    var legal = S.state === 'playing' && turn === 1 && thinking <= 0 ? moves(bd, 1).map(function (m) { return m.i; }) : [];
    for (var i = 0; i < 64; i++) {
      var x = GX + (i % N) * CS, y = GY + Math.floor(i / N) * CS;
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5; c.strokeRect(x, y, CS, CS);
      if (legal.indexOf(i) >= 0) { c.fillStyle = 'rgba(125,255,155,.35)'; c.beginPath(); c.arc(x + CS / 2, y + CS / 2, 7, 0, 7); c.fill(); }
      if (bd[i]) {
        var f = flips[i], sx = f != null && f > 0 ? Math.abs(Math.cos(Math.min(1, f / 0.35) * Math.PI)) : 1, col = bd[i] === 1 ? '#111' : '#f4f5fb';
        if (f != null && f > 0 && f < 0.175) col = bd[i] === 1 ? '#f4f5fb' : '#111';
        if (f != null && f < 0) col = bd[i] === 1 ? '#f4f5fb' : '#111';
        c.save(); c.translate(x + CS / 2, y + CS / 2); c.scale(Math.max(0.08, sx), 1); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 5; c.shadowOffsetY = 2; c.fillStyle = col; c.beginPath(); c.arc(0, 0, CS * 0.4, 0, 7); c.fill(); c.restore();
      }
      if (lastMv === i) { c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(x + CS / 2, y + CS / 2, 4, 0, 7); c.fill(); }
    }
    if (kbd && S.state === 'playing') { c.strokeStyle = '#7dff9b'; c.lineWidth = 3; c.strokeRect(GX + cur.x * CS + 2, GY + cur.y * CS + 2, CS - 4, CS - 4); }
    c.fillStyle = '#7dff9b'; c.font = '700 20px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(passMsg > 0 ? '둘 곳이 없어 차례가 넘어갑니다' : S.state === 'playing' ? (turn === 1 ? '나(흑) 차례' : turn === 2 ? '컴퓨터 생각 중…' : '') : '', W / 2, GY - 60);
    c.font = '700 24px "Pretendard Variable",system-ui'; c.fillStyle = '#fff'; c.fillText('나(흑) ' + cnt(1) + '  :  ' + cnt(2) + ' 컴퓨터(백)', W / 2, GY + 540);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = cnt(1) + ' : ' + cnt(2); document.getElementById('hC').textContent = wins; document.getElementById('hMult').textContent = ['쉬움', '보통', '어려움'][diff]; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e), x = Math.floor((p.x - GX) / CS), y = Math.floor((p.y - GY) / CS); if (x >= 0 && y >= 0 && x < N && y < N) human(y * N + x); });
  var dbtns = document.querySelectorAll('[data-diff]');
  function pd() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_reversi_diff', diff); A.sfx('click'); pd(); }); }); pd();
  var S = new A.Shell({ id: 'reversi', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key;
      if (k === 'ArrowLeft' || k === 'a') cur.x = Math.max(0, cur.x - 1); if (k === 'ArrowRight' || k === 'd') cur.x = Math.min(N - 1, cur.x + 1); if (k === 'ArrowUp' || k === 'w') cur.y = Math.max(0, cur.y - 1); if (k === 'ArrowDown' || k === 's') cur.y = Math.min(N - 1, cur.y + 1);
      if ((k === ' ' || k === 'Enter') && !e.repeat) human(cur.y * N + cur.x); } });
})();
