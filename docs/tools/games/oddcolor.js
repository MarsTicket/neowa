(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, land = false;
  var fx = new A.FX();
  var level, n, odd, base, oddC, time, score, endT, shakeI = -1, shakeT = 0, qT = 0, cur = { x: 0, y: 0 }, kbd = false, streak = 0;
  function hsl(h, s, l) { return 'hsl(' + h + ',' + s + '%,' + l + '%)'; }
  function next() {
    n = Math.min(9, 2 + Math.floor((level + 1) / 2)); odd = A.irand(0, n * n - 1);
    var h = A.irand(0, 359), s = A.irand(55, 85), l = A.irand(40, 62), d = Math.max(3, 24 - level * 1.1);
    base = hsl(h, s, l); oddC = hsl(h, s, l + (l > 52 ? -d : d)); qT = 0;
    cur.x = Math.min(cur.x, n - 1); cur.y = Math.min(cur.y, n - 1);
  }
  function reset() { level = 1; time = 60; score = 0; endT = 0; streak = 0; next(); fx.clear(); hud(); }
  function geo() { var size = land ? 600 : 480, gap = n > 6 ? 4 : 8, cs = (size - gap * (n - 1)) / n; return { x0: (W - size) / 2, y0: land ? 70 : 200, cs: cs, gap: gap }; } // 가로 화면은 720x720 정사각형 판
  function tap(i) {
    if (S.state !== 'playing' || endT > 0) return;
    if (i === odd) { var fast = qT < 2, pts = 10 * level + (fast ? 5 * level : 0); score += pts; streak = fast ? streak + 1 : 0; // 2초 안에 찾으면 1.5배
      if (fast) fx.text(W / 2, 180, '빠름! +' + pts, '#ffd166', 22); var g = geo(); fx.burst(g.x0 + (i % n + 0.5) * (g.cs + g.gap), g.y0 + (Math.floor(i / n) + 0.5) * (g.cs + g.gap), '#fff', 16, 260, 0.4, 3); A.sfx('right', 1 + Math.min(level, 20) * 0.03); level++; time = Math.min(99, time + 1); next(); }
    else { time -= 3; streak = 0; shakeI = i; shakeT = 0.3; A.sfx('wrong'); fx.flashIt('#ff2244', 0.2); }
    hud();
  }
  function update(dt) { fx.update(dt); qT += dt; if (shakeT > 0) shakeT -= dt; if (endT > 0) { endT -= dt; if (endT <= 0) S.gameOver(score, [['도달 단계', String(level)]], { kick: 'TIME UP', win: true }); return; } time -= dt; if (time > 0 && time <= 5 && Math.ceil(time) < Math.ceil(time + dt)) A.sfx('warn'); if (time <= 0) { time = 0; endT = 1; } hud(); }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0a0f0a'; c.fillRect(-10, -10, W + 20, H + 20);
    if (!base) { level = 3; next(); }
    var g = geo();
    for (var i = 0; i < n * n; i++) { var x = g.x0 + (i % n) * (g.cs + g.gap), y = g.y0 + Math.floor(i / n) * (g.cs + g.gap), dx = i === shakeI && shakeT > 0 ? Math.sin(t * 60) * 5 : 0;
      c.fillStyle = i === odd ? oddC : base; if (endT > 0 && i === odd) { c.save(); c.shadowColor = '#fff'; c.shadowBlur = 20; } A.rr(c, x + dx, y, g.cs, g.cs, Math.min(18, g.cs * 0.2)); c.fill(); if (endT > 0 && i === odd) c.restore(); }
    if (kbd && S.state === 'playing') { c.strokeStyle = '#fff'; c.lineWidth = 3; A.rr(c, g.x0 + cur.x * (g.cs + g.gap) - 3, g.y0 + cur.y * (g.cs + g.gap) - 3, g.cs + 6, g.cs + 6, Math.min(20, g.cs * 0.22)); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '600 16px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('하나만 다른 색을 찾아 탭하세요 · 2초 안에 찾으면 보너스', W / 2, land ? 700 : 740);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + level + '|' + Math.ceil(time); if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = level; var tt = document.getElementById('hC'); tt.textContent = Math.ceil(time); tt.style.color = time < 10 ? '#ff4d6d' : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e), g = geo(), x = Math.floor((p.x - g.x0) / (g.cs + g.gap)), y = Math.floor((p.y - g.y0) / (g.cs + g.gap)); if (x >= 0 && y >= 0 && x < n && y < n) { kbd = false; tap(y * n + x); } });
  var S = new A.Shell({ id: 'oddcolor', W: W, H: H, land: [720, 720], onResize: function (sh) { land = !!sh.land; W = sh.W; H = sh.H; }, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; kbd = true;
      if (k === 'ArrowLeft' || k === 'a') cur.x = (cur.x + n - 1) % n; if (k === 'ArrowRight' || k === 'd') cur.x = (cur.x + 1) % n;
      if (k === 'ArrowUp' || k === 'w') cur.y = (cur.y + n - 1) % n; if (k === 'ArrowDown' || k === 's') cur.y = (cur.y + 1) % n;
      if ((k === ' ' || k === 'Enter') && !e.repeat) tap(cur.y * n + cur.x); } });
  // 가로 화면: 게임판 위 점수판을 숨기고 같은 내용을 오른쪽 패널 점수판에 보여 줌 (extra = 패널에 더 넣을 HTML)
  function landStats(sh, extra) {
    var hudEl = document.querySelector('.g-hud'); if (!hudEl || !sh.panelSlot) return;
    hudEl.setAttribute('data-land-hide', '');
    var ids = ['hA', 'hB', 'hC'];
    sh.panelSlot.innerHTML = '<div class="g-card gp-stats">' + ids.map(function (id) { return '<div><span id="p' + id + 'L"></span><b id="p' + id + '"></b>' + (id === 'hA' ? '<em id="phM" style="font-style:normal;font-size:12px;font-weight:700;color:#ffd166"></em>' : '') + '</div>'; }).join('') + '</div>' + (extra || '');
    function sync() { var m = document.getElementById('hMult'); document.getElementById('phM').textContent = m ? m.textContent : '';
      ids.forEach(function (id) { var v = document.getElementById(id), lb = v && v.parentNode.querySelector('.h-lb');
        document.getElementById('p' + id).textContent = v ? v.textContent : ''; document.getElementById('p' + id + 'L').textContent = lb ? lb.textContent : ''; }); }
    new MutationObserver(sync).observe(hudEl, { subtree: true, childList: true, characterData: true }); sync();
  }
  landStats(S);
})();
