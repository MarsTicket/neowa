(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CW = 70, CH = 98, GAP = (540 - 7 * 70) / 8, TY = 250, TOPY = 120;
  var SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var fx = new A.FX();
  var st, score, moves, time, hist, drag = null, winT, auto, flyers = [], hintT = 0, hintMv = null, quitT = 0, hintsUsed = 0;
  function px(i) { return GAP + i * (CW + GAP); }
  function red(c) { return c.s === 1 || c.s === 2; }
  function deal() {
    var deck = []; for (var s = 0; s < 4; s++) for (var r = 0; r < 13; r++) deck.push({ s: s, r: r, up: false });
    for (var i = deck.length - 1; i > 0; i--) { var j = A.irand(0, i), t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    st = { stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []] };
    for (var c = 0; c < 7; c++) for (var k = 0; k <= c; k++) { var cd = deck.pop(); cd.up = k === c; st.tab[c].push(cd); }
    st.stock = deck;
  }
  function snap() { hist.push(JSON.stringify({ st: st, score: score })); if (hist.length > 60) hist.shift(); }
  function undo() { if (!hist.length) { A.sfx('wall'); return; } var h = JSON.parse(hist.pop()); st = h.st; hintMv = null; hintT = 0; score = Math.max(0, h.score - 5); A.sfx('click'); hud(); }
  function reset() { deal(); score = 0; moves = 0; time = 0; hist = []; drag = null; winT = 0; auto = false; flyers = []; hintT = 0; hintMv = null; quitT = 0; hintsUsed = 0; fx.clear(); hud(); }
  function canFound(c, f) { var top = st.found[f][st.found[f].length - 1]; return top ? top.s === c.s && c.r === top.r + 1 : c.r === 0; }
  function canTab(c, t) { var top = st.tab[t][st.tab[t].length - 1]; return top ? top.up && red(top) !== red(c) && c.r === top.r - 1 : c.r === 12; }
  function flipTops() { st.tab.forEach(function (col) { var t = col[col.length - 1]; if (t && !t.up) { t.up = true; score += 5; } }); }
  function afterMove() { moves++; hintMv = null; hintT = 0; flipTops(); hud(); checkWin(); }
  function checkWin() {
    if (st.found.every(function (f) { return f.length === 13; })) { winT = 1.8; A.sfx('level'); for (var i = 0; i < 8; i++) fx.burst(A.rand(60, W - 60), A.rand(200, 700), A.pick(['#ff7aa8', '#ffd166', '#5ee7ff']), 26, 380, 0.9, 4); return; }
    if (!auto && !st.stock.length && !st.waste.length && st.tab.every(function (col) { return col.every(function (c) { return c.up; }); })) { auto = true; }
  }
  // 출발지에서 카드(들) 떼기
  function take(src) { if (src.from === 'waste') return [st.waste.pop()]; if (src.from === 'found') return [st.found[src.i].pop()]; return st.tab[src.i].splice(src.k); }
  function cardsOf(src) { if (src.from === 'waste') return [st.waste[st.waste.length - 1]]; if (src.from === 'found') return [st.found[src.i][st.found[src.i].length - 1]]; return st.tab[src.i].slice(src.k); }
  function tryMove(src, dst) {
    var cards = cardsOf(src); if (!cards[0]) return false;
    if (dst.to === 'found') { if (cards.length !== 1 || !canFound(cards[0], dst.i)) return false; snap(); take(src); st.found[dst.i].push(cards[0]); score += 10; A.sfx('coin', 1 + cards[0].r * 0.03); afterMove(); return true; }
    if (dst.to === 'tab') { if (src.from === 'tab' && src.i === dst.i) return false; if (!canTab(cards[0], dst.i)) return false; snap(); take(src); st.tab[dst.i] = st.tab[dst.i].concat(cards); if (src.from === 'waste') score += 5; if (src.from === 'found') score = Math.max(0, score - 15); A.sfx('tick', 1.2); afterMove(); return true; }
    return false;
  }
  function autoMove(src) {
    var cards = cardsOf(src); if (!cards[0]) return false;
    if (cards.length === 1 && src.from !== 'found') for (var f = 0; f < 4; f++) if (tryMove(src, { to: 'found', i: f })) return true;
    for (var t = 0; t < 7; t++) { var d = (src.from === 'tab' ? (src.i + 1 + t) % 7 : t); if (src.from === 'tab' && src.k === 0 && !st.tab[d].length) continue; if (tryMove(src, { to: 'tab', i: d })) return true; } // 맨 아래 K 줄을 빈 칸으로 옮기는 헛수는 건너뜀
    A.sfx('wall'); return false;
  }
  function drawStock() {
    hintMv = null; hintT = 0;
    snap();
    if (st.stock.length) { var c = st.stock.pop(); c.up = true; st.waste.push(c); A.sfx('click', 1.2); }
    else if (st.waste.length) { st.stock = st.waste.reverse().map(function (c) { c.up = false; return c; }); st.waste = []; score = Math.max(0, score - 20); A.sfx('turn'); }
    else hist.pop();
    hud();
  }
  function tabY(col, k) { var y = TY; for (var i = 0; i < k; i++) y += col[i].up ? (col.length > 13 ? 22 : 30) : 12; return y; }
  function hit(p) {
    if (p.y >= TOPY && p.y <= TOPY + CH) {
      if (p.x >= px(0) && p.x <= px(0) + CW) return { from: 'stock' };
      if (p.x >= px(1) && p.x <= px(1) + CW + 30 && st.waste.length) return { from: 'waste' };
      for (var f = 0; f < 4; f++) if (p.x >= px(3 + f) && p.x <= px(3 + f) + CW) return { from: 'found', i: f };
    }
    for (var t = 0; t < 7; t++) if (p.x >= px(t) && p.x <= px(t) + CW) {
      var col = st.tab[t]; for (var k = col.length - 1; k >= 0; k--) { var y = tabY(col, k); if (p.y >= y && p.y <= y + (k === col.length - 1 ? CH : (col[k].up ? 30 : 12))) return col[k].up ? { from: 'tab', i: t, k: k } : null; }
      if (!col.length && p.y >= TY && p.y <= TY + CH) return { from: 'empty', i: t };
    }
    return null;
  }
  function dropTarget(p) {
    if (p.y < TOPY + CH + 20) for (var f = 0; f < 4; f++) if (Math.abs(p.x - (px(3 + f) + CW / 2)) < CW * 0.7) return { to: 'found', i: f };
    var best = null, bd = 1e9; for (var t = 0; t < 7; t++) { var d = Math.abs(p.x - (px(t) + CW / 2)); if (d < bd) { bd = d; best = t; } }
    return bd < CW ? { to: 'tab', i: best } : null;
  }
  // 힌트: 쓸모 있는 수를 하나 찾음 → {src, dst} / {stock:true} / null(막힘)
  function findMove() {
    var t, f, d, col, top;
    function toFound(src, c) { for (var ff = 0; ff < 4; ff++) if (canFound(c, ff)) return { src: src, dst: { to: 'found', i: ff } }; return null; }
    for (t = 0; t < 7; t++) { col = st.tab[t]; top = col[col.length - 1]; if (top && top.up) { var m = toFound({ from: 'tab', i: t, k: col.length - 1 }, top); if (m) return m; } }
    if (st.waste.length) { m = toFound({ from: 'waste' }, st.waste[st.waste.length - 1]); if (m) return m; }
    // 뒤집힌 카드를 드러내거나 빈 칸을 만드는 줄 옮기기
    for (t = 0; t < 7; t++) {
      col = st.tab[t]; var fu = 0; while (fu < col.length && !col[fu].up) fu++;
      if (fu >= col.length) continue;
      for (d = 0; d < 7; d++) { if (d === t) continue; if (!st.tab[d].length && fu === 0) continue; if (canTab(col[fu], d)) return { src: { from: 'tab', i: t, k: fu }, dst: { to: 'tab', i: d } }; }
    }
    if (st.waste.length) { var w = st.waste[st.waste.length - 1]; for (d = 0; d < 7; d++) if (canTab(w, d)) return { src: { from: 'waste' }, dst: { to: 'tab', i: d } }; }
    // 덱 안에 쓸 수 있는 카드가 있으면 덱 넘기기
    var pile = st.stock.concat(st.waste);
    for (var k = 0; k < pile.length; k++) { var c = pile[k]; for (f = 0; f < 4; f++) if (canFound(c, f)) return { stock: true }; for (d = 0; d < 7; d++) if (canTab(c, d)) return { stock: true }; }
    return null;
  }
  function showHint() {
    if (S.state !== 'playing' || winT > 0 || auto) return;
    var m = findMove(); hintsUsed++;
    if (!m) { hintMv = null; S.banner('더 옮길 카드가 없어요', '되돌리기 하거나 끝내기로 점수 확정'); A.sfx('wall'); return; }
    hintMv = m; hintT = 1.8; A.sfx('power', 1.1);
  }
  function srcRect(src) {
    if (src.from === 'waste') return [px(1) + (Math.min(3, st.waste.length) - 1) * 14, TOPY, CW, CH];
    if (src.from === 'tab') { var col = st.tab[src.i], y = tabY(col, src.k); return [px(src.i), y, CW, tabY(col, col.length - 1) + CH - y]; }
    return [px(0), TOPY, CW, CH];
  }
  function dstRect(dst) {
    if (dst.to === 'found') return [px(3 + dst.i), TOPY, CW, CH];
    var col = st.tab[dst.i]; return [px(dst.i), col.length ? tabY(col, col.length - 1) : TY, CW, CH];
  }
  function update(dt) {
    if (hintT > 0) { hintT -= dt; if (hintT <= 0) hintMv = null; }
    if (quitT > 0) quitT -= dt;
    fx.update(dt);
    if (winT > 0) { winT -= dt; if (winT <= 0) { var bonus = Math.max(0, Math.round(1500 - time * 2)); S.gameOver(score + bonus, [['시간', fmt(time)], ['이동', String(moves)], ['시간 보너스', '+' + bonus]], { kick: 'YOU WIN!', win: true }); } return; }
    time += dt;
    if (auto) { autoT -= dt; if (autoT <= 0) { autoT = 0.08; var moved = false; for (var t = 0; t < 7 && !moved; t++) if (st.tab[t].length) { var src = { from: 'tab', i: st.tab[t].length - 1 >= 0 ? t : t, k: st.tab[t].length - 1 }; for (var f = 0; f < 4 && !moved; f++) if (canFound(st.tab[t][st.tab[t].length - 1], f)) { moved = tryMove(src, { to: 'found', i: f }); } } } }
    hud();
  }
  var autoT = 0;
  function fmt(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function card(c, cd, x, y, hl) {
    if (!cd.up) { var g = c.createLinearGradient(x, y, x, y + CH); g.addColorStop(0, '#c4407a'); g.addColorStop(1, '#6a1840'); c.fillStyle = g; A.rr(c, x, y, CW, CH, 8); c.fill(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; A.rr(c, x + 5, y + 5, CW - 10, CH - 10, 5); c.stroke(); return; }
    c.fillStyle = hl ? '#fff6d8' : '#fbfbf7'; A.rr(c, x, y, CW, CH, 8); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.stroke();
    var col = red(cd) ? '#d6284f' : '#1a1a2a'; c.fillStyle = col; c.textAlign = 'left'; c.textBaseline = 'top';
    c.font = '700 19px "Pretendard Variable",system-ui'; c.fillText(RANKS[cd.r], x + 6, y + 4); c.font = '700 16px system-ui'; c.fillText(SUITS[cd.s], x + 6 + (cd.r === 9 ? 24 : 14), y + 6);
    c.font = '700 38px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(SUITS[cd.s], x + CW / 2, y + CH * 0.62);
  }
  function slot(c, x, y, label) { c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; A.rr(c, x, y, CW, CH, 8); c.stroke(); if (label) { c.fillStyle = 'rgba(255,255,255,.18)'; c.font = '700 28px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x + CW / 2, y + CH / 2); } }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    var g = c.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 700); g.addColorStop(0, '#13402c'); g.addColorStop(1, '#06180f'); c.fillStyle = g; c.fillRect(-10, -10, W + 20, H + 20);
    if (!st) deal();
    slot(c, px(0), TOPY, st.stock.length ? '' : '↻'); if (st.stock.length) card(c, { up: false }, px(0), TOPY);
    slot(c, px(1), TOPY); var wv = st.waste.slice(-3); wv.forEach(function (cd, k) { if (drag && drag.src.from === 'waste' && k === wv.length - 1) return; card(c, cd, px(1) + k * 14, TOPY); });
    for (var f = 0; f < 4; f++) { slot(c, px(3 + f), TOPY, SUITS[f]); var fl = st.found[f]; var top = fl[fl.length - 1]; if (drag && drag.src.from === 'found' && drag.src.i === f) top = fl[fl.length - 2]; if (top) card(c, top, px(3 + f), TOPY); }
    for (var t = 0; t < 7; t++) { slot(c, px(t), TY, 'K'); var col = st.tab[t]; for (var k = 0; k < col.length; k++) { if (drag && drag.src.from === 'tab' && drag.src.i === t && k >= drag.src.k) break; card(c, col[k], px(t), tabY(col, k)); } }
    if (drag) drag.cards.forEach(function (cd, k) { card(c, cd, drag.x - drag.ox, drag.y - drag.oy + k * 30, true); });
    // 버튼
    // 힌트 표시: 옮길 카드(분홍)와 놓을 곳(노랑)을 깜빡임
    if (hintMv && hintT > 0 && !drag) {
      var pa = 0.5 + 0.5 * Math.sin(S.time * 10); c.lineWidth = 4;
      var rs = hintMv.stock ? [px(0), TOPY, CW, CH] : srcRect(hintMv.src);
      c.strokeStyle = 'rgba(255,122,168,' + (0.45 + pa * 0.55) + ')'; A.rr(c, rs[0] - 3, rs[1] - 3, rs[2] + 6, rs[3] + 6, 10); c.stroke();
      if (hintMv.dst) { var rd = dstRect(hintMv.dst); c.strokeStyle = 'rgba(255,209,102,' + (0.45 + pa * 0.55) + ')'; A.rr(c, rd[0] - 3, rd[1] - 3, rd[2] + 6, rd[3] + 6, 10); c.stroke(); }
    }
    var btns = [['되돌리기', 60], ['끝내기', 400]];
    if (!auto) btns.push(['힌트', 220]);
    btns.forEach(function (b) { var q = b[1] === 400 && quitT > 0; c.fillStyle = q ? '#ff4d6d' : b[1] === 220 ? 'rgba(255,209,102,.14)' : 'rgba(255,255,255,.08)'; A.rr(c, b[1], 880, 100, 50, 14); c.fill(); c.fillStyle = q ? '#fff' : b[1] === 220 ? '#ffd166' : '#ffd6e4'; c.font = '700 16px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(q ? '정말 끝내기?' : b[0], b[1] + 50, 905); });
    if (auto && S.state === 'playing') { c.fillStyle = '#ffd166'; c.font = '700 18px "Pretendard Variable",system-ui'; c.fillText('자동 정리 중…', W / 2, 905); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = score + '|' + moves + '|' + Math.floor(time); if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = moves; document.getElementById('hC').textContent = fmt(time); }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing' || winT > 0) return; var p = S.toLocal(e);
    if (p.y > 880 && p.y < 930) {
      if (p.x > 60 && p.x < 160) undo();
      if (p.x > 220 && p.x < 320) showHint();
      // 끝내기는 실수로 누르지 않게 2.5초 안에 한 번 더 눌러야 끝남
      if (p.x > 400 && p.x < 500) { if (quitT > 0) S.gameOver(score, [['이동', String(moves)], ['모은 카드', st.found.reduce(function (a, f) { return a + f.length; }, 0) + '/52']]); else { quitT = 2.5; A.sfx('click'); } }
      return;
    }
    var h = hit(p); if (!h) return;
    if (h.from === 'stock') { drawStock(); return; } if (h.from === 'empty') return;
    var cards = cardsOf(h), y0 = h.from === 'tab' ? tabY(st.tab[h.i], h.k) : TOPY, x0 = h.from === 'tab' ? px(h.i) : h.from === 'waste' ? px(1) + (Math.min(3, st.waste.length) - 1) * 14 : px(3 + h.i);
    drag = { src: h, cards: cards, x: p.x, y: p.y, ox: p.x - x0, oy: p.y - y0, sx: p.x, sy: p.y, t: performance.now(), id: e.pointerId, moved: false };
    try { stage.setPointerCapture(e.pointerId); } catch (er) {}
  });
  stage.addEventListener('pointermove', function (e) { if (!drag || drag.id !== e.pointerId) return; var p = S.toLocal(e); drag.x = p.x; drag.y = p.y; if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 10) drag.moved = true; });
  stage.addEventListener('pointerup', function (e) {
    if (!drag || drag.id !== e.pointerId) return; var d = drag; drag = null;
    if (!d.moved) { autoMove(d.src); return; }
    var tg = dropTarget({ x: d.x - d.ox + CW / 2, y: d.y - d.oy + 20 }); if (!tg || !tryMove(d.src, tg)) A.sfx('wall');
  });
  var S = new A.Shell({ id: 'solitaire', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if ((k === ' ' || k === 'Enter') && !e.repeat) drawStock(); if (k === 'u' || k === 'U' || (k === 'z' && (e.ctrlKey || e.metaKey))) undo(); if ((k === 'h' || k === 'H') && !e.repeat) showHint();
      if (k === 'w' && st.waste.length) autoMove({ from: 'waste' }); if (/^[1-7]$/.test(k)) { var t = +k - 1, col = st.tab[t]; if (col.length) { var fu = 0; while (fu < col.length && !col[fu].up) fu++; if (!autoMove({ from: 'tab', i: t, k: col.length - 1 }) && fu < col.length - 1) autoMove({ from: 'tab', i: t, k: fu }); } } } });
})();
