(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, land = false;
  var C = [['빨강', '#ff4d6d'], ['파랑', '#4d8bff'], ['초록', '#3ddc84'], ['노랑', '#ffd166']];
  var fx = new A.FX();
  var word, ink, askMeaning, time, score, combo, n, endT, flash = 0, flashC, qT = 0, order = [0, 1, 2, 3], qn = 0, maxCombo = 0, miss = 0, fastN = 0, diff = A.get('neowa_stroop_diff', '0') === '1' ? 1 : 0;
  // 오늘의 도전: 로컬 날짜(YYYYMMDD)로 시드를 고정해 오늘은 누구나 같은 문제. rnd()는 평소엔 Math.random
  function today() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  var rnd = Math.random;
  function seedRnd(on) { if (!on) { rnd = Math.random; return; } var a = (Math.imul(today(), 0x9E3779B1) ^ 0x5bd1e995) >>> 0;
    rnd = function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; } // mulberry32
  function ri(a, b) { return Math.floor(a + rnd() * (b - a + 1)); }
  function dailyBest(sc) { var k = 'neowa_stroop_daily_' + today(), b = A.getInt(k); if (sc > b) { A.set(k, sc); b = sc; } return b; } // 오늘 최고 점수

  function next() { var pw = word, pi = ink; qn++; do { word = ri(0, 3); do { ink = ri(0, 3); } while (ink === word && rnd() < 0.8); } while (word === pw && ink === pi);
    askMeaning = qn > 9 && rnd() < Math.min(0.35, 0.12 + qn * 0.005); qT = 0; // 갈수록 '뜻' 함정이 잦아짐
    order = [0, 1, 2, 3]; if (n >= 25) for (var i = 3; i > 0; i--) { var j = ri(0, i), t = order[i]; order[i] = order[j]; order[j] = t; } } // 25개부터 버튼 자리가 섞임
  // 버튼 자리: 세로 540x960(아래 2x2) / 가로 900x600(오른쪽 큰 2x2). [x, y, 너비, 높이]
  function btnXY(slot) { return land ? [470 + (slot % 2) * 212, 40 + Math.floor(slot / 2) * 270, 198, 250] : [40 + (slot % 2) * 240, 560 + Math.floor(slot / 2) * 140, 220, 120]; }
  function QX() { return land ? 230 : W / 2; }
  function reset() { time = 45; score = 0; combo = 0; n = 0; endT = 0; qn = 0; maxCombo = 0; miss = 0; fastN = 0; word = ink = null; seedRnd(diff === 1); next(); document.getElementById('hMult').textContent = diff === 1 ? '오늘의 도전' : ''; fx.clear(); hud(); }
  function choose(k) {
    if (S.state !== 'playing' || endT > 0) return;
    var ok = askMeaning ? k === word : k === ink;
    if (ok) { n++; combo++; maxCombo = Math.max(maxCombo, combo); var fast = qT < 1; if (fast) fastN++; var pts = 10 + combo * 2 + (fast ? 5 : 0); score += pts; if (n === 25) S.banner('25개 돌파!', '이제 버튼 자리가 섞여요'); flash = 0.2; flashC = '#7dff9b'; A.sfx(combo >= 3 ? 'combo' : 'right', 1 + Math.min(combo, 15) * 0.03); fx.text(QX(), land ? 200 : 300, (fast ? '빠름! ' : '') + '+' + pts, fast ? '#ffd166' : '#fff', 22); }
    else { combo = 0; miss++; time -= 2; flash = 0.3; flashC = '#ff4d6d'; A.sfx('wrong'); fx.shake(5, 0.15); }
    next(); hud();
  }
  function update(dt) { fx.update(dt); qT += dt; if (flash > 0) flash -= dt; if (endT > 0) { endT -= dt; if (endT <= 0) S.gameOver(score, [['정답', n + ' (' + (n + miss ? Math.round(n / (n + miss) * 100) : 0) + '%)'], ['최대 콤보', String(maxCombo)], diff === 1 ? ['오늘 최고', A.fmt(dailyBest(score))] : ['빠른 정답', fastN + '개']], { kick: 'TIME UP', win: true }); return; } time -= dt; if (time > 0 && time <= 5 && Math.ceil(time) < Math.ceil(time + dt)) A.sfx('warn'); if (time <= 0) { time = 0; endT = 0.6; } hud(); }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0c0618'; c.fillRect(-10, -10, W + 20, H + 20);
    if (flash > 0) { c.fillStyle = A.hexA(flashC, flash); c.fillRect(0, 0, W, H); }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = askMeaning ? '#ffd166' : 'rgba(255,255,255,.6)'; c.font = '700 22px "Pretendard Variable",system-ui'; c.fillText(askMeaning ? '⚠ 이번엔 글자의 "뜻"을 고르세요' : '글자의 "색"을 고르세요', QX(), land ? 110 : 200);
    c.fillStyle = C[ink == null ? 1 : ink][1]; c.font = '400 110px "Black Han Sans",system-ui'; c.fillText(C[word == null ? 0 : word][0], QX(), land ? 290 : 400);
    if (land && time != null) { c.fillStyle = 'rgba(255,255,255,.08)'; A.rr(c, 40, 450, 380, 14, 7); c.fill(); c.fillStyle = time < 10 ? '#ff4d6d' : '#b48cff'; A.rr(c, 40, 450, 380 * Math.max(0, Math.min(1, time / 45)), 14, 7); c.fill();
      c.fillStyle = '#fff'; c.font = '700 28px "Chakra Petch",system-ui'; c.fillText(Math.ceil(time) + '초' + (combo >= 3 ? '  ·  ' + combo + '연속' : ''), QX(), 505); } // 가로에선 남은 시간을 판 안에도 표시
    order.forEach(function (ci, slot) { var cc = C[ci], p = btnXY(slot), x = p[0], y = p[1], i = slot; c.fillStyle = cc[1]; A.rr(c, x, y, p[2], p[3], 22); c.fill(); c.fillStyle = 'rgba(0,0,0,.55)'; c.font = '700 ' + (land ? 32 : 26) + 'px "Pretendard Variable",system-ui'; c.fillText(cc[0], x + p[2] / 2, y + p[3] / 2); c.font = '700 14px "Chakra Petch",system-ui'; c.fillText(String(i + 1), x + 20, y + 20); });
    fx.draw(c); c.restore();
  }
  var last = '';
  function hud() { var k = score + '|' + Math.ceil(time) + '|' + combo; if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score); var t = document.getElementById('hB'); t.textContent = Math.ceil(time); t.style.color = time < 10 ? '#ff4d6d' : ''; document.getElementById('hC').textContent = combo; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e); order.forEach(function (ci, slot) { var b = btnXY(slot); if (p.x > b[0] && p.x < b[0] + b[2] && p.y > b[1] && p.y < b[1] + b[3]) choose(ci); }); });
  // 모드 버튼: 0 = 기본, 1 = 오늘의 도전
  var dbtns = document.querySelectorAll('[data-diff]');
  function pd() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_stroop_diff', diff); A.sfx('click'); pd(); }); }); pd();
  var S = new A.Shell({ id: 'stroop', W: W, H: H, land: [900, 600], onResize: function (sh) { land = !!sh.land; W = sh.W; H = sh.H; }, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if (/^[1-4]$/.test(e.key) && !e.repeat) choose(order[+e.key - 1]); } });
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
