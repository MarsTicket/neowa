(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, ROUNDS = 5;
  var fx = new A.FX();
  var phase, waitT, goAt, times, round, msg, endT, fakeT = 0, fakeDone = false, lastU = 0;
  function reset() { times = []; round = 1; endT = 0; lastU = 0; ready(); fx.clear(); hud(); }
  function ready() { phase = 'wait'; waitT = A.rand(1.4, 3.6); msg = '초록색이 되면 탭!'; fakeT = 0; // 2회차부터 가끔 파란 속임수
    fakeDone = !(round >= 2 && Math.random() < 0.4); if (!fakeDone) fakeAt = A.rand(0.5, Math.max(0.6, waitT - 0.8)); }
  var fakeAt = 0;
  function tap() {
    if (S.state !== 'playing' || endT > 0) return;
    if (phase === 'wait') { times.push(500); msg = fakeT > 0 ? '속임수에 걸렸어요! +500ms' : '너무 빨라요! +500ms'; fakeT = 0; A.sfx('hurt', 1.4); fx.shake(6, 0.2); phase = 'show'; showT = 1.2; }
    else if (phase === 'go') { if (!goAt) goAt = performance.now(); var ms = Math.max(1, Math.round(performance.now() - goAt)); times.push(ms); msg = ms + ' ms'; A.sfx(ms < 250 ? 'gold' : 'coin'); fx.burst(W / 2, 480, ms < 250 ? '#ffd166' : '#7dff9b', 30, 340, 0.6, 4); phase = 'show'; showT = 1.1; A.vibrate(15); }
    hud();
  }
  var showT = 0;
  function avg() { return times.length ? Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) : 0; }
  function update(dt) {
    fx.update(dt);
    if (endT > 0) { endT -= dt; if (endT <= 0) { var a = avg(), sc = Math.max(0, Math.round((600 - a) * 3)); var best = A.getInt('neowa_reaction_ms'); if (!best || a < best) A.set('neowa_reaction_ms', a); S.gameOver(sc, [['평균', a + 'ms'], ['최고', Math.min.apply(null, times) + 'ms'], ['내 최단 평균', (A.getInt('neowa_reaction_ms') || a) + 'ms']], { kick: 'RESULT', win: true }); } return; }
    var now = performance.now(), gap = lastU ? now - lastU : 0; lastU = now;
    // 일시정지·화면 전환으로 멈췄다 돌아오면 측정이 틀리므로 이번 회차를 다시 기다림
    if (phase === 'go' && gap > 400) { ready(); msg = '잠깐 멈춰서 다시 측정해요'; return; }
    if (phase === 'wait') { waitT -= dt; if (fakeT > 0) fakeT -= dt;
      if (!fakeDone && waitT <= fakeAt) { fakeDone = true; fakeT = 0.45; A.sfx('tick', 1.3); }
      if (waitT <= 0) { phase = 'go'; goAt = 0; fakeT = 0; A.sfx('tick', 2); } }
    if (phase === 'show') { showT -= dt; if (showT <= 0) { if (round >= ROUNDS) { endT = 0.6; } else { round++; ready(); } hud(); } }
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    if (phase === 'go' && !goAt) goAt = performance.now(); // 초록 화면이 실제로 그려진 순간부터 잼
    var col = phase === 'go' ? '#1fa85a' : phase === 'wait' ? (fakeT > 0 ? '#2450c8' : '#a8243e') : '#14182a';
    if (!phase) col = '#1a1020';
    c.fillStyle = col; c.fillRect(-10, -10, W + 20, H + 20);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '400 ' + (phase === 'go' ? 64 : 40) + 'px "Black Han Sans",system-ui'; c.fillText(phase === 'go' ? '지금!' : fakeT > 0 ? '참아요!' : msg || '', W / 2, 460);
    c.font = '600 18px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(255,255,255,.7)';
    (times || []).forEach(function (t, i) { c.fillText((i + 1) + '회: ' + t + 'ms', W / 2, 600 + i * 30); });
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(Math.max(0, Math.round((600 - avg()) * 3))); document.getElementById('hB').textContent = Math.min(round, ROUNDS) + '/' + ROUNDS; document.getElementById('hC').textContent = times.length ? avg() + 'ms' : '-'; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state === 'playing') { e.preventDefault(); tap(); } });
  var S = new A.Shell({ id: 'reaction', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) tap(); } });
})();
