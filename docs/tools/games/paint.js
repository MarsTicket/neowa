(function () {
  'use strict';
  // 한붓 그리기: 시작 칸에서 손을 떼지 않고 끌어 모든 빈칸을 정확히 한 번씩 칠하기. 10분 동안 최대한 많은 단계
  var A = Arcade, W = 540, H = 960, LIMIT = 600;
  var fx = new A.FX();
  var land = false, BX = 30, BY = 180, BS = 480, CS = 96;
  var N, wall, sol, path, onPath, stage, score, time, hints, hintN, used, clearT, dragging, startT, stageHints, total, lastCell = -1;

  function geo(sh) {
    land = !!(sh && sh.land); W = sh ? sh.W : 540; H = sh ? sh.H : 960;
    if (land) { BS = W - 40; BX = BY = 20; } else { BS = 480; BX = 30; BY = 180; }
    CS = BS / (N || 5);
  }
  // ---------- 판 만들기: 벽을 먼저 놓고, 남은 칸 전체를 지나는 한붓 경로를 실제로 찾은 판만 씀 → 항상 풀림 ----------
  function nb(i) { var x = i % N, y = (i / N) | 0, o = []; if (y > 0) o.push(i - N); if (x < N - 1) o.push(i + 1); if (y < N - 1) o.push(i + N); if (x > 0) o.push(i - 1); return o; }
  function freeDeg(i, w, vis) { var d = 0, a = nb(i); for (var k = 0; k < a.length; k++) if (!w[a[k]] && !vis[a[k]]) d++; return d; }
  function findPath(w, start, need) {
    var vis = {}, out = [start], budget = 25000; vis[start] = 1;
    function dfs(i) {
      if (out.length === need) return true;
      if (--budget < 0) return false;
      var a = nb(i).filter(function (j) { return !w[j] && !vis[j]; });
      // 막다른 칸이 둘 이상 생기면 가지치기
      a.sort(function (p, q) { return freeDeg(p, w, vis) - freeDeg(q, w, vis) || Math.random() - 0.5; });
      for (var k = 0; k < a.length; k++) {
        var j = a[k]; vis[j] = 1; out.push(j);
        if (dfs(j)) return true;
        vis[j] = 0; out.pop(); if (budget < 0) return false;
      }
      return false;
    }
    return dfs(start) ? out : null;
  }
  function gen(n, k) {
    N = n;
    for (var at = 0; at < 300; at++) {
      var w = {}, cnt = 0, kk = at > 200 ? Math.max(0, k - 2) : k;
      while (cnt < kk) { var r = A.irand(0, N * N - 1); if (!w[r]) { w[r] = 1; cnt++; } }
      var free = [], i; for (i = 0; i < N * N; i++) if (!w[i]) free.push(i);
      // 이어져 있는지
      var seen = {}, q = [free[0]], c = 0; seen[free[0]] = 1;
      while (q.length) { var u = q.pop(); c++; nb(u).forEach(function (v) { if (!w[v] && !seen[v]) { seen[v] = 1; q.push(v); } }); }
      if (c !== free.length) continue;
      var ends = free.filter(function (j) { return freeDeg(j, w, {}) <= 1; });
      if (ends.length > 2) continue;
      var st = ends.length ? A.pick(ends) : A.pick(free);
      var p = findPath(w, st, free.length);
      if (p) return { wall: w, sol: p };
    }
    var snake = []; for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) snake.push(y * N + (y % 2 ? N - 1 - x : x));
    return { wall: {}, sol: snake };
  }
  function setup() {
    var n = [5, 5, 6, 6, 7, 7, 8][Math.min(stage - 1, 6)], k = { 5: [2, 4], 6: [3, 6], 7: [4, 8], 8: [5, 10] }[n];
    var g = gen(n, A.irand(k[0], k[1]));
    wall = g.wall; sol = g.sol; path = [sol[0]]; onPath = {}; onPath[sol[0]] = 1; hintN = 0; stageHints = 3; clearT = 0; startT = time; dragging = false;
    total = 0; for (var i = 0; i < N * N; i++) if (!wall[i]) total++;
    CS = BS / N;
  }
  function reset() { stage = 1; score = 0; time = 0; used = 0; setup(); fx.clear(); hud(); }

  // ---------- 칠하기 ----------
  function adj(a, b) { var ax = a % N, ay = (a / N) | 0, bx = b % N, by = (b / N) | 0; return Math.abs(ax - bx) + Math.abs(ay - by) === 1; }
  function head() { return path[path.length - 1]; }
  function cut(i) { // i 칸 뒤로 칠한 것을 지움
    var k = path.indexOf(i); if (k < 0) return;
    if (k === path.length - 1) return;
    while (path.length - 1 > k) delete onPath[path.pop()];
    A.sfx('turn', 0.8);
  }
  function enter(i) {
    if (clearT > 0 || S.state !== 'playing') return false;
    if (i === head()) return true;
    if (onPath[i]) { if (path.length > 1 && i === path[path.length - 2]) { delete onPath[path.pop()]; A.sfx('turn', 0.8); return true; } cut(i); return true; }
    if (wall[i] || !adj(head(), i)) return false;
    path.push(i); onPath[i] = 1; A.sfx('tick', 0.8 + path.length / total * 0.9);
    if (path.length === total) clear();
    return true;
  }
  function clear() {
    var secs = time - startT, bonus = Math.max(0, Math.round((total * 1.6 - secs) * 4)), pen = hintN * 40, pts = Math.max(10, total * 10 + bonus - pen);
    score += pts; clearT = 1.5; dragging = false;
    S.banner('STAGE ' + stage + ' CLEAR', '+' + A.fmt(pts) + (bonus ? ' (빠르게 +' + bonus + ')' : '')); A.sfx('level'); A.vibrate([20, 40, 20]);
    path.forEach(function (c, k) { setTimeout(function () { if (clearT > 0) fx.burst(cxi(c), cyi(c), hue(k), 6, 160, 0.45, 2.5); }, k * 12); });
    hud();
  }
  function hint() {
    if (S.state !== 'playing' || clearT > 0 || stageHints <= 0) { A.sfx('wall'); return; }
    // 정답과 같은 부분까지 되돌린 뒤, 다음 3칸을 칠해 줌
    // 먼저 지금 칠한 길 그대로 이어서 풀리는지 찾아봄 → 되면 지우지 않고 다음 3칸을 칠해 줌
    var w2 = {}, i2; for (i2 in wall) w2[i2] = 1; for (i2 = 0; i2 < path.length - 1; i2++) w2[path[i2]] = 1;
    var rest = findPath(w2, head(), total - path.length + 1), plan = null;
    if (rest) plan = path.concat(rest.slice(1));
    else { // 안 되면 정답과 같은 부분까지 되돌림
      var k = 0; while (k < path.length && path[k] === sol[k]) k++;
      if (k < path.length) { cut(sol[k - 1]); fx.text(W / 2, land ? BY + 40 : BY - 30, '여기까지 되돌렸어요', '#ff7aa8', 18); }
      plan = sol;
    }
    for (var s = 0; s < 3 && path.length < total; s++) { var nx = plan[path.length]; path.push(nx); onPath[nx] = 1; fx.ring(cxi(nx), cyi(nx), '#ffd166', CS * 0.5, 0.4); }
    stageHints--; hintN++; used++; A.sfx('power');
    if (path.length === total) clear();
    hud();
  }
  function wipe() { if (S.state !== 'playing' || clearT > 0 || path.length < 2) { A.sfx('wall'); return; } cut(path[0]); A.sfx('click'); }
  function update(dt) {
    fx.update(dt);
    if (clearT > 0) { clearT -= dt; if (clearT <= 0) { stage++; setup(); geo(S); S.banner('STAGE ' + stage, N + '×' + N); } hud(); return; }
    time += dt;
    if (time >= LIMIT) { time = LIMIT; hud(); S.gameOver(score, [['단계', String(stage - 1) + ' 클리어'], ['힌트', String(used) + '번'], ['시간', '10:00']], { kick: 'TIME UP', win: true }); return; }
    hud();
  }

  // ---------- 그리기 ----------
  function cxi(i) { return BX + (i % N + 0.5) * CS; }
  function cyi(i) { return BY + (((i / N) | 0) + 0.5) * CS; }
  function hue(k) { var h = (330 + k / Math.max(1, total) * 70) % 360; return 'hsl(' + h + ',95%,68%)'; }
  var BRUSH = A.glowDot('#ffffff', 7);
  function render(c) {
    var o = fx.offset(), t = S.time;
    if (!wall) { stage = 1; time = 0; score = 0; used = 0; setup(); }
    c.save(); c.translate(o[0], o[1]);
    var bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#16050d'); bg.addColorStop(1, '#0a0208'); c.fillStyle = bg; c.fillRect(-10, -10, W + 20, H + 20);
    c.fillStyle = '#22091a'; A.rr(c, BX - 10, BY - 10, BS + 20, BS + 20, land ? 8 : 20); c.fill(); c.strokeStyle = 'rgba(255,122,168,.4)'; c.lineWidth = 2; c.stroke();
    var i, g = CS * 0.08;
    for (i = 0; i < N * N; i++) {
      var x = BX + (i % N) * CS, y = BY + ((i / N) | 0) * CS;
      if (wall[i]) {
        c.fillStyle = '#0c0308'; A.rr(c, x + g * 0.5, y + g * 0.5, CS - g, CS - g, CS * 0.14); c.fill();
        c.strokeStyle = 'rgba(255,122,168,.12)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + CS * 0.25, y + CS * 0.25); c.lineTo(x + CS * 0.75, y + CS * 0.75); c.moveTo(x + CS * 0.75, y + CS * 0.25); c.lineTo(x + CS * 0.25, y + CS * 0.75); c.stroke();
      } else { c.fillStyle = 'rgba(255,255,255,.06)'; A.rr(c, x + g, y + g, CS - g * 2, CS - g * 2, CS * 0.16); c.fill(); }
    }
    // 칠한 칸
    for (var k = 0; k < path.length; k++) { var p = path[k]; c.fillStyle = hue(k); c.globalAlpha = 0.85; A.rr(c, BX + (p % N) * CS + g, BY + ((p / N) | 0) * CS + g, CS - g * 2, CS - g * 2, CS * 0.16); c.fill(); }
    c.globalAlpha = 1;
    // 붓 자국 선
    if (path.length > 1) {
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = Math.max(4, CS * 0.12); c.beginPath();
      for (k = 0; k < path.length; k++) { if (k) c.lineTo(cxi(path[k]), cyi(path[k])); else c.moveTo(cxi(path[k]), cyi(path[k])); } c.stroke(); c.restore();
    }
    // 시작 칸 표시
    var s0 = sol[0]; c.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(t * 5)) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(cxi(s0), cyi(s0), CS * 0.3, 0, 7); c.stroke();
    if (path.length === 1 && S.state === 'playing') { c.fillStyle = '#fff'; c.font = '700 ' + Math.round(CS * 0.17) + 'px "Chakra Petch", system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('START', cxi(s0), cyi(s0) + CS * 0.42 - g); }
    // 붓 머리
    var hd = head(); c.save(); c.globalCompositeOperation = 'lighter'; A.draw(c, BRUSH, cxi(hd), cyi(hd), CS / 40 * (1 + Math.sin(t * 8) * 0.12)); c.restore();
    // 막다른 상황 알림 (칠할 수 있는 이웃 칸이 없는데 아직 남은 칸이 있음)
    var stuck = path.length < total && clearT <= 0 && !nb(hd).some(function (j) { return !wall[j] && !onPath[j]; });
    if (stuck) { c.strokeStyle = 'rgba(255,77,109,' + (0.5 + 0.5 * Math.sin(t * 10)) + ')'; c.lineWidth = 4; c.strokeRect(BX + (hd % N) * CS + 2, BY + ((hd / N) | 0) * CS + 2, CS - 4, CS - 4); }
    if (!land) {
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 21px "Pretendard Variable", system-ui';
      c.fillStyle = stuck ? '#ff7aa8' : '#ffd9e6';
      var msg = S.state !== 'playing' ? '' : clearT > 0 ? '완성!' : stuck ? '막혔어요! 칠한 칸으로 되돌아가세요' : path.length === 1 ? 'START 칸부터 끌어서 칠하세요' : '남은 칸 ' + (total - path.length);
      c.fillText(msg, W / 2, BY - 45);
      if (S.state === 'playing') btns().forEach(function (b) {
        c.fillStyle = b.on ? b.bg : 'rgba(255,255,255,.04)'; A.rr(c, b.x, b.y, b.w, b.h, 16); c.fill(); c.strokeStyle = b.on ? b.fg : 'rgba(255,255,255,.12)'; c.lineWidth = 1.5; c.stroke();
        c.fillStyle = b.on ? b.fg : 'rgba(255,255,255,.3)'; c.font = '700 19px "Pretendard Variable", system-ui'; c.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
      });
      if (S.state === 'playing') { c.fillStyle = 'rgba(255,217,230,.45)'; c.font = '500 15px "Pretendard Variable", system-ui'; c.fillText(document.body.classList.contains('touch') ? '칠한 칸을 누르면 그 뒤가 지워져요' : '방향키 한 칸씩 · Backspace 되돌리기 · H 힌트', W / 2, BY + BS + 150); }
    }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function btns() {
    var y = BY + BS + 40, on = clearT <= 0;
    return [{ id: 'wipe', x: 40, y: y, w: 220, h: 66, label: '전부 지우기', on: on && path.length > 1, fg: '#ffd9e6', bg: 'rgba(255,217,230,.1)' },
      { id: 'hint', x: 280, y: y, w: 220, h: 66, label: '힌트 ' + stageHints + ' (−40)', on: on && stageHints > 0, fg: '#ffd166', bg: 'rgba(255,209,102,.15)' }];
  }

  // ---------- 점수판 ----------
  function fmtT(s) { s = Math.max(0, Math.ceil(LIMIT - s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  var lastHud = '', pEl = {};
  function hud() {
    if (!wall) return;
    var k = [score, stage, fmtT(time), path.length, stageHints, clearT > 0, S ? S.state : ''].join('|'); if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = stage; document.getElementById('hC').textContent = fmtT(time);
    document.getElementById('hMult').textContent = N + '×' + N;
    if (!pEl.turn) return;
    var play = S && S.state === 'playing';
    pEl.turn.textContent = !play ? '10분 동안 최대한 많이' : clearT > 0 ? '완성!' : path.length === 1 ? 'START 칸부터 끌기' : '남은 칸 ' + (total - path.length);
    pEl.sub.textContent = !play ? '시작하기를 누르세요' : '칠한 칸을 누르면 그 뒤가 지워져요';
    pEl.score.textContent = A.fmt(score); pEl.stage.textContent = stage; pEl.time.textContent = fmtT(time);
    pEl.hintN.textContent = stageHints; pEl.hintB.disabled = !play || stageHints <= 0 || clearT > 0; pEl.wipeB.disabled = !play || path.length < 2 || clearT > 0;
  }

  // ---------- 입력 ----------
  function cellAt(e) { var p = S.toLocal(e), x = Math.floor((p.x - BX) / CS), y = Math.floor((p.y - BY) / CS); return x >= 0 && y >= 0 && x < N && y < N ? y * N + x : -1; }
  function track(i) { // 빠르게 끌어서 칸을 건너뛰어도 한 칸씩 따라감
    if (i < 0) return;
    var guard = 0;
    while (i !== head() && guard++ < 20) {
      if (onPath[i]) { enter(i); return; }
      var h = head(), hx = h % N, hy = (h / N) | 0, tx = i % N, ty = (i / N) | 0, step = -1;
      var cand = [];
      if (tx !== hx) cand.push(hy * N + hx + (tx > hx ? 1 : -1));
      if (ty !== hy) cand.push((hy + (ty > hy ? 1 : -1)) * N + hx);
      if (Math.abs(tx - hx) < Math.abs(ty - hy)) cand.reverse();
      for (var k = 0; k < cand.length; k++) if (!wall[cand[k]] && !onPath[cand[k]]) { step = cand[k]; break; }
      if (step < 0 || !enter(step)) return;
      if (clearT > 0) return;
    }
  }
  var stage_ = document.getElementById('stage');
  stage_.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; e.preventDefault(); var p = S.toLocal(e);
    if (!land) { var bs = btns(); for (var b = 0; b < bs.length; b++) { var q = bs[b]; if (p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) { if (!q.on) { A.sfx('wall'); return; } if (q.id === 'hint') hint(); else wipe(); return; } } }
    var i = cellAt(e); if (i < 0 || clearT > 0) return;
    if (onPath[i]) { cut(i); dragging = true; }
    else if (adj(head(), i) && !wall[i]) { enter(i); dragging = true; }
    else { A.sfx('wall'); }
  });
  window.addEventListener('pointermove', function (e) { if (!dragging || S.state !== 'playing') return; track(cellAt(e)); });
  window.addEventListener('pointerup', function () { dragging = false; }); window.addEventListener('pointercancel', function () { dragging = false; });
  var S = null;
  S = new A.Shell({
    id: 'paint', W: W, H: H, land: [720, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) {
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key, h = head(), x = h % N, y = (h / N) | 0, t = -1;
      if (k === 'ArrowLeft' || k === 'a') { if (x > 0) t = h - 1; } else if (k === 'ArrowRight' || k === 'd') { if (x < N - 1) t = h + 1; }
      else if (k === 'ArrowUp' || k === 'w') { if (y > 0) t = h - N; } else if (k === 'ArrowDown' || k === 's') { if (y < N - 1) t = h + N; }
      else if (k === 'Backspace' || k === 'z') { e.preventDefault(); if (path.length > 1 && clearT <= 0) { delete onPath[path.pop()]; A.sfx('turn', 0.8); } return; }
      else if (k === 'h') { hint(); return; } else if (k === 'x') { wipe(); return; } else return;
      if (t >= 0 && !enter(t)) A.sfx('wall');
    }
  });
  document.querySelector('.g-hud').setAttribute('data-land-hide', '');
  S.panelSlot.innerHTML = '<div class="g-card gp-turn"><div><b id="pkTurn"></b><span id="pkSub"></span></div></div>' +
    '<div class="g-card gp-stats"><div><span>SCORE</span><b id="pkScore">0</b></div><div><span>STAGE</span><b id="pkStage">1</b></div><div><span>TIME</span><b id="pkTime">10:00</b></div></div>' +
    '<button class="gp-btn main" id="pkHint">힌트 (−40) <span class="cnt" id="pkHintN">3</span></button>' +
    '<button class="gp-btn" id="pkWipe">전부 지우기</button>';
  pEl = { turn: document.getElementById('pkTurn'), sub: document.getElementById('pkSub'), score: document.getElementById('pkScore'), stage: document.getElementById('pkStage'), time: document.getElementById('pkTime'), hintN: document.getElementById('pkHintN'), hintB: document.getElementById('pkHint'), wipeB: document.getElementById('pkWipe') };
  pEl.hintB.addEventListener('click', hint); pEl.wipeB.addEventListener('click', wipe);
  new MutationObserver(function () { lastHud = ''; hud(); }).observe(document.body, { attributes: true, attributeFilter: ['data-state'] });
  if (!wall) { stage = 1; time = 0; score = 0; used = 0; setup(); } geo(S); hud();
})();
