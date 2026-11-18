(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var N, CS, GX, GY, on, sol, stage, moves, score, done, hints, cur = { x: 0, y: 0 }, kbd = false, pulse = {};
  function setup() {
    N = Math.min(7, 3 + Math.floor((stage + 1) / 2)); CS = Math.floor(470 / N); GX = (W - N * CS) / 2; GY = 200 + (540 - N * CS) / 2;
    on = []; sol = []; for (var i = 0; i < N * N; i++) { on.push(false); sol.push(false); }
    // 정답 누르기를 무작위로 만들어 적용 → 항상 풀 수 있음
    var presses = Math.min(N * N - 2, 2 + stage);
    for (var k = 0; k < presses; k++) { var j = A.irand(0, N * N - 1); sol[j] = !sol[j]; flipAt(j, true); }
    if (!on.some(Boolean)) return setup();
    moves = 0; done = 0; cur = { x: Math.floor(N / 2), y: Math.floor(N / 2) };
  }
  function flipAt(i, silent) {
    var x = i % N, y = Math.floor(i / N);
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = x + d[0], ny = y + d[1]; if (nx >= 0 && ny >= 0 && nx < N && ny < N) { on[ny * N + nx] = !on[ny * N + nx]; if (!silent) pulse[ny * N + nx] = 0.25; } });
  }
  function reset() { stage = 1; score = 0; hints = 3; setup(); fx.clear(); hud(); }
  function press(i) {
    if (S.state !== 'playing' || done) return;
    flipAt(i); sol[i] = !sol[i]; moves++; A.sfx('tick', on[i] ? 1.6 : 1.1); hud();
    if (!on.some(Boolean)) {
      var pts = Math.max(20, 100 * stage - moves * 5); score += pts; done = 1; A.sfx('level');
      fx.text(W / 2, GY - 40, '불 끄기 성공! +' + pts, '#ffe066', 26); for (var k = 0; k < 4; k++) fx.burst(A.rand(120, W - 120), A.rand(300, 700), '#ffe066', 20, 300, 0.7, 4);
    }
  }
  function hint() {
    if (hints <= 0 || done) { A.sfx('wall'); return; } var idx = []; sol.forEach(function (v, i) { if (v) idx.push(i); });
    if (!idx.length) return; hints--; var h = A.pick(idx); pulse[h] = 1.2; fx.ring(GX + (h % N + 0.5) * CS, GY + (Math.floor(h / N) + 0.5) * CS, '#5ee7ff', CS, 0.6); A.sfx('power'); score = Math.max(0, score - 20); hud();
  }
  function update(dt) {
    fx.update(dt); for (var k in pulse) { pulse[k] -= dt; if (pulse[k] <= 0) delete pulse[k]; }
    if (done > 0) { done -= dt; if (done <= 0) { stage++; setup(); S.banner('STAGE ' + stage, N + '×' + N); hud(); } }
  }
  /* 그림: 켜진 등(유리 판 + 빛 번짐), 꺼진 등, 따뜻한 벽 배경 (매 장면 shadowBlur 없앰) */
  function lampSpr(cs, lit) {
    return A.sprite('lt' + (lit ? 1 : 0) + cs, cs + 40, cs + 40, function (x) {
      x.translate(20, 20); var p = 6, w = cs - 12;
      if (lit) { var gl = x.createRadialGradient(cs / 2, cs / 2, w * 0.3, cs / 2, cs / 2, cs * 0.5 + 20); gl.addColorStop(0, 'rgba(255,224,102,.55)'); gl.addColorStop(1, 'rgba(255,224,102,0)'); x.fillStyle = gl; x.fillRect(-20, -20, cs + 40, cs + 40); }
      x.fillStyle = 'rgba(0,0,0,.45)'; A.rr(x, p + 2, p + 4, w, w, 14); x.fill();
      x.fillStyle = lit ? '#c89a2a' : '#3a3218'; A.rr(x, p, p, w, w, 14); x.fill();
      var g = x.createRadialGradient(cs / 2 - w * 0.15, cs / 2 - w * 0.2, 2, cs / 2, cs / 2, w * 0.7);
      if (lit) { g.addColorStop(0, '#fffbe0'); g.addColorStop(0.45, '#ffe066'); g.addColorStop(1, '#ffb020'); } else { g.addColorStop(0, '#2e2a16'); g.addColorStop(1, '#16130a'); }
      x.fillStyle = g; A.rr(x, p + 4, p + 4, w - 8, w - 8, 11); x.fill();
      x.strokeStyle = lit ? 'rgba(255,255,255,.35)' : 'rgba(255,224,102,.08)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(cs / 2, p + 8); x.lineTo(cs / 2, cs - p - 8); x.moveTo(p + 8, cs / 2); x.lineTo(cs - p - 8, cs / 2); x.stroke();
      x.fillStyle = lit ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.06)'; A.rr(x, p + 10, p + 8, w - 20, 5, 2.5); x.fill();
    });
  }
  var WALL = A.sprite('ltwall', W, H, function (x) {
    var g = x.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.45, 640); g.addColorStop(0, '#2a2208'); g.addColorStop(1, '#070500'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,224,102,.04)'; x.lineWidth = 1; for (var yy = 0; yy < H; yy += 24) { x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
  });
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(WALL, -10, -10, W + 20, H + 20);
    if (!on) { stage = 1; setup(); }
    var cs = Math.round(CS), L1 = lampSpr(cs, true), L0 = lampSpr(cs, false);
    c.fillStyle = 'rgba(0,0,0,.35)'; A.rr(c, GX - 8, GY - 8, N * CS + 16, N * CS + 16, 20); c.fill();
    for (var i = 0; i < N * N; i++) { var x = i % N, y = Math.floor(i / N); if (!on[i]) c.drawImage(L0, GX + x * CS - 20, GY + y * CS - 20, CS + 40, CS + 40); }
    for (i = 0; i < N * N; i++) {
      var x2 = i % N, y2 = Math.floor(i / N), px = GX + x2 * CS, py = GY + y2 * CS;
      if (on[i]) c.drawImage(L1, px - 20, py - 20, CS + 40, CS + 40);
      if (pulse[i] > 0) { c.strokeStyle = 'rgba(94,231,255,' + Math.min(1, pulse[i] * 2) + ')'; c.lineWidth = 4; A.rr(c, px + 4, py + 4, CS - 8, CS - 8, 16); c.stroke(); }
    }
    if (kbd && S.state === 'playing') { c.strokeStyle = '#fff'; c.lineWidth = 3; A.rr(c, GX + cur.x * CS + 2, GY + cur.y * CS + 2, CS - 4, CS - 4, 16); c.stroke(); }
    c.fillStyle = hints > 0 ? 'rgba(94,231,255,.15)' : 'rgba(255,255,255,.04)'; A.rr(c, W / 2 - 100, 840, 200, 56, 16); c.fill();
    c.fillStyle = hints > 0 ? '#5ee7ff' : 'rgba(255,255,255,.3)'; c.font = '700 18px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('힌트 ' + (hints == null ? 3 : hints), W / 2, 868);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = stage; document.getElementById('hC').textContent = moves; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e);
    if (p.y > 840 && p.y < 896 && Math.abs(p.x - W / 2) < 100) { hint(); return; }
    var x = Math.floor((p.x - GX) / CS), y = Math.floor((p.y - GY) / CS); if (x >= 0 && y >= 0 && x < N && y < N) press(y * N + x);
  });
  var S = new A.Shell({ id: 'lights', W: W, H: H, update: update, idle: function (dt) { fx.update(dt); }, render: render, reset: reset,
    keydown: function (e) { kbd = true; var k = e.key;
      if (k === 'ArrowLeft' || k === 'a') cur.x = Math.max(0, cur.x - 1); if (k === 'ArrowRight' || k === 'd') cur.x = Math.min(N - 1, cur.x + 1);
      if (k === 'ArrowUp' || k === 'w') cur.y = Math.max(0, cur.y - 1); if (k === 'ArrowDown' || k === 's') cur.y = Math.min(N - 1, cur.y + 1);
      if ((k === ' ' || k === 'Enter') && !e.repeat) press(cur.y * N + cur.x); if (k === 'h' || k === 'H') hint(); } });
})();
