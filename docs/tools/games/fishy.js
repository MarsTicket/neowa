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
  /* 그림: 물고기(색별로 미리 그려 두고 크기만 바꿔 씀), 바다 배경(빛줄기·모래·바위·산호) */
  function fishSpr(col) {
    return A.sprite('fish' + col, 120, 80, function (x) {
      x.translate(66, 40); var r = 36;
      var g = x.createLinearGradient(0, -r * 0.62, 0, r * 0.62); g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, col); g.addColorStop(1, A.hexA(col, 1)); 
      x.fillStyle = col; x.beginPath(); x.moveTo(-r * 0.8, 0); x.quadraticCurveTo(-r * 1.2, -r * 0.2, -r * 1.5, -r * 0.6); x.quadraticCurveTo(-r * 1.3, 0, -r * 1.5, r * 0.6); x.quadraticCurveTo(-r * 1.2, r * 0.2, -r * 0.8, 0); x.fill();
      x.beginPath(); x.moveTo(-r * 0.2, -r * 0.55); x.quadraticCurveTo(r * 0.05, -r * 1.0, r * 0.35, -r * 0.5); x.fill();
      x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, r, r * 0.62, 0, 0, 7); x.fill();
      x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.ellipse(0, r * 0.25, r * 0.9, r * 0.35, 0, 0, Math.PI); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2; for (var k = 0; k < 3; k++) { x.beginPath(); x.arc(-r * 0.15 - k * r * 0.22, 0, r * 0.4, -0.9, 0.9); x.stroke(); }
      x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2; x.beginPath(); x.arc(r * 0.25, 0, r * 0.45, -1.1, 1.1); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(r * 0.05, -r * 0.35, r * 0.4, r * 0.1, -0.1, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(r * 0.52, -r * 0.15, r * 0.19, 0, 7); x.fill(); x.fillStyle = '#111'; x.beginPath(); x.arc(r * 0.57, -r * 0.15, r * 0.1, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(r * 0.6, -r * 0.2, r * 0.035, 0, 7); x.fill();
    });
  }
  function drawFish(c, x, y, r, col, face, ring) {
    var spr = fishSpr(col), k = r / 36, t = S.time;
    c.save(); c.translate(x, y); c.scale(face, 1); c.rotate(Math.sin(t * 6 + x * 0.05) * 0.04);
    c.drawImage(spr, -66 * k, -40 * k, 120 * k, 80 * k);
    if (ring) { c.strokeStyle = ring; c.lineWidth = 3; c.setLineDash ? c.setLineDash([8, 6]) : 0; c.beginPath(); c.ellipse(-r * 0.15, 0, r * 1.3 + 4, r * 0.62 + 8, 0, 0, 7); c.stroke(); if (c.setLineDash) c.setLineDash([]); }
    c.restore();
  }
  var SEA = A.sprite('fishsea', W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0c5a80'); g.addColorStop(0.5, '#063450'); g.addColorStop(1, '#021422'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 3; i++) { x.fillStyle = 'rgba(10,40,60,.5)'; x.beginPath(); x.moveTo(0, H); for (var xx = 0; xx <= W; xx += 20) x.lineTo(xx, 700 + i * 60 - Math.abs(Math.sin(xx * 0.01 + i * 2)) * (120 - i * 30)); x.lineTo(W, H); x.fill(); }
    var sg = x.createLinearGradient(0, 880, 0, H); sg.addColorStop(0, '#c8a86a'); sg.addColorStop(1, '#6a5030'); x.fillStyle = sg; x.beginPath(); x.moveTo(0, H); for (xx = 0; xx <= W; xx += 20) x.lineTo(xx, 900 + Math.sin(xx * 0.02) * 10); x.lineTo(W, H); x.fill();
    for (i = 0; i < 60; i++) { x.fillStyle = 'rgba(80,60,30,.4)'; x.fillRect(Math.random() * W, 905 + Math.random() * 55, 2, 1); }
    // 바위·산호
    [[60, 905, 40], [470, 900, 50], [300, 915, 26]].forEach(function (r) { var rg = x.createRadialGradient(r[0] - 10, r[1] - 18, 3, r[0], r[1], r[2]); rg.addColorStop(0, '#5a6a7a'); rg.addColorStop(1, '#1a2430'); x.fillStyle = rg; x.beginPath(); x.ellipse(r[0], r[1], r[2], r[2] * 0.65, 0, Math.PI, 0); x.fill(); });
    function coral(cx, cy, col, n) { x.strokeStyle = col; x.lineCap = 'round'; (function br(px, py, a, len, d) { if (d > n) return; var ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len; x.lineWidth = 7 - d * 1.4; x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke(); br(ex, ey, a - 0.45, len * 0.75, d + 1); br(ex, ey, a + 0.4, len * 0.7, d + 1); })(cx, cy, -Math.PI / 2, 34, 0); }
    coral(120, 905, '#ff6a8a', 4); coral(420, 900, '#ffa04a', 4); coral(220, 912, '#c070ff', 3);
    for (i = 0; i < 18; i++) { x.globalAlpha = 0.5; x.fillStyle = '#9ef'; x.beginPath(); x.arc(Math.random() * W, Math.random() * 600, 1, 0, 7); x.fill(); }
    x.globalAlpha = 1;
  });
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(SEA, -10, -10, W + 20, H + 20);
    // 물결 무늬 빛
    for (var k = 0; k < 5; k++) { c.fillStyle = 'rgba(200,240,255,.05)'; c.beginPath(); c.moveTo(80 + k * 110 + Math.sin(t + k) * 20, 0); c.lineTo(140 + k * 110, 0); c.lineTo(60 + k * 110, H); c.lineTo(20 + k * 110, H); c.fill(); }
    bubbles.forEach(function (b) { b.y -= 60 / 60; c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.5; c.beginPath(); c.arc(b.x + Math.sin(b.y * 0.05) * 6, b.y, b.r, 0, 7); c.stroke(); });
    bubbles = bubbles.filter(function (b) { return b.y > -10; });
    for (var x = 0; x < W; x += 34) { c.fillStyle = (x / 34) % 2 ? '#1a6a3a' : '#22804a'; c.beginPath(); c.moveTo(x, H); c.quadraticCurveTo(x + 10 + Math.sin(t * 1.5 + x) * 14, H - 70 - (x * 7) % 50, x + 18, H); c.fill(); }
    var pr = P ? rFor(size) : 20;
    (fish || []).forEach(function (f) { drawFish(c, f.x, f.y, f.r, f.c, f.vx > 0 ? 1 : -1, P ? (f.r < pr * 0.95 ? 'rgba(125,255,155,.7)' : 'rgba(255,77,109,.8)') : null); });
    if (!fish) { drawFish(c, 150, 400, 30, '#ffb547', 1); drawFish(c, 380, 600, 60, '#ff7aa8', -1); drawFish(c, 260, 760, 20, '#7dff9b', 1); }
    if (P && dyingT <= 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6; A.draw(c, A.glowDot('#4dd8ff', 10), P.x, P.y, pr / 18); c.restore(); drawFish(c, P.x, P.y, pr, '#4dd8ff', P.face); }
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
