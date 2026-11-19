(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, CW = 78, CH = 110;
  var SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var fx = new A.FX();
  var shoe, chips, bet, round, MAXR = 20, phase, me, dl, msg, msgC, doubled, endT, btns = [];
  function newShoe() { shoe = []; for (var d = 0; d < 4; d++) for (var s = 0; s < 4; s++) for (var r = 0; r < 13; r++) shoe.push({ s: s, r: r }); for (var i = shoe.length - 1; i > 0; i--) { var j = A.irand(0, i), t = shoe[i]; shoe[i] = shoe[j]; shoe[j] = t; } }
  function drawC(up) { if (shoe.length < 30) newShoe(); var c = shoe.pop(); c.up = up !== false; c.t = 0; return c; }
  function val(h) { var v = 0, aces = 0; h.forEach(function (c) { if (!c.up) return; if (c.r === 0) { aces++; v += 11; } else v += Math.min(10, c.r + 1); }); while (v > 21 && aces) { v -= 10; aces--; } return v; }
  function bj(h) { return h.length === 2 && val(h) === 21; }
  function reset() { newShoe(); chips = 1000; bet = 100; round = 1; phase = 'bet'; me = []; dl = []; msg = '베팅액을 정하고 시작하세요'; msgC = '#fff'; endT = 0; fx.clear(); hud(); }
  function deal() {
    if (phase !== 'bet' || S.state !== 'playing') return; bet = Math.min(bet, chips); if (bet <= 0) return;
    chips -= bet; doubled = false; me = [drawC(), drawC()]; dl = [drawC(), drawC(false)]; phase = 'play'; msg = ''; A.sfx('click');
    if (bj(me)) { stand(); } hud();
  }
  function hit() { if (phase !== 'play') return; me.push(drawC()); A.sfx('click', 1.2); if (val(me) > 21) finish(); else if (val(me) === 21) stand(); hud(); }
  function stand() { if (phase !== 'play') return; phase = 'dealer'; dl[1].up = true; dealerT = 0.6; hud(); }
  function dbl() { if (phase !== 'play' || me.length !== 2 || chips < bet) { A.sfx('wall'); return; } chips -= bet; bet *= 2; doubled = true; me.push(drawC()); A.sfx('coin'); if (val(me) > 21) finish(); else stand(); hud(); }
  var dealerT = 0;
  function finish() {
    dl.forEach(function (c) { c.up = true; }); var mv = val(me), dv = val(dl), win = 0;
    if (mv > 21) { msg = '버스트! 패배'; msgC = '#ff4d6d'; }
    else if (bj(me) && !bj(dl)) { win = Math.floor(bet * 2.5); msg = '블랙잭! +' + Math.floor(bet * 1.5); msgC = '#ffd166'; }
    else if (dv > 21 || mv > dv) { win = bet * 2; msg = '승리! +' + bet; msgC = '#4dffd2'; }
    else if (mv === dv) { win = bet; msg = '무승부 (푸시)'; msgC = '#fff'; }
    else { msg = '딜러 승'; msgC = '#ff4d6d'; }
    chips += win; phase = 'result'; endT = 1.4;
    if (win > bet) { A.sfx(win >= bet * 2.5 ? 'gold' : 'coin'); fx.burst(W / 2, 640, '#4dffd2', 24, 300, 0.6, 3.5); } else if (!win) { A.sfx('hurt', 1.3); fx.shake(4, 0.2); }
    if (doubled) bet = Math.floor(bet / 2);
    hud();
  }
  function update(dt) {
    fx.update(dt); me.concat(dl).forEach(function (c) { c.t = Math.min(1, (c.t || 0) + dt * 5); });
    if (phase === 'dealer') { dealerT -= dt; if (dealerT <= 0) { if (val(dl) < 17 && val(me) <= 21) { dl.push(drawC()); A.sfx('click', 0.9); dealerT = 0.55; } else finish(); } }
    if (phase === 'result') { endT -= dt; if (endT <= 0) {
      if (chips <= 0) { S.gameOver(0, [['라운드', String(round)]]); return; }
      if (round >= MAXR) { S.gameOver(chips, [['최종 칩', A.fmt(chips)], ['수익', (chips >= 1000 ? '+' : '') + A.fmt(chips - 1000)]], { kick: 'FINISH', win: chips > 1000 }); return; }
      round++; phase = 'bet'; me = []; dl = []; bet = Math.min(bet, chips); msg = ''; hud(); } }
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
  function hand(c, h, y, label) {
    var n = h.length, step = Math.min(CW + 8, (W - 80 - CW) / Math.max(1, n - 1)), x0 = W / 2 - ((n - 1) * step + CW) / 2;
    h.forEach(function (cd, i) { cardDraw(c, cd, x0 + i * step, y); });
    if (n) { c.fillStyle = 'rgba(255,255,255,.75)'; c.font = '700 18px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label + ' ' + val(h), W / 2, y - 22); }
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.drawImage(FELT, -10, -10, W + 20, H + 20);
    c.strokeStyle = 'rgba(255,209,102,.25)'; c.lineWidth = 2; c.beginPath(); c.arc(W / 2, -200, 640, 0.4, Math.PI - 0.4); c.stroke();
    c.fillStyle = 'rgba(255,209,102,.5)'; c.font = '700 13px "Pretendard Variable",system-ui'; c.textAlign = 'center'; c.fillText('딜러는 16 이하에서 받고 17 이상에서 멈춥니다 · 블랙잭 1.5배', W / 2, 415);
    if (dl) hand(c, dl, 170, '딜러');
    if (me) hand(c, me, 470, '나');
    if (msg) { c.fillStyle = msgC; c.font = '400 34px "Black Han Sans",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(msg, W / 2, 640); }
    btns = [];
    if (S.state === 'playing') {
      if (phase === 'bet') {
        c.fillStyle = '#fff'; c.font = '700 22px "Chakra Petch",system-ui'; c.fillText('베팅 ' + A.fmt(Math.min(bet, chips)), W / 2, 720);
        btns.push(['−', 60, 760, 90, 'minus'], ['+', 390, 760, 90, 'plus'], ['딜 (Space)', 170, 760, 200, 'deal']);
      } else if (phase === 'play') btns.push(['히트 H', 30, 760, 150, 'hit'], ['스탠드 S', 195, 760, 150, 'stand'], ['더블 D', 360, 760, 150, 'dbl']);
      btns.forEach(function (b) { var on = !(b[4] === 'dbl' && (me.length !== 2 || chips < bet)); c.fillStyle = b[4] === 'deal' ? '#4dffd2' : on ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.04)'; A.rr(c, b[1], b[2], b[3], 66, 16); c.fill(); c.fillStyle = b[4] === 'deal' ? '#00241b' : on ? '#fff' : 'rgba(255,255,255,.3)'; c.font = '700 20px "Pretendard Variable",system-ui'; c.fillText(b[0], b[1] + b[3] / 2, b[2] + 34); });
    }
    c.fillStyle = 'rgba(255,255,255,.35)'; c.font = '500 12px "Pretendard Variable",system-ui'; c.fillText('가상 칩만 사용합니다. 실제 돈은 쓰이지 않습니다.', W / 2, 920);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(chips); document.getElementById('hB').textContent = round + '/' + MAXR; document.getElementById('hC').textContent = A.fmt(bet); }
  function act(a) { if (a === 'minus') { bet = Math.max(10, bet - 50); A.sfx('tick'); hud(); } if (a === 'plus') { bet = Math.min(chips, bet + 50); A.sfx('tick'); hud(); } if (a === 'deal') deal(); if (a === 'hit') hit(); if (a === 'stand') stand(); if (a === 'dbl') dbl(); }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e); btns.forEach(function (b) { if (p.x > b[1] && p.x < b[1] + b[3] && p.y > b[2] && p.y < b[2] + 66) act(b[4]); }); });
  var S = new A.Shell({ id: 'blackjack', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key.toLowerCase(); if (e.repeat) return; if (k === 'h') hit(); if (k === 's') stand(); if (k === 'd') dbl(); if (k === ' ' || k === 'enter') deal(); if (k === 'arrowleft') act('minus'); if (k === 'arrowright') act('plus'); } });
})();
