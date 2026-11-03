(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOPY = 260, BOTY = 760, T = 30;   // 천장·바닥 위치, 판 두께
  var fx = new A.FX();
  var P, segs, stars, speed, dist, score, starN, dyingT, nextX;
  // 길: 위/아래 판 조각(있음/없음) + 가시
  function gen() {
    var lv = Math.min(1, dist / 15000), len = A.rand(200, 380), x = nextX;
    var r = Math.random(), top = true, bot = true, spikes = [];
    if (dist > 400) {
      if (r < 0.3) bot = false; else if (r < 0.55) top = false;
      else if (r < 0.85) { var n = A.irand(1, 2 + Math.floor(lv * 2)); for (var i = 0; i < n; i++) spikes.push({ side: Math.random() < 0.5 ? 'top' : 'bot', x: x + A.rand(40, len - 50) }); }
    }
    segs.push({ x: x, len: len, top: top, bot: bot, spikes: spikes });
    if (Math.random() < 0.5) stars.push({ x: x + len / 2, y: A.pick([TOPY + 60, BOTY - 60, (TOPY + BOTY) / 2]) });
    nextX = x + len + (top && bot ? 0 : 0);
  }
  function reset() { P = { x: 130, y: BOTY - 22, vy: 0, g: 1, ground: true, rot: 0 }; segs = []; stars = []; speed = 340; dist = 0; score = 0; starN = 0; dyingT = 0; nextX = -100; while (nextX < W + 400) gen(); fx.clear(); hud(); }
  function floorHere(side) { for (var i = 0; i < segs.length; i++) { var s = segs[i]; if (P.x >= s.x && P.x < s.x + s.len) return s[side]; } return true; }
  function flip() { if (S.state !== 'playing' || dyingT > 0 || !P.ground) return; P.g *= -1; P.ground = false; P.vy = 0; A.sfx('turn', P.g > 0 ? 0.8 : 1.6); fx.burst(P.x, P.y, '#7aa2ff', 8, 160, 0.3, 2.4); }
  function die() { if (dyingT > 0) return; dyingT = 1.1; fx.burst(P.x, P.y, '#7aa2ff', 40, 420, 0.8, 4); fx.shake(12, 0.4); fx.flashIt('#ff2244', 0.5); A.sfx('hurt'); A.vibrate(160); }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['거리', Math.floor(dist / 10) + 'm'], ['별', String(starN)]]); return; }
    speed = Math.min(760, 340 + dist / 50); var dx = speed * dt; dist += dx; nextX -= dx;
    segs.forEach(function (s) { s.x -= dx; s.spikes.forEach(function (k) { k.x -= dx; }); }); stars.forEach(function (s) { s.x -= dx; });
    segs = segs.filter(function (s) { return s.x + s.len > -50; }); stars = stars.filter(function (s) { return s.x > -30; });
    while (nextX < W + 400) gen();
    P.vy += 3200 * P.g * dt; P.y += P.vy * dt; P.ground = false;
    var side = P.g > 0 ? 'bot' : 'top';
    if (floorHere(side)) {
      if (P.g > 0 && P.y >= BOTY - 22) { P.y = BOTY - 22; P.vy = 0; P.ground = true; }
      if (P.g < 0 && P.y <= TOPY + 22) { P.y = TOPY + 22; P.vy = 0; P.ground = true; }
    }
    if (P.y > H + 60 || P.y < -60) die();
    P.rot += (P.ground ? 0 : 8) * dt;
    segs.forEach(function (s) { s.spikes.forEach(function (k) { var ky = k.side === 'bot' ? BOTY - 18 : TOPY + 18; if (Math.abs(k.x - P.x) < 26 && Math.abs(ky - P.y) < 30) die(); }); });
    for (var i = stars.length - 1; i >= 0; i--) if (Math.hypot(stars[i].x - P.x, stars[i].y - P.y) < 34) { var st = stars.splice(i, 1)[0]; starN++; fx.burst(st.x, st.y, '#ffd166', 12, 200, 0.4, 3); A.sfx('coin'); }
    if (P.ground && Math.random() < 0.5) fx.spark(P.x - 16, P.y + 18 * P.g, '#7aa2ff', -speed * 0.3, -P.g * 40, 0.25, 2);
    score = Math.floor(dist / 10) + starN * 20; hud();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05081c'); g.addColorStop(0.5, '#0d1440'); g.addColorStop(1, '#05081c'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    var d = dist || t * 200;
    c.strokeStyle = 'rgba(122,162,255,.12)'; for (var x = -((d * 0.3) % 60); x < W; x += 60) { c.beginPath(); c.moveTo(x, TOPY); c.lineTo(x, BOTY); c.stroke(); }
    var ss = segs || [{ x: -50, len: 700, top: true, bot: true, spikes: [] }];
    ss.forEach(function (s) {
      ['top', 'bot'].forEach(function (side) {
        if (!s[side]) return; var y = side === 'top' ? TOPY - T : BOTY;
        c.fillStyle = '#1b2a6b'; c.fillRect(s.x, y, s.len + 1, T); c.fillStyle = '#9db8ff'; c.fillRect(s.x, side === 'top' ? TOPY - 3 : BOTY, s.len + 1, 3);
      });
      s.spikes.forEach(function (k) {
        c.fillStyle = '#ff4d6d'; c.beginPath();
        if (k.side === 'bot') { c.moveTo(k.x - 18, BOTY); c.lineTo(k.x, BOTY - 36); c.lineTo(k.x + 18, BOTY); }
        else { c.moveTo(k.x - 18, TOPY); c.lineTo(k.x, TOPY + 36); c.lineTo(k.x + 18, TOPY); }
        c.fill();
      });
    });
    c.save(); c.globalCompositeOperation = 'lighter'; (stars || []).forEach(function (s) { A.draw(c, A.glowDot('#ffd166', 6), s.x, s.y, 1 + Math.sin(t * 6) * 0.1); }); c.restore();
    var px = P ? P.x : 130, py = P ? P.y : BOTY - 22 - Math.abs(Math.sin(t * 3)) * 40;
    if (!P || dyingT <= 0) { c.save(); c.translate(px, py); c.rotate(P ? P.rot : 0); c.shadowColor = '#7aa2ff'; c.shadowBlur = 18; c.fillStyle = '#e3ebff'; A.rr(c, -18, -18, 36, 36, 8); c.fill(); c.shadowBlur = 0; c.fillStyle = '#3b5bd6'; c.beginPath(); c.moveTo(-8, (P && P.g < 0) ? 6 : -6); c.lineTo(8, (P && P.g < 0) ? 6 : -6); c.lineTo(0, (P && P.g < 0) ? -8 : 8); c.fill(); c.restore(); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + starN; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = Math.floor(dist / 10) + 'm'; document.getElementById('hC').textContent = starN; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state === 'playing') { e.preventDefault(); flip(); } });
  var S = new A.Shell({ id: 'gravity', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if ((k === ' ' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'w' || k === 's') && !e.repeat) flip(); } });
})();
