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
    for (var i = gems.length - 1; i >= 0; i--) if (Math.hypot(gems[i].x - P.x, gems[i].y - P.y) < 30) { var g = gems.splice(i, 1)[0]; gemN++; fx.burst(g.x, g.y, '#ffd166', 12, 200, 0.4, 3); fx.text(g.x, g.y - 20, '+25', '#ffd166', 18); A.sfx('coin'); }
    score = Math.floor(dist / 10) + gemN * 25 + bonus;
    if (dist / 10 >= nextMile) { S.banner(nextMile + 'm', nextMile % 1500 ? '동굴이 좁아집니다' : '속도 UP!'); A.sfx('level'); nextMile += 500; }
    hud();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#02110e'); g.addColorStop(0.5, '#062820'); g.addColorStop(1, '#02110e');
    c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    // 배경 반짝임
    for (var i = 0; i < 40; i++) { var x = ((i * 137 - (dist || t * 100) * 0.2) % W + W) % W, y = (i * 211) % H; c.fillStyle = 'rgba(94,255,200,' + (0.1 + (i % 5) * 0.04) + ')'; c.fillRect(x, y, 2, 2); }
    var ws = walls || [];
    if (!walls) { for (var k = -2; k < 22; k++) ws.push({ x: k * SEG, mid: H / 2 + Math.sin(k * 0.4 + t) * 40, gap: 520 }); }
    // 벽
    ['top', 'bot'].forEach(function (side) {
      c.beginPath();
      c.moveTo(ws[0].x, side === 'top' ? -20 : H + 20);
      ws.forEach(function (w) { c.lineTo(w.x, side === 'top' ? w.mid - w.gap / 2 : w.mid + w.gap / 2); });
      c.lineTo(ws[ws.length - 1].x, side === 'top' ? -20 : H + 20); c.closePath();
      var gg = c.createLinearGradient(0, side === 'top' ? 0 : H, 0, H / 2); gg.addColorStop(0, '#0a3d31'); gg.addColorStop(1, '#14644f');
      c.fillStyle = gg; c.fill();
      c.save(); c.shadowColor = '#5effc8'; c.shadowBlur = 0; c.strokeStyle = '#5effc8'; c.lineWidth = 3; c.beginPath();
      ws.forEach(function (w, n) { var y = side === 'top' ? w.mid - w.gap / 2 : w.mid + w.gap / 2; if (n) c.lineTo(w.x, y); else c.moveTo(w.x, y); }); c.stroke(); c.restore();
    });
    (pillars || []).forEach(function (p) { c.fillStyle = '#14644f'; A.rr(c, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 10); c.fill(); c.strokeStyle = '#ff4d6d'; c.lineWidth = 3; c.stroke(); });
    c.save(); c.globalCompositeOperation = 'lighter';
    (gems || []).forEach(function (gm) { A.draw(c, A.glowDot('#ffd166', 6), gm.x, gm.y, 1 + Math.sin(t * 6) * 0.1); });
    c.restore();
    var px = P ? P.x : 130, py = P ? P.y : H / 2 + Math.sin(t * 2) * 30, ang = P ? A.clamp(P.vy / 900, -0.5, 0.5) : 0;
    if (!P || dyingT <= 0) {
      c.save(); c.translate(px, py); c.rotate(ang);
      c.shadowColor = '#5effc8'; c.shadowBlur = 16; c.fillStyle = '#e6fff7';
      c.beginPath(); c.moveTo(22, 0); c.lineTo(-14, -12); c.lineTo(-8, 0); c.lineTo(-14, 12); c.closePath(); c.fill(); c.restore();
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
