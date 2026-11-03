(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CS = 56, GX = 18, GY = 132;
  var PAD_Y = 666, PAD_H = 80, TOOL_Y = 768, TOOL_H = 70;
  var DIFFS = [{ clues: 40, base: 1000, name: '쉬움' }, { clues: 32, base: 2500, name: '보통' }, { clues: 26, base: 5000, name: '어려움' }];
  var diff = +A.get('neowa_sudoku_diff', '0') || 0;
  var fx = new A.FX();
  var sol, given, val, notes, wrong, sel = { x: 4, y: 4 }, noteMode = false, mistakes = 0, hints = 0, time = 0, D, winT = 0, dyingT = 0, flash = [];

  /* ---------- 퍼즐 만들기 ---------- */
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function box(i) { return Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3); }
  function candMask(g, i) {
    var r = Math.floor(i / 9), c = i % 9, m = 0, b = box(i), br = Math.floor(b / 3) * 3, bc = (b % 3) * 3;
    for (var k = 0; k < 9; k++) { m |= 1 << g[r * 9 + k]; m |= 1 << g[k * 9 + c]; m |= 1 << g[(br + Math.floor(k / 3)) * 9 + bc + k % 3]; }
    return ~m & 0x3fe; // 1~9 비트
  }
  function bits(m) { var out = []; for (var d = 1; d <= 9; d++) if (m & (1 << d)) out.push(d); return out; }
  function fill(g) {
    var best = -1, bm = 0, bc = 10;
    for (var i = 0; i < 81; i++) if (!g[i]) { var m = candMask(g, i), n = bits(m).length; if (n < bc) { bc = n; best = i; bm = m; if (n === 0) return false; } }
    if (best < 0) return true;
    var ds = shuffle(bits(bm));
    for (var k = 0; k < ds.length; k++) { g[best] = ds[k]; if (fill(g)) return true; }
    g[best] = 0; return false;
  }
  function countSol(g, limit) {
    var best = -1, bm = 0, bc = 10;
    for (var i = 0; i < 81; i++) if (!g[i]) { var m = candMask(g, i), n = bits(m).length; if (n < bc) { bc = n; best = i; bm = m; if (n === 0) return 0; } }
    if (best < 0) return 1;
    var total = 0, ds = bits(bm);
    for (var k = 0; k < ds.length; k++) { g[best] = ds[k]; total += countSol(g, limit - total); if (total >= limit) break; }
    g[best] = 0; return total;
  }
  function makePuzzle(clues) {
    var full = []; for (var i = 0; i < 81; i++) full.push(0); fill(full);
    var puz = full.slice(), order = shuffle(Array.apply(null, { length: 81 }).map(function (_, k) { return k; })), left = 81;
    for (var j = 0; j < order.length && left > clues; j++) {
      var idx = order[j], keep = puz[idx]; puz[idx] = 0;
      if (countSol(puz.slice(), 2) !== 1) puz[idx] = keep; else left--;
    }
    return { sol: full, puz: puz };
  }

  function reset() {
    D = DIFFS[diff];
    var p = makePuzzle(D.clues);
    sol = p.sol; given = p.puz.map(function (v) { return v > 0; }); val = p.puz.slice();
    notes = []; wrong = []; for (var i = 0; i < 81; i++) { notes.push(0); wrong.push(false); }
    mistakes = 0; hints = 0; time = 0; winT = 0; dyingT = 0; noteMode = false; flash = [];
    for (i = 0; i < 81; i++) if (!given[i]) { sel = { x: i % 9, y: Math.floor(i / 9) }; break; }
    fx.clear(); hud();
  }
  function idx() { return sel.y * 9 + sel.x; }
  function put(d) {
    if (winT > 0 || dyingT > 0) return;
    var i = idx(); if (given[i] || (val[i] && !wrong[i] && val[i] === sol[i])) { A.sfx('wall'); return; }
    if (noteMode) { notes[i] ^= 1 << d; A.sfx('tick'); return; }
    val[i] = d; notes[i] = 0;
    if (d !== sol[i]) {
      wrong[i] = true; mistakes++; A.sfx('hurt', 1.4); A.vibrate(80); fx.shake(5, 0.2);
      fx.text(GX + sel.x * CS + CS / 2, GY + sel.y * CS - 6, '✕', '#ff4d6d', 24);
      if (mistakes >= 3) { dyingT = 1.2; fx.flashIt('#ff2244', 0.5); }
    } else {
      wrong[i] = false; A.sfx('eat', 1 + d * 0.04);
      clearNotes(i, d); celebrate(i);
      if (val.every(function (v, k) { return v === sol[k]; })) win();
    }
    hud();
  }
  function clearNotes(i, d) {
    var r = Math.floor(i / 9), c = i % 9, b = box(i);
    for (var k = 0; k < 81; k++) if (Math.floor(k / 9) === r || k % 9 === c || box(k) === b) notes[k] &= ~(1 << d);
  }
  function groupDone(list) { return list.every(function (k) { return val[k] === sol[k]; }); }
  function celebrate(i) {
    var r = Math.floor(i / 9), c = i % 9, b = box(i), groups = [];
    var row = [], col = [], bx = []; for (var k = 0; k < 81; k++) { if (Math.floor(k / 9) === r) row.push(k); if (k % 9 === c) col.push(k); if (box(k) === b) bx.push(k); }
    [row, col, bx].forEach(function (g) { if (groupDone(g)) groups.push(g); });
    groups.forEach(function (g) { g.forEach(function (k, n) { flash.push({ k: k, t: -n * 0.03 }); }); });
    if (groups.length) { A.sfx('coin', 1 + groups.length * 0.1); fx.text(GX + c * CS + CS / 2, GY + r * CS - 10, groups.length > 1 ? '완성 ×' + groups.length : '완성!', '#c3ff5e', 20); }
  }
  function erase() { var i = idx(); if (given[i] || (val[i] === sol[i])) return; val[i] = 0; wrong[i] = false; notes[i] = 0; A.sfx('click'); hud(); }
  function hint() {
    if (hints >= 3 || winT > 0 || dyingT > 0) { A.sfx('wall'); return; }
    var i = idx();
    if (given[i] || val[i] === sol[i]) { var empties = []; for (var k = 0; k < 81; k++) if (val[k] !== sol[k]) empties.push(k); if (!empties.length) return; i = A.pick(empties); sel = { x: i % 9, y: Math.floor(i / 9) }; }
    hints++; val[i] = sol[i]; wrong[i] = false; notes[i] = 0; clearNotes(i, sol[i]);
    fx.ring(GX + sel.x * CS + CS / 2, GY + sel.y * CS + CS / 2, '#c3ff5e', 60, 0.4); A.sfx('power');
    celebrate(i); if (val.every(function (v, k) { return v === sol[k]; })) win();
    hud();
  }
  function win() {
    winT = 1.6; A.sfx('level'); fx.flashIt('#c3ff5e', 0.3);
    for (var k = 0; k < 81; k++) flash.push({ k: k, t: -((k % 9) + Math.floor(k / 9)) * 0.03 });
    for (var i = 0; i < 6; i++) fx.burst(A.rand(80, W - 80), A.rand(150, 600), A.pick(['#c3ff5e', '#ffd166', '#5ee7ff']), 26, 400, 0.9, 4);
  }
  function score() { return Math.max(100, Math.round(D.base + Math.max(0, D.base * 1.5 - time * D.base / 400) - hints * D.base * 0.15 - mistakes * D.base * 0.1)); }
  function fmtT(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function update(dt) {
    fx.update(dt);
    for (var i = flash.length - 1; i >= 0; i--) { flash[i].t += dt; if (flash[i].t > 0.5) flash.splice(i, 1); }
    if (winT > 0) {
      winT -= dt;
      if (winT <= 0) {
        var k = 'neowa_sudoku_time_' + diff, b = parseFloat(A.get(k, '0')) || 0; if (!b || time < b) A.set(k, time.toFixed(0));
        S.gameOver(score(), [['난이도', D.name], ['시간', fmtT(time)], ['최단', fmtT(parseFloat(A.get(k, '0')))]], { kick: 'SOLVED!', win: true });
      }
      return;
    }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) { var done = val.filter(function (v, k2) { return !given[k2] && v === sol[k2]; }).length, need = given.filter(function (g) { return !g; }).length; S.gameOver(Math.round(done / need * D.base * 0.3), [['난이도', D.name], ['채운 칸', done + '/' + need], ['시간', fmtT(time)]]); } return; }
    time += dt; hud();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a1004'); g.addColorStop(1, '#10140a'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    var demo = !val;
    var vv = val || [5, 3, 0, 0, 7, 0, 0, 0, 0, 6, 0, 0, 1, 9, 5, 0, 0, 0, 0, 9, 8, 0, 0, 0, 0, 6, 0, 8, 0, 0, 0, 6, 0, 0, 0, 3, 4, 0, 0, 8, 0, 3, 0, 0, 1, 7, 0, 0, 0, 2, 0, 0, 0, 6, 0, 6, 0, 0, 0, 0, 2, 8, 0, 0, 0, 0, 4, 1, 9, 0, 0, 5, 0, 0, 0, 0, 8, 0, 0, 7, 9];
    var si = demo ? -1 : idx(), sv = demo ? 0 : vv[si], sb = demo ? -1 : box(si);
    c.fillStyle = 'rgba(195,255,94,.05)'; A.rr(c, GX - 6, GY - 6, CS * 9 + 12, CS * 9 + 12, 14); c.fill();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (var i = 0; i < 81; i++) {
      var x = i % 9, y = Math.floor(i / 9), px = GX + x * CS, py = GY + y * CS;
      var bg = null;
      if (!demo) {
        if (i === si) bg = 'rgba(195,255,94,.32)';
        else if (sv && vv[i] === sv && !wrong[i]) bg = 'rgba(195,255,94,.16)';
        else if (x === sel.x || y === sel.y || box(i) === sb) bg = 'rgba(255,255,255,.06)';
      }
      for (var f = 0; f < flash.length; f++) if (flash[f].k === i && flash[f].t > 0) bg = 'rgba(195,255,94,' + (0.55 * (1 - flash[f].t / 0.5)) + ')';
      if (bg) { c.fillStyle = bg; c.fillRect(px + 1, py + 1, CS - 2, CS - 2); }
      var v = vv[i];
      if (v) {
        var isGiven = demo ? true : given[i];
        c.font = (isGiven ? '700 ' : '600 ') + '30px "Chakra Petch",system-ui';
        c.fillStyle = !demo && wrong[i] ? '#ff4d6d' : isGiven ? '#f4f5fb' : '#c3ff5e';
        c.fillText(String(v), px + CS / 2, py + CS / 2 + 1);
      } else if (!demo && notes[i]) {
        c.font = '600 14px "Chakra Petch",system-ui'; c.fillStyle = 'rgba(220,240,200,.75)';
        for (var d = 1; d <= 9; d++) if (notes[i] & (1 << d)) c.fillText(String(d), px + ((d - 1) % 3 + 0.5) * CS / 3, py + (Math.floor((d - 1) / 3) + 0.5) * CS / 3 + 1);
      }
    }
    // 격자선
    for (i = 0; i <= 9; i++) {
      c.strokeStyle = i % 3 === 0 ? 'rgba(195,255,94,.7)' : 'rgba(255,255,255,.14)'; c.lineWidth = i % 3 === 0 ? 2.5 : 1;
      c.beginPath(); c.moveTo(GX + i * CS, GY); c.lineTo(GX + i * CS, GY + 9 * CS); c.stroke();
      c.beginPath(); c.moveTo(GX, GY + i * CS); c.lineTo(GX + 9 * CS, GY + i * CS); c.stroke();
    }
    // 숫자 버튼
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; vv.forEach(function (v2, k) { if (v2 && (demo || v2 === sol[k])) counts[v2]++; });
    for (d = 1; d <= 9; d++) {
      var bx = GX + (d - 1) * CS, done = counts[d] >= 9;
      c.fillStyle = done ? 'rgba(255,255,255,.03)' : 'rgba(195,255,94,.1)'; A.rr(c, bx + 3, PAD_Y, CS - 6, PAD_H, 12); c.fill();
      c.font = '700 30px "Chakra Petch",system-ui'; c.fillStyle = done ? 'rgba(255,255,255,.2)' : '#e9ffc9'; c.fillText(String(d), bx + CS / 2, PAD_Y + 30);
      c.font = '600 12px "Chakra Petch",system-ui'; c.fillStyle = 'rgba(255,255,255,.35)'; c.fillText(done ? '✓' : String(9 - counts[d]), bx + CS / 2, PAD_Y + 56);
    }
    // 도구
    var tools = [['지우기', false], [noteMode ? '메모 켜짐' : '메모', noteMode], ['힌트 ' + (3 - hints), false]], tw = (CS * 9) / 3;
    for (i = 0; i < 3; i++) {
      var tx = GX + i * tw; c.fillStyle = tools[i][1] ? '#c3ff5e' : 'rgba(255,255,255,.06)'; A.rr(c, tx + 4, TOOL_Y, tw - 8, TOOL_H, 14); c.fill();
      c.font = '700 18px "Pretendard Variable",system-ui'; c.fillStyle = tools[i][1] ? '#172400' : '#e9ffc9'; c.fillText(tools[i][0], tx + tw / 2, TOOL_Y + TOOL_H / 2 + 1);
    }
    fx.draw(c);
    c.restore(); fx.drawFlash(c, W, H);
  }
  var lastHud = '';
  function hud() {
    if (!D) return;
    var k = Math.floor(time) + '|' + mistakes + '|' + hints; if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score());
    document.getElementById('hB').textContent = fmtT(time);
    document.getElementById('hC').textContent = mistakes + '/3';
    document.getElementById('hMult').textContent = D.name;
  }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return;
    var p = S.toLocal(e);
    if (p.x >= GX && p.x < GX + 9 * CS && p.y >= GY && p.y < GY + 9 * CS) { sel = { x: Math.floor((p.x - GX) / CS), y: Math.floor((p.y - GY) / CS) }; A.sfx('tick'); return; }
    if (p.y >= PAD_Y && p.y <= PAD_Y + PAD_H) { var d = Math.floor((p.x - GX) / CS) + 1; if (d >= 1 && d <= 9) put(d); return; }
    if (p.y >= TOOL_Y && p.y <= TOOL_Y + TOOL_H) { var t = Math.floor((p.x - GX) / (CS * 3)); if (t === 0) erase(); else if (t === 1) { noteMode = !noteMode; A.sfx('click'); } else if (t === 2) hint(); }
  });
  var dbtns = document.querySelectorAll('[data-diff]');
  function paintDiff() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_sudoku_diff', diff); A.sfx('click'); paintDiff(); }); });
  paintDiff();
  var S = new A.Shell({
    id: 'sudoku', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a') sel.x = (sel.x + 8) % 9;
      else if (k === 'ArrowRight' || k === 'd') sel.x = (sel.x + 1) % 9;
      else if (k === 'ArrowUp' || k === 'w') sel.y = (sel.y + 8) % 9;
      else if (k === 'ArrowDown' || k === 's') sel.y = (sel.y + 1) % 9;
      else if (/^[1-9]$/.test(k)) put(+k);
      else if (k === 'Backspace' || k === 'Delete' || k === '0') { e.preventDefault(); erase(); }
      else if (k === 'n' || k === 'N') { noteMode = !noteMode; A.sfx('click'); }
      else if (k === 'h' || k === 'H') hint();
    }
  });
})();
