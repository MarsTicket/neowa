(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, G = 900;
  var fx = new A.FX();
  var items, trail, score, miss, combo, bestCombo, sliced, spawnT, dyingT, time, lastPt = null, comboT = 0, keys = {}, kb = null, golds;
  var COLS = ['#ff5ec4', '#5ee7ff', '#7dff9b', '#ffe066', '#b48cff', '#ff7a45'];
  function reset() { items = []; trail = []; score = 0; miss = 0; combo = 0; bestCombo = 0; sliced = 0; spawnT = 0.8; dyingT = 0; time = 0; comboT = 0; golds = 0; kb = null; lastPt = null; fx.clear(); hud(); }
  function spawn() {
    var lv = Math.min(1, time / 90), n = A.irand(1, 2 + Math.floor(lv * 3));
    for (var i = 0; i < n; i++) {
      var bomb = time > 6 && Math.random() < 0.12 + lv * 0.1, x = A.rand(80, W - 80), gold = !bomb && time > 10 && Math.random() < 0.05;
      items.push({ x: x, y: H + 40, vx: (W / 2 - x) * A.rand(0.3, 0.9) + A.rand(-60, 60), vy: -A.rand(900, 1150), r: bomb ? 30 : gold ? 28 : A.rand(30, 40), rot: 0, vr: A.rand(-4, 4), sides: gold ? 5 : A.irand(3, 6), c: gold ? '#ffd166' : A.pick(COLS), bomb: bomb, gold: gold, cut: false });
    }
    A.sfx('whoosh', A.rand(0.8, 1.1), A.clamp(items[items.length - 1].x / W * 2 - 1, -1, 1)); spawnT = Math.max(0.55, 1.4 - lv * 0.8) * A.rand(0.8, 1.2);
  }
  function cut(it, ax, ay, bx, by) {
    it.cut = true;
    if (it.bomb) { dyingT = 1.2; fx.burst(it.x, it.y, '#ff4d6d', 60, 500, 1, 5); fx.flashIt('#ffffff', 1); fx.shake(16, 0.6); A.sfx('bigboom', 1, A.clamp(it.x / W * 2 - 1, -1, 1)); A.vibrate([80, 40, 160]); return; }
    sliced++; combo++; comboT = 0.45;
    // 황금 도형: +50, 놓친 수 1 회복
    if (it.gold) { golds++; score += 50; fx.text(it.x, it.y - 46, miss > 0 ? '황금! +50 · 놓침 -1' : '황금! +50', '#ffd166', 22); fx.ring(it.x, it.y, '#ffd166', 90, 0.4); A.sfx('power'); if (miss > 0) miss--; }
    var ang = Math.atan2(by - ay, bx - ax);
    it.halves = [{ x: it.x, y: it.y, vx: it.vx - Math.sin(ang) * 120, vy: it.vy - 60, a: ang, s: 1 }, { x: it.x, y: it.y, vx: it.vx + Math.sin(ang) * 120, vy: it.vy - 60, a: ang, s: -1 }];
    fx.burst(it.x, it.y, it.c, 18, 280, 0.5, 3); A.sfx(combo >= 3 ? 'combo' : 'pop', 1 + Math.min(combo, 12) * 0.05, A.clamp(it.x / W * 2 - 1, -1, 1)); score += 10 * Math.min(combo, 5);
  }
  function segHit(it, ax, ay, bx, by) { var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, t = A.clamp(((it.x - ax) * dx + (it.y - ay) * dy) / l, 0, 1); return Math.hypot(ax + dx * t - it.x, ay + dy * t - it.y) < it.r; }
  function swipe(x, y) {
    trail.push({ x: x, y: y, t: 0.18 });
    if (lastPt && S.state === 'playing' && dyingT <= 0) {
      var moved = Math.hypot(x - lastPt.x, y - lastPt.y);
      if (moved > 4) items.forEach(function (it) { if (!it.cut && segHit(it, lastPt.x, lastPt.y, x, y)) cut(it, lastPt.x, lastPt.y, x, y); });
    }
    lastPt = { x: x, y: y };
  }
  // 콤보는 마지막으로 벤 뒤 0.45초 안에 이어 벤 것만 (손을 안 떼고 계속 그어서 콤보가 끝없이 쌓이던 문제 방지)
  function endCombo() {
    if (combo >= 3) { var b = combo * 15; score += b; fx.text(lastPt ? lastPt.x : W / 2, lastPt ? lastPt.y - 30 : H / 2, combo + '연속 베기! +' + b, '#ffd166', 24); A.sfx('gold'); }
    bestCombo = Math.max(bestCombo, combo); combo = 0; comboT = 0; hud();
  }
  function endSwipe() {
    endCombo(); lastPt = null;
  }
  function update(dt) {
    fx.update(dt); time += dt;
    if (comboT > 0) { comboT -= dt; if (comboT <= 0 && combo) endCombo(); }
    // 키보드 칼날: 방향키/WASD로 움직이는 동안 지나간 자리를 벰
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (kx || ky) {
      if (!kb) kb = { x: W / 2, y: H * 0.55 };
      if (!kb.on) { kb.on = true; lastPt = null; swipe(kb.x, kb.y); }
      var kl = Math.hypot(kx, ky); kb.x = A.clamp(kb.x + kx / kl * 1300 * dt, 20, W - 20); kb.y = A.clamp(kb.y + ky / kl * 1300 * dt, 90, H - 20); swipe(kb.x, kb.y);
    } else if (kb && kb.on) { kb.on = false; lastPt = null; }
    for (var i = trail.length - 1; i >= 0; i--) { trail[i].t -= dt; if (trail[i].t <= 0) trail.splice(i, 1); }
    items.forEach(function (it) {
      if (it.halves) it.halves.forEach(function (h) { h.vy += G * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.a += h.s * 3 * dt; });
      else { it.vy += G * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt; }
    });
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['벤 도형', String(sliced)], ['최대 콤보', String(Math.max(bestCombo, combo))], ['황금', String(golds)]]); return; }
    for (i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.y > H + 80 && it.vy > 0 && !it.cut) { items.splice(i, 1); if (!it.bomb) { miss++; A.sfx('wrong', 1, A.clamp(it.x / W * 2 - 1, -1, 1)); fx.text(A.clamp(it.x, 40, W - 40), H - 60, '놓침', '#ff4d6d', 20); if (miss >= 3) { dyingT = 1; A.sfx('hurt'); } else if (miss === 2) A.sfx('warn'); } }
      else if (it.cut && it.halves && it.halves[0].y > H + 80) items.splice(i, 1);
    }
    spawnT -= dt; if (spawnT <= 0) spawn();
    hud();
  }
  function shape(c, it, r) { c.beginPath(); for (var k = 0; k < it.sides; k++) { var a = k / it.sides * Math.PI * 2; c[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); }
  /* 그림: 보석 결정(면마다 밝기 다름), 폭탄, 어두운 보랏빛 배경 */
  function gemSpr(sides, col) {
    var R = 40, S2 = R * 2 + 30;
    return A.sprite('slg' + sides + col, S2, S2, function (x) {
      x.translate(S2 / 2, S2 / 2);
      var gl = x.createRadialGradient(0, 0, R * 0.6, 0, 0, R + 15); gl.addColorStop(0, A.hexA(col, 0.35)); gl.addColorStop(1, A.hexA(col, 0)); x.fillStyle = gl; x.fillRect(-S2 / 2, -S2 / 2, S2, S2);
      var pts = []; for (var k = 0; k < sides; k++) { var a = k / sides * Math.PI * 2; pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
      // 면: 가운데 작은 면(테이블) + 바깥 삼각 면
      for (k = 0; k < sides; k++) {
        var p1 = pts[k], p2 = pts[(k + 1) % sides], lit = 0.5 + 0.5 * Math.cos((k + 0.5) / sides * Math.PI * 2 + 2.3);
        x.fillStyle = col; x.beginPath(); x.moveTo(0, 0); x.lineTo(p1[0], p1[1]); x.lineTo(p2[0], p2[1]); x.closePath(); x.fill();
        x.fillStyle = lit > 0.5 ? 'rgba(255,255,255,' + (lit - 0.5) * 0.9 + ')' : 'rgba(0,0,30,' + (0.5 - lit) * 0.9 + ')'; x.fill();
      }
      x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); for (k = 0; k < sides; k++) x.lineTo(pts[k][0] * 0.45, pts[k][1] * 0.45); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 1.2; for (k = 0; k < sides; k++) { x.beginPath(); x.moveTo(pts[k][0] * 0.45, pts[k][1] * 0.45); x.lineTo(pts[k][0], pts[k][1]); x.stroke(); }
      x.strokeStyle = '#ffffff'; x.lineWidth = 2.5; x.beginPath(); for (k = 0; k < sides; k++) x.lineTo(pts[k][0], pts[k][1]); x.closePath(); x.stroke();
      x.fillStyle = '#fff'; x.beginPath(); x.ellipse(-R * 0.25, -R * 0.3, 5, 2.4, -0.6, 0, 7); x.fill();
    });
  }
  var BOMB = A.sprite('slbomb', 90, 100, function (x) {
    x.translate(45, 55); var R = 30;
    var g = x.createRadialGradient(-10, -10, 2, 0, 0, R); g.addColorStop(0, '#5a5a6a'); g.addColorStop(1, '#0a0a10'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, R, 0, 7); x.fill();
    x.strokeStyle = '#ff4d6d'; x.lineWidth = 3; x.stroke();
    x.fillStyle = '#3a3a48'; x.fillRect(-7, -R - 8, 14, 10);
    x.strokeStyle = '#c8a070'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -R - 8); x.quadraticCurveTo(8, -R - 20, 16, -R - 18); x.stroke();
    x.fillStyle = '#ff4d6d'; x.font = '900 26px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('✕', 0, 2);
    x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.ellipse(-11, -12, 8, 4, -0.7, 0, 7); x.fill();
  });
  var BG = A.sprite('slbg', W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a0424'); g.addColorStop(1, '#06020a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    var r = x.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, 420); r.addColorStop(0, 'rgba(180,80,255,.18)'); r.addColorStop(1, 'rgba(180,80,255,0)'); x.fillStyle = r; x.fillRect(0, 0, W, H);
    // 대나무 실루엣
    for (var i = 0; i < 9; i++) { var bx = i < 4 ? i * 34 - 10 : W - (i - 4) * 30 + 10, w = 12 + Math.random() * 8; x.fillStyle = 'rgba(20,6,30,' + (0.6 + Math.random() * 0.4) + ')'; x.fillRect(bx, 0, w, H); for (var yy = Math.random() * 90; yy < H; yy += 90 + Math.random() * 40) { x.fillStyle = 'rgba(60,20,80,.6)'; x.fillRect(bx - 1, yy, w + 2, 4); } }
    for (i = 0; i < 18; i++) { x.fillStyle = 'rgba(30,8,40,.8)'; x.save(); x.translate(Math.random() < 0.5 ? Math.random() * 130 : W - Math.random() * 130, Math.random() * H); x.rotate(Math.random() * 6); x.beginPath(); x.ellipse(0, 0, 26, 5, 0, 0, 7); x.fill(); x.restore(); }
    for (i = 0; i < 50; i++) { x.globalAlpha = Math.random() * 0.6; x.fillStyle = '#ffd0ff'; x.fillRect(Math.random() * W, Math.random() * H, 1.2, 1.2); }
    x.globalAlpha = 1;
  });
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(BG, -10, -10, W + 20, H + 20);
    var list = items || [{ x: 150, y: 600, r: 38, rot: t, sides: 5, c: '#ff5ec4' }, { x: 380, y: 420, r: 34, rot: -t, sides: 3, c: '#5ee7ff' }, { x: 300, y: 760, r: 30, bomb: true }];
    list.forEach(function (it) {
      if (it.bomb && !it.cut) {
        c.drawImage(BOMB, it.x - 45, it.y - 55, 90, 100);
        if (Math.floor(t * 8) % 2) { c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ffd166', 5), it.x + 16, it.y - it.r - 18, 1); c.restore(); } return;
      }
      var spr = gemSpr(it.sides, it.c), sc = it.r / 40;
      if (it.halves) { it.halves.forEach(function (h) { c.save(); c.translate(h.x, h.y); c.rotate(h.a); c.beginPath(); c.rect(-60, h.s > 0 ? -60 : 0, 120, 60); c.clip(); c.rotate(-h.a); c.globalAlpha = 0.9; c.drawImage(spr, -spr.w / 2 * sc, -spr.h / 2 * sc, spr.w * sc, spr.h * sc); c.restore(); }); return; }
      if (it.gold) { c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ffd166', 16), it.x, it.y, 1.6 + Math.sin(t * 10) * 0.2); c.restore(); }
      A.draw(c, spr, it.x, it.y, sc, it.rot || 0.0001);
    });
    if (trail && trail.length > 1) {
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      for (var i = 1; i < trail.length; i++) { c.strokeStyle = 'rgba(200,150,255,' + trail[i].t * 3 + ')'; c.lineWidth = 6 + trail[i].t * 70; c.beginPath(); c.moveTo(trail[i - 1].x, trail[i - 1].y); c.lineTo(trail[i].x, trail[i].y); c.stroke(); c.strokeStyle = 'rgba(255,255,255,' + trail[i].t * 5 + ')'; c.lineWidth = 2 + trail[i].t * 40; c.beginPath(); c.moveTo(trail[i - 1].x, trail[i - 1].y); c.lineTo(trail[i].x, trail[i].y); c.stroke(); }
      c.restore();
    }
    if (kb && S.state === 'playing') { c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ffffff', 8), kb.x, kb.y, kb.on ? 1.3 : 0.9); c.restore(); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + combo + '|' + miss; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = combo; document.getElementById('hC').textContent = miss + '/3'; }
  var stage = document.getElementById('stage'), down = false;
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; down = true; lastPt = null; var p = S.toLocal(e); swipe(p.x, p.y); try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (!down) return; var p = S.toLocal(e); swipe(p.x, p.y); });
  function up() { if (down) { down = false; endSwipe(); } } stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  window.addEventListener('blur', function () { keys = {}; up(); });
  function kn(e) { return e.key.length === 1 ? e.key.toLowerCase() : e.key; }
  var S = new A.Shell({ id: 'slash', W: W, H: H, reset: function () { keys = {}; reset(); }, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { keys[kn(e)] = true; }, keyup: function (e) { keys[kn(e)] = false; } });
})();
