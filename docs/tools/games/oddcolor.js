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
  /* 그림: 모든 칸에 똑같은 유리 광택을 덧씌움(다른 색 찾기의 공정함은 그대로), 갤러리 배경 */
  function glossSpr(cs) {
    cs = Math.round(cs);
    return A.sprite('odg' + cs, cs, cs, function (x) {
      var r = Math.min(18, cs * 0.2), g = x.createLinearGradient(0, 0, 0, cs); g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
      x.fillStyle = g; A.rr(x, 0, 0, cs, cs, r); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1.5; A.rr(x, 1, 1, cs - 2, cs - 2, r); x.stroke();
    });
  }
  var OBG = A.sprite('odbg', W, H, function (x) {
    var g = x.createRadialGradient(W / 2, 440, 50, W / 2, 440, 620); g.addColorStop(0, '#1a2418'); g.addColorStop(1, '#050805'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  });
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(OBG, -10, -10, W + 20, H + 20);
    if (!base) { level = 3; next(); }
    var g = geo(), GL = glossSpr(g.cs);
    c.fillStyle = 'rgba(0,0,0,.4)'; A.rr(c, g.x0 - 14, g.y0 - 10, 508, 508, 22); c.fill();
    c.fillStyle = '#141a14'; A.rr(c, g.x0 - 14, g.y0 - 14, 508, 508, 22); c.fill();
    for (var i = 0; i < n * n; i++) { var x = g.x0 + (i % n) * (g.cs + g.gap), y = g.y0 + Math.floor(i / n) * (g.cs + g.gap), dx = i === shakeI && shakeT > 0 ? Math.sin(t * 60) * 5 : 0;
      c.fillStyle = i === odd ? oddC : base; A.rr(c, x + dx, y, g.cs, g.cs, Math.min(18, g.cs * 0.2)); c.fill();
      c.drawImage(GL, x + dx, y, g.cs, g.cs);
      if (endT > 0 && i === odd) { c.strokeStyle = '#fff'; c.lineWidth = 4; A.rr(c, x - 3, y - 3, g.cs + 6, g.cs + 6, Math.min(20, g.cs * 0.22)); c.stroke(); } }
    c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '600 16px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('하나만 다른 색을 찾아 탭하세요', W / 2, 740);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + level + '|' + Math.ceil(time); if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = level; var tt = document.getElementById('hC'); tt.textContent = Math.ceil(time); tt.style.color = time < 10 ? '#ff4d6d' : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e), g = geo(), x = Math.floor((p.x - g.x0) / (g.cs + g.gap)), y = Math.floor((p.y - g.y0) / (g.cs + g.gap)); if (x >= 0 && y >= 0 && x < n && y < n) tap(y * n + x); });
  var S = new A.Shell({ id: 'oddcolor', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render });
})();
