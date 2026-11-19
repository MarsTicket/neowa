(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, LX = [150, 270, 390], PY = 780;
  var fx = new A.FX();
  // 3D 그래픽(assets/arcade/3d/lanes.js). 못 쓰는 기기에서는 아래 2D 그림 그대로
  var G3 = { draw: function () { return false; } };
  A.load3D = A.load3D || function (id, get, done) { var s = document.createElement('script'); s.src = '../assets/arcade/g3d.js?v=1'; s.onload = function () { done(A.G3D.boot(id, get)); }; document.head.appendChild(s); };
  A.load3D('lanes', function () { return { lane: lane, px: px, cars: cars, coins: coins, speed: speed, dying: dyingT }; }, function (h) { G3 = h; });
  var lane, px, cars, coins, speed, dist, score, coinN, nearN, spawnT, dyingT, road, prevFree, leftAt, clock, chain, lastNear, nextKm;
  var TRAFFIC = 0.6;   // 차들은 모두 내 속도의 60%로 다가옴 → 줄끼리 겹쳐 벽이 되는 일이 없음
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
  function reset() { lane = 1; px = LX[1]; cars = []; coins = []; speed = 420; dist = 0; score = 0; coinN = 0; nearN = 0; spawnT = 160; dyingT = 0; road = 0; prevFree = [0, 1, 2]; leftAt = [-9, -9, -9]; clock = 0; chain = 0; lastNear = -9; nextKm = 10; fx.clear(); hud(); }
  function move(d) { if (S.state !== 'playing' || dyingT > 0) return; var n = A.clamp(lane + d, 0, 2); if (n !== lane) { leftAt[lane] = clock; lane = n; A.sfx('whoosh', 1.3, A.clamp(LX[lane] / W * 2 - 1, -1, 1)); } }
  function spawn() {
    var lv = Math.min(1, dist / 30000), free = [0, 1, 2], i;
    if (Math.random() < 0.25 + lv * 0.35) {
      // 두 차선 막기: 남는 한 칸은 바로 앞 줄의 빈 차선 어디서든 한 칸 안에 있어야 함 (항상 피할 길 보장)
      var ok = free.filter(function (f) { return prevFree.every(function (p) { return Math.abs(p - f) <= 1; }); });
      free = [A.pick(ok.length ? ok : [1])];
    } else free.splice(A.irand(0, 2), 1);
    for (i = 0; i < 3; i++) if (free.indexOf(i) < 0) cars.push({ l: i, y: -80, c: A.pick(CARC), near: false });
    prevFree = free;
    if (Math.random() < 0.6) { var cl = A.pick(free); for (var j = 0; j < 4; j++) coins.push({ l: cl, y: -150 - j * 60 }); }
    spawnT = A.lerp(430, 300, lv) * A.rand(0.95, 1.25);   // 다음 줄까지 거리(px)
  }
  function crash() {
    if (dyingT > 0) return; dyingT = 1.2; fx.burst(px, PY, '#ff7a45', 50, 460, 0.9, 4); fx.burst(px, PY, '#fff', 14, 300, 0.5, 2.4);
    fx.shake(14, 0.5); fx.flashIt('#ff2244', 0.6); A.sfx('bigboom'); A.vibrate(200);
  }
  function update(dt) {
    fx.update(dt);
    px = A.lerp(px, LX[lane], Math.min(1, dt * 16));
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(Math.floor(score), [['거리', (dist / 1000).toFixed(1) + 'km'], ['코인', String(coinN)], ['니어미스', String(nearN)]]); return; }
    clock += dt;
    speed = Math.min(1100, 420 + dist / 70); dist += speed * dt; road = (road + speed * dt) % 80;
    var rel = speed * TRAFFIC * dt;
    spawnT -= rel; if (spawnT <= 0) spawn();
    if (dist / 1000 >= nextKm) { S.banner(nextKm + ' km', 'SPEED UP'); A.sfx('level'); nextKm += 10; }
    for (var i = cars.length - 1; i >= 0; i--) {
      var c = cars[i], py0 = c.y; c.y += rel;
      if (Math.abs(c.y - PY) < 100 && Math.abs(LX[c.l] - px) < 52) crash();
      // 아슬아슬: 그 차 차선에 있다가 0.6초 안에 옆으로 피했을 때만 (가만히 있어도 받던 점수 막음). 4초 안에 이어지면 배율 ↑
      if (!c.near && py0 < PY && c.y >= PY && dyingT <= 0 && c.l !== lane && Math.abs(c.l - lane) === 1 && clock - leftAt[c.l] < 0.6) {
        c.near = true; nearN++; chain = clock - lastNear < 4 ? Math.min(5, chain + 1) : 1; lastNear = clock;
        var pts = 30 * chain; score += pts; fx.text(LX[lane], PY - 80, (chain > 1 ? '아슬아슬 ×' + chain + ' +' : '아슬아슬 +') + pts, '#ff9ecf', 18 + chain * 2); A.sfx('whoosh', 1.6, A.clamp(LX[c.l] / W * 2 - 1, -1, 1)); A.sfx('tick', 1 + chain * 0.1);
      }
      if (c.y > H + 100) cars.splice(i, 1);
    }
    for (i = coins.length - 1; i >= 0; i--) {
      var o = coins[i]; o.y += rel;
      if (o.l === lane && Math.abs(o.y - PY) < 60) { coins.splice(i, 1); coinN++; score += 50; fx.burst(LX[o.l], o.y, '#ffd166', 10, 180, 0.35, 2.5); A.sfx('coin', 1 + (coinN % 8) * 0.04, A.clamp(LX[o.l] / W * 2 - 1, -1, 1)); }
      else if (o.y > H + 40) coins.splice(i, 1);
    }
    score += speed * dt / 40;
    if (Math.random() < 0.5) fx.spark(px + A.rand(-14, 14), PY + 56, '#ff7a45', 0, speed * 0.3, 0.2, 2);
    hud();
  }
  function render(c) {
    if (G3.draw(c, fx)) return;
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
  function hud() { var k = Math.floor(score) + '|' + Math.floor(speed / 10) + '|' + coinN + '|' + chain + (clock - lastNear < 4); if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = Math.round(speed / 5); document.getElementById('hC').textContent = coinN; document.getElementById('hMult').textContent = chain > 1 && clock - lastNear < 4 ? '아슬아슬 ×' + chain : ''; }
  var stage = document.getElementById('stage'), sw = null;
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e); sw = { x: e.clientX, done: false, lx: p.x }; });
  stage.addEventListener('pointermove', function (e) { if (!sw || sw.done) return; var dx = e.clientX - sw.x; if (Math.abs(dx) > 30) { move(dx > 0 ? 1 : -1); sw.done = true; } });
  stage.addEventListener('pointerup', function () { if (sw && !sw.done) move(sw.lx < W / 2 ? -1 : 1); sw = null; });
  var S = new A.Shell({ id: 'lanes', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); road = ((road || 0) + 200 * dt) % 80; }, render: render,
    keydown: function (e) { var k = e.key; if (k === 'ArrowLeft' || k === 'a') move(-1); if (k === 'ArrowRight' || k === 'd') move(1); } });
})();
