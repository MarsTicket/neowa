(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, LX = [150, 270, 390], PY = 780;
  var fx = new A.FX();
  var lane, px, cars, coins, speed, dist, score, coinN, nearN, spawnT, dyingT, road;
  var CARC = ['#5ee7ff', '#b48cff', '#7dff9b', '#ffe066', '#ff9ecf'];
  function carSprite(col, me) {
    return A.sprite('car' + col + (me ? 'm' : ''), 72, 120, function (x) {
      x.translate(36, 60); x.shadowColor = col; x.shadowBlur = 14;
      x.fillStyle = col; A.rr(x, -26, -50, 52, 100, 14); x.fill(); x.shadowBlur = 0;
      x.fillStyle = 'rgba(5,10,20,.8)'; A.rr(x, -19, me ? -30 : 4, 38, 24, 6); x.fill();
      x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(-20, me ? -48 : 44, 10, 4); x.fillRect(10, me ? -48 : 44, 10, 4);
      x.fillStyle = me ? '#ff4d6d' : '#fff'; x.fillRect(-22, me ? 44 : -48, 12, 4); x.fillRect(10, me ? 44 : -48, 12, 4);
    });
  }
  function reset() { lane = 1; px = LX[1]; cars = []; coins = []; speed = 420; dist = 0; score = 0; coinN = 0; nearN = 0; spawnT = 0.6; dyingT = 0; road = 0; fx.clear(); hud(); }
  function move(d) { if (S.state !== 'playing' || dyingT > 0) return; var n = A.clamp(lane + d, 0, 2); if (n !== lane) { lane = n; A.sfx('turn', 1.4); } }
  function spawn() {
    var lv = Math.min(1, dist / 30000), free = [0, 1, 2], block = Math.random() < 0.25 + lv * 0.35 ? 2 : 1;
    for (var i = 0; i < block; i++) { var k = free.splice(A.irand(0, free.length - 1), 1)[0]; cars.push({ l: k, y: -80, v: A.rand(0.25, 0.55) * speed, c: A.pick(CARC), near: false }); }
    if (Math.random() < 0.6) { var cl = A.pick(free); for (var j = 0; j < 4; j++) coins.push({ l: cl, y: -60 - j * 70 }); }
    spawnT = Math.max(0.42, 1.0 - lv * 0.5) * A.rand(0.85, 1.2);
  }
  function crash() {
    if (dyingT > 0) return; dyingT = 1.2; fx.burst(px, PY, '#ff7a45', 50, 460, 0.9, 4); fx.burst(px, PY, '#fff', 14, 300, 0.5, 2.4);
    fx.shake(14, 0.5); fx.flashIt('#ff2244', 0.6); A.sfx('bigboom'); A.vibrate(200);
  }
  function update(dt) {
    fx.update(dt);
    px = A.lerp(px, LX[lane], Math.min(1, dt * 16));
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['거리', (dist / 1000).toFixed(1) + 'km'], ['코인', String(coinN)], ['니어미스', String(nearN)]]); return; }
    speed = Math.min(1100, 420 + dist / 70); dist += speed * dt; road = (road + speed * dt) % 80;
    spawnT -= dt; if (spawnT <= 0) spawn();
    for (var i = cars.length - 1; i >= 0; i--) {
      var c = cars[i]; c.y += (speed - c.v) * dt;
      if (Math.abs(c.y - PY) < 100 && Math.abs(LX[c.l] - px) < 52) crash();
      if (!c.near && c.y > PY + 60 && Math.abs(c.l - lane) === 1) { c.near = true; nearN++; score += 30; fx.text(LX[lane], PY - 80, '아슬아슬 +30', '#ff9ecf', 18); A.sfx('tick'); }
      if (c.y > H + 100) cars.splice(i, 1);
    }
    for (i = coins.length - 1; i >= 0; i--) {
      var o = coins[i]; o.y += speed * dt;
      if (o.l === lane && Math.abs(o.y - PY) < 60) { coins.splice(i, 1); coinN++; score += 50; fx.burst(LX[o.l], o.y, '#ffd166', 10, 180, 0.35, 2.5); A.sfx('coin'); }
      else if (o.y > H + 40) coins.splice(i, 1);
    }
    score += speed * dt / 40;
    if (Math.random() < 0.5) fx.spark(px + A.rand(-14, 14), PY + 56, '#ff7a45', 0, speed * 0.3, 0.2, 2);
    hud();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0a0612'; c.fillRect(-10, -10, W + 20, H + 20);
    var rg = c.createLinearGradient(80, 0, 460, 0); rg.addColorStop(0, '#1a1024'); rg.addColorStop(0.5, '#221430'); rg.addColorStop(1, '#1a1024');
    c.fillStyle = rg; c.fillRect(90, 0, 360, H);
    c.fillStyle = '#ff7a45'; c.fillRect(88, 0, 4, H); c.fillRect(448, 0, 4, H);
    var off = road != null ? road : (t * 300) % 80;
    c.fillStyle = 'rgba(255,255,255,.35)'; for (var y = -80 + off; y < H; y += 80) { c.fillRect(208, y, 4, 40); c.fillRect(328, y, 4, 40); }
    // 가로수 불빛
    for (y = -120 + (off * 1.5) % 120; y < H; y += 120) { c.fillStyle = 'rgba(255,122,69,.5)'; c.fillRect(40, y, 6, 30); c.fillRect(494, y, 6, 30); }
    c.save(); c.globalCompositeOperation = 'lighter';
    (coins || []).forEach(function (cn) { A.draw(c, A.glowDot('#ffd166', 6), LX[cn.l], cn.y, 1); });
    c.restore();
    (cars || []).forEach(function (cr) { A.draw(c, carSprite(cr.c), LX[cr.l], cr.y, 1, Math.PI); });
    if (!cars || dyingT <= 0) A.draw(c, carSprite('#ff7a45', true), px || LX[1], PY, 1, (px != null ? (LX[lane] - px) * -0.004 : 0));
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = Math.floor(score) + '|' + Math.floor(speed / 10) + '|' + coinN; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = Math.round(speed / 5); document.getElementById('hC').textContent = coinN; }
  var stage = document.getElementById('stage'), sw = null;
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e); sw = { x: e.clientX, done: false, lx: p.x }; });
  stage.addEventListener('pointermove', function (e) { if (!sw || sw.done) return; var dx = e.clientX - sw.x; if (Math.abs(dx) > 30) { move(dx > 0 ? 1 : -1); sw.done = true; } });
  stage.addEventListener('pointerup', function () { if (sw && !sw.done) move(sw.lx < W / 2 ? -1 : 1); sw = null; });
  var S = new A.Shell({ id: 'lanes', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); road = ((road || 0) + 200 * dt) % 80; }, render: render,
    keydown: function (e) { var k = e.key; if (k === 'ArrowLeft' || k === 'a') move(-1); if (k === 'ArrowRight' || k === 'd') move(1); } });
})();
