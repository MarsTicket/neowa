(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, N = 13;
  var fx = new A.FX();
  var diff = +A.get('neowa_gomoku_diff', '1') || 0, CS = 38, GX = (W - 12 * 38) / 2, GY = 230, BP = 28, land = false;
  // 화면 배치: 세로 화면은 540x960 안에 판·차례·무르기 버튼, 가로 화면은 720x720 정사각형 판만 (버튼은 오른쪽 패널)
  function geo(sh) { land = !!(sh && sh.land); W = sh ? sh.W : 540; H = sh ? sh.H : 960;
    if (land) { CS = W / (N + 1); GX = GY = CS; BP = CS * 0.62; } else { CS = 38; GX = (W - 12 * 38) / 2; GY = 230; BP = 28; } }
  // 둘이서 모드: 흑·백을 두 사람이 번갈아 둠. tally = [흑 승, 백 승] (이 페이지에 있는 동안 누적)
  var duo = A.duo('gomoku', { solo: ['SCORE', 'WIN', 'MOVE'], duo: ['흑 : 백', '판', 'MOVE'] }, function () { if (S) hud(); }), tally = [0, 0];
  var bd, turn, moves, hist, wins, score, undo, endT, winLine, thinking, cur = { x: 6, y: 6 }, kbd = false, lastMv = null;
  function reset() { wins = 0; score = 0; newGame(); fx.clear(); hud(); }
  function newGame() { bd = []; for (var i = 0; i < N * N; i++) bd.push(0); turn = 1; moves = 0; hist = []; undo = 3; endT = 0; winLine = null; thinking = 0; lastMv = null; }
  function at(x, y) { return x < 0 || y < 0 || x >= N || y >= N ? -1 : bd[y * N + x]; }
  var DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  function five(x, y, p) { for (var d = 0; d < 4; d++) { var line = [[x, y]]; for (var s = -1; s <= 1; s += 2) { var k = 1; while (at(x + DIRS[d][0] * k * s, y + DIRS[d][1] * k * s) === p) { line.push([x + DIRS[d][0] * k * s, y + DIRS[d][1] * k * s]); k++; } } if (line.length >= 5) return line; } return null; }
  // ---- AI: 한 줄(9칸) 모양으로 공격·수비 점수를 매김. 띈 삼(X.XX)·띈 사(XX.XX)도 알아봄 ----
  // 칸 (x,y)에 p의 돌을 놓았다고 보고, 네 방향 각각에서 가장 센 모양을 찾음
  var P_FIVE = ['XXXXX'], P_OPEN4 = ['.XXXX.'], P_FOUR = ['XXXX.', '.XXXX', 'XXX.X', 'X.XXX', 'XX.XX'],
    P_OPEN3 = ['.XXX..', '..XXX.', '.XX.X.', '.X.XX.'], P_THREE = ['XXX..', '..XXX', 'XX.X.', '.X.XX', 'X.XX.', '.XX.X', 'X..XX', 'XX..X', 'X.X.X', '.XXX.'],
    P_OPEN2 = ['..XX..', '.X.X..', '..X.X.', '.X..X.', '..XX.', '.XX..'];
  function hasAny(str, list) { for (var i = 0; i < list.length; i++) if (str.indexOf(list[i]) >= 0) return true; return false; }
  function shape(x, y, p) { // 0 없음 1 둘 2 열린둘 3 닫힌셋 4 열린셋 5 넉 6 열린넉 7 오목
    var r = [0, 0, 0, 0];
    for (var d = 0; d < 4; d++) {
      var str = '';
      for (var k = -4; k <= 4; k++) { if (!k) { str += 'X'; continue; } var v = at(x + DIRS[d][0] * k, y + DIRS[d][1] * k); str += v === p ? 'X' : v === 0 ? '.' : 'O'; }
      r[d] = hasAny(str, P_FIVE) ? 7 : hasAny(str, P_OPEN4) ? 6 : hasAny(str, P_FOUR) ? 5 : hasAny(str, P_OPEN3) ? 4 : hasAny(str, P_THREE) ? 3 : hasAny(str, P_OPEN2) ? 2 : str.replace(/[^X]/g, '').length > 1 ? 1 : 0;
    }
    return r;
  }
  var SHAPE_V = [4, 60, 500, 1200, 9000, 40000, 900000, 1e7];
  function cellScore(x, y, p) {
    var r = shape(x, y, p), c = [0, 0, 0, 0, 0, 0, 0, 0], v = 0;
    for (var d = 0; d < 4; d++) { c[r[d]]++; v += SHAPE_V[r[d]]; }
    if (c[7]) return 1e7;
    if (c[6] || c[5] >= 2) return 900000 + v;          // 열린 넉·쌍사 = 다음 수에 승리
    if (c[5] && c[4]) return 600000 + v;               // 사삼
    if (c[4] >= 2) return 200000 + v;                  // 쌍삼
    return v;
  }
  function makesFive(x, y, p) { // 빠른 검사: 놓으면 5개 이상 이어지는가
    for (var d = 0; d < 4; d++) { var c = 1; for (var s = -1; s <= 1; s += 2) { var k = 1; while (at(x + DIRS[d][0] * k * s, y + DIRS[d][1] * k * s) === p) { c++; k++; } } if (c >= 5) return true; }
    return false; }
  function cands(dist) {
    var r = [];
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      if (bd[y * N + x]) continue; var near = false;
      for (var dy = -dist; dy <= dist && !near; dy++) for (var dx = -dist; dx <= dist; dx++) if (at(x + dx, y + dy) > 0) { near = true; break; }
      if (near) r.push([x, y]);
    }
    return r;
  }
  function fivePoints(p) { var r = []; cands(1).forEach(function (q) { if (makesFive(q[0], q[1], p)) r.push(q); }); return r; }
  // 연속 넉(VCF) 찾기: p가 계속 '넉'을 두어 상대가 막을 수밖에 없게 몰아서 이기는 길이 있으면 첫 수를 돌려줌
  // 계산이 너무 길어지지 않게: 탐색 횟수(budget)와 시간(deadline) 둘 다 제한. 느린 기기에서도 한 수 0.2초 안쪽
  var budget = 0, deadline = 0;
  function outOfTime() { return --budget < 0 || ((budget & 15) === 0 && performance.now() > deadline); }
  function vcfRun(p, depth, n) { budget = n || 1500; return vcf(p, depth); }
  function vcf(p, depth) {
    if (depth <= 0 || outOfTime()) return null;
    var cs = cands(1), o = 3 - p;
    for (var i = 0; i < cs.length; i++) {
      var x = cs[i][0], y = cs[i][1], r = shape(x, y, p);
      if (r.indexOf(7) >= 0) return cs[i];
      if (r.indexOf(5) < 0 && r.indexOf(6) < 0) continue;
      bd[y * N + x] = p;
      var fp = fivePoints(p), win = false;
      if (fp.length >= 2) win = fivePoints(o).length === 0;
      else if (fp.length === 1 && fivePoints(o).length === 0) {
        var bx = fp[0][0], by = fp[0][1];
        if (!makesFive(bx, by, o)) { bd[by * N + bx] = o; win = !!vcf(p, depth - 1); bd[by * N + bx] = 0; }
      }
      bd[y * N + x] = 0;
      if (win) return cs[i];
    }
    return null;
  }
  // 연속 위협(VCT): 열린 셋·넉으로 계속 몰아붙여 이기는 길 (어려움 전용, 계산량 제한)
  function vct(p, depth) {
    if (outOfTime()) return null;
    var o = 3 - p, fp = fivePoints(p); if (fp.length) return fp[0];
    if (fivePoints(o).length) return null;
    var v = vcf(p, 4); if (v) return v; if (depth <= 0) return null;
    var cs = cands(1);
    for (var i = 0; i < cs.length; i++) {
      var x = cs[i][0], y = cs[i][1], r = shape(x, y, p), d, k;
      if (r.indexOf(4) < 0 && r.indexOf(5) < 0 && r.indexOf(6) < 0) continue;
      bd[y * N + x] = p;
      var replies = [], seen = {}, f5 = fivePoints(p);
      function add(q) { var key = q[0] + ',' + q[1]; if (!seen[key] && at(q[0], q[1]) === 0) { seen[key] = 1; replies.push(q); } }
      if (f5.length === 1) add(f5[0]);
      else for (d = 0; d < 4; d++) if (r[d] === 4) for (k = -4; k <= 4; k++) if (k) add([x + DIRS[d][0] * k, y + DIRS[d][1] * k]);
      if (f5.length !== 1) cands(1).forEach(function (q) { var rr = shape(q[0], q[1], o); if (rr.indexOf(5) >= 0 || rr.indexOf(6) >= 0) add(q); }); // 상대의 넉 반격
      var all = replies.length > 0 && f5.length < 2;
      if (f5.length >= 2) all = true;
      for (var j = 0; j < replies.length && all && f5.length < 2; j++) {
        var q = replies[j]; if (makesFive(q[0], q[1], o)) { all = false; break; }
        bd[q[1] * N + q[0]] = o; var ofp = fivePoints(o), w = null;
        if (ofp.length === 1) { var bx = ofp[0][0], by = ofp[0][1]; bd[by * N + bx] = p; w = fivePoints(o).length ? null : vct(p, depth - 1); bd[by * N + bx] = 0; }
        else if (!ofp.length) w = vct(p, depth - 1);
        bd[q[1] * N + q[0]] = 0; if (!w) all = false;
      }
      bd[y * N + x] = 0;
      if (all) return cs[i];
      if (budget < 0) return null;
    }
    return null;
  }
  function aiMove() {
    if (!hist.length) { put(6, 6, 2); return; }
    deadline = performance.now() + (diff === 2 ? 180 : 60);
    var AW = [0.8, 1, 1], DW = [0.55, 0.9, 0.92], NOISE = [2500, 80, 5];
    // 1) 바로 이기기  2) 상대 오목 막기 (쉬움은 가끔 놓침)
    var mine = fivePoints(2); if (mine.length) { put(mine[0][0], mine[0][1], 2); return; }
    var theirs = fivePoints(1); if (theirs.length && (diff > 0 || Math.random() < 0.85)) { put(theirs[0][0], theirs[0][1], 2); return; }
    // 3) 보통·어려움: 연속 넉으로 이기는 길
    if (diff > 0) { var v = vcfRun(2, diff === 2 ? 10 : 4); if (v) { put(v[0], v[1], 2); return; } }
    var list = cands(2).map(function (q) {
      return [cellScore(q[0], q[1], 2) * AW[diff] + cellScore(q[0], q[1], 1) * DW[diff] + Math.random() * NOISE[diff], q[0], q[1]];
    }).sort(function (a, b) { return b[0] - a[0]; });
    if (!list.length) { put(6, 6, 2); return; }
    // 4) 어려움: 상대에게 연속 넉 승리 길이 있으면, 그 길을 끊는 수(상위 후보 중)를 고름
    if (diff === 2 && vcfRun(1, 8, 400)) {
      for (var i = 0; i < Math.min(14, list.length); i++) {
        var x = list[i][1], y = list[i][2]; bd[y * N + x] = 2; var still = vcfRun(1, 8, 300); bd[y * N + x] = 0;
        if (!still) { put(x, y, 2); return; }
      }
    }
    // 5) 어려움: 열린 셋·넉으로 몰아붙여 이기는 길
    if (diff === 2) { budget = 400; var t = vct(2, 2); if (t) { put(t[0], t[1], 2); return; } }
    put(list[0][1], list[0][2], 2);
  }
  function put(x, y, p) {
    bd[y * N + x] = p; moves++; hist.push([x, y]); lastMv = [x, y]; A.sfx('tick', p === 1 ? 1.3 : 0.9);
    var w = five(x, y, p);
    if (w) { winLine = w; endT = 1.6; if (p === 1 || duo()) { A.sfx('level'); w.forEach(function (q) { fx.burst(GX + q[0] * CS, GY + q[1] * CS, '#ffd166', 10, 200, 0.5, 3); }); } else { A.sfx('hurt'); fx.flashIt('#ff2244', 0.3); } hud(); return; }
    if (moves >= N * N) { endT = 1.2; winLine = []; hud(); return; }
    turn = p === 1 ? 2 : 1; if (turn === 2 && !duo()) thinking = 0.35; hud();
  }
  function human(x, y) { if (S.state !== 'playing' || (turn !== 1 && !duo()) || endT > 0 || thinking > 0 || at(x, y) !== 0) return; put(x, y, duo() ? turn : 1); }
  function doUndo() {
    if (duo()) { // 둘이서: 마지막 한 수만 되돌리고 그 사람 차례로
      if (S.state !== 'playing' || !hist.length || endT > 0) { A.sfx('wall'); return; }
      var u = hist.pop(); turn = bd[u[1] * N + u[0]]; bd[u[1] * N + u[0]] = 0; moves--; lastMv = hist[hist.length - 1] || null; A.sfx('click'); hud(); return;
    }
    if (S.state !== 'playing' || undo <= 0 || turn !== 1 || hist.length < 2 || endT > 0) { A.sfx('wall'); return; } for (var k = 0; k < 2; k++) { var m = hist.pop(); bd[m[1] * N + m[0]] = 0; moves--; } undo--; score = Math.max(0, score - 30); lastMv = hist[hist.length - 1] || null; A.sfx('click'); hud(); }
  function update(dt) {
    fx.update(dt);
    if (endT > 0) { endT -= dt; if (endT <= 0) {
      if (duo()) { var wp = winLine && winLine.length ? bd[winLine[0][1] * N + winLine[0][0]] : 0; if (wp) tally[wp - 1]++; hud();
        S.gameOver(0, [['흑 승', String(tally[0])], ['백 승', String(tally[1])], ['수', String(moves)]], { title: wp ? (wp === 1 ? '흑' : '백') + ' 승리!' : '무승부', kick: '2인 대결', win: true, noRecord: true }); return; }
      var meWon = winLine && winLine.length && bd[winLine[0][1] * N + winLine[0][0]] === 1;
      if (meWon) { wins++; var pts = Math.max(100, (200 - moves) * 3) * (diff + 1); score += pts; S.banner(wins + '승!', '+' + pts); newGame(); hud(); }
      else if (winLine && !winLine.length) { score += 50; newGame(); hud(); }
      else S.gameOver(score, [['연승', String(wins)], ['난이도', ['쉬움', '보통', '어려움'][diff]]]);
    } return; }
    if (thinking > 0) { thinking -= dt; if (thinking <= 0 && turn === 2) aiMove(); }
  }
  // 돌 그림은 크기별로 한 번만 그려 둠(매 프레임 그림자 계산을 피함)
  function stoneSpr(p) { var r = Math.round(CS * 0.45), sz = r * 2 + 8;
    return A.sprite('gmk' + p + '_' + r, sz, sz, function (x, w) { var cx = w / 2, cy = w / 2 - 1, gr = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 2, cx, cy, r * 1.02);
      if (p === 1) { gr.addColorStop(0, '#666'); gr.addColorStop(1, '#0a0a0a'); } else { gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#c9c2b0'); }
      x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 4; x.shadowOffsetY = 2; x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }); }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#120c02'; c.fillRect(-10, -10, W + 20, H + 20);
    var g = c.createLinearGradient(0, GY - BP, 0, GY + 12 * CS + BP); g.addColorStop(0, '#d9a85a'); g.addColorStop(1, '#b07a35'); c.fillStyle = g; A.rr(c, GX - BP, GY - BP, 12 * CS + BP * 2, 12 * CS + BP * 2, land ? 0 : 14); c.fill();
    c.strokeStyle = 'rgba(60,35,10,.7)'; c.lineWidth = 1.2;
    for (var i = 0; i < N; i++) { c.beginPath(); c.moveTo(GX, GY + i * CS); c.lineTo(GX + 12 * CS, GY + i * CS); c.stroke(); c.beginPath(); c.moveTo(GX + i * CS, GY); c.lineTo(GX + i * CS, GY + 12 * CS); c.stroke(); }
    [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]].forEach(function (p) { c.fillStyle = 'rgba(60,35,10,.8)'; c.beginPath(); c.arc(GX + p[0] * CS, GY + p[1] * CS, CS * 0.1, 0, 7); c.fill(); });
    if (!bd) newGame();
    for (i = 0; i < N * N; i++) if (bd[i]) {
      A.draw(c, stoneSpr(bd[i]), GX + (i % N) * CS, GY + Math.floor(i / N) * CS);
    }
    if (lastMv) { c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc(GX + lastMv[0] * CS, GY + lastMv[1] * CS, CS * 0.11, 0, 7); c.fill(); }
    if (winLine && winLine.length) { c.save(); c.lineCap = 'round'; var sorted = winLine.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }); c.beginPath(); c.moveTo(GX + sorted[0][0] * CS, GY + sorted[0][1] * CS); c.lineTo(GX + sorted[sorted.length - 1][0] * CS, GY + sorted[sorted.length - 1][1] * CS); c.strokeStyle = 'rgba(255,209,102,.35)'; c.lineWidth = 16; c.stroke(); c.strokeStyle = '#ffd166'; c.lineWidth = 6; c.stroke(); c.restore(); }
    if (kbd && S.state === 'playing') { c.strokeStyle = '#5ee7ff'; c.lineWidth = 3; c.strokeRect(GX + cur.x * CS - CS / 2 + 2, GY + cur.y * CS - CS / 2 + 2, CS - 4, CS - 4); }
    if (!land) { c.fillStyle = '#ffd166'; c.font = '700 20px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(S.state === 'playing' ? (duo() ? (turn === 1 ? '흑 차례' : '백 차례') : turn === 1 ? '나(흑) 차례' : '컴퓨터(백) 생각 중…') : '', W / 2, GY - 70);
    var by = GY + 12 * CS + 60; c.fillStyle = undo > 0 || duo() ? 'rgba(255,209,102,.15)' : 'rgba(255,255,255,.04)'; A.rr(c, W / 2 - 90, by, 180, 54, 14); c.fill(); c.fillStyle = undo > 0 || duo() ? '#ffd166' : 'rgba(255,255,255,.3)'; c.font = '700 17px "Pretendard Variable",system-ui'; c.fillText(duo() ? '한 수 무르기' : '무르기 ' + (undo == null ? 3 : undo), W / 2, by + 28); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() {
    document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = wins; document.getElementById('hC').textContent = moves; document.getElementById('hMult').textContent = ['쉬움', '보통', '어려움'][diff];
    if (duo()) { document.getElementById('hA').textContent = tally[0] + ' : ' + tally[1]; document.getElementById('hB').textContent = tally[0] + tally[1] + 1; document.getElementById('hMult').textContent = '2인'; }
    if (!pEl.turn) return;
    var me = turn === 1, play = S && S.state === 'playing', two = duo();
    pEl.stone.className = 'gp-stone' + (me ? '' : ' w');
    pEl.turn.textContent = !play ? (two ? '둘이서: 흑이 먼저' : '나는 흑, 먼저 둡니다') : endT > 0 ? '판이 끝났어요' : two ? (me ? '흑 차례' : '백 차례') : me ? '내 차례 (흑)' : '컴퓨터 차례 (백)';
    pEl.sub.textContent = !play ? '시작하기를 누르세요' : endT > 0 ? '잠시 후 결과' : me || two ? '빈 자리를 눌러 돌을 놓으세요' : '생각하는 중…';
    pEl.score.textContent = two ? tally[0] + ' : ' + tally[1] : A.fmt(score || 0); pEl.win.textContent = two ? tally[0] + tally[1] + 1 : wins || 0;
    pEl.scoreL.textContent = two ? '흑 : 백 승' : 'SCORE'; pEl.winL.textContent = two ? '판' : '연승'; pEl.move.textContent = moves || 0; pEl.undo.textContent = two ? '∞' : undo == null ? 3 : undo;
    pEl.undoBtn.disabled = two ? !play || !hist.length || endT > 0 : !play || !(undo > 0) || turn !== 1 || hist.length < 2 || endT > 0;
  }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e), by = GY + 12 * CS + 60;
    if (!land && p.y > by && p.y < by + 54 && Math.abs(p.x - W / 2) < 90) { doUndo(); return; }
    var x = Math.round((p.x - GX) / CS), y = Math.round((p.y - GY) / CS); if (x >= 0 && y >= 0 && x < N && y < N) human(x, y);
  });
  var dbtns = document.querySelectorAll('[data-diff]');
  function pd() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_gomoku_diff', diff); A.sfx('click'); pd(); }); }); pd();
  var pEl = {}, S = null;
  S = new A.Shell({ id: 'gomoku', W: W, H: H, land: [720, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key;
      if (k === 'ArrowLeft' || k === 'a') cur.x = Math.max(0, cur.x - 1); if (k === 'ArrowRight' || k === 'd') cur.x = Math.min(N - 1, cur.x + 1); if (k === 'ArrowUp' || k === 'w') cur.y = Math.max(0, cur.y - 1); if (k === 'ArrowDown' || k === 's') cur.y = Math.min(N - 1, cur.y + 1);
      if ((k === ' ' || k === 'Enter') && !e.repeat) human(cur.x, cur.y); if (k === 'u' || k === 'U') doUndo(); } });
  // 가로 화면 오른쪽 패널: 차례·점수·큰 무르기 버튼 (점수판이 패널에 있으니 게임판 위 점수판은 가로에서 숨김)
  document.querySelector('.g-hud').setAttribute('data-land-hide', '');
  S.panelSlot.innerHTML = '<div class="g-card gp-turn"><i class="gp-stone" id="pkStone"></i><div><b id="pkTurn"></b><span id="pkSub"></span></div></div>' +
    '<div class="g-card gp-stats"><div><span id="pkScoreL">SCORE</span><b id="pkScore">0</b></div><div><span id="pkWinL">연승</span><b id="pkWin">0</b></div><div><span>수</span><b id="pkMove">0</b></div></div>' +
    '<button class="gp-btn main" id="pkUndo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>한 수 무르기 <span class="cnt" id="pkUndoN">3</span></button>';
  pEl = { stone: document.getElementById('pkStone'), turn: document.getElementById('pkTurn'), sub: document.getElementById('pkSub'), score: document.getElementById('pkScore'), win: document.getElementById('pkWin'), move: document.getElementById('pkMove'), undo: document.getElementById('pkUndoN'), undoBtn: document.getElementById('pkUndo'), scoreL: document.getElementById('pkScoreL'), winL: document.getElementById('pkWinL') };
  pEl.undoBtn.addEventListener('click', doUndo);
  // 시작·종료·일시정지 때 패널 글자도 바뀌도록
  new MutationObserver(function () { if (bd) hud(); }).observe(document.body, { attributes: true, attributeFilter: ['data-state'] });
  if (!bd) newGame(); hud();
})();
