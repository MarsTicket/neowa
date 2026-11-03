(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, GX0 = 40, GX1 = 500, GY0 = 260, GY1 = 600;   // 골대 영역(화면 좌표)
  var fx = new A.FX();
  var glove, ball, saves, goals, streak, score, waitT, dyingT, keys = {}, drag = null, kicks;
  function reset() { glove = { x: W / 2, y: 440 }; ball = null; saves = 0; goals = 0; streak = 0; score = 0; waitT = 1; dyingT = 0; kicks = 0; keys = {}; drag = null; fx.clear(); hud(); }
  function kick() {
    kicks++; var lv = Math.min(1, kicks / 40);
    var tx = A.rand(GX0 + 30, GX1 - 30), ty = A.rand(GY0 + 30, GY1 - 30);
    var dur = A.rand(1.25, 1.6) - lv * 0.65;
    var curve = Math.random() < 0.2 + lv * 0.5 ? A.rand(-160, 160) : 0;
    var fake = Math.random() < lv * 0.3;
    ball = { sx: W / 2 + A.rand(-60, 60), sy: 900, tx: tx, ty: ty, t: 0, dur: dur, curve: curve, fake: fake, fx: fake ? A.rand(GX0 + 30, GX1 - 30) : tx };
    A.sfx('shoot', 0.4);
  }
  function pos(b, k) {
    var e = k, tx = b.fake ? A.lerp(b.fx, b.tx, Math.max(0, (k - 0.5) * 2)) : b.tx;
    var x = A.lerp(b.sx, tx, e) + Math.sin(k * Math.PI) * b.curve, y = A.lerp(b.sy, b.ty, e) - Math.sin(k * Math.PI) * 120;
    return { x: x, y: y, s: A.lerp(1.8, 0.75, k) };
  }
  function update(dt) {
    fx.update(dt);
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    glove.x = A.clamp(glove.x + kx * 700 * dt, GX0 + 20, GX1 - 20); glove.y = A.clamp(glove.y + ky * 700 * dt, GY0 + 20, GY1 - 10);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['선방', String(saves)], ['최다 연속', String(bestStreak)]]); return; }
    if (!ball) { waitT -= dt; if (waitT <= 0) kick(); return; }
    ball.t += dt / ball.dur;
    if (ball.t >= 1) {
      var p = pos(ball, 1);
      if (Math.hypot(p.x - glove.x, p.y - glove.y) < 70) {
        saves++; streak++; bestStreak = Math.max(bestStreak, streak); var m = Math.min(5, 1 + Math.floor(streak / 3)); score += 10 * m;
        fx.burst(p.x, p.y, '#7dff9b', 24, 320, 0.5, 3.5); fx.ring(p.x, p.y, '#7dff9b', 100, 0.4); fx.text(p.x, p.y - 50, '선방! +' + 10 * m, '#7dff9b', 24); A.sfx('bounce', 1.3); A.vibrate(25); fx.shake(4, 0.15);
      } else {
        goals++; streak = 0; fx.flashIt('#ff2244', 0.4); fx.shake(9, 0.3); A.sfx('hurt'); A.vibrate(140);
        fx.text(W / 2, 200, 'GOAL...', '#ff4d6d', 34); fx.burst(p.x, p.y, '#ffffff', 20, 260, 0.5, 3);
        if (goals >= 3) dyingT = 1.2;
      }
      ball = null; waitT = A.rand(0.5, 0.9); hud();
    }
  }
  var bestStreak = 0;
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04120a'); g.addColorStop(0.6, '#0b3a1f'); g.addColorStop(1, '#0f5a2c'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    for (var i = 0; i < 8; i++) { c.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.05)'; c.fillRect(0, 620 + i * 45, W, 45); }
    // 골대 + 그물
    c.strokeStyle = 'rgba(255,255,255,.15)'; c.lineWidth = 1;
    for (var x = GX0; x <= GX1; x += 24) { c.beginPath(); c.moveTo(x, GY0); c.lineTo(x, GY1); c.stroke(); }
    for (var y = GY0; y <= GY1; y += 24) { c.beginPath(); c.moveTo(GX0, y); c.lineTo(GX1, y); c.stroke(); }
    c.save(); c.shadowColor = '#fff'; c.shadowBlur = 14; c.strokeStyle = '#f4f5fb'; c.lineWidth = 10; c.beginPath(); c.moveTo(GX0, GY1 + 20); c.lineTo(GX0, GY0); c.lineTo(GX1, GY0); c.lineTo(GX1, GY1 + 20); c.stroke(); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, GY1 + 20); c.lineTo(W, GY1 + 20); c.stroke();
    // 공 그림자(도착 지점)
    if (ball) { var tp = pos(ball, 1), sh = ball.t; c.fillStyle = 'rgba(0,0,0,' + (0.15 + sh * 0.3) + ')'; c.beginPath(); c.ellipse(ball.fake && ball.t < 0.5 ? ball.fx : tp.x, tp.y, 40 * (0.4 + sh), 14 * (0.4 + sh), 0, 0, 7); c.fill(); }
    // 장갑
    var gl = glove || { x: W / 2 + Math.sin(t * 2) * 120, y: 440 };
    c.save(); c.shadowColor = '#7dff9b'; c.shadowBlur = 20; c.fillStyle = '#7dff9b';
    [-1, 1].forEach(function (s) { A.rr(c, gl.x + s * 26 - 22, gl.y - 34, 44, 64, 18); c.fill(); }); c.restore();
    c.strokeStyle = 'rgba(125,255,155,.25)'; c.lineWidth = 2; c.beginPath(); c.arc(gl.x, gl.y, 70, 0, 7); c.stroke();
    if (ball) { var p = pos(ball, Math.min(1, ball.t)); c.save(); c.translate(p.x, p.y); c.rotate(t * 10); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 26 * p.s, 0, 7); c.fill(); c.fillStyle = '#111'; for (var k = 0; k < 5; k++) { var a = k / 5 * Math.PI * 2; c.beginPath(); c.arc(Math.cos(a) * 14 * p.s, Math.sin(a) * 14 * p.s, 5 * p.s, 0, 7); c.fill(); } c.restore(); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = goals + '/3'; document.getElementById('hC').textContent = streak; document.getElementById('hMult').textContent = streak >= 3 ? '×' + Math.min(5, 1 + Math.floor(streak / 3)) : ''; }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e); drag = { id: e.pointerId, sx: p.x, sy: p.y, gx: glove.x, gy: glove.y, m: e.pointerType === 'mouse' }; if (drag.m) { glove.x = A.clamp(p.x, GX0 + 20, GX1 - 20); glove.y = A.clamp(p.y, GY0 + 20, GY1 - 10); } try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e);
    if (e.pointerType === 'mouse') { glove.x = A.clamp(p.x, GX0 + 20, GX1 - 20); glove.y = A.clamp(p.y, GY0 + 20, GY1 - 10); return; }
    if (!drag || drag.id !== e.pointerId) return; glove.x = A.clamp(drag.gx + (p.x - drag.sx) * 1.4, GX0 + 20, GX1 - 20); glove.y = A.clamp(drag.gy + (p.y - drag.sy) * 1.4, GY0 + 20, GY1 - 10); });
  stage.addEventListener('pointerup', function () { drag = null; });
  // score 계산은 점수(선방 × 배율)
  var S = new A.Shell({ id: 'keeper', W: W, H: H, reset: function () { bestStreak = 0; reset(); }, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; }, keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; } });
})();
