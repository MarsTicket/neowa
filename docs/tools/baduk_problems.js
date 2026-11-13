// 바둑 묘수풀이 문제 만들기 도구
// 사용법: node docs/tools/baduk_problems.js [문제수_2수] [문제수_3수] [문제수_4수] > 새문제.txt
//   → python3 docs/tools/baduk_bank.py 새문제.txt  (docs/tools/games/baduk.js 의 BANK 를 바꿔 줌)
//   4수 문제는 한 개에 1~2분 걸리므로 여러 창에서 나눠 돌린 뒤 파일 여러 개를 함께 넣으면 빠릅니다.
//
// 방식: 9x9 판에 무작위로 돌을 놓아 모양을 만든 뒤, 표시한 백 돌을 흑이 k수 안에 잡을 수 있는지
//       백의 모든 응수를 끝까지 읽어서(완전 탐색) 확인합니다.
//   - 흑의 정답(첫 수와 이후 수)이 매번 딱 하나뿐인 문제만 남깁니다.
//   - k-1수로는 못 잡아야 합니다 (너무 쉬운 문제 제외).
//   - 백의 응수는 가장 오래 버티는 수를 고르고, 같으면 활로(숨 쉴 곳)로 뻗는 자연스러운 수를 고릅니다.
// 문제 한 줄 형식: "k|판81글자|목표점|흑수,백수,흑수,..."  (판: . 빈칸 X 흑 O 백, 점 = y*9+x 를 36진수 2글자)
'use strict';
var N = 9, NN = 81;
var NB = [];
for (var i = 0; i < NN; i++) { var x = i % N, y = (i / N) | 0, a = []; if (x > 0) a.push(i - 1); if (x < N - 1) a.push(i + 1); if (y > 0) a.push(i - N); if (y < N - 1) a.push(i + N); NB.push(a); }

// 돌 무리(이어진 같은 색 돌)와 활로 구하기
function group(bd, p) {
  var c = bd[p], st = [p], seen = {}, stones = [], libs = {}, nl = 0; seen[p] = 1;
  while (st.length) { var q = st.pop(); stones.push(q); var nb = NB[q];
    for (var j = 0; j < nb.length; j++) { var r = nb[j]; if (bd[r] === 0) { if (!libs[r]) { libs[r] = 1; nl++; } } else if (bd[r] === c && !seen[r]) { seen[r] = 1; st.push(r); } } }
  return { stones: stones, libs: libs, nl: nl };
}
// 착수. 불법(빈칸 아님·자살수·패 즉시 따내기)이면 null. 결과: {bd, ko, cap}
function play(bd, p, c, ko) {
  if (bd[p] !== 0 || p === ko) return null;
  var nb2 = bd.slice(); nb2[p] = c; var o = 3 - c, cap = [], nb = NB[p];
  for (var j = 0; j < nb.length; j++) { var r = nb[j]; if (nb2[r] === o) { var g = group(nb2, r); if (g.nl === 0) for (var s = 0; s < g.stones.length; s++) { if (nb2[g.stones[s]]) { nb2[g.stones[s]] = 0; cap.push(g.stones[s]); } } } }
  var me = group(nb2, p); if (me.nl === 0) return null;
  var nko = -1; if (cap.length === 1 && me.stones.length === 1 && me.nl === 1) nko = cap[0];
  return { bd: nb2, ko: nko, cap: cap };
}

var memo;
// 흑 차례. 목표 백 돌(t)을 k수 안에 잡을 수 있나?
function win(bd, t, k, ko) {
  if (bd[t] !== 2) return true;
  if (k <= 0) return false;
  var g = group(bd, t); if (g.nl > k) return false;
  var key = bd.join('') + k + ',' + ko; if (key in memo) return memo[key];
  var res = false, cands = blackCands(bd, g, k);
  for (var i = 0; i < cands.length && !res; i++) { var m = play(bd, cands[i], 1, ko); if (m && blackOk(m, t, k)) res = true; }
  memo[key] = res; return res;
}
function blackCands(bd, g, k) {
  var libs = Object.keys(g.libs).map(Number);
  if (g.nl === k) return libs; // 활로 수 = 남은 수 → 매 수 활로를 메워야만 함
  var out = libs.slice(); for (var p = 0; p < NN; p++) if (bd[p] === 0 && !g.libs[p]) out.push(p); return out;
}
// 흑이 m을 둔 뒤, 백의 모든 응수에 대해 남은 k-1수 안에 잡히나?
function blackOk(m, t, k) {
  if (m.bd[t] !== 2) return true;
  if (k - 1 <= 0) return false;
  var ws = whiteCands(m.bd, t);
  if (!win(m.bd, t, k - 1, -1)) return false; // 백이 손을 빼는(패스) 경우
  for (var i = 0; i < ws.length; i++) { var w = play(m.bd, ws[i], 2, m.ko); if (w && !win(w.bd, t, k - 1, w.ko)) return false; }
  return true;
}
// 백 응수 후보: 모든 빈 점 (목표 활로 → 단수 걸린 흑 무리 활로 → 나머지 순으로, 반박을 빨리 찾게)
function whiteCands(bd, t) {
  var g = group(bd, t), first = Object.keys(g.libs).map(Number), seen = {}, out = [];
  first.forEach(function (p) { seen[p] = 1; out.push(p); });
  for (var p = 0; p < NN; p++) if (bd[p] === 1) { var bg = group(bd, p); if (bg.nl <= 2) for (var l in bg.libs) if (!seen[l]) { seen[l] = 1; out.push(+l); } }
  for (p = 0; p < NN; p++) if (bd[p] === 0 && !seen[p]) out.push(p);
  return out;
}
// 흑의 k수 안 정답 첫 수 목록
function winningMoves(bd, t, k, ko) {
  var g = group(bd, t), cands = g.nl > k ? [] : blackCands(bd, g, k), out = [];
  for (var i = 0; i < cands.length; i++) { var m = play(bd, cands[i], 1, ko); if (m && blackOk(m, t, k)) out.push(cands[i]); }
  return out;
}
function minK(bd, t, ko, maxk) { for (var k = 1; k <= maxk; k++) if (win(bd, t, k, ko)) return k; return 99; }

// 정답 수순 만들기 (흑 정답이 매번 하나뿐이어야 함). 실패하면 null
function line(bd, t, k) {
  var seq = [], ko = -1;
  while (true) {
    var ws = winningMoves(bd, t, k, ko); if (ws.length !== 1) return null;
    var m = play(bd, ws[0], 1, ko); seq.push(ws[0]);
    if (m.bd[t] !== 2) return seq;
    // 백: 가장 오래 버티는 응수 (같으면 목표 활로로 뻗기 > 흑 돌 따내기 > 나머지 중 목표에 가까운 수)
    var best = null, bv = -1, cands = whiteCands(m.bd, t), g = group(m.bd, t);
    for (var i = 0; i < cands.length; i++) {
      var w = play(m.bd, cands[i], 2, m.ko); if (!w) continue;
      var need = minK(w.bd, t, w.ko, k - 1); if (need > k - 1) return null; // 반박 존재 (있으면 안 됨)
      var v = need * 1000 + (g.libs[cands[i]] ? 300 : 0) + w.cap.length * 100 - dist(cands[i], t);
      if (v > bv) { bv = v; best = { p: cands[i], w: w }; }
    }
    if (!best) return null;
    seq.push(best.p); bd = best.w.bd; ko = best.w.ko; k = minK(bd, t, ko, k - 1);
  }
}
function dist(a, b) { return Math.abs(a % N - b % N) + Math.abs(((a / N) | 0) - ((b / N) | 0)); }

// 무작위 모양 만들기: 한 지점 근처에 흑백 돌을 번갈아 놓음
function rnd(n) { return Math.floor(Math.random() * n); }
function randomBoard() {
  var bd = []; for (var i = 0; i < NN; i++) bd.push(0);
  var ax = [1, 2, 4, 6, 7][rnd(5)], ay = [1, 2, 4, 6, 7][rnd(5)], cnt = 10 + rnd(14), c = 1 + rnd(2), tries = 0;
  while (cnt > 0 && tries++ < 400) {
    var x = ax + rnd(7) - 3, y = ay + rnd(7) - 3; if (x < 0 || y < 0 || x >= N || y >= N) continue;
    var m = play(bd, y * N + x, c, -1); if (!m || m.cap.length) continue;
    bd = m.bd; c = 3 - c; cnt--;
  }
  return bd;
}
function enc(p) { return (p < 36 ? '0' : '') + p.toString(36); }

function make(k) {
  for (var tries = 0; tries < 4000; tries++) {
    var bd = randomBoard(), ok = true, whites = [];
    // 처음부터 단수(활로 1)인 무리가 있으면 제외 (헷갈림 방지)
    for (var p = 0; p < NN && ok; p++) if (bd[p]) { var g = group(bd, p); if (g.nl < 2) ok = false; else if (bd[p] === 2 && g.stones[0] === p) whites.push({ p: p, g: g }); }
    if (!ok) continue;
    var seenG = {}; whites = whites.filter(function (w) { var key = w.g.stones.slice().sort().join(); if (seenG[key]) return false; seenG[key] = 1; return w.g.nl <= k && (k > 2 || w.g.stones.length >= 1); });
    for (var i = 0; i < whites.length; i++) {
      var t = whites[i].p; memo = {};
      if (win(bd, t, k - 1, -1) || !win(bd, t, k, -1)) continue;
      var seq = line(bd, t, k); if (!seq) continue;
      if (k >= 3 && whites[i].g.stones.length < 2) continue;
      var s = bd.map(function (v) { return '.XO'[v]; }).join('');
      return k + '|' + s + '|' + enc(t) + '|' + seq.map(enc).join('');
    }
  }
  return null;
}

if (require.main === module) {
  var want = [0, 0, +(process.argv[2] || 10), +(process.argv[3] || 10), +(process.argv[4] || 0)], out = {}, t0 = Date.now();
  for (var k = 2; k <= 4; k++) { var got = 0; while (got < want[k]) { var r = make(k); if (r && !out[r.split('|')[1]]) { out[r.split('|')[1]] = r; got++; process.stderr.write(k + '수 ' + got + '/' + want[k] + ' (' + ((Date.now() - t0) / 1000).toFixed(0) + 's)\n'); } } }
  console.log(Object.keys(out).map(function (s) { return out[s]; }).join('\n'));
}
module.exports = { play: play, group: group, win: win, winningMoves: winningMoves, line: line, resetMemo: function () { memo = {}; } };
