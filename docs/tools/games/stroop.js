(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var C = [['빨강', '#ff4d6d'], ['파랑', '#4d8bff'], ['초록', '#3ddc84'], ['노랑', '#ffd166']];
  var fx = new A.FX();
  var word, ink, askMeaning, time, score, combo, n, endT, flash = 0, flashC, qT = 0, order = [0, 1, 2, 3];
  function next() { var pw = word, pi = ink; do { word = A.irand(0, 3); do { ink = A.irand(0, 3); } while (ink === word && Math.random() < 0.8); } while (word === pw && ink === pi);
    askMeaning = n > 8 && Math.random() < Math.min(0.35, 0.12 + n * 0.005); qT = 0; // 갈수록 '뜻' 함정이 잦아짐
    order = [0, 1, 2, 3]; if (n >= 25) for (var i = 3; i > 0; i--) { var j = A.irand(0, i), t = order[i]; order[i] = order[j]; order[j] = t; } } // 25개부터 버튼 자리가 섞임
  function btnXY(slot) { return [40 + (slot % 2) * 240, 560 + Math.floor(slot / 2) * 140]; }
  function reset() { time = 45; score = 0; combo = 0; n = 0; endT = 0; next(); fx.clear(); hud(); }
  function choose(k) {
    if (S.state !== 'playing' || endT > 0) return;
    var ok = askMeaning ? k === word : k === ink;
    if (ok) { n++; combo++; var fast = qT < 1, pts = 10 + combo * 2 + (fast ? 5 : 0); score += pts; if (n === 25) S.banner('25개 돌파!', '이제 버튼 자리가 섞여요'); flash = 0.2; flashC = '#7dff9b'; A.sfx('coin', 1 + Math.min(combo, 15) * 0.04); fx.text(W / 2, 300, (fast ? '빠름! ' : '') + '+' + pts, fast ? '#ffd166' : '#fff', 22); }
    else { combo = 0; time -= 2; flash = 0.3; flashC = '#ff4d6d'; A.sfx('hurt', 1.4); fx.shake(5, 0.15); }
    next(); hud();
  }
  function update(dt) { fx.update(dt); qT += dt; if (flash > 0) flash -= dt; if (endT > 0) { endT -= dt; if (endT <= 0) S.gameOver(score, [['정답', String(n)]], { kick: 'TIME UP', win: true }); return; } time -= dt; if (time <= 0) { time = 0; endT = 0.6; A.sfx('over'); } hud(); }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0c0618'; c.fillRect(-10, -10, W + 20, H + 20);
    if (flash > 0) { c.fillStyle = A.hexA(flashC, flash); c.fillRect(0, 0, W, H); }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = askMeaning ? '#ffd166' : 'rgba(255,255,255,.6)'; c.font = '700 22px "Pretendard Variable",system-ui'; c.fillText(askMeaning ? '⚠ 이번엔 글자의 "뜻"을 고르세요' : '글자의 "색"을 고르세요', W / 2, 200);
    c.fillStyle = C[ink == null ? 1 : ink][1]; c.font = '400 110px "Black Han Sans",system-ui'; c.fillText(C[word == null ? 0 : word][0], W / 2, 400);
    order.forEach(function (ci, slot) { var cc = C[ci], p = btnXY(slot), x = p[0], y = p[1], i = slot; c.fillStyle = cc[1]; A.rr(c, x, y, 220, 120, 22); c.fill(); c.fillStyle = 'rgba(0,0,0,.55)'; c.font = '700 26px "Pretendard Variable",system-ui'; c.fillText(cc[0], x + 110, y + 60); c.font = '700 14px "Chakra Petch",system-ui'; c.fillText(String(i + 1), x + 20, y + 20); });
    fx.draw(c); c.restore();
  }
  var last = '';
  function hud() { var k = score + '|' + Math.ceil(time) + '|' + combo; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); var t = document.getElementById('hB'); t.textContent = Math.ceil(time); t.style.color = time < 10 ? '#ff4d6d' : ''; document.getElementById('hC').textContent = combo; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e); order.forEach(function (ci, slot) { var b = btnXY(slot); if (p.x > b[0] && p.x < b[0] + 220 && p.y > b[1] && p.y < b[1] + 120) choose(ci); }); });
  var S = new A.Shell({ id: 'stroop', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if (/^[1-4]$/.test(e.key) && !e.repeat) choose(order[+e.key - 1]); } });
})();
