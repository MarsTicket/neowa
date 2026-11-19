(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, BH = 44, DEPTH = 22;   // 블록 높이, 윗면 깊이(입체감)
  var fx = new A.FX();
  // 3D 그래픽(assets/arcade/3d/tower.js). 못 쓰는 기기에서는 아래 2D 그림 그대로
  var G3 = { draw: function () { return false; } };
  A.load3D = A.load3D || function (id, get, done) { var s = document.createElement('script'); s.src = '../assets/arcade/g3d.js?v=1'; s.onload = function () { done(A.G3D.boot(id, get)); }; document.head.appendChild(s); };
  A.load3D('tower', function () { return { stack: stack, cur: cur, cam: cam, chips: chips }; }, function (h) { G3 = h; });
  var stack, cur, cam = 0, camT = 0, chips = [], perfects = 0, combo = 0, floors = 0, dyingT = 0, dir = 1, spd = 0, score = 0;

  var BG = A.sprite('tbg', W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a0f2c'); g.addColorStop(0.55, '#3b2a6b'); g.addColorStop(1, '#ff9e6b');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 90; i++) { x.globalAlpha = Math.random() * 0.7; x.fillStyle = '#fff'; x.fillRect(Math.random() * W, Math.random() * H * 0.5, 1.6, 1.6); }
  });
  // 첫 판 안내 (neowa_tower_tut = 1 이면 안 보임)
  var tut = A.get('neowa_tower_tut', '') !== '1', windT = 0;
  function tutDone() { if (tut) { tut = false; A.set('neowa_tower_tut', '1'); } }
  function drawTut(c, x, y, msg) {
    c.save(); c.font = '700 19px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    var w = c.measureText(msg).width + 40, a = 0.6 + Math.sin(S.time * 5) * 0.4;
    c.fillStyle = 'rgba(14,10,30,.88)'; A.rr(c, x - w / 2, y - 23, w, 46, 23); c.fill();
    c.strokeStyle = '#ffe066'; c.lineWidth = 2; c.globalAlpha = 0.5 + a * 0.5; c.stroke(); c.globalAlpha = 1;
    c.fillStyle = '#fff'; c.fillText(msg, x, y + 1);
    var by = y + 38 + Math.sin(S.time * 6) * 6; c.fillStyle = '#ffe066'; c.beginPath(); c.moveTo(x - 11, by); c.lineTo(x + 11, by); c.lineTo(x, by + 13); c.closePath(); c.fill();
    c.restore();
  }
  // 바람: 20층부터 블록 속도가 출렁임(빨라졌다 느려졌다). 층이 높을수록 세짐
  function windAmp() { return floors < 20 ? 0 : Math.min(0.55, 0.25 + (floors - 20) * 0.012); }
  function hueFor(n) { return (n * 9 + 40) % 360; }
  function col(n, l) { return 'hsl(' + hueFor(n) + ',85%,' + l + '%)'; }

  function reset() {
    stack = [{ x: W / 2 - 110, w: 220, n: 0 }]; // 맨 아래 받침
    chips = []; perfects = 0; combo = 0; floors = 0; dyingT = 0; cam = 0; camT = 0; score = 0; windT = 0;
    spawn(); fx.clear(); hud();
  }
  function topY(i) { return 760 - i * BH; } // i층 블록의 윗면 y (월드 좌표)
  function spawn() {
    var last = stack[stack.length - 1];
    spd = Math.min(560, 230 + floors * 9);
    dir = floors % 2 ? -1 : 1;
    cur = { x: dir > 0 ? -last.w : W, w: last.w, n: stack.length };
  }
  function drop() {
    if (S.state !== 'playing' || dyingT > 0 || !cur) return;
    tutDone();
    var last = stack[stack.length - 1], off = cur.x - last.x;
    // 완벽 판정 폭: 빨라질수록 조금 넓게 (한 프레임에 움직이는 거리가 커지므로)
    var tol = 7 + spd / 140;
    if (Math.abs(off) < tol) { // 완벽
      cur.x = last.x; combo++; perfects++;
      var pb = 5 * Math.min(combo, 10); score += pb;
      var grow = combo >= 3 ? Math.min(14, 260 - cur.w) : 0;
      if (grow > 0) { cur.x -= grow / 2; cur.w += grow; fx.text(W / 2, sy(topY(cur.n)) - 50, '넓어짐!', '#ffe066', 20); }
      fx.ring(cur.x + cur.w / 2, sy(topY(cur.n)) + BH / 2, '#ffe066', cur.w * 0.7, 0.45);
      A.sfx('combo', 1 + Math.min(combo, 12) * 0.05, A.clamp((cur.x + cur.w / 2) / W * 2 - 1, -1, 1)); if (grow > 0) A.sfx('power'); A.vibrate(15);
      fx.text(cur.x + cur.w / 2, sy(topY(cur.n)) - 20, (combo > 1 ? 'PERFECT ×' + combo : 'PERFECT') + ' +' + (10 + pb), '#fff', 20);
    } else {
      combo = 0;
      var nx = Math.max(cur.x, last.x), nr = Math.min(cur.x + cur.w, last.x + last.w), nw = nr - nx;
      if (nw <= 0) { // 완전히 빗나감
        chips.push({ x: cur.x, w: cur.w, y: topY(cur.n), vy: 0, vx: dir * 60, n: cur.n, rot: 0 });
        cur = null; dyingT = 1.2; A.sfx('drop'); A.sfx('hurt'); fx.shake(8, 0.4); A.vibrate(150); return;
      }
      var cx = off > 0 ? nr : cur.x, cw = cur.w - nw; // 잘려 나가는 조각
      chips.push({ x: cx, w: cw, y: topY(cur.n), vy: 0, vx: off > 0 ? 80 : -80, n: cur.n, rot: 0 });
      cur.x = nx; cur.w = nw; A.sfx('place', 0.8, A.clamp((nx + nw / 2) / W * 2 - 1, -1, 1)); A.sfx('whoosh', 1.4);
      if (Math.abs(off) < tol * 2.2) { score += 3; fx.text(cur.x + cur.w / 2, sy(topY(cur.n)) - 20, 'GOOD +13', '#9fe8ff', 17); }
      if (cur.w < 40) fx.text(W / 2, sy(topY(cur.n)) - 56, '조심! 블록이 좁아요', '#ff9e6b', 16);
      fx.burst(off > 0 ? nr : nx, sy(topY(cur.n)) + BH / 2, col(cur.n, 70), 10, 200, 0.4, 2.5);
    }
    stack.push({ x: cur.x, w: cur.w, n: cur.n }); floors++; score += 10;
    fx.shake(2, 0.08);
    if (floors === 20) { S.banner('20층 · 바람 구간', '블록 속도가 출렁여요'); A.sfx('level'); }
    else if (floors % 10 === 0) { S.banner(floors + '층', floors > 20 ? '바람이 더 세져요' : '계속 올라가요'); A.sfx('level'); }
    spawn(); hud();
  }
  function sy(wy) { return wy + cam; } // 월드 → 화면

  function update(dt) {
    fx.update(dt);
    // 카메라: 탑 꼭대기가 화면 40% 지점에 오도록
    camT = Math.max(0, (stack.length - 8) * BH);
    cam = A.lerp(cam, camT, Math.min(1, dt * 5));
    for (var i = chips.length - 1; i >= 0; i--) { var c = chips[i]; c.vy += 1800 * dt; c.y += c.vy * dt; c.x += c.vx * dt; c.rot += c.vx * 0.002 * dt * 10; if (sy(c.y) > H + 200) chips.splice(i, 1); }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['층수', String(floors)], ['완벽', String(perfects)], ['최대 콤보', String(maxCombo)]]); return; }
    if (cur) {
      windT += dt;
      cur.x += dir * spd * (1 + Math.sin(windT * 2.3) * windAmp()) * dt;
      var last = stack[stack.length - 1];
      if (dir > 0 && cur.x > W - cur.w * 0.15) dir = -1;
      if (dir < 0 && cur.x < -cur.w * 0.85) dir = 1;
      void last;
    }
    maxCombo = Math.max(maxCombo, combo);
  }
  var maxCombo = 0;

  function block(c, x, y, w, n, alpha) {
    c.globalAlpha = alpha == null ? 1 : alpha;
    // 윗면
    c.fillStyle = col(n, 72); c.beginPath(); c.moveTo(x, y); c.lineTo(x + DEPTH, y - DEPTH); c.lineTo(x + w + DEPTH, y - DEPTH); c.lineTo(x + w, y); c.closePath(); c.fill();
    // 앞면
    var g = c.createLinearGradient(0, y, 0, y + BH); g.addColorStop(0, col(n, 58)); g.addColorStop(1, col(n, 40));
    c.fillStyle = g; c.fillRect(x, y, w, BH);
    // 옆면
    c.fillStyle = col(n, 30); c.beginPath(); c.moveTo(x + w, y); c.lineTo(x + w + DEPTH, y - DEPTH); c.lineTo(x + w + DEPTH, y + BH - DEPTH); c.lineTo(x + w, y + BH); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x, y, w, 2);
    c.globalAlpha = 1;
  }
  function render(c) {
    if (G3.draw(c, fx)) return;
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    // 배경은 높이에 따라 천천히 올라감(하늘 → 우주)
    var par = Math.min(H, (cam || 0) * 0.25);
    c.drawImage(BG, -10, -10 - (H * 0.4) + par * 0.4, W + 20, H * 1.4);
    // 구름
    c.fillStyle = 'rgba(255,255,255,.08)';
    for (var k = 0; k < 6; k++) { var cy = ((k * 230 + (cam || 0) * 0.6) % (H + 200)) - 100, cx = ((k * 157 + t * 12) % (W + 200)) - 100; c.beginPath(); c.ellipse(cx, cy, 120, 26, 0, 0, Math.PI * 2); c.fill(); }
    var st = stack || [{ x: W / 2 - 110, w: 220, n: 0 }];
    // 땅
    c.fillStyle = '#1a1030'; c.fillRect(0, sy(topY(0)) + BH, W, H);
    for (var i = 0; i < st.length; i++) { var b = st[i], y = sy(topY(b.n)); if (y > H + 50 || y < -80) continue; block(c, b.x, y, b.w, b.n); }
    if (cur && windAmp() > 0) { // 바람 줄기
      c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 2;
      for (var wi = 0; wi < 7; wi++) { var wy = (wi * 137) % H, wx = ((wi * 211 + t * 420) % (W + 300)) - 150; c.beginPath(); c.moveTo(wx, wy); c.lineTo(wx + 60 + windAmp() * 120, wy); c.stroke(); }
    }
    if (cur) {
      var yy = sy(topY(cur.n));
      // 그림자 가이드
      var last = st[st.length - 1];
      c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(last.x, yy, last.w, BH);
      block(c, cur.x, yy, cur.w, cur.n);
    }
    for (i = 0; i < chips.length; i++) { var ch = chips[i]; c.save(); c.translate(ch.x + ch.w / 2, sy(ch.y) + BH / 2); c.rotate(ch.rot); block(c, -ch.w / 2, -BH / 2, ch.w, ch.n, 0.9); c.restore(); }
    if (!stack) { for (var d = 1; d < 9; d++) block(c, W / 2 - 110 + Math.sin(d * 1.3) * 8, topY(d), 220 - d * 6, d); }
    if (tut && cur && S.state === 'playing') { var ly = sy(topY(stack.length - 1)); drawTut(c, W / 2, ly - 150, document.body.classList.contains('touch') ? '아래층과 딱 겹칠 때 탭!' : '아래층과 딱 겹칠 때 Space!'); }
    fx.draw(c);
    c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() {
    document.getElementById('hA').textContent = A.fmt(score);
    document.getElementById('hB').textContent = floors;
    document.getElementById('hC').textContent = combo;
    document.getElementById('hMult').textContent = combo >= 2 ? 'PERFECT ×' + combo : '';
  }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state === 'playing') { e.preventDefault(); drop(); } });
  var S = new A.Shell({
    id: 'tower', W: W, H: H,
    reset: function () { maxCombo = 0; reset(); }, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if ((e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') && !e.repeat) drop(); }
  });
})();
