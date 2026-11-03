(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var DIFFS = [{ c: 8, r: 10, m: 12, base: 800, name: '쉬움' }, { c: 10, r: 14, m: 24, base: 2500, name: '보통' }, { c: 12, r: 17, m: 42, base: 6000, name: '어려움' }];
  var diff = +A.get('neowa_mines_diff', '0') || 0;
  var fx = new A.FX();
  var D, cols, rows, CS, GX, GY, cells, started, time, flags, opened, dyingT, winT, flagMode, cur = { x: 0, y: 0 }, kbd = false, boomAt = null, press = null;
  var NUMC = ['', '#5ee7ff', '#7dff9b', '#ff7aa8', '#b48cff', '#ffb547', '#4dffd2', '#ffe066', '#ffffff'];
  var BTN = { x: W / 2 - 130, y: 880, w: 260, h: 58 };

  function layout() {
    D = DIFFS[diff]; cols = D.c; rows = D.r;
    CS = Math.floor(Math.min((W - 30) / cols, (860 - 112) / rows));
    GX = (W - cols * CS) / 2; GY = 112 + (860 - 112 - rows * CS) / 2;
  }
  function reset() {
    layout();
    cells = []; for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) cells.push({ x: x, y: y, mine: false, n: 0, open: false, flag: false, t: 0 });
    started = false; time = 0; flags = 0; opened = 0; dyingT = 0; winT = 0; flagMode = false; boomAt = null; cur = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
    fx.clear(); hud();
  }
  function at(x, y) { return x < 0 || y < 0 || x >= cols || y >= rows ? null : cells[y * cols + x]; }
  function around(c, f) { for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var n = at(c.x + dx, c.y + dy); if (n) f(n); } }
  function plant(safe) {
    var pool = cells.filter(function (c) { return Math.abs(c.x - safe.x) > 1 || Math.abs(c.y - safe.y) > 1; });
    for (var i = 0; i < D.m; i++) { var k = Math.floor(Math.random() * pool.length); pool[k].mine = true; pool.splice(k, 1); }
    cells.forEach(function (c) { var n = 0; around(c, function (q) { if (q.mine) n++; }); c.n = n; });
    started = true;
  }
  function open(c, chain) {
    if (!c || c.open || c.flag) return;
    if (!started) plant(c);
    c.open = true; c.t = S.time + (chain || 0) * 0.015; opened++;
    if (c.mine) { lose(c); return; }
    if (c.n === 0) { var q = [c], seen = 0; while (q.length) { var cc = q.shift(); around(cc, function (n) { if (!n.open && !n.flag && !n.mine) { n.open = true; opened++; seen++; n.t = S.time + seen * 0.006; if (n.n === 0) q.push(n); } }); } }
    if (!chain) A.sfx('click');
    checkWin();
  }
  function chord(c) {
    var f = 0; around(c, function (n) { if (n.flag) f++; });
    if (f !== c.n) { A.sfx('wall'); return; }
    var k = 0; around(c, function (n) { if (!n.open && !n.flag) open(n, ++k); });
    A.sfx('click', 1.2);
  }
  function toggleFlag(c) {
    if (!c || c.open) return;
    c.flag = !c.flag; flags += c.flag ? 1 : -1; A.sfx(c.flag ? 'turn' : 'click', c.flag ? 1.5 : 0.8); A.vibrate(25); hud();
  }
  function act(c, asFlag) {
    if (!c || dyingT > 0 || winT > 0) return;
    if (asFlag) toggleFlag(c); else if (c.open) chord(c); else open(c);
    hud();
  }
  function lose(c) {
    boomAt = c; dyingT = 1.8; fx.burst(GX + c.x * CS + CS / 2, GY + c.y * CS + CS / 2, '#ff4d6d', 50, 420, 0.9, 4);
    fx.shake(12, 0.5); fx.flashIt('#ff2244', 0.6); A.sfx('bigboom'); A.vibrate(220);
    var k = 0; cells.forEach(function (q) { if (q.mine && q !== c) { k++; (function (qq, kk) { setTimeout(function () { qq.open = true; fx.burst(GX + qq.x * CS + CS / 2, GY + qq.y * CS + CS / 2, '#ff4d6d', 8, 200, 0.4, 3); if (kk % 4 === 0) A.sfx('boom'); }, 200 + kk * 40); })(q, k); } });
  }
  function checkWin() {
    if (opened >= cols * rows - D.m && dyingT <= 0) {
      winT = 1.4; A.sfx('level'); fx.flashIt('#4dffd2', 0.3);
      cells.forEach(function (q) { if (q.mine && !q.flag) { q.flag = true; flags++; } });
      for (var i = 0; i < 6; i++) fx.burst(A.rand(80, W - 80), A.rand(200, 700), A.pick(['#4dffd2', '#ffd166', '#5ee7ff']), 26, 400, 0.9, 4);
    }
  }
  function finalScore(win) {
    if (win) return Math.round(D.base + Math.max(0, D.base * 1.5 - time * (D.base / 120)));
    return Math.round((opened / (cols * rows - D.m)) * D.base * 0.3);
  }
  function update(dt) {
    fx.update(dt);
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) S.gameOver(finalScore(false), [['난이도', D.name], ['연 칸', opened + '/' + (cols * rows - D.m)], ['시간', Math.floor(time) + '초']]); return; }
    if (winT > 0) { winT -= dt; if (winT <= 0) { saveTime(); S.gameOver(finalScore(true), [['난이도', D.name], ['기록', time.toFixed(1) + '초'], ['최단', bestTimeTxt()]], { kick: 'CLEAR!', win: true }); } return; }
    if (started) time += dt;
    // 길게 누르기 → 깃발
    if (press && !press.done && performance.now() - press.t > 380) { press.done = true; act(press.c, !flagMode); fx.ring(GX + press.c.x * CS + CS / 2, GY + press.c.y * CS + CS / 2, '#4dffd2', CS, 0.3); }
    hud();
  }
  function saveTime() { var k = 'neowa_mines_time_' + diff, b = parseFloat(A.get(k, '0')) || 0; if (!b || time < b) A.set(k, time.toFixed(1)); }
  function bestTimeTxt() { var b = parseFloat(A.get('neowa_mines_time_' + diff, '0')); return b ? b.toFixed(1) + '초' : '-'; }

  var TILE = null;
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#04110f'); g.addColorStop(1, '#071a1a'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    if (!cells) { layout(); }
    var cs = cells || [];
    if (!cells) { for (var yy = 0; yy < rows; yy++) for (var xx = 0; xx < cols; xx++) cs.push({ x: xx, y: yy, open: (xx * 7 + yy * 3) % 5 === 0, n: (xx + yy) % 4, flag: (xx * yy) % 11 === 3 }); }
    c.font = '700 ' + Math.round(CS * 0.52) + 'px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (var i = 0; i < cs.length; i++) {
      var q = cs[i], px = GX + q.x * CS, py = GY + q.y * CS, pad = Math.max(1.5, CS * 0.05);
      var shown = q.open && (!q.t || t >= q.t);
      if (shown) {
        c.fillStyle = q.mine ? (q === boomAt ? '#ff4d6d' : 'rgba(255,77,109,.25)') : 'rgba(77,255,210,.06)';
        A.rr(c, px + pad, py + pad, CS - pad * 2, CS - pad * 2, CS * 0.16); c.fill();
        if (q.mine) { c.fillStyle = '#fff'; c.beginPath(); c.arc(px + CS / 2, py + CS / 2, CS * 0.2, 0, 7); c.fill(); }
        else if (q.n) { c.fillStyle = NUMC[q.n]; c.fillText(String(q.n), px + CS / 2, py + CS / 2 + 1); }
      } else {
        var gg = c.createLinearGradient(0, py, 0, py + CS); gg.addColorStop(0, '#1e4a47'); gg.addColorStop(1, '#123230');
        c.fillStyle = gg; A.rr(c, px + pad, py + pad, CS - pad * 2, CS - pad * 2, CS * 0.16); c.fill();
        c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(px + pad * 3, py + pad * 2, CS - pad * 6, 2);
        if (q.flag) { c.fillStyle = '#ff4d6d'; c.beginPath(); c.moveTo(px + CS * 0.38, py + CS * 0.22); c.lineTo(px + CS * 0.72, py + CS * 0.36); c.lineTo(px + CS * 0.38, py + CS * 0.5); c.fill(); c.fillStyle = '#fff'; c.fillRect(px + CS * 0.36, py + CS * 0.22, CS * 0.05, CS * 0.56); }
      }
    }
    if (kbd && cells && S.state === 'playing') { c.strokeStyle = '#4dffd2'; c.lineWidth = 3; A.rr(c, GX + cur.x * CS + 1, GY + cur.y * CS + 1, CS - 2, CS - 2, CS * 0.18); c.stroke(); }
    // 깃발 모드 버튼
    c.fillStyle = flagMode ? '#ff4d6d' : 'rgba(255,255,255,.07)'; A.rr(c, BTN.x, BTN.y, BTN.w, BTN.h, 16); c.fill();
    c.strokeStyle = flagMode ? '#ff4d6d' : 'rgba(255,255,255,.2)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = flagMode ? '#2a0410' : '#e8fffa'; c.font = '700 18px "Pretendard Variable",system-ui';
    c.fillText(flagMode ? '🚩 깃발 꽂기 모드' : '⛏ 열기 모드 (탭해서 전환)', W / 2, BTN.y + BTN.h / 2 + 1);
    fx.draw(c);
    c.restore(); fx.drawFlash(c, W, H);
  }
  var lastHud = '';
  function hud() {
    if (!D) return;
    var k = Math.floor(time) + '|' + flags; if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = started ? A.fmt(Math.max(0, Math.round(D.base * 2.5 - time * (D.base / 120)))) : A.fmt(D.base * 2.5);
    document.getElementById('hB').textContent = Math.floor(time);
    document.getElementById('hC').textContent = (D.m - flags);
    document.getElementById('hMult').textContent = D.name;
  }
  function cellAt(p) { var x = Math.floor((p.x - GX) / CS), y = Math.floor((p.y - GY) / CS); return at(x, y); }
  var stage = document.getElementById('stage');
  stage.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return;
    var p = S.toLocal(e); kbd = false;
    if (p.x > BTN.x && p.x < BTN.x + BTN.w && p.y > BTN.y && p.y < BTN.y + BTN.h) { flagMode = !flagMode; A.sfx('click'); return; }
    var c = cellAt(p); if (!c) return;
    if (e.button === 2) { act(c, true); return; }
    press = { c: c, t: performance.now(), id: e.pointerId, done: false };
  });
  stage.addEventListener('pointerup', function (e) {
    if (!press || press.id !== e.pointerId) return;
    if (!press.done) act(press.c, flagMode);
    press = null;
  });
  stage.addEventListener('pointermove', function (e) { if (press && cellAt(S.toLocal(e)) !== press.c) press = null; });
  stage.addEventListener('pointercancel', function () { press = null; });
  // 난이도 선택
  var dbtns = document.querySelectorAll('[data-diff]');
  function paintDiff() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); layout(); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_mines_diff', diff); A.sfx('click'); paintDiff(); }); });
  paintDiff();

  var S = new A.Shell({
    id: 'mines', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) {
      var k = e.key; kbd = true;
      if (k === 'ArrowLeft' || k === 'a') cur.x = Math.max(0, cur.x - 1);
      else if (k === 'ArrowRight' || k === 'd') cur.x = Math.min(cols - 1, cur.x + 1);
      else if (k === 'ArrowUp' || k === 'w') cur.y = Math.max(0, cur.y - 1);
      else if (k === 'ArrowDown' || k === 's') cur.y = Math.min(rows - 1, cur.y + 1);
      else if (k === ' ' || k === 'Enter') act(at(cur.x, cur.y), false);
      else if (k === 'x' || k === 'X') act(at(cur.x, cur.y), true);
    }
  });
})();
