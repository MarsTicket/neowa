(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, SZ = 480, Y0 = 220, land = false;
  // 판 위치: 세로 540x960, 가로 화면은 720x720 정사각형
  function geo(sh) { land = !!sh.land; W = sh.W; H = sh.H; SZ = land ? 610 : 480; Y0 = land ? 92 : 220; }
  var fx = new A.FX();
  var diff = +A.get('neowa_schulte_diff', '1') || 0, n, nums, nextN, time, endT, done, flashI = {}, kbdBuf = '', idleT = 0;
  var PAL = ['#ff9e4d', '#5ee7ff', '#7dff9b', '#ff7aa8', '#b48cff', '#ffd166'];
  // 오늘의 도전: 로컬 날짜(YYYYMMDD)로 시드를 고정해 오늘은 누구나 같은 문제. rnd()는 평소엔 Math.random
  function today() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  var rnd = Math.random;
  function seedRnd(on) { if (!on) { rnd = Math.random; return; } var a = (Math.imul(today(), 0x9E3779B1) ^ 0x5bd1e995) >>> 0;
    rnd = function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; } // mulberry32
  function ri(a, b) { return Math.floor(a + rnd() * (b - a + 1)); }
  function dailyBest(sc) { var k = 'neowa_schulte_daily_' + today(), b = A.getInt(k); if (sc > b) { A.set(k, sc); b = sc; } return b; } // 오늘 최고 점수
  function si() { return diff === 3 ? 1 : diff; } // 크기 단계 (오늘의 도전 = 5x5)
  function reset() { seedRnd(diff === 3); n = 4 + si(); nums = []; for (var i = 1; i <= n * n; i++) nums.push(i); for (i = nums.length - 1; i > 0; i--) { var j = ri(0, i), t = nums[i]; nums[i] = nums[j]; nums[j] = t; } nextN = 1; time = 0; endT = 0; idleT = 0; kbdBuf = ''; done = {}; flashI = {}; fx.clear(); hud(); }
  function cs() { return SZ / n; }
  function tap(i) {
    if (S.state !== 'playing' || endT > 0 || done[i]) return;
    if (nums[i] === nextN) { done[i] = 1; flashI[i] = 0.3; nextN++; idleT = 0; A.sfx('tick', 1 + nextN * 0.02);
      if (nextN > n * n) { endT = 1; A.sfx('level'); for (var k = 0; k < 4; k++) fx.burst(A.rand(100, W - 100), A.rand(250, 650), '#ff9e4d', 20, 300, 0.7, 4); } }
    else { time += 1; flashI[i] = -0.3; A.sfx('wall'); fx.text(W / 2, 150, '+1초', '#ff4d6d', 22); }
    hud();
  }
  function score() { var par = [12, 22, 40][si()]; return Math.max(10, Math.round(1000 * (si() + 1) * par / Math.max(par * 0.3, time))); }
  function update(dt) {
    fx.update(dt); for (var k in flashI) { flashI[k] += flashI[k] > 0 ? -dt : dt; if (Math.abs(flashI[k]) < 0.02) delete flashI[k]; }
    if (endT > 0) { endT -= dt; if (endT <= 0) {
      if (diff === 3) { var sc = score(), db = dailyBest(sc); S.gameOver(sc, [['기록', time.toFixed(2) + '초'], ['오늘 최고', A.fmt(db)], ['모드', '오늘의 도전']], { kick: 'CLEAR!', win: true }); return; }
      var key = 'neowa_schulte_time_' + diff, b = parseFloat(A.get(key, '0')), prev = b; if (!b || time < b) A.set(key, time.toFixed(2));
      S.gameOver(score(), [['기록', time.toFixed(2) + '초'], ['최단', parseFloat(A.get(key, '0')).toFixed(2) + '초'], ['최단 대비', prev ? (time < prev ? '-' : '+') + Math.abs(time - prev).toFixed(2) + '초' : '첫 기록']], { kick: 'CLEAR!', win: true }); } return; }
    time += dt; idleT += dt; hud();
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0f0802'; c.fillRect(-10, -10, W + 20, H + 20);
    if (!nums) { n = 5; nums = []; for (var q = 1; q <= 25; q++) nums.push((q * 7) % 25 + 1); done = {}; }
    var s = cs(), x0 = (W - SZ) / 2, y0 = Y0;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (var i = 0; i < n * n; i++) { var x = x0 + (i % n) * s, y = y0 + Math.floor(i / n) * s, f = flashI[i];
      c.fillStyle = done[i] ? 'rgba(255,158,77,.08)' : f < 0 ? '#5a1a22' : '#1e1408'; A.rr(c, x + 3, y + 3, s - 6, s - 6, 12); c.fill();
      if (!done[i]) { c.fillStyle = PAL[nums[i] % PAL.length]; c.font = '700 ' + Math.round(s * 0.42) + 'px "Chakra Petch",system-ui'; c.fillText(String(nums[i]), x + s / 2, y + s / 2 + 2); }
      if (f > 0) { c.fillStyle = 'rgba(255,255,255,' + f * 2 + ')'; A.rr(c, x + 3, y + 3, s - 6, s - 6, 12); c.fill(); }
      if (idleT > 6 && nums[i] === nextN && S.state === 'playing') { c.strokeStyle = 'rgba(255,209,102,' + (0.35 + Math.sin(S.time * 6) * 0.3) + ')'; c.lineWidth = 3; A.rr(c, x + 4, y + 4, s - 8, s - 8, 11); c.stroke(); } } // 6초 넘게 못 찾으면 살짝 알려 줌
    c.fillStyle = '#ffd6b0'; c.font = '700 ' + (land ? 30 : 22) + 'px "Pretendard Variable",system-ui'; c.fillText(nextN && nextN <= n * n ? '다음: ' + nextN : '', W / 2, land ? 46 : 170);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = nextN + '|' + Math.floor(time * 10); if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score()); document.getElementById('hB').textContent = Math.min(nextN, n * n); document.getElementById('hC').textContent = time.toFixed(1); document.getElementById('hMult').textContent = diff === 3 ? '오늘의 도전' : n + '×' + n; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e), s = cs(), x = Math.floor((p.x - (W - SZ) / 2) / s), y = Math.floor((p.y - Y0) / s); if (x >= 0 && y >= 0 && x < n && y < n) tap(y * n + x); });
  var dbtns = document.querySelectorAll('[data-diff]');
  function pd() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_schulte_diff', diff); A.sfx('click'); pd(); nums = null; }); }); pd();
  var S = new A.Shell({ id: 'schulte', W: W, H: H, land: [720, 720], onResize: geo, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if (!/^[0-9]$/.test(e.key)) return; kbdBuf = (kbdBuf + e.key).slice(-2); var want = String(nextN); if (kbdBuf.slice(-want.length) === want) { var i = nums.indexOf(nextN); tap(i); kbdBuf = ''; } } });
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
