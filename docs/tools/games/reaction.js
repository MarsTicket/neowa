(function () {
  'use strict';
  var A = Arcade, W = 540, H = 960, ROUNDS = 5;
  var fx = new A.FX();
  var phase, waitT, goAt, times, round, msg, endT;
  function reset() { times = []; round = 1; endT = 0; ready(); fx.clear(); hud(); }
  function ready() { phase = 'wait'; waitT = A.rand(1.4, 3.6); msg = '초록색이 되면 탭!'; }
  function tap() {
    if (S.state !== 'playing' || endT > 0) return;
    if (phase === 'wait') { times.push(500); msg = '너무 빨라요! +500ms'; A.sfx('hurt', 1.4); fx.shake(6, 0.2); phase = 'show'; showT = 1.2; }
    else if (phase === 'go') { var ms = Math.round(performance.now() - goAt); times.push(ms); msg = ms + ' ms'; A.sfx(ms < 250 ? 'gold' : 'coin'); fx.burst(W / 2, 480, ms < 250 ? '#ffd166' : '#7dff9b', 30, 340, 0.6, 4); phase = 'show'; showT = 1.1; A.vibrate(15); }
    hud();
  }
  var showT = 0;
  function avg() { return times.length ? Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length) : 0; }
  function update(dt) {
    fx.update(dt);
    if (endT > 0) { endT -= dt; if (endT <= 0) { var a = avg(), sc = Math.max(0, Math.round((600 - a) * 3)); var best = A.getInt('neowa_reaction_ms'); if (!best || a < best) A.set('neowa_reaction_ms', a); S.gameOver(sc, [['평균', a + 'ms'], ['최고', Math.min.apply(null, times) + 'ms'], ['내 최단 평균', (A.getInt('neowa_reaction_ms') || a) + 'ms']], { kick: 'RESULT', win: true }); } return; }
    if (phase === 'wait') { waitT -= dt; if (waitT <= 0) { phase = 'go'; goAt = performance.now(); A.sfx('tick', 2); } }
    if (phase === 'show') { showT -= dt; if (showT <= 0) { if (round >= ROUNDS) { endT = 0.6; } else { round++; ready(); } hud(); } }
  }
  function render(c) {
    var o = fx.offset();
    c.save(); c.translate(o[0], o[1]);
    var col = phase === 'go' ? '#1fa85a' : phase === 'wait' ? '#a8243e' : '#14182a';
    if (!phase) col = '#1a1020';
    c.fillStyle = col; c.fillRect(-10, -10, W + 20, H + 20);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '400 ' + (phase === 'go' ? 64 : 40) + 'px "Black Han Sans",system-ui'; c.fillText(phase === 'go' ? '지금!' : msg || '', W / 2, 460);
    c.font = '600 18px "Pretendard Variable",system-ui'; c.fillStyle = 'rgba(255,255,255,.7)';
    (times || []).forEach(function (t, i) { c.fillText((i + 1) + '회: ' + t + 'ms', W / 2, 600 + i * 30); });
    fx.draw(c); c.restore(); fx.drawFlash(c, W, H);
  }
  function hud() { document.getElementById('hA').textContent = A.fmt(Math.max(0, Math.round((600 - avg()) * 3))); document.getElementById('hB').textContent = Math.min(round, ROUNDS) + '/' + ROUNDS; document.getElementById('hC').textContent = times.length ? avg() + 'ms' : '-'; }
  document.getElementById('stage').addEventListener('pointerdown', function (e) { if (S.state === 'playing') { e.preventDefault(); tap(); } });
  var S = new A.Shell({ id: 'reaction', W: W, H: H, reset: reset, update: update, idle: function (dt) { fx.update(dt); }, render: render,
    keydown: function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) tap(); } });
})();
