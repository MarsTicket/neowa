(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, COLSN = 11, R = 23, RH = R * 1.732, TOP = 110, LOSE = 780, SX = W / 2, SY = 870;
  var COLS = ['#ff4d6d', '#ffd166', '#7dff9b', '#5ee7ff', '#b48cff', '#ff7aa8'];
  var fx = new A.FX();
  var grid, offset, shot, cur, next, aim, shots, score, bestChain, dyingT, drops, keyAim = -Math.PI / 2, ncol, combo = 0;
  // 육각 격자: 행 r, 열 c. (r + offset) 홀수 행은 오른쪽으로 반 칸
  function pos(r, c) { return { x: R + c * R * 2 + ((r + offset) % 2 ? R : 0) + (W - COLSN * R * 2 - R) / 2, y: TOP + R + r * RH }; }
  function cols(r) { return (r + offset) % 2 ? COLSN - 1 : COLSN; }
  function neighbors(r, c) { var odd = (r + offset) % 2, d = odd ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]]; return d.map(function (v) { return [r + v[0], c + v[1]]; }).filter(function (v) { return v[0] >= 0 && v[1] >= 0 && v[1] < cols(v[0]); }); }
  function get(r, c) { return grid[r] && grid[r][c]; }
  function present() { var s = {}; grid.forEach(function (row) { row.forEach(function (b) { if (b != null) s[b] = 1; }); }); return Object.keys(s).map(Number); }
  function pickColor() { var p = present(); return p.length ? A.pick(p) : A.irand(0, ncol - 1); }
  function reset() { offset = 0; ncol = 4; grid = []; for (var r = 0; r < 6; r++) { grid.push([]); for (var c = 0; c < cols(r); c++) grid[r].push(A.irand(0, ncol - 1)); } shot = null; cur = pickColor(); next = pickColor(); shots = 0; score = 0; bestChain = 0; dyingT = 0; combo = 0; drops = []; aim = null; fx.clear(); hud(); }
  function fire(a) {
    if (shot || dyingT > 0 || S.state !== 'playing') return; a = A.clamp(a, -Math.PI + 0.12, -0.12);
    shot = { x: SX, y: SY, vx: Math.cos(a) * 1300, vy: Math.sin(a) * 1300, c: cur }; cur = next; next = pickColor(); A.sfx('shoot', 0.6);
  }
  function snap(x, y, col) {
    var best = null, bd = 1e9;
    for (var r = 0; r <= grid.length; r++) for (var c = 0; c < cols(r); c++) { if (get(r, c) != null) continue; var p = pos(r, c), d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = [r, c]; } }
    while (grid.length <= best[0]) { var row = []; for (var k = 0; k < cols(grid.length); k++) row.push(null); grid.push(row); }
    grid[best[0]][best[1]] = col; return best;
  }
  function land(r, c) {
    var col = grid[r][c], seen = {}, q = [[r, c]], group = []; seen[r + ',' + c] = 1;
    while (q.length) { var p = q.shift(); group.push(p); neighbors(p[0], p[1]).forEach(function (n) { var k = n[0] + ',' + n[1]; if (!seen[k] && get(n[0], n[1]) === col) { seen[k] = 1; q.push(n); } }); }
    var popped = group.length >= 3;
    if (popped) group.forEach(function (p) { var pp = pos(p[0], p[1]); fx.burst(pp.x, pp.y, COLS[grid[p[0]][p[1]]], 8, 220, 0.4, 3); grid[p[0]][p[1]] = null; });
    // 천장과 연결 안 된 버블 떨어뜨리기 (터지지 않았어도 검사: 허공에 붙은 버블 방지)
    var keep = {}; q = []; (grid[0] || []).forEach(function (b, cc) { if (b != null) { keep['0,' + cc] = 1; q.push([0, cc]); } });
    while (q.length) { var p0 = q.shift(); neighbors(p0[0], p0[1]).forEach(function (n) { var k = n[0] + ',' + n[1]; if (!keep[k] && get(n[0], n[1]) != null) { keep[k] = 1; q.push(n); } }); }
    var fell = 0; grid.forEach(function (row, rr) { row.forEach(function (b, cc) { if (b != null && !keep[rr + ',' + cc]) { var pp = pos(rr, cc); drops.push({ x: pp.x, y: pp.y, vy: A.rand(-100, 50), c: b }); row[cc] = null; fell++; } }); });
    if (popped) {
      // 연속으로 터뜨리면 콤보 배율 (최대 ×3)
      combo++; var mul = Math.min(3, 1 + (combo - 1) * 0.5);
      var pts = Math.round((group.length * 10 + fell * 20 * 2) * mul); score += pts; bestChain = Math.max(bestChain, group.length + fell);
      fx.text(pos(r, c).x, pos(r, c).y, (fell ? '떨어뜨리기 ' : '') + '+' + pts + (combo > 1 ? ' (콤보×' + mul + ')' : ''), fell || combo > 1 ? '#ffd166' : '#fff', fell ? 24 : 20); A.sfx('pop', 1 + Math.min(1, group.length / 10) + Math.min(5, combo) * 0.04); if (fell) A.sfx('combo', 1 + Math.min(fell, 12) * 0.05); fx.shake(2 + fell * 0.5, 0.15);
    } else { combo = 0; A.sfx('tap', 0.9); }
    while (grid.length && grid[grid.length - 1].every(function (b) { return b == null; })) grid.pop();
    shots++;
    if (!grid.length) { score += 1000; S.banner('판 비우기!', '+1000'); A.sfx('win'); ncol = Math.min(6, ncol + 1); for (var rr = 0; rr < 5; rr++) addRowTop(); }
    if (shots % 5 === 0) { addRowTop(); A.sfx('drop', 0.8); fx.shake(4, 0.2); }
    if (shots % 25 === 0) ncol = Math.min(6, ncol + 1);
    if (grid.length && pos(grid.length - 1, 0).y + R > LOSE) { dyingT = 1.2; A.sfx('hurt'); fx.flashIt('#ff2244', 0.5); }
    if (present().indexOf(cur) < 0 && grid.length) cur = pickColor(); if (present().indexOf(next) < 0 && grid.length) next = pickColor();
    hud();
  }
  function addRowTop() { offset = (offset + 1) % 2; var row = []; for (var c = 0; c < cols(0); c++) row.push(A.irand(0, ncol - 1)); grid.unshift(row); }
  function update(dt) {
    fx.update(dt);
    drops.forEach(function (d) { d.vy += 1600 * dt; d.y += d.vy * dt; }); drops = drops.filter(function (d) { return d.y < H + 40; });
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['발사', String(shots)], ['최대 한 번에', String(bestChain)]]); return; }
    if (keyL) keyAim -= dt * 1.6; if (keyR) keyAim += dt * 1.6; keyAim = A.clamp(keyAim, -Math.PI + 0.12, -0.12);
    if (shot) {
      for (var s = 0; s < 6; s++) {
        var h = dt / 6; shot.x += shot.vx * h; shot.y += shot.vy * h;
        if (shot.x < R + (W - COLSN * R * 2 - R) / 2) { shot.x = R + (W - COLSN * R * 2 - R) / 2; shot.vx *= -1; A.sfx('bounce', 1.2, -0.6); }
        if (shot.x > W - R - (W - COLSN * R * 2 - R) / 2) { shot.x = W - R - (W - COLSN * R * 2 - R) / 2; shot.vx *= -1; A.sfx('bounce', 1.2, 0.6); }
        var hit = shot.y < TOP + R;
        if (!hit) for (var r = 0; r < grid.length && !hit; r++) for (var c = 0; c < grid[r].length; c++) if (grid[r][c] != null) { var p = pos(r, c); if (Math.hypot(p.x - shot.x, p.y - shot.y) < R * 1.75) { hit = true; break; } }
        if (hit) { var cell = snap(shot.x, shot.y, shot.c); shot = null; land(cell[0], cell[1]); break; }
      }
    }
  }
  var keyL = false, keyR = false;
  /* 그림: 유리 구슬(색마다 다른 무늬 → 색을 구분하기 어려운 분도 알아보기 쉬움), 꿈속 밤하늘 배경, 발사대 */
  var MARK = ['heart', 'star', 'leaf', 'drop', 'moon', 'flower'];
  function ballSpr(col) {
    return A.sprite('bub' + col, 60, 60, function (x) {
      x.translate(30, 30); var r = R - 1, C = COLS[col];
      var gl = x.createRadialGradient(0, 0, r * 0.8, 0, 0, r + 6); gl.addColorStop(0, A.hexA(C, 0.35)); gl.addColorStop(1, A.hexA(C, 0)); x.fillStyle = gl; x.beginPath(); x.arc(0, 0, r + 6, 0, 7); x.fill();
      var g = x.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.28, C); g.addColorStop(1, A.hexA(C, 0.75));
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, 7); x.fill();
      x.fillStyle = 'rgba(0,0,30,.22)'; x.beginPath(); x.arc(0, 0, r, 0.2, Math.PI - 0.2); x.arc(0, -r * 0.2, r * 0.95, Math.PI - 0.3, 0.3, true); x.fill();
      x.fillStyle = 'rgba(255,255,255,.55)'; var m = MARK[col]; x.save(); x.scale(0.55, 0.55);
      x.beginPath();
      if (m === 'heart') { x.moveTo(0, 12); x.bezierCurveTo(-22, -4, -10, -20, 0, -8); x.bezierCurveTo(10, -20, 22, -4, 0, 12); }
      else if (m === 'star') { for (var i = 0; i < 10; i++) { var aa = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 6 : 14; x.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } }
      else if (m === 'leaf') { x.moveTo(-12, 10); x.quadraticCurveTo(-12, -12, 12, -12); x.quadraticCurveTo(12, 10, -12, 10); }
      else if (m === 'drop') { x.moveTo(0, -14); x.quadraticCurveTo(12, 2, 0, 12); x.quadraticCurveTo(-12, 2, 0, -14); }
      else if (m === 'moon') { x.arc(0, 0, 12, 0.6, Math.PI * 2 - 0.6); x.arc(6, 0, 9, Math.PI * 2 - 0.9, 0.9, true); }
      else { for (var k = 0; k < 5; k++) { var a2 = k * Math.PI * 2 / 5; x.moveTo(0, 0); x.arc(Math.cos(a2) * 7, Math.sin(a2) * 7, 6, 0, 7); } }
      x.fill(); x.restore();
      x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.ellipse(-r * 0.38, -r * 0.45, r * 0.25, r * 0.13, -0.6, 0, 7); x.fill();
    });
  }
  function ball(c, x, y, col, s) { var sp = ballSpr(col); c.drawImage(sp, x - 30 * (s || 1), y - 30 * (s || 1), 60 * (s || 1), 60 * (s || 1)); }
  var BG = A.sprite('bubbg', W, H, function (x) {
    var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a1440'); g.addColorStop(0.6, '#1a0c3a'); g.addColorStop(1, '#0a0418'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 140; i++) { x.globalAlpha = Math.random() * 0.8; x.fillStyle = '#fff'; x.fillRect(Math.random() * W, Math.random() * H, 1.3, 1.3); }
    x.globalAlpha = 1;
    [[100, 300, 'rgba(255,122,168,.12)'], [440, 560, 'rgba(94,231,255,.10)']].forEach(function (n) { var r = x.createRadialGradient(n[0], n[1], 0, n[0], n[1], 260); r.addColorStop(0, n[2]); r.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = r; x.fillRect(0, 0, W, H); });
    // 아래 언덕과 발사대 받침
    x.fillStyle = '#140a2a'; x.beginPath(); x.moveTo(0, H); x.lineTo(0, 860); x.quadraticCurveTo(W / 2, 800, W, 860); x.lineTo(W, H); x.fill();
    x.strokeStyle = 'rgba(180,140,255,.4)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 860); x.quadraticCurveTo(W / 2, 800, W, 860); x.stroke();
    var bg2 = x.createLinearGradient(0, 860, 0, 930); bg2.addColorStop(0, '#6a5aa8'); bg2.addColorStop(1, '#2a1a5a'); x.fillStyle = bg2; x.beginPath(); x.moveTo(SX - 46, 930); x.lineTo(SX - 34, 880); x.lineTo(SX + 34, 880); x.lineTo(SX + 46, 930); x.fill();
    x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(SX - 34, 880, 68, 3);
    // 천장 테두리
    var tg = x.createLinearGradient(0, TOP - 30, 0, TOP); tg.addColorStop(0, 'rgba(122,162,255,0)'); tg.addColorStop(1, 'rgba(122,162,255,.2)'); x.fillStyle = tg; x.fillRect(0, TOP - 30, W, 30);
  });
  // 조준선이 버블에 닿는 곳에서 멈추도록 (실제 발사 판정과 같은 거리)
  function aimHits(x, y) { for (var r = grid.length - 1; r >= 0; r--) { var row = grid[r]; for (var c = 0; c < row.length; c++) if (row[c] != null) { var p = pos(r, c); if (Math.abs(p.y - y) < R * 1.75 && Math.hypot(p.x - x, p.y - y) < R * 1.75) return true; } } return false; }
  function curAim() { return aim != null ? aim : keyAim; }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(BG, -10, -10, W + 20, H + 20);
    if (!grid) { ncol = 4; offset = 0; grid = []; for (var r0 = 0; r0 < 6; r0++) { grid.push([]); for (var c0 = 0; c0 < cols(r0); c0++) grid[r0].push((r0 * 3 + c0) % 4); } cur = 0; next = 1; drops = []; }
    c.fillStyle = 'rgba(122,162,255,.08)'; c.fillRect(0, TOP - 4, W, 4);
    var low = grid.length ? pos(grid.length - 1, 0).y + R : 0, danger = S.state === 'playing' && low + RH * 2 > LOSE;
    c.strokeStyle = danger ? 'rgba(255,77,109,' + (0.6 + 0.4 * Math.sin(t * 10)) + ')' : 'rgba(255,77,109,.5)'; c.lineWidth = danger ? 3 : 1; c.setLineDash([8, 8]); c.beginPath(); c.moveTo(0, LOSE); c.lineTo(W, LOSE); c.stroke(); c.setLineDash([]); c.lineWidth = 1;
    if (danger) { c.fillStyle = '#ff4d6d'; c.font = '700 16px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('위험! 바닥선에 닿으면 끝', W / 2, LOSE + 22); }
    grid.forEach(function (row, r) { row.forEach(function (b, cc) { if (b != null) { var p = pos(r, cc); ball(c, p.x, p.y, b); } }); });
    drops.forEach(function (d) { ball(c, d.x, d.y, d.c); });
    // 조준선 (벽 반사 1번)
    if (S.state === 'playing' && !shot) {
      var a = curAim(), x = SX, y = SY, vx = Math.cos(a), vy = Math.sin(a), L = (W - COLSN * R * 2 - R) / 2 + R; c.fillStyle = 'rgba(255,255,255,.5)';
      for (var k = 0; k < 40; k++) { x += vx * 18; y += vy * 18; if (x < L || x > W - L) { vx *= -1; x += vx * 18; } if (y < TOP) break; if (aimHits(x, y)) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); break; } if (k % 2 === 0) { c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); } }
    }
    // 발사대 포신
    var aa = curAim(); c.save(); c.translate(SX, SY); c.rotate(aa + Math.PI / 2); c.fillStyle = '#9a8ad8'; A.rr(c, -10, -56, 20, 40, 6); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-6, -54, 4, 34); c.restore();
    c.strokeStyle = 'rgba(200,180,255,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(SX, SY, R + 6, 0, 7); c.stroke();
    if (shot) ball(c, shot.x, shot.y, shot.c);
    else if (cur != null) ball(c, SX, SY, cur);
    if (next != null) { ball(c, SX + 90, SY + 20, next, 0.7); c.fillStyle = 'rgba(255,255,255,.4)'; c.font = '600 12px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('다음 (탭=교체)', SX + 90, SY + 52); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = shots; document.getElementById('hC').textContent = bestChain; document.getElementById('hMult').textContent = '천장까지 ' + (5 - shots % 5); }
  var stage = document.getElementById('stage');
  function aimAt(p) { return Math.atan2(Math.min(p.y, SY - 20) - SY, p.x - SX); }
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e); if (Math.hypot(p.x - (SX + 90), p.y - (SY + 20)) < 34) { var t = cur; cur = next; next = t; A.sfx('select'); return; } aim = aimAt(p); try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (aim == null) return; aim = aimAt(S.toLocal(e)); });
  stage.addEventListener('pointerup', function () { if (aim != null) { fire(aim); aim = null; } });
  var S = new A.Shell({ id: 'bubbles', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if (k === 'ArrowLeft' || k === 'a') keyL = true; if (k === 'ArrowRight' || k === 'd') keyR = true; if ((k === ' ' || k === 'Enter' || k === 'ArrowUp') && !e.repeat) fire(keyAim); if ((k === 'ArrowDown' || k === 's') && !e.repeat) { var t = cur; cur = next; next = t; A.sfx('select'); } },
    keyup: function (e) { var k = e.key; if (k === 'ArrowLeft' || k === 'a') keyL = false; if (k === 'ArrowRight' || k === 'd') keyR = false; } });
})();
