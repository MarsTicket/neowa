(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, land = false;
  var fx = new A.FX();
  // 둘이서 모드: 파랑(P1)·빨강(P2)이 번갈아 선을 그음. tally = [P1 승, P2 승]
  var duo = A.duo('dots', { solo: ['SCORE', 'ME : CPU', 'WIN'], duo: ['P1 : P2 승', '상자', '판'] }, function () { if (S) hud(); }), tally = [0, 0];
  var diff = +A.get('neowa_dots_diff', '1') || 0, B, SP, GX, GY, hL, vL, owner, turn, me, cpu, wins, score, thinking, endT, curL = { t: 'h', i: 0 }, kbd = false, lastLine = null;
  function setup() {
    B = [4, 5, 6][diff]; geo();
    hL = []; vL = []; owner = []; for (var i = 0; i < (B + 1) * B; i++) { hL.push(0); vL.push(0); } for (i = 0; i < B * B; i++) owner.push(0);
    turn = 1; me = 0; cpu = 0; thinking = 0; endT = 0; lastLine = null; curL = { t: 'h', i: 0 };
  }
  // 판 위치: 세로 540x960, 가로 화면은 720x720 정사각형(판이 훨씬 커짐)
  function geo() { if (!B) return; SP = Math.floor((land ? 600 : 440) / B); GX = (W - B * SP) / 2; GY = land ? 84 + (612 - B * SP) / 2 : 200 + (560 - B * SP) / 2; }
  // 선 목록: {t:'h'|'v', i}
  function allLines() { var r = []; for (var i = 0; i < hL.length; i++) if (!hL[i]) r.push({ t: 'h', i: i }); for (i = 0; i < vL.length; i++) if (!vL[i]) r.push({ t: 'v', i: i }); return r; }
  function sides(bx, by, H_, V_) { return (H_[by * B + bx] ? 1 : 0) + (H_[(by + 1) * B + bx] ? 1 : 0) + (V_[by * (B + 1) + bx] ? 1 : 0) + (V_[by * (B + 1) + bx + 1] ? 1 : 0); }
  function boxesOf(l) { // 이 선이 닿는 상자들
    if (l.t === 'h') { var y = Math.floor(l.i / B), x = l.i % B, r = []; if (y > 0) r.push([x, y - 1]); if (y < B) r.push([x, y]); return r; }
    var yy = Math.floor(l.i / (B + 1)), xx = l.i % (B + 1), r2 = []; if (xx > 0) r2.push([xx - 1, yy]); if (xx < B) r2.push([xx, yy]); return r2;
  }
  function place(l, who) {
    (l.t === 'h' ? hL : vL)[l.i] = who; lastLine = l;
    var closed = 0; boxesOf(l).forEach(function (b) { if (sides(b[0], b[1], hL, vL) === 4 && !owner[b[1] * B + b[0]]) { owner[b[1] * B + b[0]] = who; closed++; fx.burst(GX + (b[0] + 0.5) * SP, GY + (b[1] + 0.5) * SP, who === 1 ? '#5ee7ff' : '#ff4d6d', 14, 220, 0.4, 3); } });
    if (who === 1) me += closed; else cpu += closed;
    A.sfx(closed ? 'coin' : 'tick', who === 1 ? 1.2 : 0.9);
    if (!allLines().length) { endT = 1.2; return; }
    if (!closed) turn = who === 1 ? 2 : 1;
    if (turn === 2 && !duo()) thinking = closed && who === 2 ? 0.25 : 0.45;
    hud();
  }
  function simCount(l) { var c = 0; boxesOf(l).forEach(function (b) { var s = sides(b[0], b[1], hL, vL); if (s === 3) c++; }); return c; }
  function danger(l) { var d = 0; boxesOf(l).forEach(function (b) { if (sides(b[0], b[1], hL, vL) === 2) d++; }); return d; }
  function chainGift(l) { // 이 선을 그으면 상대가 연달아 가져갈 상자 수(대략)
    var Hc = hL.slice(), Vc = vL.slice(); (l.t === 'h' ? Hc : Vc)[l.i] = 2; var n = 0, again = true;
    while (again) { again = false; for (var by = 0; by < B; by++) for (var bx = 0; bx < B; bx++) if (sides(bx, by, Hc, Vc) === 3) { // 닫기
      if (!Hc[by * B + bx]) Hc[by * B + bx] = 1; else if (!Hc[(by + 1) * B + bx]) Hc[(by + 1) * B + bx] = 1; else if (!Vc[by * (B + 1) + bx]) Vc[by * (B + 1) + bx] = 1; else Vc[by * (B + 1) + bx + 1] = 1; n++; again = true; } }
    return n;
  }
  function lineArr(l, Hc, Vc) { return l.t === 'h' ? Hc : Vc; }
  function missingOf(bx, by, Hc, Vc) { // 상자의 빈 변 목록
    var r = []; if (!Hc[by * B + bx]) r.push({ t: 'h', i: by * B + bx }); if (!Hc[(by + 1) * B + bx]) r.push({ t: 'h', i: (by + 1) * B + bx });
    if (!Vc[by * (B + 1) + bx]) r.push({ t: 'v', i: by * (B + 1) + bx }); if (!Vc[by * (B + 1) + bx + 1]) r.push({ t: 'v', i: by * (B + 1) + bx + 1 }); return r; }
  function threeSided(Hc, Vc) { var r = []; for (var by = 0; by < B; by++) for (var bx = 0; bx < B; bx++) if (sides(bx, by, Hc, Vc) === 3) r.push([bx, by]); return r; }
  // 어려움 전용 '두 칸 양보(더블 딜)': 마지막 사슬의 끝 2칸을 일부러 남겨 주고, 다음 긴 사슬의 주도권을 지킴
  function doubleDeal() {
    var t3 = threeSided(hL, vL); if (t3.length !== 1) return null;
    var c = t3[0], ln = missingOf(c[0], c[1], hL, vL)[0], nb = boxesOf(ln).filter(function (b) { return b[0] !== c[0] || b[1] !== c[1]; })[0];
    if (!nb || sides(nb[0], nb[1], hL, vL) !== 2) return null;
    var far = missingOf(nb[0], nb[1], hL, vL).filter(function (l) { return l.t !== ln.t || l.i !== ln.i; })[0]; if (!far) return null;
    // far 선을 그어도 다른 상자가 3변이 되지 않아야 함 (= 사슬이 정확히 2칸 남음)
    var Hc = hL.slice(), Vc = vL.slice(); lineArr(far, Hc, Vc)[far.i] = 2;
    var after = threeSided(Hc, Vc); if (after.length !== 2) return null;
    // 두 칸을 다 먹고 난 판에서: 안전한 선이 없고, 남은 사슬 중 3칸 이상짜리가 있으면 양보가 이득
    lineArr(ln, Hc, Vc)[ln.i] = 2; var Hs = hL, Vs = vL; hL = Hc; vL = Vc; // 두 칸을 다 먹은 뒤의 판으로 잠시 바꿔서 계산
    var rest = allLines(), safe = rest.some(function (l) { return danger(l) === 0; }), longest = 0;
    if (!safe) rest.forEach(function (l) { longest = Math.max(longest, chainGift(l)); });
    hL = Hs; vL = Vs;
    return !safe && longest >= 3 ? far : null;
  }
  function aiMove() {
    var lines = allLines(); if (!lines.length) return;
    var take = lines.filter(function (l) { return simCount(l) > 0; });
    if (take.length && diff === 2) { var dd = doubleDeal(); if (dd) return place(dd, 2); }
    if (take.length && (diff > 0 || Math.random() < 0.6)) return place(A.pick(take), 2);
    var safe = lines.filter(function (l) { return danger(l) === 0; });
    if (safe.length && (diff > 0 || Math.random() < 0.5)) return place(A.pick(safe), 2);
    if (diff === 2 || (diff === 1 && Math.random() < 0.6)) { var best = null, bv = 1e9; lines.forEach(function (l) { var g = chainGift(l) + Math.random() * 0.1; if (g < bv) { bv = g; best = l; } }); return place(best, 2); }
    place(A.pick(lines), 2);
  }
  function reset() { wins = 0; score = 0; setup(); fx.clear(); hud(); }
  function lineAt(p) {
    var best = null, bd = SP * 0.35;
    for (var i = 0; i < hL.length; i++) { var y = Math.floor(i / B), x = i % B, cx = GX + (x + 0.5) * SP, cy = GY + y * SP, d = Math.hypot((p.x - cx) * 0.6, p.y - cy); if (Math.abs(p.x - cx) < SP / 2 && d < bd) { bd = d; best = { t: 'h', i: i }; } }
    for (i = 0; i < vL.length; i++) { var yy = Math.floor(i / (B + 1)), xx = i % (B + 1), cx2 = GX + xx * SP, cy2 = GY + (yy + 0.5) * SP, d2 = Math.hypot(p.x - cx2, (p.y - cy2) * 0.6); if (Math.abs(p.y - cy2) < SP / 2 && d2 < bd) { bd = d2; best = { t: 'v', i: i }; } }
    return best;
  }
  // 키보드 커서: 방향키로 가장 가까운 이웃 선으로 이동 (그은 선도 지나갈 수 있음)
  function lc(l) { return l.t === 'h' ? [l.i % B + 0.5, Math.floor(l.i / B)] : [l.i % (B + 1), Math.floor(l.i / (B + 1)) + 0.5]; }
  function moveCur(dx, dy) {
    if (!curL || (curL.t === 'h' ? curL.i >= hL.length : curL.i >= vL.length)) curL = { t: 'h', i: 0 };
    var c0 = lc(curL), best = null, bv = 1e9, all = [], i;
    for (i = 0; i < hL.length; i++) all.push({ t: 'h', i: i }); for (i = 0; i < vL.length; i++) all.push({ t: 'v', i: i });
    all.forEach(function (l) { var c1 = lc(l), ax = (c1[0] - c0[0]) * dx + (c1[1] - c0[1]) * dy, px = Math.abs((c1[0] - c0[0]) * dy) + Math.abs((c1[1] - c0[1]) * dx); if (ax <= 0.1) return; var v = ax + px * 2.2; if (v < bv) { bv = v; best = l; } });
    if (best) { curL = best; A.sfx('tick', 1.6); }
  }
  function humanPlace(l) { if (!l || (turn !== 1 && !duo()) || thinking > 0 || endT > 0 || S.state !== 'playing') return; if ((l.t === 'h' ? hL : vL)[l.i]) { A.sfx('wall'); return; } place(l, duo() ? turn : 1); }
  function update(dt) {
    fx.update(dt);
    if (endT > 0) { endT -= dt; if (endT <= 0) {
      if (duo()) { var wp = me > cpu ? 1 : cpu > me ? 2 : 0; if (wp) tally[wp - 1]++; A.sfx('level'); hud();
        S.gameOver(0, [['P1 승', String(tally[0])], ['P2 승', String(tally[1])], ['상자', me + ' : ' + cpu]], { title: wp ? 'P' + wp + ' 승리!' : '무승부', kick: '2인 대결', win: true, noRecord: true }); return; }
      if (me > cpu) { wins++; var pts = (me - cpu) * 20 * (diff + 1) + 100 * (diff + 1); score += pts; S.banner('승리 ' + me + ':' + cpu, '+' + pts); A.sfx('level'); setup(); hud(); }
      else if (me === cpu) { score += 50; S.banner('무승부', '+50'); setup(); hud(); }
      else S.gameOver(score, [['이긴 판', String(wins)], ['마지막', me + ' : ' + cpu]]);
    } return; }
    if (thinking > 0) { thinking -= dt; if (thinking <= 0 && turn === 2) aiMove(); }
  }
  function render(c) {
    var o = fx.offset(), t = S.time;
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#040a14'; c.fillRect(-10, -10, W + 20, H + 20);
    if (!hL) setup();
    for (var i = 0; i < owner.length; i++) if (owner[i]) { var x = i % B, y = Math.floor(i / B); c.fillStyle = owner[i] === 1 ? 'rgba(94,231,255,.25)' : 'rgba(255,77,109,.25)'; c.fillRect(GX + x * SP + 4, GY + y * SP + 4, SP - 8, SP - 8); c.fillStyle = owner[i] === 1 ? '#5ee7ff' : '#ff4d6d'; c.font = '700 ' + Math.round(SP * 0.35) + 'px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(duo() ? (owner[i] === 1 ? 'P1' : 'P2') : owner[i] === 1 ? '나' : 'CPU', GX + (x + 0.5) * SP, GY + (y + 0.5) * SP); }
    c.lineCap = 'round';
    function line(x1, y1, x2, y2, v, isLast) { c.strokeStyle = v === 1 ? '#5ee7ff' : v === 2 ? '#ff4d6d' : 'rgba(255,255,255,.08)'; c.lineWidth = v ? 7 : 4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); if (isLast) { c.save(); c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 15; c.stroke(); c.restore(); } c.stroke(); }
    for (i = 0; i < hL.length; i++) { var hy = Math.floor(i / B), hx = i % B; line(GX + hx * SP + 8, GY + hy * SP, GX + (hx + 1) * SP - 8, GY + hy * SP, hL[i], lastLine && lastLine.t === 'h' && lastLine.i === i); }
    for (i = 0; i < vL.length; i++) { var vy = Math.floor(i / (B + 1)), vx = i % (B + 1); line(GX + vx * SP, GY + vy * SP + 8, GX + vx * SP, GY + (vy + 1) * SP - 8, vL[i], lastLine && lastLine.t === 'v' && lastLine.i === i); }
    c.fillStyle = '#fff'; for (var yy = 0; yy <= B; yy++) for (var xx = 0; xx <= B; xx++) { c.beginPath(); c.arc(GX + xx * SP, GY + yy * SP, 6, 0, 7); c.fill(); }
    if (kbd && S.state === 'playing' && curL) { var L = curL, used = (L.t === 'h' ? hL : vL)[L.i]; c.save(); c.globalAlpha = 0.5 + Math.sin(t * 8) * 0.3; c.strokeStyle = used ? 'rgba(255,255,255,.5)' : duo() && turn === 2 ? '#ff4d6d' : '#5ee7ff'; c.lineWidth = used ? 3 : 9; c.beginPath();
      if (L.t === 'h') { c.moveTo(GX + (L.i % B) * SP + 8, GY + Math.floor(L.i / B) * SP); c.lineTo(GX + (L.i % B + 1) * SP - 8, GY + Math.floor(L.i / B) * SP); } else { c.moveTo(GX + (L.i % (B + 1)) * SP, GY + Math.floor(L.i / (B + 1)) * SP + 8); c.lineTo(GX + (L.i % (B + 1)) * SP, GY + (Math.floor(L.i / (B + 1)) + 1) * SP - 8); }
      c.stroke(); var cc = lc(L); c.globalAlpha = 0.9; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(GX + cc[0] * SP, GY + cc[1] * SP, 13, 0, 7); c.stroke(); c.restore(); }
    c.fillStyle = turn === 1 ? '#5ee7ff' : '#ff4d6d'; c.font = '700 ' + (land ? 30 : 20) + 'px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText(S.state === 'playing' ? (duo() ? (turn === 1 ? 'P1 (파랑) 차례' : 'P2 (빨강) 차례') : turn === 1 ? '내 차례' : '컴퓨터 생각 중…') : '', W / 2, GY - 40);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = me + ' : ' + cpu; document.getElementById('hC').textContent = wins; document.getElementById('hMult').textContent = ['쉬움', '보통', '어려움'][diff];
    if (duo()) { document.getElementById('hA').textContent = tally[0] + ' : ' + tally[1]; document.getElementById('hC').textContent = tally[0] + tally[1] + 1; document.getElementById('hMult').textContent = '2인'; } }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; kbd = false; humanPlace(lineAt(S.toLocal(e))); });
  var dbtns = document.querySelectorAll('[data-diff]');
  function pd() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_dots_diff', diff); A.sfx('click'); pd(); hL = null; }); }); pd();
  var S = null; S = new A.Shell({ id: 'dots', W: W, H: H, land: [720, 720], onResize: function (sh) { land = !!sh.land; W = sh.W; H = sh.H; geo(); }, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === 'ArrowRight' || k === 'd') moveCur(1, 0); if (k === 'ArrowLeft' || k === 'a') moveCur(-1, 0); if (k === 'ArrowDown' || k === 's') moveCur(0, 1); if (k === 'ArrowUp' || k === 'w') moveCur(0, -1);
      if ((k === ' ' || k === 'Enter') && !e.repeat) humanPlace(curL); } });
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
