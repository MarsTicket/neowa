(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, SEG = 30;
  var fx = new A.FX();
  var P, walls, pillars, gems, speed, dist, score, gemN, hold = false, dyingT, started, graceT, bonus, nearN, nextMile, lastPillarX;
  // 동굴 벽: x 간격 SEG 마다 (위, 아래) 높이
  function nextWall() {
    var last = walls[walls.length - 1], lv = Math.min(1, dist / 12000);
    var gap = A.lerp(560, 280, lv) + Math.sin(dist / 900) * 40;
    // 벽 기울기 제한: 지금 속도에서 비행기가 따라갈 수 있는 만큼만 위아래로 꺾임 (초당 약 420px)
    var maxStep = 420 * SEG / Math.max(300, speed);
    var mid = A.clamp(last.mid + A.clamp(A.rand(-34, 34) * (0.6 + lv), -maxStep, maxStep), 130 + gap / 2, H - 70 - gap / 2);
    var nx = last.x + SEG, top = mid - gap / 2, bot = mid + gap / 2, pill = false;
    walls.push({ x: nx, mid: mid, gap: gap });
    // 기둥: 한쪽에는 반드시 130px 이상 통로를 남기고, 기둥끼리는 충분히 떨어뜨림
    if (Math.random() < 0.035 + lv * 0.03 && walls.length > 30 && nx - lastPillarX > Math.max(280, speed * 0.75)) {
      var ph = Math.min(A.rand(80, 160 + lv * 60), gap - 150), below = Math.random() < 0.5;
      if (ph >= 60) {
        var lo = below ? top + ph / 2 : top + 130 + ph / 2, hi = below ? bot - 130 - ph / 2 : bot - ph / 2;
        if (hi >= lo) { pillars.push({ x: nx, y: A.rand(lo, hi), h: ph, w: 26, clr: 1e9, done: false }); lastPillarX = nx; pill = true; }
      }
    }
    if (!pill && Math.random() < 0.06) gems.push({ x: nx, y: mid + A.rand(-gap / 3, gap / 3) });
  }
  function reset() {
    P = { x: 130, y: H / 2, vy: 0 }; walls = []; pillars = []; gems = []; speed = 300; dist = 0; score = 0; gemN = 0; dyingT = 0; hold = false;
    started = false; graceT = 0; bonus = 0; nearN = 0; nextMile = 500; lastPillarX = -1e9;
    walls.push({ x: -SEG * 2, mid: H / 2, gap: 560 });
    while (walls[walls.length - 1].x < W + SEG * 2) { var l = walls[walls.length - 1]; walls.push({ x: l.x + SEG, mid: H / 2, gap: 560 }); }
    fx.clear(); hud();
  }
  function wallAt(x) {
    for (var i = 0; i < walls.length - 1; i++) if (walls[i].x <= x && walls[i + 1].x > x) {
      var k = (x - walls[i].x) / SEG, a = walls[i], b = walls[i + 1];
      var mid = A.lerp(a.mid, b.mid, k), gap = A.lerp(a.gap, b.gap, k); return { top: mid - gap / 2, bot: mid + gap / 2 };
    }
    return { top: 0, bot: H };
  }
  function die() {
    if (dyingT > 0) return; dyingT = 1.2;
    fx.burst(P.x, P.y, '#5effc8', 40, 400, 0.8, 4); fx.burst(P.x, P.y, '#fff', 12, 280, 0.4, 2.4);
    fx.shake(12, 0.4); fx.flashIt('#ff2244', 0.5); A.sfx('bigboom'); A.vibrate(160);
  }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['거리', Math.floor(dist / 10) + 'm'], ['크리스털', String(gemN)], ['아슬아슬', String(nearN)]]); return; }
    speed = Math.min(620, 300 + dist / 60);
    var dx = speed * dt; dist += dx;
    walls.forEach(function (w) { w.x -= dx; }); pillars.forEach(function (p) { p.x -= dx; }); gems.forEach(function (g) { g.x -= dx; });
    while (walls.length && walls[1].x < -SEG) walls.shift();
    while (walls[walls.length - 1].x < W + SEG * 2) nextWall();
    pillars = pillars.filter(function (p) { return p.x > -40; }); gems = gems.filter(function (g) { return g.x > -20; });
    // 시작 직후: 처음 누를 때까지(최대 2.5초) 가운데에 떠서 기다림 → 바로 추락하지 않음
    if (!started) { graceT += dt; if (hold || graceT > 2.5) started = true; else { P.y = A.lerp(P.y, H / 2 + Math.sin(graceT * 4) * 14, Math.min(1, dt * 6)); P.vy = 0; } }
    if (started) { P.vy += (hold ? -1900 : 1700) * dt; P.vy = A.clamp(P.vy, -560, 620); P.y += P.vy * dt; }
    if (hold) fx.spark(P.x - 18, P.y + 6, A.pick(['#5effc8', '#fff']), -speed * 0.5, A.rand(60, 160), 0.3, 2.4);
    var w = wallAt(P.x);
    if (P.y - 12 < w.top || P.y + 12 > w.bot) die();
    pillars.forEach(function (p) {
      if (Math.abs(p.x - P.x) < p.w / 2 + 12 && Math.abs(p.y - P.y) < p.h / 2 + 10) die();
      if (Math.abs(p.x - P.x) < p.w / 2 + 40) p.clr = Math.min(p.clr, Math.abs(p.y - P.y) - p.h / 2 - 10);
      // 기둥 통과 보너스: 가까이 스칠수록 큼
      if (!p.done && p.x + p.w / 2 < P.x - 14 && dyingT <= 0) {
        p.done = true;
        if (p.clr < 34) { nearN++; bonus += 30; fx.text(P.x + 10, P.y - 30, '아슬아슬 +30', '#ff9ecf', 18); A.sfx('tick', 1.3); }
        else { bonus += 10; fx.text(P.x + 10, P.y - 30, '+10', '#9fffe0', 14); }
      }
    });
    for (var i = gems.length - 1; i >= 0; i--) if (Math.hypot(gems[i].x - P.x, gems[i].y - P.y) < 30) { var g = gems.splice(i, 1)[0]; gemN++; fx.burst(g.x, g.y, '#ffd166', 12, 200, 0.4, 3); fx.text(g.x, g.y - 20, '+25', '#ffd166', 18); A.sfx('coin', 1 + (gemN % 8) * 0.04); }
    score = Math.floor(dist / 10) + gemN * 25 + bonus;
    if (dist / 10 >= nextMile) { S.banner(nextMile + 'm', nextMile % 1500 ? '동굴이 좁아집니다' : '속도 UP!'); A.sfx('level'); nextMile += 500; }
    hud();
  }
  /* 그림: 먼 동굴 층(빛나는 이끼·수정), 바위 결 벽, 수정 기둥, 보석, 탐사선 */
  var FAR = A.sprite('cvfar', W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#010c0a'); g.addColorStop(0.5, '#05241d'); g.addColorStop(1, '#010c0a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var k = 0; k < 2; k++) { x.fillStyle = k ? 'rgba(10,50,40,.8)' : 'rgba(6,34,28,.8)'; for (var side = 0; side < 2; side++) { x.beginPath(); x.moveTo(0, side ? H : 0); for (var xx = 0; xx <= W; xx += 18) { var hh = 140 + k * 60 + Math.sin(xx * 0.02 + k * 3 + side) * 50 + Math.sin(xx * 0.07 + side * 2) * 18; x.lineTo(xx, side ? H - hh : hh); } x.lineTo(W, side ? H : 0); x.fill(); } }
    for (var i = 0; i < 40; i++) { var px = Math.random() * W, py = Math.random() < 0.5 ? Math.random() * 220 : H - Math.random() * 220; var gg = x.createRadialGradient(px, py, 0, px, py, 14); gg.addColorStop(0, 'rgba(94,255,200,.5)'); gg.addColorStop(1, 'rgba(94,255,200,0)'); x.fillStyle = gg; x.fillRect(px - 14, py - 14, 28, 28); }
  });
  var ROCK = A.sprite('cvrock', 240, 240, function (x) {
    x.fillStyle = '#0d3a30'; x.fillRect(0, 0, 240, 240);
    for (var i = 0; i < 34; i++) { var r = 8 + Math.random() * 22, bx = Math.random() * 240, by = Math.random() * 240, rot = Math.random() * 3; for (var dx = -240; dx <= 240; dx += 240) for (var dy = -240; dy <= 240; dy += 240) { var cx = bx + dx, cy = by + dy; var g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r); g.addColorStop(0, '#1d6a56'); g.addColorStop(1, '#0a2e26'); x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, r, r * 0.7, rot, 0, 7); x.fill(); } }
    x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2; for (i = 0; i < 12; i++) { x.beginPath(); var sx = Math.random() * 240, sy = Math.random() * 240; x.moveTo(sx, sy); x.lineTo(sx + 20, sy + 10); x.lineTo(sx + 30, sy + 30); x.stroke(); }
  });
  var CRYS = A.sprite('cvcrys', 40, 50, function (x) {
    x.translate(20, 48); [[-9, 26, -0.3], [0, 40, 0], [9, 22, 0.35]].forEach(function (c) {
      x.save(); x.rotate(c[2]); var g = x.createLinearGradient(-5, 0, 5, 0); g.addColorStop(0, '#d0fff0'); g.addColorStop(0.5, '#5effc8'); g.addColorStop(1, '#1a8a6a');
      x.fillStyle = g; x.beginPath(); x.moveTo(c[0] - 5, 0); x.lineTo(c[0] - 5, -c[1] * 0.75); x.lineTo(c[0], -c[1]); x.lineTo(c[0] + 5, -c[1] * 0.75); x.lineTo(c[0] + 5, 0); x.fill(); x.restore();
    });
  });
  var GEM = A.sprite('cvgem', 30, 30, function (x) {
    x.translate(15, 15); var g = x.createLinearGradient(-8, -10, 8, 10); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.5, '#ffd166'); g.addColorStop(1, '#b06a00');
    x.fillStyle = g; x.beginPath(); x.moveTo(-9, -3); x.lineTo(-4, -9); x.lineTo(4, -9); x.lineTo(9, -3); x.lineTo(0, 10); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(120,60,0,.5)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-9, -3); x.lineTo(9, -3); x.moveTo(-4, -9); x.lineTo(-2, -3); x.lineTo(0, 10); x.lineTo(2, -3); x.lineTo(4, -9); x.stroke();
  });
  var SHIP = A.sprite('cvship', 64, 44, function (x) {
    x.translate(30, 22);
    var g = x.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#8ac8b8');
    x.fillStyle = '#1a6a56'; x.beginPath(); x.moveTo(-6, -4); x.lineTo(-16, -16); x.lineTo(-2, -8); x.fill(); x.beginPath(); x.moveTo(-6, 4); x.lineTo(-16, 16); x.lineTo(-2, 8); x.fill();
    x.fillStyle = g; x.beginPath(); x.moveTo(26, 0); x.quadraticCurveTo(10, -11, -14, -8); x.lineTo(-18, 0); x.lineTo(-14, 8); x.quadraticCurveTo(10, 11, 26, 0); x.fill();
    x.fillStyle = '#0a3a6a'; x.beginPath(); x.ellipse(8, -2, 7, 4, 0, 0, 7); x.fill(); x.fillStyle = 'rgba(160,240,255,.8)'; x.beginPath(); x.ellipse(9, -3.5, 3.5, 1.5, 0, 0, 7); x.fill();
    x.fillStyle = '#ff9a3a'; x.fillRect(-20, -3, 4, 6);
  });
  var rockPat = null;
  function render(c) {
    var o = fx.offset(), t = S.time, d = dist || t * 100;
    c.save(); c.translate(o[0], o[1]);
    var fo = -((d * 0.15) % W); c.drawImage(FAR, fo - 1, -10, W + 2, H + 20); c.drawImage(FAR, fo + W - 2, -10, W + 2, H + 20);
    // 떠다니는 포자
    c.save(); c.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 26; i++) { var x = ((i * 137 - d * 0.35) % W + W) % W, y = (i * 211 + Math.sin(t + i) * 20) % H; c.globalAlpha = 0.3 + (i % 4) * 0.12; A.draw(c, A.glowDot('#5effc8', 2), x, y, 0.8); }
    c.restore(); c.globalAlpha = 1;
    var ws = walls || [];
    if (!walls) { for (var k = -2; k < 22; k++) ws.push({ x: k * SEG, mid: H / 2 + Math.sin(k * 0.4 + t) * 40, gap: 520 }); }
    // 벽: 바위 무늬로 채우고 가장자리에 빛나는 이끼 줄
    var rx = -((d) % 240);
    ['top', 'bot'].forEach(function (side) {
      c.save(); c.beginPath();
      c.moveTo(ws[0].x, side === 'top' ? -20 : H + 20);
      ws.forEach(function (w) { c.lineTo(w.x, side === 'top' ? w.mid - w.gap / 2 : w.mid + w.gap / 2); });
      c.lineTo(ws[ws.length - 1].x, side === 'top' ? -20 : H + 20); c.closePath(); c.clip();
      for (var tx = rx; tx < W + 240; tx += 240) for (var ty = -10; ty < H + 10; ty += 240) c.drawImage(ROCK, tx, ty, 240, 240);
      c.restore();
      c.strokeStyle = 'rgba(94,255,200,.25)'; c.lineWidth = 9; c.beginPath();
      ws.forEach(function (w, n) { var y = side === 'top' ? w.mid - w.gap / 2 : w.mid + w.gap / 2; if (n) c.lineTo(w.x, y); else c.moveTo(w.x, y); }); c.stroke();
      c.strokeStyle = '#5effc8'; c.lineWidth = 2.5; c.stroke();
      // 가장자리 수정
      ws.forEach(function (w, n) { var id = Math.round((w.x + d) / SEG); if (((id * 7919) % 11) !== 0) return; var y = side === 'top' ? w.mid - w.gap / 2 : w.mid + w.gap / 2; c.save(); c.translate(w.x, y); if (side === 'top') c.scale(1, -1); c.drawImage(CRYS, -14, -32, 28, 35); c.restore(); });
    });
    (pillars || []).forEach(function (p) {
      c.save(); A.rr(c, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 10); c.clip(); c.drawImage(ROCK, p.x - 120, p.y - 120, 240, 240); c.fillStyle = 'rgba(255,77,109,.18)'; c.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h); c.restore();
      c.strokeStyle = '#ff4d6d'; c.lineWidth = 3; A.rr(c, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 10); c.stroke();
    });
    (gems || []).forEach(function (gm) { c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ffd166', 6), gm.x, gm.y, 1 + Math.sin(t * 6) * 0.1); c.restore(); A.draw(c, GEM, gm.x, gm.y, 1); });
    var px = P ? P.x : 130, py = P ? P.y : H / 2 + Math.sin(t * 2) * 30, ang = P ? A.clamp(P.vy / 900, -0.5, 0.5) : 0;
    if (!P || dyingT <= 0) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (var q = 1; q <= 5; q++) { c.globalAlpha = (hold ? 0.5 : 0.25) / q; A.draw(c, A.glowDot('#ff9a3a', 4), px - 20 - q * 9, py + Math.sin(ang) * -q * 8, hold ? 1.3 : 0.9); }
      c.restore(); c.globalAlpha = 1;
      A.draw(c, SHIP, px, py, 1, ang);
    }
    if (P && !started && dyingT <= 0) {
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(230,255,247,' + (0.65 + Math.sin(t * 6) * 0.3) + ')';
      c.font = '700 26px "Pretendard Variable",system-ui'; c.fillText('누르고 있으면 상승', W / 2, H / 2 - 110);
      c.font = '600 18px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(230,255,247,.6)'; c.fillText('떼면 내려가요', W / 2, H / 2 - 78);
    }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + gemN; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = Math.floor(dist / 10) + 'm'; document.getElementById('hC').textContent = gemN; }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state === 'playing') { e.preventDefault(); hold = true; } });
  window.addEventListener('pointerup', function () { hold = false; }); window.addEventListener('pointercancel', function () { hold = false; }); window.addEventListener('blur', function () { hold = false; });
  var S = new A.Shell({ id: 'cave', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') hold = true; },
    keyup: function (e) { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') hold = false; } });
})();
