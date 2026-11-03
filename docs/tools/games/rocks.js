(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOP = 70;
  var fx = new A.FX();
  var P, rocks, shots, ores, wave, score, lives, power, oreN, dyingT, drag = null, keys = {}, nextWaveT;
  function wrap(o) { if (o.x < -40) o.x += W + 80; if (o.x > W + 40) o.x -= W + 80; if (o.y < TOP - 40) o.y += H - TOP + 80; if (o.y > H + 40) o.y -= H - TOP + 80; }
  function rockShape(r) { var pts = [], n = 11; for (var i = 0; i < n; i++) pts.push(r * A.rand(0.72, 1.08)); return pts; }
  function addRock(x, y, size) { var r = [0, 18, 32, 52][size], a = Math.random() * Math.PI * 2, sp = A.rand(40, 90) * (4 - size) * 0.5 + wave * 6; rocks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: r, size: size, hp: size, rot: 0, vr: A.rand(-1, 1), shape: rockShape(r), hit: 0 }); }
  function startWave() {
    wave++; var n = 2 + wave;
    for (var i = 0; i < n; i++) { var side = Math.random() < 0.5; addRock(side ? (Math.random() < 0.5 ? -30 : W + 30) : A.rand(0, W), side ? A.rand(TOP, H) : (Math.random() < 0.5 ? TOP - 30 : H + 30), 3); }
    S.banner('WAVE ' + wave, '운석 접근'); if (wave > 1) A.sfx('level');
  }
  function reset() { P = { x: W / 2, y: H * 0.6, vx: 0, vy: 0, a: -Math.PI / 2, inv: 2, fire: 0 }; rocks = []; shots = []; ores = []; wave = 0; score = 0; lives = 3; power = 1; oreN = 0; dyingT = 0; nextWaveT = 0; drag = null; keys = {}; startWave(); fx.clear(); hud(); }
  function hurt() {
    if (P.inv > 0 || dyingT > 0) return; lives--; P.inv = 2.2; power = Math.max(1, power - 1);
    fx.burst(P.x, P.y, '#9be7ff', 30, 380, 0.7, 3.5); fx.shake(10, 0.4); fx.flashIt('#ff2244', 0.5); A.sfx('hurt'); A.vibrate(150);
    if (lives <= 0) { dyingT = 1.3; A.sfx('bigboom'); } hud();
  }
  function breakRock(r, i) {
    rocks.splice(i, 1); score += [0, 100, 50, 20][r.size];
    fx.burst(r.x, r.y, '#b8a48c', 10 + r.size * 6, 200 + r.size * 40, 0.6, 3); fx.ring(r.x, r.y, '#9be7ff', r.r * 2, 0.3);
    A.sfx(r.size > 1 ? 'boom' : 'hit', 1 + (3 - r.size) * 0.2); fx.shake(r.size * 1.5, 0.12);
    if (r.size > 1) { addRock(r.x, r.y, r.size - 1); addRock(r.x, r.y, r.size - 1); }
    if (Math.random() < 0.18 + (r.size === 3 ? 0.3 : 0)) ores.push({ x: r.x, y: r.y, t: 0 });
  }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['웨이브', String(wave)], ['광석', String(oreN)], ['화력', 'LV ' + power]]); return; }
    var tx = 0, ty = 0;
    if (drag) { tx = drag.x - P.x; ty = drag.y - P.y; var d = Math.hypot(tx, ty); if (d > 20) { tx /= d; ty /= d; } else { tx = 0; ty = 0; } }
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (kx || ky) { var l = Math.hypot(kx, ky); tx = kx / l; ty = ky / l; }
    P.vx += tx * 900 * dt; P.vy += ty * 900 * dt; P.vx *= 1 - 1.6 * dt; P.vy *= 1 - 1.6 * dt;
    var sp = Math.hypot(P.vx, P.vy); if (sp > 360) { P.vx *= 360 / sp; P.vy *= 360 / sp; }
    P.x += P.vx * dt; P.y += P.vy * dt; wrap(P);
    // 조준: 가장 가까운 운석 (없으면 진행 방향)
    var best = null, bd = 1e9; rocks.forEach(function (r) { var dd = Math.hypot(r.x - P.x, r.y - P.y); if (dd < bd) { bd = dd; best = r; } });
    var want = best ? Math.atan2(best.y - P.y, best.x - P.x) : (sp > 30 ? Math.atan2(P.vy, P.vx) : P.a);
    var da = Math.atan2(Math.sin(want - P.a), Math.cos(want - P.a)); P.a += A.clamp(da, -8 * dt, 8 * dt);
    if (P.inv > 0) P.inv -= dt;
    if (tx || ty) fx.spark(P.x - Math.cos(Math.atan2(ty, tx)) * 16, P.y - Math.sin(Math.atan2(ty, tx)) * 16, A.pick(['#9be7ff', '#ffd166']), -tx * 200, -ty * 200, 0.25, 2.4);
    P.fire -= dt;
    if (P.fire <= 0 && rocks.length) {
      P.fire = Math.max(0.09, 0.2 - power * 0.02);
      var spread = power >= 3 ? [-0.12, 0, 0.12] : power >= 2 ? [-0.06, 0.06] : [0];
      spread.forEach(function (s) { shots.push({ x: P.x + Math.cos(P.a) * 18, y: P.y + Math.sin(P.a) * 18, vx: Math.cos(P.a + s) * 760, vy: Math.sin(P.a + s) * 760, life: 0.75 }); });
      A.sfx('shoot');
    }
    var i, j;
    for (i = shots.length - 1; i >= 0; i--) { var s = shots[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; wrap(s); if (s.life <= 0) shots.splice(i, 1); }
    for (i = rocks.length - 1; i >= 0; i--) {
      var r = rocks[i]; r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.vr * dt; wrap(r); if (r.hit > 0) r.hit -= dt;
      for (j = shots.length - 1; j >= 0; j--) { if (Math.hypot(shots[j].x - r.x, shots[j].y - r.y) < r.r) { shots.splice(j, 1); r.hp--; r.hit = 0.08; if (r.hp <= 0) { breakRock(r, i); break; } else A.sfx('hit'); } }
      if (rocks[i] === r && Math.hypot(r.x - P.x, r.y - P.y) < r.r * 0.85 + 12) hurt();
    }
    for (i = ores.length - 1; i >= 0; i--) {
      var o = ores[i]; o.t += dt; var od = Math.hypot(P.x - o.x, P.y - o.y);
      if (od < 140) { o.x += (P.x - o.x) * 5 * dt; o.y += (P.y - o.y) * 5 * dt; }
      if (od < 26) { ores.splice(i, 1); oreN++; score += 30; A.sfx('coin'); if (oreN % 5 === 0 && power < 4) { power++; fx.text(P.x, P.y - 40, '화력 UP', '#ffd166', 20); A.sfx('power'); } }
      else if (o.t > 9) ores.splice(i, 1);
    }
    if (!rocks.length) { nextWaveT += dt; if (nextWaveT > 1.2) { nextWaveT = 0; score += wave * 200; fx.text(W / 2, H / 2, 'CLEAR +' + wave * 200, '#ffd166', 24); startWave(); } }
    hud();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#03060f'; c.fillRect(-10, -10, W + 20, H + 20);
    for (var i = 0; i < 90; i++) { c.globalAlpha = 0.2 + (i % 7) / 10; c.fillStyle = '#fff'; c.fillRect((i * 97) % W, (i * 233) % H, 1.5, 1.5); } c.globalAlpha = 1;
    (rocks || []).forEach(function (r) {
      c.save(); c.translate(r.x, r.y); c.rotate(r.rot); c.beginPath();
      r.shape.forEach(function (d, k) { var a = k / r.shape.length * Math.PI * 2; c[k ? 'lineTo' : 'moveTo'](Math.cos(a) * d, Math.sin(a) * d); }); c.closePath();
      c.fillStyle = r.hit > 0 ? '#fff' : '#3a3240'; c.fill(); c.strokeStyle = '#b8a48c'; c.lineWidth = 2.5; c.stroke(); c.restore();
    });
    c.save(); c.globalCompositeOperation = 'lighter';
    (ores || []).forEach(function (or) { A.draw(c, A.glowDot('#ffd166', 5), or.x, or.y, 1); });
    (shots || []).forEach(function (s) { A.draw(c, A.glowDot('#9be7ff', 4), s.x, s.y, 0.9); });
    c.restore();
    if (P && (dyingT <= 0) && !(P.inv > 0 && Math.floor(P.inv * 14) % 2)) {
      c.save(); c.translate(P.x, P.y); c.rotate(P.a); c.shadowColor = '#9be7ff'; c.shadowBlur = 16; c.fillStyle = '#e8fbff';
      c.beginPath(); c.moveTo(20, 0); c.lineTo(-14, -13); c.lineTo(-8, 0); c.lineTo(-14, 13); c.closePath(); c.fill(); c.restore();
    } else if (!P) { c.fillStyle = '#e8fbff'; c.beginPath(); c.arc(W / 2, H * 0.6, 10, 0, 7); c.fill(); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + wave + '|' + lives + power; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = wave; document.getElementById('hC').textContent = lives; document.getElementById('hMult').textContent = '화력 LV ' + power; }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; drag = S.toLocal(e); drag.id = e.pointerId; try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (drag && drag.id === e.pointerId) { var p = S.toLocal(e); drag.x = p.x; drag.y = p.y; } });
  function end() { drag = null; } stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  var S = new A.Shell({ id: 'rocks', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; }, keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; } });
})();
