(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOP = 110;
  var fx = new A.FX();
  var tg, time, score, hits, shots, combo, spawnT, endT;
  function reset() { tg = []; time = 30; score = 0; hits = 0; shots = 0; combo = 0; spawnT = 0; endT = 0; fx.clear(); hud(); }
  function spawn() { var lv = Math.min(1, (30 - time) / 30); tg.push({ x: A.rand(60, W - 60), y: A.rand(TOP + 60, H - 70), r: 52 - lv * 14, life: 1.6 - lv * 0.6, max: 1.6 - lv * 0.6 }); spawnT = Math.max(0.35, 0.8 - lv * 0.4); }
  function shoot(p) {
    if (S.state !== 'playing' || endT > 0) return; shots++;
    for (var i = tg.length - 1; i >= 0; i--) { var t = tg[i], k = t.life / t.max, r = t.r * (0.4 + 0.6 * k), d = Math.hypot(p.x - t.x, p.y - t.y);
      if (d < r) { tg.splice(i, 1); hits++; combo++; var acc = 1 - d / r, pts = Math.round(20 + acc * 80) + combo * 2; score += pts; fx.burst(t.x, t.y, acc > 0.7 ? '#ffd166' : '#5ee7ff', 16, 260, 0.4, 3); fx.text(t.x, t.y - 30, (acc > 0.8 ? '정중앙 ' : '') + '+' + pts, acc > 0.8 ? '#ffd166' : '#fff', 20); A.sfx(acc > 0.8 ? 'gold' : 'hit', 1.2 + acc * 0.4); hud(); return; } }
    combo = 0; A.sfx('wall', 1.5); fx.burst(p.x, p.y, '#ff4d6d', 4, 100, 0.2, 2); hud();
  }
  function update(dt) {
    fx.update(dt);
    if (endT > 0) { endT -= dt; if (endT <= 0) S.gameOver(score, [['명중', hits + '/' + shots], ['정확도', (shots ? Math.round(hits / shots * 100) : 0) + '%']], { kick: 'TIME UP', win: true }); return; }
    time -= dt; if (time <= 0) { time = 0; endT = 0.6; A.sfx('over'); hud(); return; }
    spawnT -= dt; if (spawnT <= 0 && tg.length < 4) spawn();
    for (var i = tg.length - 1; i >= 0; i--) { tg[i].life -= dt; if (tg[i].life <= 0) { tg.splice(i, 1); combo = 0; } }
    hud();
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#030a12'; c.fillRect(-10, -10, W + 20, H + 20);
    c.strokeStyle = 'rgba(94,231,255,.06)'; for (var x = 0; x < W; x += 45) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (var y = 0; y < H; y += 45) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    var list = tg || [{ x: 270, y: 480, r: 52, life: 1, max: 1 }];
    list.forEach(function (t) { var k = t.life / t.max, r = t.r * (0.4 + 0.6 * k); ['#ff4d6d', '#fff', '#ff4d6d', '#fff', '#ffd166'].forEach(function (col, i) { c.fillStyle = col; c.beginPath(); c.arc(t.x, t.y, r * (1 - i * 0.2), 0, 7); c.fill(); }); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(t.x, t.y, t.r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); c.stroke(); });
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + Math.ceil(time) + '|' + hits + shots; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = Math.ceil(time); document.getElementById('hC').textContent = (shots ? Math.round(hits / shots * 100) : 100) + '%'; document.getElementById('hMult').textContent = combo >= 3 ? combo + ' 연속' : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; e.preventDefault(); shoot(S.toLocal(e)); });
  var S = new A.Shell({ id: 'aim', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render });
})();
