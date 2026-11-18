(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, TOP = 70;
  // 가로 화면은 960x600 넓은 바다 (물고기가 옆으로 헤엄치는 게임이라 가로가 자연스러움). 돌리면 위치를 비율대로 옮김
  function geo(sh) {
    var nW = sh ? sh.W : 540, nH = sh ? sh.H : 960, nT = sh && sh.land ? 16 : 70, kx = nW / W, ky = (nH - nT) / (H - TOP);
    function mv(o) { o.x *= kx; o.y = nT + (o.y - TOP) * ky; }
    if (P) { mv(P); fish.forEach(mv); bubbles.forEach(mv); if (drag) mv(drag); }
    W = nW; H = nH; TOP = nT;
  }
  var fx = new A.FX();
  var warnT = 0, P, fish, bubbles = [], score, eaten, size, xp, dyingT, drag = null, keys = {}, spawnT, inv, combo, comboT, bestCombo, MAXS = 10;
  var COLS = ['#ffb547', '#ff7aa8', '#7dff9b', '#b48cff', '#ffe066', '#5ee7ff', '#ff7a45'];
  function rFor(s) { return 14 + s * 6; }
  function reset() { P = { x: W / 2, y: H / 2, vx: 0, vy: 0, face: 1 }; fish = []; score = 0; eaten = 0; size = 1; xp = 0; dyingT = 0; drag = null; keys = {}; spawnT = 0; warnT = 0; inv = 2; combo = 0; comboT = 0; bestCombo = 0; for (var i = 0; i < 8; i++) spawnFish(true, i < 5); fx.clear(); hud(); }
  function spawnFish(init, small) {
    // 작은 물고기(먹이)가 절반 이상 나오게. 가끔 아주 큰 포식자
    var gold = !init && Math.random() < 0.05, s = gold ? Math.max(0.5, size - 1) : A.clamp(size + (small ? A.irand(-3, -1) : (Math.random() < 0.35 ? A.irand(0, 3) : A.irand(-3, -1))), 0.5, MAXS + 3), side = Math.random() < 0.5 ? -1 : 1;
    var r = rFor(s) * A.rand(0.9, 1.1), f = { s: s, r: r, x: init ? A.rand(0, W) : (side < 0 ? -r * 1.5 - 10 : W + r * 1.5 + 10), y: A.rand(TOP + 40, H - 40), c: gold ? '#ffd166' : A.pick(COLS), wob: Math.random() * 6, gold: gold };
    f.vx = -side * A.rand(40, 110) / (1 + s * 0.05) * (gold ? 2.2 : 1); if (init) f.vx = A.pick([-1, 1]) * A.rand(40, 100);
    if (init) for (var k = 0; k < 6 && Math.hypot(f.x - W / 2, f.y - H / 2) < 230; k++) { f.x = A.rand(0, W); f.y = A.rand(TOP + 40, H - 40); }
    fish.push(f);
  }
  function update(dt) {
    fx.update(dt);
    if (warnT > 0) warnT -= dt;
    fish.forEach(function (f) { f.x += f.vx * dt; f.wob += dt * 3; f.y += Math.sin(f.wob) * 12 * dt; });
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['최대 크기', String(size)], ['먹은 물고기', String(eaten)], ['최대 연속', String(bestCombo)]]); return; }
    var tx = 0, ty = 0;
    if (drag) { tx = drag.x - P.x; ty = drag.y - P.y; var d = Math.hypot(tx, ty); if (d > 8) { tx /= d; ty /= d; } else tx = ty = 0; }
    var kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0), ky = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    if (kx || ky) { var l = Math.hypot(kx, ky); tx = kx / l; ty = ky / l; }
    var maxs = 320 - size * 6;
    P.vx = A.lerp(P.vx, tx * maxs, Math.min(1, dt * 4)); P.vy = A.lerp(P.vy, ty * maxs, Math.min(1, dt * 4));
    P.x = A.clamp(P.x + P.vx * dt, 20, W - 20); P.y = A.clamp(P.y + P.vy * dt, TOP + 20, H - 20);
    if (Math.abs(P.vx) > 20) P.face = P.vx > 0 ? 1 : -1;
    var pr = rFor(size); if (inv > 0) inv -= dt; if (comboT > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
    for (var i = fish.length - 1; i >= 0; i--) {
      var f = fish[i], m = f.r * 1.6 + 40;
      if ((f.x < -m && f.vx < 0) || (f.x > W + m && f.vx > 0)) { fish.splice(i, 1); continue; }
      var dd = Math.hypot(f.x - P.x, f.y - P.y);
      if (warnT <= 0 && f.r >= pr * 0.95 && dd < (pr + f.r) * 1.25 && dd >= (pr + f.r) * 0.7) { warnT = 1.5; A.sfx('warn', 1, A.clamp(f.x / W * 2 - 1, -1, 1)); }
      if (dd < (pr + f.r) * 0.7) {
        if (f.r < pr * 0.95) {
          combo++; comboT = 1.6; bestCombo = Math.max(bestCombo, combo);
          fish.splice(i, 1); eaten++; var pts = Math.round(10 * Math.max(1, f.s) * (f.gold ? 5 : 1)) * Math.min(5, combo); score += pts; xp += Math.max(1, f.s) * (f.gold ? 3 : 1);
          fx.burst(f.x, f.y, f.c, 12, 200, 0.4, 3); fx.text(f.x, f.y - 20, '+' + pts + (combo > 1 ? ' ×' + Math.min(5, combo) : ''), f.gold ? '#ffd166' : '#fff', 16 + Math.min(4, combo) * 2); if (f.gold) A.sfx('gold'); A.sfx('eat', 1.4 - Math.min(0.6, f.s * 0.05), A.clamp(f.x / W * 2 - 1, -1, 1)); A.vibrate(10);
          var need = 5 + size * 3;
          if (xp >= need && size < MAXS) { xp -= need; size++; S.banner('크기 ' + size, size === MAXS ? '최대 크기! 이제부터 먹을 때마다 보너스' : '더 커졌다!'); A.sfx('level'); fx.ring(P.x, P.y, '#4dd8ff', 140, 0.5); }
          else if (xp >= need) { xp -= need; score += 500; fx.text(P.x, P.y - pr - 30, '바다의 왕 +500', '#ffd166', 22); A.sfx('gold'); }
        } else if (inv <= 0) { dyingT = 1.2; fx.burst(P.x, P.y, '#4dd8ff', 40, 380, 0.8, 4); fx.shake(10, 0.4); fx.flashIt('#ff2244', 0.5); A.sfx('hurt', 1, A.clamp(P.x / W * 2 - 1, -1, 1)); A.vibrate(180); hud(); return; }
      }
    }
    spawnT -= dt; if (spawnT <= 0 && fish.length < 15) { spawnFish(false); spawnT = A.rand(0.35, 0.8); }
    if (Math.random() < 0.05) bubbles.push({ x: A.rand(0, W), y: H + 10, r: A.rand(2, 6) });
    hud();
  }
  function drawFish(c, x, y, r, col, face, ring) {
    c.save(); c.translate(x, y); c.scale(face, 1);
    c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, r, r * 0.62, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(-r * 0.8, 0); c.lineTo(-r * 1.45, -r * 0.55); c.lineTo(-r * 1.45, r * 0.55); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(r * 0.45, -r * 0.15, r * 0.18, 0, 7); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(r * 0.5, -r * 0.15, r * 0.09, 0, 7); c.fill();
    if (ring) { c.strokeStyle = ring; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, r + 6, r * 0.62 + 6, 0, 0, 7); c.stroke(); }
    c.restore();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a3a5a'); g.addColorStop(1, '#021422'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    for (var k = 0; k < 5; k++) { c.fillStyle = 'rgba(255,255,255,.04)'; c.beginPath(); c.moveTo(80 + k * 110 + Math.sin(t + k) * 20, 0); c.lineTo(140 + k * 110, 0); c.lineTo(60 + k * 110, H); c.lineTo(20 + k * 110, H); c.fill(); }
    bubbles.forEach(function (b) { b.y -= 60 / 60; c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.5; c.beginPath(); c.arc(b.x + Math.sin(b.y * 0.05) * 6, b.y, b.r, 0, 7); c.stroke(); });
    bubbles = bubbles.filter(function (b) { return b.y > -10; });
    c.fillStyle = '#123a2a'; for (var x = 0; x < W; x += 40) { c.beginPath(); c.moveTo(x, H); c.quadraticCurveTo(x + 10 + Math.sin(t + x) * 10, H - 80, x + 20, H); c.fill(); }
    var pr = P ? rFor(size) : 20;
    (fish || []).forEach(function (f) { drawFish(c, f.x, f.y, f.r, f.c, f.vx > 0 ? 1 : -1, P ? (f.r < pr * 0.95 ? 'rgba(125,255,155,.7)' : 'rgba(255,77,109,.8)') : null); });
    if (!fish) { drawFish(c, W * 0.28, H * 0.42, 30, '#ffb547', 1); drawFish(c, W * 0.7, H * 0.62, 60, '#ff7aa8', -1); drawFish(c, W * 0.48, H * 0.79, 20, '#7dff9b', 1); }
    if (P && dyingT <= 0 && !(inv > 0 && Math.floor(inv * 10) % 2)) { c.save(); c.shadowColor = '#4dd8ff'; c.shadowBlur = 20; drawFish(c, P.x, P.y, pr, '#4dd8ff', P.face); c.restore(); }
    // 화면 밖에서 다가오는 위험한 물고기 경고
    if (P && S.state === 'playing') (fish || []).forEach(function (f) { if (f.r >= pr * 0.95 && (f.x < 0 || f.x > W) && f.x * f.vx < W * f.vx / 2 + 1) { var ex = f.x < 0 ? 18 : W - 18; c.globalAlpha = 0.6 + Math.sin(t * 12) * 0.3; c.fillStyle = '#ff4d6d'; c.beginPath(); c.moveTo(ex + (f.x < 0 ? -12 : 12), f.y); c.lineTo(ex + (f.x < 0 ? 8 : -8), f.y - 14); c.lineTo(ex + (f.x < 0 ? 8 : -8), f.y + 14); c.fill(); c.globalAlpha = 1; } });
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + size + '|' + eaten + '|' + combo; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = size >= MAXS ? 'MAX' : size; document.getElementById('hMult').textContent = combo > 1 ? '×' + Math.min(5, combo) : ''; document.getElementById('hC').textContent = eaten; }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; drag = S.toLocal(e); drag.id = e.pointerId; try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (drag && drag.id === e.pointerId) { var p = S.toLocal(e); drag.x = p.x; drag.y = p.y; } });
  stage.addEventListener('pointerup', function () { drag = null; });
  var S = new A.Shell({ id: 'fishy', W: W, H: H, land: [960, 600], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = true; }, keyup: function (e) { keys[e.key.length === 1 ? e.key.toLowerCase() : e.key] = false; } });
  // 가로 화면: 점수판을 오른쪽 패널로 옮김 (게임판 위 점수판은 가로에서 숨김)
  (function () {
    var hudEl = document.querySelector('.g-hud'); if (!hudEl || !S.panelSlot) return; hudEl.setAttribute('data-land-hide', '');
    var lbs = hudEl.querySelectorAll('.h-lb'), ids = ['hA', 'hB', 'hC'], html = '<div class="g-card gp-stats">';
    for (var i = 0; i < 3; i++) html += '<div><span>' + lbs[i].textContent + '</span><b id="p' + ids[i] + '"></b></div>';
    S.panelSlot.innerHTML = html + '</div><div class="g-card" id="phMult" style="font-weight:800;font-size:17px;color:var(--gold);text-align:center"></div>' + '';
    ids.concat('hMult').forEach(function (id) {
      var src = document.getElementById(id), dst = document.getElementById('p' + id); if (!src || !dst) return;
      function cp() { dst.textContent = src.textContent; dst.style.color = src.style.color; if (id === 'hMult') dst.style.display = src.textContent ? '' : 'none'; }
      cp(); new MutationObserver(cp).observe(src, { childList: true, characterData: true, subtree: true, attributes: true });
    });
  })();
})();
