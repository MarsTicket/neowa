(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var P, plats, coins, cam, maxH, score, coinN, dyingT, keys = {}, drag = null, topY;
  function addPlat(y) {
    var lv = Math.min(1, maxH / 30000), r = Math.random(), t = 'n';
    if (r < 0.15 + lv * 0.15) t = 'm'; else if (r < 0.25 + lv * 0.2) t = 'b'; else if (r < 0.31) t = 's'; else if (r < 0.325) t = 'r';
    var p = { x: A.rand(50, W - 50), y: y, w: 92, t: t, vx: t === 'm' ? A.rand(60, 140) * A.pick([-1, 1]) : 0, broken: false };
    plats.push(p); if (Math.random() < 0.18) coins.push({ x: A.clamp(p.x + A.rand(-60, 60), 30, W - 30), y: y - A.rand(60, 140) });
    topY = y;
  }
  function reset() { P = { x: W / 2, y: 800, vx: 0, vy: -900, face: 1 }; plats = []; coins = []; cam = 0; maxH = 0; score = 0; coinN = 0; dyingT = 0; keys = {}; drag = null; topY = 880; plats.push({ x: W / 2, y: 880, w: 140, t: 'n', vx: 0 }); while (topY > -200) addPlat(topY - A.rand(70, 120)); fx.clear(); hud(); }
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
    score = Math.floor(maxH / 10) + coinN * 20; hud();
  }
  function render(c) {
    var o = fx.offset(), t = S.time, cm = cam || 0;
    c.save(); c.translate(o[0], o[1]);
    var k = Math.min(1, (maxH || 0) / 40000), g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, k > 0.5 ? '#050820' : '#3a7bd5'); g.addColorStop(1, k > 0.5 ? '#1a2a6b' : '#9be7ff'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    c.fillStyle = 'rgba(255,255,255,.35)'; for (var i = 0; i < 8; i++) { var cy = ((i * 170 - cm * 0.3) % (H + 200) + H + 200) % (H + 200) - 100; c.beginPath(); c.ellipse((i * 113) % W, cy, 80, 22, 0, 0, 7); c.fill(); }
    c.save(); c.translate(0, -cm);
    (plats || [{ x: 270, y: 880, w: 140, t: 'n' }, { x: 150, y: 760, w: 92, t: 'n' }, { x: 390, y: 640, w: 92, t: 's' }]).forEach(function (p) {
      if (p.broken) return; var col = { n: '#e8fbff', m: '#7dff9b', b: '#ff4d6d', s: '#ffd166', r: '#ff9ecf' }[p.t];
      c.fillStyle = col; A.rr(c, p.x - p.w / 2, p.y - 8, p.w, 16, 8); c.fill();
      if (p.t === 'b') { c.strokeStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.moveTo(p.x - 10, p.y - 8); c.lineTo(p.x, p.y + 8); c.stroke(); }
      if (p.t === 's') { c.fillStyle = '#ffd166'; c.fillRect(p.x - 8, p.y - 20, 16, 12); }
      if (p.t === 'r') { c.fillStyle = '#ff9ecf'; c.beginPath(); c.moveTo(p.x, p.y - 34); c.lineTo(p.x + 10, p.y - 10); c.lineTo(p.x - 10, p.y - 10); c.fill(); }
    });
    c.save(); c.globalCompositeOperation = 'lighter'; (coins || []).forEach(function (cn) { A.draw(c, A.glowDot('#ffd166', 6), cn.x, cn.y, 0.9); }); c.restore();
    var px = P ? P.x : 270, py = P ? P.y : 860 - Math.abs(Math.sin(t * 3)) * 200;
    c.save(); c.translate(px, py); c.scale(P ? P.face : 1, 1); c.fillStyle = '#ffffff'; A.rr(c, -18, -22, 36, 40, 14); c.fill();
    c.fillStyle = '#03141c'; c.beginPath(); c.arc(6, -8, 4, 0, 7); c.fill(); c.fillStyle = '#9be7ff'; c.fillRect(-18, 10, 36, 8); c.restore();
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
