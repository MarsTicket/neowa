(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, N = 8, CS = 60, GX = (540 - 480) / 2, GY = 230, land = false;
  // 판 위치: 세로 540x960, 가로 화면은 720x720 정사각형(판이 훨씬 커짐)
  function geo(sh) { land = !!sh.land; W = sh.W; H = sh.H; if (land) { CS = 78; GX = (W - N * CS) / 2; GY = 76; } else { CS = 60; GX = (W - N * CS) / 2; GY = 230; } }
  var fx = new A.FX();
  var diff = +A.get('neowa_reversi_diff', '1') || 0;
  var WT = [100, -20, 10, 5, 5, 10, -20, 100, -20, -50, -2, -2, -2, -2, -50, -20, 10, -2, 1, 1, 1, 1, -2, 10, 5, -2, 1, 0, 0, 1, -2, 5, 5, -2, 1, 0, 0, 1, -2, 5, 10, -2, 1, 1, 1, 1, -2, 10, -20, -50, -2, -2, -2, -2, -50, -20, 100, -20, 10, 5, 5, 10, -20, 100];
  // 둘이서 모드: 흑·백을 두 사람이 번갈아 둠. tally = [흑 승, 백 승]
  var duo = A.duo('reversi', { solo: ['SCORE', 'ME : CPU', 'WIN'], duo: ['흑 : 백 승', '돌 수', '판'] }, function () { if (S) hud(); }), tally = [0, 0];
  var bd, turn, wins, score, thinking, endT, flips = {}, placeT = 1, passWho = 0, cur = { x: 3, y: 2 }, kbd = false, passMsg = 0, lastMv = null;
  function newGame() { bd = []; for (var i = 0; i < 64; i++) bd.push(0); bd[27] = 2; bd[28] = 1; bd[35] = 1; bd[36] = 2; turn = 1; thinking = 0; endT = 0; flips = {}; lastMv = null; passMsg = 0; placeT = 1; }
  function reset() { wins = 0; score = 0; newGame(); fx.clear(); hud(); }
  var DIR8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  function flipsFor(b, i, p) {
    if (b[i]) return []; var x = i % N, y = Math.floor(i / N), out = [], o = 3 - p;
    for (var d = 0; d < 8; d++) {
      var dx = DIR8[d][0], dy = DIR8[d][1], nx = x + dx, ny = y + dy, n = 0;
      while (nx >= 0 && ny >= 0 && nx < N && ny < N && b[ny * N + nx] === o) { nx += dx; ny += dy; n++; }
      if (n && nx >= 0 && ny >= 0 && nx < N && ny < N && b[ny * N + nx] === p) for (var k = 1; k <= n; k++) out.push((y + dy * k) * N + x + dx * k);
    }
    return out;
  }
  function canPlay(b, i, p) { // 빠른 검사: 뒤집을 돌이 하나라도 있는가
    if (b[i]) return false; var x = i % N, y = Math.floor(i / N), o = 3 - p;
    for (var d = 0; d < 8; d++) { var dx = DIR8[d][0], dy = DIR8[d][1], nx = x + dx, ny = y + dy, n = 0;
      while (nx >= 0 && ny >= 0 && nx < N && ny < N && b[ny * N + nx] === o) { nx += dx; ny += dy; n++; }
      if (n && nx >= 0 && ny >= 0 && nx < N && ny < N && b[ny * N + nx] === p) return true; }
    return false;
  }
  function mobility(b, p) { var c = 0; for (var i = 0; i < 64; i++) if (canPlay(b, i, p)) c++; return c; }
  function moves(b, p) { var r = []; for (var i = 0; i < 64; i++) if (!b[i]) { var f = flipsFor(b, i, p); if (f.length) r.push({ i: i, f: f }); } return r; }
  function apply(b, m, p) { var nb = b.slice(); nb[m.i] = p; m.f.forEach(function (k) { nb[k] = p; }); return nb; }
  // ---- AI 평가: 자리 점수(모서리 차지 후 옆 칸은 덜 위험) + 둘 곳 수(기동력) + 막판엔 돌 수 ----
  var CORN = [[0, 1, 8, 9], [7, 6, 15, 14], [56, 57, 48, 49], [63, 62, 55, 54]];
  function evalB(b) { // 백(2) 기준 점수
    var s = 0, i, empt = 0;
    for (i = 0; i < 64; i++) { if (b[i] === 2) s += WT[i]; else if (b[i] === 1) s -= WT[i]; else empt++; }
    for (i = 0; i < 4; i++) { var cr = CORN[i]; if (b[cr[0]]) for (var k = 1; k < 4; k++) { var v = b[cr[k]]; if (v) s += (v === 2 ? 1 : -1) * (k === 3 ? 50 : 20); } } // 모서리가 찼으면 X·C칸 감점 취소
    var m2 = mobility(b, 2), m1 = mobility(b, 1);
    s += (m2 - m1) * (empt > 20 ? 8 : 4);
    if (empt < 14) { var d = 0; for (i = 0; i < 64; i++) d += b[i] === 2 ? 1 : b[i] === 1 ? -1 : 0; s += d * (14 - empt); }
    return s;
  }
  function discDiff(b) { var d = 0; for (var i = 0; i < 64; i++) d += b[i] === 2 ? 1 : b[i] === 1 ? -1 : 0; return d; }
  var nodes = 0, deadline = 0, timeout = false;
  // 알파-베타 탐색(백 기준). exact = 끝까지 읽기(돌 수 차이로 판정)
  function search(b, p, depth, alpha, beta, passed, exact) {
    if ((++nodes & 255) === 0 && performance.now() > deadline) timeout = true;
    if (timeout) return 0;
    var ms = moves(b, p);
    if (!ms.length) {
      if (passed) { var dd = discDiff(b); return exact ? dd * 1000 : dd > 0 ? 1e6 + dd : dd < 0 ? -1e6 + dd : 0; }
      return search(b, 3 - p, depth, alpha, beta, true, exact);
    }
    if (depth <= 0 && !exact) return evalB(b);
    ms.sort(function (x, y) { return WT[y.i] - WT[x.i]; }); // 좋은 자리부터 보면 가지치기가 잘 됨
    var i, v;
    if (p === 2) { v = -1e9; for (i = 0; i < ms.length; i++) { v = Math.max(v, search(apply(b, ms[i], 2), 1, depth - 1, alpha, beta, false, exact)); alpha = Math.max(alpha, v); if (alpha >= beta) break; } }
    else { v = 1e9; for (i = 0; i < ms.length; i++) { v = Math.min(v, search(apply(b, ms[i], 1), 2, depth - 1, alpha, beta, false, exact)); beta = Math.min(beta, v); if (alpha >= beta) break; } }
    return v;
  }
  function bestBy(ms, depth, exact) {
    var best = null, bv = -1e9;
    ms.slice().sort(function (x, y) { return WT[y.i] - WT[x.i]; }).forEach(function (m) {
      if (timeout) return; var v = search(apply(bd, m, 2), 1, depth - 1, bv, 1e9, false, exact) + (exact ? 0 : Math.random() * 0.5);
      if (!timeout && v > bv) { bv = v; best = m; } });
    return timeout ? null : best;
  }
  function aiPick(ms) {
    if (diff === 0) return Math.random() < 0.5 ? A.pick(ms) : ms.reduce(function (a, b) { return b.f.length > a.f.length ? b : a; });
    var empt = bd.filter(function (v) { return !v; }).length, pick = null;
    nodes = 0; timeout = false; deadline = performance.now() + (diff === 2 ? 350 : 100);
    if (diff === 2 && empt <= 12) { deadline = performance.now() + 280; pick = bestBy(ms, 0, true); if (pick) return pick; timeout = false; deadline = performance.now() + 150; }
    if (diff === 1) { pick = bestBy(ms, 2, false); if (Math.random() < 0.15) pick = ms.reduce(function (a, m) { var v = WT[m.i] + m.f.length; return v > a.v ? { v: v, m: m } : a; }, { v: -1e9 }).m; }
    else for (var d = 2; d <= 8; d++) { var r = bestBy(ms, d, false); if (!r) break; pick = r; } // 시간이 허락하는 만큼 깊게
    return pick || ms[0];
  }
  function play(m, p) {
    bd = apply(bd, m, p); lastMv = m.i; placeT = 0; m.f.forEach(function (k, n) { flips[k] = -n * 0.04; });
    A.sfx('tick', p === 1 ? 1.3 : 0.9); if (m.f.length >= 4) A.sfx('coin', 1 + m.f.length * 0.03);
    next(3 - p);
  }
  function next(p) {
    if (moves(bd, p).length) { turn = p; if (p === 2 && !duo()) thinking = 0.5; }
    else if (moves(bd, 3 - p).length) { turn = 3 - p; passMsg = 1.6; passWho = p; A.sfx('wall'); if (turn === 2 && !duo()) thinking = 0.6; }
    else { turn = 0; endT = 1.5; }
    hud();
  }
  function cnt(p) { return bd.filter(function (v) { return v === p; }).length; }
  function human(i) { var p = duo() ? turn : 1; if (S.state !== 'playing' || !turn || (turn !== 1 && !duo()) || thinking > 0 || endT > 0) return; var f = flipsFor(bd, i, p); if (!f.length) { A.sfx('wall'); return; } play({ i: i, f: f }, p); }
  function update(dt) {
    fx.update(dt); if (placeT < 1) placeT = Math.min(1, placeT + dt * 6); for (var k in flips) { flips[k] += dt; if (flips[k] > 0.35) delete flips[k]; } if (passMsg > 0) passMsg -= dt;
    if (endT > 0) { endT -= dt; if (endT <= 0) { var me = cnt(1), cp = cnt(2);
      if (duo()) { var wp = me > cp ? 1 : cp > me ? 2 : 0; if (wp) tally[wp - 1]++; A.sfx('level'); hud();
        S.gameOver(0, [['흑 승', String(tally[0])], ['백 승', String(tally[1])], ['마지막', me + ' : ' + cp]], { title: wp ? (wp === 1 ? '흑' : '백') + ' 승리!' : '무승부', kick: '2인 대결', win: true, noRecord: true }); return; }
      if (me > cp) { wins++; var pts = (me - cp) * 10 * (diff + 1) + 100 * (diff + 1); score += pts; S.banner(wins + '승! ' + me + ':' + cp, '+' + pts); A.sfx('level'); newGame(); hud(); }
      else if (me === cp) { score += 50; S.banner('무승부', '+50'); newGame(); hud(); }
      else S.gameOver(score, [['연승', String(wins)], ['마지막', me + ' : ' + cp]]); } return; }
    if (thinking > 0) { thinking -= dt; if (thinking <= 0 && turn === 2) { var ms = moves(bd, 2); if (ms.length) play(aiPick(ms), 2); else next(1); } }
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#031008'; c.fillRect(-10, -10, W + 20, H + 20);
    if (!bd) newGame();
    c.fillStyle = '#0d4a26'; A.rr(c, GX - 10, GY - 10, N * CS + 20, N * CS + 20, 16); c.fill();
    var legal = S.state === 'playing' && turn && (turn === 1 || duo()) && thinking <= 0 ? moves(bd, turn).map(function (m) { return m.i; }) : [];
    for (var i = 0; i < 64; i++) {
      var x = GX + (i % N) * CS, y = GY + Math.floor(i / N) * CS;
      c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5; c.strokeRect(x, y, CS, CS);
      if (legal.indexOf(i) >= 0) { c.fillStyle = 'rgba(125,255,155,.35)'; c.beginPath(); c.arc(x + CS / 2, y + CS / 2, CS * 0.12, 0, 7); c.fill(); }
      if (bd[i]) {
        var f = flips[i], sx = f != null && f > 0 ? Math.abs(Math.cos(Math.min(1, f / 0.35) * Math.PI)) : 1, col = bd[i] === 1 ? '#111' : '#f4f5fb';
        if (f != null && f > 0 && f < 0.175) col = bd[i] === 1 ? '#f4f5fb' : '#111';
        if (f != null && f < 0) col = bd[i] === 1 ? '#f4f5fb' : '#111';
        var pop = lastMv === i && placeT < 1 ? 0.6 + 0.4 * placeT + Math.sin(placeT * Math.PI) * 0.15 : 1;
        c.save(); c.translate(x + CS / 2, y + CS / 2); c.scale(Math.max(0.08, sx) * pop, pop); c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(0, 2.5, CS * 0.41, 0, 7); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(0, 0, CS * 0.4, 0, 7); c.fill(); c.restore();
      }
      if (lastMv === i) { c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(x + CS / 2, y + CS / 2, CS * 0.07, 0, 7); c.fill(); }
    }
    if (kbd && S.state === 'playing') { c.strokeStyle = '#7dff9b'; c.lineWidth = 3; c.strokeRect(GX + cur.x * CS + 2, GY + cur.y * CS + 2, CS - 4, CS - 4); }
    c.fillStyle = '#7dff9b'; c.font = '700 ' + (land ? 26 : 20) + 'px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(passMsg > 0 ? (duo() ? (passWho === 1 ? '흑' : '백') : passWho === 1 ? '나' : '컴퓨터') + ' 둘 곳 없음 → 차례가 넘어갑니다' : S.state === 'playing' ? (duo() ? (turn === 1 ? '흑 차례' : turn === 2 ? '백 차례' : '') : turn === 1 ? '나(흑) 차례' : turn === 2 ? '컴퓨터 생각 중…' : '') : '', W / 2, land ? 36 : GY - 60);
    if (!land) { c.font = '700 24px "Pretendard Variable",system-ui'; c.fillStyle = '#fff'; c.fillText((duo() ? '흑 ' : '나(흑) ') + cnt(1) + '  :  ' + cnt(2) + (duo() ? ' 백' : ' 컴퓨터(백)'), W / 2, GY + 540); } // 가로에선 패널 점수판(돌 수)에 표시
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = cnt(1) + ' : ' + cnt(2); document.getElementById('hC').textContent = wins; document.getElementById('hMult').textContent = ['쉬움', '보통', '어려움'][diff];
    if (duo()) { document.getElementById('hA').textContent = tally[0] + ' : ' + tally[1]; document.getElementById('hC').textContent = tally[0] + tally[1] + 1; document.getElementById('hMult').textContent = '2인'; } }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e), x = Math.floor((p.x - GX) / CS), y = Math.floor((p.y - GY) / CS); if (x >= 0 && y >= 0 && x < N && y < N) human(y * N + x); });
  var dbtns = document.querySelectorAll('[data-diff]');
  function pd() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_reversi_diff', diff); A.sfx('click'); pd(); }); }); pd();
  var S = null; S = new A.Shell({ id: 'reversi', W: W, H: H, land: [720, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key;
      if (k === 'ArrowLeft' || k === 'a') cur.x = Math.max(0, cur.x - 1); if (k === 'ArrowRight' || k === 'd') cur.x = Math.min(N - 1, cur.x + 1); if (k === 'ArrowUp' || k === 'w') cur.y = Math.max(0, cur.y - 1); if (k === 'ArrowDown' || k === 's') cur.y = Math.min(N - 1, cur.y + 1);
      if ((k === ' ' || k === 'Enter') && !e.repeat) human(cur.y * N + cur.x); } });
  // 가로 화면: 게임판 위 점수판을 숨기고 같은 내용을 오른쪽 패널 점수판에 보여 줌 (extra = 패널에 더 넣을 HTML)
  function landStats(sh, extra) {
    var hudEl = document.querySelector('.g-hud'); if (!hudEl || !sh.panelSlot) return;
    hudEl.setAttribute('data-land-hide', '');
    var ids = ['hA', 'hB', 'hC'];
    sh.panelSlot.innerHTML = '<div class="g-card gp-stats">' + ids.map(function (id) { return '<div><span id="p' + id + 'L"></span><b id="p' + id + '"></b>' + (id === 'hA' ? '<em id="phM" style="font-style:normal;font-size:12px;font-weight:700;color:#ffd166"></em>' : '') + '</div>'; }).join('') + '</div>' + (extra || '');
    function sync() { var m = document.getElementById('hMult'); document.getElementById('phM').textContent = m ? m.textContent : '';
      ids.forEach(function (id) { var v = document.getElementById(id), lb = v && v.parentNode.querySelector('.h-lb');
        document.getElementById('p' + id).textContent = v ? v.textContent : ''; document.getElementById('p' + id + 'L').textContent = lb ? lb.textContent : ''; }); }
    new MutationObserver(sync).observe(hudEl, { subtree: true, childList: true, characterData: true }); sync();
  }
  landStats(S);
})();
