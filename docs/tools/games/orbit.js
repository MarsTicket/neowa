(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  // 3D 그래픽(assets/arcade/3d/orbit.js). 못 쓰는 기기에서는 아래 2D 그림 그대로
  var G3 = { draw: function () { return false; } };
  A.load3D = A.load3D || function (id, get, done) { var s = document.createElement('script'); s.src = '../assets/arcade/g3d.js?v=1'; s.onload = function () { done(A.G3D.boot(id, get)); }; document.head.appendChild(s); };
  A.load3D('orbit', function () { return { planets: planets, ship: ship, stars: stars, cam: cam, dying: dyingT, playing: S.state === 'playing' }; }, function (h) { G3 = h; });
  var planets = [], ship, cam = 0, camT = 0, maxCam = 0, skipN = 0, score = 0, hops = 0, starN = 0, dyingT = 0, flyT = 0, nextY, stars = [], trail = [], bgStars = [];
  var PAL = ['#ff7a45', '#5ee7ff', '#b48cff', '#7dff9b', '#ffd166', '#ff7aa8'];
  var SHIP = A.sprite('oship', 44, 44, function (x) {
    x.translate(22, 22); x.shadowColor = '#ffb08a'; x.shadowBlur = 14; x.fillStyle = '#fff';
    x.beginPath(); x.moveTo(14, 0); x.lineTo(-10, -9); x.lineTo(-5, 0); x.lineTo(-10, 9); x.closePath(); x.fill();
  });
  for (var i = 0; i < 140; i++) bgStars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random() });

  function planetSprite(color, r) {
    return A.sprite('pl' + color + r, r * 2 + 40, r * 2 + 40, function (x, w) {
      var c = w / 2;
      var halo = x.createRadialGradient(c, c, r * 0.8, c, c, r + 20); halo.addColorStop(0, A.hexA(color, 0.45)); halo.addColorStop(1, A.hexA(color, 0));
      x.fillStyle = halo; x.fillRect(0, 0, w, w);
      var g = x.createRadialGradient(c - r * 0.35, c - r * 0.35, r * 0.1, c, c, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, color); g.addColorStop(1, A.hexA(color, 0.35));
      x.fillStyle = g; x.beginPath(); x.arc(c, c, r, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 3; x.beginPath(); x.ellipse(c, c, r * 1.35, r * 0.35, -0.4, 0, Math.PI * 2); x.stroke();
    });
  }
  function addPlanet(y, first) {
    var lv = Math.min(1, hops / 40);
    var r = first ? 46 : A.rand(40 - lv * 14, 54 - lv * 16);
    var p = { x: first ? W / 2 : A.rand(r + 50, W - r - 50), y: y, r: r, c: A.pick(PAL), spin: (Math.random() < 0.5 ? -1 : 1) * A.rand(1.6, 2.2 + lv * 1.4), rocks: [], mv: 0 };
    if (!first && hops > 6 && Math.random() < 0.25 + lv * 0.35) { // 소행성 띠
      var n = A.irand(2, 3 + Math.floor(lv * 3)), rr = r + 74;
      for (var k = 0; k < n; k++) p.rocks.push({ a: k / n * Math.PI * 2, d: rr });
      p.rockSpin = (Math.random() < 0.5 ? -1 : 1) * A.rand(0.8, 1.5);
    }
    if (!first && hops > 12 && Math.random() < 0.3 * lv + 0.1) p.mv = A.rand(40, 90) * (Math.random() < 0.5 ? -1 : 1); // 좌우로 움직이는 행성
    p.spr = planetSprite(p.c, Math.round(r));
    planets.push(p);
    if (!first && Math.random() < 0.7) stars.push({ x: A.rand(60, W - 60), y: y + A.rand(80, 160), got: false });
  }
  function reset() {
    planets = []; stars = []; trail = []; hops = 0; starN = 0; score = 0; dyingT = 0; flyT = 0; cam = 0; camT = 0; maxCam = 0; skipN = 0;
    addPlanet(700, true); nextY = 700;
    for (var i = 0; i < 5; i++) { nextY -= A.rand(230, 300); addPlanet(nextY); }
    var p = planets[0];
    ship = { p: p, a: -Math.PI / 2, x: 0, y: 0, vx: 0, vy: 0, fly: false };
    placeShip(); fx.clear(); hud();
  }
  function orbitR(p) { return p.r + 28; }
  function placeShip() { var p = ship.p, R = orbitR(p); ship.x = p.x + Math.cos(ship.a) * R; ship.y = p.y + Math.sin(ship.a) * R; }
  // 지금 발사하면 어느 행성에 붙잡힐지 미리 계산 (직선 비행)
  function aimTarget() {
    if (!ship || ship.fly) return null;
    var p = ship.p, dir = Math.sign(p.spin), tx = -Math.sin(ship.a) * dir, ty = Math.cos(ship.a) * dir;
    var spd = 620 + Math.min(260, hops * 6), best = null, bestT = 1e9;
    for (var i = 0; i < planets.length; i++) {
      var q = planets[i]; if (q === p) continue;
      var dx = q.x - ship.x, dy = q.y - ship.y, pr = dx * tx + dy * ty; if (pr <= 0) continue;
      var R = orbitR(q) + 6, d2 = dx * dx + dy * dy - pr * pr; if (d2 > R * R) continue;
      var tt = pr - Math.sqrt(R * R - d2); if (tt < 0 || tt > spd * 2.4 || tt >= bestT) continue;
      var ex = ship.x + tx * tt, ey = ship.y + ty * tt;
      if (ex < -40 || ex > W + 40 || ey + cam < -120 || ey + cam > H + 60) continue;
      bestT = tt; best = { q: q, t: tt, up: q.y < p.y - 10 };
    }
    return best;
  }
  function launch() {
    if (S.state !== 'playing' || dyingT > 0 || ship.fly) return;
    var p = ship.p, dir = Math.sign(p.spin), spd = 620 + Math.min(260, hops * 6);
    // 접선 방향
    ship.vx = -Math.sin(ship.a) * dir * spd; ship.vy = Math.cos(ship.a) * dir * spd;
    ship.fly = true; ship.from = p; flyT = 0; A.sfx('whoosh', 1.1, A.clamp(ship.x / W * 2 - 1, -1, 1)); fx.burst(ship.x, ship.y, p.c, 10, 200, 0.3, 2.5);
  }
  function die() {
    if (dyingT > 0) return;
    dyingT = 1.2; fx.burst(ship.x, ship.y, '#ff7a45', 40, 420, 0.8, 4); fx.burst(ship.x, ship.y, '#fff', 14, 300, 0.4, 2.4);
    fx.shake(10, 0.4); fx.flashIt('#ff2244', 0.4); A.sfx('bigboom', 1, A.clamp(ship.x / W * 2 - 1, -1, 1)); A.vibrate(160);
  }
  function update(dt) {
    fx.update(dt);
    // 현재 행성을 화면 아래쪽(y=700)에. 아래 행성에 다시 붙잡혀도 화면 밖으로 사라지지 않게 카메라도 따라 내려감
    camT = 700 - (ship.fly ? ship.from.y : ship.p.y);
    cam = A.lerp(cam, camT, Math.min(1, dt * 3)); maxCam = Math.max(maxCam, cam);
    planets.forEach(function (p) {
      if (p.mv) { p.x += p.mv * dt; if (p.x < p.r + 30 || p.x > W - p.r - 30) p.mv *= -1; }
      p.rocks.forEach(function (r) { r.a += p.rockSpin * dt; });
    });
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['행성', String(hops)], ['별', String(starN)], ['건너뛰기', String(skipN)]]); return; }
    if (!ship.fly) {
      ship.a += ship.p.spin * dt * (1 + Math.min(0.8, hops * 0.02)); placeShip();
    } else {
      flyT += dt; ship.x += ship.vx * dt; ship.y += ship.vy * dt;
      trail.push({ x: ship.x, y: ship.y }); if (trail.length > 14) trail.shift();
      for (var i = 0; i < planets.length; i++) {
        var p = planets[i]; if (p === ship.from) continue;
        var d = Math.hypot(ship.x - p.x, ship.y - p.y);
        if (d < orbitR(p) + 6) { // 포획
          var a = Math.atan2(ship.y - p.y, ship.x - p.x);
          var cross = (ship.x - p.x) * ship.vy - (ship.y - p.y) * ship.vx;
          p.spin = Math.abs(p.spin) * (cross > 0 ? 1 : -1);
          ship.p = p; ship.a = a; ship.fly = false; trail = [];
          if (p.y < ship.from.y - 10) {
            // 사이에 있던 행성을 건너뛰고 더 먼 행성에 붙으면 보너스
            var skipped = 0; for (var q2 = 0; q2 < planets.length; q2++) { var pq = planets[q2]; if (pq !== p && pq !== ship.from && pq.y < ship.from.y - 10 && pq.y > p.y + 10) skipped++; }
            var oldHops = hops; hops += 1 + skipped; skipN += skipped;
            var bonus = Math.max(0, Math.round((1.2 - flyT) * 50)) + skipped * 150;
            score += 100 + bonus; fx.text(p.x, p.y - p.r - 40, '+' + (100 + bonus), '#fff', 20);
            if (skipped) { fx.text(p.x, p.y - p.r - 66, skipped > 1 ? skipped + '개 건너뛰기!' : '건너뛰기!', '#ffd166', 20); A.sfx('gold'); }
            if (Math.floor(hops / 10) > Math.floor(oldHops / 10)) { S.banner(Math.floor(hops / 10) * 10 + ' 행성', '더 깊은 우주로'); A.sfx('level'); }
          }
          A.sfx('combo', 1 + Math.min(hops, 12) * 0.05, A.clamp(p.x / W * 2 - 1, -1, 1)); A.sfx('land', 1.3, A.clamp(p.x / W * 2 - 1, -1, 1)); fx.ring(p.x, p.y, p.c, p.r * 2.4, 0.5); A.vibrate(15);
          // 행성 보충
          while (nextY > p.y - 1400) { nextY -= A.rand(230, 300 + Math.min(80, hops * 2)); addPlanet(nextY); }
          planets = planets.filter(function (q) { return q.y < p.y + 900; });
          stars = stars.filter(function (s) { return s.y < p.y + 900; });
          break;
        }
      }
      if (ship.x < -40 || ship.x > W + 40 || ship.y + cam > H + 60 || ship.y + cam < -120 || flyT > 2.4) die();
    }
    // 소행성 충돌
    planets.forEach(function (p) {
      p.rocks.forEach(function (r) {
        var rx = p.x + Math.cos(r.a) * r.d, ry = p.y + Math.sin(r.a) * r.d;
        if (Math.hypot(rx - ship.x, ry - ship.y) < 22) die();
      });
    });
    stars.forEach(function (s) {
      if (!s.got && Math.hypot(s.x - ship.x, s.y - ship.y) < 34) { s.got = true; starN++; score += 50; fx.burst(s.x, s.y, '#ffd166', 14, 220, 0.5, 3); fx.text(s.x, s.y - 20, '+50', '#ffd166', 18); A.sfx('coin', 1 + (starN % 8) * 0.04, A.clamp(s.x / W * 2 - 1, -1, 1)); }
    });
    hud();
  }
  function render(c) {
    if (G3.draw(c, fx)) return;
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04030c'); g.addColorStop(1, '#12081f'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    for (var i = 0; i < bgStars.length; i++) { var s = bgStars[i], yy = ((s.y + cam * (0.1 + s.z * 0.3)) % H + H) % H; c.globalAlpha = 0.3 + s.z * 0.7; c.fillStyle = '#fff'; c.fillRect(s.x, yy, 1 + s.z * 1.4, 1 + s.z * 1.4); }
    c.globalAlpha = 1;
    c.save(); c.translate(0, cam);
    if (!ship) { // 시작 화면 장식
      A.draw(c, planetSprite('#ff7a45', 46), W / 2, 700); A.draw(c, planetSprite('#5ee7ff', 40), 150, 430); A.draw(c, planetSprite('#b48cff', 44), 400, 170);
      var a0 = t * 2; c.fillStyle = '#fff'; c.beginPath(); c.arc(W / 2 + Math.cos(a0) * 74, 700 + Math.sin(a0) * 74, 8, 0, 7); c.fill();
    } else {
      planets.forEach(function (p) {
        c.strokeStyle = A.hexA(p.c, 0.25); c.setLineDash([4, 8]); c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, orbitR(p), 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
        A.draw(c, p.spr, p.x, p.y);
        p.rocks.forEach(function (r) {
          var rx = p.x + Math.cos(r.a) * r.d, ry = p.y + Math.sin(r.a) * r.d;
          c.fillStyle = '#6b5a7a'; c.beginPath(); c.arc(rx, ry, 14, 0, 7); c.fill(); c.strokeStyle = '#ff4d6d'; c.lineWidth = 2; c.stroke();
        });
      });
      c.save(); c.globalCompositeOperation = 'lighter';
      stars.forEach(function (s) { if (!s.got) A.draw(c, A.glowDot('#ffd166', 7), s.x, s.y + Math.sin(t * 4 + s.x) * 4, 1.1); });
      for (i = 0; i < trail.length; i++) { c.globalAlpha = i / trail.length * 0.6; A.draw(c, A.glowDot('#ff7a45', 5), trail[i].x, trail[i].y, 0.6 + i / trail.length * 0.5); }
      c.restore();
      if (dyingT <= 0) {
        // 조준선: 지금 발사하면 날아갈 방향
        if (!ship.fly && S.state === 'playing') {
          var dir = Math.sign(ship.p.spin), tx = -Math.sin(ship.a) * dir, ty = Math.cos(ship.a) * dir, at = aimTarget();
          // 다음 행성에 닿는 방향이면 조준선이 노랗게 길어짐 = 지금 탭!
          var good = at && at.up, len = good ? at.t : 160;
          c.strokeStyle = good ? 'rgba(255,209,102,.9)' : 'rgba(255,255,255,.35)'; c.setLineDash([3, 9]); c.lineWidth = good ? 3 : 2; c.beginPath(); c.moveTo(ship.x, ship.y); c.lineTo(ship.x + tx * len, ship.y + ty * len); c.stroke(); c.setLineDash([]);
          if (good) { c.strokeStyle = 'rgba(255,209,102,.55)'; c.lineWidth = 2; c.beginPath(); c.arc(at.q.x, at.q.y, orbitR(at.q) + 6, 0, Math.PI * 2); c.stroke(); }
        }
        var ang = ship.fly ? Math.atan2(ship.vy, ship.vx) : ship.a + Math.PI / 2 * Math.sign(ship.p.spin);
        A.draw(c, SHIP, ship.x, ship.y, 1, ang);
      }
    }
    fx.draw(c);
    c.restore(); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() {
    document.getElementById('hA').textContent = A.fmt(score);
    document.getElementById('hB').textContent = hops;
    document.getElementById('hC').textContent = starN;
  }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state === 'playing') { e.preventDefault(); launch(); } });
  var S = new A.Shell({
    id: 'orbit', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') && !e.repeat) launch(); }
  });
})();
