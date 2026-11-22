(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, R = 13, G = 900;
  var fx = new A.FX();
  // 3D 그래픽(assets/arcade/3d/pinball.js). 못 쓰는 기기에서는 아래 2D 그림 그대로
  var G3 = { draw: function () { return false; } };
  A.load3D = A.load3D || function (id, get, done) { var s = document.createElement('script'); s.src = '../assets/arcade/g3d.js?v=1'; s.onload = function () { done(A.G3D.boot(id, get)); }; document.head.appendChild(s); };
  A.load3D('pinball', function () { return { ball: ball, balls: balls, lit: lit, FL: FL, B: BUMPERS, saveT: saveT }; }, function (h) { G3 = h; });
  // 첫 판 안내: 처음 한 번만 판 위에 띄우고, 올바른 행동을 하면 사라짐 (저장 키 neowa_pinball_tut)
  var tutOn = A.get('neowa_pinball_tut', '') !== '1';
  function tutDone() { if (tutOn) { tutOn = false; A.set('neowa_pinball_tut', '1'); } }
  function tutDraw(c, y, touchTxt, keyTxt, tx, ty) {
    if (!tutOn || S.state !== 'playing') return;
    var txt = document.body.classList.contains('touch') ? touchTxt : keyTxt, fs = 22, b = Math.abs(Math.sin(S.time * 4)) * 12;
    c.save(); c.font = '700 ' + fs + 'px "Pretendard Variable",system-ui';
    var w = c.measureText(txt).width + 48; if (w > W - 24) { fs = Math.floor(fs * (W - 72) / (w - 48)); c.font = '700 ' + fs + 'px "Pretendard Variable",system-ui'; w = W - 24; }
    c.fillStyle = 'rgba(0,0,0,.66)'; A.rr(c, W / 2 - w / 2, y - 25, w, 50, 25); c.fill(); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, W / 2, y + 1);
    if (tx != null) { // 가리키는 곳을 향해 통통 튀는 화살표
      var a = Math.atan2(ty - y, tx - W / 2), d = Math.hypot(tx - W / 2, ty - y), r = Math.max(0, d - 40 - b), ax = W / 2 + Math.cos(a) * r, ay = y + Math.sin(a) * r;
      c.translate(ax, ay); c.rotate(a); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(16, 0); c.lineTo(-10, -13); c.lineTo(-4, 0); c.lineTo(-10, 13); c.closePath(); c.fill();
    }
    c.restore();
  }
  // 종료 화면용: 개인 최고 기록과 비교
  function vsBest(sc) { sc = Math.floor(sc); return !S.best ? '첫 기록' : sc > S.best ? '+' + A.fmt(sc - S.best) + ' 신기록' : sc === S.best ? '타이' : '-' + A.fmt(S.best - sc); }
  var ball, balls, score, mult, lit, flip, dyingT, launchT, stuck, nextExtra, keysL = false, keysR = false, touchL = false, touchR = false, saveT;
  // 벽 선분 [x1,y1,x2,y2]
  var WALLS = [[30, 960, 30, 230], [30, 230, 120, 110], [120, 110, 420, 110], [420, 110, 510, 230], [510, 230, 510, 960],
    [30, 760, 150, 850], [510, 760, 390, 850], [70, 640, 70, 740], [470, 640, 470, 740], [70, 740, 140, 790], [470, 740, 400, 790]];
  var BUMPERS = [{ x: 190, y: 300, r: 34 }, { x: 350, y: 300, r: 34 }, { x: 270, y: 420, r: 30 }, { x: 140, y: 500, r: 24 }, { x: 400, y: 500, r: 24 }];
  var TARGETS = [{ x: 170, y: 170 }, { x: 270, y: 155 }, { x: 370, y: 170 }];
  var FL = { L: { x: 150, y: 850, len: 95, rest: 0.45, up: -0.5, a: 0.45, prev: 0.45 }, R: { x: 390, y: 850, len: 95, rest: Math.PI - 0.45, up: Math.PI + 0.5, a: Math.PI - 0.45, prev: Math.PI - 0.45 } };
  function newBall() { ball = { x: A.rand(200, 340), y: 150, vx: A.rand(-120, 120), vy: 0 }; saveT = 4; stuck = { x: ball.x, y: ball.y, t: 0 }; A.sfx('go'); }
  function reset() { balls = 3; score = 0; nextExtra = 15000; mult = 1; lit = [false, false, false]; dyingT = 0; FL.L.a = FL.L.rest; FL.R.a = FL.R.rest; newBall(); fx.clear(); hud(); }
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
    // 아주 짧은 탭도 플리퍼가 최소 0.1초는 올라가게
    if (holdL > 0) holdL -= dt; if (holdR > 0) holdR -= dt;
    var lUp = keysL || touchL || holdL > 0, rUp = keysR || touchR || holdR > 0; if (lUp || rUp) tutDone();
    ['L', 'R'].forEach(function (k) { var f = FL[k], up = k === 'L' ? lUp : rUp, target = up ? f.up : f.rest; if (up && !f.on) A.sfx('tap', k === 'L' ? 0.9 : 1.1, k === 'L' ? -0.6 : 0.6); f.on = up; f.prev = f.a; var sp = 22 * dt; f.a += A.clamp(target - f.a, -sp, sp); });
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['최고 배율', '×' + bestMult], ['타깃 완성', tgtN + '번'], ['최고 대비', vsBest(score)]]); return; }
    if (!ball) { launchT -= dt; if (launchT <= 0) newBall(); return; }
    if (saveT > 0) saveT -= dt;
    var steps = 8, h = dt / steps;
    for (var s = 0; s < steps; s++) {
      ball.vy += G * h; ball.x += ball.vx * h; ball.y += ball.vy * h;
      WALLS.forEach(function (w) { collideSeg(w[0], w[1], w[2], w[3], 0.5); });
      if (saveT > 0 && collideSeg(150, 900, 390, 900, 0.6)) A.sfx('steel', 0.9);
      BUMPERS.forEach(function (b) { var dx = ball.x - b.x, dy = ball.y - b.y, d = Math.hypot(dx, dy); if (d < b.r + R) { var nx = dx / d, ny = dy / d; ball.x = b.x + nx * (b.r + R); ball.y = b.y + ny * (b.r + R); bounce(nx, ny, 0.9); ball.vx += nx * 260; ball.vy += ny * 260; b.hit = 0.15; score += 100 * mult; A.sfx('pop', 1 + (36 - b.r) * 0.03, A.clamp(b.x / W * 2 - 1, -1, 1)); fx.burst(ball.x, ball.y, '#ff5ec4', 8, 200, 0.3, 2.5); A.vibrate(10); } });
      TARGETS.forEach(function (tg, i) { if (!lit[i] && Math.hypot(ball.x - tg.x, ball.y - tg.y) < R + 16) { lit[i] = true; score += 250 * mult; A.sfx('coin', 1 + i * 0.2, A.clamp(tg.x / W * 2 - 1, -1, 1)); fx.text(tg.x, tg.y + 30, '+' + 250 * mult, '#ffd166', 18);
        if (lit.every(Boolean)) { tgtN++; mult++; bestMult = Math.max(bestMult, mult); lit = [false, false, false]; S.banner('×' + mult, '배율 UP'); A.sfx('level'); } } });
      ['L', 'R'].forEach(function (k) {
        // 플리퍼 각도도 서브스텝마다 조금씩 움직여 판정 (한 번에 휙 돌아 공을 통과하던 문제 방지)
        var f = FL[k], fa = f.prev + (f.a - f.prev) * (s + 1) / steps, ex = f.x + Math.cos(fa) * f.len, ey = f.y + Math.sin(fa) * f.len;
        var q = seg(ball.x, ball.y, f.x, f.y, ex, ey), dx = ball.x - q.x, dy = ball.y - q.y, d = Math.hypot(dx, dy);
        if (d < R + 8 && d > 0.001) {
          var nx = dx / d, ny = dy / d, w = (f.a - f.prev) / dt, r = q.t * f.len, svx = -Math.sin(fa) * w * r, svy = Math.cos(fa) * w * r;
          ball.x = q.x + nx * (R + 8); ball.y = q.y + ny * (R + 8); bounce(nx, ny, 0.4, svx, svy);
          if (Math.abs(w) > 1) A.sfx('puck', 1.1, A.clamp(ball.x / W * 2 - 1, -1, 1));
        }
      });
      var sp = Math.hypot(ball.vx, ball.vy); if (sp > 2200) { ball.vx *= 2200 / sp; ball.vy *= 2200 / sp; }
    }
    // 공이 한곳에 4초 넘게 머물면(끼임) 살짝 튕겨 줌
    stuck.t += dt; if (Math.hypot(ball.x - stuck.x, ball.y - stuck.y) > 40) { stuck.x = ball.x; stuck.y = ball.y; stuck.t = 0; }
    else if (stuck.t > 4 && !(lUp || rUp)) { stuck.t = 0; ball.vy = -700; ball.vx = A.rand(-250, 250); fx.text(ball.x, ball.y - 30, '툭!', '#5ee7ff', 18); A.sfx('bounce'); }
    if (score >= nextExtra) { balls++; nextExtra *= 2.5; S.banner('보너스 공 +1', 'EXTRA BALL'); A.sfx('gold'); hud(); }
    if (ball.y > H + 30) {
      balls--; ball = null; fx.shake(6, 0.3); A.sfx('hurt'); hud();
      if (balls <= 0) dyingT = 1; else { launchT = 1.2; mult = 1; S.banner('남은 공 ' + balls, 'BALL LOST'); if (balls === 1) A.sfx('warn'); }
    }
    BUMPERS.forEach(function (b) { if (b.hit > 0) b.hit -= dt; });
    hud();
  }
  var bestMult = 1, tgtN = 0, holdL = 0, holdR = 0;
  function render(c) {
    if (G3.draw(c, fx)) return;
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
    if (ball && tutOn) tutDraw(c, 640, '화면 왼쪽·오른쪽을 누르면 플리퍼', '←·Z 왼쪽  →·/ 오른쪽 플리퍼', 200, 840);
  }
  var last = '';
  function hud() { var k = score + '|' + balls + '|' + mult; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = balls; document.getElementById('hC').textContent = '×' + mult; }
  var stage = document.getElementById('stage'), ptrs = {};
  function refresh() { touchL = false; touchR = false; for (var k in ptrs) { if (ptrs[k] < W / 2) touchL = true; else touchR = true; } }
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; e.preventDefault(); ptrs[e.pointerId] = S.toLocal(e).x; if (ptrs[e.pointerId] < W / 2) holdL = 0.1; else holdR = 0.1; refresh(); });
  function up(e) { delete ptrs[e.pointerId]; refresh(); } stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up); stage.addEventListener('pointerleave', up);
  var S = new A.Shell({ id: 'pinball', W: W, H: H, reset: function () { bestMult = 1; tgtN = 0; reset(); }, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if (k === 'ArrowLeft' || k === 'z' || k === 'Z' || k === 'a' || k === 'Shift') keysL = true; if (k === 'ArrowRight' || k === '/' || k === 'l' || k === 'd') keysR = true; if (k === ' ') { keysL = keysR = true; } },
    keyup: function (e) { var k = e.key; if (k === 'ArrowLeft' || k === 'z' || k === 'Z' || k === 'a' || k === 'Shift') keysL = false; if (k === 'ArrowRight' || k === '/' || k === 'l' || k === 'd') keysR = false; if (k === ' ') { keysL = keysR = false; } } });
})();
