(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOP = 70;
  var fx = new A.FX();
  var P, foes = [], shots = [], lasers = [], orbs = [], time = 0, score = 0, orbN = 0, bombs = 0, dirT = 0, dyingT = 0, keys = {}, drag = null, orbT = 0, grid = [];

  function reset() {
    P = { x: W / 2, y: H * 0.65, r: 10, inv: 1 };
    foes = []; shots = []; lasers = []; orbs = []; time = 0; score = 0; orbN = 0; bombs = 0; dirT = 1.2; dyingT = 0; orbT = 2; keys = {}; drag = null;
    fx.clear(); hud();
  }
  // 공격 패턴 감독: 시간이 갈수록 강하고 자주
  function director() {
    var lv = Math.min(1, time / 90), r = Math.random();
    var opts = ['rain', 'seeker'];
    if (time > 8) opts.push('laser');
    if (time > 15) opts.push('ring');
    if (time > 25) opts.push('cross', 'seeker');
    if (time > 40) opts.push('spiral');
    var k = A.pick(opts);
    if (k === 'rain') { var n = 6 + Math.floor(lv * 8), side = A.irand(0, 3); for (var i = 0; i < n; i++) edgeShot(side, i / n); }
    if (k === 'seeker') { for (var j = 0; j < 1 + Math.floor(lv * 2); j++) foes.push({ x: A.rand(40, W - 40), y: TOP - 20, vx: 0, vy: 0, life: 6 + lv * 3, sp: 150 + lv * 90 }); }
    if (k === 'laser') { var cnt = 1 + Math.floor(lv * 2.5); for (var q = 0; q < cnt; q++) { var hor = Math.random() < 0.5; lasers.push({ hor: hor, pos: hor ? A.rand(TOP + 40, H - 40) : A.rand(30, W - 30), warn: 1.1 - lv * 0.35, on: 0.45, w: 26 }); } }
    if (k === 'ring') { var cx = A.rand(80, W - 80), cy = A.rand(TOP + 80, H * 0.45), m = 12 + Math.floor(lv * 10); for (var z = 0; z < m; z++) { var a = z / m * Math.PI * 2; shots.push({ x: cx, y: cy, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, r: 8, delay: 0.5 }); } fx.ring(cx, cy, '#ff4d6d', 90, 0.5); }
    if (k === 'cross') { [[0, TOP], [W, TOP], [0, H], [W, H]].forEach(function (c) { var a = Math.atan2(P.y - c[1], P.x - c[0]); for (var s = -1; s <= 1; s++) shots.push({ x: c[0], y: c[1], vx: Math.cos(a + s * 0.15) * 260, vy: Math.sin(a + s * 0.15) * 260, r: 8 }); }); }
    if (k === 'spiral') { var sx = W / 2, sy = TOP + 120; for (var u = 0; u < 36; u++) (function (u2) { setTimeout(function () { if (S.state !== 'playing' || dyingT > 0) return; var a2 = u2 * 0.5; shots.push({ x: sx, y: sy, vx: Math.cos(a2) * 210, vy: Math.sin(a2) * 210, r: 8 }); }, u2 * 70); })(u); }
    dirT = Math.max(0.55, 2.0 - lv * 1.4) * A.rand(0.8, 1.2);
  }
  function edgeShot(side, f) {
    var sp = 230 + Math.min(1, time / 90) * 160, x, y, vx = 0, vy = 0;
    if (side === 0) { x = f * W + 20; y = TOP - 10; vy = sp; }
    else if (side === 1) { x = W + 10; y = TOP + f * (H - TOP); vx = -sp; }
    else if (side === 2) { x = f * W + 20; y = H + 10; vy = -sp; }
    else { x = -10; y = TOP + f * (H - TOP); vx = sp; }
    shots.push({ x: x, y: y, vx: vx, vy: vy, r: 9, delay: f * 0.6 });
  }
  function bomb() {
    if (bombs <= 0 || dyingT > 0) return;
    bombs--; fx.ring(P.x, P.y, '#ffd166', 700, 0.8); fx.flashIt('#ffd166', 0.5); fx.shake(8, 0.3); A.sfx('bigboom');
    shots.forEach(function (s) { fx.burst(s.x, s.y, '#ff8fb8', 3, 120, 0.3, 2); }); foes.forEach(function (f) { fx.burst(f.x, f.y, '#ff4d6d', 10, 200, 0.4, 3); });
    score += (shots.length + foes.length * 5) * 5; shots = []; foes = []; lasers = []; P.inv = 1; hud();
  }
  function die() {
    if (dyingT > 0 || P.inv > 0) return;
    dyingT = 1.2; fx.burst(P.x, P.y, '#ffffff', 30, 420, 0.9, 4); fx.burst(P.x, P.y, '#ff4d6d', 40, 380, 0.8, 4);
    fx.shake(12, 0.5); fx.flashIt('#ff2244', 0.6); A.sfx('hurt'); A.vibrate(200);
  }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) {
      dyingT -= dt; moveAll(dt);
      if (dyingT <= 0) S.gameOver(score, [['버틴 시간', time.toFixed(1) + '초'], ['에너지', String(orbN)], ['폭탄 사용', String(usedBombs)]]);
      return;
    }
    time += dt; score += dt * 10;
    if (P.inv > 0) P.inv -= dt;
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (kx || ky) { var l = Math.hypot(kx, ky); P.x += kx / l * 420 * dt; P.y += ky / l * 420 * dt; }
    P.x = A.clamp(P.x, 14, W - 14); P.y = A.clamp(P.y, TOP + 14, H - 14);
    dirT -= dt; if (dirT <= 0) director();
    orbT -= dt; if (orbT <= 0) { orbs.push({ x: A.rand(40, W - 40), y: A.rand(TOP + 60, H - 60), t: 0 }); orbT = A.rand(2.5, 4); }
    moveAll(dt);
    // 충돌
    var i;
    for (i = 0; i < shots.length; i++) { var s = shots[i]; if (s.delay > 0) continue; if (Math.hypot(s.x - P.x, s.y - P.y) < s.r + P.r - 3) die(); }
    for (i = 0; i < foes.length; i++) if (Math.hypot(foes[i].x - P.x, foes[i].y - P.y) < 22) die();
    for (i = 0; i < lasers.length; i++) { var L = lasers[i]; if (L.warn <= 0 && L.on > 0) { if (L.hor ? Math.abs(P.y - L.pos) < L.w / 2 + P.r - 4 : Math.abs(P.x - L.pos) < L.w / 2 + P.r - 4) die(); } }
    for (i = orbs.length - 1; i >= 0; i--) {
      var o = orbs[i]; o.t += dt;
      if (Math.hypot(o.x - P.x, o.y - P.y) < 30) {
        orbs.splice(i, 1); orbN++; score += 100; fx.burst(o.x, o.y, '#ffd166', 14, 220, 0.5, 3); fx.text(o.x, o.y - 20, '+100', '#ffd166', 18); A.sfx('coin');
        if (orbN % 5 === 0) { bombs++; fx.text(P.x, P.y - 40, '폭탄 +1 (두 번 탭)', '#ffd166', 18); A.sfx('power'); }
      } else if (o.t > 6) orbs.splice(i, 1);
    }
    if (Math.floor(time) % 30 === 0 && Math.floor(time - dt) % 30 !== 0 && time > 1) { S.banner(Math.floor(time) + '초', '더 거세집니다'); A.sfx('level'); }
    hud();
  }
  var usedBombs = 0;
  function moveAll(dt) {
    var i;
    for (i = shots.length - 1; i >= 0; i--) { var s = shots[i]; if (s.delay > 0) { s.delay -= dt; continue; } s.x += s.vx * dt; s.y += s.vy * dt; if (s.x < -40 || s.x > W + 40 || s.y < TOP - 60 || s.y > H + 40) shots.splice(i, 1); }
    for (i = foes.length - 1; i >= 0; i--) {
      var f = foes[i], a = Math.atan2(P.y - f.y, P.x - f.x);
      f.vx = A.lerp(f.vx, Math.cos(a) * f.sp, dt * 1.6); f.vy = A.lerp(f.vy, Math.sin(a) * f.sp, dt * 1.6);
      f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt;
      if (Math.random() < 0.4) fx.spark(f.x, f.y, '#ff4d6d', -f.vx * 0.2, -f.vy * 0.2, 0.3, 2);
      if (f.life <= 0) { fx.burst(f.x, f.y, '#ff4d6d', 12, 200, 0.4, 3); A.sfx('boom', 1.4); foes.splice(i, 1); score += 20; }
    }
    for (i = lasers.length - 1; i >= 0; i--) {
      var L = lasers[i];
      if (L.warn > 0) { L.warn -= dt; if (L.warn <= 0) { A.sfx('hurt', 1.6); fx.shake(4, 0.15); } }
      else { L.on -= dt; if (L.on <= 0) lasers.splice(i, 1); }
    }
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#07040b'; c.fillRect(-10, -10, W + 20, H + 20);
    // 맥박치는 격자
    var pulse = 0.06 + Math.sin(t * 2) * 0.02 + (time > 0 ? Math.min(0.08, time / 1000) : 0);
    c.strokeStyle = 'rgba(255,77,109,' + pulse + ')'; c.lineWidth = 1;
    for (var x = 0; x <= W; x += 45) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (var y = 0; y <= H; y += 45) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    var i;
    // 레이저
    for (i = 0; i < lasers.length; i++) {
      var L = lasers[i];
      if (L.warn > 0) {
        c.globalAlpha = 0.25 + (Math.floor(t * 14) % 2) * 0.35; c.fillStyle = '#ff4d6d';
        if (L.hor) c.fillRect(0, L.pos - 1.5, W, 3); else c.fillRect(L.pos - 1.5, 0, 3, H);
        c.globalAlpha = 1;
      } else {
        c.save(); c.globalCompositeOperation = 'lighter';
        var g = L.hor ? c.createLinearGradient(0, L.pos - L.w, 0, L.pos + L.w) : c.createLinearGradient(L.pos - L.w, 0, L.pos + L.w, 0);
        g.addColorStop(0, 'rgba(255,77,109,0)'); g.addColorStop(0.5, 'rgba(255,230,235,1)'); g.addColorStop(1, 'rgba(255,77,109,0)');
        c.fillStyle = g; if (L.hor) c.fillRect(0, L.pos - L.w, W, L.w * 2); else c.fillRect(L.pos - L.w, 0, L.w * 2, H);
        c.restore();
      }
    }
    c.save(); c.globalCompositeOperation = 'lighter';
    for (i = 0; i < orbs.length; i++) { var ob = orbs[i]; c.globalAlpha = ob.t > 5 ? (Math.floor(t * 10) % 2 ? 0.3 : 1) : 1; A.draw(c, A.glowDot('#ffd166', 7), ob.x, ob.y, 1 + Math.sin(t * 6) * 0.1); }
    c.globalAlpha = 1;
    var SH = A.glowDot('#ff4d8b', 5);
    for (i = 0; i < shots.length; i++) { var s = shots[i]; if (s.delay > 0) { c.globalAlpha = 0.3; } A.draw(c, SH, s.x, s.y, s.r / 8); c.globalAlpha = 1; }
    for (i = 0; i < foes.length; i++) { var f = foes[i]; A.draw(c, A.glowDot('#ff4d6d', 8), f.x, f.y, 1.2); }
    c.restore();
    for (i = 0; i < foes.length; i++) { var ff = foes[i]; c.save(); c.translate(ff.x, ff.y); c.rotate(Math.atan2(ff.vy, ff.vx)); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(12, 0); c.lineTo(-8, -8); c.lineTo(-8, 8); c.fill(); c.restore(); }
    // 플레이어
    var px = P ? P.x : W / 2, py = P ? P.y : H * 0.65 + Math.sin(t * 2) * 10;
    if (!P || dyingT <= 0) {
      if (!(P && P.inv > 0 && Math.floor(P.inv * 14) % 2)) {
        c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#5ee7ff', 8), px, py, 1.4); c.restore();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(px, py, 7, 0, 7); c.fill();
      }
    }
    fx.draw(c);
    c.restore(); fx.drawFlash(c, W, H);
  }
  var lastHud = '';
  function hud() {
    var k = Math.floor(score) + '|' + Math.floor(time * 10) + '|' + bombs; if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score);
    document.getElementById('hB').textContent = time.toFixed(1);
    document.getElementById('hC').textContent = bombs;
    document.getElementById('hMult').textContent = bombs > 0 ? '두 번 탭 = 폭탄' : '';
  }
  var stage = document.getElementById('stage'), lastTap = 0;
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return;
    var now = performance.now(); if (now - lastTap < 300) { if (bombs > 0) usedBombs++; bomb(); } lastTap = now;
    var p = S.toLocal(e); drag = { id: e.pointerId, sx: p.x, sy: p.y, px: P.x, py: P.y };
    try { stage.setPointerCapture(e.pointerId); } catch (er) {}
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag || drag.id !== e.pointerId || S.state !== 'playing' || dyingT > 0) return;
    var p = S.toLocal(e), k = e.pointerType === 'mouse' ? 1 : 1.3;
    P.x = A.clamp(drag.px + (p.x - drag.sx) * k, 14, W - 14); P.y = A.clamp(drag.py + (p.y - drag.sy) * k, TOP + 14, H - 14);
  });
  function end(e) { if (drag && drag.id === e.pointerId) drag = null; }
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  var S = new A.Shell({
    id: 'dodge', W: W, H: H, reset: function () { usedBombs = 0; reset(); }, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = true;
      if ((k === 'b' || k === 'x' || k === 'Shift') && bombs > 0) { usedBombs++; bomb(); }
    },
    keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; }
  });
})();
