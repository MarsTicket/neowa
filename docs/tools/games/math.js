(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var q, ans, input, time, score, combo, solved, endT, flash = 0, flashC = '#fff';
  function makeQ() {
    var lv = solved, ops = ['+', '-']; if (lv >= 10) ops.push('×'); var op = A.pick(ops), a, b;
    var m = Math.min(99, 9 + lv * 4);
    if (op === '+') { a = A.irand(2, m); b = A.irand(2, m); ans = a + b; }
    else if (op === '-') { a = A.irand(5, m); b = A.irand(1, a + (lv > 15 ? 20 : 0)); ans = a - b; }
    else { a = A.irand(2, Math.min(12, 3 + Math.floor(lv / 4))); b = A.irand(2, 9); ans = a * b; }
    q = a + ' ' + op + ' ' + b; input = '';
  }
  function reset() { time = 60; score = 0; combo = 0; solved = 0; endT = 0; makeQ(); fx.clear(); hud(); }
  function type(ch) {
    if (S.state !== 'playing' || endT > 0) return;
    if (ch === 'del') { input = input.slice(0, -1); A.sfx('click'); return; }
    if (ch === 'skip') { time -= 3; combo = 0; flash = 0.3; flashC = '#ff4d6d'; A.sfx('wall'); makeQ(); hud(); return; }
    if (ch === '-') { if (!input) input = '-'; return; }
    if (input.length >= 4) return; input += ch; A.sfx('tick', 1.2);
    if (+input === ans) { solved++; combo++; var pts = 10 + combo * 2; score += pts; time = Math.min(99, time + 2); flash = 0.25; flashC = '#7dff9b'; A.sfx('coin', 1 + Math.min(combo, 15) * 0.04); fx.text(W / 2, 260, '+' + pts, '#ffd166', 24); makeQ(); }
    else if (String(ans).length <= input.replace('-', '').length && input !== '-') { time -= 3; combo = 0; flash = 0.3; flashC = '#ff4d6d'; A.sfx('hurt', 1.5); fx.shake(5, 0.15); input = ''; }
    hud();
  }
  function update(dt) { fx.update(dt); if (flash > 0) flash -= dt; if (endT > 0) { endT -= dt; if (endT <= 0) S.gameOver(score, [['맞힌 문제', String(solved)]], { kick: 'TIME UP', win: true }); return; } time -= dt; if (time <= 0) { time = 0; endT = 0.6; A.sfx('over'); } hud(); }
  var KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', 'del'];
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#100c02'; c.fillRect(-10, -10, W + 20, H + 20);
    if (flash > 0) { c.fillStyle = A.hexA(flashC, flash); c.fillRect(0, 0, W, H); }
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 72px "Chakra Petch",system-ui'; c.fillText((q || '7 + 5') + ' =', W / 2, 200);
    c.fillStyle = 'rgba(255,209,102,.12)'; A.rr(c, 120, 260, 300, 90, 18); c.fill(); c.fillStyle = '#ffd166'; c.font = '700 60px "Chakra Petch",system-ui'; c.fillText(input || ' ', W / 2, 307);
    KEYS.forEach(function (k, i) { var x = 60 + (i % 3) * 145, y = 400 + Math.floor(i / 3) * 105; c.fillStyle = 'rgba(255,255,255,.08)'; A.rr(c, x, y, 130, 92, 18); c.fill(); c.fillStyle = '#fff'; c.font = '700 ' + (k === 'del' ? 24 : 40) + 'px "Chakra Petch",system-ui'; c.fillText(k === 'del' ? '⌫' : k === '-' ? '−' : k, x + 65, y + 48); });
    c.fillStyle = 'rgba(255,77,109,.15)'; A.rr(c, 60, 830, 420, 64, 16); c.fill(); c.fillStyle = '#ff9eb0'; c.font = '700 20px "Pretendard Variable",system-ui'; c.fillText('건너뛰기 (-3초)', W / 2, 863);
    fx.draw(c); c.restore();
  }
  var last = '';
  function hud() { var k = score + '|' + Math.ceil(time) + '|' + combo; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); var t = document.getElementById('hB'); t.textContent = Math.ceil(time); t.style.color = time < 10 ? '#ff4d6d' : ''; document.getElementById('hC').textContent = combo; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; var p = S.toLocal(e);
    if (p.y > 830 && p.y < 894) { type('skip'); return; }
    KEYS.forEach(function (k, i) { var x = 60 + (i % 3) * 145, y = 400 + Math.floor(i / 3) * 105; if (p.x > x && p.x < x + 130 && p.y > y && p.y < y + 92) type(k); });
  });
  var S = new A.Shell({ id: 'math', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if (/^[0-9]$/.test(k)) type(k); if (k === '-') type('-'); if (k === 'Backspace') { e.preventDefault(); type('del'); } if (k === 'Tab') { e.preventDefault(); type('skip'); } } });
})();
