(function () {
  'use strict';
  // 합 퍼즐: 가로·세로 줄마다 합계 단서. 빈칸에 1~9를 넣되 한 줄 안에서 중복 없이, 합이 단서와 같게. 답이 하나뿐인 판만 냄
  var A = Arcade, W = 540, H = 960;
  var DIFFS = [{ n: 6, base: 1200, name: '쉬움', black: 0.2 }, { n: 8, base: 3000, name: '보통', black: 0.24 }, { n: 9, base: 6000, name: '어려움', black: 0.26 }];
  var diff = +A.get('neowa_sum_diff', '0') || 0;
  var fx = new A.FX();
  var N, CS, GX = 18, GY = 120, PAD_Y = 700, PAD_H = 78, TOOL_Y = 792, TOOL_H = 66, land = false, pEl = {};
  // 가로 화면: 960x720 (왼쪽 680 판 + 오른쪽 숫자 3x3·도구 버튼)
  function geo(sh) { land = !!(sh && sh.land); W = sh ? sh.W : 540; H = sh ? sh.H : 960; lay(); }
  function lay() { if (!N) return; var bs = land ? 680 : 504; CS = Math.floor(bs / N); GX = land ? 20 + (bs - CS * N) / 2 : (W - CS * N) / 2; GY = land ? 20 : 120; }
  function padRect(d) { if (land) return { x: 722 + ((d - 1) % 3) * 78, y: 172 + Math.floor((d - 1) / 3) * 78, w: 72, h: 72 }; var pw = 504 / 9; return { x: 18 + (d - 1) * pw + 3, y: PAD_Y, w: pw - 6, h: PAD_H }; }
  function toolRect(i) { if (land) return { x: 722, y: 418 + i * 66, w: 228, h: 58 }; var tw = 504 / 3; return { x: 18 + i * tw + 4, y: TOOL_Y, w: tw - 8, h: TOOL_H }; }
  function inR(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
  var D, white, given = {}, sol, val, notes, wrong, runs, runOf, sel = 0, noteMode = false, mistakes = 0, hints = 0, time = 0, winT = 0, dyingT = 0, flash = [];

  // ---------- 판 만들기 ----------
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pattern(n, p) {
    // 0행·0열은 단서 칸. 안쪽을 무작위 흑백으로 → 1칸짜리 줄 없애기, 7칸 이상 줄 자르기 → 흰 칸이 모두 이어져 있는지 확인
    for (var at = 0; at < 400; at++) {
      var w = []; for (var i = 0; i < n * n; i++) w.push(false);
      for (var y = 1; y < n; y++) for (var x = 1; x < n; x++) w[y * n + x] = Math.random() > p;
      var changed = true, guard = 0;
      while (changed && guard++ < 60) {
        changed = false;
        for (var dir = 0; dir < 2; dir++) for (var a = 1; a < n; a++) {
          var b = 1;
          while (b < n) {
            var id = dir ? b * n + a : a * n + b; if (!w[id]) { b++; continue; }
            var e = b; while (e < n && w[dir ? e * n + a : a * n + e]) e++;
            var len = e - b;
            if (len === 1) { w[id] = false; changed = true; }
            else if (len > 6) { var cut = b + A.irand(2, len - 3); w[dir ? cut * n + a : a * n + cut] = false; changed = true; }
            b = e;
          }
        }
      }
      var cells = []; for (i = 0; i < n * n; i++) if (w[i]) cells.push(i);
      if (cells.length < (n - 1) * (n - 1) * 0.55) continue;
      var seen = {}, st = [cells[0]], cnt = 0; seen[cells[0]] = 1;
      while (st.length) { var u = st.pop(); cnt++; [u - 1, u + 1, u - n, u + n].forEach(function (v) { if (v >= 0 && v < n * n && w[v] && !seen[v] && (Math.abs((v % n) - (u % n)) <= 1)) { seen[v] = 1; st.push(v); } }); }
      if (cnt === cells.length) return w;
    }
    return null;
  }
  function buildRuns(n, w) {
    var rs = [], ro = {};
    for (var dir = 0; dir < 2; dir++) for (var a = 1; a < n; a++) {
      var b = 1;
      while (b < n) {
        var id = dir ? b * n + a : a * n + b; if (!w[id]) { b++; continue; }
        var e = b, cells = []; while (e < n && w[dir ? e * n + a : a * n + e]) { cells.push(dir ? e * n + a : a * n + e); e++; }
        var clue = dir ? (b - 1) * n + a : a * n + (b - 1);
        var r = { cells: cells, dir: dir, clue: clue, sum: 0 }; rs.push(r);
        cells.forEach(function (c) { (ro[c] = ro[c] || [])[dir] = r; });
        b = e;
      }
    }
    return { runs: rs, runOf: ro };
  }
  function fillDigits(cells, ro, g) {
    var k = 0;
    function rec() {
      if (k === cells.length) return true;
      var c = cells[k], used = 0;
      [0, 1].forEach(function (d) { ro[c][d].cells.forEach(function (o) { if (g[o]) used |= 1 << g[o]; }); });
      var ds = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (var i = 0; i < 9; i++) if (!(used & (1 << ds[i]))) { g[c] = ds[i]; k++; if (rec()) return true; k--; g[c] = 0; }
      return false;
    }
    return rec();
  }
  // 1~9에서 서로 다른 k개로 합 s를 만들 수 있는지 (mask 에 든 숫자는 못 씀)
  var memo = {};
  function feasible(k, s, mask) {
    if (k === 0) return s === 0; if (s <= 0) return false;
    var key = (k * 64 + s) * 1024 + mask; if (memo[key] !== undefined) return memo[key];
    var ok = false; for (var d = 1; d <= 9 && !ok && d <= s; d++) if (!(mask & (1 << d))) ok = feasible(k - 1, s - d, mask | (1 << d) | ((1 << d) - 2));
    memo[key] = ok; return ok;
  }
  // 풀이기: 정답을 최대 2개까지 찾음 (줄마다 쓴 숫자·합을 따로 들고 다녀 빠르게)
  function solveAll(cells, ro, runs, g, limit, budget) {
    var found = [], st = runs.map(function (r) { return { used: 0, sum: 0, fill: 0, len: r.cells.length, tot: r.sum }; });
    runs.forEach(function (r, i) { r._i = i; });
    function add(c, d, sign) { for (var dd = 0; dd < 2; dd++) { var q = st[ro[c][dd]._i]; q.used ^= 1 << d; q.sum += sign * d; q.fill += sign; } }
    for (var i = 0; i < cells.length; i++) if (g[cells[i]]) add(cells[i], g[cells[i]], 1);
    function cands(c) {
      var a = st[ro[c][0]._i], b = st[ro[c][1]._i], used = a.used | b.used, out = [];
      for (var d = 1; d <= 9; d++) {
        if (used & (1 << d)) continue;
        if (!feasible(a.len - a.fill - 1, a.tot - a.sum - d, a.used | (1 << d))) continue;
        if (!feasible(b.len - b.fill - 1, b.tot - b.sum - d, b.used | (1 << d))) continue;
        out.push(d);
      }
      return out;
    }
    function rec() {
      if (--budget.n < 0) return;
      var best = -1, bc = null;
      for (var i = 0; i < cells.length; i++) { var c = cells[i]; if (g[c]) continue; var cs = cands(c); if (!cs.length) return; if (!bc || cs.length < bc.length) { bc = cs; best = c; if (cs.length === 1) break; } }
      if (best < 0) { found.push(g.slice()); return; }
      for (var k = 0; k < bc.length && found.length < limit; k++) { g[best] = bc[k]; add(best, bc[k], 1); rec(); add(best, bc[k], -1); g[best] = 0; if (budget.n < 0) return; }
    }
    rec();
    return budget.n < 0 ? null : found;
  }
  // 답이 여러 개면, 두 답이 다른 칸 하나를 미리 채워 둔 칸(고정)으로 바꿔 답을 하나로 만듦
  function makeRound(n, p) {
    var w = pattern(n, p); if (!w) return null;
    var R = buildRuns(n, w), cells = [], i; for (i = 0; i < n * n; i++) if (w[i]) cells.push(i);
    var g = []; for (i = 0; i < n * n; i++) g.push(0);
    if (!fillDigits(cells, R.runOf, g)) return null;
    R.runs.forEach(function (r) { r.sum = r.cells.reduce(function (s, c) { return s + g[c]; }, 0); });
    var giv = {}, cnt = 0;
    while (cnt <= Math.ceil(cells.length * 0.14)) {
      var gg = cells.reduce(function (arr, c) { arr[c] = giv[c] ? g[c] : 0; return arr; }, g.map(function () { return 0; }));
      var sols = solveAll(cells, R.runOf, R.runs, gg, 2, { n: 30000 });
      if (sols && sols.length === 1) return { n: n, w: w, sol: g, runs: R.runs, runOf: R.runOf, given: giv };
      var diffC = [];
      if (sols && sols.length === 2) cells.forEach(function (c) { if (!giv[c] && sols[0][c] !== sols[1][c]) diffC.push(c); });
      else cells.forEach(function (c) { if (!giv[c]) diffC.push(c); });
      if (!diffC.length) return null;
      giv[A.pick(diffC)] = 1; cnt++;
    }
    return null;
  }
  function makePuzzle(dIdx) {
    var t0 = performance.now(), n = DIFFS[dIdx].n, p = DIFFS[dIdx].black;
    for (var round = 0; round < 200; round++) {
      if (performance.now() - t0 > 2000 && n > 6) { n--; t0 = performance.now(); }
      var P = makeRound(n, p); if (P) return P;
    }
    return null;
  }
  // 어려움(9×9)은 만드는 데 1~3초 걸려 시작 버튼을 누르면 화면이 멈췄음 →
  // 시작 화면·결과 화면에 있는 동안 조금씩(한 번에 한 판 시도) 미리 만들어 둠
  var cache = null, genJob = 0;
  function pregen() {
    var job = ++genJob, d = diff, n = DIFFS[d].n, t0 = performance.now();
    if (cache && cache.d === d) return;
    (function step() {
      if (job !== genJob) return;
      if (S && S.state === 'playing') { setTimeout(step, 400); return; }
      var P = makeRound(n, DIFFS[d].black);
      if (P) { cache = { d: d, P: P }; return; }
      if (performance.now() - t0 > 6000 && n > 6) { n--; t0 = performance.now(); }
      setTimeout(step, 16);
    })();
  }

  // ---------- 진행 ----------
  function reset() {
    D = DIFFS[diff]; var P = cache && cache.d === diff ? cache.P : null; cache = null; while (!P) P = makePuzzle(diff);
    setTimeout(pregen, 50);
    N = P.n; white = P.w; sol = P.sol; runs = P.runs; runOf = P.runOf; given = P.given;
    lay();
    val = []; notes = []; wrong = []; for (var i = 0; i < N * N; i++) { val.push(0); notes.push(0); wrong.push(false); }
    mistakes = 0; hints = 0; time = 0; winT = 0; dyingT = 0; noteMode = false; flash = [];
    for (i = 0; i < N * N; i++) if (given[i]) val[i] = sol[i];
    for (i = 0; i < N * N; i++) if (white[i] && !given[i]) { sel = i; break; }
    fx.clear(); hud();
  }
  function cxy(i) { return [GX + (i % N) * CS, GY + Math.floor(i / N) * CS]; }
  function put(d) {
    if (winT > 0 || dyingT > 0 || !white[sel]) return;
    if (val[sel] && val[sel] === sol[sel]) { A.sfx('wall'); return; }
    if (noteMode) { notes[sel] ^= 1 << d; A.sfx('tick'); return; }
    val[sel] = d; notes[sel] = 0; var p = cxy(sel);
    if (d !== sol[sel]) {
      wrong[sel] = true; mistakes++; A.sfx('hurt', 1.4); A.vibrate(80); fx.shake(5, 0.2); fx.text(p[0] + CS / 2, p[1] - 6, '✕', '#ff4d6d', 24);
      if (mistakes >= 3) { dyingT = 1.2; fx.flashIt('#ff2244', 0.5); }
    } else {
      wrong[sel] = false; A.sfx('eat', 1 + d * 0.04); clearNotes(sel, d); celebrate(sel);
      if (allDone()) win();
    }
    hud();
  }
  function allDone() { for (var i = 0; i < N * N; i++) if (white[i] && val[i] !== sol[i]) return false; return true; }
  function clearNotes(i, d) { [0, 1].forEach(function (dd) { runOf[i][dd].cells.forEach(function (c) { notes[c] &= ~(1 << d); }); }); }
  function celebrate(i) {
    var n = 0;
    [0, 1].forEach(function (dd) { var r = runOf[i][dd]; if (r.cells.every(function (c) { return val[c] === sol[c]; })) { n++; r.cells.forEach(function (c, k) { flash.push({ k: c, t: -k * 0.04 }); }); flash.push({ k: r.clue, t: 0 }); } });
    if (n) { var p = cxy(i); A.sfx('coin', 1 + n * 0.1); fx.text(p[0] + CS / 2, p[1] - 10, n > 1 ? '합 완성 ×2' : '합 완성!', '#c3ff5e', 20); }
  }
  function erase() { if (!white[sel] || val[sel] === sol[sel]) return; val[sel] = 0; wrong[sel] = false; notes[sel] = 0; A.sfx('click'); hud(); }
  function hint() {
    if (hints >= 3 || winT > 0 || dyingT > 0) { A.sfx('wall'); return; }
    var i = sel;
    if (!white[i] || val[i] === sol[i]) { var em = []; for (var k = 0; k < N * N; k++) if (white[k] && val[k] !== sol[k]) em.push(k); if (!em.length) return; i = A.pick(em); sel = i; }
    hints++; val[i] = sol[i]; wrong[i] = false; notes[i] = 0; clearNotes(i, sol[i]);
    var p = cxy(i); fx.ring(p[0] + CS / 2, p[1] + CS / 2, '#c3ff5e', 60, 0.4); A.sfx('power');
    celebrate(i); if (allDone()) win(); hud();
  }
  function win() { winT = 1.6; A.sfx('level'); fx.flashIt('#c3ff5e', 0.3); for (var k = 0; k < N * N; k++) if (white[k]) flash.push({ k: k, t: -((k % N) + Math.floor(k / N)) * 0.03 }); for (var i = 0; i < 6; i++) fx.burst(A.rand(80, W - 80), A.rand(150, 600), A.pick(['#c3ff5e', '#ffd166', '#5ee7ff']), 26, 400, 0.9, 4); }
  function score() { return Math.max(100, Math.round(D.base + Math.max(0, D.base * 1.5 - time * D.base / 300) - hints * D.base * 0.15 - mistakes * D.base * 0.1)); }
  function fmtT(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function update(dt) {
    fx.update(dt);
    for (var i = flash.length - 1; i >= 0; i--) { flash[i].t += dt; if (flash[i].t > 0.5) flash.splice(i, 1); }
    if (winT > 0) { winT -= dt; if (winT <= 0) { var k = 'neowa_sum_time_' + diff, b = parseFloat(A.get(k, '0')) || 0; if (!b || time < b) A.set(k, time.toFixed(0)); S.gameOver(score(), [['난이도', D.name], ['시간', fmtT(time)], ['최단', fmtT(parseFloat(A.get(k, '0')))]], { kick: 'SOLVED!', win: true }); } return; }
    if (dyingT > 0) { dyingT -= dt; if (dyingT <= 0) { var done = 0, need = 0; for (var j = 0; j < N * N; j++) if (white[j]) { need++; if (val[j] === sol[j]) done++; } S.gameOver(Math.round(done / need * D.base * 0.3), [['난이도', D.name], ['채운 칸', done + '/' + need], ['실수', '3/3']]); } return; }
    time += dt; hud();
  }

  // ---------- 조합 안내 ----------
  function combos(k, s) {
    var out = [];
    (function rec(start, left, sum, acc) { if (out.length > 6) return; if (left === 0) { if (sum === s) out.push(acc.join('+')); return; } for (var d = start; d <= 9; d++) { if (sum + d > s) break; acc.push(d); rec(d + 1, left - 1, sum + d, acc); acc.pop(); } })(1, k, 0, []);
    return out;
  }

  // ---------- 그리기 ----------
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a1004'); g.addColorStop(1, '#10140a'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    if (!white) { // 시작 전 장식 판
      c.fillStyle = 'rgba(195,255,94,.06)'; A.rr(c, 18, GY, 504, 504, 14); c.fill();
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '700 28px "Chakra Petch",system-ui';
      var demo = [[0, 0, 0, 0, 0, 0], [0, 9, 7, 0, 0, 0], [0, 8, 9, 5, 0, 0], [0, 0, 6, 1, 2, 0], [0, 0, 0, 3, 1, 0], [0, 0, 0, 0, 0, 0]];
      for (var yy = 0; yy < 6; yy++) for (var xx = 0; xx < 6; xx++) { var px0 = 18 + xx * 84, py0 = GY + yy * 84; if (demo[yy][xx]) { c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(px0 + 2, py0 + 2, 80, 80); c.fillStyle = 'rgba(233,255,201,.35)'; c.fillText(String(demo[yy][xx]), px0 + 42, py0 + 43); } else { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(px0 + 2, py0 + 2, 80, 80); } }
      fx.draw(c); c.restore(); fx.drawFlash(c, W, H); return;
    }
    var sr = runOf[sel] || [], inRun = {};
    [0, 1].forEach(function (d) { if (sr[d]) sr[d].cells.forEach(function (cc) { inRun[cc] = 1; }); });
    c.fillStyle = 'rgba(195,255,94,.05)'; A.rr(c, GX - 6, GY - 6, CS * N + 12, CS * N + 12, 14); c.fill();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    var cf = Math.max(18, Math.round(CS * 0.34));
    for (var i = 0; i < N * N; i++) {
      var p = cxy(i), px = p[0], py = p[1], fl = 0;
      for (var f = 0; f < flash.length; f++) if (flash[f].k === i && flash[f].t > 0) fl = Math.max(fl, 0.55 * (1 - flash[f].t / 0.5));
      if (!white[i]) {
        c.fillStyle = '#060904'; c.fillRect(px + 1, py + 1, CS - 2, CS - 2);
        var ac = null, dn = null; runs.forEach(function (r) { if (r.clue === i) { if (r.dir) dn = r; else ac = r; } });
        if (ac || dn) {
          c.fillStyle = fl ? 'rgba(195,255,94,' + fl + ')' : '#1a2410'; c.fillRect(px + 1, py + 1, CS - 2, CS - 2);
          c.strokeStyle = 'rgba(195,255,94,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(px + 2, py + 2); c.lineTo(px + CS - 2, py + CS - 2); c.stroke();
          c.font = '700 ' + cf + 'px "Chakra Petch",system-ui';
          var hot = function (r) { return r && sr[r.dir] === r; };
          if (ac) { c.fillStyle = hot(ac) ? '#c3ff5e' : '#e9ffc9'; c.fillText(String(ac.sum), px + CS * 0.68, py + CS * 0.3); }
          if (dn) { c.fillStyle = hot(dn) ? '#c3ff5e' : '#e9ffc9'; c.fillText(String(dn.sum), px + CS * 0.3, py + CS * 0.72); }
        }
        continue;
      }
      var bg = i === sel ? 'rgba(195,255,94,.32)' : inRun[i] ? 'rgba(195,255,94,.1)' : 'rgba(255,255,255,.04)';
      c.fillStyle = bg; c.fillRect(px + 1, py + 1, CS - 2, CS - 2);
      if (fl) { c.fillStyle = 'rgba(195,255,94,' + fl + ')'; c.fillRect(px + 1, py + 1, CS - 2, CS - 2); }
      var v = val[i];
      if (v) { c.font = (given[i] ? '700 ' : '600 ') + Math.round(CS * 0.52) + 'px "Chakra Petch",system-ui'; c.fillStyle = wrong[i] ? '#ff4d6d' : given[i] ? '#f4f5fb' : '#c3ff5e'; c.fillText(String(v), px + CS / 2, py + CS / 2 + 1); }
      else if (notes[i]) { c.font = '600 ' + Math.max(11, Math.round(CS * 0.24)) + 'px "Chakra Petch",system-ui'; c.fillStyle = 'rgba(220,240,200,.75)'; for (var d = 1; d <= 9; d++) if (notes[i] & (1 << d)) c.fillText(String(d), px + ((d - 1) % 3 + 0.5) * CS / 3, py + (Math.floor((d - 1) / 3) + 0.5) * CS / 3 + 1); }
    }
    c.strokeStyle = 'rgba(195,255,94,.5)'; c.lineWidth = 2; c.strokeRect(GX, GY, CS * N, CS * N);
    // 고른 칸의 줄 조합 안내
    var info = [];
    [0, 1].forEach(function (d) { var r = sr[d]; if (!r) return; var cb = combos(r.cells.length, r.sum); info.push((d ? '세로 ' : '가로 ') + r.sum + ' (' + r.cells.length + '칸): ' + (cb.length > 3 ? cb.slice(0, 3).join('  ') + ' …' : cb.join('  '))); });
    if (land) {
      c.textAlign = 'left'; var ly = 34;
      [0, 1].forEach(function (d) { var r = sr[d]; if (!r) return; var cb = combos(r.cells.length, r.sum);
        c.font = '700 18px "Pretendard Variable",system-ui'; c.fillStyle = '#c3ff5e'; c.fillText((d ? '세로 ' : '가로 ') + r.sum + ' · ' + r.cells.length + '칸', 724, ly);
        c.font = '600 15px "Chakra Petch",system-ui'; c.fillStyle = 'rgba(233,255,201,.75)'; c.fillText(cb.length > 2 ? cb.slice(0, 2).join('  ') + ' …' : cb.join('  '), 724, ly + 24); ly += 62; });
      c.textAlign = 'center';
    } else {
      c.font = '600 17px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(233,255,201,.75)';
      var iy = GY + CS * N + 22; info.forEach(function (s, k) { c.fillText(s, W / 2, iy + k * 24); });
    }
    // 숫자 버튼
    for (d = 1; d <= 9; d++) {
      var pr = padRect(d);
      c.fillStyle = 'rgba(195,255,94,.1)'; A.rr(c, pr.x, pr.y, pr.w, pr.h, 12); c.fill();
      c.font = '700 30px "Chakra Petch",system-ui'; c.fillStyle = '#e9ffc9'; c.fillText(String(d), pr.x + pr.w / 2, pr.y + pr.h / 2 + 1);
    }
    var tools = [['지우기', false], [noteMode ? '메모 켜짐' : '메모', noteMode], ['힌트 ' + (3 - hints), false]];
    for (i = 0; i < 3; i++) {
      var tr = toolRect(i); c.fillStyle = tools[i][1] ? '#c3ff5e' : 'rgba(255,255,255,.06)'; A.rr(c, tr.x, tr.y, tr.w, tr.h, 14); c.fill();
      c.font = '700 18px "Pretendard Variable",system-ui'; c.fillStyle = tools[i][1] ? '#172400' : '#e9ffc9'; c.fillText(tools[i][0], tr.x + tr.w / 2, tr.y + tr.h / 2 + 1);
    }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var lastHud = '';
  function hud() {
    if (!D) return;
    var k = Math.floor(time) + '|' + mistakes + '|' + hints; if (k === lastHud) return; lastHud = k;
    document.getElementById('hA').textContent = A.fmt(score()); document.getElementById('hB').textContent = fmtT(time);
    document.getElementById('hC').textContent = mistakes + '/3'; document.getElementById('hMult').textContent = D.name + ' ' + N + '×' + N;
    if (pEl.score) { pEl.score.textContent = A.fmt(score()); pEl.time.textContent = fmtT(time); pEl.mis.textContent = mistakes + '/3'; }
  }

  // ---------- 입력 ----------
  function move(dx, dy) { var x = sel % N, y = Math.floor(sel / N); for (var s = 0; s < N; s++) { x = (x + dx + N) % N; y = (y + dy + N) % N; if (white[y * N + x]) { sel = y * N + x; A.sfx('tick'); return; } } }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing' || !white) return;
    var p = S.toLocal(e);
    if (p.x >= GX && p.x < GX + N * CS && p.y >= GY && p.y < GY + N * CS) { var i = Math.floor((p.y - GY) / CS) * N + Math.floor((p.x - GX) / CS); if (white[i]) { sel = i; A.sfx('tick'); } return; }
    for (var d = 1; d <= 9; d++) if (inR(p, padRect(d))) { put(d); return; }
    for (var t = 0; t < 3; t++) if (inR(p, toolRect(t))) { if (t === 0) erase(); else if (t === 1) { noteMode = !noteMode; A.sfx('click'); } else hint(); return; }
  });
  var dbtns = document.querySelectorAll('[data-diff]');
  function paintDiff() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_sum_diff', diff); A.sfx('click'); paintDiff(); cache = null; setTimeout(pregen, 30); }); });
  paintDiff();
  var S = new A.Shell({
    id: 'sum', W: W, H: H, land: [960, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a') move(-1, 0); else if (k === 'ArrowRight' || k === 'd') move(1, 0);
      else if (k === 'ArrowUp' || k === 'w') move(0, -1); else if (k === 'ArrowDown' || k === 's') move(0, 1);
      else if (/^[1-9]$/.test(k)) put(+k);
      else if (k === 'Backspace' || k === 'Delete' || k === '0') { e.preventDefault(); erase(); }
      else if (k === 'n' || k === 'N') { noteMode = !noteMode; A.sfx('click'); }
      else if (k === 'h' || k === 'H') hint();
    }
  });
  document.querySelector('.g-hud').setAttribute('data-land-hide', '');
  S.panelSlot.innerHTML = '<div class="g-card gp-stats"><div><span>SCORE</span><b id="pkScore">0</b></div><div><span>TIME</span><b id="pkTime">0:00</b></div><div><span>실수</span><b id="pkMis">0/3</b></div></div>';
  pEl = { score: document.getElementById('pkScore'), time: document.getElementById('pkTime'), mis: document.getElementById('pkMis') };
  setTimeout(pregen, 300);
})();
