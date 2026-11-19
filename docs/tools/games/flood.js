(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, NC = 6;
  var COLS = ['#ff5ec4', '#5ee7ff', '#ffd166', '#7dff9b', '#b48cff', '#ff7a45'];
  var CFG = [{ n: 10, m: 18, b: 100 }, { n: 14, m: 25, b: 250 }, { n: 18, m: 32, b: 500 }];
  var diff = +A.get('neowa_flood_diff', '0') || 0;
  var fx = new A.FX();
  var land = false, N, CS, GX, GY, grid, moves, maxM, wins = 0, score, region, ripple, dyingT, nextT, cpu = 0;
  // 컴퓨터 풀이(2수 앞을 보는 욕심쟁이)로 몇 번에 풀리는지 계산 → 제한 횟수 안에 풀 수 있는 판만 냄
  function cpuSolve(g) {
    var R = new Uint8Array(N * N), m = 0, cur = g[0], i; R[0] = 1;
    function grow(Rr, col) { var st = [], add = 0, j; for (j = 0; j < N * N; j++) if (Rr[j]) st.push(j); while (st.length) { j = st.pop(); var x = j % N, y = (j / N) | 0; for (var d = 0; d < 4; d++) { var nx = x + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = y + (d === 2 ? 1 : d === 3 ? -1 : 0); if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; var ni = ny * N + nx; if (Rr[ni] || g[ni] !== col) continue; Rr[ni] = 1; add++; st.push(ni); } } return add; }
    function left(Rr) { var o = {}, n = 0; for (var j = 0; j < N * N; j++) if (!Rr[j] && !o[g[j]]) { o[g[j]] = 1; n++; } return n; }
    grow(R, cur);
    while (m < 99) {
      var t = 0; for (i = 0; i < N * N; i++) t += R[i]; if (t === N * N) return m;
      var best = -1, bc = 0, cl = left(R);
      for (var c = 0; c < NC; c++) { if (c === cur) continue; var R1 = R.slice(), a = grow(R1, c); if (!a) continue; var v = a + (left(R1) < cl ? 1000 : 0), b2 = 0;
        for (var c2 = 0; c2 < NC; c2++) { if (c2 === c) continue; var a2 = grow(R1.slice(), c2); if (a2 > b2) b2 = a2; } v += b2 * 0.9; if (v > best) { best = v; bc = c; } }
      grow(R, bc); cur = bc; m++;
    }
    return m;
  }
// 세로: 540×960 / 가로 화면: 720×720 정사각형 판 (색 버튼·점수판은 오른쪽 패널)
  function layout() { if (!N) return; if (land) { CS = Math.floor(680 / N); GX = (W - N * CS) / 2; GY = (H - N * CS) / 2; } else { CS = Math.floor(500 / N); GX = (W - N * CS) / 2; GY = 130 + (560 - N * CS) / 2; } }
  function geo(sh) { land = !!sh.land; W = sh.W; H = sh.H; layout(); if (S && score != null) hud(); }
  // 오늘의 퍼즐: 로컬 날짜(YYYYMMDD)로 시드를 고정 → 오늘은 누구나 같은 판
  function ymd() { var d = new Date(); return '' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2); }
  function seeded(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // 첫 플레이 안내: 처음 한 판에만 판 위에 손가락 안내를 띄우고, 첫 올바른 행동을 하면 사라짐 (neowa_flood_tut = 1)
  var tut = A.get('neowa_flood_tut', '') !== '1';
  function tutDone() { if (tut) { tut = false; A.set('neowa_flood_tut', '1'); } }
  function isTouch() { return document.body.classList.contains('touch'); }
  function drawTut(c, x, y, msg, up) {
    if (!tut || S.state !== 'playing') return;
    var t = S.time, by = up ? y - 70 : y + 70;
    c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
    var rr = 26 + 6 * Math.sin(t * 6); c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 8; c.beginPath(); c.arc(x, y, rr, 0, 7); c.stroke(); c.strokeStyle = 'rgba(255,255,255,' + (0.6 + 0.4 * Math.sin(t * 6)) + ')'; c.lineWidth = 4; c.stroke();
    c.font = '700 18px "Pretendard Variable",system-ui'; var w = Math.min(W - 24, c.measureText(msg).width + 32), bx = A.clamp(x, w / 2 + 12, W - w / 2 - 12);
    c.fillStyle = 'rgba(0,0,0,.78)'; A.rr(c, bx - w / 2, by - 22, w, 44, 14); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.stroke();
    c.fillStyle = '#fff'; c.fillText(msg, bx, by + 1);
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); var ay = up ? y - 44 + 4 * Math.sin(t * 6) : y + 44 - 4 * Math.sin(t * 6), d = up ? -1 : 1; c.moveTo(x, ay - d * 10); c.lineTo(x - 9, ay + d * 2); c.lineTo(x + 9, ay + d * 2); c.closePath(); c.fill();
    c.restore();
  }
  // 난이도 버튼 4번째 = 오늘의 퍼즐 (보통 크기 14×14, 판마다 날짜 시드로 모두 같은 판)
  var DAILY = 3, beats = 0;
  function cfg() { return CFG[diff === DAILY ? 1 : diff]; }
  function setup() {
    var cf = cfg(), i, tries = 0, rnd = diff === DAILY ? seeded(+ymd() * 41 + wins * 1009) : Math.random; N = cf.n; layout();
    do { grid = []; for (i = 0; i < N * N; i++) grid.push(Math.floor(rnd() * NC)); cpu = cpuSolve(grid); } while (cpu > cf.m - 2 && ++tries < 60);
    // 처음엔 컴퓨터보다 4번 넉넉하게, 판을 풀 때마다 1번씩 줄어듦 (컴퓨터 풀이 +1 아래로는 안 내려감)
    maxM = cpu + Math.max(1, 4 - (wins || 0));
    moves = 0; ripple = {}; calc();
  }
  function calc() { region = {}; var c = grid[0], q = [0]; region[0] = 0; while (q.length) { var i = q.shift(), x = i % N, y = Math.floor(i / N); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = x + d[0], ny = y + d[1], ni = ny * N + nx; if (nx < 0 || ny < 0 || nx >= N || ny >= N || region[ni] != null || grid[ni] !== c) return; region[ni] = region[i] + 1; q.push(ni); }); } }
  function reset() { wins = 0; beats = 0; score = 0; dyingT = 0; nextT = 0; setup(); fx.clear(); hud(); }
  function pick(col) {
    if (S.state !== 'playing' || dyingT > 0 || nextT > 0 || col === grid[0]) return;
    var before = Object.keys(region).length;
    Object.keys(region).forEach(function (k) { grid[k] = col; ripple[k] = region[k] * 0.012; });
    moves++; tutDone(); calc(); var gained = Object.keys(region).length - before; A.sfx('splash', 0.8 + Math.min(1, gained / 20));
    Object.keys(region).forEach(function (k) { if (ripple[k] == null) ripple[k] = region[k] * 0.012; });
    if (Object.keys(region).length === N * N) { var beat = moves <= cpu; if (beat) beats++; var pts = cfg().b + (maxM - moves) * 30 + (beat ? cfg().b : 0); score += pts; wins++; nextT = 1.2; A.sfx('win'); if (beat) A.sfx('gold'); fx.text(W / 2, land ? H / 2 : GY - 30, (moves < cpu ? '컴퓨터 이김! +' : beat ? '컴퓨터와 동점! +' : '완성! +') + pts, '#ffd166', 26); for (var i = 0; i < 4; i++) fx.burst(A.rand(100, W - 100), A.rand(H * 0.25, H * 0.7), COLS[col], 20, 300, 0.7, 4); }
    else if (moves >= maxM) { dyingT = 1.2; A.sfx('hurt'); fx.flashIt('#ff2244', 0.4); }
    else if (maxM - moves <= 3) A.sfx('warn');
    hud();
  }
  // 종료 화면: 완성한 판(개인 최고 대비), 컴퓨터를 이긴 판, 오늘의 퍼즐이면 오늘 최고
  function endGame() {
    var bk = 'neowa_flood_wins', bw = A.getInt(bk), meta = [['완성한 판', wins + (wins > bw ? ' (최고!)' : ' / 최고 ' + bw)], ['컴퓨터 이김', beats + '판']];
    if (wins > bw) A.set(bk, wins);
    if (diff === DAILY) { var dk = 'neowa_flood_daily_' + ymd(), db = A.getInt(dk); if (score > db) A.set(dk, score); meta.push(['오늘 최고', A.fmt(Math.max(score, db))]); }
    S.gameOver(score, meta, diff === DAILY ? { kick: '오늘의 퍼즐' } : undefined);
  }
  function update(dt) {
    fx.update(dt); for (var k in ripple) { ripple[k] -= dt; if (ripple[k] < -0.3) delete ripple[k]; }
    if (nextT > 0) { nextT -= dt; if (nextT <= 0) { setup(); S.banner(wins + 1 + '번째 판', '제한 ' + maxM + '번'); hud(); } }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) endGame(); }
  }
  /* 그림: 광택 있는 색 칸(색·칸 크기별 캐시), 물감 통 버튼(색마다 무늬가 달라 색 구분이 어려워도 고를 수 있음), 화실 배경 */
  var MARK = ['●', '▲', '■', '◆', '★', '♥'];
  function cellSpr(k, cs) {
    return A.sprite('fl2' + k + '_' + cs, cs, cs, function (x) {
      x.fillStyle = COLS[k]; x.fillRect(0, 0, cs, cs); x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(0, 0, cs, Math.max(1, cs * 0.14));
      x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, cs - Math.max(1, cs * 0.12), cs, Math.max(1, cs * 0.12));
    });
  }
  function potSpr(k) {
    return A.sprite('flpot' + k, 76, 76, function (x) {
      x.translate(38, 38);
      var gl = x.createRadialGradient(0, 0, 20, 0, 0, 38); gl.addColorStop(0, A.hexA(COLS[k], 0.45)); gl.addColorStop(1, A.hexA(COLS[k], 0)); x.fillStyle = gl; x.fillRect(-38, -38, 76, 76);
      x.fillStyle = 'rgba(0,0,0,.4)'; A.rr(x, -31, -29, 64, 66, 18); x.fill();
      var g = x.createLinearGradient(0, -33, 0, 33); g.addColorStop(0, '#ffffff'); g.addColorStop(0.2, COLS[k]); g.addColorStop(1, A.hexA(COLS[k], 0.75));
      x.fillStyle = g; A.rr(x, -33, -33, 66, 66, 18); x.fill();
      x.fillStyle = 'rgba(255,255,255,.5)'; A.rr(x, -26, -29, 52, 10, 5); x.fill();
      x.fillStyle = 'rgba(0,0,0,.35)'; x.font = '900 22px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(MARK[k], 0, 4);
    });
  }
  var FBG = A.sprite('flbg', W, H, function (x) {
    var g = x.createRadialGradient(W / 2, H * 0.4, 30, W / 2, H * 0.4, 640); g.addColorStop(0, '#2a1030'); g.addColorStop(1, '#08020a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 40; i++) { x.fillStyle = A.hexA(COLS[i % 6], 0.06); x.beginPath(); x.arc(Math.random() * W, Math.random() * H, 6 + Math.random() * 30, 0, 7); x.fill(); }
  });
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(FBG, -10, -10, W + 20, H + 20);
    if (!grid) setup();
    // 액자
    c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(GX - 8, GY - 4, N * CS + 18, N * CS + 18);
    var fg = c.createLinearGradient(GX - 12, GY - 12, GX + N * CS + 12, GY + N * CS + 12); fg.addColorStop(0, '#e8d0a8'); fg.addColorStop(0.5, '#7a5a3a'); fg.addColorStop(1, '#c8a878'); c.fillStyle = fg; c.fillRect(GX - 12, GY - 12, N * CS + 24, N * CS + 24);
    for (var i = 0; i < N * N; i++) {
      var x = i % N, y = Math.floor(i / N), r = ripple[i], s = r != null && r < 0 ? 1 + Math.sin(-r / 0.3 * Math.PI) * 0.18 : 1;
      var sz = CS * s; c.drawImage(cellSpr(grid[i], CS), GX + x * CS + (CS - sz) / 2, GY + y * CS + (CS - sz) / 2, sz + 0.5, sz + 0.5);
    }
    // 색 버튼
    if (!land) for (var k = 0; k < NC; k++) { var bx = 30 + k * 82, by = 760, cur = grid[0] === k; c.globalAlpha = cur ? 0.3 : 1; c.drawImage(potSpr(k), bx - 3, by - 3, 76, 76); c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '700 13px "Chakra Petch",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(k + 1), bx + 35, by + 84); }
    if (!land) { c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '600 16px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('왼쪽 위부터 같은 색이 퍼져 나갑니다', W / 2, 870);
    if (cpu) { c.fillStyle = 'rgba(255,209,102,.8)'; c.font = '600 15px "Pretendard Variable",system-ui'; c.fillText('컴퓨터는 ' + cpu + '번에 풀었어요 · 같거나 적으면 보너스', W / 2, 900); } }
    // 첫 판 안내: 세로는 색 버튼, 가로는 판의 이웃 칸을 가리킴
    if (tut && grid && region) { var nc = -1, ni = -1; for (var q in region) { var qx = q % N, qy = Math.floor(q / N); [[1, 0], [0, 1]].forEach(function (d) { var j = (qy + d[1]) * N + qx + d[0]; if (ni < 0 && qx + d[0] < N && qy + d[1] < N && region[j] == null) { ni = j; nc = grid[j]; } }); if (ni >= 0) break; }
      if (ni >= 0) { var msg = isTouch() ? '이 색을 탭하면 왼쪽 위 덩어리가 물들어요' : '숫자 키 ' + (nc + 1) + ' 또는 클릭으로 색 고르기'; if (land) drawTut(c, GX + (ni % N + 0.5) * CS, GY + (Math.floor(ni / N) + 0.5) * CS, msg, false); else drawTut(c, 30 + nc * 82 + 35, 795, msg, true); } }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); var m = document.getElementById('hB'); m.textContent = moves + '/' + maxM; m.style.color = maxM - moves <= 3 ? '#ff4d6d' : ''; document.getElementById('hC').textContent = wins;  document.getElementById('hMult').textContent = land && cpu ? '컴퓨터 ' + cpu + '번 · 같거나 적으면 보너스' : ''; for (var q = 0; q < NC; q++) { var bq = document.getElementById('pkC' + q); if (bq) bq.style.opacity = grid && grid[0] === q ? 0.25 : 1; } }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; var p = S.toLocal(e);
    if (!land && p.y > 760 && p.y < 830) { var k = Math.floor((p.x - 30) / 82); if (k >= 0 && k < NC && (p.x - 30) % 82 < 72) pick(k); return; }
    var x = Math.floor((p.x - GX) / CS), y = Math.floor((p.y - GY) / CS); if (x >= 0 && y >= 0 && x < N && y < N) pick(grid[y * N + x]);
  });
  var dbtns = document.querySelectorAll('[data-diff]');
  function paint() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_flood_diff', diff); A.sfx('select'); paint(); grid = null; }); }); paint();
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
  var S = new A.Shell({ id: 'flood', W: W, H: H, land: [720, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if (/^[1-6]$/.test(e.key) && !e.repeat) pick(+e.key - 1); } });
  landPanel((function () { var h = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'; for (var k = 0; k < NC; k++) h += '<button class="gp-btn" id="pkC' + k + '" style="min-height:46px;background:' + COLS[k] + ';color:rgba(0,0,0,.55);border-color:transparent">' + (k + 1) + '</button>'; return h + '</div>'; })());
  for (var q = 0; q < NC; q++) (function (k) { document.getElementById('pkC' + k).addEventListener('click', function () { pick(k); }); })(q);
})();
