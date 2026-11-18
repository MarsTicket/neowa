(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOPY = 260, BOTY = 760, T = 30;   // 천장·바닥 위치, 판 두께
  var fx = new A.FX();
  var P, segs, stars, speed, dist, score, starN, dyingT, nextX, bufT, coyT, bonus, nearN, nextMile;
  // 길: 위/아래 판 조각(있음/없음) + 가시
  function gen() {
    var lv = Math.min(1, dist / 15000), len = A.rand(200, 380), x = nextX;
    var r = Math.random(), top = true, bot = true, spikes = [];
    if (dist > 400) {
      if (r < 0.3) bot = false; else if (r < 0.55) top = false;
      else if (r < 0.85) {
        var n = A.irand(1, 2 + Math.floor(lv * 2)), cand = [], i;
        for (i = 0; i < n; i++) cand.push({ side: Math.random() < 0.5 ? 'top' : 'bot', x: x + A.rand(40, len - 50) });
        cand.sort(function (a, b) { return a.x - b.x; });
        // 가시 간격 보장: 같은 쪽 60px, 반대쪽 150px 이상 (위아래 동시에 막혀 못 지나가는 배치 방지)
        cand.forEach(function (k) { var p = spikes[spikes.length - 1]; if (!p || k.x - p.x >= (p.side === k.side ? 60 : 150)) spikes.push(k); });
      }
    }
    segs.push({ x: x, len: len, top: top, bot: bot, spikes: spikes });
    if (Math.random() < 0.5) stars.push({ x: x + len / 2, y: A.pick([TOPY + 60, BOTY - 60, (TOPY + BOTY) / 2]) });
    nextX = x + len + (top && bot ? 0 : 0);
  }
  function reset() { P = { x: 130, y: BOTY - 22, vy: 0, g: 1, ground: true, rot: 0 }; segs = []; stars = []; speed = 340; dist = 0; score = 0; starN = 0; dyingT = 0; nextX = -100;
    bufT = 0; coyT = 0; bonus = 0; nearN = 0; nextMile = 500; while (nextX < W + 400) gen(); fx.clear(); hud(); }
  function floorHere(side) { for (var i = 0; i < segs.length; i++) { var s = segs[i]; if (P.x >= s.x && P.x < s.x + s.len) return s[side]; } return true; }
  // 착지 직전(0.15초)에 누른 탭은 기억했다가 착지하자마자 반전, 발판 끝에서 떨어진 직후(0.08초)에도 반전 허용
  function flip() { if (S.state !== 'playing' || dyingT > 0) return; if (!P.ground && coyT <= 0) { bufT = 0.15; return; } bufT = 0; coyT = 0; P.g *= -1; P.ground = false; P.vy = 0; A.sfx('turn', P.g > 0 ? 0.8 : 1.6); fx.burst(P.x, P.y, '#7aa2ff', 8, 160, 0.3, 2.4); }
  function die() { if (dyingT > 0) return; dyingT = 1.1; fx.burst(P.x, P.y, '#7aa2ff', 40, 420, 0.8, 4); fx.shake(12, 0.4); fx.flashIt('#ff2244', 0.5); A.sfx('hurt'); A.vibrate(160); }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['거리', Math.floor(dist / 10) + 'm'], ['별', String(starN)], ['아슬아슬', String(nearN)]]); return; }
    speed = Math.min(760, 340 + dist / 50); var dx = speed * dt; dist += dx; nextX -= dx;
    segs.forEach(function (s) { s.x -= dx; s.spikes.forEach(function (k) { k.x -= dx; }); }); stars.forEach(function (s) { s.x -= dx; });
    segs = segs.filter(function (s) { return s.x + s.len > -50; }); stars = stars.filter(function (s) { return s.x > -30; });
    while (nextX < W + 400) gen();
    var wasGround = P.ground;
    P.vy += 3200 * P.g * dt; P.y += P.vy * dt; P.ground = false;
    var side = P.g > 0 ? 'bot' : 'top';
    if (floorHere(side)) {
      if (P.g > 0 && P.y >= BOTY - 22) { P.y = BOTY - 22; P.vy = 0; P.ground = true; }
      if (P.g < 0 && P.y <= TOPY + 22) { P.y = TOPY + 22; P.vy = 0; P.ground = true; }
    }
    if (wasGround && !P.ground) coyT = 0.08; else if (coyT > 0) coyT -= dt;
    if (bufT > 0) { bufT -= dt; if (P.ground) flip(); }
    if (P.y > H + 60 || P.y < -60) die();
    P.rot += (P.ground ? 0 : 8) * dt;
    segs.forEach(function (s) { s.spikes.forEach(function (k) {
      var ky = k.side === 'bot' ? BOTY - 18 : TOPY + 18, vd = Math.abs(ky - P.y);
      if (Math.abs(k.x - P.x) < 26 && vd < 30) die();
      // 가시 바로 위를 공중에서 스치면 보너스
      if (!k.done && k.x < P.x - 26) { k.done = true; if (vd < 90 && !P.ground && dyingT <= 0) { nearN++; bonus += 15; fx.text(P.x, P.y + (k.side === 'bot' ? -40 : 40), '아슬아슬 +15', '#ff9ecf', 18); A.sfx('tick', 1.3); } }
    }); });
    for (var i = stars.length - 1; i >= 0; i--) if (Math.hypot(stars[i].x - P.x, stars[i].y - P.y) < 42) { var st = stars.splice(i, 1)[0]; starN++; fx.burst(st.x, st.y, '#ffd166', 12, 200, 0.4, 3); A.sfx('coin'); }
    if (P.ground && Math.random() < 0.5) fx.spark(P.x - 16, P.y + 18 * P.g, '#7aa2ff', -speed * 0.3, -P.g * 40, 0.25, 2);
    score = Math.floor(dist / 10) + starN * 20 + bonus; hud();
    if (dist / 10 >= nextMile) { S.banner(nextMile + 'm', '속도 UP'); A.sfx('level'); nextMile += 500; }
  }
  /* 그림: 성운 배경(먼 층), 우주정거장 벽(가까운 층), 금속 판, 가시 결정, 별 동전, 큐브 로봇 */
  var FAR = A.sprite('gvfar', W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04061a'); g.addColorStop(0.5, '#0b1240'); g.addColorStop(1, '#04061a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    [[120, 200, 260, 'rgba(122,90,255,.22)'], [420, 720, 300, 'rgba(60,140,255,.18)'], [300, 480, 200, 'rgba(255,90,200,.10)']].forEach(function (n) {
      for (var dx = -W; dx <= W; dx += W) { var r = x.createRadialGradient(n[0] + dx, n[1], 0, n[0] + dx, n[1], n[2]); r.addColorStop(0, n[3]); r.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = r; x.fillRect(0, 0, W, H); }
    });
    for (var i = 0; i < 220; i++) { x.globalAlpha = 0.2 + Math.random() * 0.8; x.fillStyle = Math.random() < 0.15 ? '#bcd0ff' : '#fff'; x.fillRect(Math.random() * W, Math.random() * H, Math.random() < 0.08 ? 2 : 1, Math.random() < 0.08 ? 2 : 1); }
    x.globalAlpha = 1;
  });
  var MID = A.sprite('gvmid', 540, H, function (x) { // 위·아래 우주정거장 구조물(가운데는 비움)
    function block(y0, h, up) {
      for (var bx = 0; bx < 540; bx += 90) {
        var hh = h - (bx / 90 % 3) * 26, y = up ? y0 + h - hh : y0;
        var g = x.createLinearGradient(bx, 0, bx + 86, 0); g.addColorStop(0, '#131c4a'); g.addColorStop(1, '#0a1030');
        x.fillStyle = g; x.fillRect(bx + 2, y, 86, hh);
        x.fillStyle = 'rgba(157,184,255,.15)'; x.fillRect(bx + 2, up ? y : y + hh - 2, 86, 2);
        for (var wy = y + 14; wy < y + hh - 10; wy += 22) for (var wx = bx + 12; wx < bx + 80; wx += 18) if (Math.random() < 0.45) { x.fillStyle = Math.random() < 0.7 ? 'rgba(122,162,255,.55)' : 'rgba(255,209,102,.6)'; x.fillRect(wx, wy, 8, 4); }
      }
      x.strokeStyle = 'rgba(122,162,255,.25)'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, up ? y0 + h - 40 : y0 + 40); x.lineTo(540, up ? y0 + h - 40 : y0 + 40); x.stroke();
    }
    block(40, TOPY - 40 - T, true);
    block(BOTY + T, H - BOTY - T - 30, false);
  });
  var PANEL = A.sprite('gvpanel', 120, T, function (x) {
    var g = x.createLinearGradient(0, 0, 0, T); g.addColorStop(0, '#3a52b8'); g.addColorStop(0.5, '#1e2d78'); g.addColorStop(1, '#121c50');
    x.fillStyle = g; x.fillRect(0, 0, 120, T);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 0, 2, T); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(2, 0, 1, T);
    x.fillStyle = 'rgba(255,209,102,.18)'; for (var i = 0; i < 6; i++) { x.beginPath(); x.moveTo(30 + i * 12, T - 8); x.lineTo(36 + i * 12, T - 8); x.lineTo(30 + i * 12, T - 2); x.lineTo(24 + i * 12, T - 2); x.fill(); }
    x.fillStyle = '#8fa6e8'; [[8, 8], [112, 8], [8, T - 6], [112, T - 6]].forEach(function (r) { x.beginPath(); x.arc(r[0], r[1], 1.8, 0, 7); x.fill(); });
  });
  var SPIKE = A.sprite('gvspike', 40, 40, function (x) {
    x.translate(20, 40);
    var g = x.createLinearGradient(-18, 0, 18, 0); g.addColorStop(0, '#ff9aae'); g.addColorStop(0.5, '#ff4d6d'); g.addColorStop(1, '#8a0f2a');
    x.fillStyle = g; x.beginPath(); x.moveTo(-18, 0); x.lineTo(0, -38); x.lineTo(18, 0); x.fill();
    x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.moveTo(-10, 0); x.lineTo(0, -34); x.lineTo(-3, 0); x.fill();
  });
  var COIN = A.sprite('gvcoin', 40, 40, function (x) {
    x.translate(20, 20); var g = x.createRadialGradient(-4, -5, 1, 0, 0, 16); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.5, '#ffd166'); g.addColorStop(1, '#c07a10');
    x.fillStyle = g; x.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7 : 15; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.fill();
    x.strokeStyle = 'rgba(120,60,0,.5)'; x.lineWidth = 1; x.stroke();
  });
  var BOT = A.sprite('gvbot', 64, 64, function (x) {
    x.translate(32, 32);
    var aura = x.createRadialGradient(0, 0, 14, 0, 0, 32); aura.addColorStop(0, 'rgba(122,162,255,.5)'); aura.addColorStop(1, 'rgba(122,162,255,0)'); x.fillStyle = aura; x.fillRect(-32, -32, 64, 64);
    var g = x.createLinearGradient(-18, -18, 18, 18); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#a8b8ea');
    x.fillStyle = g; A.rr(x, -18, -18, 36, 36, 8); x.fill();
    x.fillStyle = '#16204e'; A.rr(x, -13, -10, 26, 14, 5); x.fill();
    x.fillStyle = '#7ef0ff'; x.fillRect(-8, -6, 5, 6); x.fillRect(3, -6, 5, 6);
    x.fillStyle = '#3b5bd6'; x.fillRect(-18, 8, 36, 4);
    x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(-14, -15, 10, 2);
  });
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var d = dist || t * 200;
    var fo = -((d * 0.05) % W); c.drawImage(FAR, fo - 10, -10, W + 1, H + 20); c.drawImage(FAR, fo + W - 10, -10, W + 1, H + 20);
    var mo = -((d * 0.35) % 540); c.drawImage(MID, mo, 0, 540, MID.h); c.drawImage(MID, mo + 540, 0, 540, MID.h);
    // 통로 안쪽: 은은한 빛줄기
    c.fillStyle = 'rgba(122,162,255,.05)'; c.fillRect(0, TOPY, W, BOTY - TOPY);
    c.strokeStyle = 'rgba(122,162,255,.10)'; c.lineWidth = 1; for (var x = -((d * 0.6) % 90); x < W; x += 90) { c.beginPath(); c.moveTo(x, TOPY); c.lineTo(x + 40, BOTY); c.stroke(); }
    var ss = segs || [{ x: -50, len: 700, top: true, bot: true, spikes: [] }];
    ss.forEach(function (s) {
      ['top', 'bot'].forEach(function (side) {
        if (!s[side]) return; var y = side === 'top' ? TOPY - T : BOTY;
        c.save(); c.beginPath(); c.rect(s.x, y, s.len + 1, T); c.clip();
        for (var px = s.x; px < s.x + s.len + 1; px += 120) { if (px + 120 < -10 || px > W + 10) continue; if (side === 'top') { c.save(); c.translate(px, y + T); c.scale(1, -1); c.drawImage(PANEL, 0, 0, 120, T); c.restore(); } else c.drawImage(PANEL, px, y, 120, T); }
        c.restore();
        c.fillStyle = '#c4d4ff'; c.fillRect(s.x, side === 'top' ? TOPY - 3 : BOTY, s.len + 1, 3);
        c.fillStyle = 'rgba(122,162,255,.25)'; c.fillRect(s.x, side === 'top' ? TOPY : BOTY - 4, s.len + 1, 4);
      });
      s.spikes.forEach(function (k) {
        if (k.side === 'bot') c.drawImage(SPIKE, k.x - 20, BOTY - 40, 40, 40);
        else { c.save(); c.translate(k.x, TOPY); c.scale(1, -1); c.drawImage(SPIKE, -20, -40, 40, 40); c.restore(); }
      });
    });
    (stars || []).forEach(function (s) {
      c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ffd166', 6), s.x, s.y, 1.2 + Math.sin(t * 6) * 0.1); c.restore();
      c.save(); c.translate(s.x, s.y); c.scale(Math.cos(t * 3 + s.x * 0.01), 1); c.drawImage(COIN, -16, -16, 32, 32); c.restore();
    });
    var px2 = P ? P.x : 130, py = P ? P.y : BOTY - 22 - Math.abs(Math.sin(t * 3)) * 40;
    if (!P || dyingT <= 0) {
      if (P && !P.ground) { c.save(); c.globalCompositeOperation = 'lighter'; for (var k = 1; k <= 4; k++) { c.globalAlpha = 0.25 / k; A.draw(c, BOT, px2 - k * 12, py - P.vy * 0.008 * k, 1, P.rot); } c.restore(); }
      c.save(); c.translate(px2, py); c.rotate(P ? P.rot : 0); if (P && P.g < 0) c.scale(1, -1); c.drawImage(BOT, -32, -32, 64, 64); c.restore();
    }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + starN; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = Math.floor(dist / 10) + 'm'; document.getElementById('hC').textContent = starN; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state === 'playing') { e.preventDefault(); flip(); } });
  var S = new A.Shell({ id: 'gravity', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if ((k === ' ' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'w' || k === 's') && !e.repeat) flip(); } });
})();
