(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, N = 8, CS = 58, GX = (540 - 8 * 58) / 2, GY = 140;
  var TRAY_Y = 790, SLOT_X = [95, 270, 445], TS = 0.5;
  var fx = new A.FX();
  var grid, tray, score, lines, streak, drag = null, cursor = { x: 3, y: 3, sel: 0 }, kbd = false, clearing = [], pops = [], dyingT = 0, maxStreak = 0;
  var COLORS = ['#5ee7ff', '#7dff9b', '#ffb547', '#ff7aa8', '#b48cff', '#ffe066', '#ff7a45', '#7aa2ff'];
  // 조각 모양 (x,y 칸 목록)
  var SHAPES = [
    [[0, 0]],
    [[0, 0], [1, 0]], [[0, 0], [0, 1]],
    [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
    [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [0, 1]], [[0, 0], [1, 0], [1, 1], [1, 2]], [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [0, 1], [1, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [2, 1]], [[1, 0], [0, 1], [1, 1], [0, 2]],
    [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]
  ];
  var WEIGHT = [3, 3, 3, 3, 3, 2, 2, 1, 1, 3, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  function randPiece() {
    var tot = 0, i; for (i = 0; i < WEIGHT.length; i++) tot += WEIGHT[i];
    var r = Math.random() * tot; for (i = 0; i < WEIGHT.length; i++) { r -= WEIGHT[i]; if (r <= 0) break; }
    var cells = SHAPES[Math.min(i, SHAPES.length - 1)], w = 0, h = 0;
    cells.forEach(function (c) { w = Math.max(w, c[0] + 1); h = Math.max(h, c[1] + 1); });
    return { cells: cells, w: w, h: h, c: A.pick(COLORS), used: false };
  }
  function refill() { tray = [randPiece(), randPiece(), randPiece()]; }
  function fits(p, gx, gy) {
    for (var i = 0; i < p.cells.length; i++) { var x = gx + p.cells[i][0], y = gy + p.cells[i][1]; if (x < 0 || y < 0 || x >= N || y >= N || grid[y][x]) return false; }
    return true;
  }
  function canPlaceAny() {
    for (var k = 0; k < 3; k++) { var p = tray[k]; if (p.used) continue; for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (fits(p, x, y)) return true; }
    return false;
  }
  function wouldClear(p, gx, gy) {
    var g = grid.map(function (r) { return r.slice(); });
    p.cells.forEach(function (c) { g[gy + c[1]][gx + c[0]] = 1; });
    var rows = [], cols = [];
    for (var i = 0; i < N; i++) { if (g[i].every(Boolean)) rows.push(i); var full = true; for (var j = 0; j < N; j++) if (!g[j][i]) full = false; if (full) cols.push(i); }
    return { rows: rows, cols: cols };
  }
  function place(k, gx, gy) {
    var p = tray[k]; if (!p || p.used || !fits(p, gx, gy)) return false;
    var wc = wouldClear(p, gx, gy);
    p.cells.forEach(function (c) { grid[gy + c[1]][gx + c[0]] = p.c; pops.push({ x: gx + c[0], y: gy + c[1], t: 0 }); });
    p.used = true; score += p.cells.length; A.sfx('brick', 0.9);
    var n = wc.rows.length + wc.cols.length;
    if (n) {
      streak++; maxStreak = Math.max(maxStreak, streak); lines += n;
      var pts = n * n * 10 + (streak - 1) * 10 * n; score += pts;
      var cells = {};
      wc.rows.forEach(function (r) { for (var x = 0; x < N; x++) cells[x + ',' + r] = 1; });
      wc.cols.forEach(function (cc) { for (var y = 0; y < N; y++) cells[cc + ',' + y] = 1; });
      Object.keys(cells).forEach(function (key, idx) {
        var xy = key.split(',').map(Number), col = grid[xy[1]][xy[0]];
        clearing.push({ x: xy[0], y: xy[1], c: col, t: -idx * 0.012 });
        grid[xy[1]][xy[0]] = 0;
      });
      var cx = GX + (gx + p.w / 2) * CS, cy = GY + (gy + p.h / 2) * CS;
      fx.text(cx, cy - 30, (n > 1 ? n + '줄! ' : '') + '+' + pts, n > 1 ? '#ffd166' : '#fff', n > 1 ? 26 : 20);
      if (streak > 1) fx.text(cx, cy + 4, 'COMBO ×' + streak, '#7aa2ff', 18);
      fx.shake(3 + n * 2, 0.25); A.sfx(n > 1 ? 'gold' : 'coin', 1 + streak * 0.05); A.vibrate(n > 1 ? [20, 30, 20] : 15);
      if (grid.every(function (r) { return r.every(function (v) { return !v; }); })) { score += 300; S.banner('판 비우기!', '+300'); A.sfx('level'); }
    } else streak = 0;
    if (tray.every(function (q) { return q.used; })) refill();
    if (!canPlaceAny()) { dyingT = 1; A.sfx('hurt'); }
    // 키보드 선택을 남은 조각으로
    if (tray[cursor.sel].used) for (var s = 0; s < 3; s++) if (!tray[s].used) { cursor.sel = s; break; }
    hud(); return true;
  }
  function reset() {
    grid = []; for (var y = 0; y < N; y++) { grid.push([]); for (var x = 0; x < N; x++) grid[y].push(0); }
    refill(); score = 0; lines = 0; streak = 0; maxStreak = 0; clearing = []; pops = []; dyingT = 0; drag = null; cursor = { x: 3, y: 3, sel: 0 };
    fx.clear(); hud();
  }
  function update(dt) {
    fx.update(dt);
    for (var i = clearing.length - 1; i >= 0; i--) {
      var c = clearing[i]; c.t += dt;
      if (c.t > 0 && !c.burst) { c.burst = true; fx.burst(GX + c.x * CS + CS / 2, GY + c.y * CS + CS / 2, c.c, 6, 220, 0.5, 3); }
      if (c.t > 0.35) clearing.splice(i, 1);
    }
    for (i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 0.2) pops.splice(i, 1); }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['지운 줄', String(lines)], ['최대 콤보', String(maxStreak)]]); }
  }

  function cellSpr(col) {
    return A.sprite('bc' + col, CS, CS, function (x) {
      var g = x.createLinearGradient(0, 0, 0, CS); g.addColorStop(0, col); g.addColorStop(1, A.hexA(col, 0.6));
      x.fillStyle = g; A.rr(x, 3, 3, CS - 6, CS - 6, 9); x.fill();
      x.fillStyle = 'rgba(255,255,255,.45)'; A.rr(x, 8, 7, CS - 16, 6, 3); x.fill();
      x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1.5; A.rr(x, 3.5, 3.5, CS - 7, CS - 7, 9); x.stroke();
    });
  }
  function drawPiece(c, p, x, y, s, alpha) {
    c.globalAlpha = alpha == null ? 1 : alpha;
    p.cells.forEach(function (q) { c.drawImage(cellSpr(p.c), x + q[0] * CS * s, y + q[1] * CS * s, CS * s, CS * s); });
    c.globalAlpha = 1;
  }
  // 드래그 중인 조각의 판 위치 계산
  function dragTarget() {
    if (!drag) return null;
    var p = tray[drag.k], left = drag.x - p.w * CS / 2, top = drag.y - p.h * CS / 2;
    var gx = Math.round((left - GX) / CS), gy = Math.round((top - GY) / CS);
    return fits(p, gx, gy) ? { gx: gx, gy: gy } : null;
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#070b1c'); g.addColorStop(1, '#0d0820'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    // 판
    c.fillStyle = 'rgba(122,162,255,.08)'; A.rr(c, GX - 10, GY - 10, N * CS + 20, N * CS + 20, 18); c.fill();
    c.strokeStyle = 'rgba(122,162,255,.35)'; c.lineWidth = 2; c.stroke();
    var gr = grid || [];
    var tgt = dragTarget(), hl = null, ghost = null;
    if (tgt) { ghost = { p: tray[drag.k], gx: tgt.gx, gy: tgt.gy }; }
    else if (kbd && tray && S.state === 'playing' && !tray[cursor.sel].used) { var kp = tray[cursor.sel]; cursor.x = A.clamp(cursor.x, 0, N - kp.w); cursor.y = A.clamp(cursor.y, 0, N - kp.h); ghost = { p: kp, gx: cursor.x, gy: cursor.y, bad: !fits(kp, cursor.x, cursor.y) }; }
    if (ghost && !ghost.bad) hl = wouldClear(ghost.p, ghost.gx, ghost.gy);
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var px = GX + x * CS, py = GY + y * CS, v = gr[y] && gr[y][x];
      var lit = hl && (hl.rows.indexOf(y) >= 0 || hl.cols.indexOf(x) >= 0);
      c.fillStyle = lit ? 'rgba(255,209,102,.18)' : 'rgba(255,255,255,.035)'; A.rr(c, px + 3, py + 3, CS - 6, CS - 6, 9); c.fill();
      if (v) {
        var pp = null; for (var k = 0; k < pops.length; k++) if (pops[k].x === x && pops[k].y === y) pp = pops[k];
        var s = pp ? 0.8 + pp.t : 1;
        c.drawImage(cellSpr(v), px + CS * (1 - s) / 2, py + CS * (1 - s) / 2, CS * s, CS * s);
        if (lit) { c.fillStyle = 'rgba(255,255,255,' + (0.25 + Math.sin(t * 10) * 0.15) + ')'; A.rr(c, px + 3, py + 3, CS - 6, CS - 6, 9); c.fill(); }
      }
    }
    for (var i = 0; i < clearing.length; i++) {
      var cl = clearing[i], k2 = Math.max(0, cl.t) / 0.35, sz = CS * (1 - k2);
      c.globalAlpha = 1 - k2; c.drawImage(cellSpr(cl.c), GX + cl.x * CS + (CS - sz) / 2, GY + cl.y * CS + (CS - sz) / 2, sz, sz); c.globalAlpha = 1;
    }
    if (ghost) {
      if (ghost.bad) { c.globalAlpha = 0.3; ghost.p.cells.forEach(function (q) { c.fillStyle = '#ff4d6d'; A.rr(c, GX + (ghost.gx + q[0]) * CS + 3, GY + (ghost.gy + q[1]) * CS + 3, CS - 6, CS - 6, 9); c.fill(); }); c.globalAlpha = 1; }
      else drawPiece(c, ghost.p, GX + ghost.gx * CS, GY + ghost.gy * CS, 1, 0.35);
    }
    // 조각 받침
    if (tray) {
      for (i = 0; i < 3; i++) { c.fillStyle = 'rgba(255,255,255,.03)'; A.rr(c, SLOT_X[i] - 80, TRAY_Y - 90, 160, 180, 16); c.fill(); }
      for (i = 0; i < 3; i++) {
        var p = tray[i]; if (kbd && i === cursor.sel && S.state === 'playing') { c.strokeStyle = 'rgba(122,162,255,.7)'; c.lineWidth = 2; A.rr(c, SLOT_X[i] - 80, TRAY_Y - 90, 160, 180, 16); c.stroke(); }
        if (p.used || (drag && drag.k === i)) continue;
        var ok = !grid || canFit(p);
        drawPiece(c, p, SLOT_X[i] - p.w * CS * TS / 2, TRAY_Y - p.h * CS * TS / 2, TS, ok ? 1 : 0.3);
        if (kbd) { c.fillStyle = 'rgba(255,255,255,.4)'; c.font = '700 14px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.fillText(String(i + 1), SLOT_X[i], TRAY_Y + 80); }
      }
      if (drag) drawPiece(c, tray[drag.k], drag.x - tray[drag.k].w * CS / 2, drag.y - tray[drag.k].h * CS / 2, 1, 0.95);
    } else {
      [[0, '#5ee7ff', 2], [4, '#ff7aa8', 9], [6, '#ffe066', 13]].forEach(function (d, j) { drawPiece(c, { cells: SHAPES[d[2]], c: d[1] }, SLOT_X[j] - 30, TRAY_Y - 30, TS); });
    }
    fx.draw(c);
    c.restore(); fx.drawFlash(c, W, H);
  }
  function canFit(p) { for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (fits(p, x, y)) return true; return false; }
  function hud() {
    document.getElementById('hA').textContent = A.fmt(score);
    document.getElementById('hB').textContent = lines;
    document.getElementById('hC').textContent = streak;
    document.getElementById('hMult').textContent = streak > 1 ? 'COMBO ×' + streak : '';
  }
  // 입력
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing' || dyingT > 0) return;
    var p = S.toLocal(e);
    if (p.y < TRAY_Y - 110) return;
    for (var i = 0; i < 3; i++) {
      if (Math.abs(p.x - SLOT_X[i]) < 88 && !tray[i].used) {
        kbd = false;
        var lift = e.pointerType === 'mouse' ? 0 : 120;
        drag = { k: i, id: e.pointerId, lift: lift, x: p.x, y: p.y - lift };
        A.sfx('click'); try { stage.setPointerCapture(e.pointerId); } catch (er) {}
        return;
      }
    }
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag || drag.id !== e.pointerId) return;
    var p = S.toLocal(e); drag.x = p.x; drag.y = p.y - drag.lift;
  });
  stage.addEventListener('pointerup', function (e) {
    if (!drag || drag.id !== e.pointerId) return;
    var tg = dragTarget(), k = drag.k; drag = null;
    if (tg) place(k, tg.gx, tg.gy); else A.sfx('wall');
  });
  stage.addEventListener('pointercancel', function () { drag = null; });

  var S = new A.Shell({
    id: 'blocks', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); update0(dt); }, render: render,
    keydown: function (e) {
      if (dyingT > 0) return;
      var k = e.key; kbd = true;
      if (k === '1' || k === '2' || k === '3') { var s = +k - 1; if (!tray[s].used) cursor.sel = s; }
      else if (k === 'ArrowLeft' || k === 'a') cursor.x--;
      else if (k === 'ArrowRight' || k === 'd') cursor.x++;
      else if (k === 'ArrowUp' || k === 'w') cursor.y--;
      else if (k === 'ArrowDown' || k === 's') cursor.y++;
      else if (k === ' ' || k === 'Enter') { if (!place(cursor.sel, cursor.x, cursor.y)) A.sfx('wall'); }
      else if (k === 'Tab') { e.preventDefault(); for (var j = 1; j <= 3; j++) { var n = (cursor.sel + j) % 3; if (!tray[n].used) { cursor.sel = n; break; } } }
    }
  });
  function update0(dt) { for (var i = clearing.length - 1; i >= 0; i--) { clearing[i].t += dt; if (clearing[i].t > 0.35) clearing.splice(i, 1); } }
})();
