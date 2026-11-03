(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, R = 13, G = 900;
  var fx = new A.FX();
  var ball, balls, score, mult, lit, flip, dyingT, launchT, keysL = false, keysR = false, touchL = false, touchR = false, saveT;
  // 벽 선분 [x1,y1,x2,y2]
  var WALLS = [[30, 960, 30, 230], [30, 230, 120, 110], [120, 110, 420, 110], [420, 110, 510, 230], [510, 230, 510, 960],
    [30, 760, 150, 850], [510, 760, 390, 850], [70, 640, 70, 740], [470, 640, 470, 740], [70, 740, 140, 790], [470, 740, 400, 790]];
  var BUMPERS = [{ x: 190, y: 300, r: 34 }, { x: 350, y: 300, r: 34 }, { x: 270, y: 420, r: 30 }, { x: 140, y: 500, r: 24 }, { x: 400, y: 500, r: 24 }];
  var TARGETS = [{ x: 170, y: 170 }, { x: 270, y: 155 }, { x: 370, y: 170 }];
  var FL = { L: { x: 150, y: 850, len: 95, rest: 0.45, up: -0.5, a: 0.45, prev: 0.45 }, R: { x: 390, y: 850, len: 95, rest: Math.PI - 0.45, up: Math.PI + 0.5, a: Math.PI - 0.45, prev: Math.PI - 0.45 } };
  function newBall() { ball = { x: A.rand(200, 340), y: 150, vx: A.rand(-120, 120), vy: 0 }; saveT = 4; A.sfx('start'); }
  function reset() { balls = 3; score = 0; mult = 1; lit = [false, false, false]; dyingT = 0; FL.L.a = FL.L.rest; FL.R.a = FL.R.rest; newBall(); fx.clear(); hud(); }
  function seg(px, py, x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy, t = A.clamp(((px - x1) * dx + (py - y1) * dy) / l, 0, 1); return { x: x1 + dx * t, y: y1 + dy * t, t: t }; }
  function bounce(nx, ny, e, extraVx, extraVy) {
    var vx = ball.vx - (extraVx || 0), vy = ball.vy - (extraVy || 0), dot = vx * nx + vy * ny;
    if (dot < 0) { ball.vx -= (1 + e) * dot * nx; ball.vy -= (1 + e) * dot * ny; }
  }
  function collideSeg(x1, y1, x2, y2, e, vx, vy) {
    var q = seg(ball.x, ball.y, x1, y1, x2, y2), dx = ball.x - q.x, dy = ball.y - q.y, d = Math.hypot(dx, dy);
    if (d < R && d > 0.001) { var nx = dx / d, ny = dy / d; ball.x = q.x + nx * R; ball.y = q.y + ny * R; bounce(nx, ny, e, vx || 0, vy || 0); return q; }
    return null;
  }
  function update(dt) {
    fx.update(dt);
    var lUp = keysL || touchL, rUp = keysR || touchR;
    ['L', 'R'].forEach(function (k) { var f = FL[k], up = k === 'L' ? lUp : rUp, target = up ? f.up : f.rest; f.prev = f.a; var sp = 22 * dt; f.a += A.clamp(target - f.a, -sp, sp); });
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['최고 배율', '×' + bestMult]]); return; }
    if (!ball) { launchT -= dt; if (launchT <= 0) newBall(); return; }
    if (saveT > 0) saveT -= dt;
    var steps = 8, h = dt / steps;
    for (var s = 0; s < steps; s++) {
      ball.vy += G * h; ball.x += ball.vx * h; ball.y += ball.vy * h;
      WALLS.forEach(function (w) { collideSeg(w[0], w[1], w[2], w[3], 0.5); });
      if (saveT > 0) collideSeg(150, 900, 390, 900, 0.6);
      BUMPERS.forEach(function (b) { var dx = ball.x - b.x, dy = ball.y - b.y, d = Math.hypot(dx, dy); if (d < b.r + R) { var nx = dx / d, ny = dy / d; ball.x = b.x + nx * (b.r + R); ball.y = b.y + ny * (b.r + R); bounce(nx, ny, 0.9); ball.vx += nx * 260; ball.vy += ny * 260; b.hit = 0.15; score += 100 * mult; A.sfx('bounce', 1.3); fx.burst(ball.x, ball.y, '#ff5ec4', 8, 200, 0.3, 2.5); A.vibrate(10); } });
      TARGETS.forEach(function (tg, i) { if (!lit[i] && Math.hypot(ball.x - tg.x, ball.y - tg.y) < R + 16) { lit[i] = true; score += 250 * mult; A.sfx('coin'); fx.text(tg.x, tg.y + 30, '+' + 250 * mult, '#ffd166', 18);
        if (lit.every(Boolean)) { mult++; bestMult = Math.max(bestMult, mult); lit = [false, false, false]; S.banner('×' + mult, '배율 UP'); A.sfx('level'); } } });
      ['L', 'R'].forEach(function (k) {
        var f = FL[k], ex = f.x + Math.cos(f.a) * f.len, ey = f.y + Math.sin(f.a) * f.len;
        var q = seg(ball.x, ball.y, f.x, f.y, ex, ey), dx = ball.x - q.x, dy = ball.y - q.y, d = Math.hypot(dx, dy);
        if (d < R + 8 && d > 0.001) {
          var nx = dx / d, ny = dy / d, w = (f.a - f.prev) / dt, r = q.t * f.len, svx = -Math.sin(f.a) * w * r, svy = Math.cos(f.a) * w * r;
          ball.x = q.x + nx * (R + 8); ball.y = q.y + ny * (R + 8); bounce(nx, ny, 0.4, svx, svy);
          if (Math.abs(w) > 1) A.sfx('wall', 1.4);
        }
      });
      var sp = Math.hypot(ball.vx, ball.vy); if (sp > 2200) { ball.vx *= 2200 / sp; ball.vy *= 2200 / sp; }
    }
    if (ball.y > H + 30) {
      balls--; ball = null; fx.shake(6, 0.3); A.sfx('hurt'); hud();
      if (balls <= 0) dyingT = 1; else { launchT = 1.2; mult = 1; S.banner('남은 공 ' + balls, 'BALL LOST'); }
    }
    BUMPERS.forEach(function (b) { if (b.hit > 0) b.hit -= dt; });
    hud();
  }
  var bestMult = 1;
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a0526'); g.addColorStop(1, '#07020c'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    c.save(); c.shadowColor = '#ff5ec4'; c.shadowBlur = 12; c.strokeStyle = '#ff9ee0'; c.lineWidth = 6; c.lineCap = 'round';
    WALLS.forEach(function (w) { c.beginPath(); c.moveTo(w[0], w[1]); c.lineTo(w[2], w[3]); c.stroke(); }); c.restore();
    if (saveT > 0 && ball) { c.strokeStyle = 'rgba(94,231,255,' + (0.4 + Math.sin(t * 12) * 0.3) + ')'; c.lineWidth = 4; c.beginPath(); c.moveTo(150, 900); c.lineTo(390, 900); c.stroke(); }
    BUMPERS.forEach(function (b) { c.save(); c.shadowColor = '#ff5ec4'; c.shadowBlur = b.hit > 0 ? 40 : 16; c.fillStyle = b.hit > 0 ? '#fff' : '#ff5ec4'; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill(); c.restore(); c.fillStyle = '#2a0420'; c.beginPath(); c.arc(b.x, b.y, b.r * 0.5, 0, 7); c.fill(); });
    TARGETS.forEach(function (tg, i) { c.fillStyle = lit && lit[i] ? '#ffd166' : 'rgba(255,209,102,.25)'; A.rr(c, tg.x - 18, tg.y - 8, 36, 16, 6); c.fill(); });
    ['L', 'R'].forEach(function (k) { var f = FL[k]; c.save(); c.shadowColor = '#5ee7ff'; c.shadowBlur = 14; c.strokeStyle = '#5ee7ff'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x + Math.cos(f.a) * f.len, f.y + Math.sin(f.a) * f.len); c.stroke(); c.restore(); });
    var bl = ball || (!balls ? { x: 270 + Math.sin(t) * 120, y: 600 } : null);
    if (bl) { c.save(); c.shadowColor = '#fff'; c.shadowBlur = 16; var gr = c.createRadialGradient(bl.x - 4, bl.y - 4, 2, bl.x, bl.y, R); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#9aa'); c.fillStyle = gr; c.beginPath(); c.arc(bl.x, bl.y, R, 0, 7); c.fill(); c.restore(); }
    if (S.state === 'playing' && document.body.classList.contains('touch')) { c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(0, 880, W / 2 - 2, 80); c.fillRect(W / 2 + 2, 880, W / 2, 80); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + balls + '|' + mult; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = balls; document.getElementById('hC').textContent = '×' + mult; }
  var stage = document.getElementById('stage'), ptrs = {};
  function refresh() { touchL = false; touchR = false; for (var k in ptrs) { if (ptrs[k] < W / 2) touchL = true; else touchR = true; } }
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; e.preventDefault(); ptrs[e.pointerId] = S.toLocal(e).x; refresh(); });
  function up(e) { delete ptrs[e.pointerId]; refresh(); } stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up); stage.addEventListener('pointerleave', up);
  var S = new A.Shell({ id: 'pinball', W: W, H: H, reset: function () { bestMult = 1; reset(); }, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if (k === 'ArrowLeft' || k === 'z' || k === 'Z' || k === 'a' || k === 'Shift') keysL = true; if (k === 'ArrowRight' || k === '/' || k === 'l' || k === 'd') keysR = true; if (k === ' ') { keysL = keysR = true; } },
    keyup: function (e) { var k = e.key; if (k === 'ArrowLeft' || k === 'z' || k === 'Z' || k === 'a' || k === 'Shift') keysL = false; if (k === 'ArrowRight' || k === '/' || k === 'l' || k === 'd') keysR = false; if (k === ' ') { keysL = keysR = false; } } });
})();
