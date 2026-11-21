(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CW = 58, CH = 70, FONT = 30;
  var SYM = ['★', '♥', '♦', '♣', '♠', '●', '▲', '■', '☀', '☾', '✿', '♪', '✚', '⚡', '☂', '✈'];
  var COL = ['#ffd166', '#ff4d6d', '#5ee7ff', '#7dff9b', '#b48cff', '#ff7a45', '#ff9ecf', '#c3ff5e', '#ffe066', '#9be7ff', '#ff5ec4', '#4dffd2', '#ffb547', '#7aa2ff', '#5effc8', '#ff9e4d'];
  var fx = new A.FX();
  var land = false, COLS, ROWS, GX, GY, b, sel, time, score, stage, path, pathT, combo, dyingT, cur = { x: 0, y: 0 }, kbd = false, hintPair = null, comboT = 0;
  // 판: (COLS+2)×(ROWS+2), 바깥 테두리는 항상 빈칸 (선이 판 밖으로 돌아 나갈 수 있게)
  function idx(x, y) { return y * (COLS + 2) + x; }
  function setup() {
    COLS = Math.min(8, 6 + Math.floor(stage / 2)); ROWS = Math.min(10, 6 + stage); if ((COLS * ROWS) % 2) ROWS--;
    layout();
    var kinds = Math.min(SYM.length, 6 + stage * 2), list = [];
    for (var i = 0; i < COLS * ROWS / 2; i++) { var k = i % kinds; list.push(k, k); }
    shuffle(list);
    b = []; for (i = 0; i < (COLS + 2) * (ROWS + 2); i++) b.push(-1);
    var n = 0; for (var y = 1; y <= ROWS; y++) for (var x = 1; x <= COLS; x++) b[idx(x, y)] = list[n++];
    if (!findPair()) setup();
    sel = null; path = null; hintPair = null; cur.x = Math.min(cur.x, COLS - 1); cur.y = Math.min(cur.y, ROWS - 1);
  }
// 세로: 540×960 / 가로 화면: 720×720 정사각형 판 (힌트 버튼·점수판은 오른쪽 패널)
  function layout() { if (!COLS) return; if (land) { CW = Math.min(90, Math.floor(700 / (COLS + 2))); CH = Math.min(Math.floor(700 / (ROWS + 2)), Math.round(CW * 1.25)); if (CW > CH) CW = CH; GX = (W - (COLS + 2) * CW) / 2; GY = (H - (ROWS + 2) * CH) / 2; } else { CW = Math.min(64, Math.floor(530 / (COLS + 2))); CH = Math.min(78, Math.floor(720 / (ROWS + 2)), Math.round(CW * 1.25)); GX = (W - (COLS + 2) * CW) / 2; GY = 140 + (720 - (ROWS + 2) * CH) / 2; } FONT = Math.round(CW * 0.52); }
  function geo(sh) { land = !!sh.land; W = sh.W; H = sh.H; layout(); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = A.irand(0, i), t = a[i]; a[i] = a[j]; a[j] = t; } }
  // 최소 꺾임 수 BFS로 두 칸 사이 경로 찾기 (2번 이하로 꺾임)
  function connect(a, z) {
    var Wd = COLS + 2, Hd = ROWS + 2, ax = a % Wd, ay = Math.floor(a / Wd), zx = z % Wd, zy = Math.floor(z / Wd);
    var D = [[1, 0], [-1, 0], [0, 1], [0, -1]], best = {}, q = [];
    for (var d = 0; d < 4; d++) q.push({ x: ax, y: ay, d: d, t: 0, p: [[ax, ay]] });
    while (q.length) {
      var s = q.shift(), nx = s.x + D[s.d][0], ny = s.y + D[s.d][1];
      if (nx < 0 || ny < 0 || nx >= Wd || ny >= Hd) continue;
      var np = s.p.concat([[nx, ny]]);
      if (nx === zx && ny === zy) return np;
      if (b[ny * Wd + nx] !== -1) continue;
      for (var nd = 0; nd < 4; nd++) { var t = s.t + (nd === s.d ? 0 : 1); if (t > 2) continue; var key = nx + ',' + ny + ',' + nd; if (best[key] != null && best[key] <= t) continue; best[key] = t; if (nd === s.d) q.unshift({ x: nx, y: ny, d: nd, t: t, p: np }); else q.push({ x: nx, y: ny, d: nd, t: t, p: np }); }
    }
    return null;
  }
  function findPair() {
    var tiles = []; b.forEach(function (v, i) { if (v >= 0) tiles.push(i); });
    for (var i = 0; i < tiles.length; i++) for (var j = i + 1; j < tiles.length; j++) if (b[tiles[i]] === b[tiles[j]] && connect(tiles[i], tiles[j])) return [tiles[i], tiles[j]];
    return null;
  }
  function reshuffle() { var vals = [], pos = []; b.forEach(function (v, i) { if (v >= 0) { vals.push(v); pos.push(i); } }); for (var t = 0; t < 300; t++) { shuffle(vals); pos.forEach(function (p, k) { b[p] = vals[k]; }); if (findPair()) break; } fx.text(W / 2, H / 2, '섞는 중…', '#fff', 24); A.sfx('deal'); }
  function reset() { maxCombo = 0; cleared = 0; tutPair = null; stage = 1; time = 120; score = 0; combo = 0; comboT = 0; dyingT = 0; setup(); fx.clear(); hud(); }
  // 첫 플레이 안내: 처음 한 판에만 판 위에 손가락 안내를 띄우고, 첫 올바른 행동을 하면 사라짐 (neowa_pairs_tut = 1)
  var tut = A.get('neowa_pairs_tut', '') !== '1';
  function tutDone() { if (tut) { tut = false; A.set('neowa_pairs_tut', '1'); } }
  function isTouch() { return document.body.classList.contains('touch'); }
  function drawTut(c, x, y, msg) {
    if (!tut || S.state !== 'playing') return;
    var t = S.time;
    // 안내 말풍선은 판 바깥(위·아래 빈 곳)에 두어 타일을 가리지 않게 한다
    var bTop = GY, bBot = GY + (ROWS + 2) * CH, by = (y - GY) < (ROWS + 2) * CH * 0.5 ? bTop - 34 : bBot + 34;
    by = A.clamp(by, 46, H - 46);
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    var rr = 26 + 6 * Math.sin(t * 6); c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 8; c.beginPath(); c.arc(x, y, rr, 0, 7); c.stroke(); c.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(t * 6)) + ')'; c.lineWidth = 4; c.stroke();
    c.font = '700 17px "Pretendard Variable",system-ui'; var w = Math.min(W - 24, c.measureText(msg).width + 30), bx = A.clamp(x, w / 2 + 12, W - w / 2 - 12);
    // 말풍선 → 타일 점선 화살표
    var edge = by < y ? by + 22 : by - 22, d = by < y ? 1 : -1;
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.setLineDash && c.setLineDash([5, 6]);
    c.beginPath(); c.moveTo(bx, edge); c.lineTo(x, y - d * (28 + rr * 0.4)); c.stroke(); c.setLineDash && c.setLineDash([]);
    c.fillStyle = 'rgba(255,255,255,.9)'; var ay = y - d * (24 + rr * 0.4);
    c.beginPath(); c.moveTo(x, ay); c.lineTo(x - 8, ay + d * 12); c.lineTo(x + 8, ay + d * 12); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,.82)'; A.rr(c, bx - w / 2, by - 21, w, 42, 13); c.fill(); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#fff'; c.fillText(msg, bx, by + 1);
    c.restore();
  }
  var maxCombo = 0, cleared = 0, tutPair = null;
  function choose(i) {
    if (S.state !== 'playing' || dyingT > 0 || b[i] < 0) return;
    if (sel == null) { sel = i; A.sfx('select', 1.2); return; }
    if (sel === i) { sel = null; A.sfx('tap', 0.8); return; }
    if (b[sel] !== b[i]) { sel = i; A.sfx('select', 1.2); return; }
    var p = connect(sel, i);
    if (!p) { A.sfx('wrong'); combo = 0; sel = i; return; }
    // 콤보: 3초 안에 다음 짝을 지워야 이어짐
    if (comboT <= 0) combo = 0; path = p; pathT = 0.3; combo++; maxCombo = Math.max(maxCombo, combo); cleared++; tutDone(); comboT = 3; var pts = 10 * Math.min(5, combo); score += pts;
    if (combo >= 2) { var mx = sel % (COLS + 2), my = Math.floor(sel / (COLS + 2)); fx.text(GX + (mx + 0.5) * CW, GY + my * CH, combo + ' 콤보 +' + pts, '#c3ff5e', 18); }
    [sel, i].forEach(function (k) { var x = k % (COLS + 2), y = Math.floor(k / (COLS + 2)); fx.burst(GX + (x + 0.5) * CW, GY + (y + 0.5) * CH, COL[b[k]], 10, 200, 0.4, 3); b[k] = -1; });
    A.sfx('match', 1 + Math.min(combo, 12) * 0.05); if (combo > 1) A.sfx('combo', 1 + Math.min(combo, 12) * 0.05); sel = null; hintPair = null;
    if (b.every(function (v) { return v < 0; })) { var bonus = Math.round(time * 3) + stage * 100; score += bonus; time += 45; stage++; fx.text(W / 2, H / 2, '판 클리어! +' + bonus, '#c3ff5e', 26); A.sfx('level'); setup(); S.banner('STAGE ' + stage, '+45초'); }
    else if (!findPair()) reshuffle();
    hud();
  }
  function hint() { var p = findPair(); if (p) { hintPair = p; time = Math.max(0, time - 5); fx.text(W / 2, land ? H / 2 : 120, '힌트 -5초', '#c3ff5e', 18); A.sfx('power'); } }
  function update(dt) {
    fx.update(dt); if (comboT > 0) { comboT -= dt; if (comboT <= 0) { combo = 0; hud(); } } if (pathT > 0) { pathT -= dt; if (pathT <= 0) path = null; }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) { var bk = 'neowa_pairs_stage', bs = A.getInt(bk); if (stage > bs) A.set(bk, stage); S.gameOver(score, [['단계', stage + (stage > bs ? ' (최고!)' : ' / 최고 ' + bs)], ['지운 짝', cleared + '쌍'], ['최대 콤보', maxCombo + '연속']]); } return; }
    time -= dt; if (time > 5) warnN = 0; else if (time > 0 && Math.ceil(time) !== warnN) { warnN = Math.ceil(time); A.sfx('warn'); } if (time <= 0) { time = 0; dyingT = 1; A.sfx('hurt'); }
    hud();
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0a1004'; c.fillRect(-10, -10, W + 20, H + 20);
    if (!b) { stage = 1; setup(); }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (var y = 0; y < ROWS + 2; y++) for (var x = 0; x < COLS + 2; x++) {
      var i = idx(x, y), v = b[i]; if (v < 0) continue; var px = GX + x * CW, py = GY + y * CH, s = sel === i, h = hintPair && hintPair.indexOf(i) >= 0 && Math.floor(t * 4) % 2;
      c.fillStyle = '#2a2f1c'; A.rr(c, px + 3, py + 6, CW - 6, CH - 6, 9); c.fill();
      c.fillStyle = s ? '#e9ffc9' : h ? '#4a5a2a' : '#f1f4e6'; A.rr(c, px + 3, py + 2, CW - 6, CH - 8, 9); c.fill();
      c.fillStyle = COL[v]; c.font = '700 ' + FONT + 'px system-ui'; c.fillText(SYM[v], px + CW / 2, py + CH / 2 - 2);
      if (s) { c.strokeStyle = '#c3ff5e'; c.lineWidth = 3; A.rr(c, px + 2, py + 1, CW - 4, CH - 6, 10); c.stroke(); }
    }
    if (kbd && S.state === 'playing') { c.strokeStyle = '#fff'; c.lineWidth = 3; A.rr(c, GX + (cur.x + 1) * CW + 1, GY + (cur.y + 1) * CH, CW - 2, CH - 2, 10); c.stroke(); }
    if (path) { c.save(); c.shadowColor = '#c3ff5e'; c.shadowBlur = 12; c.strokeStyle = '#c3ff5e'; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath(); path.forEach(function (p, k) { c[k ? 'lineTo' : 'moveTo'](GX + (p[0] + 0.5) * CW, GY + (p[1] + 0.5) * CH); }); c.stroke(); c.restore(); }
    if (!land) { c.fillStyle = 'rgba(195,255,94,.12)'; A.rr(c, W / 2 - 80, 880, 160, 52, 14); c.fill(); c.fillStyle = '#c3ff5e'; c.font = '700 17px "Pretendard Variable",system-ui'; c.fillText('힌트 (-5초)', W / 2, 906); }
    if (tut && b && S.state === 'playing') { if (!tutPair || b[tutPair[0]] < 0 || b[tutPair[1]] < 0) tutPair = findPair(); if (tutPair) { var tk = sel === tutPair[0] ? tutPair[1] : tutPair[0], tx = GX + (tk % (COLS + 2) + 0.5) * CW, ty = GY + (Math.floor(tk / (COLS + 2)) + 0.5) * CH; drawTut(c, tx, ty, sel === tutPair[0] ? '같은 그림을 하나 더 누르세요' : (isTouch() ? '같은 그림 두 개를 차례로 탭' : '같은 그림 두 개를 차례로 클릭')); } }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '', warnN = 0;
  function hud() { var left = b ? b.filter(function (v) { return v >= 0; }).length : 0, k = score + '|' + left + '|' + Math.ceil(time) + '|' + combo; if (k === last) return; last = k; document.getElementById('hMult').textContent = combo >= 2 ? '콤보 ×' + Math.min(5, combo) : ''; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = left; var tt = document.getElementById('hC'); tt.textContent = Math.ceil(time); tt.style.color = time < 15 ? '#ff4d6d' : ''; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e);
    if (!land && p.y > 880 && p.y < 932 && Math.abs(p.x - W / 2) < 80) { hint(); return; }
    var x = Math.floor((p.x - GX) / CW), y = Math.floor((p.y - GY) / CH); if (x >= 1 && y >= 1 && x <= COLS && y <= ROWS) choose(idx(x, y));
  });
    // 가로 화면 패널: 점수판 복사본 + 큰 버튼 (게임판 위 점수판은 가로에서 숨김)
  function landPanel(btns) {
    var hudEl = document.querySelector('.g-hud'), ids = ['hA', 'hB', 'hC'], h = '<div class="g-card gp-stats">';
    hudEl.setAttribute('data-land-hide', '');
    ids.forEach(function (id) { var v = document.getElementById(id), lb = v.parentNode.querySelector('.h-lb'); h += '<div><span>' + (lb ? lb.textContent : '') + '</span><b id="pk' + id + '" style="font-size:22px"></b></div>'; });
    h += '</div><div id="pkMult" style="min-height:18px;padding:0 6px;font-size:14px;font-weight:700;color:var(--accent)"></div>' + (btns || '');
    S.panelSlot.innerHTML = h;
    function sync() { ids.forEach(function (id) { var v = document.getElementById(id), d = document.getElementById('pk' + id); d.textContent = v.textContent; d.style.color = v.style.color; }); var m = document.getElementById('hMult'); document.getElementById('pkMult').textContent = m ? m.textContent : ''; }
    new MutationObserver(sync).observe(hudEl, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style'] });
    sync();
  }
  var S = new A.Shell({ id: 'pairs', W: W, H: H, land: [720, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key;
      if (k === 'ArrowLeft' || k === 'a') cur.x = Math.max(0, cur.x - 1); if (k === 'ArrowRight' || k === 'd') cur.x = Math.min(COLS - 1, cur.x + 1);
      if (k === 'ArrowUp' || k === 'w') cur.y = Math.max(0, cur.y - 1); if (k === 'ArrowDown' || k === 's') cur.y = Math.min(ROWS - 1, cur.y + 1);
      if ((k === ' ' || k === 'Enter') && !e.repeat) choose(idx(cur.x + 1, cur.y + 1)); if (k === 'h' || k === 'H') hint(); } });
  landPanel('<button class="gp-btn main" id="pkHint">힌트 보기 <span class="cnt">-5초</span></button>');
  document.getElementById('pkHint').addEventListener('click', function () { if (S.state === 'playing' && dyingT <= 0) hint(); });
})();
