(function () {
  'use strict';
  // 다리 잇기: 누르고 있으면 빛 다리가 자라고, 떼면 앞으로 쓰러져 다음 기둥까지 이어집니다.
  var A = Arcade, W = 540, H = 960, TOP = 640, HX = 130; // 기둥 윗면 y, 서 있는 기둥 오른쪽 끝의 화면 x
  var GROW = 460, WALK = 560, FALL_T = 0.34, PERF = 7, SCROLL_T = 0.38;
  var fx = new A.FX();
  var pillars, bridges, br, hero, camX, phase, pt, score, perfects, chain, maxChain, crossed, wind, windShown, dyingT, lastT, lenTick;

  // ---------- 배경 (한 번만 그려 둠) ----------
  var SKY = A.sprite('br-sky', W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#01040c'); g.addColorStop(0.45, '#061a2c'); g.addColorStop(0.75, '#0b3346'); g.addColorStop(1, '#02060d');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 140; i++) { var r = Math.random(); x.globalAlpha = 0.25 + r * 0.6; x.fillStyle = r > 0.92 ? '#bff3ff' : '#fff'; var s = r > 0.95 ? 2.2 : 1.3; x.fillRect(Math.random() * W, Math.random() * H * 0.62, s, s); }
    x.globalAlpha = 1;
    var m = x.createRadialGradient(410, 190, 4, 410, 190, 70); m.addColorStop(0, 'rgba(230,250,255,1)'); m.addColorStop(0.35, 'rgba(190,240,255,.55)'); m.addColorStop(1, 'rgba(155,231,255,0)');
    x.fillStyle = m; x.fillRect(330, 110, 160, 160);
    x.fillStyle = '#eafcff'; x.beginPath(); x.arc(410, 190, 22, 0, 7); x.fill();
  });
  function ridge(key, h, amp, col, seed) {
    return A.sprite(key, 1080, h, function (x) {
      x.fillStyle = col; x.beginPath(); x.moveTo(0, h);
      for (var px = 0; px <= 1080; px += 12) {
        var a = px / 1080 * Math.PI * 2, y = h * 0.45 + Math.sin(a * 2 + seed) * amp * 0.5 + Math.sin(a * 5 + seed * 2) * amp * 0.28 + Math.sin(a * 11 + seed) * amp * 0.12;
        x.lineTo(px, y);
      }
      x.lineTo(1080, h); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(155,231,255,.22)'; x.lineWidth = 1.5; x.beginPath();
      for (px = 0; px <= 1080; px += 12) { a = px / 1080 * Math.PI * 2; y = h * 0.45 + Math.sin(a * 2 + seed) * amp * 0.5 + Math.sin(a * 5 + seed * 2) * amp * 0.28 + Math.sin(a * 11 + seed) * amp * 0.12; if (px) x.lineTo(px, y); else x.moveTo(px, y); }
      x.stroke();
    });
  }
  var FAR = ridge('br-far', 260, 120, '#08263a', 1.3), NEAR = ridge('br-near', 240, 90, '#04141f', 4.1);
  var HERO = A.sprite('br-hero', 80, 80, function (x) {
    x.shadowColor = '#9be7ff'; x.shadowBlur = 18;
    var g = x.createRadialGradient(34, 32, 3, 40, 40, 20); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#bdefff');
    x.fillStyle = g; x.beginPath(); x.arc(40, 40, 17, 0, 7); x.fill();
    x.shadowBlur = 0; x.fillStyle = '#0b2433'; A.rr(x, 36, 31, 22, 11, 5.5); x.fill();
    x.fillStyle = '#7ff6ff'; x.fillRect(44, 34, 4, 5); x.fillRect(51, 34, 4, 5);
  });
  var DOT = A.glowDot('#ff4d6d', 5), SPARK = A.glowDot('#e6fbff', 5);

  // ---------- 판 만들기 ----------
  function lv() { return Math.min(1, score / 70); }
  function nextPillar() {
    var last = pillars[pillars.length - 1], l = lv();
    var w = Math.round(A.rand(A.lerp(84, 34, l), A.lerp(140, 72, l)));
    var maxGap = (W - 26) - HX - w, minGap = Math.min(maxGap, A.lerp(36, 80, l));
    var gap = Math.round(A.rand(minGap, maxGap));
    pillars.push({ x: last.x + last.w + gap, w: w, born: 0 });
  }
  function world() {
    pillars = [{ x: HX - 120, w: 120, born: 1 }]; bridges = []; nextPillar(); pillars[1].born = 1;
    hero = { x: HX - 16, y: TOP, vy: 0, walk: 0, fall: false }; camX = 0; br = null;
  }
  function reset() {
    score = 0; perfects = 0; chain = 0; maxChain = 0; crossed = 0; dyingT = 0; wind = 0; windShown = false; lastT = null;
    world(); phase = 'idle'; pt = 0; fx.clear(); hud();
  }
  function cur() { return pillars[pillars.length - 2]; }
  function nxt() { return pillars[pillars.length - 1]; }
  function rollWind() {
    wind = 0;
    if (score >= 10 && Math.random() < 0.38) {
      wind = (Math.random() < 0.5 ? -1 : 1) * A.irand(1, score >= 30 ? 3 : 2);
      if (!windShown) { windShown = true; S.banner('바람이 불어요', '화살표 쪽으로 다리가 밀려요'); }
    }
  }

  // ---------- 조작 ----------
  function press() {
    if (S.state !== 'playing' || phase !== 'idle' || dyingT > 0) return;
    var c = cur();
    br = { x: c.x + c.w, len: 0, ang: 0, shift: 0 };
    phase = 'grow'; lastT = null; lenTick = 0;
  }
  function release() {
    if (phase !== 'grow') return;
    phase = 'fall'; pt = 0; A.sfx('turn', 1.4);
  }

  // ---------- 진행 ----------
  function land() {
    var n = nxt(), tip = br.x + br.len + br.shift, ok = tip >= n.x && tip <= n.x + n.w;
    br.tip = tip;
    if (ok) {
      var perfect = Math.abs(tip - (n.x + n.w / 2)) <= PERF;
      br.ok = true; br.perfect = perfect;
      var sx = br.x - camX;
      for (var k = 0; k < 14; k++) fx.spark(sx + br.len * (k / 14), TOP - 2, A.pick(['#9be7ff', '#ffffff']), A.rand(-40, 40), A.rand(-120, -30), 0.5, 2.4);
      A.sfx('brick', 1.1);
      hero.target = n.x + n.w - 16;
    } else {
      br.ok = false; hero.target = Math.max(br.x + 6, tip); A.sfx('wall');
    }
    phase = 'walk';
  }
  function arrive() {
    var n = nxt();
    if (!br.ok) { hero.fall = true; phase = 'drop'; pt = 0; A.sfx('hurt'); fx.shake(8, 0.35); fx.flashIt('#ff2244', 0.35); A.vibrate(150); dyingT = 1.15; return; }
    crossed++; var gain = 1;
    if (br.perfect) {
      chain = Math.min(chain + 1, 5); perfects++; maxChain = Math.max(maxChain, chain); gain += chain;
      var px = n.x + n.w / 2 - camX;
      fx.ring(px, TOP, '#ff4d6d', 46, 0.45); fx.burst(px, TOP - 6, '#ffd166', 18, 260, 0.55, 3);
      fx.text(px, TOP - 70, chain > 1 ? 'PERFECT ×' + chain : 'PERFECT', '#ffd166', 24);
      A.sfx('gold', 1 + chain * 0.05); A.vibrate([12, 30, 12]);
    } else { chain = 0; A.sfx('coin'); }
    score += gain;
    fx.text(hero.x - camX, TOP - 46, '+' + gain, '#e6fbff', 20);
    if (score > 0 && Math.floor(score / 25) > Math.floor((score - gain) / 25)) { S.banner(Math.floor(score / 25) * 25 + '점 돌파!', '기둥이 점점 좁아져요'); A.sfx('level'); }
    bridges.push(br); if (bridges.length > 6) bridges.shift();
    br = null; nextPillar(); if (pillars.length > 8) pillars.shift();
    pt = 0; phase = 'scroll'; hero.camFrom = camX; hero.camTo = n.x + n.w - HX; rollWind(); hud();
  }
  function update(dt) {
    fx.update(dt);
    for (var i = 0; i < pillars.length; i++) if (pillars[i].born < 1) pillars[i].born = Math.min(1, pillars[i].born + dt * 3);
    if (phase === 'grow') {
      // 누른 "실제 시간"에 비례해 자람 (프레임이 느려도 같은 길이). 일시정지하면 lastT 가 비워져 시간이 튀지 않음
      var now = performance.now(), d = lastT == null ? dt : Math.min(0.1, (now - lastT) / 1000); lastT = now;
      br.len = Math.min(900, br.len + GROW * d);
      if (br.len - lenTick > 34) { lenTick = br.len; A.sfx('tick', 0.7 + br.len / 500); }
      if (Math.random() < 0.6) fx.spark(br.x - camX + A.rand(-3, 3), TOP - br.len, A.pick(['#9be7ff', '#ffffff']), A.rand(-30, 30), A.rand(-60, 10), 0.35, 2);
    } else if (phase === 'fall') {
      pt += dt; var k = Math.min(1, pt / FALL_T); br.ang = Math.PI / 2 * k * k;
      if (k >= 1) {
        br.ang = Math.PI / 2; fx.shake(3, 0.1);
        if (wind) { phase = 'wind'; pt = 0; A.sfx('turn', 0.7); } else land();
      }
    } else if (phase === 'wind') {
      pt += dt; var target = wind * 9; br.shift = A.lerp(0, target, Math.min(1, pt / 0.3));
      if (Math.random() < 0.7) fx.spark(br.x + br.len + br.shift - camX, TOP - 3, '#bff3ff', wind * 120, A.rand(-30, 30), 0.3, 2);
      if (pt >= 0.38) { br.shift = target; land(); }
    } else if (phase === 'walk') {
      hero.walk += dt;
      hero.x = Math.min(hero.target, hero.x + WALK * dt);
      if (hero.x >= hero.target) arrive();
    } else if (phase === 'scroll') {
      pt += dt; var e = Math.min(1, pt / SCROLL_T), ee = 1 - Math.pow(1 - e, 3);
      camX = A.lerp(hero.camFrom, hero.camTo, ee);
      if (e >= 1) { camX = hero.camTo; phase = 'idle'; }
    } else if (phase === 'drop') {
      pt += dt;
      if (br) br.ang = Math.min(Math.PI, br.ang + dt * (2 + pt * 10));
      hero.vy += 2600 * dt; hero.y += hero.vy * dt;
    }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['건넌 기둥', String(crossed)], ['정중앙', String(perfects)], ['최대 연속', '×' + maxChain]]); }
  }

  // ---------- 그리기 ----------
  function drawPillar(c, p, x) {
    var w = p.w, rise = (1 - p.born) * 260, top = TOP + rise;
    var g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#0e2a3b'); g.addColorStop(0.5, '#123a50'); g.addColorStop(1, '#0a1f2c');
    c.fillStyle = g; c.fillRect(x, top, w, H - top + 20);
    c.fillStyle = 'rgba(155,231,255,.07)'; for (var k = 10; k < w - 4; k += 14) c.fillRect(x + k, top + 14, 2, H - top);
    c.fillStyle = '#9be7ff'; c.fillRect(x, top - 4, w, 5);
    c.fillStyle = 'rgba(255,255,255,.75)'; c.fillRect(x, top - 4, w, 1.5);
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(155,231,255,.18)'; c.fillRect(x - 3, top - 9, w + 6, 12); c.restore();
    // 정중앙 표시
    c.fillStyle = '#ff4d6d'; c.fillRect(x + w / 2 - PERF, top - 4, PERF * 2, 5);
    c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, DOT, x + w / 2, top - 2, 1.6); c.restore();
  }
  function drawBridge(c, b, alpha) {
    var x = b.x - camX, len = b.len + (b.shift || 0), dx = Math.sin(b.ang), dy = -Math.cos(b.ang);
    var ex = x + dx * len, ey = TOP + dy * len;
    c.save(); c.globalAlpha = alpha; c.lineCap = 'round'; c.globalCompositeOperation = 'lighter';
    c.strokeStyle = 'rgba(155,231,255,.22)'; c.lineWidth = 16; c.beginPath(); c.moveTo(x, TOP - 2); c.lineTo(ex, ey - 2); c.stroke();
    c.strokeStyle = 'rgba(155,231,255,.6)'; c.lineWidth = 7; c.beginPath(); c.moveTo(x, TOP - 2); c.lineTo(ex, ey - 2); c.stroke();
    c.strokeStyle = '#f2fdff'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(x, TOP - 2); c.lineTo(ex, ey - 2); c.stroke();
    // 빛 마디
    var t = S.time;
    for (var s = 18; s < len; s += 22) { var q = (s / 22 + t * 6) % 6 < 1 ? 1.4 : 0.8; A.draw(c, SPARK, x + dx * s, TOP + dy * s - 2, 0.32 * q); }
    A.draw(c, SPARK, ex, ey - 2, 0.9 + Math.sin(t * 20) * 0.15);
    c.restore();
  }
  function drawHero(c, x, y, walking) {
    var t = S.time, bob = walking ? Math.abs(Math.sin(t * 18)) * 4 : Math.sin(t * 3) * 1.5, by = y - 22 - bob;
    // 다리
    c.strokeStyle = '#bdefff'; c.lineWidth = 4; c.lineCap = 'round';
    var sw = walking ? Math.sin(t * 18) * 6 : 0;
    c.beginPath(); c.moveTo(x - 5, by + 12); c.lineTo(x - 5 + sw, y - 3); c.moveTo(x + 5, by + 12); c.lineTo(x + 5 - sw, y - 3); c.stroke();
    // 목도리
    c.strokeStyle = '#ff7aa8'; c.lineWidth = 4; c.beginPath(); c.moveTo(x - 6, by + 8);
    c.quadraticCurveTo(x - 20, by + 6 + Math.sin(t * 9) * 4, x - 28, by + 10 + Math.sin(t * 9 + 1) * 6); c.stroke();
    A.draw(c, HERO, x, by, 1);
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    if (!pillars) world();
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(SKY, -10, -10, W + 20, H + 20);
    // 오로라
    c.save(); c.globalCompositeOperation = 'lighter';
    for (var a = 0; a < 3; a++) {
      c.fillStyle = a === 1 ? 'rgba(125,255,200,.045)' : 'rgba(155,231,255,.05)'; c.beginPath(); c.moveTo(-20, 0);
      for (var px = -20; px <= W + 20; px += 30) c.lineTo(px, 150 + a * 70 + Math.sin(px / 120 + t * 0.4 + a * 2) * 40 + Math.sin(px / 47 + t * 0.7) * 10);
      c.lineTo(W + 20, 0); c.closePath(); c.fill();
    }
    c.restore();
    var fo = ((camX * 0.12) % 1080 + 1080) % 1080, no = ((camX * 0.3) % 1080 + 1080) % 1080;
    c.drawImage(FAR, -fo, 360, 1080, 260); c.drawImage(FAR, 1080 - fo, 360, 1080, 260);
    c.drawImage(NEAR, -no, 470, 1080, 240); c.drawImage(NEAR, 1080 - no, 470, 1080, 240);
    // 낭떠러지 안개
    var fg = c.createLinearGradient(0, TOP - 40, 0, H); fg.addColorStop(0, 'rgba(2,8,16,0)'); fg.addColorStop(0.35, 'rgba(2,8,16,.85)'); fg.addColorStop(1, '#01040a');
    c.fillStyle = fg; c.fillRect(-10, TOP - 40, W + 20, H - TOP + 60);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (var m = 0; m < 5; m++) { c.fillStyle = 'rgba(155,231,255,.035)'; c.beginPath(); c.ellipse(((m * 170 - camX * 0.5 + t * 14) % (W + 300) + W + 300) % (W + 300) - 150, TOP + 120 + m * 34, 180, 22, 0, 0, 7); c.fill(); }
    c.restore();
    for (var i = 0; i < pillars.length; i++) { var p = pillars[i], x = p.x - camX; if (x > W + 20 || x + p.w < -20) continue; drawPillar(c, p, x); }
    for (i = 0; i < bridges.length; i++) drawBridge(c, bridges[i], 0.55);
    if (br) drawBridge(c, br, 1);
    // 바람 표시
    if (wind && S.state === 'playing' && (phase === 'idle' || phase === 'grow' || phase === 'fall' || phase === 'wind')) {
      var dir = wind > 0 ? 1 : -1, str = Math.abs(wind);
      c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(5,16,26,.7)'; A.rr(c, W / 2 - 110, 112, 220, 50, 25); c.fill(); c.strokeStyle = 'rgba(155,231,255,.5)'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#bff3ff'; c.font = '700 18px "Pretendard Variable", system-ui';
      var arrows = ''; for (var s = 0; s < str; s++) arrows += dir > 0 ? '›' : '‹';
      c.fillText((dir > 0 ? '바람 ' : '') + (dir > 0 ? arrows : '') + (dir < 0 ? arrows + ' 바람' : ''), W / 2, 137);
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(191,243,255,.18)'; c.lineWidth = 2;
      for (var wl = 0; wl < 6 + str * 3; wl++) { var wy = 220 + (wl * 67) % 380, wx = ((wl * 131 + dir * t * (240 + str * 90)) % (W + 200) + W + 200) % (W + 200) - 100; c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx + dir * (40 + str * 14), wy); c.stroke(); }
      c.restore();
    }
    if (!(phase === 'drop' && hero.y > H + 60)) drawHero(c, hero.x - camX, hero.y, phase === 'walk');
    // 처음 안내
    if (S.state === 'playing' && phase === 'idle' && crossed === 0) {
      c.save(); c.textAlign = 'center'; c.fillStyle = 'rgba(230,251,255,' + (0.6 + Math.sin(t * 4) * 0.3) + ')'; c.font = '700 20px "Pretendard Variable", system-ui';
      c.fillText('꾹 누르고 있다가 손을 떼세요', W / 2, 300); c.restore();
    }
    fx.draw(c);
    c.restore(); fx.drawFlash(c, W, H);
  }
  var lastHud = '';
  function hud() {
    var k = score + '|' + perfects + '|' + chain; if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score);
    document.getElementById('hB').textContent = perfects;
    document.getElementById('hC').textContent = A.fmt(Math.max(S ? S.best : 0, score));
    document.getElementById('hMult').textContent = chain >= 2 ? 'PERFECT ×' + chain : '';
  }

  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state === 'playing') { e.preventDefault(); press(); } });
  window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
  function isKey(k) { return k === ' ' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'Enter' || k === 'w' || k === 's'; }
  var S = new A.Shell({
    id: 'bridge', W: W, H: H, reset: reset, update: update, render: render,
    idle: function (dt) { fx.update(dt); lastT = null; },
    keydown: function (e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (isKey(k) && !e.repeat) press(); },
    keyup: function (e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (isKey(k)) release(); }
  });
  score = 0; perfects = 0; chain = 0; hud();
})();
