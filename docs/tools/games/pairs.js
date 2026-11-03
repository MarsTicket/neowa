(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CW = 58, CH = 70, FONT = 30;
  var SYM = ['★', '♥', '♦', '♣', '♠', '●', '▲', '■', '☀', '☾', '✿', '♪', '✚', '⚡', '☂', '✈'];
  var COL = ['#ffd166', '#ff4d6d', '#5ee7ff', '#7dff9b', '#b48cff', '#ff7a45', '#ff9ecf', '#c3ff5e', '#ffe066', '#9be7ff', '#ff5ec4', '#4dffd2', '#ffb547', '#7aa2ff', '#5effc8', '#ff9e4d'];
  var fx = new A.FX();
  var COLS, ROWS, GX, GY, b, sel, time, score, stage, path, pathT, combo, dyingT, cur = { x: 0, y: 0 }, kbd = false, hintPair = null;
  // 판: (COLS+2)×(ROWS+2), 바깥 테두리는 항상 빈칸 (선이 판 밖으로 돌아 나갈 수 있게)
  function idx(x, y) { return y * (COLS + 2) + x; }
  function setup() {
    COLS = Math.min(8, 6 + Math.floor(stage / 2)); ROWS = Math.min(10, 6 + stage); if ((COLS * ROWS) % 2) ROWS--;
    CW = Math.min(64, Math.floor(530 / (COLS + 2))); CH = Math.min(78, Math.floor(720 / (ROWS + 2)), Math.round(CW * 1.25)); FONT = Math.round(CW * 0.52);
    GX = (W - (COLS + 2) * CW) / 2; GY = 140 + (720 - (ROWS + 2) * CH) / 2;
    var kinds = Math.min(SYM.length, 6 + stage * 2), list = [];
    for (var i = 0; i < COLS * ROWS / 2; i++) { var k = i % kinds; list.push(k, k); }
    shuffle(list);
    b = []; for (i = 0; i < (COLS + 2) * (ROWS + 2); i++) b.push(-1);
    var n = 0; for (var y = 1; y <= ROWS; y++) for (var x = 1; x <= COLS; x++) b[idx(x, y)] = list[n++];
    if (!findPair()) setup();
    sel = null; path = null; hintPair = null;
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = A.irand(0, i), t = a[i]; a[i] = a[j]; a[j] = t; } }
  // 최소 꺾임 수 BFS로 두 칸 사이 경로 찾기 (2번 이하로 꺾임)
  function connect(a, z) {
    var Wd = COLS + 2, Hd = ROWS + 2, ax = a % Wd, ay = Math.floor(a / Wd), zx = z % Wd, zy = Math.floor(z / Wd);
    var D = [[1, 0], [-1, 0], [0, 1], [0, -1]], best = {}, q = [];
    for (var d = 0; d < 4; d++) q.push({ x: ax, y: ay, d: d, t: 0, p: [[ax, ay]] });
    while (q.length) {
      var s = q.shift(), nx = s.x + D[s.d][0], ny = s.y + D[s.d][1];
      if (nx < 0 || ny < 0 || nx >= Wd || ny >= Hd) continue;
      var np = s.p.concat([[nx, ny]]);
      if (nx === zx && ny === zy) return np;
      if (b[ny * Wd + nx] !== -1) continue;
      for (var nd = 0; nd < 4; nd++) { var t = s.t + (nd === s.d ? 0 : 1); if (t > 2) continue; var key = nx + ',' + ny + ',' + nd; if (best[key] != null && best[key] <= t) continue; best[key] = t; if (nd === s.d) q.unshift({ x: nx, y: ny, d: nd, t: t, p: np }); else q.push({ x: nx, y: ny, d: nd, t: t, p: np }); }
    }
    return null;
  }
  function findPair() {
    var tiles = []; b.forEach(function (v, i) { if (v >= 0) tiles.push(i); });
    for (var i = 0; i < tiles.length; i++) for (var j = i + 1; j < tiles.length; j++) if (b[tiles[i]] === b[tiles[j]] && connect(tiles[i], tiles[j])) return [tiles[i], tiles[j]];
    return null;
  }
  function reshuffle() { var vals = [], pos = []; b.forEach(function (v, i) { if (v >= 0) { vals.push(v); pos.push(i); } }); for (var t = 0; t < 20; t++) { shuffle(vals); pos.forEach(function (p, k) { b[p] = vals[k]; }); if (findPair()) break; } fx.text(W / 2, H / 2, '섞는 중…', '#fff', 24); A.sfx('turn'); }
  function reset() { stage = 1; time = 120; score = 0; combo = 0; dyingT = 0; setup(); fx.clear(); hud(); }
  function choose(i) {
    if (S.state !== 'playing' || dyingT > 0 || b[i] < 0) return;
    if (sel == null) { sel = i; A.sfx('tick', 1.2); return; }
    if (sel === i) { sel = null; return; }
    if (b[sel] !== b[i]) { sel = i; A.sfx('tick', 1.2); return; }
    var p = connect(sel, i);
    if (!p) { A.sfx('wall'); combo = 0; sel = i; return; }
    path = p; pathT = 0.3; combo++; var pts = 10 * Math.min(5, combo); score += pts;
    [sel, i].forEach(function (k) { var x = k % (COLS + 2), y = Math.floor(k / (COLS + 2)); fx.burst(GX + (x + 0.5) * CW, GY + (y + 0.5) * CH, COL[b[k]], 10, 200, 0.4, 3); b[k] = -1; });
    A.sfx('coin', 1 + Math.min(combo, 10) * 0.05); sel = null; hintPair = null;
    if (b.every(function (v) { return v < 0; })) { var bonus = Math.round(time * 3) + stage * 100; score += bonus; time += 45; stage++; fx.text(W / 2, H / 2, '판 클리어! +' + bonus, '#c3ff5e', 26); A.sfx('level'); setup(); S.banner('STAGE ' + stage, '+45초'); }
    else if (!findPair()) reshuffle();
    hud();
  }
  function hint() { var p = findPair(); if (p) { hintPair = p; time = Math.max(0, time - 5); fx.text(W / 2, 120, '힌트 -5초', '#c3ff5e', 18); A.sfx('power'); } }
  function update(dt) {
    fx.update(dt); if (pathT > 0) { pathT -= dt; if (pathT <= 0) path = null; }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['단계', String(stage)]]); return; }
    time -= dt; if (time <= 0) { time = 0; dyingT = 1; A.sfx('over'); }
    hud();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0a1004'; c.fillRect(-10, -10, W + 20, H + 20);
    if (!b) { stage = 1; setup(); }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (var y = 0; y < ROWS + 2; y++) for (var x = 0; x < COLS + 2; x++) {
      var i = idx(x, y), v = b[i]; if (v < 0) continue; var px = GX + x * CW, py = GY + y * CH, s = sel === i, h = hintPair && hintPair.indexOf(i) >= 0 && Math.floor(t * 4) % 2;
      c.fillStyle = '#2a2f1c'; A.rr(c, px + 3, py + 6, CW - 6, CH - 6, 9); c.fill();
      c.fillStyle = s ? '#e9ffc9' : h ? '#4a5a2a' : '#f1f4e6'; A.rr(c, px + 3, py + 2, CW - 6, CH - 8, 9); c.fill();
      c.fillStyle = COL[v]; c.font = '700 ' + FONT + 'px system-ui'; c.fillText(SYM[v], px + CW / 2, py + CH / 2 - 2);
      if (s) { c.strokeStyle = '#c3ff5e'; c.lineWidth = 3; A.rr(c, px + 2, py + 1, CW - 4, CH - 6, 10); c.stroke(); }
    }
    if (kbd && S.state === 'playing') { c.strokeStyle = '#fff'; c.lineWidth = 3; A.rr(c, GX + (cur.x + 1) * CW + 1, GY + (cur.y + 1) * CH, CW - 2, CH - 2, 10); c.stroke(); }
    if (path) { c.save(); c.shadowColor = '#c3ff5e'; c.shadowBlur = 12; c.strokeStyle = '#c3ff5e'; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath(); path.forEach(function (p, k) { c[k ? 'lineTo' : 'moveTo'](GX + (p[0] + 0.5) * CW, GY + (p[1] + 0.5) * CH); }); c.stroke(); c.restore(); }
    c.fillStyle = 'rgba(195,255,94,.12)'; A.rr(c, W / 2 - 80, 880, 160, 52, 14); c.fill(); c.fillStyle = '#c3ff5e'; c.font = '700 17px "Pretendard Variable",system-ui'; c.fillText('힌트 (-5초)', W / 2, 906);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var left = b ? b.filter(function (v) { return v >= 0; }).length : 0, k = score + '|' + left + '|' + Math.ceil(time); if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = left; var tt = document.getElementById('hC'); tt.textContent = Math.ceil(time); tt.style.color = time < 15 ? '#ff4d6d' : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e);
    if (p.y > 880 && p.y < 932 && Math.abs(p.x - W / 2) < 80) { hint(); return; }
    var x = Math.floor((p.x - GX) / CW), y = Math.floor((p.y - GY) / CH); if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) choose(idx(x, y));
  });
  var S = new A.Shell({ id: 'pairs', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key;
      if (k === 'ArrowLeft' || k === 'a') cur.x = Math.max(0, cur.x - 1); if (k === 'ArrowRight' || k === 'd') cur.x = Math.min(COLS - 1, cur.x + 1);
      if (k === 'ArrowUp' || k === 'w') cur.y = Math.max(0, cur.y - 1); if (k === 'ArrowDown' || k === 's') cur.y = Math.min(ROWS - 1, cur.y + 1);
      if ((k === ' ' || k === 'Enter') && !e.repeat) choose(idx(cur.x + 1, cur.y + 1)); if (k === 'h' || k === 'H') hint(); } });
})();
