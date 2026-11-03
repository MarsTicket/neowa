(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var diff = +A.get('neowa_slide_diff', '0') || 0, N, CS, GX, GY, tiles, empty, moves, time, done, anim, cur;
  function layout() { N = 3 + diff; CS = Math.floor(480 / N); GX = (W - N * CS) / 2; GY = 200 + (560 - N * CS) / 2; }
  function solved() { for (var i = 0; i < N * N - 1; i++) if (tiles[i] !== i + 1) return false; return true; }
  function swap(i) { var t = tiles[i]; tiles[i] = 0; tiles[empty] = t; anim[t] = { from: i, t: 0 }; empty = i; }
  function reset() {
    layout(); tiles = []; for (var i = 1; i < N * N; i++) tiles.push(i); tiles.push(0); empty = N * N - 1; anim = {};
    // 빈칸을 무작위로 많이 움직여 섞음 → 항상 풀 수 있음
    var last = -1; for (var k = 0; k < 220 * N; k++) { var opts = nb(empty).filter(function (j) { return j !== last; }); var j = A.pick(opts); last = empty; var t = tiles[j]; tiles[j] = 0; tiles[empty] = t; empty = j; }
    if (solved()) return reset();
    moves = 0; time = 0; done = 0; anim = {}; cur = empty; fx.clear(); hud();
  }
  function nb(i) { var x = i % N, y = Math.floor(i / N), r = []; if (x > 0) r.push(i - 1); if (x < N - 1) r.push(i + 1); if (y > 0) r.push(i - N); if (y < N - 1) r.push(i + N); return r; }
  function tap(i) {
    if (done || S.state !== 'playing') return;
    var ex = empty % N, ey = Math.floor(empty / N), x = i % N, y = Math.floor(i / N);
    if (x !== ex && y !== ey) { A.sfx('wall', 0.8); return; }
    if (i === empty) return;
    // 같은 줄이면 한 번에 여러 칸 밀기
    var step = x === ex ? (y < ey ? -N : N) : (x < ex ? -1 : 1);
    while (empty !== i) { swap(empty + step); moves++; }
    A.sfx('tick', 1.3); hud();
    if (solved()) { done = 1.2; A.sfx('level'); for (var k = 0; k < 5; k++) fx.burst(A.rand(100, W - 100), A.rand(250, 700), A.pick(['#5ee7ff', '#ffd166', '#7dff9b']), 24, 360, 0.8, 4); }
  }
  function score() { var base = [300, 1200, 3000][diff]; return Math.max(50, Math.round(base * 2 - time * base / 120 - moves * base / 400)); }
  function update(dt) {
    fx.update(dt); for (var k in anim) { anim[k].t += dt * 9; if (anim[k].t >= 1) delete anim[k]; }
    if (done > 0) { done -= dt; if (done <= 0) { var key = 'neowa_slide_time_' + diff, b = parseFloat(A.get(key, '0')); if (!b || time < b) A.set(key, time.toFixed(1)); S.gameOver(score(), [['크기', N + '×' + N], ['이동', String(moves)], ['시간', fmt(time)]], { kick: 'SOLVED!', win: true }); } return; }
    time += dt; hud();
  }
  function fmt(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04101a'); g.addColorStop(1, '#0a1830'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    if (!tiles) { layout(); tiles = []; for (var i = 1; i < N * N; i++) tiles.push(i); tiles.push(0); anim = {}; }
    c.fillStyle = 'rgba(94,231,255,.06)'; A.rr(c, GX - 10, GY - 10, N * CS + 20, N * CS + 20, 18); c.fill();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    tiles.forEach(function (v, i) {
      if (!v) return; var x = i % N, y = Math.floor(i / N), a = anim[v];
      if (a) { var fx0 = a.from % N, fy0 = Math.floor(a.from / N), e = 1 - Math.pow(1 - a.t, 3); x = A.lerp(fx0, x, e); y = A.lerp(fy0, y, e); }
      var px = GX + x * CS, py = GY + y * CS, right = v === i + 1;
      var gg = c.createLinearGradient(0, py, 0, py + CS); gg.addColorStop(0, right ? '#5ee7ff' : '#2b4a7a'); gg.addColorStop(1, right ? '#1e88b0' : '#1a2c50');
      c.fillStyle = gg; A.rr(c, px + 4, py + 4, CS - 8, CS - 8, 14); c.fill();
      c.fillStyle = right ? '#03161c' : '#e8f6ff'; c.font = '700 ' + Math.round(CS * 0.42) + 'px "Chakra Petch",system-ui'; c.fillText(String(v), px + CS / 2, py + CS / 2 + 2);
    });
    if (cur != null && kbd && S.state === 'playing') { c.strokeStyle = '#ffd166'; c.lineWidth = 3; A.rr(c, GX + (empty % N) * CS + 4, GY + Math.floor(empty / N) * CS + 4, CS - 8, CS - 8, 14); c.stroke(); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var kbd = false;
  function hud() { document.getElementById('hA').textContent = A.fmt(score()); document.getElementById('hB').textContent = moves; document.getElementById('hC').textContent = fmt(time); document.getElementById('hMult').textContent = N + '×' + N; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e), x = Math.floor((p.x - GX) / CS), y = Math.floor((p.y - GY) / CS); if (x >= 0 && y >= 0 && x < N && y < N) tap(y * N + x); });
  var dbtns = document.querySelectorAll('[data-diff]');
  function paint() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_slide_diff', diff); A.sfx('click'); paint(); tiles = null; }); }); paint();
  var S = new A.Shell({ id: 'slide', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key, ex = empty % N, ey = Math.floor(empty / N);
      // 방향키: 그 방향의 조각이 빈칸으로 들어옴
      if ((k === 'ArrowLeft' || k === 'a') && ex < N - 1) tap(empty + 1); if ((k === 'ArrowRight' || k === 'd') && ex > 0) tap(empty - 1);
      if ((k === 'ArrowUp' || k === 'w') && ey < N - 1) tap(empty + N); if ((k === 'ArrowDown' || k === 's') && ey > 0) tap(empty - N); } });
})();
