(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, COLSN = 11, R = 23, RH = R * 1.732, TOP = 110, LOSE = 780, SX = W / 2, SY = 870;
  var COLS = ['#ff4d6d', '#ffd166', '#7dff9b', '#5ee7ff', '#b48cff', '#ff7aa8'];
  var fx = new A.FX();
  var grid, offset, shot, cur, next, aim, shots, score, bestChain, dyingT, drops, keyAim = -Math.PI / 2, ncol;
  // 육각 격자: 행 r, 열 c. (r + offset) 홀수 행은 오른쪽으로 반 칸
  function pos(r, c) { return { x: R + c * R * 2 + ((r + offset) % 2 ? R : 0) + (W - COLSN * R * 2 - R) / 2, y: TOP + R + r * RH }; }
  function cols(r) { return (r + offset) % 2 ? COLSN - 1 : COLSN; }
  function neighbors(r, c) { var odd = (r + offset) % 2, d = odd ? [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]] : [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]]; return d.map(function (v) { return [r + v[0], c + v[1]]; }).filter(function (v) { return v[0] >= 0 && v[1] >= 0 && v[1] < cols(v[0]); }); }
  function get(r, c) { return grid[r] && grid[r][c]; }
  function present() { var s = {}; grid.forEach(function (row) { row.forEach(function (b) { if (b != null) s[b] = 1; }); }); return Object.keys(s).map(Number); }
  function pickColor() { var p = present(); return p.length ? A.pick(p) : A.irand(0, ncol - 1); }
  function reset() { offset = 0; ncol = 4; grid = []; for (var r = 0; r < 6; r++) { grid.push([]); for (var c = 0; c < cols(r); c++) grid[r].push(A.irand(0, ncol - 1)); } shot = null; cur = pickColor(); next = pickColor(); shots = 0; score = 0; bestChain = 0; dyingT = 0; drops = []; aim = null; fx.clear(); hud(); }
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
    if (group.length >= 3) {
      group.forEach(function (p) { var pp = pos(p[0], p[1]); fx.burst(pp.x, pp.y, COLS[grid[p[0]][p[1]]], 8, 220, 0.4, 3); grid[p[0]][p[1]] = null; });
      // 천장과 연결 안 된 버블 떨어뜨리기
      var keep = {}; q = []; (grid[0] || []).forEach(function (b, cc) { if (b != null) { keep['0,' + cc] = 1; q.push([0, cc]); } });
      while (q.length) { p = q.shift(); neighbors(p[0], p[1]).forEach(function (n) { var k = n[0] + ',' + n[1]; if (!keep[k] && get(n[0], n[1]) != null) { keep[k] = 1; q.push(n); } }); }
      var fell = 0; grid.forEach(function (row, rr) { row.forEach(function (b, cc) { if (b != null && !keep[rr + ',' + cc]) { var pp = pos(rr, cc); drops.push({ x: pp.x, y: pp.y, vy: A.rand(-100, 50), c: b }); row[cc] = null; fell++; } }); });
      var pts = group.length * 10 + fell * 20 * 2; score += pts; bestChain = Math.max(bestChain, group.length + fell);
      fx.text(pos(r, c).x, pos(r, c).y, (fell ? '떨어뜨리기 ' : '') + '+' + pts, fell ? '#ffd166' : '#fff', fell ? 24 : 20); A.sfx(fell ? 'gold' : 'coin', 1 + Math.min(1, group.length / 10)); fx.shake(2 + fell * 0.5, 0.15);
    } else A.sfx('bounce', 1.4);
    while (grid.length && grid[grid.length - 1].every(function (b) { return b == null; })) grid.pop();
    shots++;
    if (!grid.length) { score += 1000; S.banner('판 비우기!', '+1000'); A.sfx('level'); ncol = Math.min(6, ncol + 1); for (var rr = 0; rr < 5; rr++) addRowTop(); }
    if (shots % 5 === 0) { addRowTop(); A.sfx('wall', 0.6); fx.shake(4, 0.2); }
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
        if (shot.x < R + (W - COLSN * R * 2 - R) / 2) { shot.x = R + (W - COLSN * R * 2 - R) / 2; shot.vx *= -1; A.sfx('wall', 1.5); }
        if (shot.x > W - R - (W - COLSN * R * 2 - R) / 2) { shot.x = W - R - (W - COLSN * R * 2 - R) / 2; shot.vx *= -1; A.sfx('wall', 1.5); }
        var hit = shot.y < TOP + R;
        if (!hit) for (var r = 0; r < grid.length && !hit; r++) for (var c = 0; c < grid[r].length; c++) if (grid[r][c] != null) { var p = pos(r, c); if (Math.hypot(p.x - shot.x, p.y - shot.y) < R * 1.75) { hit = true; break; } }
        if (hit) { var cell = snap(shot.x, shot.y, shot.c); shot = null; land(cell[0], cell[1]); break; }
      }
    }
  }
  var keyL = false, keyR = false;
  function ball(c, x, y, col, s) { c.save(); c.shadowColor = COLS[col]; c.shadowBlur = 8; var g = c.createRadialGradient(x - R * 0.35, y - R * 0.35, 2, x, y, R * (s || 1)); g.addColorStop(0, '#fff'); g.addColorStop(0.3, COLS[col]); g.addColorStop(1, A.hexA(COLS[col], 0.7)); c.fillStyle = g; c.beginPath(); c.arc(x, y, R * (s || 1) - 1, 0, 7); c.fill(); c.restore(); }
  function curAim() { return aim != null ? aim : keyAim; }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#060c24'); g.addColorStop(1, '#0a0418'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    if (!grid) { ncol = 4; offset = 0; grid = []; for (var r0 = 0; r0 < 6; r0++) { grid.push([]); for (var c0 = 0; c0 < cols(r0); c0++) grid[r0].push((r0 * 3 + c0) % 4); } cur = 0; next = 1; drops = []; }
    c.fillStyle = 'rgba(122,162,255,.08)'; c.fillRect(0, TOP - 4, W, 4);
    c.strokeStyle = 'rgba(255,77,109,.5)'; c.setLineDash([8, 8]); c.beginPath(); c.moveTo(0, LOSE); c.lineTo(W, LOSE); c.stroke(); c.setLineDash([]);
    grid.forEach(function (row, r) { row.forEach(function (b, cc) { if (b != null) { var p = pos(r, cc); ball(c, p.x, p.y, b); } }); });
    drops.forEach(function (d) { ball(c, d.x, d.y, d.c); });
    // 조준선 (벽 반사 1번)
    if (S.state === 'playing' && !shot) {
      var a = curAim(), x = SX, y = SY, vx = Math.cos(a), vy = Math.sin(a), L = (W - COLSN * R * 2 - R) / 2 + R; c.fillStyle = 'rgba(255,255,255,.5)';
      for (var k = 0; k < 40; k++) { x += vx * 18; y += vy * 18; if (x < L || x > W - L) { vx *= -1; x += vx * 18; } if (y < TOP) break; if (k % 2 === 0) { c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); } }
    }
    if (shot) ball(c, shot.x, shot.y, shot.c);
    else if (cur != null) ball(c, SX, SY, cur);
    if (next != null) { ball(c, SX + 90, SY + 20, next, 0.7); c.fillStyle = 'rgba(255,255,255,.4)'; c.font = '600 12px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('다음', SX + 90, SY + 52); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = shots; document.getElementById('hC').textContent = bestChain; document.getElementById('hMult').textContent = '천장까지 ' + (5 - shots % 5); }
  var stage = document.getElementById('stage');
  function aimAt(p) { return Math.atan2(Math.min(p.y, SY - 20) - SY, p.x - SX); }
  stage.addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e); if (Math.hypot(p.x - (SX + 90), p.y - (SY + 20)) < 34) { var t = cur; cur = next; next = t; A.sfx('click'); return; } aim = aimAt(p); try { stage.setPointerCapture(e.pointerId); } catch (er) {} });
  stage.addEventListener('pointermove', function (e) { if (aim == null) return; aim = aimAt(S.toLocal(e)); });
  stage.addEventListener('pointerup', function () { if (aim != null) { fire(aim); aim = null; } });
  var S = new A.Shell({ id: 'bubbles', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if (k === 'ArrowLeft' || k === 'a') keyL = true; if (k === 'ArrowRight' || k === 'd') keyR = true; if ((k === ' ' || k === 'Enter' || k === 'ArrowUp') && !e.repeat) fire(keyAim); if ((k === 'ArrowDown' || k === 's') && !e.repeat) { var t = cur; cur = next; next = t; } },
    keyup: function (e) { var k = e.key; if (k === 'ArrowLeft' || k === 'a') keyL = false; if (k === 'ArrowRight' || k === 'd') keyR = false; } });
})();
