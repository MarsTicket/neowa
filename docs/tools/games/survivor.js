(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOP = 70;
  var fx = new A.FX();
  var P, foes, bullets, gems, orbs, time, score, kills, lvl, xp, need, choosing, choices, spawnT, dyingT, drag = null, keys = {}, cam = { x: 0, y: 0 }, bossOut;
  var UP = [
    { id: 'rate', name: '연사 속도', d: '공격이 20% 빨라짐' },
    { id: 'dmg', name: '공격력', d: '총알 피해 +1' },
    { id: 'multi', name: '다중 발사', d: '총알 +1발' },
    { id: 'speed', name: '이동 속도', d: '이동이 15% 빨라짐' },
    { id: 'heal', name: '회복', d: '체력 모두 회복, 최대 +1' },
    { id: 'orb', name: '회전 구슬', d: '몸 주위를 도는 구슬 +1' },
    { id: 'magnet', name: '자석', d: '보석을 멀리서 끌어옴' },
    { id: 'pierce', name: '관통', d: '총알이 적 1마리를 더 뚫음' }
  ];
  function reset() {
    P = { x: 0, y: 0, hp: 5, max: 5, inv: 0, rate: 0.45, dmg: 1, multi: 1, spd: 230, orbs: 0, magnet: 90, pierce: 0, fire: 0 };
    foes = []; bullets = []; gems = []; orbs = []; time = 0; score = 0; kills = 0; lvl = 1; xp = 0; need = 5; choosing = false; spawnT = 0; dyingT = 0; drag = null; keys = {}; bossOut = false; fx.clear(); hud();
  }
  function spawnFoe(boss) {
    var a = Math.random() * Math.PI * 2, d = 560, lv = time / 60;
    var tp = boss ? 'boss' : Math.random() < Math.min(0.35, lv * 0.08) ? 'tank' : Math.random() < Math.min(0.3, lv * 0.1) ? 'fast' : 'grunt';
    var base = { grunt: [14, 2, 70, '#ff4d6d'], fast: [11, 1, 130, '#ffb547'], tank: [24, 8, 45, '#b48cff'], boss: [56, 160, 55, '#ff7aa8'] }[tp];
    foes.push({ x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, r: base[0], hp: Math.ceil(base[1] * (1 + lv * 0.35)), sp: base[2] + lv * 6, c: base[3], tp: tp, hit: 0 });
  }
  function levelUp() {
    lvl++; xp -= need; need = Math.floor(need * 1.35 + 3); choosing = true; A.sfx('level');
    var pool = UP.slice(); choices = []; for (var i = 0; i < 3; i++) choices.push(pool.splice(A.irand(0, pool.length - 1), 1)[0]);
  }
  function pick(i) {
    if (!choosing || !choices[i]) return; var u = choices[i].id;
    if (u === 'rate') P.rate *= 0.8; if (u === 'dmg') P.dmg++; if (u === 'multi') P.multi++; if (u === 'speed') P.spd *= 1.15;
    if (u === 'heal') { P.max++; P.hp = P.max; } if (u === 'orb') P.orbs++; if (u === 'magnet') P.magnet += 70; if (u === 'pierce') P.pierce++;
    choosing = false; A.sfx('power'); fx.ring(P.x, P.y, '#c3ff5e', 120, 0.4); hud();
  }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['버틴 시간', fmtT(time)], ['처치', String(kills)], ['레벨', String(lvl)]]); return; }
    if (choosing) return;
    time += dt;
    var tx = 0, ty = 0;
    if (drag) { tx = drag.x - drag.sx; ty = drag.y - drag.sy; var d = Math.hypot(tx, ty); if (d > 10) { tx /= d; ty /= d; } else tx = ty = 0; }
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (kx || ky) { var l = Math.hypot(kx, ky); tx = kx / l; ty = ky / l; }
    P.x += tx * P.spd * dt; P.y += ty * P.spd * dt; if (P.inv > 0) P.inv -= dt;
    cam.x = A.lerp(cam.x, P.x - W / 2, Math.min(1, dt * 8)); cam.y = A.lerp(cam.y, P.y - H / 2, Math.min(1, dt * 8));
    // 적 생성
    spawnT -= dt; if (spawnT <= 0) { var n = 1 + Math.floor(time / 40); for (var i = 0; i < n; i++) spawnFoe(false); spawnT = Math.max(0.25, 1.1 - time / 200); }
    if (time > 300 && !bossOut) { bossOut = true; spawnFoe(true); S.banner('보스 출현', 'WARNING'); A.sfx('bigboom'); }
    // 사격
    P.fire -= dt;
    if (P.fire <= 0 && foes.length) {
      var near = null, nd = 1e9; foes.forEach(function (f) { var dd = Math.hypot(f.x - P.x, f.y - P.y); if (dd < nd) { nd = dd; near = f; } });
      if (nd < 520) {
        var a = Math.atan2(near.y - P.y, near.x - P.x);
        for (var k = 0; k < P.multi; k++) { var aa = a + (k - (P.multi - 1) / 2) * 0.15; bullets.push({ x: P.x, y: P.y, vx: Math.cos(aa) * 680, vy: Math.sin(aa) * 680, life: 0.9, pierce: P.pierce }); }
        A.sfx('shoot'); P.fire = P.rate;
      }
    }
    var j;
    for (i = bullets.length - 1; i >= 0; i--) { var b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; if (b.life <= 0) bullets.splice(i, 1); }
    // 회전 구슬
    orbs = []; for (k = 0; k < P.orbs; k++) { var oa = time * 3 + k / P.orbs * Math.PI * 2; orbs.push({ x: P.x + Math.cos(oa) * 80, y: P.y + Math.sin(oa) * 80 }); }
    for (i = foes.length - 1; i >= 0; i--) {
      var f = foes[i], fa = Math.atan2(P.y - f.y, P.x - f.x); f.x += Math.cos(fa) * f.sp * dt; f.y += Math.sin(fa) * f.sp * dt; if (f.hit > 0) f.hit -= dt;
      for (j = bullets.length - 1; j >= 0; j--) { var bb = bullets[j]; if (Math.hypot(bb.x - f.x, bb.y - f.y) < f.r + 5) { f.hp -= P.dmg; f.hit = 0.08; if (bb.pierce > 0) bb.pierce--; else bullets.splice(j, 1); if (f.hp <= 0) break; } }
      orbs.forEach(function (o) { if (Math.hypot(o.x - f.x, o.y - f.y) < f.r + 12 && f.hit <= 0) { f.hp -= P.dmg; f.hit = 0.2; } });
      if (f.hp <= 0) {
        foes.splice(i, 1); kills++; score += f.tp === 'boss' ? 5000 : f.tp === 'tank' ? 40 : 10;
        fx.burst(f.x - cam.x, f.y - cam.y, f.c, f.tp === 'boss' ? 60 : 10, 240, 0.5, 3); A.sfx(f.tp === 'boss' ? 'bigboom' : 'boom', A.rand(1, 1.5));
        gems.push({ x: f.x, y: f.y, v: f.tp === 'boss' ? 30 : f.tp === 'tank' ? 4 : 1 }); continue;
      }
      if (Math.hypot(f.x - P.x, f.y - P.y) < f.r + 12 && P.inv <= 0) {
        P.hp--; P.inv = 1; fx.shake(8, 0.25); fx.flashIt('#ff2244', 0.4); A.sfx('hurt'); A.vibrate(100);
        if (P.hp <= 0) { dyingT = 1.4; fx.burst(W / 2, H / 2, '#c3ff5e', 50, 420, 0.9, 4); A.sfx('bigboom'); }
      }
      if (Math.hypot(f.x - P.x, f.y - P.y) > 900) foes.splice(i, 1);
    }
    for (i = gems.length - 1; i >= 0; i--) {
      var g = gems[i], gd = Math.hypot(P.x - g.x, P.y - g.y);
      if (gd < P.magnet) { g.x += (P.x - g.x) * 8 * dt; g.y += (P.y - g.y) * 8 * dt; }
      if (gd < 22) { gems.splice(i, 1); xp += g.v; score += g.v * 2; A.sfx('tick', 1.5); if (xp >= need) levelUp(); }
    }
    hud();
  }
  function fmtT(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0a0f05'; c.fillRect(-10, -10, W + 20, H + 20);
    var cx = cam.x, cy = cam.y;
    c.strokeStyle = 'rgba(195,255,94,.07)'; c.lineWidth = 1;
    for (var x = -((cx % 60) + 60) % 60; x < W; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (var y = -((cy % 60) + 60) % 60; y < H; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.save(); c.translate(-cx, -cy);
    c.save(); c.globalCompositeOperation = 'lighter';
    (gems || []).forEach(function (g) { A.draw(c, A.glowDot('#c3ff5e', 4), g.x, g.y, g.v > 1 ? 1.4 : 0.8); });
    (bullets || []).forEach(function (b) { A.draw(c, A.glowDot('#ffffff', 3), b.x, b.y, 0.9); });
    (orbs || []).forEach(function (ob) { A.draw(c, A.glowDot('#5ee7ff', 6), ob.x, ob.y, 1.1); });
    c.restore();
    (foes || []).forEach(function (f) { c.fillStyle = f.hit > 0 ? '#fff' : f.c; c.beginPath(); if (f.tp === 'fast') { c.moveTo(f.x, f.y - f.r); c.lineTo(f.x + f.r, f.y + f.r); c.lineTo(f.x - f.r, f.y + f.r); } else c.arc(f.x, f.y, f.r, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.arc(f.x, f.y, f.r * 0.4, 0, 7); c.fill(); });
    if (P && dyingT <= 0 && !(P.inv > 0 && Math.floor(P.inv * 14) % 2)) { c.save(); c.shadowColor = '#c3ff5e'; c.shadowBlur = 18; c.fillStyle = '#efffd6'; c.beginPath(); c.arc(P.x, P.y, 14, 0, 7); c.fill(); c.restore(); }
    if (!P) { c.fillStyle = '#efffd6'; c.beginPath(); c.arc(cx + W / 2, cy + H / 2, 14, 0, 7); c.fill(); }
    c.restore();
    if (P) { // 체력·경험치 바
      for (var h = 0; h < P.max; h++) { c.fillStyle = h < P.hp ? '#ff4d6d' : 'rgba(255,255,255,.15)'; c.fillRect(16 + h * 22, H - 34, 18, 10); }
      c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(0, H - 8, W, 8); c.fillStyle = '#c3ff5e'; c.fillRect(0, H - 8, W * Math.min(1, xp / need), 8);
    }
    if (choosing) {
      c.fillStyle = 'rgba(5,8,2,.82)'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#c3ff5e'; c.font = '400 40px "Black Han Sans",system-ui'; c.textAlign = 'center'; c.fillText('레벨 업! 하나를 고르세요', W / 2, 250);
      choices.forEach(function (u, i) {
        var by = 320 + i * 150; c.fillStyle = 'rgba(195,255,94,.12)'; A.rr(c, 50, by, W - 100, 124, 18); c.fill(); c.strokeStyle = '#c3ff5e'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#fff'; c.font = '700 26px "Pretendard Variable",system-ui'; c.fillText((i + 1) + '. ' + u.name, W / 2, by + 52);
        c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '500 17px "Pretendard Variable",system-ui'; c.fillText(u.d, W / 2, by + 88);
      });
    }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + lvl + '|' + Math.floor(time); if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = lvl; document.getElementById('hC').textContent = fmtT(time); }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; var p = S.toLocal(e);
    if (choosing) { for (var i = 0; i < 3; i++) { var by = 320 + i * 150; if (p.y > by && p.y < by + 124) pick(i); } return; }
    drag = { id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y }; try { stage.setPointerCapture(e.pointerId); } catch (er) {}
  });
  stage.addEventListener('pointermove', function (e) { if (drag && drag.id === e.pointerId) { var p = S.toLocal(e); drag.x = p.x; drag.y = p.y; if (Math.hypot(drag.x - drag.sx, drag.y - drag.sy) > 90) { var a = Math.atan2(drag.y - drag.sy, drag.x - drag.sx); drag.sx = drag.x - Math.cos(a) * 90; drag.sy = drag.y - Math.sin(a) * 90; } } });
  stage.addEventListener('pointerup', function () { drag = null; });
  var S = new A.Shell({ id: 'survivor', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = true; if (choosing && /^[123]$/.test(k)) pick(+k - 1); },
    keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; } });
})();
