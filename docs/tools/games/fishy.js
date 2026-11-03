(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOP = 70;
  var fx = new A.FX();
  var P, fish, bubbles = [], score, eaten, size, xp, dyingT, drag = null, keys = {}, spawnT;
  var COLS = ['#ffb547', '#ff7aa8', '#7dff9b', '#b48cff', '#ffe066', '#5ee7ff', '#ff7a45'];
  function rFor(s) { return 14 + s * 6; }
  function reset() { P = { x: W / 2, y: H / 2, vx: 0, vy: 0, face: 1 }; fish = []; score = 0; eaten = 0; size = 1; xp = 0; dyingT = 0; drag = null; keys = {}; spawnT = 0; for (var i = 0; i < 8; i++) spawnFish(true); fx.clear(); hud(); }
  function spawnFish(init) {
    var s = A.clamp(size + A.irand(-2, 3) + (Math.random() < 0.15 ? 3 : 0), 0.5, 14), side = Math.random() < 0.5 ? -1 : 1;
    var f = { s: s, r: rFor(s) * A.rand(0.9, 1.1), x: init ? A.rand(0, W) : (side < 0 ? -60 : W + 60), y: A.rand(TOP + 40, H - 40), c: A.pick(COLS), wob: Math.random() * 6 };
    f.vx = -side * A.rand(40, 110) / (1 + s * 0.05); if (init) f.vx = A.pick([-1, 1]) * A.rand(40, 100);
    if (init && Math.hypot(f.x - W / 2, f.y - H / 2) < 160) f.x = (f.x + 300) % W;
    fish.push(f);
  }
  function update(dt) {
    fx.update(dt);
    fish.forEach(function (f) { f.x += f.vx * dt; f.wob += dt * 3; f.y += Math.sin(f.wob) * 12 * dt; });
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['최대 크기', String(size)], ['먹은 물고기', String(eaten)]]); return; }
    var tx = 0, ty = 0;
    if (drag) { tx = drag.x - P.x; ty = drag.y - P.y; var d = Math.hypot(tx, ty); if (d > 8) { tx /= d; ty /= d; } else tx = ty = 0; }
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (kx || ky) { var l = Math.hypot(kx, ky); tx = kx / l; ty = ky / l; }
    var maxs = 320 - size * 6;
    P.vx = A.lerp(P.vx, tx * maxs, Math.min(1, dt * 4)); P.vy = A.lerp(P.vy, ty * maxs, Math.min(1, dt * 4));
    P.x = A.clamp(P.x + P.vx * dt, 20, W - 20); P.y = A.clamp(P.y + P.vy * dt, TOP + 20, H - 20);
    if (Math.abs(P.vx) > 20) P.face = P.vx > 0 ? 1 : -1;
    var pr = rFor(size);
    for (var i = fish.length - 1; i >= 0; i--) {
      var f = fish[i];
      if (f.x < -120 || f.x > W + 120) { fish.splice(i, 1); continue; }
      var dd = Math.hypot(f.x - P.x, f.y - P.y);
      if (dd < (pr + f.r) * 0.7) {
        if (f.r < pr * 0.95) {
          fish.splice(i, 1); eaten++; var pts = Math.round(10 * f.s); score += pts; xp += f.s;
          fx.burst(f.x, f.y, f.c, 12, 200, 0.4, 3); fx.text(f.x, f.y - 20, '+' + pts, '#fff', 16); A.sfx('eat', 1.4 - Math.min(0.6, f.s * 0.05)); A.vibrate(10);
          var need = 6 + size * 4;
          if (xp >= need && size < 14) { xp -= need; size++; S.banner('크기 ' + size, '더 커졌다!'); A.sfx('level'); fx.ring(P.x, P.y, '#4dd8ff', 140, 0.5); }
        } else { dyingT = 1.2; fx.burst(P.x, P.y, '#4dd8ff', 40, 380, 0.8, 4); fx.shake(10, 0.4); fx.flashIt('#ff2244', 0.5); A.sfx('hurt'); A.vibrate(180); hud(); return; }
      }
    }
    spawnT -= dt; if (spawnT <= 0 && fish.length < 14) { spawnFish(false); spawnT = A.rand(0.4, 0.9); }
    if (Math.random() < 0.05) bubbles.push({ x: A.rand(0, W), y: H + 10, r: A.rand(2, 6) });
    hud();
  }
  function drawFish(c, x, y, r, col, face, ring) {
    c.save(); c.translate(x, y); c.scale(face, 1);
    c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, r, r * 0.62, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(-r * 0.8, 0); c.lineTo(-r * 1.45, -r * 0.55); c.lineTo(-r * 1.45, r * 0.55); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(r * 0.45, -r * 0.15, r * 0.18, 0, 7); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(r * 0.5, -r * 0.15, r * 0.09, 0, 7); c.fill();
    if (ring) { c.strokeStyle = ring; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, r + 6, r * 0.62 + 6, 0, 0, 7); c.stroke(); }
    c.restore();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a3a5a'); g.addColorStop(1, '#021422'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    for (var k = 0; k < 5; k++) { c.fillStyle = 'rgba(255,255,255,.04)'; c.beginPath(); c.moveTo(80 + k * 110 + Math.sin(t + k) * 20, 0); c.lineTo(140 + k * 110, 0); c.lineTo(60 + k * 110, H); c.lineTo(20 + k * 110, H); c.fill(); }
    bubbles.forEach(function (b) { b.y -= 60 / 60; c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.5; c.beginPath(); c.arc(b.x + Math.sin(b.y * 0.05) * 6, b.y, b.r, 0, 7); c.stroke(); });
    bubbles = bubbles.filter(function (b) { return b.y > -10; });
    c.fillStyle = '#123a2a'; for (var x = 0; x < W; x += 40) { c.beginPath(); c.moveTo(x, H); c.quadraticCurveTo(x + 10 + Math.sin(t + x) * 10, H - 80, x + 20, H); c.fill(); }
    var pr = P ? rFor(size) : 20;
    (fish || []).forEach(function (f) { drawFish(c, f.x, f.y, f.r, f.c, f.vx > 0 ? 1 : -1, P ? (f.r < pr * 0.95 ? 'rgba(125,255,155,.7)' : 'rgba(255,77,109,.8)') : null); });
    if (!fish) { drawFish(c, 150, 400, 30, '#ffb547', 1); drawFish(c, 380, 600, 60, '#ff7aa8', -1); drawFish(c, 260, 760, 20, '#7dff9b', 1); }
    if (P && dyingT <= 0) { c.save(); c.shadowColor = '#4dd8ff'; c.shadowBlur = 20; drawFish(c, P.x, P.y, pr, '#4dd8ff', P.face); c.restore(); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + size + '|' + eaten; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = size; document.getElementById('hC').textContent = eaten; }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; drag = S.toLocal(e); drag.id = e.pointerId; try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (drag && drag.id === e.pointerId) { var p = S.toLocal(e); drag.x = p.x; drag.y = p.y; } });
  stage.addEventListener('pointerup', function () { drag = null; });
  var S = new A.Shell({ id: 'fishy', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; }, keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; } });
})();
