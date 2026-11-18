(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, G = 900, rushT = 0, nextRush = 45;
  // 세로↔가로 전환: 날고 있는 도형·칼날 위치를 새 판 크기에 맞춤
  function geo(sh) {
    landStats(sh); if (sh.W === W && sh.H === H) return;
    var sx = sh.W / W, sy = sh.H / H;
    if (items) items.forEach(function (it) { it.x *= sx; it.y *= sy; it.vy *= Math.sqrt(sy); if (it.halves) it.halves.forEach(function (h) { h.x *= sx; h.y *= sy; }); });
    if (kb) { kb.x *= sx; kb.y *= sy; } trail = []; lastPt = null; W = sh.W; H = sh.H;
  }
  var fx = new A.FX();
  var items, trail, score, miss, combo, bestCombo, sliced, spawnT, dyingT, time, lastPt = null, comboT = 0, keys = {}, kb = null, golds;
  var COLS = ['#ff5ec4', '#5ee7ff', '#7dff9b', '#ffe066', '#b48cff', '#ff7a45'];
  function reset() { rushT = 0; nextRush = 45; items = []; trail = []; score = 0; miss = 0; combo = 0; bestCombo = 0; sliced = 0; spawnT = 0.8; dyingT = 0; time = 0; comboT = 0; golds = 0; kb = null; lastPt = null; fx.clear(); hud(); }
  function spawn() {
    var lv = Math.min(1, time / 90), n = A.irand(1, 2 + Math.floor(lv * 3));
    for (var i = 0; i < n; i++) {
      var bomb = rushT <= 0 && time > 6 && Math.random() < 0.12 + lv * 0.1, x = A.rand(80, W - 80), gold = !bomb && time > 10 && Math.random() < 0.05;
      items.push({ x: x, y: H + 40, vx: (W / 2 - x) * A.rand(0.3, 0.9) + A.rand(-60, 60), vy: -A.rand(900, 1150) * Math.sqrt(H / 960), r: bomb ? 30 : gold ? 28 : A.rand(30, 40), rot: 0, vr: A.rand(-4, 4), sides: gold ? 5 : A.irand(3, 6), c: gold ? '#ffd166' : A.pick(COLS), bomb: bomb, gold: gold, cut: false });
    }
    A.sfx('bounce', 0.6); spawnT = rushT > 0 ? 0.28 : Math.max(0.55, 1.4 - lv * 0.8) * A.rand(0.8, 1.2);
  }
  function cut(it, ax, ay, bx, by) {
    it.cut = true;
    if (it.bomb) { dyingT = 1.2; fx.burst(it.x, it.y, '#ff4d6d', 60, 500, 1, 5); fx.flashIt('#ffffff', 1); fx.shake(16, 0.6); A.sfx('bigboom'); A.vibrate([80, 40, 160]); return; }
    sliced++; combo++; comboT = 0.45; tutDone();
    // 황금 도형: +50, 놓친 수 1 회복
    if (it.gold) { golds++; score += 50; fx.text(it.x, it.y - 46, miss > 0 ? '황금! +50 · 놓침 -1' : '황금! +50', '#ffd166', 22); fx.ring(it.x, it.y, '#ffd166', 90, 0.4); A.sfx('power'); if (miss > 0) miss--; }
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
    // 러시: 45초부터 30초마다 4초 동안 폭탄 없이 도형이 쏟아짐
    if (time >= nextRush && dyingT <= 0) { nextRush += 30; rushT = 4; spawnT = 0.3; S.banner('RUSH!', '폭탄 없음 · 마구 베세요'); A.sfx('level'); }
    if (rushT > 0) rushT -= dt;
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
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['벤 도형', String(sliced)], ['최대 콤보', String(Math.max(bestCombo, combo))], vsBest(score)]); return; }
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
      if (it.gold) { c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, A.glowDot('#ffd166', 16), it.x, it.y, 1.6 + Math.sin(t * 10) * 0.2); c.restore(); }
      c.save(); c.translate(it.x, it.y); c.rotate(it.rot); shape(c, it, it.r); c.shadowColor = it.c; c.shadowBlur = 18; c.fillStyle = A.hexA(it.c, 0.35); c.fill(); c.strokeStyle = it.c; c.lineWidth = 4; c.stroke(); c.restore();
    });
    if (trail && trail.length > 1) {
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      for (var i = 1; i < trail.length; i++) { c.strokeStyle = 'rgba(255,255,255,' + trail[i].t * 5 + ')'; c.lineWidth = 2 + trail[i].t * 50; c.beginPath(); c.moveTo(trail[i - 1].x, trail[i - 1].y); c.lineTo(trail[i].x, trail[i].y); c.stroke(); }
      c.restore();
    }
    if (tut && items && S.state === 'playing' && !sliced) tutText(c, isTouch() ? '화면을 그어서 도형을 베세요' : '마우스로 긋거나 방향키로 칼날 이동', '빨간 ✕ 폭탄은 베지 마세요!', H * 0.3);
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
  // 가로 화면: 판 위 점수판이 판을 가리지 않게, 오른쪽 패널에 같은 점수판을 만들어 글자를 따라 씀
  function landStats(S) {
    var hd = document.querySelector('.g-hud'); if (!hd || !S.panelSlot || S.panelSlot.firstChild) return; hd.setAttribute('data-land-hide', '');
    var src = ['hA', 'hB', 'hC'].map(function (id) { return document.getElementById(id); }), mult = document.getElementById('hMult');
    var card = document.createElement('div'); card.className = 'g-card gp-stats';
    var outs = src.map(function (el) { var d = document.createElement('div'), sp = document.createElement('span'), b = document.createElement('b'), lb = el.parentNode.querySelector('.h-lb'); sp.textContent = lb ? lb.textContent : ''; d.appendChild(sp); d.appendChild(b); card.appendChild(d); return b; });
    var om = document.createElement('div'); om.className = 'g-card'; om.style.cssText = 'text-align:center;font-weight:800;color:var(--gold)';
    S.panelSlot.appendChild(card); S.panelSlot.appendChild(om);
    function sync() { src.forEach(function (el, i) { outs[i].textContent = el.textContent; }); om.textContent = mult ? mult.textContent : ''; om.style.display = om.textContent ? '' : 'none'; }
    var mo = new MutationObserver(sync); src.concat(mult ? [mult] : []).forEach(function (el) { mo.observe(el, { childList: true, characterData: true, subtree: true }); }); sync();
  }
  // 첫 판 안내(한 번 제대로 하면 다시 안 나옴)와 종료 화면 '최고 대비'
  var tut = A.get('neowa_slash_tut', '') !== '1';
  function tutDone() { if (tut) { tut = false; A.set('neowa_slash_tut', '1'); } }
  function isTouch() { return document.body.classList.contains('touch'); }
  function vsBest(sc) { var b = S.best || 0; return ['최고 대비', !b ? '첫 기록' : sc > b ? '+' + A.fmt(sc - b) + ' 신기록' : '-' + A.fmt(b - sc)]; }
  function tutText(c, a, b, y) {
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; var w = Math.max(a.length * 23, b ? b.length * 15 : 0) + 40;
    c.fillStyle = 'rgba(0,0,0,.55)'; A.rr(c, W / 2 - w / 2, y - 30, w, b ? 82 : 60, 16); c.fill();
    c.fillStyle = 'rgba(255,255,255,' + (0.8 + Math.sin(S.time * 5) * 0.2) + ')'; c.font = '800 24px "Pretendard Variable",system-ui'; c.fillText(a, W / 2, y);
    if (b) { c.font = '600 16px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText(b, W / 2, y + 30); }
    c.restore();
  }
  var S = new A.Shell({ id: 'slash', W: W, H: H, land: [840, 720], onResize: geo, reset: function () { keys = {}; reset(); }, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { keys[kn(e)] = true; }, keyup: function (e) { keys[kn(e)] = false; } });
})();
