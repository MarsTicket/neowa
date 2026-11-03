(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var N, CS, GX, GY, cells, P, goal, stars, stage, time, score, moving, dyingT, trail;
  // 미로 생성 (재귀적 백트래킹). cells[y][x] = {n,e,s,w 벽}
  function build(n) {
    N = n; CS = Math.floor(Math.min(500 / n, 780 / n)); GX = (W - N * CS) / 2; GY = 110 + (800 - N * CS) / 2;
    cells = []; for (var y = 0; y < N; y++) { cells.push([]); for (var x = 0; x < N; x++) cells[y].push({ n: 1, e: 1, s: 1, w: 1, v: 0 }); }
    var st = [[0, 0]]; cells[0][0].v = 1;
    while (st.length) {
      var c = st[st.length - 1], opts = [];
      [[0, -1, 'n', 's'], [1, 0, 'e', 'w'], [0, 1, 's', 'n'], [-1, 0, 'w', 'e']].forEach(function (d) { var nx = c[0] + d[0], ny = c[1] + d[1]; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !cells[ny][nx].v) opts.push([nx, ny, d[2], d[3]]); });
      if (!opts.length) { st.pop(); continue; }
      var o = A.pick(opts); cells[c[1]][c[0]][o[2]] = 0; cells[o[1]][o[0]][o[3]] = 0; cells[o[1]][o[0]].v = 1; st.push([o[0], o[1]]);
    }
    // 벽 몇 개 더 뚫어 길을 여러 갈래로
    for (var k = 0; k < N; k++) { var rx = A.irand(1, N - 2), ry = A.irand(1, N - 2); cells[ry][rx].e = 0; cells[ry][rx + 1].w = 0; }
    P = { x: 0, y: 0, px: 0, py: 0 }; goal = { x: N - 1, y: N - 1 }; stars = [];
    for (k = 0; k < Math.floor(N / 2); k++) stars.push({ x: A.irand(1, N - 1), y: A.irand(1, N - 1) });
    trail = [];
  }
  function newStage() { stage++; var n = Math.min(17, 6 + stage); build(n); time += 12 + n * 1.2; if (stage > 1) { S.banner('STAGE ' + stage, '탈출 성공'); A.sfx('level'); } hud(); }
  function reset() { stage = 0; time = 18; score = 0; dyingT = 0; moving = null; newStage(); fx.clear(); }
  function slide(dx, dy) {
    if (S.state !== 'playing' || moving || dyingT > 0) return;
    var key = dx > 0 ? 'e' : dx < 0 ? 'w' : dy > 0 ? 's' : 'n', x = P.x, y = P.y, path = [];
    while (!cells[y][x][key]) { x += dx; y += dy; path.push([x, y]); if (x === goal.x && y === goal.y) break; }
    if (!path.length) { A.sfx('wall', 0.8); return; }
    moving = { path: path, i: 0, t: 0 }; A.sfx('turn', 1.2);
  }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['단계', String(stage)]]); return; }
    time -= dt; if (time <= 0) { time = 0; dyingT = 1; A.sfx('over'); fx.flashIt('#ff2244', 0.4); hud(); return; }
    if (moving) {
      moving.t += dt * 22;
      while (moving && moving.t >= 1) {
        moving.t -= 1; var c = moving.path[moving.i++]; trail.push({ x: P.x, y: P.y, t: 0.5 }); P.x = c[0]; P.y = c[1];
        for (var i = stars.length - 1; i >= 0; i--) if (stars[i].x === P.x && stars[i].y === P.y) { stars.splice(i, 1); time += 3; score += 50; fx.burst(GX + (P.x + 0.5) * CS, GY + (P.y + 0.5) * CS, '#ffd166', 12, 200, 0.4, 3); fx.text(GX + (P.x + 0.5) * CS, GY + P.y * CS, '+3초', '#ffd166', 18); A.sfx('coin'); }
        if (P.x === goal.x && P.y === goal.y) { moving = null; var bonus = Math.round(100 * stage + time * 10); score += bonus; fx.burst(GX + (goal.x + 0.5) * CS, GY + (goal.y + 0.5) * CS, '#7dff9b', 40, 360, 0.8, 4); fx.text(W / 2, H / 2, '탈출! +' + bonus, '#7dff9b', 28); newStage(); return; }
        if (moving.i >= moving.path.length) moving = null;
      }
    }
    for (i = trail.length - 1; i >= 0; i--) { trail[i].t -= dt; if (trail[i].t <= 0) trail.splice(i, 1); }
    hud();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0c0a02'; c.fillRect(-10, -10, W + 20, H + 20);
    if (!cells) build(9);
    c.fillStyle = 'rgba(255,209,102,.04)'; c.fillRect(GX, GY, N * CS, N * CS);
    trail.forEach(function (tr) { c.fillStyle = 'rgba(255,209,102,' + tr.t * 0.5 + ')'; c.fillRect(GX + tr.x * CS + CS * 0.3, GY + tr.y * CS + CS * 0.3, CS * 0.4, CS * 0.4); });
    c.fillStyle = '#7dff9b'; c.globalAlpha = 0.5 + Math.sin(t * 5) * 0.3; c.fillRect(GX + goal.x * CS + 3, GY + goal.y * CS + 3, CS - 6, CS - 6); c.globalAlpha = 1;
    c.save(); c.globalCompositeOperation = 'lighter'; stars.forEach(function (s) { A.draw(c, A.glowDot('#ffd166', 5), GX + (s.x + 0.5) * CS, GY + (s.y + 0.5) * CS, CS / 40); }); c.restore();
    c.strokeStyle = '#ffd166'; c.lineWidth = Math.max(2, CS * 0.09); c.lineCap = 'round'; c.beginPath();
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var cl = cells[y][x], px = GX + x * CS, py = GY + y * CS;
      if (cl.n) { c.moveTo(px, py); c.lineTo(px + CS, py); } if (cl.w) { c.moveTo(px, py); c.lineTo(px, py + CS); }
      if (y === N - 1 && cl.s) { c.moveTo(px, py + CS); c.lineTo(px + CS, py + CS); } if (x === N - 1 && cl.e) { c.moveTo(px + CS, py); c.lineTo(px + CS, py + CS); }
    }
    c.stroke();
    var mx = P.x, my = P.y;
    if (moving && moving.path[moving.i]) { mx = A.lerp(P.x, moving.path[moving.i][0], moving.t); my = A.lerp(P.y, moving.path[moving.i][1], moving.t); }
    c.save(); c.shadowColor = '#fff'; c.shadowBlur = 16; c.fillStyle = '#fff'; c.beginPath(); c.arc(GX + (mx + 0.5) * CS, GY + (my + 0.5) * CS, CS * 0.32, 0, 7); c.fill(); c.restore();
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + stage + '|' + Math.ceil(time); if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = stage; var tt = document.getElementById('hC'); tt.textContent = Math.ceil(time); tt.style.color = time < 6 ? '#ff4d6d' : ''; }
  var stage_ = document.getElementById('stage'), sw = null;
  stage_.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; sw = { x: e.clientX, y: e.clientY }; });
  stage_.addEventListener('pointermove', function (e) { if (!sw) return; var dx = e.clientX - sw.x, dy = e.clientY - sw.y; if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return; if (Math.abs(dx) > Math.abs(dy)) slide(dx > 0 ? 1 : -1, 0); else slide(0, dy > 0 ? 1 : -1); sw = null; });
  stage_.addEventListener('pointerup', function () { sw = null; });
  var MAP = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
  var S = new A.Shell({ id: 'maze', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var m = MAP[e.key.length === 1 ? e.key.toLowerCase() : e.key]; if (m) slide(m[0], m[1]); } });
})();
