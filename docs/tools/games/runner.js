(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, G = 720;           // G = 바닥 높이
  var fx = new A.FX();
  // 3D 그래픽(assets/arcade/3d/runner.js). 못 쓰는 기기에서는 아래 2D 그림 그대로
  var G3 = { draw: function () { return false; } };
  A.load3D = A.load3D || function (id, get, done) { var s = document.createElement('script'); s.src = '../assets/arcade/g3d.js?v=1'; s.onload = function () { done(A.G3D.boot(id, get)); }; document.head.appendChild(s); };
  A.load3D('runner', function () { return { P: P, obs: obs, coins: coins, dist: dist, dying: dyingT }; }, function (h) { G3 = h; });
  var P, obs, coins, speed, dist, coinN, score, nextX, holding, dyingT, groundOff, runT;
  var coyote = 0, buffer = 0, coinPts = 0, chainN = 0, chainT = 0, nearN = 0, nearPts = 0, nextMile = 500;

  var BG = A.sprite('rbg', W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d0620'); g.addColorStop(0.7, '#24103f'); g.addColorStop(1, '#090410');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    var s = x.createRadialGradient(W * 0.7, 300, 0, W * 0.7, 300, 240); s.addColorStop(0, 'rgba(255,122,168,.55)'); s.addColorStop(0.3, 'rgba(180,140,255,.25)'); s.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = s; x.fillRect(0, 0, W, H);
    x.fillStyle = '#ff9ecf'; x.beginPath(); x.arc(W * 0.7, 330, 90, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#24103f'; for (var i = 0; i < 7; i++) x.fillRect(W * 0.7 - 100, 330 + i * 14, 200, 4 + i);
    for (i = 0; i < 70; i++) { x.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.6 + ')'; x.fillRect(Math.random() * W, Math.random() * 420, 1.5, 1.5); }
  });
  function skyline(seed, col, minH, maxH, wmin, wmax) {
    return A.sprite('sky' + seed, W * 2, 400, function (x) {
      var px = 0, r = seed;
      function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
      while (px < W * 2) {
        var w = wmin + rnd() * (wmax - wmin), h = minH + rnd() * (maxH - minH);
        x.fillStyle = col; x.fillRect(px, 400 - h, w - 4, h);
        x.fillStyle = 'rgba(255,220,255,.18)';
        for (var yy = 400 - h + 10; yy < 390; yy += 16) for (var xx = px + 6; xx < px + w - 10; xx += 12) if (rnd() < 0.35) x.fillRect(xx, yy, 5, 7);
        px += w;
      }
    });
  }
  var SKY1 = skyline(7, '#1c0d33', 120, 300, 50, 110), SKY2 = skyline(3, '#120822', 60, 200, 40, 90);
  var COIN = A.glowDot('#ffd166', 6);
  // 플레이어 큐브: 빛 번짐은 미리 한 번만 그림 (매 프레임 shadowBlur 금지)
  var CUBE = A.sprite('rcube', 72, 72, function (x) {
    x.translate(36, 36); x.shadowColor = '#b48cff'; x.shadowBlur = 18; x.fillStyle = '#e9dcff'; A.rr(x, -18, -18, 36, 36, 7); x.fill();
    x.shadowBlur = 0; x.fillStyle = '#7d4fd6'; A.rr(x, -11, -11, 22, 22, 4); x.fill();
    x.fillStyle = '#fff'; x.fillRect(2, -6, 5, 6);
  });

  function reset() {
    P = { x: 140, y: G, vy: 0, ground: true, jumps: 0, rot: 0, squash: 0 };
    obs = []; coins = []; speed = 330; dist = 0; coinN = 0; score = 0; nextX = W + 200; holding = false; dyingT = 0; groundOff = 0; runT = 0;
    coyote = 0; buffer = 0; coinPts = 0; chainN = 0; chainT = 0; nearN = 0; nearPts = 0; nextMile = 500;
    fx.clear(); hud();
  }
  function jump() {
    if (S.state !== 'playing' || dyingT > 0) return;
    holding = true;
    if (!tryJump()) buffer = 0.13; // 착지 직전에 누른 점프는 잠깐 기억했다가 착지하면 바로 뜀
  }
  function tryJump() {
    if (P.ground || coyote > 0) { P.vy = -980; P.ground = false; coyote = 0; P.jumps = 1; A.sfx('jump'); fx.burst(P.x, P.y, '#b48cff', 8, 160, 0.3, 2.5); return true; }
    if (P.jumps < 2) { P.vy = -860; P.jumps = 2; A.sfx('jump', 1.5); fx.ring(P.x, P.y - 20, '#b48cff', 50, 0.3); return true; }
    return false;
  }
  function release() { holding = false; if (P && P.vy < -380) P.vy = -380; }

  // 지형 생성: 속도가 빠를수록 간격을 넓혀 공정하게
  function gen() {
    var gap = speed * A.rand(0.7, 1.15) + 120;
    var lv = Math.min(1, dist / 4000), r = Math.random(), x = nextX;
    if (r < 0.3) { var n = Math.random() < 0.3 + lv * 0.4 ? 2 : 1; for (var i = 0; i < n; i++) obs.push({ t: 'spike', x: x + i * 38, w: 38, h: 40 }); arcCoins(x - 30, n * 38 + 60); nextX = x + n * 38 + gap; }
    else if (r < 0.52) { var bh = A.pick([60, 90, 120]), bw = A.rand(90, 180); obs.push({ t: 'block', x: x, w: bw, h: bh }); lineCoins(x + 10, G - bh - 40, bw - 20); if (Math.random() < lv) obs.push({ t: 'spike', x: x + bw + 40, w: 38, h: 40 }); nextX = x + bw + gap; }
    else if (r < 0.72) { var pw = A.rand(90, 120 + lv * 70); obs.push({ t: 'pit', x: x, w: pw }); arcCoins(x - 20, pw + 40); nextX = x + pw + gap; }
    else if (r < 0.86 && dist > 600) { obs.push({ t: 'saw', x: x + 40, y: G - A.pick([40, 150]), r: 26 }); nextX = x + 80 + gap; }
    else { var sx = x; for (var k = 0; k < 3; k++) { var h2 = 50 + k * 45; obs.push({ t: 'block', x: sx, w: 90, h: h2 }); sx += 90; } lineCoins(x, G - 230, 270); nextX = sx + gap; }
  }
  function arcCoins(x, w) { for (var i = 0; i < 5; i++) { var t = i / 4; coins.push({ x: x + w * t, y: G - 70 - Math.sin(t * Math.PI) * 150 }); } }
  function lineCoins(x, y, w) { for (var i = 0; i < Math.floor(w / 40); i++) coins.push({ x: x + i * 40 + 20, y: y }); }

  function groundAt(x) {
    for (var i = 0; i < obs.length; i++) { var o = obs[i]; if (o.t === 'pit' && x > o.x + 10 && x < o.x + o.w - 10) return false; }
    return true;
  }
  function die() {
    if (dyingT > 0) return;
    dyingT = 1.1; fx.burst(P.x, P.y - 20, '#b48cff', 40, 420, 0.8, 4); fx.burst(P.x, P.y - 20, '#fff', 12, 300, 0.4, 2.5);
    fx.shake(12, 0.4); fx.flashIt('#ff2244', 0.5); A.sfx('hurt'); A.vibrate(160);
  }

  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['거리', Math.floor(dist / 10) + 'm'], ['코인', String(coinN)], ['아슬아슬', String(nearN)]]); return; }
    runT += dt;
    speed = Math.min(820, 330 + runT * 7);
    var dx = speed * dt; dist += dx; groundOff = (groundOff + dx) % 60;
    for (var i = obs.length - 1; i >= 0; i--) { obs[i].x -= dx; if (obs[i].x + (obs[i].w || 60) < -80) obs.splice(i, 1); }
    for (i = coins.length - 1; i >= 0; i--) { coins[i].x -= dx; if (coins[i].x < -30) coins.splice(i, 1); }
    nextX -= dx; while (nextX < W + 300) gen();

    // 물리
    var g = holding && P.vy < 0 ? 2300 : 3400;
    var wasGround = P.ground;
    P.vy += g * dt; var py = P.y; P.y += P.vy * dt;
    P.ground = false;
    // 이미 구덩이 아래로 빠졌으면(바닥선보다 아래) 다시 땅 위로 튀어 오르지 않음
    var floor = groundAt(P.x) && py <= G + 2 ? G : 99999;
    for (i = 0; i < obs.length; i++) {
      var o = obs[i];
      if (o.t === 'block' && P.x + 18 > o.x && P.x - 18 < o.x + o.w) {
        var top = G - o.h;
        if (py <= top + 2 && P.y >= top) floor = Math.min(floor, top);
        else if (P.y > top + 6) die(); // 옆면 충돌
      }
    }
    if (P.y >= floor) { if (!P.ground && P.vy > 400) { P.squash = 0.12; A.sfx('land'); fx.burst(P.x, floor, '#b48cff', 6, 120, 0.25, 2); } P.y = floor; P.vy = 0; P.ground = true; P.jumps = 0; }
    // 발판 끝에서 살짝 늦게 눌러도 점프되게(코요테 타임), 착지 직전 입력은 기억(점프 버퍼)
    if (P.ground) coyote = 0.09; else if (wasGround && P.vy >= 0) coyote = Math.max(coyote, 0.09); else coyote -= dt;
    if (buffer > 0) { buffer -= dt; if (P.ground && tryJump()) buffer = 0; }
    if (P.y > G + 6 && P.vy > 0 && floor > G) { if (P.y > G + 200) die(); } // 구덩이: 빨리 끝내기
    if (P.y > H + 60) die();
    P.rot = P.ground ? 0 : P.rot + dt * 9;
    if (P.squash > 0) P.squash -= dt;
    // 위험물
    for (i = 0; i < obs.length; i++) {
      o = obs[i];
      if (o.t === 'spike' && P.x + 14 > o.x + 6 && P.x - 14 < o.x + o.w - 6 && P.y > G - o.h + 12) die();
      if (o.t === 'saw' && Math.hypot(P.x - o.x, P.y - 22 - o.y) < o.r + 16) die();
      // 아슬아슬 보너스: 가시·톱날 바로 위(또는 옆)를 스치듯 넘으면 추가 점수
      if ((o.t === 'spike' || o.t === 'saw') && !o.near) {
        var gapY = o.t === 'spike' ? (G - o.h) - P.y : Math.hypot(P.x - o.x, P.y - 22 - o.y) - (o.r + 16);
        if (Math.abs(P.x - (o.t === 'spike' ? o.x + o.w / 2 : o.x)) < 30) o.minGap = Math.min(o.minGap == null ? 999 : o.minGap, gapY);
        if ((o.t === 'spike' ? o.x + o.w : o.x + o.r) < P.x - 20) {
          o.near = true;
          if (o.minGap != null && o.minGap < 24 && dyingT <= 0) { nearN++; nearPts += 20; fx.text(P.x, P.y - 70, '아슬아슬! +20', '#7dffd0', 18); A.sfx('tick', 1.5); }
        }
      }
    }
    // 코인
    for (i = coins.length - 1; i >= 0; i--) {
      var c = coins[i];
      if (Math.abs(c.x - P.x) < 30 && Math.abs(c.y - (P.y - 22)) < 34) {
        coins.splice(i, 1); coinN++;
        // 코인 연속 줍기: 0.7초 안에 계속 주우면 배율 (최대 ×5)
        chainN = chainT > 0 ? chainN + 1 : 1; chainT = 0.7;
        var cm = Math.min(5, 1 + Math.floor(chainN / 4)); coinPts += 10 * cm;
        if (cm > 1 && chainN % 4 === 0) fx.text(c.x, c.y - 24, 'COIN ×' + cm, '#ffd166', 18);
        fx.burst(c.x, c.y, '#ffd166', 8, 160, 0.35, 2.4); A.sfx('coin', 1 + Math.min(chainN, 12) * 0.03);
      }
    }
    if (chainT > 0) { chainT -= dt; if (chainT <= 0) chainN = 0; }
    if (P.ground && Math.random() < 0.5) fx.spark(P.x - 16, P.y - 4, '#b48cff', -speed * 0.3, A.rand(-60, -10), 0.25, 2);
    score = Math.floor(dist / 10) + coinPts + nearPts;
    if (dist / 10 >= nextMile) { S.banner(nextMile + 'm', nextMile >= 1500 ? '최고 속도에 가까워져요' : '속도가 올라갑니다'); A.sfx('level'); nextMile += 500; }
    hud();
  }

  function render(c) {
    if (G3.draw(c, fx)) return;
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(BG, -10, -10, W + 20, H + 20);
    var d = dist || t * 120;
    c.drawImage(SKY2, -((d * 0.12) % W), G - 380, W * 2, 400);
    c.drawImage(SKY1, -((d * 0.3) % W), G - 330, W * 2, 400);
    // 바닥
    var g = c.createLinearGradient(0, G, 0, H); g.addColorStop(0, '#2a1450'); g.addColorStop(1, '#07030d');
    c.fillStyle = g; c.fillRect(0, G, W, H - G);
    c.strokeStyle = 'rgba(180,140,255,.25)'; c.lineWidth = 1;
    var off = (dist ? groundOff : (t * 120) % 60);
    for (var x = -off; x < W; x += 60) { c.beginPath(); c.moveTo(x, G); c.lineTo(W / 2 + (x - W / 2) * 3, H); c.stroke(); }
    for (var k = 1; k < 6; k++) { var yy = G + Math.pow(k / 6, 2) * (H - G); c.beginPath(); c.moveTo(0, yy); c.lineTo(W, yy); c.stroke(); }
    c.fillStyle = '#d6bfff'; c.fillRect(0, G - 2, W, 3);
    if (obs) {
      for (var i = 0; i < obs.length; i++) {
        var b = obs[i];
        if (b.t === 'pit') { c.fillStyle = '#05020a'; c.fillRect(b.x, G - 2, b.w, H - G + 2); c.fillStyle = 'rgba(255,77,109,.5)'; c.fillRect(b.x, G - 2, 3, 30); c.fillRect(b.x + b.w - 3, G - 2, 3, 30); }
        else if (b.t === 'block') {
          var bg = c.createLinearGradient(0, G - b.h, 0, G); bg.addColorStop(0, '#5b3a9a'); bg.addColorStop(1, '#2a1650');
          c.fillStyle = bg; c.fillRect(b.x, G - b.h, b.w, b.h); c.fillStyle = '#d6bfff'; c.fillRect(b.x, G - b.h, b.w, 3);
          c.strokeStyle = 'rgba(214,191,255,.35)'; c.strokeRect(b.x + 0.5, G - b.h + 0.5, b.w - 1, b.h - 1);
        } else if (b.t === 'spike') {
          c.fillStyle = '#ff4d6d'; c.beginPath(); c.moveTo(b.x + 2, G); c.lineTo(b.x + b.w / 2, G - b.h); c.lineTo(b.x + b.w - 2, G); c.fill();
          c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ff4d6d', 6), b.x + b.w / 2, G - b.h / 2, 0.8); c.restore();
        } else if (b.t === 'saw') {
          c.save(); c.translate(b.x, b.y); c.rotate(t * 10); c.fillStyle = '#ff7a45';
          c.beginPath(); for (var s = 0; s < 16; s++) { var a = s / 16 * Math.PI * 2, rr = s % 2 ? b.r * 0.7 : b.r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.fill();
          c.fillStyle = '#2a0d05'; c.beginPath(); c.arc(0, 0, 6, 0, 7); c.fill(); c.restore();
        }
      }
      c.save(); c.globalCompositeOperation = 'lighter';
      for (i = 0; i < coins.length; i++) A.draw(c, COIN, coins[i].x, coins[i].y + Math.sin(t * 6 + i) * 3, 0.9);
      c.restore();
    }
    // 플레이어 (빛나는 큐브)
    var px = P ? P.x : 140, py = P ? P.y : G, rot = P ? P.rot : 0, sq = P && P.squash > 0 ? P.squash / 0.12 : 0;
    if (!P || dyingT <= 0) {
      c.save(); c.translate(px, py - 22); c.rotate(rot); c.scale(1 + sq * 0.25, 1 - sq * 0.25);
      c.drawImage(CUBE, -36, -36, 72, 72); c.restore();
    }
    fx.draw(c);
    c.restore(); fx.drawFlash(c, W, H);
  }
  var lastHud = '';
  function hud() {
    var cm = chainN >= 4 ? Math.min(5, 1 + Math.floor(chainN / 4)) : 1;
    var k = score + '|' + coinN + '|' + cm; if (k === lastHud) return; lastHud = k;
    document.getElementById('hMult').textContent = cm > 1 ? 'COIN ×' + cm : '';
    document.getElementById('hA').textContent = A.fmt(score);
    document.getElementById('hB').textContent = Math.floor(dist / 10) + 'm';
    document.getElementById('hC').textContent = coinN;
  }

  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state === 'playing') { e.preventDefault(); jump(); } });
  window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);

  var S = new A.Shell({
    id: 'runner', W: W, H: H,
    reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && !e.repeat) jump(); },
    keyup: function (e) { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') release(); }
  });
})();
