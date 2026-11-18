(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOP = 90, BOT = 930, GW = 180, MR = 38, PR = 24;
  var fx = new A.FX();
  // 3D 그래픽(assets/arcade/3d/hockey.js). 못 쓰는 기기에서는 아래 2D 그림 그대로
  var G3 = { draw: function () { return false; } };
  A.load3D = A.load3D || function (id, get, done) { var s = document.createElement('script'); s.src = '../assets/arcade/g3d.js?v=1'; s.onload = function () { done(A.G3D.boot(id, get)); }; document.head.appendChild(s); };
  A.load3D('hockey', function () { return { me: me, cpu: cpu, puck: puck, sMe: sMe, sCpu: sCpu, duo: duo() }; }, function (h) { G3 = h; });
  // 둘이서 모드: 아래 파랑 = P1, 위 빨강 = P2 (화면 절반씩 손가락으로, 키보드는 P1 방향키 / P2 WASD)
  var duo = A.duo('hockey', { solo: ['SCORE', 'ME : CPU', 'ROUND'], duo: ['P1 : P2 승', 'P1 : P2', '판'] }, function () { if (S) hud(); }), tally = [0, 0], duoWin = 0, tTop = null;
  var me, cpu, puck, sMe, sCpu, round, score, pauseT, dyingT, target = null, keys = {}, lvl, stuckT = 0;
  function resetPuck(toMe) { puck = { x: W / 2, y: (TOP + BOT) / 2 + (toMe ? 120 : -120), vx: 0, vy: 0 }; pauseT = 0.8; stuckT = 0; }
  function newRound() { me = { x: W / 2, y: BOT - 120, vx: 0, vy: 0 }; cpu = { x: W / 2, y: TOP + 120, vx: 0, vy: 0 }; sMe = 0; sCpu = 0; lvl = Math.min(1, (round - 1) / 6); resetPuck(true); }
  function reset() { round = 1; score = 0; dyingT = 0; target = null; tTop = null; duoWin = 0; keys = {}; newRound(); fx.clear(); if (duo()) S.banner('P1 vs P2', '먼저 7점'); hud(); }
  function collide(m, pr) {
    var dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy);
    if (d < MR + PR && d > 0) {
      var nx = dx / d, ny = dy / d; puck.x = m.x + nx * (MR + PR); puck.y = m.y + ny * (MR + PR);
      var rv = (puck.vx - m.vx) * nx + (puck.vy - m.vy) * ny;
      if (rv < 0) { puck.vx -= 1.9 * rv * nx; puck.vy -= 1.9 * rv * ny; A.sfx('bounce', pr ? 1.2 : 0.9); fx.burst(puck.x - nx * PR, puck.y - ny * PR, pr ? '#5ee7ff' : '#ff4d6d', 6, 160, 0.25, 2.2); }
      var sp = Math.hypot(puck.vx, puck.vy); if (sp > 1500) { puck.vx *= 1500 / sp; puck.vy *= 1500 / sp; }
    }
  }
  // 퍽이 벽 밖으로 나가지 않게 막기 (골문 구멍은 제외). 벽에 닿았으면 true
  function walls(sound) {
    var hit = false;
    if (puck.x < PR) { puck.x = PR; puck.vx = Math.abs(puck.vx) * 0.92; hit = true; }
    if (puck.x > W - PR) { puck.x = W - PR; puck.vx = -Math.abs(puck.vx) * 0.92; hit = true; }
    var inGoal = Math.abs(puck.x - W / 2) < GW / 2;
    if (!inGoal && puck.y < TOP + PR) { puck.y = TOP + PR; puck.vy = Math.abs(puck.vy) * 0.92; hit = true; }
    if (!inGoal && puck.y > BOT - PR) { puck.y = BOT - PR; puck.vy = -Math.abs(puck.vy) * 0.92; hit = true; }
    if (hit && sound) A.sfx('wall');
    return hit;
  }
  // 말렛이 퍽을 벽(구석)으로 밀어붙이면 퍽은 벽 안에 두고 말렛을 밀어낸다
  function unpin(m) {
    var dx = puck.x - m.x, dy = puck.y - m.y, d = Math.hypot(dx, dy);
    if (d >= MR + PR) return;
    if (d < 0.01) { dx = W / 2 - puck.x; dy = (TOP + BOT) / 2 - puck.y; d = Math.hypot(dx, dy) || 1; dx = -dx; dy = -dy; }
    m.x = puck.x - dx / d * (MR + PR); m.y = puck.y - dy / d * (MR + PR);
  }
  function goal(mine) {
    if (duo()) { // 둘이서: mine = P1(아래)이 넣은 골
      var col = mine ? '#5ee7ff' : '#ff4d6d'; if (mine) sMe++; else sCpu++;
      fx.text(W / 2, mine ? TOP + 80 : BOT - 80, (mine ? 'P1' : 'P2') + ' GOAL!', col, 32); fx.burst(W / 2, mine ? TOP : BOT, col, 40, 400, 0.8, 4); A.sfx('gold'); fx.shake(5, 0.2); A.vibrate(80);
      if (sMe >= 7 || sCpu >= 7) { duoWin = sMe >= 7 ? 1 : 2; tally[duoWin - 1]++; dyingT = 1.2; A.sfx('level'); } else resetPuck(!mine);
      hud(); return;
    }
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
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0 && duo()) S.gameOver(0, [['P1 승', String(tally[0])], ['P2 승', String(tally[1])], ['점수', sMe + ' : ' + sCpu]], { title: 'P' + duoWin + ' 승리!', kick: '2인 대결', win: true, noRecord: true }); else if (dyingT <= 0) S.gameOver(score, [['라운드', String(round)], ['마지막 점수', sMe + ' : ' + sCpu]]); return; }
    var mid = (TOP + BOT) / 2, two = duo();
    // 내 말렛
    var tx = target ? target.x : me.x, ty = target ? target.y : me.y;
    var kx = (keys.ArrowRight || (!two && keys.d) ? 1 : 0) - (keys.ArrowLeft || (!two && keys.a) ? 1 : 0), ky = (keys.ArrowDown || (!two && keys.s) ? 1 : 0) - (keys.ArrowUp || (!two && keys.w) ? 1 : 0);
    if (kx || ky) { tx = me.x + kx * 60; ty = me.y + ky * 60; }
    moveMallet(me, tx, ty, 2600, dt, mid + MR, BOT - MR);
    // 컴퓨터: 퍽이 자기 진영이면 공격, 아니면 골문 앞 수비
    if (two) { // P2 말렛: 위쪽 손가락 또는 WASD
      var tx2 = tTop ? tTop.x : cpu.x, ty2 = tTop ? tTop.y : cpu.y, kx2 = (keys.d ? 1 : 0) - (keys.a ? 1 : 0), ky2 = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
      if (kx2 || ky2) { tx2 = cpu.x + kx2 * 60; ty2 = cpu.y + ky2 * 60; }
      moveMallet(cpu, tx2, ty2, 2600, dt, TOP + MR, mid - MR);
    } else {
    var cspd = 520 + lvl * 700, cx, cy;
    if (puck.y < mid + 40) { cx = puck.x + (puck.x - W / 2) * 0.1; cy = puck.y - 30; if (puck.y < cpu.y) { cy = TOP + MR; cx = puck.x + (puck.x < W / 2 ? 1 : -1) * (MR + PR + 12); } }
    else { cx = W / 2 + (puck.x - W / 2) * (0.35 + lvl * 0.3); cy = TOP + 110; }
    moveMallet(cpu, cx + Math.sin(S.time * 3) * (1 - lvl) * 20, cy, cspd, dt, TOP + MR, mid - MR);
    }
    if (pauseT > 0) { pauseT -= dt; hud(); return; }
    // 퍽
    var steps = 3;
    for (var s = 0; s < steps; s++) {
      var h = dt / steps; puck.x += puck.vx * h; puck.y += puck.vy * h;
      var inGoal = Math.abs(puck.x - W / 2) < GW / 2;
      if (inGoal && puck.y < TOP - PR) { goal(true); return; }
      if (inGoal && puck.y > BOT + PR) { goal(false); return; }
      walls(true);
      collide(me, true); collide(cpu, false);
      // 말렛에 밀려 벽을 뚫고 나가지 않도록 벽을 한 번 더 적용하고, 겹친 말렛은 비켜 준다
      if (walls(false)) { unpin(me); unpin(cpu); }
    }
    // 안전장치: 퍽이 벽·구석에 붙어 거의 멈춘 채 1.5초 넘게 있으면 가운데 쪽으로 살짝 밀어 준다
    var nearWall = puck.x < PR + 6 || puck.x > W - PR - 6 || puck.y < TOP + PR + 6 || puck.y > BOT - PR - 6;
    if (nearWall && Math.hypot(puck.vx, puck.vy) < 60) stuckT += dt; else stuckT = 0;
    if (stuckT > 1.5) {
      var ex = W / 2 - puck.x, ey = (TOP + BOT) / 2 - puck.y, ed = Math.hypot(ex, ey) || 1;
      puck.vx = ex / ed * 320; puck.vy = ey / ed * 320; stuckT = 0; A.sfx('wall');
    }
    puck.vx *= 1 - 0.25 * dt; puck.vy *= 1 - 0.25 * dt;
    if (Math.hypot(puck.vx, puck.vy) > 500) fx.spark(puck.x, puck.y, '#ffffff', 0, 0, 0.2, 2);
    hud();
  }
  function render(c) {
    if (G3.draw(c, fx)) return;
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#060a16'; c.fillRect(-10, -10, W + 20, H + 20);
    c.fillStyle = '#0c1630'; A.rr(c, 6, TOP - 6, W - 12, BOT - TOP + 12, 30); c.fill();
    c.strokeStyle = 'rgba(94,231,255,.5)'; c.lineWidth = 3; c.stroke();
    var mid = (TOP + BOT) / 2; c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(6, mid); c.lineTo(W - 6, mid); c.stroke(); c.beginPath(); c.arc(W / 2, mid, 70, 0, 7); c.stroke();
    c.fillStyle = '#ff4d6d'; c.fillRect(W / 2 - GW / 2, TOP - 8, GW, 6); c.fillStyle = '#5ee7ff'; c.fillRect(W / 2 - GW / 2, BOT + 2, GW, 6);
    c.font = '700 120px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(255,255,255,.05)';
    if (duo()) { // 위쪽 사람이 읽기 좋게 P2 점수는 거꾸로
      c.save(); c.translate(W / 2, mid - 160); c.rotate(Math.PI); c.fillText(String(sCpu || 0), 0, 0); c.restore(); c.fillText(String(sMe || 0), W / 2, mid + 160);
      c.font = '700 18px "Chakra Petch",system-ui'; c.fillStyle = 'rgba(255,77,109,.7)'; c.save(); c.translate(W / 2, TOP + 34); c.rotate(Math.PI); c.fillText('P2', 0, 0); c.restore();
      c.fillStyle = 'rgba(94,231,255,.7)'; c.fillText('P1', W / 2, BOT - 34);
    } else { c.fillText(String(sCpu || 0), W / 2, mid - 160); c.fillText(String(sMe || 0), W / 2, mid + 160); }
    function mallet(m, col) { c.save(); c.shadowColor = col; c.shadowBlur = 20; c.fillStyle = col; c.beginPath(); c.arc(m.x, m.y, MR, 0, 7); c.fill(); c.shadowBlur = 0; c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(m.x, m.y, MR * 0.55, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(m.x, m.y, MR * 0.3, 0, 7); c.fill(); c.restore(); }
    mallet(cpu || { x: W / 2, y: TOP + 120 }, '#ff4d6d'); mallet(me || { x: W / 2, y: BOT - 120 }, '#5ee7ff');
    var pk = puck || { x: W / 2 + Math.sin(t) * 80, y: mid };
    c.save(); c.shadowColor = '#fff'; c.shadowBlur = 16; c.fillStyle = '#f4f5fb'; c.beginPath(); c.arc(pk.x, pk.y, PR, 0, 7); c.fill(); c.restore();
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { var two = duo(); document.getElementById('hA').textContent = two ? tally[0] + ' : ' + tally[1] : A.fmt(score); document.getElementById('hB').textContent = (sMe || 0) + ' : ' + (sCpu || 0); document.getElementById('hC').textContent = two ? tally[0] + tally[1] + 1 : round; }
  var stage = document.getElementById('stage');
  // 손가락마다 따로 추적: 둘이서면 화면 위 절반을 누른 손가락은 P2(위), 아래 절반은 P1(아래). 마우스는 P1
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e), t = { x: p.x, y: p.y, id: e.pointerId };
    if (duo() && e.pointerType !== 'mouse' && p.y < (TOP + BOT) / 2) tTop = t; else target = t; try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e), touch = e.pointerType !== 'mouse';
    if (tTop && tTop.id === e.pointerId) tTop = { x: p.x, y: p.y + 50, id: e.pointerId }; // 위쪽 사람은 손가락 아래(화면 방향)로 말렛이 보이게
    else if (!touch || (target && target.id === e.pointerId)) target = { x: p.x, y: p.y - (touch ? 50 : 0), id: e.pointerId }; });
  function lift(e) { if (tTop && tTop.id === e.pointerId) tTop = null; if (e.pointerType !== 'mouse' && target && target.id === e.pointerId) target = null; }
  stage.addEventListener('pointerup', lift); stage.addEventListener('pointercancel', lift);
  var S = null; S = new A.Shell({ id: 'hockey', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k1 = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (!duo() || k1.indexOf('Arrow') === 0) target = null; else if ('wasd'.indexOf(k1) >= 0) tTop = null; keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; }, keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; } });
})();
