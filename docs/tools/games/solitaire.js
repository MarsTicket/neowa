(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CW = 70, CH = 98, GAP = (540 - 7 * 70) / 8, TY = 250, TOPY = 120;
  var SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var fx = new A.FX();
  // 판 고르기: 0 무작위 판, 1 오늘의 판(날짜 시드로 누구나 같은 배치). 새 키 neowa_solitaire_diff
  var diff = +A.get('neowa_solitaire_diff', '0') || 0;
  function today() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function seeded(a) { return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // 자동 이동: 기본 꺼짐. 켜면 탭/클릭·W·1~7키가 카드를 알아서 옮긴다. 새 키 neowa_solitaire_automove
  var autoMoveOn = A.getInt('neowa_solitaire_automove', 0) === 1;
  var tut = A.get('neowa_solitaire_tut', '') !== '1'; // 첫 판 안내
  var st, score, moves, time, hist, drag = null, winT, auto, flyers = [], hintT = 0, hintMv = null, quitT = 0, hintsUsed = 0;
  // 화면 배치: 세로 540x960 (위 줄: 덱·넘긴 카드·모으기 4칸) / 가로 960x640 (왼쪽: 덱·넘긴 카드·점수, 가운데: 바닥 7줄, 오른쪽: 모으기 4칸)
  var land = false;
  function geo(sh) {
    land = !!sh.land; W = sh.W; H = sh.H;
    if (land) { CW = 84; CH = 118; TY = 20; } else { CW = 70; CH = 98; TY = 250; }
  }
  function px(i) { return land ? 150 + i * 94 : GAP + i * (CW + GAP); }
  function stockXY() { return land ? [20, 20] : [px(0), TOPY]; }
  function wasteXY() { return land ? [20, 154] : [px(1), TOPY]; }
  function foundXY(f) { return land ? [856, 20 + f * 128] : [px(3 + f), TOPY]; }
  function wasteTopX() { return wasteXY()[0] + (Math.min(3, st.waste.length) - 1) * 14; }
  // 펼친 카드 간격: 가로 화면은 판 높이에 맞춰 줄여서 긴 줄도 화면 안에 들어오게
  function upGap(col) {
    if (!land) return col.length > 13 ? 22 : 30;
    var downs = 0; for (var i = 0; i < col.length; i++) if (!col[i].up) downs++;
    var ups = col.length - downs; return ups > 1 ? Math.max(14, Math.min(34, (H - 16 - TY - CH - downs * 16) / (ups - 1))) : 34;
  }
  function inBox(p, xy, w, h) { return p.x >= xy[0] && p.x <= xy[0] + w && p.y >= xy[1] && p.y <= xy[1] + h; }
  function red(c) { return c.s === 1 || c.s === 2; }
  function deal() {
    var deck = []; for (var s = 0; s < 4; s++) for (var r = 0; r < 13; r++) deck.push({ s: s, r: r, up: false });
    var rnd = diff === 1 && S ? seeded(today() * 13 + 3) : Math.random;
    for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    st = { stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []] };
    for (var c = 0; c < 7; c++) for (var k = 0; k <= c; k++) { var cd = deck.pop(); cd.up = k === c; st.tab[c].push(cd); }
    st.stock = deck;
  }
  function snap() { hist.push(JSON.stringify({ st: st, score: score })); if (hist.length > 60) hist.shift(); }
  function undo() { if (!hist.length) { A.sfx('wall'); return; } var h = JSON.parse(hist.pop()); st = h.st; hintMv = null; hintT = 0; score = Math.max(0, h.score - 5); A.sfx('slide', 0.8); hud(); }
  function reset() { deal(); score = 0; moves = 0; time = 0; hist = []; drag = null; winT = 0; auto = false; flyers = []; hintT = 0; hintMv = null; quitT = 0; hintsUsed = 0; fx.clear(); hud(); }
  function canFound(c, f) { var top = st.found[f][st.found[f].length - 1]; return top ? top.s === c.s && c.r === top.r + 1 : c.r === 0; }
  function canTab(c, t) { var top = st.tab[t][st.tab[t].length - 1]; return top ? top.up && red(top) !== red(c) && c.r === top.r - 1 : c.r === 12; }
  function flipTops() { st.tab.forEach(function (col) { var t = col[col.length - 1]; if (t && !t.up) { t.up = true; score += 5; A.sfx('flip', 1.3); } }); }
  function afterMove() { if (tut) { tut = false; A.set('neowa_solitaire_tut', '1'); }
    moves++; hintMv = null; hintT = 0; flipTops(); hud(); checkWin(); }
  function checkWin() {
    if (st.found.every(function (f) { return f.length === 13; })) { winT = 1.8; A.sfx('win'); for (var i = 0; i < 8; i++) fx.burst(A.rand(60, W - 60), A.rand(200, 700), A.pick(['#ff7aa8', '#ffd166', '#5ee7ff']), 26, 380, 0.9, 4); return; }
    if (!auto && !st.stock.length && !st.waste.length && st.tab.every(function (col) { return col.every(function (c) { return c.up; }); })) { auto = true; }
  }
  // 출발지에서 카드(들) 떼기
  function take(src) { if (src.from === 'waste') return [st.waste.pop()]; if (src.from === 'found') return [st.found[src.i].pop()]; return st.tab[src.i].splice(src.k); }
  function cardsOf(src) { if (src.from === 'waste') return [st.waste[st.waste.length - 1]]; if (src.from === 'found') return [st.found[src.i][st.found[src.i].length - 1]]; return st.tab[src.i].slice(src.k); }
  function tryMove(src, dst) {
    var cards = cardsOf(src); if (!cards[0]) return false;
    if (dst.to === 'found') { if (cards.length !== 1 || !canFound(cards[0], dst.i)) return false; snap(); take(src); st.found[dst.i].push(cards[0]); score += 10; A.sfx('coin', 1 + cards[0].r * 0.04); afterMove(); return true; }
    if (dst.to === 'tab') { if (src.from === 'tab' && src.i === dst.i) return false; if (!canTab(cards[0], dst.i)) return false; snap(); take(src); st.tab[dst.i] = st.tab[dst.i].concat(cards); if (src.from === 'waste') score += 5; if (src.from === 'found') score = Math.max(0, score - 15); A.sfx('place', 1.2); afterMove(); return true; }
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
    if (st.stock.length) { var c = st.stock.pop(); c.up = true; st.waste.push(c); A.sfx('flip'); }
    else if (st.waste.length) { st.stock = st.waste.reverse().map(function (c) { c.up = false; return c; }); st.waste = []; score = Math.max(0, score - 20); A.sfx('deal', 1.2); }
    else hist.pop();
    hud();
  }
  function tabY(col, k) { var y = TY, ug = upGap(col), dg = land ? 16 : 12; for (var i = 0; i < k; i++) y += col[i].up ? ug : dg; return y; }
  function hit(p) {
    if (inBox(p, stockXY(), CW, CH)) return { from: 'stock' };
    if (st.waste.length && inBox(p, wasteXY(), CW + 30, CH)) return { from: 'waste' };
    for (var f = 0; f < 4; f++) if (inBox(p, foundXY(f), CW, CH)) return { from: 'found', i: f };
    for (var t = 0; t < 7; t++) if (p.x >= px(t) && p.x <= px(t) + CW) {
      var col = st.tab[t]; for (var k = col.length - 1; k >= 0; k--) { var y = tabY(col, k); if (p.y >= y && p.y <= y + (k === col.length - 1 ? CH : tabY(col, k + 1) - y)) return col[k].up ? { from: 'tab', i: t, k: k } : null; }
      if (!col.length && p.y >= TY && p.y <= TY + CH) return { from: 'empty', i: t };
    }
    return null;
  }
  function dropTarget(p) {
    for (var f = 0; f < 4; f++) { var fp = foundXY(f); if (Math.abs(p.x - (fp[0] + CW / 2)) < CW * 0.7 && p.y > fp[1] - 20 && p.y < fp[1] + CH + 20) return { to: 'found', i: f }; }
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
    if (src.from === 'waste') return [wasteTopX(), wasteXY()[1], CW, CH];
    if (src.from === 'tab') { var col = st.tab[src.i], y = tabY(col, src.k); return [px(src.i), y, CW, tabY(col, col.length - 1) + CH - y]; }
    var sp = stockXY(); return [sp[0], sp[1], CW, CH];
  }
  function dstRect(dst) {
    if (dst.to === 'found') { var fp = foundXY(dst.i); return [fp[0], fp[1], CW, CH]; }
    var col = st.tab[dst.i]; return [px(dst.i), col.length ? tabY(col, col.length - 1) : TY, CW, CH];
  }
  function update(dt) {
    if (hintT > 0) { hintT -= dt; if (hintT <= 0) hintMv = null; }
    if (quitT > 0) { quitT -= dt; if (quitT <= 0) paintPanel(); }
    fx.update(dt);
    if (winT > 0) { winT -= dt; if (winT <= 0) { var bonus = Math.max(0, Math.round(1500 - time * 2)); S.gameOver(score + bonus, [[diff === 1 ? '오늘의 판 · 시간' : '시간', fmt(time)], ['이동', String(moves)], ['시간 보너스', '+' + bonus]], { kick: 'YOU WIN!', win: true }); } return; }
    time += dt;
    if (auto) { autoT -= dt; if (autoT <= 0) { autoT = 0.08; var moved = false; for (var t = 0; t < 7 && !moved; t++) if (st.tab[t].length) { var src = { from: 'tab', i: st.tab[t].length - 1 >= 0 ? t : t, k: st.tab[t].length - 1 }; for (var f = 0; f < 4 && !moved; f++) if (canFound(st.tab[t][st.tab[t].length - 1], f)) { moved = tryMove(src, { to: 'found', i: f }); } } } }
    hud();
  }
  var autoT = 0;
  function fmt(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  /* 그림: 카드 뒷면(격자 무늬·문장), 카드 앞면 바탕과 그림자, 펠트 천 테이블(실 무늬·나무 테두리) */
  function backSpr() {
    return A.sprite('solback', CW, CH, function (x) {
      var g = x.createLinearGradient(0, 0, CW, CH); g.addColorStop(0, '#d4508a'); g.addColorStop(1, '#6a1840'); x.fillStyle = g; A.rr(x, 0, 0, CW, CH, 8); x.fill();
      x.fillStyle = '#fbfbf7'; A.rr(x, 3, 3, CW - 6, CH - 6, 8 - 2); x.fill(); x.fillStyle = g; A.rr(x, 5, 5, CW - 10, CH - 10, 8 - 3); x.fill();
      x.save(); A.rr(x, 5, 5, CW - 10, CH - 10, 8 - 3); x.clip(); x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1;
      for (var k = -CH; k < CW + CH; k += 8) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + CH, CH); x.moveTo(k + CH, 0); x.lineTo(k, CH); x.stroke(); } x.restore();
      x.fillStyle = '#ffd166'; x.save(); x.translate(CW / 2, CH / 2); x.rotate(Math.PI / 4); x.fillRect(-9, -9, 18, 18); x.fillStyle = '#6a1840'; x.fillRect(-5, -5, 10, 10); x.restore();
    });
  }
  function faceSpr(hl) {
    return A.sprite('solface' + (hl ? 'h' : ''), CW, CH, function (x) {
      var g = x.createLinearGradient(0, 0, 0, CH); g.addColorStop(0, hl ? '#fff9e0' : '#ffffff'); g.addColorStop(1, hl ? '#ffeaa8' : '#ecebe4'); x.fillStyle = g; A.rr(x, 0, 0, CW, CH, 8); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 1; A.rr(x, 0.5, 0.5, CW - 1, CH - 1, 8); x.stroke();
    });
  }
  function shadow(c, x, y) { c.fillStyle = 'rgba(0,0,0,.28)'; A.rr(c, x + 2, y + 3, CW, CH, 8); c.fill(); }
  // 화면 크기(세로/가로)별로 따로 그림
  function feltSpr() { return A.sprite('solfelt' + W + 'x' + H, W, H, function (x) {
    var g = x.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 720); g.addColorStop(0, '#1a5a3a'); g.addColorStop(1, '#06180f'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 6000; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.05)'; x.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
    var v = x.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 680); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
  }); }
  function card(c, cd, x, y, hl) {
    shadow(c, x, y);
    if (!cd.up) { c.drawImage(backSpr(), x, y, CW, CH); return; }
    c.drawImage(faceSpr(hl), x, y, CW, CH);
    var col = red(cd) ? '#d6284f' : '#1a1a2a'; c.fillStyle = col; c.textAlign = 'left'; c.textBaseline = 'top';
    var z = CW / 70; // 가로 화면은 카드가 커서 글자도 같이 키움
    c.font = '700 ' + Math.round(19 * z) + 'px "Pretendard Variable",system-ui'; c.fillText(RANKS[cd.r], x + 6 * z, y + 4 * z); c.font = '700 ' + Math.round(16 * z) + 'px system-ui'; c.fillText(SUITS[cd.s], x + (6 + (cd.r === 9 ? 24 : 14)) * z, y + 6 * z);
    c.font = '700 ' + Math.round(38 * z) + 'px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(SUITS[cd.s], x + CW / 2, y + CH * 0.62);
  }
  function slot(c, x, y, label) { c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; A.rr(c, x, y, CW, CH, 8); c.stroke(); if (label) { c.fillStyle = 'rgba(255,255,255,.18)'; c.font = '700 28px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x + CW / 2, y + CH / 2); } }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(feltSpr(), -10, -10, W + 20, H + 20);
    if (!st) deal();
    var sp = stockXY(), wp = wasteXY();
    slot(c, sp[0], sp[1], st.stock.length ? '' : '↻'); if (st.stock.length) card(c, { up: false }, sp[0], sp[1]);
    slot(c, wp[0], wp[1]); var wv = st.waste.slice(-3); wv.forEach(function (cd, k) { if (drag && drag.src.from === 'waste' && k === wv.length - 1) return; card(c, cd, wp[0] + k * 14, wp[1]); });
    for (var f = 0; f < 4; f++) { var fp = foundXY(f); slot(c, fp[0], fp[1], SUITS[f]); var fl = st.found[f]; var top = fl[fl.length - 1]; if (drag && drag.src.from === 'found' && drag.src.i === f) top = fl[fl.length - 2]; if (top) card(c, top, fp[0], fp[1]); }
    for (var t = 0; t < 7; t++) { slot(c, px(t), TY, 'K'); var col = st.tab[t]; for (var k = 0; k < col.length; k++) { if (drag && drag.src.from === 'tab' && drag.src.i === t && k >= drag.src.k) break; card(c, col[k], px(t), tabY(col, k)); } }
    if (drag) drag.cards.forEach(function (cd, k) { card(c, cd, drag.x - drag.ox, drag.y - drag.oy + k * (land ? 34 : 30), true); });
    // 버튼
    // 힌트 표시: 옮길 카드(분홍)와 놓을 곳(노랑)을 깜빡임
    if (hintMv && hintT > 0 && !drag) {
      var pa = 0.5 + 0.5 * Math.sin(S.time * 10); c.lineWidth = 4;
      var rs = hintMv.stock ? srcRect({ from: 'stock' }) : srcRect(hintMv.src);
      c.strokeStyle = 'rgba(255,122,168,' + (0.45 + pa * 0.55) + ')'; A.rr(c, rs[0] - 3, rs[1] - 3, rs[2] + 6, rs[3] + 6, 10); c.stroke();
      if (hintMv.dst) { var rd = dstRect(hintMv.dst); c.strokeStyle = 'rgba(255,209,102,' + (0.45 + pa * 0.55) + ')'; A.rr(c, rd[0] - 3, rd[1] - 3, rd[2] + 6, rd[3] + 6, 10); c.stroke(); }
    }
    // 첫 판 안내: 옮길 수 있는 카드를 깜빡여 주고 말풍선
    if (tut && st && S.state === 'playing' && !drag) {
      if (!hintMv && moves === 0) { hintMv = findMove(); hintT = hintMv ? 999 : 0; }
      var tw = land ? 640 : 500, tx = land ? 154 : (W - tw) / 2, ty = land ? H - 108 : 724, touch = document.body.classList.contains('touch');
      c.globalAlpha = 0.93; c.fillStyle = '#2a0818'; A.rr(c, tx, ty, tw, 92, 18); c.fill(); c.strokeStyle = '#ff7aa8'; c.lineWidth = 2; c.stroke(); c.globalAlpha = 1;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      var tut1 = autoMoveOn ? (touch ? '카드를 탭하면 갈 수 있는 곳으로 자동 이동!' : '카드를 클릭하면 갈 수 있는 곳으로 자동 이동!') : '카드를 끌어다 놓으세요!';
      var tut2 = autoMoveOn ? '깜빡이는 카드부터 · 끌어 놓아도 되고, 막히면 힌트' : '깜빡이는 카드부터 · 막히면 힌트';
      c.fillStyle = '#ff7aa8'; c.font = '800 21px "Pretendard Variable",system-ui'; c.fillText(tut1, tx + tw / 2, ty + 32);
      c.fillStyle = 'rgba(255,214,228,.85)'; c.font = '600 16px "Pretendard Variable",system-ui'; c.fillText(tut2, tx + tw / 2, ty + 64);
    }
    if (land) {
      // 가로 화면: 왼쪽 아래에 점수·이동·시간 (버튼은 오른쪽 패널)
      var ly = 300; c.textAlign = 'left'; c.textBaseline = 'middle';
      [['SCORE', A.fmt(score || 0)], ['MOVES', String(moves || 0)], ['TIME', fmt(time || 0)]].forEach(function (r, k) {
        c.fillStyle = 'rgba(255,214,228,.6)'; c.font = '600 17px "Chakra Petch",system-ui'; c.fillText(r[0], 22, ly + k * 84);
        c.fillStyle = '#fff'; c.font = '700 34px "Chakra Petch",system-ui'; c.fillText(r[1], 22, ly + k * 84 + 34);
      });
      if (auto && S.state === 'playing') { c.fillStyle = '#ffd166'; c.font = '700 16px "Pretendard Variable",system-ui'; c.fillText('자동 정리 중…', 22, 600); }
      fx.draw(c); c.restore(); fx.drawFlash(c, W, H); return;
    }
    var btns = [['되돌리기', 60], ['끝내기', 400]];
    if (!auto) btns.push(['힌트', 220]);
    btns.forEach(function (b) { var q = b[1] === 400 && quitT > 0; c.fillStyle = q ? '#ff4d6d' : b[1] === 220 ? 'rgba(255,209,102,.14)' : 'rgba(255,255,255,.08)'; A.rr(c, b[1], 880, 100, 50, 14); c.fill(); c.fillStyle = q ? '#fff' : b[1] === 220 ? '#ffd166' : '#ffd6e4'; c.font = '700 16px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(q ? '정말 끝내기?' : b[0], b[1] + 50, 905); });
    if (auto && S.state === 'playing') { c.fillStyle = '#ffd166'; c.font = '700 18px "Pretendard Variable",system-ui'; c.fillText('자동 정리 중…', W / 2, 905); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function quitPress() {
    if (S.state !== 'playing' || winT > 0) return;
    if (quitT > 0) S.gameOver(score, [['이동', String(moves)], ['모은 카드', st.found.reduce(function (a, f) { return a + f.length; }, 0) + '/52']]);
    else { quitT = 2.5; A.sfx('click'); paintPanel(); }
  }
  var pEl = {};
  var autoBtn = null; // 시작 화면 토글 버튼 (난이도 버튼 옆 .ov-diff 안에 넣음)
  function paintAuto() {
    var label = '자동 이동: ' + (autoMoveOn ? '켜짐' : '꺼짐');
    if (autoBtn) { autoBtn.textContent = label; autoBtn.classList.toggle('on', autoMoveOn); }
    if (pEl.auto) { pEl.auto.textContent = label; pEl.auto.classList.toggle('on', autoMoveOn); }
  }
  function toggleAuto() { autoMoveOn = !autoMoveOn; A.set('neowa_solitaire_automove', autoMoveOn ? '1' : '0'); A.sfx('click'); paintAuto(); }
  function paintPanel() {
    if (!pEl.quit) return;
    var play = S && S.state === 'playing' && winT <= 0;
    pEl.quit.textContent = quitT > 0 ? '정말 끝내기?' : '끝내기';
    pEl.quit.classList.toggle('main', quitT > 0);
    pEl.undo.disabled = !play || !hist || !hist.length; pEl.hint.disabled = !play || auto; pEl.quit.disabled = !play;
  }
  var last = '';
  function hud() { var k = score + '|' + moves + '|' + Math.floor(time) + '|' + (hist ? hist.length : 0) + '|' + auto; if (k === last) return; last = k; paintPanel(); document.getElementById('hA').textContent = A.fmt(score); document.getElementById('hB').textContent = moves; document.getElementById('hC').textContent = fmt(time); }
  var stage = document.getElementById('stage');
  stage.addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing' || winT > 0) return; var p = S.toLocal(e);
    if (!land && p.y > 880 && p.y < 930) {
      if (p.x > 60 && p.x < 160) undo();
      if (p.x > 220 && p.x < 320) showHint();
      // 끝내기는 실수로 누르지 않게 2.5초 안에 한 번 더 눌러야 끝남
      if (p.x > 400 && p.x < 500) quitPress();
      return;
    }
    var h = hit(p); if (!h) return;
    if (h.from === 'stock') { drawStock(); return; } if (h.from === 'empty') return;
    var cards = cardsOf(h), y0 = h.from === 'tab' ? tabY(st.tab[h.i], h.k) : h.from === 'waste' ? wasteXY()[1] : foundXY(h.i)[1], x0 = h.from === 'tab' ? px(h.i) : h.from === 'waste' ? wasteTopX() : foundXY(h.i)[0];
    drag = { src: h, cards: cards, x: p.x, y: p.y, ox: p.x - x0, oy: p.y - y0, sx: p.x, sy: p.y, t: performance.now(), id: e.pointerId, moved: false };
    try { stage.setPointerCapture(e.pointerId); } catch (er) {}
  });
  stage.addEventListener('pointermove', function (e) { if (!drag || drag.id !== e.pointerId) return; var p = S.toLocal(e); drag.x = p.x; drag.y = p.y; if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 10) drag.moved = true; });
  stage.addEventListener('pointerup', function (e) {
    if (!drag || drag.id !== e.pointerId) return; var d = drag; drag = null;
    if (!d.moved) { if (autoMoveOn) autoMove(d.src); else A.sfx('tap'); return; }
    var tg = dropTarget({ x: d.x - d.ox + CW / 2, y: d.y - d.oy + 20 }); if (!tg || !tryMove(d.src, tg)) A.sfx('wall');
  });
  var S = new A.Shell({ id: 'solitaire', W: W, H: H, land: [960, 640], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if ((k === ' ' || k === 'Enter') && !e.repeat) drawStock(); if (k === 'u' || k === 'U' || (k === 'z' && (e.ctrlKey || e.metaKey))) undo(); if ((k === 'h' || k === 'H') && !e.repeat) showHint();
      if (autoMoveOn) { if (k === 'w' && st.waste.length) autoMove({ from: 'waste' }); if (/^[1-7]$/.test(k)) { var t = +k - 1, col = st.tab[t]; if (col.length) { var fu = 0; while (fu < col.length && !col[fu].up) fu++; if (!autoMove({ from: 'tab', i: t, k: col.length - 1 }) && fu < col.length - 1) autoMove({ from: 'tab', i: t, k: fu }); } } } } });
  // 가로 화면 오른쪽 패널: 되돌리기·힌트·끝내기 큰 버튼 (점수는 게임판 왼쪽 아래에 그림)
  document.querySelector('.g-hud').setAttribute('data-land-hide', '');
  S.panelSlot.innerHTML = '<button class="gp-btn main" id="pkUndo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>되돌리기</button>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="gp-btn" id="pkHint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>힌트</button>' +
    '<button class="gp-btn" id="pkQuit">끝내기</button></div>' +
    '<button class="gp-btn" id="pkAuto">자동 이동: 꺼짐</button>';
  pEl = { undo: document.getElementById('pkUndo'), hint: document.getElementById('pkHint'), quit: document.getElementById('pkQuit'), auto: document.getElementById('pkAuto') };
  pEl.undo.addEventListener('click', function () { if (S.state === 'playing') undo(); });
  pEl.hint.addEventListener('click', showHint);
  pEl.quit.addEventListener('click', quitPress);
  pEl.auto.addEventListener('click', function () { toggleAuto(); });
  new MutationObserver(function () { paintPanel(); }).observe(document.body, { attributes: true, attributeFilter: ['data-state'] });
  paintPanel();
  // 판 고르기 버튼
  var dbtns = document.querySelectorAll('[data-diff]');
  function paintDiff() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_solitaire_diff', diff); A.sfx('click'); paintDiff(); }); });
  paintDiff();
  // 자동 이동 토글 버튼: 시작 화면 난이도 버튼 옆에 넣기 (.ov-diff는 data-nostart라 눌러도 게임이 시작되지 않음)
  var ovDiff = document.querySelector('.ov-diff');
  if (ovDiff) {
    autoBtn = document.createElement('button');
    autoBtn.type = 'button';
    autoBtn.id = 'ovAuto';
    autoBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleAuto(); });
    ovDiff.appendChild(autoBtn);
  }
  paintAuto();
})();
