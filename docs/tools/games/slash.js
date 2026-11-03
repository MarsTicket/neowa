(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, G = 900;
  var fx = new A.FX();
  var items, trail, score, miss, combo, bestCombo, sliced, spawnT, dyingT, time, lastPt = null;
  var COLS = ['#ff5ec4', '#5ee7ff', '#7dff9b', '#ffe066', '#b48cff', '#ff7a45'];
  function reset() { items = []; trail = []; score = 0; miss = 0; combo = 0; bestCombo = 0; sliced = 0; spawnT = 0.8; dyingT = 0; time = 0; fx.clear(); hud(); }
  function spawn() {
    var lv = Math.min(1, time / 90), n = A.irand(1, 2 + Math.floor(lv * 3));
    for (var i = 0; i < n; i++) {
      var bomb = time > 6 && Math.random() < 0.12 + lv * 0.1, x = A.rand(80, W - 80);
      items.push({ x: x, y: H + 40, vx: (W / 2 - x) * A.rand(0.3, 0.9) + A.rand(-60, 60), vy: -A.rand(900, 1150), r: bomb ? 30 : A.rand(30, 40), rot: 0, vr: A.rand(-4, 4), sides: A.irand(3, 6), c: A.pick(COLS), bomb: bomb, cut: false });
    }
    A.sfx('bounce', 0.6); spawnT = Math.max(0.55, 1.4 - lv * 0.8) * A.rand(0.8, 1.2);
  }
  function cut(it, ax, ay, bx, by) {
    it.cut = true;
    if (it.bomb) { dyingT = 1.2; fx.burst(it.x, it.y, '#ff4d6d', 60, 500, 1, 5); fx.flashIt('#ffffff', 1); fx.shake(16, 0.6); A.sfx('bigboom'); A.vibrate([80, 40, 160]); return; }
    sliced++; combo++;
    var ang = Math.atan2(by - ay, bx - ax);
    it.halves = [{ x: it.x, y: it.y, vx: it.vx - Math.sin(ang) * 120, vy: it.vy - 60, a: ang, s: 1 }, { x: it.x, y: it.y, vx: it.vx + Math.sin(ang) * 120, vy: it.vy - 60, a: ang, s: -1 }];
    fx.burst(it.x, it.y, it.c, 18, 280, 0.5, 3); A.sfx('brick', 1 + combo * 0.08); score += 10 * Math.min(combo, 5);
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
  function endSwipe() {
    if (combo >= 3) { var b = combo * 15; score += b; fx.text(lastPt ? lastPt.x : W / 2, lastPt ? lastPt.y - 30 : H / 2, combo + '연속 베기! +' + b, '#ffd166', 24); A.sfx('gold'); }
    bestCombo = Math.max(bestCombo, combo); combo = 0; lastPt = null; hud();
  }
  function update(dt) {
    fx.update(dt); time += dt;
    for (var i = trail.length - 1; i >= 0; i--) { trail[i].t -= dt; if (trail[i].t <= 0) trail.splice(i, 1); }
    items.forEach(function (it) {
      if (it.halves) it.halves.forEach(function (h) { h.vy += G * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.a += h.s * 3 * dt; });
      else { it.vy += G * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt; }
    });
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['벤 도형', String(sliced)], ['최대 콤보', String(bestCombo)]]); return; }
    for (i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      if (it.y > H + 80 && it.vy > 0 && !it.cut) { items.splice(i, 1); if (!it.bomb) { miss++; A.sfx('wall'); fx.text(A.clamp(it.x, 40, W - 40), H - 60, '놓침', '#ff4d6d', 20); if (miss >= 3) { dyingT = 1; A.sfx('hurt'); } } }
      else if (it.cut && it.halves && it.halves[0].y > H + 80) items.splice(i, 1);
    }
    spawnT -= dt; if (spawnT <= 0) spawn();
    hud();
  }
  function shape(c, it, r) { c.beginPath(); for (var k = 0; k < it.sides; k++) { var a = k / it.sides * Math.PI * 2; c[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a0420'); g.addColorStop(1, '#07020a'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    var list = items || [{ x: 150, y: 600, r: 38, rot: t, sides: 5, c: '#ff5ec4' }, { x: 380, y: 420, r: 34, rot: -t, sides: 3, c: '#5ee7ff' }, { x: 300, y: 760, r: 30, bomb: true }];
    list.forEach(function (it) {
      if (it.bomb && !it.cut) {
        c.save(); c.translate(it.x, it.y); c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(0, 0, it.r, 0, 7); c.fill(); c.strokeStyle = '#ff4d6d'; c.lineWidth = 4; c.stroke();
        c.fillStyle = '#ff4d6d'; c.font = '700 26px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✕', 0, 1);
        if (Math.floor(t * 8) % 2) { c.fillStyle = '#ffd166'; c.beginPath(); c.arc(0, -it.r - 6, 5, 0, 7); c.fill(); } c.restore(); return;
      }
      if (it.halves) { it.halves.forEach(function (h) { c.save(); c.translate(h.x, h.y); c.rotate(h.a); c.beginPath(); c.rect(-60, h.s > 0 ? -60 : 0, 120, 60); c.clip(); c.rotate(-h.a); shape(c, it, it.r); c.fillStyle = it.c; c.globalAlpha = 0.85; c.fill(); c.restore(); }); return; }
      c.save(); c.translate(it.x, it.y); c.rotate(it.rot); shape(c, it, it.r); c.shadowColor = it.c; c.shadowBlur = 18; c.fillStyle = A.hexA(it.c, 0.35); c.fill(); c.strokeStyle = it.c; c.lineWidth = 4; c.stroke(); c.restore();
    });
    if (trail && trail.length > 1) {
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      for (var i = 1; i < trail.length; i++) { c.strokeStyle = 'rgba(255,255,255,' + trail[i].t * 5 + ')'; c.lineWidth = 2 + trail[i].t * 50; c.beginPath(); c.moveTo(trail[i - 1].x, trail[i - 1].y); c.lineTo(trail[i].x, trail[i].y); c.stroke(); }
      c.restore();
    }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + combo + '|' + miss; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = combo; document.getElementById('hC').textContent = miss + '/3'; }
  var stage = document.getElementById('stage'), down = false;
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; down = true; lastPt = null; var p = S.toLocal(e); swipe(p.x, p.y); try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (!down) return; var p = S.toLocal(e); swipe(p.x, p.y); });
  function up() { if (down) { down = false; endSwipe(); } } stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  var S = new A.Shell({ id: 'slash', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render });
})();
