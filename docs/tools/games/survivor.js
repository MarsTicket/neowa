(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOP = 70;
  var fx = new A.FX();
  var P, foes, bullets, gems, orbs, time, score, kills, lvl, xp, need, choosing, choices, spawnT, dyingT, drag = null, keys = {}, cam = { x: 0, y: 0 }, bossN, hearts;
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
    foes = []; bullets = []; gems = []; orbs = []; time = 0; score = 0; kills = 0; lvl = 1; xp = 0; need = 5; choosing = false; spawnT = 0; dyingT = 0; drag = null; keys = {}; bossN = 0; hearts = []; choices = []; fx.clear(); hud();
  }
  function spawnFoe(boss) {
    var a = Math.random() * Math.PI * 2, d = 560, lv = time / 60;
    var tp = boss ? 'boss' : Math.random() < Math.min(0.35, lv * 0.08) ? 'tank' : Math.random() < Math.min(0.3, lv * 0.1) ? 'fast' : 'grunt';
    var base = { grunt: [14, 2, 70, '#ff4d6d'], fast: [11, 1, 130, '#ffb547'], tank: [24, 8, 45, '#b48cff'], boss: [56, 160, 55, '#ff7aa8'] }[tp];
    foes.push({ x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d, r: base[0], hp: Math.ceil(base[1] * (1 + lv * 0.35)), sp: base[2] + lv * 6, c: base[3], tp: tp, hit: 0 }); var nf = foes[foes.length - 1]; if (boss) nf.hp = Math.ceil(nf.hp * (1 + (bossN - 1) * 0.6)); nf.mhp = nf.hp;
  }
  function levelUp() {
    lvl++; xp -= need; need = Math.floor(need * 1.35 + 3); choosing = true; A.sfx('level');
    // 상한에 닿은 능력은 후보에서 뺌
    var pool = UP.filter(function (u) { return !maxed(u.id); }); if (pool.length < 3) pool = pool.concat(UP.filter(function (u) { return u.id === 'heal'; })); choices = []; for (var i = 0; i < 3 && pool.length; i++) choices.push(pool.splice(A.irand(0, pool.length - 1), 1)[0]);
  }
  function maxed(id) { return id === 'rate' ? P.rate < 0.1 : id === 'multi' ? P.multi >= 7 : id === 'orb' ? P.orbs >= 6 : id === 'pierce' ? P.pierce >= 5 : id === 'magnet' ? P.magnet >= 400 : id === 'speed' ? P.spd > 420 : id === 'heal' ? P.max >= 10 && P.hp >= P.max : false; }
  function pick(i) {
    if (!choosing || !choices[i]) return; var u = choices[i].id;
    if (u === 'rate') P.rate *= 0.8; if (u === 'dmg') P.dmg++; if (u === 'multi') P.multi++; if (u === 'speed') P.spd *= 1.15;
    if (u === 'heal') { P.max = Math.min(10, P.max + 1); P.hp = P.max; } if (u === 'orb') P.orbs++; if (u === 'magnet') P.magnet += 70; if (u === 'pierce') P.pierce++;
    choosing = false; drag = null; A.sfx('power'); fx.ring(W / 2, H / 2, '#c3ff5e', 120, 0.4);
    if (xp >= need) levelUp(); // 보석을 한꺼번에 많이 먹었을 때 남은 레벨업
    hud();
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
    spawnT -= dt; if (spawnT <= 0 && foes.length < 150) { var n = 1 + Math.floor(time / 40); for (var i = 0; i < n; i++) spawnFoe(false); spawnT = Math.max(0.25, 1.1 - time / 200); }
    if (time > 150 * (bossN + 1)) { bossN++; spawnFoe(true); S.banner('보스 출현', 'WARNING'); A.sfx('bigboom'); }
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
        gems.push({ x: f.x, y: f.y, v: f.tp === 'boss' ? 30 : f.tp === 'tank' ? 4 : 1 }); if (f.tp === 'boss' || Math.random() < 0.012) hearts.push({ x: f.x + 20, y: f.y }); continue;
      }
      if (Math.hypot(f.x - P.x, f.y - P.y) < f.r + 12 && P.inv <= 0) {
        P.hp--; P.inv = 1; fx.shake(8, 0.25); fx.flashIt('#ff2244', 0.4); A.sfx('hurt'); A.vibrate(100);
        if (P.hp <= 0) { dyingT = 1.4; fx.burst(P.x - cam.x, P.y - cam.y, '#c3ff5e', 50, 420, 0.9, 4); A.sfx('bigboom'); }
      }
      if (f.tp !== 'boss' && Math.hypot(f.x - P.x, f.y - P.y) > 900) foes.splice(i, 1);
    }
    for (i = gems.length - 1; i >= 0; i--) {
      var g = gems[i], gd = Math.hypot(P.x - g.x, P.y - g.y);
      if (gd < P.magnet) { g.x += (P.x - g.x) * 8 * dt; g.y += (P.y - g.y) * 8 * dt; }
      if (gd < 22) { gems.splice(i, 1); xp += g.v; score += g.v * 2; A.sfx('tick', 1.5); if (xp >= need && !choosing) levelUp(); }
      else if (gd > 1100) gems.splice(i, 1); // 멀리 두고 온 보석은 정리 (배열 누수 방지)
    }
    for (i = hearts.length - 1; i >= 0; i--) { var ht = hearts[i], hd = Math.hypot(P.x - ht.x, P.y - ht.y);
      if (hd < 26) { hearts.splice(i, 1); if (P.hp < P.max) P.hp++; score += 50; fx.text(W / 2, H / 2 - 40, '체력 +1', '#ff4d6d', 20); A.sfx('power'); } else if (hd > 1100) hearts.splice(i, 1); }
    hud();
  }
  function fmtT(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  /* 그림: 숲 바닥 타일, 적 4종(슬라임·박쥐·골렘·보스), 주인공, 보석 */
  var TILE = A.sprite('svtile', 240, 240, function (x) {
    // 이음새가 보이지 않도록 가장자리에 걸친 무늬는 반대편에도 그림
    function wrap(px, py, f) { for (var dx = -240; dx <= 240; dx += 240) for (var dy = -240; dy <= 240; dy += 240) { x.save(); x.translate(px + dx, py + dy); f(); x.restore(); } }
    x.fillStyle = '#0e1709'; x.fillRect(0, 0, 240, 240);
    var g = x.createRadialGradient(0, 0, 0, 0, 0, 50); g.addColorStop(0, 'rgba(60,90,30,.28)'); g.addColorStop(1, 'rgba(60,90,30,0)');
    for (var i = 0; i < 10; i++) wrap(Math.random() * 240, Math.random() * 240, function () { x.fillStyle = g; x.fillRect(-50, -50, 100, 100); });
    for (i = 0; i < 60; i++) { var a = 0.12 + Math.random() * 0.25; wrap(Math.random() * 240, Math.random() * 240, function () { x.strokeStyle = 'rgba(140,200,80,' + a + ')'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, 0); x.lineTo(-2, -6); x.moveTo(0, 0); x.lineTo(2, -7); x.moveTo(0, 0); x.lineTo(0.5, -8); x.stroke(); }); }
    for (i = 0; i < 5; i++) { var r = 3 + Math.random() * 5; wrap(Math.random() * 240, Math.random() * 240, function () { x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(1, 2, r, r * 0.6, 0, 0, 7); x.fill(); x.fillStyle = '#3a4430'; x.beginPath(); x.ellipse(0, 0, r, r * 0.65, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.ellipse(-r * 0.3, -r * 0.25, r * 0.4, r * 0.2, 0, 0, 7); x.fill(); }); }
    for (i = 0; i < 6; i++) { var fc = ['#ff8fb0', '#ffe066', '#9be7ff'][i % 3]; wrap(Math.random() * 240, Math.random() * 240, function () { x.fillStyle = fc; x.globalAlpha = 0.55; x.beginPath(); x.arc(0, 0, 1.8, 0, 7); x.fill(); x.globalAlpha = 1; }); }
  });
  function eyes(x, ex, ey, s) { x.fillStyle = '#fff'; x.beginPath(); x.arc(-ex, ey, s, 0, 7); x.arc(ex, ey, s, 0, 7); x.fill(); x.fillStyle = '#1a0010'; x.beginPath(); x.arc(-ex + s * 0.25, ey + s * 0.2, s * 0.55, 0, 7); x.arc(ex + s * 0.25, ey + s * 0.2, s * 0.55, 0, 7); x.fill(); }
  function foeSpr(tp, white) {
    var R = { grunt: 14, fast: 11, tank: 24, boss: 56 }[tp], sz = Math.ceil(R * 2.6);
    return A.sprite('svf' + tp + (white ? 'w' : ''), sz, sz, function (x) {
      x.translate(sz / 2, sz / 2);
      var col = { grunt: ['#ff8fa3', '#d0203f'], fast: ['#ffd38a', '#d0701a'], tank: ['#d4b8ff', '#5a3aa8'], boss: ['#ffb0cf', '#a0204e'] }[tp];
      if (white) col = ['#ffffff', '#e8e8e8'];
      var g = x.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.1); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
      x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(0, R * 0.95, R * 0.9, R * 0.25, 0, 0, 7); x.fill();
      x.fillStyle = g;
      if (tp === 'grunt') { x.beginPath(); x.moveTo(-R, R * 0.7); x.quadraticCurveTo(-R * 1.05, -R * 0.9, 0, -R); x.quadraticCurveTo(R * 1.05, -R * 0.9, R, R * 0.7); x.quadraticCurveTo(0, R * 1.05, -R, R * 0.7); x.fill(); eyes(x, R * 0.36, -R * 0.1, R * 0.26); }
      else if (tp === 'fast') { x.beginPath(); x.moveTo(-R * 1.25, -R * 0.6); x.quadraticCurveTo(-R * 0.6, -R * 0.1, -R * 0.5, R * 0.3); x.lineTo(0, R * 0.8); x.lineTo(R * 0.5, R * 0.3); x.quadraticCurveTo(R * 0.6, -R * 0.1, R * 1.25, -R * 0.6); x.quadraticCurveTo(R * 0.5, -R * 0.3, R * 0.4, -R * 0.75); x.lineTo(0, -R * 0.5); x.lineTo(-R * 0.4, -R * 0.75); x.quadraticCurveTo(-R * 0.5, -R * 0.3, -R * 1.25, -R * 0.6); x.fill(); x.fillStyle = '#fff6a0'; x.beginPath(); x.arc(-R * 0.22, -R * 0.1, R * 0.15, 0, 7); x.arc(R * 0.22, -R * 0.1, R * 0.15, 0, 7); x.fill(); }
      else if (tp === 'tank') { A.rr(x, -R, -R * 0.9, R * 2, R * 1.8, R * 0.45); x.fill(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(-R * 0.6, -R * 0.9); x.lineTo(-R * 0.3, R * 0.9); x.moveTo(R * 0.5, -R * 0.9); x.lineTo(R * 0.2, R * 0.1); x.stroke(); x.fillStyle = white ? '#fff' : '#ffe066'; x.fillRect(-R * 0.55, -R * 0.3, R * 0.35, R * 0.18); x.fillRect(R * 0.2, -R * 0.3, R * 0.35, R * 0.18); }
      else { x.beginPath(); x.arc(0, 0, R * 0.92, 0, 7); x.fill(); x.fillStyle = white ? '#fff' : '#ffe0ea'; [[-1, 1], [1, 1]].forEach(function (d) { x.beginPath(); x.moveTo(d[0] * R * 0.45, -R * 0.75); x.lineTo(d[0] * R * 0.8, -R * 1.25); x.lineTo(d[0] * R * 0.75, -R * 0.55); x.fill(); }); eyes(x, R * 0.32, -R * 0.15, R * 0.2); x.fillStyle = '#3a0016'; x.beginPath(); x.arc(0, R * 0.3, R * 0.35, 0, Math.PI); x.fill(); x.fillStyle = '#fff'; for (var k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(k * R * 0.13 - R * 0.05, R * 0.3); x.lineTo(k * R * 0.13, R * 0.42); x.lineTo(k * R * 0.13 + R * 0.05, R * 0.3); x.fill(); } }
      if (!white) { x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(-R * 0.4, -R * 0.5, R * 0.25, R * 0.12, -0.6, 0, 7); x.fill(); }
    });
  }
  var HERO = A.sprite('svhero', 60, 60, function (x) {
    x.translate(30, 30);
    var aura = x.createRadialGradient(0, 0, 8, 0, 0, 30); aura.addColorStop(0, 'rgba(195,255,94,.45)'); aura.addColorStop(1, 'rgba(195,255,94,0)'); x.fillStyle = aura; x.fillRect(-30, -30, 60, 60);
    x.fillStyle = 'rgba(0,0,0,.4)'; x.beginPath(); x.ellipse(0, 15, 12, 4, 0, 0, 7); x.fill();
    var g = x.createLinearGradient(0, -14, 0, 16); g.addColorStop(0, '#7ccf3a'); g.addColorStop(1, '#2e6a12');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, -16); x.quadraticCurveTo(12, -12, 13, 14); x.lineTo(-13, 14); x.quadraticCurveTo(-12, -12, 0, -16); x.fill();
    x.fillStyle = '#ffe1c4'; x.beginPath(); x.arc(0, -4, 6.5, 0, 7); x.fill();
    x.fillStyle = '#1c2a10'; x.beginPath(); x.arc(-2.4, -4, 1.2, 0, 7); x.arc(2.4, -4, 1.2, 0, 7); x.fill();
    x.fillStyle = '#efffd6'; x.beginPath(); x.moveTo(-11, -9); x.quadraticCurveTo(0, -24, 11, -9); x.quadraticCurveTo(0, -14, -11, -9); x.fill();
    x.strokeStyle = '#c38a4a'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(13, 14); x.lineTo(16, -14); x.stroke();
    x.fillStyle = '#c3ff5e'; x.beginPath(); x.arc(16, -16, 4, 0, 7); x.fill();
  });
  var GEM = A.sprite('svgem', 22, 22, function (x) {
    x.translate(11, 11); var g = x.createLinearGradient(-6, -8, 6, 8); g.addColorStop(0, '#f4ffd0'); g.addColorStop(0.5, '#c3ff5e'); g.addColorStop(1, '#4a9a10');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, -9); x.lineTo(7, -2); x.lineTo(0, 9); x.lineTo(-7, -2); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.moveTo(0, -9); x.lineTo(-3, -2); x.lineTo(0, -1); x.fill();
  });
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var cx = cam.x, cy = cam.y;
    var ox = -(((cx % 240) + 240) % 240), oy = -(((cy % 240) + 240) % 240);
    for (var tx = ox - 10; tx < W + 10; tx += 240) for (var ty = oy - 10; ty < H + 10; ty += 240) c.drawImage(TILE, Math.round(tx), Math.round(ty), 240, 240);
    c.save(); c.translate(-cx, -cy);
    (gems || []).forEach(function (g) { A.draw(c, GEM, g.x, g.y + Math.sin(t * 5 + g.x) * 2, g.v > 1 ? 1.25 : 0.85); });
    c.save(); c.globalCompositeOperation = 'lighter';
    (gems || []).forEach(function (g) { if (g.v > 1) A.draw(c, A.glowDot('#c3ff5e', 5), g.x, g.y, 1); });
    (bullets || []).forEach(function (b) { var sp = Math.hypot(b.vx, b.vy) || 1; c.strokeStyle = 'rgba(255,240,180,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(b.x - b.vx / sp * 16, b.y - b.vy / sp * 16); c.lineTo(b.x, b.y); c.stroke(); A.draw(c, A.glowDot('#fff6c0', 3), b.x, b.y, 0.9); });
    (orbs || []).forEach(function (ob) { A.draw(c, A.glowDot('#5ee7ff', 6), ob.x, ob.y, 1.1 + Math.sin(t * 10) * 0.1); });
    c.restore();
    (hearts || []).forEach(function (ht) { var hs = 1 + Math.sin(t * 6) * 0.12; c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(ht.x - 6 * hs, ht.y - 3, 7 * hs, 0, 7); c.arc(ht.x + 6 * hs, ht.y - 3, 7 * hs, 0, 7); c.fill(); c.beginPath(); c.moveTo(ht.x - 13 * hs, ht.y); c.lineTo(ht.x, ht.y + 14 * hs); c.lineTo(ht.x + 13 * hs, ht.y); c.fill(); });
    (foes || []).forEach(function (f) {
      var sq = 1 + Math.sin(t * (f.tp === 'fast' ? 22 : 8) + f.x * 0.1) * (f.tp === 'tank' ? 0.03 : 0.07);
      var spr = foeSpr(f.tp, f.hit > 0), sc = f.r / { grunt: 14, fast: 11, tank: 24, boss: 56 }[f.tp];
      c.save(); c.translate(f.x, f.y); c.scale(sc * (2 - sq), sc * sq); c.drawImage(spr, -spr.w / 2, -spr.h / 2, spr.w, spr.h); c.restore();
    });
    var hx = P ? P.x : cx + W / 2, hy = P ? P.y : cy + H / 2;
    if (!P || (dyingT <= 0 && !(P.inv > 0 && Math.floor(P.inv * 14) % 2))) A.draw(c, HERO, hx, hy - 4 + Math.sin(t * 6) * 1.5, 1.05);
    c.restore();
    if (P) { // 체력·경험치 바
      for (var h = 0; h < P.max; h++) { c.fillStyle = h < P.hp ? '#ff4d6d' : 'rgba(255,255,255,.15)'; c.fillRect(16 + h * 22, H - 34, 18, 10); }
      c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(0, H - 8, W, 8); c.fillStyle = '#c3ff5e'; c.fillRect(0, H - 8, W * Math.min(1, xp / need), 8);
      foes.forEach(function (f) { if (f.tp !== 'boss') return; c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(70, 96, W - 140, 10); c.fillStyle = '#ff7aa8'; c.fillRect(70, 96, (W - 140) * Math.max(0, f.hp / f.mhp), 10);
        var dx = f.x - P.x, dy = f.y - P.y; if (Math.abs(dx) > W / 2 || Math.abs(dy) > H / 2) { var a = Math.atan2(dy, dx), ex = A.clamp(W / 2 + Math.cos(a) * 240, 20, W - 20), ey = A.clamp(H / 2 + Math.sin(a) * 420, 120, H - 50); c.fillStyle = '#ff7aa8'; c.beginPath(); c.arc(ex, ey, 9 + Math.sin(t * 8) * 3, 0, 7); c.fill(); } });
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
