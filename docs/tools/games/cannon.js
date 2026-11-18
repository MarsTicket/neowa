(function () {
  'use strict';
  // 대포 블록 부수기: 조준해서 공 여러 개를 연속 발사. 블록 숫자 = 맞혀야 할 횟수. 턴마다 블록이 한 줄씩 내려옴
  var A = Arcade, W = 540, H = 960, COLS = 7, CS = 72, GX = 18, GY = 108, ROWS = 9, BR = 8, SPEED = 1150;
  var FLOOR = GY + ROWS * CS + 10, LY = FLOOR - BR; // 바닥선, 공이 서는 높이
  var fx = new A.FX();
  var grid, balls, nBalls, turn, score, broken, phase, aim, aimOn, lx, nextX, fireQ, fireT, turnT, fast, dyingT, gained, kbdAng = -Math.PI / 2, kbd = false;

  function cell(c, r) { return r >= 0 && r < ROWS && c >= 0 && c < COLS ? grid[r * COLS + c] : null; }
  function newRow() {
    // 모든 줄을 한 칸 내림 → 맨 위에 새 줄
    for (var r = ROWS - 1; r > 0; r--) for (var c = 0; c < COLS; c++) grid[r * COLS + c] = grid[(r - 1) * COLS + c];
    for (c = 0; c < COLS; c++) grid[c] = null;
    var slots = [0, 1, 2, 3, 4, 5, 6]; for (var i = slots.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = slots[i]; slots[i] = slots[j]; slots[j] = t; }
    var n = A.irand(turn < 4 ? 2 : 3, Math.min(6, 3 + Math.floor(turn / 6)));
    for (i = 0; i < n; i++) { var hp = Math.random() < 0.22 ? turn * 2 : turn; grid[slots[i]] = { hp: hp, max: hp, hit: 0 }; }
    grid[slots[n]] = { item: 'ball' };
    if (Math.random() < 0.2 && n + 1 < COLS) grid[slots[n + 1]] = { item: 'coin' };
  }
  function reset() {
    grid = []; for (var i = 0; i < ROWS * COLS; i++) grid.push(null);
    balls = []; nBalls = 1; turn = 1; score = 0; broken = 0; phase = 'aim'; aimOn = false; lx = W / 2; nextX = null; fireQ = 0; fireT = 0; turnT = 0; fast = 1; dyingT = 0; gained = 0;
    newRow(); fx.clear(); hud();
  }

  // ---------- 조준 ----------
  function clampAng(a) { var m = 0.13; return A.clamp(a, -Math.PI + m, -m); }
  function setAimTo(x, y) { aim = clampAng(Math.atan2(Math.min(y, LY - 10) - LY, x - lx)); }
  function fire() {
    if (phase !== 'aim' || S.state !== 'playing' || dyingT > 0) return;
    if (aim == null) aim = kbdAng;
    phase = 'fire'; fireQ = nBalls; fireT = 0; turnT = 0; nextX = null; aimOn = false; gained = 0; A.sfx('charge', 1.2); A.sfx('shoot', 0.8);
  }
  // 예상선: 첫 충돌까지 + 반사 1번
  function trace(x, y, dx, dy, len) {
    var pts = [[x, y]], left = len, bounced = 0;
    while (left > 0) {
      x += dx * 4; y += dy * 4; left -= 4;
      if (x < GX + BR) { x = GX + BR; dx = -dx; pts.push([x, y]); if (++bounced > 1) break; continue; }
      if (x > GX + CS * COLS - BR) { x = GX + CS * COLS - BR; dx = -dx; pts.push([x, y]); if (++bounced > 1) break; continue; }
      if (y < GY + BR) { y = GY + BR; dy = -dy; pts.push([x, y]); if (++bounced > 1) break; continue; }
      var c = Math.floor((x - GX) / CS), r = Math.floor((y - GY) / CS), b = cell(c, r);
      if (b && !b.item) {
        var cx0 = GX + c * CS, cy0 = GY + r * CS, px = x - dx * 4, py = y - dy * 4;
        if (px < cx0 || px > cx0 + CS) dx = -dx; else dy = -dy;
        x = px; y = py; pts.push([x, y]); if (++bounced > 1) break;
      }
    }
    pts.push([x, y]); return pts;
  }

  // ---------- 공 물리 ----------
  function hitBlock(b, c, r) {
    if (b.item) {
      if (b.item === 'ball') { gained++; fx.text(GX + (c + 0.5) * CS, GY + (r + 0.5) * CS, '+1', '#7dff9b', 22); A.sfx('power', 1 + Math.min(gained, 8) * 0.06); }
      else { score += 50; fx.text(GX + (c + 0.5) * CS, GY + (r + 0.5) * CS, '+50', '#ffd166', 20); A.sfx('coin', 1.2); }
      fx.burst(GX + (c + 0.5) * CS, GY + (r + 0.5) * CS, b.item === 'ball' ? '#7dff9b' : '#ffd166', 12, 200, 0.4, 2.5);
      grid[r * COLS + c] = null; hud(); return false;
    }
    b.hp--; b.hit = 1; A.sfx('brick', 0.8 + Math.min(1, (b.max - b.hp) / Math.max(1, b.max)) * 0.6, A.clamp((GX + (c + 0.5) * CS) / W * 2 - 1, -1, 1));
    if (b.hp <= 0) {
      grid[r * COLS + c] = null; broken++; score += 10;
      var x = GX + (c + 0.5) * CS, y = GY + (r + 0.5) * CS; fx.burst(x, y, colorOf(b), 16, 260, 0.5, 3); fx.shake(2, 0.06); A.sfx('boom', 1.3, A.clamp(x / W * 2 - 1, -1, 1)); A.vibrate(15);
    }
    hud(); return true;
  }
  function step(b, h) {
    b.x += b.vx * h; b.y += b.vy * h;
    if (b.x < GX + BR) { b.x = GX + BR; b.vx = Math.abs(b.vx); }
    if (b.x > GX + CS * COLS - BR) { b.x = GX + CS * COLS - BR; b.vx = -Math.abs(b.vx); }
    if (b.y < GY + BR) { b.y = GY + BR; b.vy = Math.abs(b.vy); }
    // 블록: 공이 있는 칸 주변 3x3만 확인 (원-사각 충돌)
    var c0 = Math.floor((b.x - GX) / CS), r0 = Math.floor((b.y - GY) / CS);
    for (var r = r0 - 1; r <= r0 + 1; r++) for (var c = c0 - 1; c <= c0 + 1; c++) {
      var k = cell(c, r); if (!k) continue;
      var bx = GX + c * CS + 2, by = GY + r * CS + 2, bw = CS - 4;
      if (k.item) { if (Math.hypot(b.x - (bx + bw / 2), b.y - (by + bw / 2)) < BR + 16) hitBlock(k, c, r); continue; }
      var nx = A.clamp(b.x, bx, bx + bw), ny = A.clamp(b.y, by, by + bw), dx = b.x - nx, dy = b.y - ny, d2 = dx * dx + dy * dy;
      if (d2 < BR * BR) {
        var d = Math.sqrt(d2) || 0.001;
        if (d2 === 0) { dx = -b.vx; dy = -b.vy; d = Math.hypot(dx, dy); }
        var ux = dx / d, uy = dy / d, dot = b.vx * ux + b.vy * uy;
        if (dot < 0) { b.vx -= 2 * dot * ux; b.vy -= 2 * dot * uy; }
        b.x = nx + ux * BR; b.y = ny + uy * BR;
        hitBlock(k, c, r);
      }
    }
    // 수평으로 끝없이 오가지 않게: 세로 속도 최소값
    var sp = Math.hypot(b.vx, b.vy), minVy = sp * 0.12;
    if (Math.abs(b.vy) < minVy) { b.vy = (b.vy < 0 ? -1 : 1) * minVy; var s2 = Math.sqrt(Math.max(0, sp * sp - minVy * minVy)); b.vx = (b.vx < 0 ? -1 : 1) * s2; }
    if (b.y >= LY && b.vy > 0) { b.y = LY; b.done = true; if (nextX == null) nextX = b.x; }
  }
  function update(dt) {
    fx.update(dt);
    for (var i = 0; i < grid.length; i++) if (grid[i] && grid[i].hit > 0) grid[i].hit = Math.max(0, grid[i].hit - dt * 6);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['턴', String(turn)], ['부순 블록', String(broken)], ['공', String(nBalls)]]); return; }
    if (phase === 'aim') return;
    var loops = fast;
    for (var L = 0; L < loops; L++) {
      turnT += dt;
      if (phase === 'fire' && fireQ > 0) {
        fireT -= dt;
        if (fireT <= 0) { balls.push({ x: lx, y: LY, vx: Math.cos(aim) * SPEED, vy: Math.sin(aim) * SPEED, done: false }); fireQ--; fireT = 0.055; A.sfx('shoot', 1.1); }
      }
      var steps = 4, h = dt / steps;
      for (i = 0; i < balls.length; i++) { var b = balls[i]; if (b.done) { if (nextX != null) b.x += A.clamp(nextX - b.x, -900 * dt, 900 * dt); continue; } for (var s = 0; s < steps && !b.done; s++) step(b, h); }
      if (fireQ === 0 && balls.every(function (q) { return q.done && Math.abs(q.x - nextX) < 2; })) { endTurn(); break; }
    }
    if (turnT > 7 && fast < 3) fast = 3; // 너무 오래 걸리면 자동 빨리 감기
  }
  function endTurn() {
    balls = []; lx = A.clamp(nextX == null ? lx : nextX, GX + BR, GX + CS * COLS - BR);
    nBalls += gained; if (gained) S.banner('공 +' + gained, '이제 ' + nBalls + '개');
    score += 5; turn++; fast = 1; phase = 'aim';
    newRow();
    for (var c = 0; c < COLS; c++) { var b = grid[(ROWS - 1) * COLS + c]; if (b && !b.item) { dyingT = 1.2; A.sfx('bigboom'); if (A.music && A.music.mood) A.music.mood(null); fx.shake(12, 0.5); fx.flashIt('#ff2244', 0.5); A.vibrate(200); break; } }
    for (c = 0; c < COLS; c++) { var it = grid[(ROWS - 1) * COLS + c]; if (it && it.item) grid[(ROWS - 1) * COLS + c] = null; }
    if (turn % 10 === 0) { S.banner('TURN ' + turn, '블록이 더 단단해져요'); A.sfx('level'); }
    for (c = 0; c < COLS; c++) { var nb = grid[(ROWS - 2) * COLS + c]; if (nb && !nb.item) { A.sfx('warn'); if (A.music && A.music.mood) A.music.mood('danger'); break; } }
    hud();
  }

  // ---------- 그리기 ----------
  function colorOf(b) { var k = Math.min(1, b.max / Math.max(1, turn * 2)); return 'hsl(' + Math.round(A.lerp(50, 340, k)) + ',95%,62%)'; }
  var BALL = A.glowDot('#ffffff', 7);
  function render(c) {
    var o = fx.offset(), t = S.time;
    if (!grid) reset();
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#14030a'); g.addColorStop(1, '#070106'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    c.fillStyle = 'rgba(255,77,109,.04)'; c.fillRect(GX, GY, CS * COLS, FLOOR - GY);
    c.strokeStyle = 'rgba(255,77,109,.25)'; c.lineWidth = 2; c.strokeRect(GX, GY, CS * COLS, FLOOR - GY);
    // 위험선
    c.strokeStyle = 'rgba(255,77,109,' + (0.35 + 0.25 * Math.sin(t * 4)) + ')'; c.setLineDash([10, 8]); c.beginPath(); c.moveTo(GX, GY + (ROWS - 1) * CS); c.lineTo(GX + CS * COLS, GY + (ROWS - 1) * CS); c.stroke(); c.setLineDash([]);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (var i = 0; i < grid.length; i++) {
      var b = grid[i]; if (!b) continue;
      var cc = i % COLS, r = Math.floor(i / COLS), x = GX + cc * CS, y = GY + r * CS;
      if (b.item === 'ball') { var pr = 15 + Math.sin(t * 6 + i) * 2; c.strokeStyle = '#7dff9b'; c.lineWidth = 3; c.beginPath(); c.arc(x + CS / 2, y + CS / 2, pr, 0, 7); c.stroke(); c.fillStyle = '#7dff9b'; c.font = '700 18px "Chakra Petch",system-ui'; c.fillText('+1', x + CS / 2, y + CS / 2 + 1); continue; }
      if (b.item === 'coin') { c.fillStyle = '#ffd166'; c.beginPath(); c.arc(x + CS / 2, y + CS / 2, 12 + Math.sin(t * 5) * 1.5, 0, 7); c.fill(); c.fillStyle = '#2a1d00'; c.font = '700 14px "Chakra Petch",system-ui'; c.fillText('$', x + CS / 2, y + CS / 2 + 1); continue; }
      var col = colorOf(b), sc = 1 + b.hit * 0.06, s = (CS - 6) * sc, ox = x + CS / 2 - s / 2, oy = y + CS / 2 - s / 2;
      c.fillStyle = col; c.globalAlpha = 0.9; A.rr(c, ox, oy, s, s, 12); c.fill(); c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,255,255,' + (0.18 + b.hit * 0.5) + ')'; A.rr(c, ox + 4, oy + 4, s - 8, s * 0.3, 8); c.fill();
      c.fillStyle = 'rgba(0,0,0,.25)'; A.rr(c, ox, oy + s - 7, s, 7, 4); c.fill();
      c.fillStyle = '#1a0308'; c.font = '700 ' + (b.hp >= 100 ? 22 : 27) + 'px "Chakra Petch",system-ui'; c.fillText(String(b.hp), x + CS / 2, y + CS / 2 + 1);
    }
    // 바닥
    c.fillStyle = 'rgba(255,77,109,.5)'; c.fillRect(GX, FLOOR, CS * COLS, 3);
    // 조준선
    var a = aim != null ? aim : kbdAng;
    if (phase === 'aim' && S.state === 'playing' && (aimOn || kbd)) {
      var pts = trace(lx, LY, Math.cos(a), Math.sin(a), 1400);
      c.save(); c.globalCompositeOperation = 'lighter';
      for (var k = 1; k < pts.length; k++) {
        var p0 = pts[k - 1], p1 = pts[k], L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), n = Math.floor(L / 18);
        for (var d = 0; d <= n; d++) { var tt = d / Math.max(1, n), off = ((t * 60) % 18) / Math.max(1, L); c.fillStyle = k === 1 ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(A.lerp(p0[0], p1[0], Math.min(1, tt + off)), A.lerp(p0[1], p1[1], Math.min(1, tt + off)), k === 1 ? 3 : 2.4, 0, 7); c.fill(); }
      }
      c.restore();
    }
    // 공
    c.save(); c.globalCompositeOperation = 'lighter';
    for (i = 0; i < balls.length; i++) A.draw(c, BALL, balls[i].x, balls[i].y, 1);
    c.restore();
    if (phase === 'aim' || fireQ > 0) { A.draw(c, BALL, lx, LY, 1.1); c.fillStyle = '#ffd9e1'; c.font = '700 16px "Chakra Petch",system-ui'; c.fillText('×' + (phase === 'aim' ? nBalls : fireQ), lx, LY + 26); }
    if (nextX != null && phase === 'fire') { c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.beginPath(); c.arc(nextX, LY, 11, 0, 7); c.stroke(); }
    // 빨리 감기 버튼
    if (phase === 'fire' && S.state === 'playing') {
      c.fillStyle = fast > 1 ? 'rgba(255,77,109,.85)' : 'rgba(255,77,109,.18)'; A.rr(c, W - 150, FLOOR + 30, 130, 52, 16); c.fill();
      c.fillStyle = fast > 1 ? '#2a0410' : '#ffd9e1'; c.font = '700 18px "Pretendard Variable",system-ui'; c.fillText(fast > 1 ? '빠르게 ×' + fast : '▶▶ 빨리', W - 85, FLOOR + 57);
    }
    if (phase === 'aim' && S.state === 'playing' && turn === 1 && !aimOn) {
      c.fillStyle = 'rgba(255,217,225,' + (0.55 + 0.3 * Math.sin(t * 4)) + ')'; c.font = '700 20px "Pretendard Variable",system-ui';
      c.fillText(document.body.classList.contains('touch') ? '화면을 끌어 조준하고 떼면 발사' : '마우스로 조준 · 클릭하면 발사 (←→ Space)', W / 2, GY + CS * 5);
    }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var lastHud = '';
  function hud() {
    var k = score + '|' + nBalls + '|' + turn; if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = nBalls; document.getElementById('hC').textContent = turn;
    document.getElementById('hMult').textContent = '';
  }

  // ---------- 입력 ----------
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; e.preventDefault(); kbd = false; var p = S.toLocal(e);
    if (phase === 'fire') { if (p.x > W - 160 && p.y > FLOOR + 20 && p.y < FLOOR + 92) { fast = fast >= 3 ? 1 : fast + 1; A.sfx('click'); } return; }
    if (phase !== 'aim' || dyingT > 0) return;
    aimOn = true; setAimTo(p.x, p.y);
  });
  stage.addEventListener('pointermove', function (e) { if (S.state !== 'playing' || phase !== 'aim') return; var p = S.toLocal(e); if (aimOn || e.pointerType === 'mouse') { kbd = false; setAimTo(p.x, p.y); if (e.pointerType === 'mouse') aimOn = true; } });
  window.addEventListener('pointerup', function (e) { if (!aimOn || phase !== 'aim' || S.state !== 'playing') return; var p = S.toLocal(e); if (p.y < LY - 10) { setAimTo(p.x, p.y); fire(); } else aimOn = false; });
  window.addEventListener('pointercancel', function () { aimOn = false; });
  var S = new A.Shell({
    id: 'cannon', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'ArrowLeft' || k === 'a') { kbd = true; aimOn = false; aim = kbdAng = clampAng((aim != null ? aim : kbdAng) - 0.035); }
      else if (k === 'ArrowRight' || k === 'd') { kbd = true; aimOn = false; aim = kbdAng = clampAng((aim != null ? aim : kbdAng) + 0.035); }
      else if ((k === ' ' || k === 'Enter' || k === 'ArrowUp') && !e.repeat) { if (phase === 'aim') { kbd = true; fire(); } else { fast = fast >= 3 ? 1 : fast + 1; } }
      else if (k === 'x') { if (phase === 'fire') fast = fast >= 3 ? 1 : fast + 1; }
    }
  });
})();
