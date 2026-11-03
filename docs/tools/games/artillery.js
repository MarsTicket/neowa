(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, G = 400, STEP = 6;
  var fx = new A.FX();
  var ground, me, foe, shell, turn, wind, battle, score, hp, foeHp, aim = { a: -0.9, p: 0.6 }, pulling = null, keys = {}, dyingT, aiErr, foeAim;
  function makeGround() {
    ground = []; var base = A.rand(640, 720), hill = A.rand(160, 300), hx = A.rand(220, 320);
    for (var x = 0; x <= W; x += STEP) ground.push(base - Math.exp(-Math.pow((x - hx) / 90, 2)) * hill - Math.sin(x * 0.02 + battle) * 20);
  }
  function gy(x) { var i = A.clamp(Math.floor(x / STEP), 0, ground.length - 1); return ground[i]; }
  function newBattle() {
    battle++; makeGround(); me = { x: 60, hp: 3 }; foe = { x: W - 60 }; foeHp = 3; turn = 'me'; shell = null; wind = A.rand(-1, 1) * (1 + battle * 0.3); aiErr = Math.max(0.03, 0.35 - battle * 0.05);
    foeAim = { a: -Math.PI + 0.9, p: 0.6 };
    if (battle > 1) { S.banner('BATTLE ' + battle, '새로운 적'); A.sfx('level'); } hud();
  }
  function reset() { battle = 0; score = 0; hp = 3; dyingT = 0; pulling = null; keys = {}; newBattle(); fx.clear(); }
  function fire(a, p, who) {
    var v = 300 + p * 520, sx = who === 'me' ? me.x : foe.x, sy = gy(sx) - 24;
    shell = { x: sx + Math.cos(a) * 30, y: sy + Math.sin(a) * 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v, who: who };
    A.sfx('boom', 0.6); fx.burst(shell.x, shell.y, '#ffd166', 10, 160, 0.3, 2.5);
  }
  function blast(x, y, who) {
    shell = null; fx.burst(x, y, '#ff9e4d', 30, 340, 0.6, 4); fx.ring(x, y, '#ff9e4d', 90, 0.4); fx.shake(7, 0.3); A.sfx('bigboom');
    for (var i = 0; i < ground.length; i++) { var gx = i * STEP, d = Math.abs(gx - x); if (d < 44) { var depth = Math.sqrt(44 * 44 - d * d); if (ground[i] < y + depth) ground[i] = Math.max(ground[i], y + depth * 0.8); } }
    var hitMe = Math.hypot(me.x - x, gy(me.x) - 12 - y) < 46, hitFoe = Math.hypot(foe.x - x, gy(foe.x) - 12 - y) < 46;
    if (hitFoe) { foeHp--; score += 100 * battle; fx.text(foe.x, gy(foe.x) - 70, '명중!', '#ffd166', 26); A.vibrate(40); }
    if (hitMe) { hp--; fx.flashIt('#ff2244', 0.5); fx.text(me.x + 40, gy(me.x) - 70, '피격', '#ff4d6d', 24); A.vibrate(150); }
    hud();
    setTimeout(function () {
      if (S.state !== 'playing') return;
      if (hp <= 0) { dyingT = 0.8; return; }
      if (foeHp <= 0) { score += 300 * battle + hp * 100; newBattle(); return; }
      turn = who === 'me' ? 'foe' : 'me'; wind = A.clamp(wind + A.rand(-0.6, 0.6), -3, 3); hud();
      if (turn === 'foe') setTimeout(aiShot, 700);
    }, 700);
  }
  function simulate(a, p) { // AI용: 낙하 지점 x
    var v = 300 + p * 520, x = foe.x + Math.cos(a) * 30, y = gy(foe.x) - 24 + Math.sin(a) * 30, vx = Math.cos(a) * v, vy = Math.sin(a) * v;
    for (var i = 0; i < 600; i++) { vy += G * 0.016; vx += wind * 20 * 0.016; x += vx * 0.016; y += vy * 0.016; if (x < 0 || x > W) return x; if (y >= gy(x)) return x; }
    return x;
  }
  function aiShot() {
    if (S.state !== 'playing' || turn !== 'foe' || dyingT > 0) return;
    var best = null, bd = 1e9;
    for (var a = -Math.PI + 0.3; a < -Math.PI / 2 - 0.05; a += 0.07) for (var p = 0.2; p <= 1; p += 0.05) { var lx = simulate(a, p), d = Math.abs(lx - me.x); if (d < bd) { bd = d; best = { a: a, p: p }; } }
    best.a += A.rand(-aiErr, aiErr) * 0.6; best.p = A.clamp(best.p + A.rand(-aiErr, aiErr) * 0.5, 0.1, 1); foeAim = best;
    fire(best.a, best.p, 'foe');
  }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['전투', String(battle)]]); return; }
    if (keys.up) aim.a = Math.max(-1.5, aim.a - dt * 1.2); if (keys.down) aim.a = Math.min(-0.05, aim.a + dt * 1.2);
    if (keys.left) aim.p = Math.max(0.05, aim.p - dt * 0.7); if (keys.right) aim.p = Math.min(1, aim.p + dt * 0.7);
    if (shell) {
      for (var s = 0; s < 3; s++) {
        var h = dt / 3; shell.vy += G * h; shell.vx += wind * 20 * h; shell.x += shell.vx * h; shell.y += shell.vy * h;
        var who = shell.who; if (shell.x < -40 || shell.x > W + 40 || shell.y > H) { blast(-999, -999, who); break; }
        if (shell.y >= gy(shell.x) || Math.hypot(shell.x - foe.x, shell.y - (gy(foe.x) - 12)) < 22 || Math.hypot(shell.x - me.x, shell.y - (gy(me.x) - 12)) < 22) { blast(shell.x, shell.y, who); break; }
      }
      if (shell) fx.spark(shell.x, shell.y, '#ffd166', 0, 0, 0.3, 2);
    }
  }
  function tank(c, x, col, a) {
    var y = gy(x); c.fillStyle = col; A.rr(c, x - 24, y - 22, 48, 18, 6); c.fill(); c.beginPath(); c.arc(x, y - 22, 12, Math.PI, 0); c.fill();
    c.strokeStyle = col; c.lineWidth = 6; c.beginPath(); c.moveTo(x, y - 26); c.lineTo(x + Math.cos(a) * 34, y - 26 + Math.sin(a) * 34); c.stroke();
  }
  function curAim() { if (pulling) { var dx = pulling.sx - pulling.x, dy = pulling.sy - pulling.y; return { a: A.clamp(Math.atan2(dy, Math.max(1, dx)), -1.5, -0.05), p: Math.min(1, Math.hypot(dx, dy) / 260) }; } return aim; }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#120a28'); g.addColorStop(1, '#3a1a20'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    if (!ground) { battle = 1; makeGround(); me = { x: 60 }; foe = { x: W - 60 }; wind = 0.6; }
    c.fillStyle = '#2a1a12'; c.beginPath(); c.moveTo(0, H); ground.forEach(function (y, i) { c.lineTo(i * STEP, y); }); c.lineTo(W, H); c.fill();
    c.strokeStyle = '#ff9e4d'; c.lineWidth = 3; c.beginPath(); ground.forEach(function (y, i) { c[i ? 'lineTo' : 'moveTo'](i * STEP, y); }); c.stroke();
    var am = curAim();
    tank(c, me.x, '#5ee7ff', am.a); tank(c, foe.x, '#ff4d6d', foeAim ? foeAim.a : -Math.PI + 0.8);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '700 16px "Pretendard Variable",system-ui'; c.textAlign = 'center';
    c.fillText('바람 ' + (wind > 0 ? '→ ' : wind < 0 ? '← ' : '') + Math.abs(wind || 0).toFixed(1), W / 2, 130);
    c.strokeStyle = '#9be7ff'; c.lineWidth = 4; c.beginPath(); c.moveTo(W / 2, 145); c.lineTo(W / 2 + (wind || 0) * 30, 145); c.stroke();
    if (S.state === 'playing' && turn === 'me' && !shell) {
      c.fillStyle = 'rgba(255,255,255,.55)'; var v = 300 + am.p * 520, x = me.x + Math.cos(am.a) * 30, y = gy(me.x) - 24 + Math.sin(am.a) * 30, vx = Math.cos(am.a) * v, vy = Math.sin(am.a) * v;
      for (var i = 0; i < 10; i++) { for (var q = 0; q < 4; q++) { vy += G * 0.012; x += vx * 0.012; y += vy * 0.012; } c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); }
      c.fillStyle = '#5ee7ff'; c.font = '700 15px "Pretendard Variable",system-ui'; c.fillText('힘 ' + Math.round(am.p * 100) + '%', me.x + 30, gy(me.x) - 70);
    }
    if (turn === 'foe' && S.state === 'playing' && !shell) { c.fillStyle = '#ff4d6d'; c.font = '700 18px "Pretendard Variable",system-ui'; c.fillText('적이 조준 중…', W / 2, 200); }
    if (shell) { c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ffd166', 5), shell.x, shell.y, 1); c.restore(); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = battle; document.getElementById('hC').textContent = hp; document.getElementById('hMult').textContent = '적 체력 ' + (foeHp || 0); }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing' || turn !== 'me' || shell) return; var p = S.toLocal(e); pulling = { sx: p.x, sy: p.y, x: p.x, y: p.y, id: e.pointerId }; try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (pulling && pulling.id === e.pointerId) { var p = S.toLocal(e); pulling.x = p.x; pulling.y = p.y; } });
  stage.addEventListener('pointerup', function (e) { if (!pulling) return; var a = curAim(); pulling = null; if (a.p > 0.08) { aim = a; turn = 'wait'; fire(a.a, a.p, 'me'); } });
  var S = new A.Shell({ id: 'artillery', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if (k === 'ArrowUp' || k === 'w') keys.up = true; if (k === 'ArrowDown' || k === 's') keys.down = true; if (k === 'ArrowLeft' || k === 'a') keys.left = true; if (k === 'ArrowRight' || k === 'd') keys.right = true;
      if ((k === ' ' || k === 'Enter') && !e.repeat && turn === 'me' && !shell) { turn = 'wait'; fire(aim.a, aim.p, 'me'); } },
    keyup: function (e) { var k = e.key; if (k === 'ArrowUp' || k === 'w') keys.up = false; if (k === 'ArrowDown' || k === 's') keys.down = false; if (k === 'ArrowLeft' || k === 'a') keys.left = false; if (k === 'ArrowRight' || k === 'd') keys.right = false; } });
})();
