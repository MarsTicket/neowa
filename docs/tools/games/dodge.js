(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOP = 70;
  var fx = new A.FX();
  var P, foes = [], shots = [], lasers = [], orbs = [], time = 0, score = 0, orbN = 0, bombs = 0, dirT = 0, dyingT = 0, keys = {}, drag = null, orbT = 0, grid = [], pend = [], grazeN = 0;

  function reset() {
    P = { x: W / 2, y: H * 0.65, r: 10, inv: 1 };
    foes = []; shots = []; lasers = []; orbs = []; time = 0; score = 0; orbN = 0; bombs = 0; dirT = 1.2; dyingT = 0; orbT = 2; keys = {}; drag = null; pend = []; grazeN = 0; A.music.tempo(1);
    fx.clear(); hud();
  }
  // 공격 패턴 감독: 시간이 갈수록 강하고 자주
  function director() {
    var lv = Math.min(1, time / 90), r = Math.random();
    var opts = ['rain', 'seeker'];
    if (time > 8) opts.push('laser');
    if (time > 15) opts.push('ring');
    if (time > 25) opts.push('cross', 'seeker');
    if (time > 40) opts.push('spiral');
    var k = A.pick(opts);
    if (k === 'rain') { var n = 6 + Math.floor(lv * 8), side = A.irand(0, 3); for (var i = 0; i < n; i++) edgeShot(side, i / n); }
    if (k === 'seeker') { A.sfx('whoosh', 0.8); for (var j = 0; j < 1 + Math.floor(lv * 2); j++) foes.push({ x: A.rand(40, W - 40), y: TOP - 20, vx: 0, vy: 0, life: 6 + lv * 3, sp: 150 + lv * 90 }); }
    if (k === 'laser') { A.sfx('warn'); var cnt = 1 + Math.floor(lv * 2.5); for (var q = 0; q < cnt; q++) { var hor = Math.random() < 0.5; lasers.push({ hor: hor, pos: hor ? A.rand(TOP + 40, H - 40) : A.rand(30, W - 30), warn: 1.1 - lv * 0.35, on: 0.45, w: 26 }); } }
    if (k === 'ring') { A.sfx('charge', 1.2); var cx = A.rand(80, W - 80), cy = A.rand(TOP + 80, H * 0.45), m = 12 + Math.floor(lv * 10); for (var z = 0; z < m; z++) { var a = z / m * Math.PI * 2; shots.push({ x: cx, y: cy, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, r: 8, delay: 0.5 }); } fx.ring(cx, cy, '#ff4d6d', 90, 0.5); }
    if (k === 'cross') { [[0, TOP], [W, TOP], [0, H], [W, H]].forEach(function (c) { var a = Math.atan2(P.y - c[1], P.x - c[0]); for (var s = -1; s <= 1; s++) shots.push({ x: c[0], y: c[1], vx: Math.cos(a + s * 0.15) * 260, vy: Math.sin(a + s * 0.15) * 260, r: 8 }); }); }
    if (k === 'spiral') { var sx = W / 2, sy = TOP + 120; for (var u = 0; u < 36; u++) pend.push({ t: u * 0.07, x: sx, y: sy, a: u * 0.5 }); }
    dirT = Math.max(0.55, 2.0 - lv * 1.4) * A.rand(0.8, 1.2);
  }
  function edgeShot(side, f) {
    var sp = 230 + Math.min(1, time / 90) * 160, x, y, vx = 0, vy = 0;
    if (side === 0) { x = f * W + 20; y = TOP - 10; vy = sp; }
    else if (side === 1) { x = W + 10; y = TOP + f * (H - TOP); vx = -sp; }
    else if (side === 2) { x = f * W + 20; y = H + 10; vy = -sp; }
    else { x = -10; y = TOP + f * (H - TOP); vx = sp; }
    shots.push({ x: x, y: y, vx: vx, vy: vy, r: 9, delay: f * 0.6 });
  }
  function bomb() {
    if (bombs <= 0 || dyingT > 0) return;
    bombs--; pend = []; fx.ring(P.x, P.y, '#ffd166', 700, 0.8); fx.flashIt('#ffd166', 0.5); fx.shake(8, 0.3); A.sfx('bigboom');
    shots.forEach(function (s) { fx.burst(s.x, s.y, '#ff8fb8', 3, 120, 0.3, 2); }); foes.forEach(function (f) { fx.burst(f.x, f.y, '#ff4d6d', 10, 200, 0.4, 3); });
    score += (shots.length + foes.length * 5) * 5; shots = []; foes = []; lasers = []; P.inv = 1; hud();
  }
  function die() {
    if (dyingT > 0 || P.inv > 0) return;
    dyingT = 1.2; fx.burst(P.x, P.y, '#ffffff', 30, 420, 0.9, 4); fx.burst(P.x, P.y, '#ff4d6d', 40, 380, 0.8, 4);
    fx.shake(12, 0.5); fx.flashIt('#ff2244', 0.6); A.sfx('hurt'); A.vibrate(200);
  }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) {
      dyingT -= dt; moveAll(dt);
      if (dyingT <= 0) S.gameOver(Math.floor(score), [['버틴 시간', time.toFixed(1) + '초'], ['스침', String(grazeN)], ['에너지', String(orbN)]]);
      return;
    }
    time += dt; score += dt * 10;
    if (P.inv > 0) P.inv -= dt;
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (kx || ky) { var l = Math.hypot(kx, ky); P.x += kx / l * 420 * dt; P.y += ky / l * 420 * dt; }
    P.x = A.clamp(P.x, 14, W - 14); P.y = A.clamp(P.y, TOP + 14, H - 14);
    dirT -= dt; if (dirT <= 0) director();
    // 예약된 탄(나선 패턴): 게임 시간 기준이라 일시정지·다시 하기와 꼬이지 않음
    for (var pi = pend.length - 1; pi >= 0; pi--) { var pq = pend[pi]; pq.t -= dt; if (pq.t <= 0) { shots.push({ x: pq.x, y: pq.y, vx: Math.cos(pq.a) * 210, vy: Math.sin(pq.a) * 210, r: 8 }); pend.splice(pi, 1); } }
    orbT -= dt; if (orbT <= 0) { orbs.push({ x: A.rand(40, W - 40), y: A.rand(TOP + 60, H - 60), t: 0 }); orbT = A.rand(2.5, 4); }
    moveAll(dt);
    // 충돌
    var i;
    for (i = 0; i < shots.length; i++) {
      var s = shots[i]; if (s.delay > 0) continue;
      var sd = Math.hypot(s.x - P.x, s.y - P.y);
      if (sd < s.r + P.r - 3) die();
      else if (!s.gz && sd < s.r + P.r + 16 && P.inv <= 0) { // 스침(그레이즈) 보너스
        s.gz = true; grazeN++; score += 10; fx.spark(P.x, P.y, '#9ff3ff', (P.x - s.x) * 3, (P.y - s.y) * 3, 0.25, 2.2);
        if (grazeN % 5 === 0) { fx.text(P.x, P.y - 28, '스침 ×' + grazeN, '#9ff3ff', 16); A.sfx('tick', 1.6); }
      }
    }
    for (i = 0; i < foes.length; i++) if (Math.hypot(foes[i].x - P.x, foes[i].y - P.y) < 22) die();
    for (i = 0; i < lasers.length; i++) { var L = lasers[i]; if (L.warn <= 0 && L.on > 0) { if (L.hor ? Math.abs(P.y - L.pos) < L.w / 2 + P.r - 4 : Math.abs(P.x - L.pos) < L.w / 2 + P.r - 4) die(); } }
    for (i = orbs.length - 1; i >= 0; i--) {
      var o = orbs[i]; o.t += dt;
      if (Math.hypot(o.x - P.x, o.y - P.y) < 30) {
        orbs.splice(i, 1); orbN++; score += 100; fx.burst(o.x, o.y, '#ffd166', 14, 220, 0.5, 3); fx.text(o.x, o.y - 20, '+100', '#ffd166', 18); A.sfx('coin', 1 + (orbN % 5) * 0.06, A.clamp(o.x / W * 2 - 1, -1, 1));
        if (orbN % 5 === 0) { bombs++; fx.text(P.x, P.y - 40, '폭탄 +1 (두 번 탭)', '#ffd166', 18); A.sfx('gold'); }
      } else if (o.t > 6) orbs.splice(i, 1);
    }
    if (Math.floor(time) % 30 === 0 && Math.floor(time - dt) % 30 !== 0 && time > 1) { S.banner(Math.floor(time) + '초', '더 거세집니다'); A.sfx('level'); A.music.tempo(Math.min(1.15, 1 + Math.floor(time / 30) * 0.03)); }
    hud();
  }
  var usedBombs = 0;
  function moveAll(dt) {
    var i;
    for (i = shots.length - 1; i >= 0; i--) { var s = shots[i]; if (s.delay > 0) { s.delay -= dt; continue; } s.x += s.vx * dt; s.y += s.vy * dt; if (s.x < -40 || s.x > W + 40 || s.y < TOP - 60 || s.y > H + 40) shots.splice(i, 1); }
    for (i = foes.length - 1; i >= 0; i--) {
      var f = foes[i], a = Math.atan2(P.y - f.y, P.x - f.x);
      f.vx = A.lerp(f.vx, Math.cos(a) * f.sp, dt * 1.6); f.vy = A.lerp(f.vy, Math.sin(a) * f.sp, dt * 1.6);
      f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt;
      if (Math.random() < 0.4) fx.spark(f.x, f.y, '#ff4d6d', -f.vx * 0.2, -f.vy * 0.2, 0.3, 2);
      if (f.life <= 0) { fx.burst(f.x, f.y, '#ff4d6d', 12, 200, 0.4, 3); A.sfx('boom', 1.4, A.clamp(f.x / W * 2 - 1, -1, 1)); foes.splice(i, 1); score += 20; }
    }
    for (i = lasers.length - 1; i >= 0; i--) {
      var L = lasers[i];
      if (L.warn > 0) { L.warn -= dt; if (L.warn <= 0) { A.sfx('laser', 1, L.hor ? 0 : A.clamp(L.pos / W * 2 - 1, -1, 1)); fx.shake(4, 0.15); } }
      else { L.on -= dt; if (L.on <= 0) lasers.splice(i, 1); }
    }
  }
  /* 그림: 붉은 공허 배경 + 육각 격자, 드론, 에너지 결정, 영혼 코어(플레이어) */
  var BG = A.sprite('ddbg', W, H, function (x) {
    var g = x.createRadialGradient(W / 2, H * 0.55, 40, W / 2, H * 0.55, H * 0.75); g.addColorStop(0, '#2a0818'); g.addColorStop(0.6, '#10040c'); g.addColorStop(1, '#040106');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 90; i++) { x.globalAlpha = Math.random() * 0.5; x.fillStyle = '#ffb0c0'; x.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
    x.globalAlpha = 1;
  });
  var HEX = A.sprite('ddhex', W, H, function (x) {
    var r = 26, hw = r * Math.sqrt(3);
    x.strokeStyle = '#ff4d6d'; x.lineWidth = 1.2;
    for (var row = -1; row * r * 1.5 < H + r; row++) for (var col = -1; col * hw < W + hw; col++) {
      var cx = col * hw + (row % 2 ? hw / 2 : 0), cy = row * r * 1.5;
      var dd = Math.hypot(cx - W / 2, cy - H * 0.55) / (H * 0.7); x.globalAlpha = Math.max(0.15, 1 - dd);
      x.beginPath(); for (var k = 0; k < 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3; x.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2)); } x.closePath(); x.stroke();
    }
    x.globalAlpha = 1;
  });
  var DRONE = A.sprite('dddrone', 40, 40, function (x) {
    x.translate(20, 20);
    var g = x.createLinearGradient(-10, -10, 10, 10); g.addColorStop(0, '#ffd0da'); g.addColorStop(1, '#a0102e');
    x.fillStyle = g; x.beginPath(); x.moveTo(14, 0); x.lineTo(-6, -11); x.lineTo(-2, 0); x.lineTo(-6, 11); x.closePath(); x.fill();
    x.fillStyle = '#2a0010'; x.beginPath(); x.ellipse(3, 0, 4, 2.6, 0, 0, 7); x.fill();
    x.fillStyle = '#ff9a3a'; x.beginPath(); x.ellipse(4, -0.6, 1.6, 1, 0, 0, 7); x.fill();
  });
  var CRY = A.sprite('ddcry', 30, 30, function (x) {
    x.translate(15, 15); var g = x.createLinearGradient(-8, -10, 8, 10); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.5, '#ffd166'); g.addColorStop(1, '#b06a00');
    x.fillStyle = g; x.beginPath(); x.moveTo(0, -12); x.lineTo(8, 0); x.lineTo(0, 12); x.lineTo(-8, 0); x.closePath(); x.fill();
    x.fillStyle = 'rgba(255,255,255,.65)'; x.beginPath(); x.moveTo(0, -12); x.lineTo(-4, 0); x.lineTo(0, 1); x.fill();
  });
  var CORE = A.sprite('ddcore', 40, 40, function (x) {
    x.translate(20, 20); var g = x.createRadialGradient(-2, -3, 0, 0, 0, 9); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#c8f6ff'); g.addColorStop(1, '#3ac0e0');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 8, 0, 7); x.fill();
  });
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(BG, -10, -10, W + 20, H + 20);
    // 맥박치는 육각 격자(시간이 갈수록 진하게)
    var pulse = 0.07 + Math.sin(t * 2) * 0.025 + (time > 0 ? Math.min(0.1, time / 900) : 0);
    c.globalAlpha = pulse * 1.6; c.drawImage(HEX, 0, 0, W, H); c.globalAlpha = 1;
    var i;
    // 레이저: 양 끝 발사기 + 경고선
    for (i = 0; i < lasers.length; i++) {
      var L = lasers[i];
      c.fillStyle = '#3a0a18'; c.strokeStyle = '#ff4d6d'; c.lineWidth = 2;
      if (L.hor) { A.rr(c, -4, L.pos - 10, 18, 20, 4); c.fill(); c.stroke(); A.rr(c, W - 14, L.pos - 10, 18, 20, 4); c.fill(); c.stroke(); }
      else { A.rr(c, L.pos - 10, TOP - 4, 20, 18, 4); c.fill(); c.stroke(); A.rr(c, L.pos - 10, H - 14, 20, 18, 4); c.fill(); c.stroke(); }
      if (L.warn > 0) {
        c.globalAlpha = 0.25 + (Math.floor(t * 14) % 2) * 0.35; c.fillStyle = '#ff4d6d';
        c.setLineDash ? c.setLineDash([14, 10]) : 0; c.strokeStyle = '#ff4d6d'; c.lineWidth = 3; c.beginPath();
        if (L.hor) { c.moveTo(0, L.pos); c.lineTo(W, L.pos); } else { c.moveTo(L.pos, 0); c.lineTo(L.pos, H); }
        c.stroke(); if (c.setLineDash) c.setLineDash([]);
        c.globalAlpha = 1;
      } else {
        c.save(); c.globalCompositeOperation = 'lighter';
        var wob = L.w * (1 + Math.sin(t * 40) * 0.12);
        var g = L.hor ? c.createLinearGradient(0, L.pos - wob, 0, L.pos + wob) : c.createLinearGradient(L.pos - wob, 0, L.pos + wob, 0);
        g.addColorStop(0, 'rgba(255,77,109,0)'); g.addColorStop(0.3, 'rgba(255,77,109,.6)'); g.addColorStop(0.5, 'rgba(255,240,245,1)'); g.addColorStop(0.7, 'rgba(255,77,109,.6)'); g.addColorStop(1, 'rgba(255,77,109,0)');
        c.fillStyle = g; if (L.hor) c.fillRect(0, L.pos - wob, W, wob * 2); else c.fillRect(L.pos - wob, 0, wob * 2, H);
        c.restore();
      }
    }
    c.save(); c.globalCompositeOperation = 'lighter';
    for (i = 0; i < orbs.length; i++) { var ob = orbs[i]; c.globalAlpha = ob.t > 5 ? (Math.floor(t * 10) % 2 ? 0.3 : 1) : 1; A.draw(c, A.glowDot('#ffd166', 7), ob.x, ob.y, 1 + Math.sin(t * 6) * 0.1); }
    c.globalAlpha = 1;
    var SH = A.glowDot('#ff4d8b', 5);
    for (i = 0; i < shots.length; i++) { var s = shots[i]; if (s.delay > 0) { c.globalAlpha = 0.3; } A.draw(c, SH, s.x, s.y, s.r / 8); c.globalAlpha = 1; }
    for (i = 0; i < foes.length; i++) { var f = foes[i], sp = Math.hypot(f.vx, f.vy) || 1; for (var k = 1; k <= 3; k++) A.draw(c, A.glowDot('#ff7a45', 3), f.x - f.vx / sp * k * 9, f.y - f.vy / sp * k * 9, 1.1 - k * 0.25); A.draw(c, A.glowDot('#ff4d6d', 8), f.x, f.y, 0.9); }
    c.restore();
    for (i = 0; i < orbs.length; i++) { var ob2 = orbs[i]; if (ob2.t > 5 && Math.floor(t * 10) % 2) continue; c.save(); c.translate(ob2.x, ob2.y + Math.sin(t * 4 + i) * 2); c.scale(Math.cos(t * 3 + i), 1); c.drawImage(CRY, -12, -12, 24, 24); c.restore(); }
    for (i = 0; i < shots.length; i++) { var s2 = shots[i]; if (s2.delay > 0) continue; c.fillStyle = 'rgba(255,240,245,.9)'; c.beginPath(); c.arc(s2.x, s2.y, s2.r * 0.45, 0, 7); c.fill(); }
    for (i = 0; i < foes.length; i++) { var ff = foes[i]; A.draw(c, DRONE, ff.x, ff.y, 1, Math.atan2(ff.vy, ff.vx)); }
    // 플레이어: 영혼 코어 + 도는 고리
    var px = P ? P.x : W / 2, py = P ? P.y : H * 0.65 + Math.sin(t * 2) * 10;
    if (!P || dyingT <= 0) {
      if (!(P && P.inv > 0 && Math.floor(P.inv * 14) % 2)) {
        c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#5ee7ff', 8), px, py, 1.4); c.restore();
        c.strokeStyle = 'rgba(160,240,255,.85)'; c.lineWidth = 1.6;
        c.beginPath(); c.arc(px, py, 14, t * 3, t * 3 + 1.6); c.stroke(); c.beginPath(); c.arc(px, py, 14, t * 3 + Math.PI, t * 3 + Math.PI + 1.6); c.stroke();
        A.draw(c, CORE, px, py, 1);
      }
    }
    fx.draw(c);
    c.restore(); fx.drawFlash(c, W, H);
  }
  var lastHud = '';
  function hud() {
    var k = Math.floor(score) + '|' + Math.floor(time * 10) + '|' + bombs; if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score);
    document.getElementById('hB').textContent = time.toFixed(1);
    document.getElementById('hC').textContent = bombs;
    document.getElementById('hMult').textContent = bombs > 0 ? '두 번 탭 = 폭탄' : '';
  }
  var stage = document.getElementById('stage'), lastTap = 0, lastTapX = 0, lastTapY = 0;
  window.addEventListener('blur', function () { keys = {}; }); // 창을 벗어날 때 눌린 키가 남지 않게
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return;
    var now = performance.now(), p = S.toLocal(e);
    // 두 번 탭: 0.3초 안에, 거의 같은 자리를 다시 눌러야 폭탄 (드래그 중 실수 방지)
    if (now - lastTap < 300 && Math.hypot(p.x - lastTapX, p.y - lastTapY) < 60) { if (bombs > 0) usedBombs++; bomb(); lastTap = 0; } else lastTap = now;
    lastTapX = p.x; lastTapY = p.y; drag = { id: e.pointerId, sx: p.x, sy: p.y, px: P.x, py: P.y };
    try { stage.setPointerCapture(e.pointerId); } catch (er) {}
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag || drag.id !== e.pointerId || S.state !== 'playing' || dyingT > 0) return;
    var p = S.toLocal(e), k = e.pointerType === 'mouse' ? 1 : 1.3;
    P.x = A.clamp(drag.px + (p.x - drag.sx) * k, 14, W - 14); P.y = A.clamp(drag.py + (p.y - drag.sy) * k, TOP + 14, H - 14);
  });
  function end(e) { if (drag && drag.id === e.pointerId) drag = null; }
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  var S = new A.Shell({
    id: 'dodge', W: W, H: H, reset: function () { usedBombs = 0; reset(); }, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys[k] = true;
      if ((k === 'b' || k === 'x' || k === 'Shift') && bombs > 0) { usedBombs++; bomb(); }
    },
    keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; }
  });
})();
