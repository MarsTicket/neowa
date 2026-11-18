(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var P, plats, coins, cam, maxH, score, coinN, dyingT, keys = {}, drag = null, topY, mileM, bonus = 0;
  function addPlat(y) {
    var lv = Math.min(1, maxH / 30000), r = Math.random(), t = 'n';
    var rm = 0.075 + 0.15 + lv * 0.15; /* 예전 순서로는 높이 올라가면 스프링·로켓이 아예 안 나왔음 */
    if (r < 0.06) t = 's'; else if (r < 0.075) t = 'r'; else if (r < rm) t = 'm'; else if (r < rm + 0.1 + lv * 0.08) t = 'b';
    var p = { x: A.rand(50, W - 50), y: y, w: Math.round(92 - lv * 20), t: t, vx: t === 'm' ? A.rand(60, 140) * A.pick([-1, 1]) : 0, broken: false };
    plats.push(p);
    // 부서지는 발판은 '덤'으로만 놓음: 밟을 수 있는 발판 사이 간격(최대 180)은 그대로 유지 → 못 올라가는 구간이 생기지 않음
    if (t === 'b') { p.x = A.rand(50, W - 50); p.y = y + A.rand(20, 50); addPlat(y); return; }
    if (Math.random() < 0.18) coins.push({ x: A.clamp(p.x + A.rand(-60, 60), 30, W - 30), y: y - A.rand(60, 140) });
    topY = y;
  }
  function reset() { P = { x: W / 2, y: 800, vx: 0, vy: -900, face: 1 }; plats = []; coins = []; cam = 0; maxH = 0; score = 0; coinN = 0; dyingT = 0; keys = {}; drag = null; topY = 880; mileM = 1; bonus = 0; plats.push({ x: W / 2, y: 880, w: 140, t: 'n', vx: 0 }); while (topY > -200) addPlat(topY - A.rand(70, 120)); fx.clear(); hud(); }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; P.vy += 1800 * dt; P.y += P.vy * dt; if (dyingT <= 0) S.gameOver(score, [['높이', Math.floor(maxH / 10) + 'm'], ['코인', String(coinN)]]); return; }
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), target = kx * 420;
    if (drag) target = A.clamp((drag.x - drag.sx) * 4, -460, 460);
    P.vx = A.lerp(P.vx, target, Math.min(1, dt * 10)); if (Math.abs(P.vx) > 20) P.face = P.vx > 0 ? 1 : -1;
    P.x += P.vx * dt; if (P.x < -20) P.x += W + 40; if (P.x > W + 20) P.x -= W + 40;
    var py = P.y; P.vy += 1800 * dt; P.y += P.vy * dt;
    if (P.vy > 0) plats.forEach(function (p) {
      if (p.broken) return;
      if (py + 22 <= p.y && P.y + 22 >= p.y && Math.abs(P.x - p.x) < p.w / 2 + 12) {
        if (p.t === 'b') { p.broken = true; A.sfx('brick', 0.7); fx.burst(p.x, p.y, '#ff4d6d', 12, 200, 0.4, 3); return; }
        P.y = p.y - 22; P.vy = p.t === 's' ? -1600 : p.t === 'r' ? -2600 : -960;
        A.sfx(p.t === 's' || p.t === 'r' ? 'power' : 'bounce', p.t === 'n' ? 1.2 : 1); fx.burst(P.x, p.y, '#9be7ff', 6, 140, 0.3, 2.2);
        if (p.t === 'r') { fx.ring(P.x, P.y, '#ffd166', 120, 0.5); p.t = 'n'; }
      }
    });
    plats.forEach(function (p) { if (p.vx) { p.x += p.vx * dt; if (p.x < 50 || p.x > W - 50) p.vx *= -1; } });
    // 카메라: 캐릭터가 화면 40% 위로 가면 따라 올라감
    var line = cam + H * 0.4; if (P.y < line) cam = P.y - H * 0.4;
    maxH = Math.max(maxH, 800 - P.y);
    while (topY > cam - 200) addPlat(topY - A.rand(70, 110 + Math.min(70, maxH / 400)));
    plats = plats.filter(function (p) { return p.y < cam + H + 60; }); coins = coins.filter(function (c) { return c.y < cam + H + 60; });
    for (var i = coins.length - 1; i >= 0; i--) if (Math.hypot(coins[i].x - P.x, coins[i].y - P.y) < 34) { var cn = coins.splice(i, 1)[0]; coinN++; fx.burst(cn.x, cn.y, '#ffd166', 10, 180, 0.35, 2.5); A.sfx('coin'); }
    if (P.y > cam + H + 40) { dyingT = 1; A.sfx('over'); }
    if (maxH / 10 >= mileM * 250) { S.banner(mileM * 250 + 'm', '보너스 +' + mileM * 50); bonus += mileM * 50; A.sfx('level'); mileM++; }
    score = Math.floor(maxH / 10) + coinN * 20 + bonus; hud();
  }
  /* 그림: 높이에 따라 낮→노을→우주로 바뀌는 하늘, 구름, 떠 있는 섬 발판 5종, 동그란 점프 친구 */
  function skySpr(key, a, b, stars) {
    return A.sprite(key, W, H, function (x) {
      var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, W, H);
      for (var i = 0; i < stars; i++) { x.globalAlpha = Math.random(); x.fillStyle = '#fff'; x.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4); }
      x.globalAlpha = 1;
    });
  }
  var SKY = [skySpr('jsky0', '#3a8ae0', '#bfefff', 0), skySpr('jsky1', '#2a2a7a', '#ff9a7a', 30), skySpr('jsky2', '#02030f', '#1a1a5a', 200)];
  var CLOUD = A.sprite('jcloud', 200, 80, function (x) {
    [[60, 50, 30], [100, 38, 38], [145, 50, 28], [100, 56, 34]].forEach(function (p) { var g = x.createRadialGradient(p[0], p[1] - 10, 2, p[0], p[1], p[2] * 1.3); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(230,240,255,.0)'); x.fillStyle = g; x.beginPath(); x.ellipse(p[0], p[1], p[2] * 1.4, p[2], 0, 0, 7); x.fill(); });
  });
  var PLAN = A.sprite('jplanet', 140, 140, function (x) {
    x.translate(70, 70); var g = x.createRadialGradient(-20, -20, 4, 0, 0, 50); g.addColorStop(0, '#ffd0f0'); g.addColorStop(1, '#6a2a9a'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 46, 0, 7); x.fill();
    x.strokeStyle = 'rgba(255,220,255,.6)'; x.lineWidth = 4; x.beginPath(); x.ellipse(0, 0, 68, 14, -0.3, 0, 7); x.stroke();
  });
  function platSpr(tp) {
    return A.sprite('jplat' + tp, 100, 50, function (x) {
      x.translate(50, 14);
      var top = { n: '#7ee05a', m: '#5ee7c8', b: '#c88a5a', s: '#ffd166', r: '#ff9ecf' }[tp], rock = tp === 'b' ? ['#8a5a3a', '#4a2a1a'] : ['#a07a5a', '#4a3020'];
      var g = x.createLinearGradient(0, 0, 0, 34); g.addColorStop(0, rock[0]); g.addColorStop(1, rock[1]);
      x.fillStyle = g; x.beginPath(); x.moveTo(-46, 0); x.lineTo(46, 0); x.lineTo(30, 14); x.lineTo(14, 18); x.lineTo(4, 32); x.lineTo(-8, 20); x.lineTo(-26, 16); x.closePath(); x.fill();
      x.fillStyle = top; A.rr(x, -48, -8, 96, 14, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,.45)'; A.rr(x, -42, -6, 60, 4, 2); x.fill();
      if (tp === 'n' || tp === 'm') { x.fillStyle = top; for (var k = 0; k < 8; k++) { x.beginPath(); x.arc(-40 + k * 11.5, 6, 4, 0, Math.PI); x.fill(); } }
      if (tp === 'b') { x.strokeStyle = 'rgba(40,10,0,.7)'; x.lineWidth = 2; x.beginPath(); x.moveTo(-6, -8); x.lineTo(2, 2); x.lineTo(-4, 10); x.lineTo(4, 22); x.stroke(); }
      if (tp === 'm') { x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.moveTo(-30, 1); x.lineTo(-36, -1); x.lineTo(-30, -3); x.moveTo(30, 1); x.lineTo(36, -1); x.lineTo(30, -3); x.fill(); }
    });
  }
  var SPRING = A.sprite('jspring', 30, 26, function (x) {
    x.strokeStyle = '#c0c8d8'; x.lineWidth = 2.5; x.beginPath(); for (var i = 0; i <= 6; i++) x.lineTo(i % 2 ? 22 : 8, 24 - i * 3.2); x.stroke();
    x.fillStyle = '#ff4d6d'; A.rr(x, 3, 0, 24, 6, 3); x.fill();
  });
  var ROCKET = A.sprite('jrocket', 30, 44, function (x) {
    x.translate(15, 22); x.fillStyle = '#ff4d6d'; x.beginPath(); x.moveTo(-10, 14); x.lineTo(-6, 4); x.lineTo(6, 4); x.lineTo(10, 14); x.fill();
    var g = x.createLinearGradient(-7, 0, 7, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c0c8e0'); x.fillStyle = g; x.beginPath(); x.moveTo(0, -20); x.quadraticCurveTo(9, -8, 7, 12); x.lineTo(-7, 12); x.quadraticCurveTo(-9, -8, 0, -20); x.fill();
    x.fillStyle = '#5ec8ff'; x.beginPath(); x.arc(0, -4, 3.5, 0, 7); x.fill();
  });
  var HERO = A.sprite('jhero', 50, 54, function (x) {
    x.translate(25, 28);
    var g = x.createRadialGradient(-6, -10, 2, 0, 0, 22); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#a8e0ff');
    x.fillStyle = '#3a6ad0'; A.rr(x, -12, 10, 9, 12, 4); x.fill(); A.rr(x, 3, 10, 9, 12, 4); x.fill();
    x.fillStyle = g; A.rr(x, -18, -22, 36, 36, 16); x.fill();
    x.fillStyle = '#ff9ecf'; x.globalAlpha = 0.6; x.beginPath(); x.arc(-8, 2, 3.5, 0, 7); x.arc(14, 2, 3.5, 0, 7); x.fill(); x.globalAlpha = 1;
    x.fillStyle = '#03141c'; x.beginPath(); x.ellipse(1, -6, 3, 4, 0, 0, 7); x.ellipse(10, -6, 3, 4, 0, 0, 7); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(2, -8, 1.2, 0, 7); x.arc(11, -8, 1.2, 0, 7); x.fill();
    x.strokeStyle = '#03141c'; x.lineWidth = 1.6; x.beginPath(); x.arc(6, 2, 3, 0.2, Math.PI - 0.2); x.stroke();
    x.fillStyle = '#ff4d6d'; x.beginPath(); x.moveTo(-14, -18); x.quadraticCurveTo(0, -30, 14, -20); x.lineTo(16, -14); x.quadraticCurveTo(0, -22, -16, -12); x.fill();
  });
  function render(c) {
    var o = fx.offset(), t = S.time, cm = cam || 0;
    c.save(); c.translate(o[0], o[1]);
    // 하늘: 높이 비율 k(0~1)에 따라 세 장을 섞음
    var k = Math.min(1, (maxH || 0) / 40000) * 2;
    c.drawImage(SKY[Math.min(1, Math.floor(k))], -10, -10, W + 20, H + 20);
    var f = k - Math.floor(k); if (k < 2 && f > 0) { c.globalAlpha = f; c.drawImage(SKY[Math.min(2, Math.floor(k) + 1)], -10, -10, W + 20, H + 20); c.globalAlpha = 1; }
    if (k > 1.2) { c.globalAlpha = Math.min(1, k - 1.2); A.draw(c, PLAN, 420, ((180 - cm * 0.02) % (H + 300) + H + 300) % (H + 300) - 150, 1); c.globalAlpha = 1; }
    c.globalAlpha = Math.max(0, 1 - k * 0.5);
    for (var i = 0; i < 7; i++) { var cy = ((i * 170 - cm * 0.3) % (H + 200) + H + 200) % (H + 200) - 100; c.drawImage(CLOUD, (i * 131) % (W - 60) - 60, cy - 40, 200 + (i % 3) * 30, 80); }
    c.globalAlpha = 1;
    c.save(); c.translate(0, -cm);
    (plats || [{ x: 270, y: 880, w: 140, t: 'n' }, { x: 150, y: 760, w: 92, t: 'n' }, { x: 390, y: 640, w: 92, t: 's' }]).forEach(function (p) {
      if (p.broken) return;
      c.drawImage(platSpr(p.t), p.x - p.w / 2 - 4, p.y - 14, p.w + 8, 50 * (p.w + 8) / 100 * (p.w > 100 ? 0.75 : 1));
      if (p.t === 's') c.drawImage(SPRING, p.x - 15, p.y - 32, 30, 26);
      if (p.t === 'r') c.drawImage(ROCKET, p.x - 15, p.y - 50 + Math.sin(t * 6) * 3, 30, 44);
    });
    (coins || []).forEach(function (cn) { c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ffd166', 6), cn.x, cn.y, 0.9); c.restore(); c.fillStyle = '#ffd166'; c.save(); c.translate(cn.x, cn.y); c.scale(Math.cos(t * 4 + cn.x), 1); c.beginPath(); c.arc(0, 0, 8, 0, 7); c.fill(); c.fillStyle = '#fff6c0'; c.fillRect(-1.5, -5, 3, 10); c.restore(); });
    var px = P ? P.x : 270, py = P ? P.y : 860 - Math.abs(Math.sin(t * 3)) * 200, vy = P ? P.vy : 0;
    var st = A.clamp(1 + vy / 4000, 0.85, 1.2);
    c.save(); c.translate(px, py); c.scale((P ? P.face : 1) / Math.sqrt(st), st); c.drawImage(HERO, -25, -28, 50, 54); c.restore();
    c.restore();
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + coinN; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = Math.floor(maxH / 10) + 'm'; document.getElementById('hC').textContent = coinN; }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e); drag = { id: e.pointerId, sx: p.x, x: p.x }; try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (drag && drag.id === e.pointerId) { var p = S.toLocal(e); drag.x = p.x; if (Math.abs(drag.x - drag.sx) > 115) drag.sx = drag.x - Math.sign(drag.x - drag.sx) * 115; } });
  stage.addEventListener('pointerup', function () { drag = null; });
  var S = new A.Shell({ id: 'jumper', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; }, keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; } });
})();
