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
    A.sfx('puck', 0.7);
  }
  function pos(b, k) {
    // 페인트 슛: 35% 지점부터 진짜 방향으로 꺾임 (예전 50% → 반응할 시간 확보)
    var e = k, tx = b.fake ? A.lerp(b.fx, b.tx, Math.max(0, (k - 0.35) / 0.65)) : b.tx;
    var x = A.lerp(b.sx, tx, e) + Math.sin(k * Math.PI) * b.curve, y = A.lerp(b.sy, b.ty, e) - Math.sin(k * Math.PI) * 120;
    return { x: x, y: y, s: A.lerp(1.8, 0.75, k) };
  }
  function update(dt) {
    fx.update(dt);
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    glove.x = A.clamp(glove.x + kx * 900 * dt, GX0 + 20, GX1 - 20); glove.y = A.clamp(glove.y + ky * 900 * dt, GY0 + 20, GY1 - 10);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['선방', String(saves)], ['최다 연속', String(bestStreak)]]); return; }
    if (!ball) { waitT -= dt; if (waitT <= 0) kick(); return; }
    ball.t += dt / ball.dur;
    if (ball.t >= 1) {
      var p = pos(ball, 1);
      var gd = Math.hypot(p.x - glove.x, p.y - glove.y);
      if (gd < 70) {
        saves++; streak++; bestStreak = Math.max(bestStreak, streak); var m = Math.min(5, 1 + Math.floor(streak / 3)), pts = 10 * m, perf = gd < 28;
        if (perf) pts += 10;   // 장갑 정중앙으로 막으면 +10
        score += pts;
        fx.burst(p.x, p.y, '#7dff9b', 24, 320, 0.5, 3.5); fx.ring(p.x, p.y, '#7dff9b', 100, 0.4); fx.text(p.x, p.y - 50, (perf ? '완벽 선방! +' : '선방! +') + pts, perf ? '#ffd166' : '#7dff9b', perf ? 26 : 24); A.sfx('bounce', 1.3, A.clamp(p.x / W * 2 - 1, -1, 1)); if (streak >= 3 && streak % 3 === 0) A.sfx('combo', 1 + Math.min(streak, 12) * 0.05); A.vibrate(25); fx.shake(4, 0.15);
        // 10연속 선방마다 실점 1 회복
        if (streak % 10 === 0 && goals > 0) { goals--; fx.text(W / 2, 200, '실점 -1 회복!', '#ffd166', 26); A.sfx('power'); }
        if (saves % 10 === 0) { S.banner(saves + ' 선방', '슛이 더 빨라져요'); A.sfx('level'); }
      } else {
        goals++; streak = 0; fx.flashIt('#ff2244', 0.4); fx.shake(9, 0.3); A.sfx('hurt', 1, A.clamp(p.x / W * 2 - 1, -1, 1)); A.vibrate(140); if (goals === 2) A.sfx('warn');
        fx.text(W / 2, 200, 'GOAL...', '#ff4d6d', 34); fx.burst(p.x, p.y, '#ffffff', 20, 260, 0.5, 3);
        if (goals >= 3) dyingT = 1.2;
      }
      ball = null; waitT = A.rand(0.5, 0.9); hud();
    }
  }
  var bestStreak = 0;
  /* 그림: 밤 경기장(관중석·조명탑), 잔디, 입체 골대와 그물, 골키퍼 장갑, 축구공 */
  var BG = A.sprite('kpbg', W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, '#02060e'); g.addColorStop(1, '#0a1a2e'); x.fillStyle = g; x.fillRect(0, 0, W, 300);
    // 관중석 + 관중(색 점)
    for (var r = 0; r < 9; r++) { var y = 60 + r * 22; x.fillStyle = r % 2 ? '#101826' : '#0c1420'; x.fillRect(0, y, W, 22); for (var k = 0; k < 60; k++) { if (Math.random() < 0.2) continue; x.fillStyle = ['#ff4d6d', '#5ee7ff', '#ffd166', '#ffffff', '#7dff9b', '#b48cff'][Math.floor(Math.random() * 6)]; x.globalAlpha = 0.25 + r * 0.05; x.beginPath(); x.arc(k * 9 + 4 + (r % 2) * 4, y + 10, 3.2, 0, 7); x.fill(); } x.globalAlpha = 1; }
    x.fillStyle = '#1a2a40'; x.fillRect(0, 258, W, 12); x.fillStyle = '#ff4d6d'; x.fillRect(0, 262, W, 3);
    // 광고판
    for (var b = 0; b < 6; b++) { x.fillStyle = b % 2 ? '#14304a' : '#2a1640'; x.fillRect(b * 90, 220, 88, 34); x.fillStyle = b % 2 ? 'rgba(94,231,255,.6)' : 'rgba(255,209,102,.6)'; x.font = '700 13px system-ui'; x.textAlign = 'center'; x.fillText('NEOWA', b * 90 + 44, 242); }
    // 조명 빛
    [[60, 20], [480, 20]].forEach(function (l) { var lg = x.createRadialGradient(l[0], l[1], 0, l[0], l[1], 200); lg.addColorStop(0, 'rgba(230,245,255,.55)'); lg.addColorStop(1, 'rgba(230,245,255,0)'); x.fillStyle = lg; x.fillRect(l[0] - 200, 0, 400, 260); x.fillStyle = '#fff'; for (var q = 0; q < 4; q++) x.fillRect(l[0] - 22 + q * 12, l[1] - 6, 9, 9); });
    // 잔디
    var gg = x.createLinearGradient(0, 270, 0, H); gg.addColorStop(0, '#0b3a1f'); gg.addColorStop(1, '#13702f'); x.fillStyle = gg; x.fillRect(0, 270, W, H - 270);
    for (var i = 0; i < 12; i++) { var y0 = 270 + Math.pow(i / 12, 1.4) * 690, y1 = 270 + Math.pow((i + 1) / 12, 1.4) * 690; x.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.06)'; x.fillRect(0, y0, W, y1 - y0); }
    for (i = 0; i < 900; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(120,220,120,.12)' : 'rgba(0,40,10,.2)'; x.fillRect(Math.random() * W, 270 + Math.random() * 690, 1, 3); }
    // 골 에어리어·페널티 박스 선(원근)
    x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(-40, 620); x.lineTo(W + 40, 620); x.stroke();
    x.beginPath(); x.moveTo(-10, 620); x.lineTo(-60, 740); x.lineTo(W + 60, 740); x.lineTo(W + 10, 620); x.stroke();
    x.lineWidth = 4; x.beginPath(); x.moveTo(-100, 620); x.lineTo(-240, 960); x.moveTo(W + 100, 620); x.lineTo(W + 240, 960); x.stroke();
    x.beginPath(); x.ellipse(W / 2, 960, 130, 50, 0, Math.PI, 0); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(W / 2, 850, 6, 3, 0, 0, 7); x.fill();
  });
  var NET = A.sprite('kpnet', GX1 - GX0 + 40, GY1 - GY0 + 60, function (x) {
    var w = GX1 - GX0, h = GY1 - GY0 + 20, d = 26; x.translate(20, 20);
    x.fillStyle = 'rgba(0,10,4,.45)'; x.fillRect(d, d * 0.6, w - d * 2, h - d * 0.6);
    x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 1;
    for (var xx = 0; xx <= w; xx += 18) { var bx = d + (w - 2 * d) * xx / w; x.beginPath(); x.moveTo(xx, 0); x.lineTo(bx, d * 0.6); x.lineTo(bx, h); x.stroke(); }
    for (var yy = d * 0.6; yy <= h; yy += 18) { x.beginPath(); x.moveTo(d, yy); x.lineTo(w - d, yy); x.stroke(); var f = (yy - d * 0.6) / h; x.beginPath(); x.moveTo(0, yy * 0.95); x.lineTo(d, yy); x.moveTo(w, yy * 0.95); x.lineTo(w - d, yy); x.stroke(); }
    for (xx = 0; xx <= d; xx += 9) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, h); x.moveTo(w - xx, 0); x.lineTo(w - xx, h); x.stroke(); }
  });
  var POST = A.sprite('kppost', GX1 - GX0 + 30, GY1 - GY0 + 40, function (x) {
    x.translate(15, 15); var w = GX1 - GX0, h = GY1 - GY0 + 20;
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 12; x.beginPath(); x.moveTo(3, h + 3); x.lineTo(3, 3); x.lineTo(w + 3, 3); x.lineTo(w + 3, h + 3); x.stroke();
    var g = x.createLinearGradient(-5, 0, 5, 0); g.addColorStop(0, '#c8ccd8'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#a8acb8');
    x.strokeStyle = '#eef0f8'; x.lineWidth = 10; x.beginPath(); x.moveTo(0, h); x.lineTo(0, 0); x.lineTo(w, 0); x.lineTo(w, h); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-2, h); x.lineTo(-2, -2); x.lineTo(w - 2, -2); x.stroke();
  });
  var GLOVE = A.sprite('kpglove', 56, 76, function (x) {
    x.translate(28, 40);
    var g = x.createLinearGradient(-20, -30, 20, 30); g.addColorStop(0, '#b8ffc8'); g.addColorStop(0.5, '#5ae07a'); g.addColorStop(1, '#1f8a3a');
    x.fillStyle = g;
    for (var f = 0; f < 4; f++) { A.rr(x, -19 + f * 9.5, -34 + Math.abs(f - 1.5) * 3, 9, 30, 4.5); x.fill(); }
    A.rr(x, -20, -12, 40, 36, 12); x.fill();
    x.save(); x.translate(-20, 4); x.rotate(-0.7); A.rr(x, -5, -16, 10, 22, 5); x.fill(); x.restore();
    x.fillStyle = '#123a1a'; A.rr(x, -18, 22, 36, 12, 4); x.fill();
    x.fillStyle = '#ffffff'; x.fillRect(-18, 26, 36, 3);
    x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(-6, -2, 9, 5, -0.4, 0, 7); x.fill();
  });
  var BALL = A.sprite('kpball', 60, 60, function (x) {
    x.translate(30, 30); var R = 26;
    var g = x.createRadialGradient(-9, -10, 2, 0, 0, R); g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#e4e6ee'); g.addColorStop(1, '#9aa0b0');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, R, 0, 7); x.fill();
    x.save(); x.beginPath(); x.arc(0, 0, R, 0, 7); x.clip();
    function pent(cx, cy, r) { x.beginPath(); for (var k = 0; k < 5; k++) { var a = -Math.PI / 2 + k * Math.PI * 2 / 5; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.fill(); }
    x.fillStyle = '#1a1c24'; pent(0, 0, 8); for (var k = 0; k < 5; k++) { var a = -Math.PI / 2 + k * Math.PI * 2 / 5; pent(Math.cos(a) * 22, Math.sin(a) * 22, 7.5); }
    x.strokeStyle = 'rgba(30,30,40,.4)'; x.lineWidth = 1; for (k = 0; k < 5; k++) { a = -Math.PI / 2 + k * Math.PI * 2 / 5; x.beginPath(); x.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); x.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); x.stroke(); }
    var sh = x.createRadialGradient(-8, -10, 0, 0, 0, R); sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,30,.35)'); x.fillStyle = sh; x.fillRect(-R, -R, R * 2, R * 2);
    x.restore();
  });
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(BG, -10, -10, W + 20, H + 20);
    // 골대 + 그물
    c.drawImage(NET, GX0 - 20, GY0 - 20, NET.w, NET.h);
    c.drawImage(POST, GX0 - 15, GY0 - 15, POST.w, POST.h);
    // 공 그림자(도착 지점)
    if (ball) { var tp = pos(ball, 1), sh = ball.t; c.fillStyle = 'rgba(0,0,0,' + (0.15 + sh * 0.3) + ')'; c.beginPath(); c.ellipse(ball.fake && ball.t < 0.35 ? ball.fx : tp.x, tp.y, 40 * (0.4 + sh), 14 * (0.4 + sh), 0, 0, 7); c.fill(); }
    // 장갑
    var gl = glove || { x: W / 2 + Math.sin(t * 2) * 120, y: 440 };
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5; A.draw(c, A.glowDot('#7dff9b', 14), gl.x, gl.y, 1.6); c.restore();
    [-1, 1].forEach(function (s) { c.save(); c.translate(gl.x + s * 26, gl.y - 2); c.scale(s, 1); c.rotate(-0.08); c.drawImage(GLOVE, -28, -40, 56, 76); c.restore(); });
    c.strokeStyle = 'rgba(125,255,155,.25)'; c.lineWidth = 2; c.beginPath(); c.arc(gl.x, gl.y, 70, 0, 7); c.stroke();
    if (S.state === 'playing' && saves === 0 && goals === 0 && kicks <= 2) {
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 22px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(255,255,255,' + (0.7 + Math.sin(t * 5) * 0.25) + ')';
      c.fillText(document.body.classList.contains('touch') ? '장갑을 끌어 그림자 위로!' : '마우스·방향키로 장갑을 그림자 위로!', W / 2, 680);
    }
    if (ball) { var p = pos(ball, Math.min(1, ball.t)); A.draw(c, BALL, p.x, p.y, p.s, t * 10); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = goals + '/3'; document.getElementById('hC').textContent = streak; document.getElementById('hMult').textContent = streak >= 3 ? '×' + Math.min(5, 1 + Math.floor(streak / 3)) : ''; }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e); drag = { id: e.pointerId, sx: p.x, sy: p.y, gx: glove.x, gy: glove.y, m: e.pointerType === 'mouse' }; if (drag.m) { glove.x = A.clamp(p.x, GX0 + 20, GX1 - 20); glove.y = A.clamp(p.y, GY0 + 20, GY1 - 10); } try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e);
    if (e.pointerType === 'mouse') { glove.x = A.clamp(p.x, GX0 + 20, GX1 - 20); glove.y = A.clamp(p.y, GY0 + 20, GY1 - 10); return; }
    if (!drag || drag.id !== e.pointerId) return; glove.x = A.clamp(drag.gx + (p.x - drag.sx) * 1.4, GX0 + 20, GX1 - 20); glove.y = A.clamp(drag.gy + (p.y - drag.sy) * 1.4, GY0 + 20, GY1 - 10); });
  stage.addEventListener('pointerup', function () { drag = null; }); stage.addEventListener('pointercancel', function () { drag = null; });
  window.addEventListener('blur', function () { keys = {}; drag = null; });
  // score 계산은 점수(선방 × 배율)
  var S = new A.Shell({ id: 'keeper', W: W, H: H, reset: function () { bestStreak = 0; reset(); }, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; }, keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; } });
})();
