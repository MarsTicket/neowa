(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var level, n, odd, base, oddC, time, score, endT, shakeI = -1, shakeT = 0;
  function hsl(h, s, l) { return 'hsl(' + h + ',' + s + '%,' + l + '%)'; }
  function next() {
    n = Math.min(9, 2 + Math.floor((level + 1) / 2)); odd = A.irand(0, n * n - 1);
    var h = A.irand(0, 359), s = A.irand(55, 85), l = A.irand(40, 62), d = Math.max(3, 24 - level * 1.1);
    base = hsl(h, s, l); oddC = hsl(h, s, l + (l > 52 ? -d : d));
  }
  function reset() { level = 1; time = 60; score = 0; endT = 0; next(); fx.clear(); hud(); }
  function geo() { var size = 480, gap = n > 6 ? 4 : 8, cs = (size - gap * (n - 1)) / n; return { x0: (W - size) / 2, y0: 200, cs: cs, gap: gap }; }
  function tap(i) {
    if (S.state !== 'playing' || endT > 0) return;
    if (i === odd) { var pts = 10 * level; score += pts; var g = geo(); fx.burst(g.x0 + (i % n + 0.5) * (g.cs + g.gap), g.y0 + (Math.floor(i / n) + 0.5) * (g.cs + g.gap), '#fff', 16, 260, 0.4, 3); A.sfx('coin', 1 + Math.min(level, 20) * 0.03); level++; time = Math.min(99, time + 1); next(); }
    else { time -= 3; shakeI = i; shakeT = 0.3; A.sfx('hurt', 1.4); fx.flashIt('#ff2244', 0.2); }
    hud();
  }
  function update(dt) { fx.update(dt); if (shakeT > 0) shakeT -= dt; if (endT > 0) { endT -= dt; if (endT <= 0) S.gameOver(score, [['도달 단계', String(level)]], { kick: 'TIME UP', win: true }); return; } time -= dt; if (time <= 0) { time = 0; endT = 1; A.sfx('over'); } hud(); }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0a0f0a'; c.fillRect(-10, -10, W + 20, H + 20);
    if (!base) { level = 3; next(); }
    var g = geo();
    for (var i = 0; i < n * n; i++) { var x = g.x0 + (i % n) * (g.cs + g.gap), y = g.y0 + Math.floor(i / n) * (g.cs + g.gap), dx = i === shakeI && shakeT > 0 ? Math.sin(t * 60) * 5 : 0;
      c.fillStyle = i === odd ? oddC : base; if (endT > 0 && i === odd) { c.save(); c.shadowColor = '#fff'; c.shadowBlur = 20; } A.rr(c, x + dx, y, g.cs, g.cs, Math.min(18, g.cs * 0.2)); c.fill(); if (endT > 0 && i === odd) c.restore(); }
    c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '600 16px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('하나만 다른 색을 찾아 탭하세요', W / 2, 740);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + level + '|' + Math.ceil(time); if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = level; var tt = document.getElementById('hC'); tt.textContent = Math.ceil(time); tt.style.color = time < 10 ? '#ff4d6d' : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e), g = geo(), x = Math.floor((p.x - g.x0) / (g.cs + g.gap)), y = Math.floor((p.y - g.y0) / (g.cs + g.gap)); if (x >= 0 && y >= 0 && x < n && y < n) tap(y * n + x); });
  var S = new A.Shell({ id: 'oddcolor', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render });
})();
