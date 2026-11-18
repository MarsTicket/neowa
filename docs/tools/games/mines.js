(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var DIFFS = [{ c: 8, r: 10, m: 12, base: 800, name: '쉬움' }, { c: 10, r: 14, m: 24, base: 2500, name: '보통' }, { c: 12, r: 17, m: 42, base: 6000, name: '어려움' }];
  var diff = +A.get('neowa_mines_diff', '0') || 0;
  var fx = new A.FX();
  var land = false, D, cols, rows, CS, GX, GY, cells, started, time, flags, opened, dyingT, winT, flagMode, cur = { x: 0, y: 0 }, kbd = false, boomAt = null, press = null, reveals = [], revT = 0;
  var NUMC = ['', '#5ee7ff', '#7dff9b', '#ff7aa8', '#b48cff', '#ffb547', '#4dffd2', '#ffe066', '#ffffff'];
  var BTN = { x: W / 2 - 130, y: 880, w: 260, h: 58 };

  function layout() {
    D = DIFFS[diff]; cols = D.c; rows = D.r;
    if (land) {
      // 가로 화면: 판을 눕혀서(가로 = 세로줄 수) 그림 → 칸이 훨씬 커짐. 게임 데이터는 그대로
      CS = Math.floor(Math.min((W - 30) / rows, (H - 30) / cols));
      GX = (W - rows * CS) / 2; GY = (H - cols * CS) / 2;
    } else {
      CS = Math.floor(Math.min((W - 30) / cols, (860 - 112) / rows));
      GX = (W - cols * CS) / 2; GY = 112 + (860 - 112 - rows * CS) / 2;
    }
  }
  // 칸 → 화면 좌표 (가로 화면에서는 x·y를 바꿔 그림)
  function sx(q) { return GX + (land ? q.y : q.x) * CS; }
  function sy(q) { return GY + (land ? q.x : q.y) * CS; }
  function geo(sh) { land = !!sh.land; W = sh.W; H = sh.H; layout(); }
  function reset() {
    layout();
    cells = []; for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) cells.push({ x: x, y: y, mine: false, n: 0, open: false, flag: false, t: 0 });
    started = false; time = 0; flags = 0; opened = 0; dyingT = 0; winT = 0; flagMode = false; boomAt = null; reveals = []; revT = 0; press = null; cur = { x: Math.floor(cols / 2), y: Math.floor(rows / 2) };
    fx.clear(); lastHud = ''; hud();
  }
  function at(x, y) { return x < 0 || y < 0 || x >= cols || y >= rows ? null : cells[y * cols + x]; }
  function around(c, f) { for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var n = at(c.x + dx, c.y + dy); if (n) f(n); } }
  // 지뢰 배치: 첫 칸 주변 3x3은 비우고, 논리만으로 끝까지 풀리는 판이 나올 때까지 다시 섞음 (찍기 없는 판)
  function layMines(safe) {
    var pool = []; for (var i = 0; i < cells.length; i++) { var c = cells[i]; c.mine = false; if (Math.abs(c.x - safe.x) > 1 || Math.abs(c.y - safe.y) > 1) pool.push(c); }
    for (i = 0; i < D.m; i++) { var k = Math.floor(Math.random() * pool.length); pool[k].mine = true; pool.splice(k, 1); }
    cells.forEach(function (c) { var n = 0; around(c, function (q) { if (q.mine) n++; }); c.n = n; });
  }
  function solvable(safe) {
    var N = cells.length, known = [], i; // 0 모름, 1 열림, 2 지뢰 확정
    for (i = 0; i < N; i++) known.push(0);
    function nbs(k) { var c = cells[k], out = []; around(c, function (q) { out.push(q.y * cols + q.x); }); return out; }
    var NBS = []; for (i = 0; i < N; i++) NBS.push(nbs(i));
    var left = N - D.m;
    function reveal(k) {
      var q = [k]; if (known[k]) return; known[k] = 1; left--;
      while (q.length) { var a = q.pop(); if (cells[a].n) continue; var nb = NBS[a]; for (var j = 0; j < nb.length; j++) if (!known[nb[j]]) { known[nb[j]] = 1; left--; q.push(nb[j]); } }
    }
    reveal(safe.y * cols + safe.x);
    var changed = true;
    while (changed && left > 0) {
      changed = false;
      var cons = [];
      for (i = 0; i < N; i++) {
        if (known[i] !== 1 || !cells[i].n) continue;
        var nb = NBS[i], unk = [], m = cells[i].n;
        for (var j = 0; j < nb.length; j++) { if (known[nb[j]] === 2) m--; else if (!known[nb[j]]) unk.push(nb[j]); }
        if (!unk.length) continue;
        if (m === 0) { unk.forEach(function (u) { if (!known[u]) { reveal(u); changed = true; } }); }
        else if (m === unk.length) { unk.forEach(function (u) { if (!known[u]) { known[u] = 2; changed = true; } }); }
        else cons.push({ u: unk, m: m });
      }
      if (changed) continue;
      // 두 단서 비교 (한쪽 미지 칸이 다른 쪽에 다 들어 있을 때)
      for (var a = 0; a < cons.length && !changed; a++) for (var b = 0; b < cons.length && !changed; b++) {
        if (a === b) continue;
        var A1 = cons[a], B1 = cons[b];
        if (A1.u.length >= B1.u.length) continue;
        var sub = A1.u.every(function (u) { return B1.u.indexOf(u) >= 0; });
        if (!sub) continue;
        var rest = B1.u.filter(function (u) { return A1.u.indexOf(u) < 0; }), dm = B1.m - A1.m;
        if (dm === 0) rest.forEach(function (u) { if (!known[u]) { reveal(u); changed = true; } });
        else if (dm === rest.length) rest.forEach(function (u) { if (!known[u]) { known[u] = 2; changed = true; } });
      }
      // 남은 지뢰 수 = 남은 칸 수
      if (!changed) { var unknown = 0, flagged = 0; for (i = 0; i < N; i++) { if (!known[i]) unknown++; else if (known[i] === 2) flagged++; } if (unknown && unknown === D.m - flagged) return true; }
    }
    return left <= 0;
  }
  function plant(safe) {
    var t0 = performance.now(), tries = 0;
    do { layMines(safe); tries++; } while (!solvable(safe) && performance.now() - t0 < 120 && tries < 400);
    started = true;
  }
  function open(c, chain) {
    if (!c || c.open || c.flag || dyingT > 0 || winT > 0) return;
    if (!started) plant(c);
    c.open = true; c.t = S.time + (chain || 0) * 0.015; opened++;
    if (c.mine) { lose(c); return; }
    if (c.n === 0) { var q = [c], seen = 0; while (q.length) { var cc = q.shift(); around(cc, function (n) { if (!n.open && !n.flag && !n.mine) { n.open = true; opened++; seen++; n.t = S.time + seen * 0.006; if (n.n === 0) q.push(n); } }); } }
    if (!chain) A.sfx(c.n === 0 ? 'slide' : 'tap', 1 + c.n * 0.06);
    checkWin();
  }
  function chord(c) {
    var f = 0; around(c, function (n) { if (n.flag) f++; });
    if (f !== c.n) { A.sfx('wall'); return; }
    var k = 0; around(c, function (n) { if (!n.open && !n.flag) open(n, ++k); });
    A.sfx('select', 1.1);
  }
  function toggleFlag(c) {
    if (!c || c.open) return;
    c.flag = !c.flag; flags += c.flag ? 1 : -1; A.sfx(c.flag ? 'place' : 'tap', c.flag ? 1.4 : 0.8); A.vibrate(25); hud();
  }
  function act(c, asFlag) {
    if (!c || dyingT > 0 || winT > 0) return;
    if (asFlag) toggleFlag(c); else if (c.open) chord(c); else open(c);
    hud();
  }
  function lose(c) {
    boomAt = c; dyingT = 1.8; fx.burst(sx(c) + CS / 2, sy(c) + CS / 2, '#ff4d6d', 50, 420, 0.9, 4);
    fx.shake(12, 0.5); fx.flashIt('#ff2244', 0.6); A.sfx('bigboom'); A.vibrate(220);
    // 남은 지뢰를 차례로 보여 줌 (setTimeout 대신 시간표로 → 일시정지·다시 하기 때 꼬이지 않음)
    var list = cells.filter(function (q) { return q.mine && q !== c && !q.flag; }), gap = Math.min(0.04, 1.3 / Math.max(1, list.length));
    reveals = list.map(function (q, k) { return { q: q, t: 0.2 + k * gap, k: k }; });
  }
  function stepReveals(dt) {
    revT += dt;
    for (var i = reveals.length - 1; i >= 0; i--) {
      var r = reveals[i]; if (revT < r.t) continue;
      r.q.open = true; r.q.t = 0; fx.burst(sx(r.q) + CS / 2, sy(r.q) + CS / 2, '#ff4d6d', 8, 200, 0.4, 3); if (r.k % 4 === 0) A.sfx('boom');
      reveals.splice(i, 1);
    }
  }
  function checkWin() {
    if (opened >= cols * rows - D.m && dyingT <= 0) {
      winT = 1.4; A.sfx('win'); fx.flashIt('#4dffd2', 0.3);
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
    if (dyingT > 0) { stepReveals(dt); dyingT -= dt; if (dyingT <= 0) S.gameOver(finalScore(false), [['난이도', D.name], ['연 칸', opened + '/' + (cols * rows - D.m)], ['시간', Math.floor(time) + '초']]); return; }
    if (winT > 0) { winT -= dt; if (winT <= 0) { saveTime(); S.gameOver(finalScore(true), [['난이도', D.name], ['기록', time.toFixed(1) + '초'], ['최단', bestTimeTxt()]], { kick: 'CLEAR!', win: true }); } return; }
    if (started) time += dt;
    // 길게 누르기 → 깃발
    if (press && !press.done && performance.now() - press.t > 380) { press.done = true; act(press.c, !flagMode); fx.ring(sx(press.c) + CS / 2, sy(press.c) + CS / 2, '#4dffd2', CS, 0.3); }
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
      var q = cs[i], px = sx(q), py = sy(q), pad = Math.max(1.5, CS * 0.05);
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
        // 졌을 때: 잘못 꽂은 깃발에 X 표시
        if (q.flag && boomAt && !q.mine) { c.strokeStyle = '#ffd166'; c.lineWidth = Math.max(2, CS * 0.08); c.beginPath(); c.moveTo(px + CS * 0.24, py + CS * 0.24); c.lineTo(px + CS * 0.76, py + CS * 0.76); c.moveTo(px + CS * 0.76, py + CS * 0.24); c.lineTo(px + CS * 0.24, py + CS * 0.76); c.stroke(); }
      }
    }
    if (kbd && cells && S.state === 'playing') { c.strokeStyle = '#4dffd2'; c.lineWidth = 3; A.rr(c, sx(cur) + 1, sy(cur) + 1, CS - 2, CS - 2, CS * 0.18); c.stroke(); }
    // 깃발 모드 버튼 (가로 화면에서는 오른쪽 패널의 큰 버튼)
    if (!land) {
    c.fillStyle = flagMode ? '#ff4d6d' : 'rgba(255,255,255,.07)'; A.rr(c, BTN.x, BTN.y, BTN.w, BTN.h, 16); c.fill();
    c.strokeStyle = flagMode ? '#ff4d6d' : 'rgba(255,255,255,.2)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = flagMode ? '#2a0410' : '#e8fffa'; c.font = '700 18px "Pretendard Variable",system-ui';
    c.fillText(flagMode ? '🚩 깃발 꽂기 모드' : '⛏ 열기 모드 (탭해서 전환)', W / 2, BTN.y + BTN.h / 2 + 1);
    }
    fx.draw(c);
    c.restore(); fx.drawFlash(c, W, H);
  }
  var lastHud = '';
  function hud() {
    if (!D) return;
    var k = Math.floor(time) + '|' + flags; if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = started ? A.fmt(Math.max(D.base, Math.round(D.base * 2.5 - time * (D.base / 120)))) : A.fmt(D.base * 2.5);
    document.getElementById('hB').textContent = Math.floor(time);
    document.getElementById('hC').textContent = (D.m - flags);
    document.getElementById('hMult').textContent = D.name;
    paintPanel();
  }
  var pEl = {};
  function paintPanel() {
    if (!pEl.score || !D) return;
    pEl.score.textContent = document.getElementById('hA').textContent; pEl.time.textContent = Math.floor(time || 0); pEl.mines.textContent = D.m - (flags || 0);
    pEl.flag.innerHTML = flagMode ? '🚩 깃발 꽂기 모드 <span class="cnt">켜짐</span>' : '⛏ 열기 모드 <span class="cnt">탭해서 깃발로</span>';
    pEl.flag.disabled = !S || S.state !== 'playing';
  }
  function toggleFlagMode() { if (S.state !== 'playing') return; flagMode = !flagMode; A.sfx('select', flagMode ? 1.2 : 0.9); paintPanel(); }
  function cellAt(p) { var a = Math.floor((p.x - GX) / CS), b = Math.floor((p.y - GY) / CS); return land ? at(b, a) : at(a, b); }
  var stage = document.getElementById('stage');
  stage.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return;
    var p = S.toLocal(e); kbd = false;
    if (!land && p.x > BTN.x && p.x < BTN.x + BTN.w && p.y > BTN.y && p.y < BTN.y + BTN.h) { toggleFlagMode(); return; }
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
  function paintDiff() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); if (!cells || !S || S.state === 'ready') layout(); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_mines_diff', diff); A.sfx('click'); paintDiff(); }); });
  paintDiff();

  var S = new A.Shell({
    id: 'mines', W: W, H: H, land: [900, 640], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); if (reveals.length) stepReveals(dt); }, render: render,
    keydown: function (e) {
      var k = e.key, dx = 0, dy = 0; kbd = true;
      if (k === 'ArrowLeft' || k === 'a') dx = -1; else if (k === 'ArrowRight' || k === 'd') dx = 1;
      else if (k === 'ArrowUp' || k === 'w') dy = -1; else if (k === 'ArrowDown' || k === 's') dy = 1;
      if (land) { var t = dx; dx = dy; dy = t; } // 눕힌 판: 화면 방향 그대로 움직이게
      if (dx || dy) { cur.x = A.clamp(cur.x + dx, 0, cols - 1); cur.y = A.clamp(cur.y + dy, 0, rows - 1); }
      if (k === ' ' || k === 'Enter') act(at(cur.x, cur.y), false);
      else if (k === 'x' || k === 'X') act(at(cur.x, cur.y), true);
    }
  });
  // 가로 화면 오른쪽 패널: 점수판 + 큰 깃발 모드 버튼 (게임판 위 점수판은 가로에서 숨김)
  document.querySelector('.g-hud').setAttribute('data-land-hide', '');
  S.panelSlot.innerHTML = '<div class="g-card gp-stats"><div><span>SCORE</span><b id="pkScore">0</b></div><div><span>TIME</span><b id="pkTime">0</b></div><div><span>MINES</span><b id="pkMines">0</b></div></div>' +
    '<button class="gp-btn main" id="pkFlag"></button>';
  pEl = { score: document.getElementById('pkScore'), time: document.getElementById('pkTime'), mines: document.getElementById('pkMines'), flag: document.getElementById('pkFlag') };
  pEl.flag.addEventListener('click', toggleFlagMode);
  new MutationObserver(function () { paintPanel(); }).observe(document.body, { attributes: true, attributeFilter: ['data-state'] });
  layout(); paintPanel();
})();
