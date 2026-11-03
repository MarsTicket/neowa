(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var planets = [], ship, cam = 0, camT = 0, score = 0, hops = 0, starN = 0, dyingT = 0, flyT = 0, nextY, stars = [], trail = [], bgStars = [];
  var PAL = ['#ff7a45', '#5ee7ff', '#b48cff', '#7dff9b', '#ffd166', '#ff7aa8'];
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
    planets = []; stars = []; trail = []; hops = 0; starN = 0; score = 0; dyingT = 0; flyT = 0; cam = 0; camT = 0;
    addPlanet(700, true); nextY = 700;
    for (var i = 0; i < 5; i++) { nextY -= A.rand(230, 300); addPlanet(nextY); }
    var p = planets[0];
    ship = { p: p, a: -Math.PI / 2, x: 0, y: 0, vx: 0, vy: 0, fly: false };
    placeShip(); fx.clear(); hud();
  }
  function orbitR(p) { return p.r + 28; }
  function placeShip() { var p = ship.p, R = orbitR(p); ship.x = p.x + Math.cos(ship.a) * R; ship.y = p.y + Math.sin(ship.a) * R; }
  function launch() {
    if (S.state !== 'playing' || dyingT > 0 || ship.fly) return;
    var p = ship.p, dir = Math.sign(p.spin), spd = 620 + Math.min(260, hops * 6);
    // 접선 방향
    ship.vx = -Math.sin(ship.a) * dir * spd; ship.vy = Math.cos(ship.a) * dir * spd;
    ship.fly = true; ship.from = p; flyT = 0; A.sfx('shoot', 0.6); fx.burst(ship.x, ship.y, p.c, 10, 200, 0.3, 2.5);
  }
  function die() {
    if (dyingT > 0) return;
    dyingT = 1.2; fx.burst(ship.x, ship.y, '#ff7a45', 40, 420, 0.8, 4); fx.burst(ship.x, ship.y, '#fff', 14, 300, 0.4, 2.4);
    fx.shake(10, 0.4); fx.flashIt('#ff2244', 0.4); A.sfx('bigboom'); A.vibrate(160);
  }
  function update(dt) {
    fx.update(dt);
    camT = Math.max(camT, 700 - (ship.fly ? ship.from.y : ship.p.y)); // 현재 행성을 화면 아래쪽(y=700)에
    cam = A.lerp(cam, camT, Math.min(1, dt * 3));
    planets.forEach(function (p) {
      if (p.mv) { p.x += p.mv * dt; if (p.x < p.r + 30 || p.x > W - p.r - 30) p.mv *= -1; }
      p.rocks.forEach(function (r) { r.a += p.rockSpin * dt; });
    });
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['행성', String(hops)], ['별', String(starN)], ['최고 높이', Math.floor(cam / 10) + 'km']]); return; }
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
            hops++; var bonus = Math.max(0, Math.round((1.2 - flyT) * 50));
            score += 100 + bonus; fx.text(p.x, p.y - p.r - 40, '+' + (100 + bonus), '#fff', 20);
            if (hops % 10 === 0) { S.banner(hops + ' 행성', '더 깊은 우주로'); A.sfx('level'); }
          }
          A.sfx('power'); fx.ring(p.x, p.y, p.c, p.r * 2.4, 0.5); A.vibrate(15);
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
      if (!s.got && Math.hypot(s.x - ship.x, s.y - ship.y) < 34) { s.got = true; starN++; score += 50; fx.burst(s.x, s.y, '#ffd166', 14, 220, 0.5, 3); fx.text(s.x, s.y - 20, '+50', '#ffd166', 18); A.sfx('coin'); }
    });
    hud();
  }
  function render(c) {
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
          var dir = Math.sign(ship.p.spin), tx = -Math.sin(ship.a) * dir, ty = Math.cos(ship.a) * dir;
          c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([3, 9]); c.lineWidth = 2; c.beginPath(); c.moveTo(ship.x, ship.y); c.lineTo(ship.x + tx * 160, ship.y + ty * 160); c.stroke(); c.setLineDash([]);
        }
        var ang = ship.fly ? Math.atan2(ship.vy, ship.vx) : ship.a + Math.PI / 2 * Math.sign(ship.p.spin);
        c.save(); c.translate(ship.x, ship.y); c.rotate(ang);
        c.shadowColor = '#ffb08a'; c.shadowBlur = 14; c.fillStyle = '#fff';
        c.beginPath(); c.moveTo(14, 0); c.lineTo(-10, -9); c.lineTo(-5, 0); c.lineTo(-10, 9); c.closePath(); c.fill(); c.restore();
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
