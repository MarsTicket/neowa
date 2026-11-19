(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, land = false;
  var fx = new A.FX();
  var q, ans, input, time, score, combo, solved, endT, flash = 0, flashC = '#fff', maxCombo = 0, wrong = 0, diff = A.get('neowa_math_diff', '0') === '1' ? 1 : 0;
  // 오늘의 도전: 로컬 날짜(YYYYMMDD)로 시드를 고정해 오늘은 누구나 같은 문제. rnd()는 평소엔 Math.random
  function today() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  var rnd = Math.random;
  function seedRnd(on) { if (!on) { rnd = Math.random; return; } var a = (Math.imul(today(), 0x9E3779B1) ^ 0x5bd1e995) >>> 0;
    rnd = function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; } // mulberry32
  function ri(a, b) { return Math.floor(a + rnd() * (b - a + 1)); }
  function dailyBest(sc) { var k = 'neowa_math_daily_' + today(), b = A.getInt(k); if (sc > b) { A.set(k, sc); b = sc; } return b; } // 오늘 최고 점수

  function makeQ() {
    var lv = solved, ops = ['+', '-']; if (lv >= 10) ops.push('×'); if (lv >= 20) ops.push('÷'); var op = ops[ri(0, ops.length - 1)], a, b;
    var m = Math.min(99, 9 + lv * 4);
    if (op === '+') { a = ri(2, m); b = ri(2, m); ans = a + b; }
    else if (op === '-') { a = ri(5, m); b = ri(1, a + (lv > 15 ? 20 : 0)); ans = a - b; }
    else if (op === '÷') { b = ri(2, 9); ans = ri(2, Math.min(12, 2 + Math.floor(lv / 5))); a = b * ans; }
    else { a = ri(2, Math.min(lv >= 30 ? 19 : 12, 3 + Math.floor(lv / 4))); b = ri(2, 9); ans = a * b; }
    if (q === a + ' ' + op + ' ' + b) return makeQ(); // 같은 문제 연속 방지
    q = a + ' ' + op + ' ' + b; input = '';
  }
  function reset() { time = 60; score = 0; combo = 0; solved = 0; endT = 0; maxCombo = 0; wrong = 0; q = ''; seedRnd(diff === 1); makeQ(); document.getElementById('hMult').textContent = diff === 1 ? '오늘의 도전' : ''; fx.clear(); hud(); }
  // 정답 보너스 시간은 오래 갈수록 줄어 한 판이 끝없이 길어지지 않게 함. 자릿수가 찼거나 부호가 다르면 오답
  function type(ch) {
    if (S.state !== 'playing' || endT > 0) return;
    if (ch === 'del') { input = input.slice(0, -1); A.sfx('click'); return; }
    if (ch === 'skip') { time -= 3; combo = 0; flash = 0.3; flashC = '#ff4d6d'; A.sfx('wall'); makeQ(); hud(); return; }
    if (ch === '-') { if (!input) input = '-'; return; }
    if (input.length >= 4) return; input += ch; A.sfx('tick', 1.2);
    if (+input === ans) { solved++; combo++; maxCombo = Math.max(maxCombo, combo); var pts = 10 + combo * 2; score += pts; time = Math.min(99, time + (solved <= 15 ? 2 : solved <= 30 ? 1.5 : solved <= 50 ? 1 : solved <= 80 ? 0.7 : 0.5));
      if (solved % 10 === 0 && solved <= 50) { time = Math.min(99, time + 3); S.banner(solved + '문제!', '보너스 +3초'); A.sfx('level'); } flash = 0.25; flashC = '#7dff9b'; A.sfx(combo >= 3 ? 'combo' : 'right', 1 + Math.min(combo, 15) * 0.03); fx.text(QX(), land ? 180 : 260, '+' + pts, '#ffd166', 24); makeQ(); }
    else if (input !== '-' && (input.replace('-', '').length >= String(Math.abs(ans)).length || (ans >= 0) !== (input.charAt(0) !== '-'))) { time -= 3; combo = 0; wrong++; flash = 0.3; flashC = '#ff4d6d'; A.sfx('wrong'); fx.shake(5, 0.15); input = ''; }
    hud();
  }
  function update(dt) { fx.update(dt); if (flash > 0) flash -= dt; if (endT > 0) { endT -= dt; if (endT <= 0) S.gameOver(score, [['맞힌 문제', String(solved)], ['최대 콤보', String(maxCombo)], diff === 1 ? ['오늘 최고', A.fmt(dailyBest(score))] : ['정확도', (solved + wrong ? Math.round(solved / (solved + wrong) * 100) : 0) + '%']], { kick: 'TIME UP', win: true }); return; } time -= dt; if (time > 0 && time <= 5 && Math.ceil(time) < Math.ceil(time + dt)) A.sfx('warn'); if (time <= 0) { time = 0; endT = 0.6; } hud(); }
  var KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '-', '0', 'del'];
  // 화면 배치: 세로 540x960 / 가로 900x600(왼쪽 문제·입력·건너뛰기, 오른쪽 큰 숫자판)
  function keyRect(i) { return land ? [478 + (i % 3) * 138, 24 + Math.floor(i / 3) * 118, 124, 104] : [60 + (i % 3) * 145, 400 + Math.floor(i / 3) * 105, 130, 92]; }
  function skipRect() { return land ? [40, 500, 380, 72] : [60, 830, 420, 64]; }
  function QX() { return land ? 230 : W / 2; }
  function render(c) {
    var o = fx.offset(), qx = QX();
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#100c02'; c.fillRect(-10, -10, W + 20, H + 20);
    if (flash > 0) { c.fillStyle = A.hexA(flashC, flash); c.fillRect(0, 0, W, H); }
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 72px "Chakra Petch",system-ui'; c.fillText((q || '7 + 5') + ' =', qx, land ? 130 : 200);
    var iy = land ? 200 : 260; c.fillStyle = 'rgba(255,209,102,.12)'; A.rr(c, qx - 150, iy, 300, 90, 18); c.fill(); c.fillStyle = '#ffd166'; c.font = '700 60px "Chakra Petch",system-ui'; c.fillText(input || ' ', qx, iy + 47);
    if (land && time != null) { // 가로에선 점수판이 패널로 가므로 남은 시간을 판 안에도 크게 표시
      c.fillStyle = 'rgba(255,255,255,.08)'; A.rr(c, 40, 345, 380, 14, 7); c.fill(); c.fillStyle = time < 10 ? '#ff4d6d' : '#ffd166'; A.rr(c, 40, 345, 380 * Math.max(0, Math.min(1, time / 60)), 14, 7); c.fill();
      c.font = '700 30px "Chakra Petch",system-ui'; c.fillText(Math.ceil(time) + '초', qx, 400); c.fillStyle = 'rgba(255,255,255,.5)'; c.font = '600 18px "Pretendard Variable",system-ui'; c.fillText(combo ? combo + ' 연속 정답' : '맞히면 자동으로 다음 문제', qx, 445); }
    KEYS.forEach(function (k, i) { var r = keyRect(i); c.fillStyle = 'rgba(255,255,255,.08)'; A.rr(c, r[0], r[1], r[2], r[3], 18); c.fill(); c.fillStyle = '#fff'; c.font = '700 ' + (k === 'del' ? 24 : 40) + 'px "Chakra Petch",system-ui'; c.fillText(k === 'del' ? '⌫' : k === '-' ? '−' : k, r[0] + r[2] / 2, r[1] + r[3] / 2 + 2); });
    var sr = skipRect(); c.fillStyle = 'rgba(255,77,109,.15)'; A.rr(c, sr[0], sr[1], sr[2], sr[3], 16); c.fill(); c.fillStyle = '#ff9eb0'; c.font = '700 20px "Pretendard Variable",system-ui'; c.fillText('건너뛰기 (-3초)', sr[0] + sr[2] / 2, sr[1] + sr[3] / 2 + 1);
    fx.draw(c); c.restore();
  }
  var last = '';
  function hud() { var k = score + '|' + Math.ceil(time) + '|' + combo; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); var t = document.getElementById('hB'); t.textContent = Math.ceil(time); t.style.color = time < 10 ? '#ff4d6d' : ''; document.getElementById('hC').textContent = combo; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) {
    if (S.state !== 'playing') return; var p = S.toLocal(e);
    var sr = skipRect(); if (p.x > sr[0] && p.x < sr[0] + sr[2] && p.y > sr[1] && p.y < sr[1] + sr[3]) { type('skip'); return; }
    KEYS.forEach(function (k, i) { var r = keyRect(i); if (p.x > r[0] && p.x < r[0] + r[2] && p.y > r[1] && p.y < r[1] + r[3]) type(k); });
  });
  // 모드 버튼: 0 = 기본, 1 = 오늘의 도전
  var dbtns = document.querySelectorAll('[data-diff]');
  function pd() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_math_diff', diff); A.sfx('click'); pd(); }); }); pd();
  var S = new A.Shell({ id: 'math', W: W, H: H, land: [900, 600], onResize: function (sh) { land = !!sh.land; W = sh.W; H = sh.H; }, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { var k = e.key; if (/^[0-9]$/.test(k)) type(k); if (k === '-') type('-'); if (k === 'Backspace') { e.preventDefault(); type('del'); } if (k === 'Tab') { e.preventDefault(); type('skip'); } } });
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
