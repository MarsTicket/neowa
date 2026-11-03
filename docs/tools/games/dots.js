(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var diff = +A.get('neowa_dots_diff', '1') || 0, B, SP, GX, GY, hL, vL, owner, turn, me, cpu, wins, score, thinking, endT, cur = 0, kbd = false, lastLine = null;
  function setup() {
    B = [4, 5, 6][diff]; SP = Math.floor(440 / B); GX = (W - B * SP) / 2; GY = 200 + (560 - B * SP) / 2;
    hL = []; vL = []; owner = []; for (var i = 0; i < (B + 1) * B; i++) { hL.push(0); vL.push(0); } for (i = 0; i < B * B; i++) owner.push(0);
    turn = 1; me = 0; cpu = 0; thinking = 0; endT = 0; lastLine = null;
  }
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
    if (turn === 2) thinking = 0.45;
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
  function aiMove() {
    var lines = allLines(); if (!lines.length) return;
    var take = lines.filter(function (l) { return simCount(l) > 0; });
    if (take.length && (diff > 0 || Math.random() < 0.6)) return place(A.pick(take), 2);
    var safe = lines.filter(function (l) { return danger(l) === 0; });
    if (safe.length && (diff > 0 || Math.random() < 0.5)) return place(A.pick(safe), 2);
    if (diff === 2) { var best = null, bv = 1e9; lines.forEach(function (l) { var g = chainGift(l); if (g < bv) { bv = g; best = l; } }); return place(best, 2); }
    place(A.pick(lines), 2);
  }
  function reset() { wins = 0; score = 0; setup(); fx.clear(); hud(); }
  function lineAt(p) {
    var best = null, bd = SP * 0.35;
    for (var i = 0; i < hL.length; i++) { var y = Math.floor(i / B), x = i % B, cx = GX + (x + 0.5) * SP, cy = GY + y * SP, d = Math.hypot((p.x - cx) * 0.6, p.y - cy); if (Math.abs(p.x - cx) < SP / 2 && d < bd) { bd = d; best = { t: 'h', i: i }; } }
    for (i = 0; i < vL.length; i++) { var yy = Math.floor(i / (B + 1)), xx = i % (B + 1), cx2 = GX + xx * SP, cy2 = GY + (yy + 0.5) * SP, d2 = Math.hypot(p.x - cx2, (p.y - cy2) * 0.6); if (Math.abs(p.y - cy2) < SP / 2 && d2 < bd) { bd = d2; best = { t: 'v', i: i }; } }
    return best;
  }
  function humanPlace(l) { if (!l || turn !== 1 || thinking > 0 || endT > 0 || S.state !== 'playing') return; if ((l.t === 'h' ? hL : vL)[l.i]) { A.sfx('wall'); return; } place(l, 1); }
  function update(dt) {
    fx.update(dt);
    if (endT > 0) { endT -= dt; if (endT <= 0) {
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
    for (var i = 0; i < owner.length; i++) if (owner[i]) { var x = i % B, y = Math.floor(i / B); c.fillStyle = owner[i] === 1 ? 'rgba(94,231,255,.25)' : 'rgba(255,77,109,.25)'; c.fillRect(GX + x * SP + 4, GY + y * SP + 4, SP - 8, SP - 8); c.fillStyle = owner[i] === 1 ? '#5ee7ff' : '#ff4d6d'; c.font = '700 ' + Math.round(SP * 0.35) + 'px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(owner[i] === 1 ? '나' : 'CPU', GX + (x + 0.5) * SP, GY + (y + 0.5) * SP); }
    c.lineCap = 'round';
    function line(x1, y1, x2, y2, v, isLast) { c.strokeStyle = v === 1 ? '#5ee7ff' : v === 2 ? '#ff4d6d' : 'rgba(255,255,255,.08)'; c.lineWidth = v ? 7 : 4; if (isLast) { c.save(); c.shadowColor = '#fff'; c.shadowBlur = 14; } c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); if (isLast) c.restore(); }
    for (i = 0; i < hL.length; i++) { var hy = Math.floor(i / B), hx = i % B; line(GX + hx * SP + 8, GY + hy * SP, GX + (hx + 1) * SP - 8, GY + hy * SP, hL[i], lastLine && lastLine.t === 'h' && lastLine.i === i); }
    for (i = 0; i < vL.length; i++) { var vy = Math.floor(i / (B + 1)), vx = i % (B + 1); line(GX + vx * SP, GY + vy * SP + 8, GX + vx * SP, GY + (vy + 1) * SP - 8, vL[i], lastLine && lastLine.t === 'v' && lastLine.i === i); }
    c.fillStyle = '#fff'; for (var yy = 0; yy <= B; yy++) for (var xx = 0; xx <= B; xx++) { c.beginPath(); c.arc(GX + xx * SP, GY + yy * SP, 6, 0, 7); c.fill(); }
    if (kbd && S.state === 'playing') { var L = allLines()[cur % Math.max(1, allLines().length)]; if (L) { c.save(); c.globalAlpha = 0.5 + Math.sin(t * 8) * 0.3; if (L.t === 'h') line(GX + (L.i % B) * SP + 8, GY + Math.floor(L.i / B) * SP, GX + (L.i % B + 1) * SP - 8, GY + Math.floor(L.i / B) * SP, 1); else line(GX + (L.i % (B + 1)) * SP, GY + Math.floor(L.i / (B + 1)) * SP + 8, GX + (L.i % (B + 1)) * SP, GY + (Math.floor(L.i / (B + 1)) + 1) * SP - 8, 1); c.restore(); } }
    c.fillStyle = turn === 1 ? '#5ee7ff' : '#ff4d6d'; c.font = '700 20px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText(S.state === 'playing' ? (turn === 1 ? '내 차례' : '컴퓨터 생각 중…') : '', W / 2, GY - 40);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = me + ' : ' + cpu; document.getElementById('hC').textContent = wins; document.getElementById('hMult').textContent = ['쉬움', '보통', '어려움'][diff]; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; kbd = false; humanPlace(lineAt(S.toLocal(e))); });
  var dbtns = document.querySelectorAll('[data-diff]');
  function pd() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_dots_diff', diff); A.sfx('click'); pd(); hL = null; }); }); pd();
  var S = new A.Shell({ id: 'dots', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { kbd = true; var k = e.key, n = allLines().length; if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'd' || k === 's') cur = (cur + 1) % n; if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'a' || k === 'w') cur = (cur - 1 + n) % n; if ((k === ' ' || k === 'Enter') && !e.repeat) humanPlace(allLines()[cur % n]); } });
})();
