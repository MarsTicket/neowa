(function () {
  'use strict';
  // 나이트 투어: 나이트를 L자로만 움직여 판의 모든 칸을 한 번씩 밟기. 5x5 → 6x6 → 7x7 → 8x8 → (8x8 반복)
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var MOVES = [[1, -2], [2, -1], [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2]]; // 시계 방향 (후보 번호 순서)
  var land = false, BX = 20, BY = 170, BS = 500, CS = 100;
  var tut = !A.get('neowa_knight_tut', ''), N, path, seen, phase, banked, boards, total, undo, hint, hintCell, okStart, anim, endT, cur = { x: 0, y: 0 }, kbd = false, stuckMsg = '', maxN;

  function geo(sh) {
    land = !!(sh && sh.land); W = sh ? sh.W : 540; H = sh ? sh.H : 960;
    if (land) { BS = W - 40; BX = BY = 20; } else { BS = 500; BX = 20; BY = 168; }
    CS = BS / (N || 5);
  }

  // ---------- 풀이기 (힌트·출발 가능 칸 계산) ----------
  function deg(x, y, s) { var d = 0; for (var k = 0; k < 8; k++) { var nx = x + MOVES[k][0], ny = y + MOVES[k][1]; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !s[ny * N + nx]) d++; } return d; }
  function nexts(x, y, s) {
    var out = [];
    for (var k = 0; k < 8; k++) { var nx = x + MOVES[k][0], ny = y + MOVES[k][1]; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !s[ny * N + nx]) out.push([nx, ny]); }
    return out;
  }
  // 바른스도르프 순서(다음 갈 곳이 적은 칸 먼저) + 깊이 우선 탐색. 반환: {path:[...]} 또는 {fail:true(완전 탐색으로 불가)} 또는 null(시간 초과)
  function solve(x, y, s, count) {
    var budget = 60000, res = [], full = true;
    function dfs(x, y, cnt) {
      if (cnt === N * N) return true;
      if (--budget < 0) { full = false; return false; }
      var c = nexts(x, y, s);
      c.sort(function (a, b) {
        s[a[1] * N + a[0]] = 1; var da = deg(a[0], a[1], s); s[a[1] * N + a[0]] = 0;
        s[b[1] * N + b[0]] = 1; var db = deg(b[0], b[1], s); s[b[1] * N + b[0]] = 0;
        if (da !== db) return da - db;
        var ca = Math.abs(a[0] - (N - 1) / 2) + Math.abs(a[1] - (N - 1) / 2), cb = Math.abs(b[0] - (N - 1) / 2) + Math.abs(b[1] - (N - 1) / 2);
        return cb - ca;
      });
      for (var i = 0; i < c.length; i++) {
        var q = c[i]; s[q[1] * N + q[0]] = 1; res.push(q);
        if (dfs(q[0], q[1], cnt + 1)) { s[q[1] * N + q[0]] = 0; return true; }
        s[q[1] * N + q[0]] = 0; res.pop();
        if (budget < 0) return false;
      }
      return false;
    }
    var ok = dfs(x, y, count);
    if (ok) return { path: res };
    return full ? { fail: true } : null;
  }
  function computeStarts() {
    okStart = [];
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var good = true;
      if (N % 2 === 1 && (x + y) % 2 === 1) good = false; // 홀수 판은 많은 쪽 색에서만 출발 가능
      else if (N % 2 === 1) { var s = []; for (var i = 0; i < N * N; i++) s.push(0); s[y * N + x] = 1; var r = solve(x, y, s, 1); good = !(r && r.fail); }
      okStart.push(good);
    }
  }

  // ---------- 진행 ----------
  function newBoard(n) {
    N = n; maxN = Math.max(maxN || 0, n); path = []; seen = []; for (var i = 0; i < N * N; i++) seen.push(0);
    undo = 3; hint = 3; hintCell = null; anim = null; endT = 0; stuckMsg = '';
    cur = { x: Math.floor(N / 2), y: Math.floor(N / 2) };
    computeStarts(); phase = 'start'; CS = BS / N;
  }
  function reset() { banked = 0; boards = 0; total = 0; maxN = 5; newBoard(5); fx.clear(); hud(); }
  function score() { return banked + path.length * 10; }
  function cands() { if (!path.length) return []; var p = path[path.length - 1]; return nexts(p[0], p[1], seen); }
  function cx(x) { return BX + (x + 0.5) * CS; }
  function cy(y) { return BY + (y + 0.5) * CS; }
  function place(x, y) {
    if (!okStart[y * N + x]) { A.sfx('wall'); fx.text(cx(x), cy(y) - CS * 0.3, '여기선 완주 불가', '#ff4d6d', 18); return; }
    path.push([x, y]); seen[y * N + x] = 1; total++; phase = 'move'; cur = { x: x, y: y };
    fx.ring(cx(x), cy(y), '#e8e8ff', CS * 0.6, 0.4); A.sfx('power'); hud(); afterMove();
  }
  function step(x, y) {
    var p = path[path.length - 1];
    anim = { fx: p[0], fy: p[1], tx: x, ty: y, t: 0 };
    path.push([x, y]); seen[y * N + x] = 1; total++; hintCell = null; cur = { x: x, y: y };
    A.sfx('tick', 0.9 + path.length / (N * N) * 0.8); hud();
  }
  function landed() {
    var p = path[path.length - 1];
    fx.burst(cx(p[0]), cy(p[1]), '#e8e8ff', 10, 160, 0.35, 2.2); fx.text(cx(p[0]), cy(p[1]) - CS * 0.35, '+10', '#e8e8ff', 16); A.sfx('coin', 0.9 + path.length / (N * N) * 0.5);
    afterMove();
  }
  function afterMove() {
    if (path.length === N * N) { // 완주
      var bonus = N * N * 20; banked += N * N * 10 + bonus; boards++;
      phase = 'clear'; endT = 1.8;
      S.banner(N + '×' + N + ' 완주!', '+' + A.fmt(bonus) + ' 보너스'); A.sfx('level'); A.vibrate([20, 40, 20]);
      for (var i = 0; i < path.length; i++) (function (q, d) { setTimeout(function () { if (phase === 'clear') fx.burst(cx(q[0]), cy(q[1]), A.pick(['#ffd166', '#e8e8ff', '#b48cff']), 8, 180, 0.5, 2.6); }, d); })(path[i], i * 14);
      hud(); return;
    }
    if (!cands().length) { // 막힘: 즉시 판정
      phase = 'stuck'; fx.shake(8, 0.35); fx.flashIt('#ff2244', 0.35); A.sfx('hurt'); A.vibrate(140);
      stuckMsg = undo > 0 || hint > 0 ? '막혔어요! 되돌리기·힌트로 살리거나 끝내세요' : '막혔어요!';
      if (undo <= 0 && hint <= 0) endT = 1.1;
      hud();
    }
  }
  function doUndo() {
    if (S.state !== 'playing' || anim || phase === 'clear' || path.length < 2 || undo <= 0) { A.sfx('wall'); return; }
    var p = path.pop(); seen[p[1] * N + p[0]] = 0; total--; undo--; hintCell = null; endT = 0; phase = 'move';
    var q = path[path.length - 1]; cur = { x: q[0], y: q[1] };
    fx.ring(cx(p[0]), cy(p[1]), '#ff7aa8', CS * 0.5, 0.35); A.sfx('click'); hud();
  }
  function doHint() {
    if (S.state !== 'playing' || (phase !== 'move' && phase !== 'stuck') || anim || hint <= 0 || hintCell || endT > 0) { A.sfx('wall'); return; }
    var p = path[path.length - 1], r = solve(p[0], p[1], seen, path.length), back = 0;
    // 이대로는 완주가 안 되면, 완주할 수 있는 곳까지 자동으로 되돌린 뒤 다음 칸을 알려 줌 (되돌리기 횟수는 안 씀)
    while (r && r.fail && path.length > 1 && back < 60) {
      var q = path.pop(); seen[q[1] * N + q[0]] = 0; total--; back++;
      p = path[path.length - 1]; r = solve(p[0], p[1], seen, path.length);
    }
    if (r && r.fail) { A.sfx('wall'); return; }
    hint--; phase = 'move'; endT = 0; cur = { x: p[0], y: p[1] };
    if (back) { fx.text(A.clamp(cx(p[0]), BX + 110, BX + BS - 110), cy(p[1]) - CS * 0.5, back + '칸 되돌렸어요', '#ff7aa8', 20); fx.ring(cx(p[0]), cy(p[1]), '#ff7aa8', CS * 0.7, 0.45); }
    if (r && r.path.length) hintCell = r.path[0];
    else { // 시간 초과면 바른스도르프 규칙으로 추천
      var c = cands(), best = null, bd = 99; for (var i = 0; i < c.length; i++) { seen[c[i][1] * N + c[i][0]] = 1; var d = deg(c[i][0], c[i][1], seen); seen[c[i][1] * N + c[i][0]] = 0; if (d < bd) { bd = d; best = c[i]; } } hintCell = best;
    }
    A.sfx('power'); if (hintCell) fx.ring(cx(hintCell[0]), cy(hintCell[1]), '#ffd166', CS * 0.6, 0.5); hud();
  }
  function giveUp() { if (phase === 'stuck' && endT <= 0) { endT = 0.6; A.sfx('click'); } }
  function finish() { S.gameOver(score(), [['완주한 판', String(boards)], ['밟은 칸', String(total)], ['가장 큰 판', maxN + '×' + maxN]]); }
  function choose(x, y) {
    if (S.state !== 'playing' || anim || endT > 0) return;
    if (phase === 'start') { place(x, y); return; }
    if (phase !== 'move') return;
    var c = cands();
    for (var i = 0; i < c.length; i++) if (c[i][0] === x && c[i][1] === y) { step(x, y); return; }
    A.sfx('wall');
  }
  function update(dt) {
    fx.update(dt);
    if (anim) { anim.t += dt / 0.2; if (anim.t >= 1) { anim = null; landed(); } }
    if (endT > 0) {
      endT -= dt;
      if (endT <= 0) {
        if (phase === 'clear') { newBoard(Math.min(8, N + 1)); geo(S); S.banner(N + '×' + N, '출발할 칸을 고르세요'); hud(); }
        else if (phase === 'stuck') finish();
      }
    }
  }

  // ---------- 그리기 ----------
  var KN = A.sprite('kn-piece', 100, 100, function (x) {
    x.shadowColor = '#b48cff'; x.shadowBlur = 14;
    var g = x.createLinearGradient(0, 10, 0, 92); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#b9b9e8');
    x.fillStyle = g; x.beginPath();
    x.moveTo(28, 90); x.lineTo(74, 90); x.lineTo(72, 79); x.lineTo(66, 74);
    x.bezierCurveTo(63, 60, 68, 50, 72, 40); x.lineTo(66, 22); x.lineTo(60, 10); x.lineTo(53, 19);
    x.bezierCurveTo(40, 21, 30, 30, 24, 44); x.lineTo(19, 55); x.lineTo(25, 62); x.lineTo(36, 57); x.lineTo(45, 55);
    x.bezierCurveTo(40, 63, 34, 70, 33, 79); x.lineTo(28, 81); x.closePath(); x.fill();
    x.shadowBlur = 0; x.fillStyle = '#14142a'; x.beginPath(); x.arc(44, 33, 3.4, 0, 7); x.fill();
    x.strokeStyle = 'rgba(20,20,42,.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(64, 30); x.bezierCurveTo(60, 44, 58, 56, 62, 70); x.stroke();
    x.fillStyle = '#e8e8ff'; A.rr(x, 24, 86, 54, 8, 3); x.fill();
  });
  var GL = A.glowDot('#e8e8ff', 6), GOLD = A.glowDot('#ffd166', 6);
  function render(c) {
    var o = fx.offset(), t = S.time;
    if (!seen) { N = 5; path = []; seen = []; for (var z = 0; z < 25; z++) seen.push(0); okStart = []; for (z = 0; z < 25; z++) okStart.push(true); phase = 'start'; undo = 3; hint = 3; CS = BS / N; }
    c.save(); c.translate(o[0], o[1]);
    var bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0b0b1e'); bg.addColorStop(1, '#05050f'); c.fillStyle = bg; c.fillRect(-10, -10, W + 20, H + 20);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (var s = 0; s < 26; s++) { var sx = (s * 197 + t * 6) % W, sy = (s * 331) % H; c.fillStyle = 'rgba(232,232,255,' + (0.05 + 0.05 * Math.sin(t + s)) + ')'; c.fillRect(sx, sy, 2, 2); }
    c.restore();
    // 판
    c.fillStyle = '#1b1b36'; A.rr(c, BX - 8, BY - 8, BS + 16, BS + 16, land ? 6 : 16); c.fill();
    c.strokeStyle = 'rgba(232,232,255,.35)'; c.lineWidth = 2; c.stroke();
    var cs = cands(), done = phase === 'clear';
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var i = y * N + x, px = BX + x * CS, py = BY + y * CS;
      c.fillStyle = (x + y) % 2 ? '#15152c' : '#23234a'; c.fillRect(px, py, CS, CS);
      if (seen[i]) { c.fillStyle = done ? 'rgba(255,209,102,' + (0.18 + 0.12 * Math.sin(t * 6 + i)) + ')' : 'rgba(180,140,255,.2)'; c.fillRect(px + 2, py + 2, CS - 4, CS - 4); }
      if (phase === 'start' && S.state === 'playing') {
        if (okStart[i]) { c.fillStyle = 'rgba(232,232,255,' + (0.18 + 0.1 * Math.sin(t * 4 + i * 0.7)) + ')'; c.beginPath(); c.arc(px + CS / 2, py + CS / 2, CS * 0.12, 0, 7); c.fill(); }
        else { c.strokeStyle = 'rgba(255,77,109,.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(px + CS * 0.4, py + CS * 0.4); c.lineTo(px + CS * 0.6, py + CS * 0.6); c.moveTo(px + CS * 0.6, py + CS * 0.4); c.lineTo(px + CS * 0.4, py + CS * 0.6); c.stroke(); }
      }
    }
    // 지나온 길
    var shown = anim ? path.length - 1 : path.length;
    if (shown > 1) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round'; c.lineCap = 'round';
      c.strokeStyle = 'rgba(180,140,255,.22)'; c.lineWidth = Math.max(6, CS * 0.1); c.beginPath();
      for (var k = 0; k < shown; k++) { if (k) c.lineTo(cx(path[k][0]), cy(path[k][1])); else c.moveTo(cx(path[k][0]), cy(path[k][1])); } c.stroke();
      c.strokeStyle = 'rgba(232,232,255,.55)'; c.lineWidth = 2; c.stroke();
      c.restore();
    }
    // 방문 순서 숫자
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 ' + Math.round(CS * 0.26) + 'px "Chakra Petch", system-ui';
    for (k = 0; k < shown - 1; k++) { var q = path[k]; c.fillStyle = 'rgba(16,16,36,.85)'; c.beginPath(); c.arc(cx(q[0]), cy(q[1]), CS * 0.2, 0, 7); c.fill(); c.fillStyle = 'rgba(232,232,255,.82)'; c.fillText(String(k + 1), cx(q[0]), cy(q[1]) + 1); }
    // 갈 수 있는 칸
    if (!anim && phase === 'move' && S.state === 'playing') {
      for (k = 0; k < cs.length; k++) {
        var a = cs[k], ax = cx(a[0]), ay = cy(a[1]), pulse = 0.5 + 0.5 * Math.sin(t * 5 + k);
        c.strokeStyle = 'rgba(155,231,255,' + (0.5 + pulse * 0.4) + ')'; c.lineWidth = 3; A.rr(c, ax - CS / 2 + 5, ay - CS / 2 + 5, CS - 10, CS - 10, CS * 0.16); c.stroke();
        c.fillStyle = 'rgba(155,231,255,.12)'; c.fill();
        c.fillStyle = '#9be7ff'; c.font = '700 ' + Math.round(Math.max(13, CS * 0.2)) + 'px "Chakra Petch", system-ui';
        c.fillText(String(k + 1), ax - CS / 2 + Math.max(14, CS * 0.2), ay - CS / 2 + Math.max(14, CS * 0.2));
      }
      if (hintCell) { c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, GOLD, cx(hintCell[0]), cy(hintCell[1]), CS / 22 * (1 + Math.sin(t * 8) * 0.15)); c.restore(); }
    }
    // 키보드 커서
    if (kbd && S.state === 'playing' && phase === 'start') { c.strokeStyle = '#ffd166'; c.lineWidth = 3; c.strokeRect(BX + cur.x * CS + 3, BY + cur.y * CS + 3, CS - 6, CS - 6); }
    // 나이트
    var kp = null, hop = 0;
    if (anim) { var e = anim.t < 0 ? 0 : anim.t, ee = e * e * (3 - 2 * e); kp = [A.lerp(cx(anim.fx), cx(anim.tx), ee), A.lerp(cy(anim.fy), cy(anim.ty), ee)]; hop = Math.sin(e * Math.PI) * CS * 0.45; }
    else if (path.length) { var lp = path[path.length - 1]; kp = [cx(lp[0]), cy(lp[1])]; }
    else if (S.state !== 'playing') kp = [cx(2), cy(2)];
    if (kp) {
      c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, GL, kp[0], kp[1] + CS * 0.3, CS / 30); c.restore();
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(kp[0], kp[1] + CS * 0.36, CS * 0.28 * (1 - hop / CS), CS * 0.07, 0, 0, 7); c.fill();
      var sc = CS * 0.82 / 100 * (phase === 'stuck' ? 1 + Math.sin(t * 30) * 0.03 : 1);
      A.draw(c, KN, kp[0], kp[1] - hop - CS * 0.04, sc);
    }
    if (phase === 'stuck' && path.length) { var sp = path[path.length - 1]; c.strokeStyle = 'rgba(255,77,109,' + (0.6 + 0.4 * Math.sin(t * 10)) + ')'; c.lineWidth = 4; c.strokeRect(BX + sp[0] * CS + 3, BY + sp[1] * CS + 3, CS - 6, CS - 6); }
    // 첫 판 안내: 처음 두 번 움직일 때까지 판 아래쪽에 짧은 설명
    if (tut && S.state === 'playing' && (phase === 'start' || phase === 'move') && path.length < 3) {
      var tm = phase === 'start' ? (document.body.classList.contains('touch') ? '아무 칸이나 눌러 나이트를 놓으세요' : '방향키로 칸을 고르고 Space') : (document.body.classList.contains('touch') ? '파란 칸 = L자로 갈 수 있는 곳. 눌러 보세요' : '파란 칸 = L자로 갈 수 있는 곳 · 숫자 키로 이동');
      c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 19px "Pretendard Variable", system-ui';
      var tw = c.measureText(tm).width + 40, ty2 = BY + BS - 34;
      c.fillStyle = 'rgba(11,11,30,.86)'; A.rr(c, W / 2 - tw / 2, ty2 - 22, tw, 44, 22); c.fill(); c.strokeStyle = 'rgba(155,231,255,.7)'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#9be7ff'; c.fillText(tm, W / 2, ty2 + 1); c.restore();
    }
    if (tut && path && path.length >= 3) { tut = false; A.set('neowa_knight_tut', 1); }
    // 세로 화면: 안내 글·버튼
    if (!land) {
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#e8e8ff'; c.font = '700 21px "Pretendard Variable", system-ui';
      var msg = S.state !== 'playing' ? '' : phase === 'start' ? '출발할 칸을 고르세요' : phase === 'stuck' ? stuckMsg : phase === 'clear' ? '완주! 다음 판으로' : '남은 칸 ' + (N * N - path.length) + ' · L자로 이동';
      if (phase === 'stuck') c.fillStyle = '#ff7aa8';
      c.fillText(msg, W / 2, BY - 40);
      if (S.state === 'playing') btns().forEach(function (b) {
        c.fillStyle = b.on ? b.bg : 'rgba(255,255,255,.04)'; A.rr(c, b.x, b.y, b.w, b.h, 16); c.fill();
        c.strokeStyle = b.on ? b.fg : 'rgba(255,255,255,.12)'; c.lineWidth = 1.5; c.stroke();
        c.fillStyle = b.on ? b.fg : 'rgba(255,255,255,.3)'; c.font = '700 19px "Pretendard Variable", system-ui'; c.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
      });
      c.fillStyle = 'rgba(232,232,255,.45)'; c.font = '500 15px "Pretendard Variable", system-ui';
      if (S.state === 'playing') c.fillText(kbdHint(), W / 2, 860);
    }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function kbdHint() { return document.body.classList.contains('touch') ? '파란 칸을 눌러 이동 · 판을 다 밟으면 다음 판' : '숫자 1~8 이동 · U 되돌리기 · H 힌트'; }
  function btns() {
    var y = BY + BS + 46, st = phase === 'stuck';
    if (st && (undo > 0 || hint > 0)) return [
      { id: 'undo', x: 40, y: y, w: 144, h: 66, label: '되돌리기 ' + undo, on: undo > 0, fg: '#ff7aa8', bg: 'rgba(255,122,168,.15)' },
      { id: 'hint', x: 198, y: y, w: 144, h: 66, label: '힌트 ' + hint, on: hint > 0, fg: '#ffd166', bg: 'rgba(255,209,102,.15)' },
      { id: 'end', x: 356, y: y, w: 144, h: 66, label: '끝내기', on: true, fg: '#e8e8ff', bg: 'rgba(232,232,255,.1)' }];
    var mv = phase === 'move' && !anim;
    return [
      { id: 'undo', x: 40, y: y, w: 220, h: 66, label: '되돌리기 ' + undo, on: mv && undo > 0 && path.length > 1, fg: '#ff7aa8', bg: 'rgba(255,122,168,.15)' },
      { id: 'hint', x: 280, y: y, w: 220, h: 66, label: '힌트 ' + hint, on: mv && hint > 0 && !hintCell, fg: '#ffd166', bg: 'rgba(255,209,102,.15)' }];
  }
  function act(id) { if (id === 'undo') doUndo(); else if (id === 'hint') doHint(); else if (id === 'end') giveUp(); }

  // ---------- 점수판 ----------
  var pEl = {}, lastHud = '';
  function hud() {
    if (!seen) return;
    var sc = score(), k = [sc, path.length, N, undo, hint, phase, S ? S.state : '', !!hintCell].join('|');
    if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(sc);
    document.getElementById('hB').textContent = path.length + '/' + N * N;
    document.getElementById('hC').textContent = N + '×' + N;
    document.getElementById('hMult').textContent = boards ? '완주 ' + boards + '판' : '';
    if (!pEl.turn) return;
    var play = S && S.state === 'playing';
    pEl.turn.textContent = !play ? N + '×' + N + ' 판' : phase === 'start' ? '출발할 칸을 고르세요' : phase === 'stuck' ? '막혔어요!' : phase === 'clear' ? '완주!' : '남은 칸 ' + (N * N - path.length);
    pEl.sub.textContent = !play ? '시작하기를 누르세요' : phase === 'start' ? (N % 2 ? '× 표시 칸에서는 완주할 수 없어요' : '아무 칸이나 괜찮아요') : phase === 'stuck' ? (undo > 0 || hint > 0 ? '되돌리기·힌트로 살리거나 끝내기' : '잠시 후 결과') : 'L자로 갈 수 있는 파란 칸을 누르세요';
    pEl.score.textContent = A.fmt(sc); pEl.vis.textContent = path.length + '/' + N * N; pEl.board.textContent = N + '×' + N;
    pEl.undoN.textContent = undo; pEl.hintN.textContent = hint;
    var st = phase === 'stuck';
    pEl.undoB.disabled = !play || undo <= 0 || path.length < 2 || phase === 'clear';
    pEl.hintB.disabled = !play || (phase !== 'move' && phase !== 'stuck') || hint <= 0 || !!hintCell || endT > 0;
    pEl.endB.style.display = st && (undo > 0 || hint > 0) ? '' : 'none';
  }

  // ---------- 입력 ----------
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; kbd = false; var p = S.toLocal(e);
    if (!land) { var bs = btns(); for (var i = 0; i < bs.length; i++) { var b = bs[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) { if (b.on) act(b.id); else A.sfx('wall'); return; } } }
    var x = Math.floor((p.x - BX) / CS), y = Math.floor((p.y - BY) / CS);
    if (x >= 0 && y >= 0 && x < N && y < N) choose(x, y);
  });
  var S = null;
  S = new A.Shell({
    id: 'knight', W: W, H: H, land: [720, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (/^[1-8]$/.test(k) && phase === 'move' && !anim) { var c = cands(), n = +k - 1; if (c[n]) choose(c[n][0], c[n][1]); else A.sfx('wall'); return; }
      if (k === 'u') { doUndo(); return; }
      if (k === 'h') { doHint(); return; }
      if (phase === 'stuck' && (k === ' ' || k === 'Enter') && !e.repeat) { giveUp(); return; }
      if (phase === 'start') {
        kbd = true;
        if (k === 'ArrowLeft' || k === 'a') cur.x = Math.max(0, cur.x - 1); if (k === 'ArrowRight' || k === 'd') cur.x = Math.min(N - 1, cur.x + 1);
        if (k === 'ArrowUp' || k === 'w') cur.y = Math.max(0, cur.y - 1); if (k === 'ArrowDown' || k === 's') cur.y = Math.min(N - 1, cur.y + 1);
        if ((k === ' ' || k === 'Enter') && !e.repeat) choose(cur.x, cur.y);
      }
    }
  });
  // 가로 화면 오른쪽 패널: 안내·점수·큰 버튼 (게임판 위 점수판은 가로에서 숨김)
  document.querySelector('.g-hud').setAttribute('data-land-hide', '');
  var ICU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>';
  var ICH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z"/></svg>';
  S.panelSlot.innerHTML = '<div class="g-card gp-turn"><div><b id="pkTurn"></b><span id="pkSub"></span></div></div>' +
    '<div class="g-card gp-stats"><div><span>SCORE</span><b id="pkScore">0</b></div><div><span>밟은 칸</span><b id="pkVis">0</b></div><div><span>판</span><b id="pkBoard">5×5</b></div></div>' +
    '<button class="gp-btn main" id="pkUndo">' + ICU + '되돌리기 <span class="cnt" id="pkUndoN">3</span></button>' +
    '<button class="gp-btn" id="pkHint">' + ICH + '힌트 <span class="cnt" id="pkHintN">3</span></button>' +
    '<button class="gp-btn" id="pkEnd" style="display:none">여기서 끝내기</button>';
  pEl = { turn: document.getElementById('pkTurn'), sub: document.getElementById('pkSub'), score: document.getElementById('pkScore'), vis: document.getElementById('pkVis'), board: document.getElementById('pkBoard'), undoN: document.getElementById('pkUndoN'), hintN: document.getElementById('pkHintN'), undoB: document.getElementById('pkUndo'), hintB: document.getElementById('pkHint'), endB: document.getElementById('pkEnd') };
  pEl.undoB.addEventListener('click', doUndo); pEl.hintB.addEventListener('click', doHint); pEl.endB.addEventListener('click', giveUp);
  new MutationObserver(function () { lastHud = ''; hud(); }).observe(document.body, { attributes: true, attributeFilter: ['data-state'] });
  setInterval(hud, 250);
  N = 5; path = []; seen = []; for (var z = 0; z < 25; z++) seen.push(0); okStart = []; for (z = 0; z < 25; z++) okStart.push(true); phase = 'start'; undo = 3; hint = 3; banked = 0; boards = 0; CS = BS / N; hud();
})();
