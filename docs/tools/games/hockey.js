(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOP = 90, BOT = 930, GW = 180, MR = 38, PR = 24;
  var fx = new A.FX();
  var me, cpu, puck, sMe, sCpu, round, score, pauseT, dyingT, target = null, keys = {}, lvl;
  function resetPuck(toMe) { puck = { x: W / 2, y: (TOP + BOT) / 2 + (toMe ? 120 : -120), vx: 0, vy: 0 }; pauseT = 0.8; }
  function newRound() { me = { x: W / 2, y: BOT - 120, vx: 0, vy: 0 }; cpu = { x: W / 2, y: TOP + 120, vx: 0, vy: 0 }; sMe = 0; sCpu = 0; lvl = Math.min(1, (round - 1) / 6); resetPuck(true); }
  function reset() { round = 1; score = 0; dyingT = 0; target = null; keys = {}; newRound(); fx.clear(); hud(); }
  function collide(m, pr) {
    var dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy);
    if (d < MR + PR && d > 0) {
      var nx = dx / d, ny = dy / d; puck.x = m.x + nx * (MR + PR); puck.y = m.y + ny * (MR + PR);
      var rv = (puck.vx - m.vx) * nx + (puck.vy - m.vy) * ny;
      if (rv < 0) { puck.vx -= 1.9 * rv * nx; puck.vy -= 1.9 * rv * ny; A.sfx('bounce', pr ? 1.2 : 0.9); fx.burst(puck.x - nx * PR, puck.y - ny * PR, pr ? '#5ee7ff' : '#ff4d6d', 6, 160, 0.25, 2.2); }
      var sp = Math.hypot(puck.vx, puck.vy); if (sp > 1500) { puck.vx *= 1500 / sp; puck.vy *= 1500 / sp; }
    }
  }
  function goal(mine) {
    if (mine) { sMe++; score += 100 * round; fx.text(W / 2, TOP + 80, 'GOAL!', '#5ee7ff', 34); A.sfx('gold'); fx.burst(W / 2, TOP, '#5ee7ff', 40, 400, 0.8, 4); }
    else { sCpu++; fx.text(W / 2, BOT - 80, '실점', '#ff4d6d', 30); A.sfx('hurt'); fx.shake(8, 0.3); A.vibrate(120); }
    if (sMe >= 7) { score += 500 * round; round++; S.banner('ROUND ' + round, '더 강한 상대'); A.sfx('level'); newRound(); }
    else if (sCpu >= 7) { dyingT = 1; }
    else resetPuck(!mine);
    hud();
  }
  function moveMallet(m, tx, ty, maxSp, dt, minY, maxY) {
    tx = A.clamp(tx, MR, W - MR); ty = A.clamp(ty, minY, maxY);
    var dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy), step = Math.min(d, maxSp * dt);
    var nx = d ? m.x + dx / d * step : m.x, ny = d ? m.y + dy / d * step : m.y;
    m.vx = (nx - m.x) / dt; m.vy = (ny - m.y) / dt; m.x = nx; m.y = ny;
  }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['라운드', String(round)], ['마지막 점수', sMe + ' : ' + sCpu]]); return; }
    var mid = (TOP + BOT) / 2;
    // 내 말렛
    var tx = target ? target.x : me.x, ty = target ? target.y : me.y;
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (kx || ky) { tx = me.x + kx * 60; ty = me.y + ky * 60; }
    moveMallet(me, tx, ty, 2600, dt, mid + MR, BOT - MR);
    // 컴퓨터: 퍽이 자기 진영이면 공격, 아니면 골문 앞 수비
    var cspd = 520 + lvl * 700, cx, cy;
    if (puck.y < mid + 40) { cx = puck.x + (puck.x - W / 2) * 0.1; cy = puck.y - 30; if (puck.y < cpu.y) { cy = TOP + MR; } }
    else { cx = W / 2 + (puck.x - W / 2) * (0.35 + lvl * 0.3); cy = TOP + 110; }
    moveMallet(cpu, cx + Math.sin(S.time * 3) * (1 - lvl) * 20, cy, cspd, dt, TOP + MR, mid - MR);
    if (pauseT > 0) { pauseT -= dt; hud(); return; }
    // 퍽
    var steps = 3;
    for (var s = 0; s < steps; s++) {
      var h = dt / steps; puck.x += puck.vx * h; puck.y += puck.vy * h;
      if (puck.x < PR) { puck.x = PR; puck.vx = Math.abs(puck.vx) * 0.92; A.sfx('wall'); }
      if (puck.x > W - PR) { puck.x = W - PR; puck.vx = -Math.abs(puck.vx) * 0.92; A.sfx('wall'); }
      var inGoal = Math.abs(puck.x - W / 2) < GW / 2;
      if (puck.y < TOP + PR) { if (inGoal && puck.y < TOP - PR) { goal(true); return; } if (!inGoal) { puck.y = TOP + PR; puck.vy = Math.abs(puck.vy) * 0.92; A.sfx('wall'); } }
      if (puck.y > BOT - PR) { if (inGoal && puck.y > BOT + PR) { goal(false); return; } if (!inGoal) { puck.y = BOT - PR; puck.vy = -Math.abs(puck.vy) * 0.92; A.sfx('wall'); } }
      collide(me, true); collide(cpu, false);
    }
    puck.vx *= 1 - 0.25 * dt; puck.vy *= 1 - 0.25 * dt;
    if (Math.hypot(puck.vx, puck.vy) > 500) fx.spark(puck.x, puck.y, '#ffffff', 0, 0, 0.2, 2);
    hud();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#060a16'; c.fillRect(-10, -10, W + 20, H + 20);
    c.fillStyle = '#0c1630'; A.rr(c, 6, TOP - 6, W - 12, BOT - TOP + 12, 30); c.fill();
    c.strokeStyle = 'rgba(94,231,255,.5)'; c.lineWidth = 3; c.stroke();
    var mid = (TOP + BOT) / 2; c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(6, mid); c.lineTo(W - 6, mid); c.stroke(); c.beginPath(); c.arc(W / 2, mid, 70, 0, 7); c.stroke();
    c.fillStyle = '#ff4d6d'; c.fillRect(W / 2 - GW / 2, TOP - 8, GW, 6); c.fillStyle = '#5ee7ff'; c.fillRect(W / 2 - GW / 2, BOT + 2, GW, 6);
    c.font = '700 120px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(255,255,255,.05)';
    c.fillText(String(sCpu || 0), W / 2, mid - 160); c.fillText(String(sMe || 0), W / 2, mid + 160);
    function mallet(m, col) { c.save(); c.shadowColor = col; c.shadowBlur = 20; c.fillStyle = col; c.beginPath(); c.arc(m.x, m.y, MR, 0, 7); c.fill(); c.shadowBlur = 0; c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(m.x, m.y, MR * 0.55, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(m.x, m.y, MR * 0.3, 0, 7); c.fill(); c.restore(); }
    mallet(cpu || { x: W / 2, y: TOP + 120 }, '#ff4d6d'); mallet(me || { x: W / 2, y: BOT - 120 }, '#5ee7ff');
    var pk = puck || { x: W / 2 + Math.sin(t) * 80, y: mid };
    c.save(); c.shadowColor = '#fff'; c.shadowBlur = 16; c.fillStyle = '#f4f5fb'; c.beginPath(); c.arc(pk.x, pk.y, PR, 0, 7); c.fill(); c.restore();
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = sMe + ' : ' + sCpu; document.getElementById('hC').textContent = round; }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; target = S.toLocal(e); target.id = e.pointerId; try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (S.state !== 'playing') return; if (e.pointerType === 'mouse' || (target && target.id === e.pointerId)) { var p = S.toLocal(e); target = { x: p.x, y: p.y - (e.pointerType === 'mouse' ? 0 : 50), id: e.pointerId }; } });
  stage.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') target = null; });
  var S = new A.Shell({ id: 'hockey', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { target = null; keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; }, keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; } });
})();
