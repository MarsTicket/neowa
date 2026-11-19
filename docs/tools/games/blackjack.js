(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CW = 78, CH = 110, land = false;
  // 가로 화면은 900x600: 왼쪽 탁자(가운데 x=310), 오른쪽에 큰 버튼 세로 배치
  function TX() { return land ? 310 : W / 2; }
  function MY() { return land ? 470 : 640; }
  var SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var fx = new A.FX();
  // hands: 내 손패 목록 (분할하면 2개). 각 {c: 카드들, bet: 건 칩, dbl: 더블 여부, split: 분할된 손인지}
  var shoe, chips, bet, round, MAXR = 20, phase, hands, hi, dl, msg, msgC, endT, btns = [], streak = 0, dealerT = 0, bestStreak = 0, MAXSC = 1000000; // MAXSC = 카탈로그 최고 점수 한도
  // 첫 플레이 안내: 처음 한 번만 판 위에 짧은 안내를 띄우고, 첫 올바른 행동을 하면 사라짐 (neowa_blackjack_tut = 1)
  var tut = A.get('neowa_blackjack_tut', '0') !== '1', tutStep = 0; // 0: 딜 안내, 1: 히트·스탠드 안내
  function tutDone() { if (tut) { tut = false; A.set('neowa_blackjack_tut', '1'); } }
  function isTouch() { return document.body.classList.contains('touch'); }
  function tutBox(c, x, y, txt, size, tx, ty) { // 글 상자 + (tx, ty)에 깜빡이는 손가락 원
    c.save(); c.font = '700 ' + size + 'px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    var w = c.measureText(txt).width + size * 1.6; c.fillStyle = 'rgba(0,0,0,.78)'; A.rr(c, x - w / 2, y - size, w, size * 2, size * 0.7); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.stroke(); c.fillStyle = '#fff'; c.fillText(txt, x, y + 1);
    if (tx != null) { var k = (S.time * 1.6) % 1; c.strokeStyle = 'rgba(255,255,255,' + (1 - k) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(tx, ty, 10 + k * 26, 0, 7); c.stroke(); c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(tx, ty, 8, 0, 7); c.fill(); }
    c.restore(); }

  function newShoe() { shoe = []; for (var d = 0; d < 4; d++) for (var s = 0; s < 4; s++) for (var r = 0; r < 13; r++) shoe.push({ s: s, r: r }); for (var i = shoe.length - 1; i > 0; i--) { var j = A.irand(0, i), t = shoe[i]; shoe[i] = shoe[j]; shoe[j] = t; } }
  function drawC(up) { if (shoe.length < 30) newShoe(); var c = shoe.pop(); c.up = up !== false; c.t = 0; return c; }
  function cv(c) { return Math.min(10, c.r + 1); }
  function val(h) { var v = 0, aces = 0; h.forEach(function (c) { if (!c.up) return; if (c.r === 0) { aces++; v += 11; } else v += cv(c); }); while (v > 21 && aces) { v -= 10; aces--; } return v; }
  function bj(h) { return h.length === 2 && val(h) === 21; }
  function cur() { return hands && hands[hi]; }
  function reset() { newShoe(); chips = 1000; bet = 100; round = 1; phase = 'bet'; hands = []; hi = 0; dl = []; streak = 0; bestStreak = 0; msg = '베팅액을 정하고 시작하세요'; msgC = '#fff'; endT = 0; fx.clear(); hud(); }
  function canDbl() { var h = cur(); return phase === 'play' && h && h.c.length === 2 && chips >= h.bet; }
  function canSplit() { var h = cur(); return phase === 'play' && hands.length === 1 && h.c.length === 2 && cv(h.c[0]) === cv(h.c[1]) && chips >= h.bet; }
  function deal() {
    if (phase !== 'bet' || S.state !== 'playing') return; bet = Math.min(bet, chips); if (bet <= 0) return;
    chips -= bet; hands = [{ c: [drawC(), drawC()], bet: bet }]; hi = 0; dl = [drawC(), drawC(false)]; phase = 'play'; msg = ''; A.sfx('deal');
    // 딜러가 A·10을 보이면 블랙잭인지 먼저 확인(피크). 나나 딜러가 블랙잭이면 바로 결과
    var dlBJ = (dl[0].r === 0 || cv(dl[0]) === 10) && val([dl[0], { r: dl[1].r, up: true }]) === 21;
    if (dlBJ || bj(hands[0].c)) { if (dlBJ) msg = '딜러 블랙잭!'; finish(); }
    hud();
  }
  function nextHand() {
    hi++;
    if (hi < hands.length) { var h = cur(); if (h.c.length < 2) h.c.push(drawC()); A.sfx('flip', 1.1); if (h.ace || val(h.c) === 21) nextHand(); return; }
    hi = hands.length - 1;
    dl[1].up = true;
    if (hands.every(function (h) { return val(h.c) > 21; })) { finish(); return; } // 모두 버스트면 딜러는 더 받지 않음
    phase = 'dealer'; dealerT = 0.6;
  }
  function hit() { if (phase !== 'play') return; if (tutStep) tutDone(); var h = cur(); h.c.push(drawC()); A.sfx('flip', 1.2); if (val(h.c) >= 21) nextHand(); hud(); }
  function stand() { if (phase !== 'play') return; if (tutStep) tutDone(); A.sfx('flip', 0.9); nextHand(); hud(); }
  function dbl() { if (!canDbl()) { A.sfx('wall'); return; } var h = cur(); chips -= h.bet; h.bet *= 2; h.dbl = true; h.c.push(drawC()); A.sfx('chip'); A.sfx('flip', 1.2); nextHand(); hud(); }
  function split() {
    if (!canSplit()) { A.sfx('wall'); return; }
    var h = hands[0], ace = h.c[0].r === 0; chips -= h.bet;
    hands = [{ c: [h.c[0], drawC()], bet: h.bet, split: true, ace: ace }, { c: [h.c[1]], bet: h.bet, split: true, ace: ace }]; hi = 0; A.sfx('coin', 1.2);
    if (ace || val(hands[0].c) === 21) nextHand(); // A를 나누면 한 장씩만 받음
    hud();
  }
  function finish() {
    dl.forEach(function (c) { c.up = true; }); var dv = val(dl), dBJ = bj(dl), total = 0, staked = 0, parts = [];
    hands.forEach(function (h) {
      var mv = val(h.c), win = 0, pbj = bj(h.c) && !h.split; staked += h.bet;
      if (mv > 21) parts.push('버스트');
      else if (pbj && !dBJ) { win = Math.floor(h.bet * 2.5); parts.push('블랙잭'); }
      else if (dBJ && !pbj) parts.push('패');
      else if (dv > 21 || mv > dv) { win = h.bet * 2; parts.push('승'); }
      else if (mv === dv) { win = h.bet; parts.push('푸시'); }
      else parts.push('패');
      total += win;
    });
    chips += total; phase = 'result'; endT = 1.6;
    var net = total - staked;
    if (hands.length > 1) { msg = parts.join(' · ') + (net ? (net > 0 ? '  +' : '  ') + net : ''); msgC = net > 0 ? '#4dffd2' : net < 0 ? '#ff4d6d' : '#fff'; }
    else if (parts[0] === '버스트') { msg = '버스트! 패배'; msgC = '#ff4d6d'; }
    else if (parts[0] === '블랙잭') { msg = '블랙잭! +' + net; msgC = '#ffd166'; }
    else if (parts[0] === '승') { msg = (dv > 21 ? '딜러 버스트! +' : '승리! +') + net; msgC = '#4dffd2'; }
    else if (parts[0] === '푸시') { msg = '무승부 (푸시)'; msgC = '#fff'; }
    else { msg = dBJ ? '딜러 블랙잭' : '딜러 승'; msgC = '#ff4d6d'; }
    if (net > 0) { streak++; bestStreak = Math.max(bestStreak, streak); A.sfx(parts.indexOf('블랙잭') >= 0 ? 'gold' : 'right'); fx.burst(TX(), MY(), '#4dffd2', 24, 300, 0.6, 3.5); if (streak >= 3) fx.text(TX(), MY() - 40, streak + '연승!', '#ffd166', 24); }
    else if (net < 0) { streak = 0; A.sfx(mv > 21 ? 'hurt' : 'wrong'); fx.shake(4, 0.2); }
    hud();
  }
  function update(dt) {
    fx.update(dt); var all = dl.slice(); hands.forEach(function (h) { all = all.concat(h.c); }); all.forEach(function (c) { c.t = Math.min(1, (c.t || 0) + dt * 5); });
    if (phase === 'dealer') { dealerT -= dt; if (dealerT <= 0) { if (val(dl) < 17) { dl.push(drawC()); A.sfx('flip', 0.9); dealerT = 0.55; } else finish(); } }
    if (phase === 'result') { endT -= dt; if (endT <= 0) {
      if (chips <= 0) { S.gameOver(0, [['라운드', String(round)], ['최대 연승', String(bestStreak)]]); return; }
      if (round >= MAXR) { S.gameOver(Math.min(chips, MAXSC), [['최종 칩', A.fmt(chips)], ['수익', (chips >= 1000 ? '+' : '') + A.fmt(chips - 1000)], ['최대 연승', String(bestStreak)]], { kick: 'FINISH', win: chips > 1000 }); return; } // 점수는 한도에서 자름(칩 표시는 그대로)
      round++; phase = 'bet'; hands = []; hi = 0; dl = []; bet = Math.max(Math.min(bet, chips), Math.min(10, chips)); msg = ''; if (round === MAXR) S.banner('마지막 판', '남은 칩이 점수'); hud(); } }
  }
  /* 그림: 카드 뒷면(격자 무늬·문장), 카드 앞면 바탕과 그림자, 펠트 천 테이블(실 무늬·나무 테두리) */
  function backSpr() {
    return A.sprite('bjback', CW, CH, function (x) {
      var g = x.createLinearGradient(0, 0, CW, CH); g.addColorStop(0, '#1a9a7a'); g.addColorStop(1, '#0a4a3a'); x.fillStyle = g; A.rr(x, 0, 0, CW, CH, 9); x.fill();
      x.fillStyle = '#fbfbf7'; A.rr(x, 3, 3, CW - 6, CH - 6, 9 - 2); x.fill(); x.fillStyle = g; A.rr(x, 5, 5, CW - 10, CH - 10, 9 - 3); x.fill();
      x.save(); A.rr(x, 5, 5, CW - 10, CH - 10, 9 - 3); x.clip(); x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1;
      for (var k = -CH; k < CW + CH; k += 8) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + CH, CH); x.moveTo(k + CH, 0); x.lineTo(k, CH); x.stroke(); } x.restore();
      x.fillStyle = '#ffd166'; x.save(); x.translate(CW / 2, CH / 2); x.rotate(Math.PI / 4); x.fillRect(-9, -9, 18, 18); x.fillStyle = '#0a4a3a'; x.fillRect(-5, -5, 10, 10); x.restore();
    });
  }
  function faceSpr(hl) {
    return A.sprite('bjface' + (hl ? 'h' : ''), CW, CH, function (x) {
      var g = x.createLinearGradient(0, 0, 0, CH); g.addColorStop(0, hl ? '#fff9e0' : '#ffffff'); g.addColorStop(1, hl ? '#ffeaa8' : '#ecebe4'); x.fillStyle = g; A.rr(x, 0, 0, CW, CH, 9); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = 1; A.rr(x, 0.5, 0.5, CW - 1, CH - 1, 9); x.stroke();
    });
  }
  function shadow(c, x, y) { c.fillStyle = 'rgba(0,0,0,.28)'; A.rr(c, x + 2, y + 3, CW, CH, 9); c.fill(); }
  var FELT = A.sprite('bjfelt', W, H, function (x) {
    var g = x.createRadialGradient(W / 2, 420, 60, W / 2, 420, 720); g.addColorStop(0, '#167a5a'); g.addColorStop(1, '#03160f'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 6000; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.05)'; x.fillRect(Math.random() * W, Math.random() * H, 1, 1); }
    var v = x.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 680); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
  });
  function cardDraw(c, cd, x, y) {
    var e = cd.t == null ? 1 : cd.t; y += (1 - e) * -200; c.globalAlpha = e;
    shadow(c, x, y);
    if (!cd.up) { c.drawImage(backSpr(), x, y, CW, CH); c.globalAlpha = 1; return; }
    c.drawImage(faceSpr(false), x, y, CW, CH);
    var col = cd.s === 1 || cd.s === 2 ? '#d6284f' : '#1a1a2a'; c.fillStyle = col; c.textAlign = 'left'; c.textBaseline = 'top'; c.font = '700 22px "Pretendard Variable",system-ui'; c.fillText(RANKS[cd.r], x + 7, y + 6); c.font = '700 18px system-ui'; c.fillText(SUITS[cd.s], x + 7, y + 30);
    c.font = '700 44px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(SUITS[cd.s], x + CW / 2, y + CH * 0.6); c.globalAlpha = 1;
  }
  function hand(c, h, y, label, cx, wid, active) {
    cx = cx == null ? TX() : cx; wid = wid || (land ? 560 : W - 80);
    var k = (wid < 300 ? 0.8 : 1) * (land ? 1.25 : 1), room = wid / k, n = h.length, step = Math.min(CW + 8, (room - CW) / Math.max(1, n - 1)), x0 = cx - ((n - 1) * step + CW) / 2;
    c.save(); c.translate(cx, y); c.scale(k, k); c.translate(-cx, -y); // 분할하면 카드를 조금 작게
    h.forEach(function (cd, i) { cardDraw(c, cd, x0 + i * step, y); }); c.restore();
    if (n) { c.fillStyle = active ? '#ffd166' : 'rgba(255,255,255,.75)'; c.font = '700 18px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label + ' ' + val(h), cx, y - (land ? 26 : 22)); }
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(FELT, -10, -10, W + 20, H + 20);
    c.strokeStyle = 'rgba(255,209,102,.25)'; c.lineWidth = 2; c.beginPath(); c.arc(TX(), land ? -400 : -200, 640, 0.4, Math.PI - 0.4); c.stroke(); if (land) { c.strokeStyle = 'rgba(255,255,255,.06)'; c.beginPath(); c.moveTo(632, 20); c.lineTo(632, H - 20); c.stroke(); }
    c.fillStyle = 'rgba(255,209,102,.5)'; c.font = '700 13px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('딜러는 16 이하에서 받고 17 이상에서 멈춥니다 · 블랙잭 1.5배', TX(), land ? 222 : 415);
    var PY = land ? 290 : 470;
    if (dl) hand(c, dl, land ? 62 : 170, '딜러');
    if (hands && hands.length === 1) hand(c, hands[0].c, PY, '나');
    else if (hands && hands.length === 2) hands.forEach(function (h, i) { var act = phase === 'play' && i === hi; if (act) { c.fillStyle = 'rgba(255,209,102,.12)'; A.rr(c, (land ? 20 + i * 300 : 20 + i * 255), PY - 38, land ? 280 : 245, 150, 14); c.fill(); } hand(c, h.c, PY, (i ? '오른쪽' : '왼쪽') + (h.dbl ? ' ×2' : ''), land ? 160 + i * 300 : 142 + i * 255, land ? 260 : 230, act); });
    if (msg) { c.fillStyle = msgC; c.font = '400 34px "Black Han Sans",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(msg, TX(), MY()); }
    btns = [];
    if (S.state === 'playing') {
      if (phase === 'bet') {
        c.fillStyle = '#fff'; c.font = '700 22px "Chakra Petch",system-ui'; c.fillText('베팅 ' + A.fmt(Math.min(bet, chips)), land ? 766 : W / 2, land ? 52 : 720);
        if (land) btns.push(['−', 650, 90, 110, 'minus', 90], ['+', 772, 90, 110, 'plus', 90], ['딜 (Space)', 650, 200, 232, 'deal', 120], ['절반', 650, 340, 110, 'half', 80], ['올인', 772, 340, 110, 'all', 80]);
        else btns.push(['−', 60, 760, 90, 'minus'], ['+', 390, 760, 90, 'plus'], ['딜 (Space)', 170, 760, 200, 'deal'], ['절반', 60, 838, 90, 'half'], ['올인', 390, 838, 90, 'all']);
      } else if (phase === 'play') { if (land) btns.push(['히트 H', 650, 30, 232, 'hit', 120], ['스탠드 S', 650, 165, 232, 'stand', 120], ['더블 D', 650, 300, 232, 'dbl', 120], ['분할 X', 650, 435, 232, 'split', 120]); // 가로: 판 오른쪽에 큰 버튼 세로로
        else btns.push(['히트 H', 24, 760, 112, 'hit'], ['스탠드 S', 152, 760, 112, 'stand'], ['더블 D', 280, 760, 112, 'dbl'], ['분할 X', 408, 760, 112, 'split']); }
      btns.forEach(function (b) { var on = !(b[4] === 'dbl' && !canDbl()) && !(b[4] === 'split' && !canSplit()); c.fillStyle = b[4] === 'deal' ? '#4dffd2' : on ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.04)'; A.rr(c, b[1], b[2], b[3], b[5] || 66, 16); c.fill(); c.fillStyle = b[4] === 'deal' ? '#00241b' : on ? '#fff' : 'rgba(255,255,255,.3)'; c.font = '700 ' + (land ? 24 : 20) + 'px "Pretendard Variable",system-ui'; c.fillText(b[0], b[1] + b[3] / 2, b[2] + (b[5] || 66) / 2 + 1); });
    }
    c.fillStyle = 'rgba(255,255,255,.35)'; c.font = '500 12px "Pretendard Variable",system-ui'; c.fillText('가상 칩만 사용합니다. 실제 돈은 쓰이지 않습니다.', TX(), land ? 585 : 935);
    if (tut && S.state === 'playing') { var tb = null; btns.forEach(function (b) { if (b[4] === (phase === 'bet' ? 'deal' : 'hit')) tb = b; });
      if (phase === 'play' && !tutStep) tutStep = 1;
      if (tb && (phase === 'bet' || phase === 'play')) tutBox(c, TX(), land ? 520 : 595, phase === 'bet' ? (isTouch() ? '딜을 눌러 카드를 받아요' : '딜(Space)을 눌러 카드를 받아요') : '더 받으려면 히트, 멈추려면 스탠드', land ? 22 : 19, tb[1] + tb[3] / 2, tb[2] + (tb[5] || 66) / 2); }
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { var b = hands && hands.length ? hands.reduce(function (a, h) { return a + h.bet; }, 0) : bet; document.getElementById('hA').textContent = A.fmt(chips); document.getElementById('hB').textContent = round + '/' + MAXR; document.getElementById('hC').textContent = A.fmt(b); }
  function step(b) { return b < 100 ? 10 : b < 500 ? 50 : b < 2000 ? 100 : 500; }
  function act(a) { if (phase === 'bet') { if (a === 'minus') bet = Math.max(Math.min(10, chips), bet - step(bet - 1)); if (a === 'plus') bet = Math.min(chips, bet + step(bet)); if (a === 'half') bet = Math.max(Math.min(10, chips), Math.floor(chips / 2)); if (a === 'all') bet = chips; if (a !== 'deal') { A.sfx('chip', a === 'minus' ? 0.9 : 1.1); hud(); } }
    if (a === 'deal') deal(); if (a === 'hit') hit(); if (a === 'stand') stand(); if (a === 'dbl') dbl(); if (a === 'split') split(); }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e); btns.forEach(function (b) { if (p.x > b[1] && p.x < b[1] + b[3] && p.y > b[2] && p.y < b[2] + (b[5] || 66)) act(b[4]); }); });
  var S = new A.Shell({ id: 'blackjack', W: W, H: H, land: [900, 600], onResize: function (sh) { land = !!sh.land; W = sh.W; H = sh.H; }, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key.toLowerCase(); if (e.repeat) return; if (k === 'h') hit(); if (k === 's') stand(); if (k === 'd') dbl(); if (k === 'x') split(); if (k === ' ' || k === 'enter') deal(); if (k === 'arrowleft') act('minus'); if (k === 'arrowright') act('plus'); } });
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
