(function () {
  'use strict';
  // 육각 블록: 반지름 4 육각 판(61칸)에 육각 조각을 끌어다 놓고, 세 방향 중 어느 직선이든 꽉 차면 지워짐
  var A = Arcade, W = 540, H = 960, R = 4, SZ = 31, OX = 270, OY = 360, SQ = Math.sqrt(3);
  var TRAY_Y = 815, SLOT_X = [95, 270, 445], TS = 0.68;
  var fx = new A.FX();
  var COLORS = ['#4dffd2', '#5ee7ff', '#7aa2ff', '#b48cff', '#ff7aa8', '#ffb547', '#ffe066', '#7dff9b'];
  var DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  var cells = [], idx = {}, LINES = [], board, tray, score, lines, streak, maxStreak, drag = null, cur = { q: 0, r: 0, sel: 0 }, kbd = false, dyingT = 0, pops = [];

  // ---------- 판 좌표 ----------
  for (var q = -R; q <= R; q++) for (var r = -R; r <= R; r++) if (Math.abs(q + r) <= R) { idx[q + ',' + r] = cells.length; cells.push([q, r]); }
  (function () { // 세 방향 직선 27줄
    for (var a = -R; a <= R; a++) {
      var L1 = [], L2 = [], L3 = [];
      cells.forEach(function (c, i) { if (c[0] === a) L1.push(i); if (c[1] === a) L2.push(i); if (-c[0] - c[1] === a) L3.push(i); });
      LINES.push(L1, L2, L3);
    }
  })();
  function px(q, r) { return [OX + SZ * SQ * (q + r / 2), OY + SZ * 1.5 * r]; }
  function toHex(x, y) {
    x -= OX; y -= OY;
    var fq = (SQ / 3 * x - y / 3) / SZ, fr = (2 / 3 * y) / SZ, fs = -fq - fr;
    var rq = Math.round(fq), rr = Math.round(fr), rs = Math.round(fs), dq = Math.abs(rq - fq), dr = Math.abs(rr - fr), ds = Math.abs(rs - fs);
    if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
    return [rq, rr];
  }

  // ---------- 조각: 무작위로 자라나는 1~4칸 모양 (회전 없음, 모양 종류가 많음) ----------
  function randPiece() {
    var r = Math.random(), n = r < 0.1 ? 1 : r < 0.32 ? 2 : r < 0.66 ? 3 : 4;
    var set = [[0, 0]], has = { '0,0': 1 };
    while (set.length < n) {
      var b = A.pick(set), d = A.pick(DIRS), c = [b[0] + d[0], b[1] + d[1]];
      if (!has[c[0] + ',' + c[1]]) { has[c[0] + ',' + c[1]] = 1; set.push(c); }
    }
    // 가운데 맞추기용 중심
    var cx = 0, cy = 0; set.forEach(function (s) { var p = [SZ * SQ * (s[0] + s[1] / 2), SZ * 1.5 * s[1]]; cx += p[0]; cy += p[1]; });
    return { cells: set, col: A.pick(COLORS), used: false, cx: cx / set.length, cy: cy / set.length };
  }
  function refill() { tray = [randPiece(), randPiece(), randPiece()]; }
  function fits(p, q, r) {
    for (var i = 0; i < p.cells.length; i++) { var k = idx[(q + p.cells[i][0]) + ',' + (r + p.cells[i][1])]; if (k === undefined || board[k]) return false; }
    return true;
  }
  function canPlaceAny() { for (var t = 0; t < 3; t++) { var p = tray[t]; if (p.used) continue; for (var i = 0; i < cells.length; i++) if (fits(p, cells[i][0], cells[i][1])) return true; } return false; }
  function wouldClear(p, q, r) {
    var tmp = board.slice(); p.cells.forEach(function (c) { tmp[idx[(q + c[0]) + ',' + (r + c[1])]] = 'x'; });
    var out = []; LINES.forEach(function (L) { if (L.every(function (k) { return tmp[k]; })) out.push(L); }); return out;
  }
  function reset() { board = []; for (var i = 0; i < cells.length; i++) board.push(null); score = 0; lines = 0; streak = 0; maxStreak = 0; dyingT = 0; pops = []; drag = null; refill(); cur = { q: 0, r: 0, sel: 0 }; fx.clear(); hud(); }
  function place(t, q, r) {
    var p = tray[t]; if (!p || p.used || !fits(p, q, r)) { A.sfx('wall'); return false; }
    p.cells.forEach(function (c) { var k = idx[(q + c[0]) + ',' + (r + c[1])]; board[k] = p.col; pops.push({ k: k, t: 0 }); });
    p.used = true; score += p.cells.length; A.sfx('place', 0.9 + p.cells.length * 0.05); A.vibrate(8);
    var full = []; LINES.forEach(function (L) { if (L.every(function (k) { return board[k]; })) full.push(L); });
    if (full.length) {
      streak++; maxStreak = Math.max(maxStreak, streak);
      var gone = {}, n = 0; full.forEach(function (L) { L.forEach(function (k) { if (!gone[k]) { gone[k] = 1; n++; } }); });
      var pts = n * 10 * full.length * Math.min(streak, 8); score += pts; lines += full.length;
      Object.keys(gone).forEach(function (k) { var c = cells[k], pp = px(c[0], c[1]); fx.burst(pp[0], pp[1], board[k], 10, 220, 0.5, 2.6); board[k] = null; });
      var c0 = cells[full[0][Math.floor(full[0].length / 2)]], p0 = px(c0[0], c0[1]);
      fx.text(p0[0], p0[1] - 30, '+' + A.fmt(pts) + (full.length > 1 ? ' · ' + full.length + '줄!' : ''), '#ffd166', full.length > 1 ? 28 : 22);
      if (streak >= 2) fx.text(W / 2, OY - 250, '콤보 ×' + Math.min(streak, 8), '#4dffd2', 26);
      fx.shake(3 + full.length * 2, 0.18); A.sfx(full.length > 1 ? 'combo' : 'line', 1 + Math.min(streak, 8) * 0.06); A.vibrate([15, 30, 15]);
      if (full.length >= 3) fx.flashIt('#4dffd2', 0.25);
    } else streak = 0;
    if (tray.every(function (x) { return x.used; })) refill();
    if (!canPlaceAny()) { dyingT = 1.2; A.sfx('wrong'); A.sfx('hurt'); fx.shake(8, 0.35); fx.flashIt('#ff2244', 0.35); A.vibrate(150); }
    hud(); return true;
  }
  function update(dt) {
    fx.update(dt);
    for (var i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 0.25) pops.splice(i, 1); }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(score, [['지운 줄', String(lines)], ['최대 콤보', '×' + maxStreak], ['남은 칸', String(board.filter(function (b) { return !b; }).length)]]); }
  }

  // ---------- 그리기 ----------
  function hexPath(c, x, y, s) { c.beginPath(); for (var k = 0; k < 6; k++) { var a = Math.PI / 180 * (60 * k - 30); var hx = x + s * Math.cos(a), hy = y + s * Math.sin(a); if (k) c.lineTo(hx, hy); else c.moveTo(hx, hy); } c.closePath(); }
  function tile(col) {
    return A.sprite('hx-' + col, SZ * 2 + 12, SZ * 2 + 12, function (x, w, h) {
      var cx = w / 2, cy = h / 2; x.shadowColor = col; x.shadowBlur = 8;
      var g = x.createLinearGradient(0, cy - SZ, 0, cy + SZ); g.addColorStop(0, '#ffffff'); g.addColorStop(0.18, col); g.addColorStop(1, A.hexA(col, 0.6));
      x.fillStyle = g; hexPath(x, cx, cy, SZ - 2.5); x.fill(); x.shadowBlur = 0;
      x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 1.5; hexPath(x, cx, cy, SZ - 6); x.stroke();
    });
  }
  function drawPiece(c, p, x, y, s, alpha) {
    c.globalAlpha = alpha == null ? 1 : alpha;
    p.cells.forEach(function (cc) { var hx = SZ * SQ * (cc[0] + cc[1] / 2) - p.cx, hy = SZ * 1.5 * cc[1] - p.cy; A.draw(c, tile(p.col), x + hx * s, y + hy * s, s); });
    c.globalAlpha = 1;
  }
  function dropTarget() {
    if (!drag) return null; var p = tray[drag.t];
    // 조각의 첫 칸이 화면 어디에 그려지는지로 판 위치를 정함
    var fx0 = drag.x + (SZ * SQ * (p.cells[0][0] + p.cells[0][1] / 2) - p.cx), fy0 = drag.y + (SZ * 1.5 * p.cells[0][1] - p.cy);
    var h = toHex(fx0, fy0), q0 = h[0] - p.cells[0][0], r0 = h[1] - p.cells[0][1];
    return fits(p, q0, r0) ? [q0, r0] : null;
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#021612'); g.addColorStop(1, '#010806'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (var s = 0; s < 14; s++) { var sx = (s * 173 + t * 6) % W, sy = (s * 263) % H; c.strokeStyle = 'rgba(77,255,210,.04)'; c.lineWidth = 1; hexPath(c, sx, sy, 20 + s % 4 * 8); c.stroke(); }
    c.restore();
    // 판 바탕
    c.save(); c.translate(OX, OY); c.rotate(Math.PI / 6); hexPath(c, 0, 0, SZ * SQ * R + SZ * 1.25); c.restore(); c.fillStyle = 'rgba(77,255,210,.05)'; c.fill(); c.strokeStyle = 'rgba(77,255,210,.35)'; c.lineWidth = 2; c.stroke();
    var tgt = dropTarget(), preview = {}, clr = {};
    if (!tgt && kbd && S.state === 'playing' && tray && !tray[cur.sel].used && fits(tray[cur.sel], cur.q, cur.r)) tgt = [cur.q, cur.r];
    var tp = drag ? tray[drag.t] : kbd && tray ? tray[cur.sel] : null;
    if (tgt && tp) { tp.cells.forEach(function (cc) { preview[idx[(tgt[0] + cc[0]) + ',' + (tgt[1] + cc[1])]] = 1; }); wouldClear(tp, tgt[0], tgt[1]).forEach(function (L) { L.forEach(function (k) { clr[k] = 1; }); }); }
    var bd = board || [];
    for (var i = 0; i < cells.length; i++) {
      var p = px(cells[i][0], cells[i][1]);
      if (bd[i]) {
        var pop = 0; for (var k = 0; k < pops.length; k++) if (pops[k].k === i) pop = Math.sin(pops[k].t / 0.25 * Math.PI) * 0.12;
        A.draw(c, tile(bd[i]), p[0], p[1], 1 + pop);
        if (clr[i]) { c.fillStyle = 'rgba(255,209,102,' + (0.35 + 0.2 * Math.sin(t * 12)) + ')'; hexPath(c, p[0], p[1], SZ - 3); c.fill(); }
      } else {
        c.fillStyle = 'rgba(255,255,255,.07)'; hexPath(c, p[0], p[1], SZ - 3); c.fill();
        c.strokeStyle = 'rgba(77,255,210,.22)'; c.lineWidth = 1; c.stroke();
        if (preview[i]) { c.globalAlpha = 0.45; A.draw(c, tile(tp.col), p[0], p[1], 1); c.globalAlpha = 1; if (clr[i]) { c.fillStyle = 'rgba(255,209,102,.35)'; hexPath(c, p[0], p[1], SZ - 3); c.fill(); } }
      }
    }
    if (kbd && S.state === 'playing' && !drag) { var kp = px(cur.q, cur.r); c.strokeStyle = '#ffd166'; c.lineWidth = 3; hexPath(c, kp[0], kp[1], SZ - 1); c.stroke(); }
    // 받침과 조각
    c.fillStyle = 'rgba(77,255,210,.06)'; A.rr(c, 20, TRAY_Y - 95, W - 40, 190, 24); c.fill();
    if (tray) for (var tt = 0; tt < 3; tt++) {
      var pc = tray[tt]; if (pc.used || (drag && drag.t === tt)) continue;
      var ok = false; for (i = 0; i < cells.length && !ok; i++) if (fits(pc, cells[i][0], cells[i][1])) ok = true;
      drawPiece(c, pc, SLOT_X[tt], TRAY_Y, TS, ok ? 1 : 0.3);
      if (kbd && cur.sel === tt) { c.strokeStyle = '#ffd166'; c.lineWidth = 2.5; A.rr(c, SLOT_X[tt] - 78, TRAY_Y - 80, 156, 160, 18); c.stroke(); }
      if (!document.body.classList.contains('touch')) { c.fillStyle = 'rgba(77,255,210,.5)'; c.font = '700 14px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.fillText(String(tt + 1), SLOT_X[tt], TRAY_Y + 84); }
    }
    if (drag) drawPiece(c, tray[drag.t], drag.x, drag.y, 1, 0.95);
    if (!board) { // 시작 전 장식
      [[0, 0, '#4dffd2'], [1, 0, '#5ee7ff'], [-1, 1, '#b48cff'], [2, -1, '#ff7aa8'], [0, -2, '#ffb547'], [-2, 2, '#7dff9b'], [3, -3, '#ffe066']].forEach(function (d) { var pp = px(d[0], d[1]); A.draw(c, tile(d[2]), pp[0], pp[1], 1); });
    }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var lastHud = '';
  function hud() {
    var k = score + '|' + lines + '|' + streak; if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = lines; document.getElementById('hC').textContent = streak;
    document.getElementById('hMult').textContent = streak >= 2 ? '콤보 ×' + Math.min(streak, 8) : '';
  }

  // ---------- 입력: 받침의 조각을 끌어다 놓기 (터치는 손가락 위로 띄움) ----------
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing' || dyingT > 0) return; e.preventDefault(); kbd = false;
    var p = S.toLocal(e); if (p.y < TRAY_Y - 100) return;
    var t = p.x < 182 ? 0 : p.x < 358 ? 1 : 2; if (tray[t].used) return;
    var lift = e.pointerType === 'mouse' ? 0 : 110;
    drag = { t: t, x: p.x, y: p.y - lift, lift: lift, id: e.pointerId }; A.sfx('select');
  });
  window.addEventListener('pointermove', function (e) { if (!drag || e.pointerId !== drag.id) return; var p = S.toLocal(e); drag.x = p.x; drag.y = p.y - drag.lift; });
  function end(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var tg = dropTarget(), t = drag.t; drag = null;
    if (tg && S.state === 'playing') place(t, tg[0], tg[1]); else A.sfx('wrong', 0.9);
  }
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', function () { drag = null; });
  function moveCur(dq, dr) { var nq = cur.q + dq, nr = cur.r + dr; if (idx[nq + ',' + nr] !== undefined) { cur.q = nq; cur.r = nr; A.sfx('tick'); } }
  var S = new A.Shell({
    id: 'hexa', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) {
      if (dyingT > 0) return; kbd = true;
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === '1' || k === '2' || k === '3') { var t = +k - 1; if (!tray[t].used) { cur.sel = t; A.sfx('select'); } return; }
      if (k === 'ArrowLeft' || k === 'a') moveCur(-1, 0); else if (k === 'ArrowRight' || k === 'd') moveCur(1, 0);
      else if (k === 'ArrowUp' || k === 'w') moveCur(0, -1); else if (k === 'ArrowDown' || k === 's') moveCur(0, 1);
      else if ((k === ' ' || k === 'Enter') && !e.repeat) {
        if (tray[cur.sel].used) { for (var i = 0; i < 3; i++) if (!tray[i].used) { cur.sel = i; break; } }
        if (place(cur.sel, cur.q, cur.r)) { for (i = 0; i < 3; i++) if (!tray[i].used) { cur.sel = i; break; } }
      }
    }
  });
})();
