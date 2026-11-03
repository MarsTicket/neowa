(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960;
  var fx = new A.FX();
  var diff = +A.get('neowa_schulte_diff', '1') || 0, n, nums, nextN, time, endT, done, flashI = {}, kbdBuf = '';
  var PAL = ['#ff9e4d', '#5ee7ff', '#7dff9b', '#ff7aa8', '#b48cff', '#ffd166'];
  function reset() { n = 4 + diff; nums = []; for (var i = 1; i <= n * n; i++) nums.push(i); for (i = nums.length - 1; i > 0; i--) { var j = A.irand(0, i), t = nums[i]; nums[i] = nums[j]; nums[j] = t; } nextN = 1; time = 0; endT = 0; done = {}; flashI = {}; fx.clear(); hud(); }
  function cs() { return 480 / n; }
  function tap(i) {
    if (S.state !== 'playing' || endT > 0 || done[i]) return;
    if (nums[i] === nextN) { done[i] = 1; flashI[i] = 0.3; nextN++; A.sfx('tick', 1 + nextN * 0.02);
      if (nextN > n * n) { endT = 1; A.sfx('level'); for (var k = 0; k < 4; k++) fx.burst(A.rand(100, W - 100), A.rand(250, 650), '#ff9e4d', 20, 300, 0.7, 4); } }
    else { time += 1; flashI[i] = -0.3; A.sfx('wall'); fx.text(W / 2, 150, '+1초', '#ff4d6d', 22); }
    hud();
  }
  function score() { var par = [12, 22, 40][diff]; return Math.max(10, Math.round(1000 * (diff + 1) * par / Math.max(par * 0.3, time))); }
  function update(dt) {
    fx.update(dt); for (var k in flashI) { flashI[k] += flashI[k] > 0 ? -dt : dt; if (Math.abs(flashI[k]) < 0.02) delete flashI[k]; }
    if (endT > 0) { endT -= dt; if (endT <= 0) { var key = 'neowa_schulte_time_' + diff, b = parseFloat(A.get(key, '0')); if (!b || time < b) A.set(key, time.toFixed(2)); S.gameOver(score(), [['기록', time.toFixed(2) + '초'], ['최단', parseFloat(A.get(key, '0')).toFixed(2) + '초']], { kick: 'CLEAR!', win: true }); } return; }
    time += dt; hud();
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    c.fillStyle = '#0f0802'; c.fillRect(-10, -10, W + 20, H + 20);
    if (!nums) { n = 5; nums = []; for (var q = 1; q <= 25; q++) nums.push((q * 7) % 25 + 1); done = {}; }
    var s = cs(), x0 = (W - 480) / 2, y0 = 220;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (var i = 0; i < n * n; i++) { var x = x0 + (i % n) * s, y = y0 + Math.floor(i / n) * s, f = flashI[i];
      c.fillStyle = done[i] ? 'rgba(255,158,77,.08)' : f < 0 ? '#5a1a22' : '#1e1408'; A.rr(c, x + 3, y + 3, s - 6, s - 6, 12); c.fill();
      if (!done[i]) { c.fillStyle = PAL[nums[i] % PAL.length]; c.font = '700 ' + Math.round(s * 0.42) + 'px "Chakra Petch",system-ui'; c.fillText(String(nums[i]), x + s / 2, y + s / 2 + 2); }
      if (f > 0) { c.fillStyle = 'rgba(255,255,255,' + f * 2 + ')'; A.rr(c, x + 3, y + 3, s - 6, s - 6, 12); c.fill(); } }
    c.fillStyle = '#ffd6b0'; c.font = '700 22px "Pretendard Variable",system-ui'; c.fillText(nextN && nextN <= n * n ? '다음: ' + nextN : '', W / 2, 170);
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  var last = '';
  function hud() { var k = nextN + '|' + Math.floor(time * 10); if (k === last) return; last = k; document.getElementById('hA').textContent = A.fmt(score()); document.getElementById('hB').textContent = Math.min(nextN, n * n); document.getElementById('hC').textContent = time.toFixed(1); document.getElementById('hMult').textContent = n + '×' + n; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state !== 'playing') return; var p = S.toLocal(e), s = cs(), x = Math.floor((p.x - (W - 480) / 2) / s), y = Math.floor((p.y - 220) / s); if (x >= 0 && y >= 0 && x < n && y < n) tap(y * n + x); });
  var dbtns = document.querySelectorAll('[data-diff]');
  function pd() { dbtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-diff') === diff); }); }
  dbtns.forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); diff = +b.getAttribute('data-diff'); A.set('neowa_schulte_diff', diff); A.sfx('click'); pd(); nums = null; }); }); pd();
  var S = new A.Shell({ id: 'schulte', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if (!/^[0-9]$/.test(e.key)) return; kbdBuf = (kbdBuf + e.key).slice(-2); var want = String(nextN); if (kbdBuf.slice(-want.length) === want) { var i = nums.indexOf(nextN); tap(i); kbdBuf = ''; } } });
})();
